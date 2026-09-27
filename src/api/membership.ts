import { isCapability, validFeatureConfig } from '@electrasim/access';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import {
  type ApiEnv,
  freshContext,
  requireSession,
  requireSuperAdmin,
  sameOriginMutation,
} from './context';
import {
  type Resource,
  decode,
  listResource,
  mutate,
  ownMembership,
  planBenefits,
  readResource,
} from './membership-store';
import {
  type Data,
  type FeatureInput,
  benefitFields,
  boolean,
  featureList,
  grantFields,
  integer,
  invalid,
  keys,
  object,
  pagination,
  planFields,
  string,
  validateBenefit,
  validateGrant,
  validatePlan,
} from './membership-validation';

export const membershipApi = new Hono<ApiEnv>();
membershipApi.use('*', freshContext);
membershipApi.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error('Membership request failed', c.get('requestId'), error);
  return c.json({ error: 'Membership service unavailable' }, 503);
});

membershipApi.get('/plans', async (c) => {
  const { limit, offset } = pagination(c.req.query());
  const db = c.get('db');
  const [plans, features, count] = await db.batch<Data>([
    db
      .prepare(
        `SELECT id, slug, name, description, price_minor, currency, duration_days, no_expiry FROM plans WHERE status = 'active' ORDER BY slug LIMIT ? OFFSET ?`,
      )
      .bind(limit, offset),
    db
      .prepare(`SELECT pf.plan_id, f.key, f.name, f.description, f.handler, pf.config FROM plan_features pf JOIN pro_features f ON pf.feature_key = f.key
      WHERE pf.enabled = 1 AND f.enabled = 1 AND f.archived_at IS NULL AND pf.plan_id IN (SELECT id FROM plans WHERE status = 'active' ORDER BY slug LIMIT ? OFFSET ?) ORDER BY f.sort_order, f.key`)
      .bind(limit, offset),
    db.prepare("SELECT COUNT(*) AS total FROM plans WHERE status = 'active'"),
  ]);
  const supported = features.results.filter((f) => {
    try {
      return (
        isCapability(String(f.handler)) &&
        validFeatureConfig(String(f.handler), JSON.parse(String(f.config)))
      );
    } catch {
      return false;
    }
  });
  c.header('Cache-Control', 'no-store');
  return c.json({
    items: plans.results.map((plan) => ({
      ...decode(plan),
      features: supported
        .filter((f) => f.plan_id === plan.id)
        .map((f) => ({
          key: f.key,
          capability: f.handler,
          name: JSON.parse(String(f.name)),
          description: JSON.parse(String(f.description)),
        })),
    })),
    total: count.results[0].total,
    limit,
    offset,
  });
});

membershipApi.use('/me/*', requireSession);
membershipApi.get('/me/membership', async (c) => {
  const { limit, offset } = pagination(c.req.query());
  return c.json(await ownMembership(c.get('db'), c.get('actor').id, limit, offset));
});

membershipApi.use('/admin/*', requireSession, requireSuperAdmin, sameOriginMutation);
membershipApi.use(
  '/admin/*',
  bodyLimit({ maxSize: 32 * 1024, onError: (c) => c.json({ error: 'Body too large' }, 413) }),
);
membershipApi.get('/admin/ping', (c) => c.json({ ok: true, userId: c.get('actor').id }));
membershipApi.get('/admin/pro/audit', async (c) => {
  const { limit, offset } = pagination(c.req.query());
  const targetId = c.req.query('targetId');
  const where = targetId ? ' WHERE target_id = ?' : '';
  const params = targetId ? [targetId] : [];
  const db = c.get('db');
  const [rows, count] = await db.batch<Data>([
    db
      .prepare(
        `SELECT * FROM audit_logs${where} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, limit, offset),
    db.prepare(`SELECT COUNT(*) AS total FROM audit_logs${where}`).bind(...params),
  ]);
  return c.json({ items: rows.results.map(decode), total: count.results[0].total, limit, offset });
});

// Used by the Phase 1.8 member picker. Minimal fields, guarded like all membership administration.
membershipApi.get('/admin/pro/users', async (c) => {
  const { limit, offset } = pagination(c.req.query());
  const search = string(c.req.query('q') ?? '', 'q', 200, true);
  const pattern = `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
  const db = c.get('db');
  const where = " WHERE email LIKE ? ESCAPE '\\' OR name LIKE ? ESCAPE '\\'";
  const [rows, count] = await db.batch<Data>([
    db
      .prepare(`SELECT id, email, name FROM user${where} ORDER BY email LIMIT ? OFFSET ?`)
      .bind(pattern, pattern, limit, offset),
    db.prepare(`SELECT COUNT(*) AS total FROM user${where}`).bind(pattern, pattern),
  ]);
  return c.json({ items: rows.results, total: count.results[0].total, limit, offset });
});

function persisted(before: Data | null): Data {
  if (!before) return {};
  const {
    features: _features,
    grantCount: _grants,
    affectedMemberCount: _affected,
    referenceCount: _references,
    ...row
  } = before;
  return row;
}
for (const resource of [
  'plans',
  'features',
  'memberships',
] as const satisfies readonly Resource[]) {
  const path = `/admin/pro/${resource}`;
  membershipApi.get(path, async (c) => {
    const { limit, offset } = pagination(c.req.query());
    return c.json(await listResource(c.get('db'), resource, limit, offset, c.req.query('userId')));
  });
  membershipApi.get(`${path}/:id`, async (c) =>
    c.json(await readResource(c.get('db'), resource, c.req.param('id'))),
  );
  membershipApi.on(['POST', 'PATCH', 'DELETE'], [path, `${path}/:id`], async (c) => {
    const create = c.req.method === 'POST';
    const remove = c.req.method === 'DELETE';
    if ((create && c.req.param('id')) || (!create && !c.req.param('id')))
      throw new HTTPException(405, { message: 'Unsupported method' });
    let input: Data;
    try {
      input = object(await c.req.json());
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      invalid('Invalid JSON');
    }
    const fields =
      resource === 'plans' ? planFields : resource === 'features' ? benefitFields : grantFields;
    keys(
      input,
      remove ? ['version', 'reason'] : [...fields, 'reason', ...(create ? [] : ['version'])],
    );
    const reason = string(input.reason, 'reason', 1000);
    const db = c.get('db');
    const id = create
      ? resource === 'features'
        ? string(input.key, 'key', 80)
        : crypto.randomUUID()
      : c.req.param('id')!;
    const before = create ? null : await readResource(db, resource, id);
    if (before && integer(input.version, 'version', 1) !== before.version)
      throw new HTTPException(409, { message: 'Stale version; reload before retrying' });
    const merged = { ...persisted(before), ...input };
    let changes: Data;
    let features: FeatureInput[] | undefined;
    let hardDelete = false;
    let guard = { sql: '', args: [] as unknown[] };
    if (resource === 'plans') {
      changes = validatePlan(merged);
      if (create || input.features !== undefined) {
        features = featureList(input.features ?? []);
        guard = await planBenefits(db, features, before?.features as FeatureInput[] | undefined);
      }
      if (remove) {
        hardDelete = before!.status === 'draft' && before!.grantCount === 0;
        changes.status = 'archived';
        if (hardDelete)
          guard = {
            sql: ' AND NOT EXISTS (SELECT 1 FROM entitlements WHERE plan_id = ?)',
            args: [id],
          };
      }
    } else if (resource === 'features') {
      changes = validateBenefit(merged);
      if (input.archived !== undefined)
        changes.archivedAt = boolean(input.archived, 'archived') ? Date.now() : null;
      if (before && (changes.key !== before.key || changes.handler !== before.handler))
        invalid('Feature key and handler are immutable');
      if (remove) {
        hardDelete = before!.referenceCount === 0;
        changes.archivedAt = Date.now();
        if (hardDelete)
          guard = {
            sql: ' AND NOT EXISTS (SELECT 1 FROM plan_features WHERE feature_key = ?)',
            args: [id],
          };
      }
    } else {
      changes = { ...validateGrant(merged), reason };
      if (before && changes.userId !== before.userId)
        invalid('Membership user is immutable; create a separate grant');
      if (before?.status === 'revoked' && !remove)
        invalid('Revoked grants are terminal; create a new grant');
      if (create || changes.planId !== before?.planId) {
        const plan = await db
          .prepare('SELECT status FROM plans WHERE id = ?')
          .bind(changes.planId)
          .first<{ status: string }>();
        if (plan?.status !== 'active') invalid('New assignments require an active plan');
        guard = {
          sql: " AND EXISTS (SELECT 1 FROM plans WHERE id = ? AND status = 'active')",
          args: [changes.planId],
        };
      }
      if (
        create &&
        !(await db.prepare('SELECT id FROM user WHERE id = ?').bind(changes.userId).first())
      )
        invalid('Unknown user');
      if (remove) changes.status = 'revoked';
    }
    const now = Date.now();
    const actorId = c.get('actor').id;
    const after = {
      ...persisted(before),
      ...changes,
      ...(create
        ? {
            ...(resource === 'features' ? { archivedAt: changes.archivedAt ?? null } : { id }),
            ...(resource === 'memberships' ? { source: 'manual' } : {}),
            createdAt: now,
            createdBy: actorId,
          }
        : {}),
      updatedAt: now,
      updatedBy: actorId,
      version: before ? Number(before.version) + 1 : 1,
    };
    const result = await mutate(db, {
      resource,
      id,
      actorId,
      before,
      after,
      reason,
      requestId: c.get('requestId'),
      features,
      hardDelete,
      guard,
    });
    return c.json(result, create ? 201 : 200);
  });
}
