import { componentAccess, originalComponentTier } from '@electrasim/access';
import { COMPONENT_DEFS } from '@electrasim/domain/components';
import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AdminRegistry } from '../../platform/registry';
import { decodePolicy, policyStatements } from '../component-access-store';
import type { ApiEnv } from '../context';
import { integer, invalid, keys, pagination, string } from '../membership-validation';
import { adminAccess, adminSnapshot } from './access';
import { adminInput } from './input';
import { commitAdminChange, mutationGuard } from './mutation';

type Snapshot = ReturnType<typeof decodePolicy>;
function component(id: string, snapshot: Snapshot) {
  const def = COMPONENT_DEFS[id];
  if (!Object.hasOwn(COMPONENT_DEFS, id))
    throw new HTTPException(404, { message: 'Component not found' });
  const originalTier = originalComponentTier(id);
  return {
    id,
    label: def.label,
    description: def.description,
    category: def.category,
    originalTier,
    protectedBasic: originalTier === 'basic',
    access: componentAccess(id, snapshot.policy),
    overrideVersion: snapshot.versions.get(id) ?? null,
  };
}

export function registerComponents(api: Hono<ApiEnv>, registry: AdminRegistry) {
  api.get('/components', async (c) => {
    const access = await adminAccess(c, 'catalog.components.manage', registry);
    const query = c.req.query();
    keys(query, ['q', 'category', 'access', 'limit', 'offset']);
    if ([...new URL(c.req.url).searchParams.keys()].some((key) => c.req.queries(key)!.length !== 1))
      invalid('Duplicate query fields');
    const q = string(query.q ?? '', 'q', 200, true).toLowerCase();
    const categories = new Set(Object.values(COMPONENT_DEFS).map((def) => def.category));
    if (query.category !== undefined && !categories.has(query.category))
      invalid('Invalid category');
    const filter = query.access ?? 'all';
    if (!['all', 'free', 'pro', 'protected'].includes(filter)) invalid('Invalid access');
    const { limit, offset } = pagination({ ...query, limit: query.limit ?? '25' });
    integer(offset, 'offset', 0, 10000);
    const snapshot = decodePolicy(await adminSnapshot(c, access, policyStatements(c.get('db'))));
    const items = snapshot.policy.components
      .map(({ id }) => component(id, snapshot))
      .filter(
        (item) =>
          (!q || item.id.toLowerCase().includes(q) || item.label.toLowerCase().includes(q)) &&
          (query.category === undefined || item.category === query.category) &&
          (filter === 'all' ||
            (filter === 'protected' ? item.protectedBasic : item.access === filter)),
      )
      .sort((a, b) => a.label.localeCompare(b.label, 'en') || a.id.localeCompare(b.id, 'en'));
    return c.json({
      version: access.version,
      policyRevision: snapshot.policy.revision,
      categories: [...categories].sort(),
      inventory: {
        total: snapshot.policy.components.length,
        protectedBasic: snapshot.policy.components.filter(
          ({ id }) => originalComponentTier(id) === 'basic',
        ).length,
      },
      items: items.slice(offset, offset + limit),
      total: items.length,
      limit,
      offset,
    });
  });
  api.get('/components/:id', async (c) => {
    const access = await adminAccess(c, 'catalog.components.manage', registry);
    if (!access.permissions.includes('catalog.audit.read'))
      throw new HTTPException(403, { message: 'Audit scope denied' });
    const rows = await adminSnapshot(c, access, [
      ...policyStatements(c.get('db')),
      c
        .get('db')
        .prepare(`SELECT id,action,actor_id AS actorId,reason,before_json AS beforeJson,
        after_json AS afterJson,request_id AS requestId,created_at AS createdAt
        FROM admin_audit WHERE namespace = 'catalog' AND target_id = ?
        ORDER BY created_at DESC,id DESC LIMIT 20`)
        .bind(c.req.param('id')),
    ]);
    const snapshot = decodePolicy(rows);
    return c.json({
      version: access.version,
      policyRevision: snapshot.policy.revision,
      component: component(c.req.param('id'), snapshot),
      impact: { savedCircuits: null, publicContent: null },
      history: rows[3].results.map(({ beforeJson, afterJson, ...row }) => ({
        ...row,
        before: beforeJson ? JSON.parse(String(beforeJson)) : null,
        after: afterJson ? JSON.parse(String(afterJson)) : null,
      })),
    });
  });
  api.patch('/components/:id/access', async (c) => {
    const access = await adminAccess(c, 'catalog.components.manage', registry);
    const input = await adminInput(c, ['access', 'policyRevision']);
    if (input.access !== 'free' && input.access !== 'pro') invalid('Invalid access');
    const desired = input.access;
    const revision = integer(
      input.policyRevision,
      'policyRevision',
      1,
      Number.MAX_SAFE_INTEGER - 1,
    );
    integer(input.version, 'version', 1, Number.MAX_SAFE_INTEGER - 1);
    const snapshot = decodePolicy(await adminSnapshot(c, access, policyStatements(c.get('db'))));
    const before = component(c.req.param('id'), snapshot);
    if (before.protectedBasic)
      throw new HTTPException(403, { message: 'Basic components are protected' });
    if (snapshot.policy.revision !== revision)
      throw new HTTPException(409, {
        message: 'Component policy changed; reload and review again',
      });
    if (before.access === desired) invalid('Component already has this access');
    const now = Date.now();
    const after = { id: before.id, access: desired, policyRevision: revision + 1 };
    const result = await commitAdminChange(
      c,
      access,
      {
        permission: 'catalog.components.manage',
        action: 'catalog.components.access.update',
        targetType: 'component',
        targetId: before.id,
        before: { id: before.id, access: before.access, policyRevision: revision },
        after,
        input,
        guard: {
          sql: `EXISTS (SELECT 1 FROM component_access_revision WHERE id=1 AND revision=?)
        AND EXISTS (SELECT 1 FROM component_access_baseline b LEFT JOIN component_access_overrides o
        ON o.component_id=b.component_id WHERE b.component_id=? AND b.original_tier='pro'
        AND COALESCE(o.access,'pro')=?)`,
          args: [revision, before.id, before.access],
        },
        changes: (id, version) => [
          {
            sql: `INSERT INTO component_access_overrides (component_id,access,version,actor_id,created_at,updated_at)
          SELECT ?,?,?,?,?,? WHERE ${mutationGuard} ON CONFLICT(component_id) DO UPDATE SET
          access=excluded.access,version=excluded.version,actor_id=excluded.actor_id,updated_at=excluded.updated_at`,
            args: [before.id, desired, version, access.actor.id, now, now, id],
          },
          {
            sql: `UPDATE component_access_revision SET revision=revision+1 WHERE id=1 AND ${mutationGuard}`,
            args: [id],
          },
        ],
      },
      registry,
    );
    return c.json({
      ...result,
      policyRevision: revision + 1,
      component: { ...before, access: desired, overrideVersion: result.version },
    });
  });
}
