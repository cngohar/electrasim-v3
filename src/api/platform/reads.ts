import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { type AdminRegistry, effectivePermissions } from '../../platform/registry';
import type { ApiEnv } from '../context';
import { integer, pagination, string } from '../membership-validation';
import { adminAccess, adminSnapshot } from './access';

export function registerReads(api: Hono<ApiEnv>, registry: AdminRegistry) {
  api.get('/overview', async (c) => {
    const access = await adminAccess(c, undefined, registry);
    const queries: { label: string; sql: string; args?: unknown[] }[] = [];
    if (access.permissions.includes('platform.users.read'))
      queries.push({ label: 'Users', sql: 'SELECT COUNT(*) AS count FROM user' });
    if (
      access.permissions.includes('community.audit.read') ||
      access.permissions.includes('community.restrictions.write')
    )
      queries.push({
        label: 'Community restrictions',
        sql: 'SELECT COUNT(DISTINCT user_id) AS count FROM community_restrictions WHERE revoked_at IS NULL AND (ends_at IS NULL OR ends_at > ?)',
        args: [Date.now()],
      });
    if (access.permissions.includes('platform.accounts.suspend'))
      queries.push({
        label: 'Suspended accounts',
        sql: 'SELECT COUNT(*) AS count FROM account_controls WHERE suspended = 1 AND (ends_at IS NULL OR ends_at > ?)',
        args: [Date.now()],
      });
    if (access.permissions.includes('platform.roles.manage'))
      queries.push({
        label: 'Active custom roles',
        sql: 'SELECT COUNT(*) AS count FROM admin_roles WHERE archived = 0',
      });
    const canUsers = access.permissions.includes('platform.users.read');
    const scopes = access.auditNamespaces;
    const rows = await adminSnapshot(c, access, [
      ...queries.map((q) =>
        c
          .get('db')
          .prepare(q.sql)
          .bind(...(q.args ?? [])),
      ),
      c
        .get('db')
        .prepare(
          canUsers
            ? 'SELECT id, name, email, global_role AS globalRole, created_at AS createdAt FROM user ORDER BY created_at DESC, id DESC LIMIT 5'
            : 'SELECT id FROM user WHERE 0',
        ),
      c
        .get('db')
        .prepare(
          `SELECT a.id, a.namespace, a.action, a.target_id AS targetId, a.actor_id AS actorId, u.name AS actorName, a.created_at AS createdAt FROM admin_audit a LEFT JOIN user u ON u.id = a.actor_id WHERE a.namespace IN (${scopes.map(() => '?').join(',') || "''"}) ORDER BY a.created_at DESC, a.id DESC LIMIT 8`,
        )
        .bind(...scopes),
    ]);
    return c.json({
      version: access.version,
      counts: queries.map((q, i) => ({ label: q.label, count: rows[i].results[0].count })),
      recentUsers: rows[queries.length].results,
      recentActivity: rows[queries.length + 1].results,
    });
  });
  api.get('/users', async (c) => {
    const access = await adminAccess(c, 'platform.users.read', registry);
    const { limit, offset } = pagination(c.req.query());
    const q = string(c.req.query('q') ?? '', 'q', 200, true).toLowerCase();
    const role = c.req.query('role') ?? 'all';
    const status = c.req.query('status') ?? 'all';
    if (
      !['all', 'individual', 'moderator', 'admin', 'super_admin'].includes(role) ||
      !['all', 'active', 'restricted', 'suspended'].includes(status)
    )
      throw new HTTPException(400, { message: 'Invalid directory filter' });
    const now = Date.now();
    const suspended = `EXISTS (SELECT 1 FROM account_controls ac WHERE ac.user_id = u.id AND ac.suspended = 1 AND (ac.ends_at IS NULL OR ac.ends_at > ${now}))`;
    const restricted = `EXISTS (SELECT 1 FROM community_restrictions cr WHERE cr.user_id = u.id AND cr.revoked_at IS NULL AND (cr.ends_at IS NULL OR cr.ends_at > ${now}))`;
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    if (q) {
      conditions.push(
        'u.id IN (SELECT id FROM user WHERE id = ? UNION SELECT id FROM user WHERE lower(name) >= ? AND lower(name) < ? UNION SELECT id FROM user WHERE lower(email) >= ? AND lower(email) < ?)',
      );
      params.push(q, q, `${q}\uffff`, q, `${q}\uffff`);
    }
    if (role !== 'all') {
      conditions.push('u.global_role = ?');
      params.push(role);
    }
    if (status === 'suspended') conditions.push(suspended);
    if (status === 'restricted') conditions.push(`NOT ${suspended} AND ${restricted}`);
    if (status === 'active') conditions.push(`NOT ${suspended} AND NOT ${restricted}`);
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '';
    const [items, total] = await adminSnapshot(c, access, [
      c
        .get('db')
        .prepare(
          `SELECT u.id, u.name, u.email, u.global_role AS globalRole, u.created_at AS createdAt, u.email_verified AS emailVerified, ${suspended} AS suspended, ${restricted} AS restricted FROM user u${where} ORDER BY lower(u.name), u.id LIMIT ? OFFSET ?`,
        )
        .bind(...params, limit, offset),
      c
        .get('db')
        .prepare(`SELECT COUNT(*) AS total FROM user u${where}`)
        .bind(...params),
    ]);
    return c.json({
      version: access.version,
      items: items.results,
      total: total.results[0].total,
      limit,
      offset,
    });
  });
  api.get('/users/:id', async (c) => {
    const access = await adminAccess(c, 'platform.users.read', registry);
    const id = string(c.req.param('id'), 'user ID', 200);
    const scope = access.auditNamespaces;
    const [identity, roles, controls, restrictions, history, policy, custom] = await adminSnapshot(
      c,
      access,
      [
        c
          .get('db')
          .prepare(
            'SELECT id,name,email,global_role AS globalRole,created_at AS createdAt,email_verified AS emailVerified FROM user WHERE id = ?',
          )
          .bind(id),
        c
          .get('db')
          .prepare(
            'SELECT r.id,r.name,r.archived FROM admin_user_roles ur JOIN admin_roles r ON r.id = ur.role_id WHERE ur.user_id = ? ORDER BY r.name',
          )
          .bind(id),
        c
          .get('db')
          .prepare('SELECT suspended,ends_at AS endsAt FROM account_controls WHERE user_id = ?')
          .bind(id),
        c
          .get('db')
          .prepare(
            'SELECT id,reason,starts_at AS startsAt,ends_at AS endsAt,revoked_at AS revokedAt FROM community_restrictions WHERE user_id = ? ORDER BY starts_at DESC,id DESC LIMIT 30',
          )
          .bind(id),
        c
          .get('db')
          .prepare(
            `SELECT id,namespace,action,reason,created_at AS createdAt FROM admin_audit WHERE target_id = ? AND namespace IN (${scope.map(() => '?').join(',') || "''"}) ORDER BY created_at DESC,id DESC LIMIT 20`,
          )
          .bind(id, ...scope),
        c
          .get('db')
          .prepare(
            'SELECT permissions_json FROM admin_policy WHERE global_role = (SELECT global_role FROM user WHERE id = ?)',
          )
          .bind(id),
        c
          .get('db')
          .prepare(
            'SELECT p.permission FROM admin_user_roles ur JOIN admin_roles r ON r.id = ur.role_id AND r.archived = 0 JOIN admin_role_permissions p ON p.role_id = r.id WHERE ur.user_id = ?',
          )
          .bind(id),
      ],
    );
    const row = identity.results[0];
    if (!row) throw new HTTPException(404, { message: 'User not found' });
    return c.json({
      version: access.version,
      user: row,
      roles: roles.results,
      controls: controls.results[0] ?? { suspended: 0, endsAt: null },
      restrictions: restrictions.results,
      history: history.results,
      effectivePermissions: effectivePermissions(
        registry,
        row.globalRole as 'individual',
        policy.results.length ? JSON.parse(String(policy.results[0].permissions_json)) : null,
        custom.results.map((r) => String(r.permission)),
      ),
    });
  });
  api.get('/audit', async (c) => {
    const access = await adminAccess(c, undefined, registry);
    const namespace = c.req.query('namespace');
    const scope = namespace ? [namespace] : access.auditNamespaces;
    if (!scope.length || scope.some((name) => !access.auditNamespaces.includes(name)))
      throw new HTTPException(403, { message: 'Audit scope denied' });
    const { limit, offset } = pagination(c.req.query());
    const conditions = [`a.namespace IN (${scope.map(() => '?').join(',')})`];
    const args: unknown[] = [...scope];
    for (const [param, column] of [
      ['actorId', 'a.actor_id'],
      ['targetId', 'a.target_id'],
      ['action', 'a.action'],
    ] as const) {
      const value = c.req.query(param);
      if (value) {
        string(value, param, 200);
        if (
          param === 'action' &&
          (!registry.actions.has(value) || !scope.includes(registry.actions.get(value)!))
        )
          throw new HTTPException(403, { message: 'Audit action denied' });
        conditions.push(`${column} = ?`);
        args.push(value);
      }
    }
    for (const [param, op] of [
      ['from', '>='],
      ['to', '<='],
    ] as const) {
      const value = c.req.query(param);
      if (value !== undefined) {
        conditions.push(`a.created_at ${op} ?`);
        args.push(integer(Number(value), param));
      }
    }
    const where = conditions.join(' AND ');
    const [rows, total] = await adminSnapshot(c, access, [
      c
        .get('db')
        .prepare(
          `SELECT a.id,a.namespace,a.actor_id AS actorId,u.name AS actorName,a.action,a.target_type AS targetType,a.target_id AS targetId,a.before_json AS beforeJson,a.after_json AS afterJson,a.reason,a.request_id AS requestId,a.created_at AS createdAt FROM admin_audit a LEFT JOIN user u ON u.id = a.actor_id WHERE ${where} ORDER BY a.created_at DESC,a.id DESC LIMIT ? OFFSET ?`,
        )
        .bind(...args, limit, offset),
      c
        .get('db')
        .prepare(`SELECT COUNT(*) AS total FROM admin_audit a WHERE ${where}`)
        .bind(...args),
    ]);
    return c.json({
      version: access.version,
      items: rows.results.map(({ beforeJson, afterJson, ...row }) => ({
        ...row,
        before: beforeJson ? JSON.parse(String(beforeJson)) : null,
        after: afterJson ? JSON.parse(String(afterJson)) : null,
      })),
      total: total.results[0].total,
      namespaces: access.auditNamespaces,
      actions: [...registry.actions.entries()]
        .filter(([, namespace]) => scope.includes(namespace))
        .map(([action]) => action),
      limit,
      offset,
    });
  });
  api.get('/standards', async (c) => {
    const access = await adminAccess(c, 'platform.standards.read', registry);
    const [rows] = await adminSnapshot(c, access, [
      c
        .get('db')
        .prepare(
          'SELECT code,label,citation,nominalVoltage,frequencyHz,version FROM electrical_standards ORDER BY code',
        ),
    ]);
    return c.json({ version: access.version, items: rows.results });
  });
}
