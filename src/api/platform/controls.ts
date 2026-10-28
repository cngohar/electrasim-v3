import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AdminRegistry } from '../../platform/registry';
import type { ApiEnv } from '../context';
import { integer, invalid, string } from '../membership-validation';
import { adminAccess, adminSnapshot } from './access';
import { adminInput } from './input';
import { commitAdminChange, mutationGuard } from './mutation';

export function registerControls(api: Hono<ApiEnv>, registry: AdminRegistry) {
  api.get('/settings/:namespace', async (c) => {
    const namespace = c.req.param('namespace');
    const module = registry.byId.get(namespace);
    if (!module?.settings)
      throw new HTTPException(404, { message: 'Settings namespace not found' });
    const access = await adminAccess(c, module.settings.read, registry);
    const [rows] = await adminSnapshot(c, access, [
      c
        .get('db')
        .prepare('SELECT values_json FROM admin_settings WHERE namespace = ?')
        .bind(namespace),
    ]);
    return c.json({
      version: access.version,
      namespace,
      values: rows.results.length
        ? JSON.parse(String(rows.results[0].values_json))
        : module.settings.defaults,
      defaults: module.settings.defaults,
      canWrite: access.permissions.includes(module.settings.write),
    });
  });
  api.patch('/settings/:namespace', async (c) => {
    const namespace = c.req.param('namespace');
    const module = registry.byId.get(namespace);
    if (!module?.settings)
      throw new HTTPException(404, { message: 'Settings namespace not found' });
    const access = await adminAccess(c, module.settings.write, registry);
    const input = await adminInput(c, ['values']);
    let values: Record<string, unknown>;
    try {
      values = module.settings.validate(input.values);
    } catch (error) {
      invalid(error instanceof Error ? error.message : 'Invalid settings');
    }
    const before = await c
      .get('db')
      .prepare('SELECT values_json FROM admin_settings WHERE namespace = ?')
      .bind(namespace)
      .first();
    return c.json(
      await commitAdminChange(
        c,
        access,
        {
          permission: module.settings.write,
          action: `${namespace}.settings.update`,
          targetType: 'settings',
          targetId: namespace,
          before: before ? JSON.parse(String(before.values_json)) : module.settings.defaults,
          after: values,
          input,
          changes: (mutation, version) => [
            {
              sql: `INSERT INTO admin_settings (namespace,values_json,version) SELECT ?,?,? WHERE ${mutationGuard} ON CONFLICT(namespace) DO UPDATE SET values_json=excluded.values_json,version=excluded.version`,
              args: [namespace, JSON.stringify(values), version, mutation],
            },
          ],
        },
        registry,
      ),
    );
  });
  for (const action of ['suspend', 'restore', 'community-restrictions'] as const) {
    api.post(`/users/:id/${action}`, async (c) => {
      const community = action === 'community-restrictions';
      const permission = community ? 'community.restrictions.write' : 'platform.accounts.suspend';
      const access = await adminAccess(c, permission, registry);
      const id = string(c.req.param('id'), 'user ID', 200);
      if (id === access.actor.id)
        throw new HTTPException(403, {
          message: 'You cannot restrict or suspend your own account',
        });
      const input = await adminInput(c, action === 'restore' ? [] : ['endsAt']);
      const now = Date.now();
      const endsAt =
        action === 'restore' || input.endsAt === null
          ? null
          : integer(input.endsAt, 'endsAt', now + 1, now + 10 * 365 * 86400000);
      const target = await c
        .get('db')
        .prepare(
          'SELECT u.id,u.global_role AS globalRole,(SELECT COUNT(*) FROM admin_user_roles ur JOIN admin_roles r ON r.id=ur.role_id AND r.archived=0 WHERE ur.user_id=u.id) AS customRoles FROM user u WHERE u.id = ?',
        )
        .bind(id)
        .first();
      if (!target) throw new HTTPException(404, { message: 'User not found' });
      if (
        community &&
        (target.globalRole !== 'individual' || Number(target.customRoles) > 0) &&
        access.actor.globalRole !== 'super_admin'
      )
        throw new HTTPException(403, { message: 'Only super admins may restrict staff' });
      const controls = await c
        .get('db')
        .prepare('SELECT suspended,ends_at AS endsAt FROM account_controls WHERE user_id = ?')
        .bind(id)
        .first();
      if (action === 'restore' && controls?.suspended !== 1)
        throw new HTTPException(409, { message: 'Account is not suspended' });
      if (
        action === 'suspend' &&
        controls?.suspended === 1 &&
        (controls.endsAt === null || Number(controls.endsAt) > now)
      )
        throw new HTTPException(409, { message: 'Account is already suspended' });
      if (
        community &&
        (await c
          .get('db')
          .prepare(
            'SELECT id FROM community_restrictions WHERE user_id=? AND revoked_at IS NULL AND (ends_at IS NULL OR ends_at>?)',
          )
          .bind(id, now)
          .first())
      )
        throw new HTTPException(409, { message: 'An active community restriction already exists' });
      const restrictionId = crypto.randomUUID();
      const after = community
        ? { id: restrictionId, endsAt, startsAt: now }
        : { suspended: action === 'suspend', endsAt };
      const guard =
        action === 'suspend'
          ? {
              sql: `EXISTS (SELECT 1 FROM user u WHERE u.global_role='super_admin' AND u.id != ? AND NOT EXISTS (SELECT 1 FROM account_controls a WHERE a.user_id=u.id AND a.suspended=1 AND (a.ends_at IS NULL OR a.ends_at>?))) OR (SELECT global_role FROM user WHERE id=?) != 'super_admin'`,
              args: [id, now, id],
            }
          : undefined;
      const result = await commitAdminChange(
        c,
        access,
        {
          permission,
          action: community ? 'community.restrictions.apply' : `platform.accounts.${action}`,
          targetType: 'user',
          targetId: id,
          before: community ? null : controls,
          after,
          input,
          guard,
          changes: (mutation, version) =>
            community
              ? [
                  {
                    sql: `INSERT INTO community_restrictions (id,user_id,starts_at,ends_at,reason,actor_id,version) SELECT ?,?,?,?,?,?,? WHERE ${mutationGuard}`,
                    args: [
                      restrictionId,
                      id,
                      now,
                      endsAt,
                      string(input.reason, 'reason', 1000),
                      access.actor.id,
                      version,
                      mutation,
                    ],
                  },
                ]
              : [
                  {
                    sql: `INSERT INTO account_controls (user_id,suspended,ends_at,version,updated_at) SELECT ?,?,?,?,? WHERE ${mutationGuard} ON CONFLICT(user_id) DO UPDATE SET suspended=excluded.suspended,ends_at=excluded.ends_at,version=excluded.version,updated_at=excluded.updated_at`,
                    args: [id, Number(action === 'suspend'), endsAt, version, now, mutation],
                  },
                  ...(action === 'suspend'
                    ? [
                        {
                          sql: `DELETE FROM session WHERE user_id = ? AND ${mutationGuard}`,
                          args: [id, mutation],
                        },
                      ]
                    : []),
                ],
        },
        registry,
      );
      return c.json({ ...result, ...(community ? { restrictionId } : {}) });
    });
  }
  api.post('/users/:id/community-restrictions/:restrictionId/revoke', async (c) => {
    const access = await adminAccess(c, 'community.restrictions.write', registry);
    const id = string(c.req.param('id'), 'user ID', 200);
    if (id === access.actor.id)
      throw new HTTPException(403, { message: 'You cannot revoke your own restriction' });
    const restrictionId = string(c.req.param('restrictionId'), 'restriction ID', 200);
    const input = await adminInput(c, []);
    const row = await c
      .get('db')
      .prepare(
        'SELECT id,ends_at AS endsAt,revoked_at AS revokedAt FROM community_restrictions WHERE id=? AND user_id=?',
      )
      .bind(restrictionId, id)
      .first();
    if (!row) throw new HTTPException(404, { message: 'Restriction not found' });
    if (row.revokedAt !== null)
      throw new HTTPException(409, { message: 'Restriction already revoked' });
    const target = await c
      .get('db')
      .prepare(
        'SELECT global_role AS globalRole, (SELECT COUNT(*) FROM admin_user_roles ur JOIN admin_roles r ON r.id=ur.role_id AND r.archived=0 WHERE ur.user_id=u.id) AS customRoles FROM user u WHERE id=?',
      )
      .bind(id)
      .first();
    if (
      (target?.globalRole !== 'individual' || Number(target?.customRoles) > 0) &&
      access.actor.globalRole !== 'super_admin'
    )
      throw new HTTPException(403, { message: 'Only super admins may restrict staff' });
    const now = Date.now();
    return c.json(
      await commitAdminChange(
        c,
        access,
        {
          permission: 'community.restrictions.write',
          action: 'community.restrictions.revoke',
          targetType: 'user',
          targetId: id,
          before: { id: restrictionId, endsAt: row.endsAt },
          after: { id: restrictionId, revokedAt: now },
          input,
          changes: (mutation, version) => [
            {
              sql: `UPDATE community_restrictions SET revoked_at=?,version=? WHERE id=? AND user_id=? AND ${mutationGuard}`,
              args: [now, version, restrictionId, id, mutation],
            },
          ],
        },
        registry,
      ),
    );
  });
}
