import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AdminRegistry } from '../../platform/registry';
import type { ApiEnv } from '../context';
import { boolean, invalid, keys, object, string } from '../membership-validation';
import { adminAccess, adminSnapshot } from './access';
import { adminInput, permissionList } from './input';
import { commitAdminChange, mutationGuard } from './mutation';

export function registerRoles(api: Hono<ApiEnv>, registry: AdminRegistry) {
  api.get('/roles', async (c) => {
    const access = await adminAccess(c, 'platform.roles.manage', registry);
    const [roles, permissions] = await adminSnapshot(c, access, [
      c
        .get('db')
        .prepare(
          'SELECT r.id,r.name,r.archived,r.version,(SELECT COUNT(*) FROM admin_user_roles ur WHERE ur.role_id = r.id) AS assignedCount FROM admin_roles r ORDER BY r.archived,r.name',
        ),
      c
        .get('db')
        .prepare(
          'SELECT role_id AS roleId,permission FROM admin_role_permissions ORDER BY permission',
        ),
    ]);
    return c.json({
      version: access.version,
      items: roles.results.map((r) => ({
        ...r,
        permissions: permissions.results.filter((p) => p.roleId === r.id).map((p) => p.permission),
      })),
    });
  });
  for (const [method, path] of [
    ['POST', '/roles'],
    ['PATCH', '/roles/:id'],
  ] as const) {
    api.on(method, path, async (c) => {
      const access = await adminAccess(c, 'platform.roles.manage', registry);
      const input = await adminInput(
        c,
        method === 'POST' ? ['name', 'permissions'] : ['name', 'permissions', 'archived'],
      );
      const name = string(input.name, 'name', 80);
      if (
        ['individual', 'moderator', 'admin', 'super_admin', 'super admin'].includes(
          name.toLowerCase(),
        )
      )
        invalid('Choose a custom role name distinct from system roles');
      const permissions = permissionList(registry, input.permissions);
      const archived = method === 'POST' ? false : boolean(input.archived, 'archived');
      const id =
        method === 'POST' ? crypto.randomUUID() : string(c.req.param('id'), 'role ID', 200);
      const before =
        method === 'POST'
          ? null
          : await c
              .get('db')
              .prepare('SELECT id,name,archived FROM admin_roles WHERE id = ?')
              .bind(id)
              .first();
      if (method === 'PATCH' && !before)
        throw new HTTPException(404, { message: 'Role not found' });
      const oldPermissions = before
        ? (
            await c
              .get('db')
              .prepare(
                'SELECT permission FROM admin_role_permissions WHERE role_id = ? ORDER BY permission',
              )
              .bind(id)
              .all()
          ).results.map((p) => p.permission)
        : [];
      if (
        await c
          .get('db')
          .prepare('SELECT id FROM admin_roles WHERE lower(name) = lower(?) AND id != ?')
          .bind(name, id)
          .first()
      )
        throw new HTTPException(409, { message: 'Role name already exists' });
      const result = await commitAdminChange(
        c,
        access,
        {
          permission: 'platform.roles.manage',
          action: method === 'POST' ? 'platform.roles.create' : 'platform.roles.update',
          targetType: 'role',
          targetId: id,
          before: before ? { ...before, permissions: oldPermissions } : null,
          after: { id, name, archived, permissions },
          input,
          changes: (mutation, version) => [
            {
              sql: `INSERT INTO admin_roles (id,name,archived,version,updated_at) SELECT ?,?,?,?,? WHERE ${mutationGuard} ON CONFLICT(id) DO UPDATE SET name=excluded.name, archived=excluded.archived, version=excluded.version, updated_at=excluded.updated_at`,
              args: [id, name, Number(archived), version, Date.now(), mutation],
            },
            {
              sql: `DELETE FROM admin_role_permissions WHERE role_id = ? AND ${mutationGuard}`,
              args: [id, mutation],
            },
            ...permissions.map((permission) => ({
              sql: `INSERT INTO admin_role_permissions (role_id,permission) SELECT ?,? WHERE ${mutationGuard}`,
              args: [id, permission, mutation],
            })),
          ],
        },
        registry,
      );
      return c.json({ ...result, id }, method === 'POST' ? 201 : 200);
    });
  }
  api.get('/permissions', async (c) => {
    const access = await adminAccess(c, 'platform.roles.manage', registry);
    const [rows] = await adminSnapshot(c, access, [
      c.get('db').prepare('SELECT global_role,permissions_json FROM admin_policy'),
    ]);
    const policy: Record<string, string[]> = {};
    for (const role of ['moderator', 'admin'] as const) {
      const row = rows.results.find((p) => p.global_role === role);
      policy[role] = row
        ? JSON.parse(String(row.permissions_json))
        : [...registry.permissions.values()]
            .filter((p) => p.defaults.includes(role))
            .map((p) => p.key);
    }
    return c.json({
      version: access.version,
      permissions: [...registry.permissions.values()],
      policy,
    });
  });
  api.patch('/permissions', async (c) => {
    const access = await adminAccess(c, 'platform.roles.manage', registry);
    const input = await adminInput(c, ['policy']);
    const data = object(input.policy);
    keys(data, ['moderator', 'admin']);
    const policy = {
      moderator: permissionList(registry, data.moderator),
      admin: permissionList(registry, data.admin),
    };
    const stored = (
      await c.get('db').prepare('SELECT global_role,permissions_json FROM admin_policy').all()
    ).results;
    const before = Object.fromEntries(
      (['moderator', 'admin'] as const).map((role) => {
        const row = stored.find((item) => item.global_role === role);
        return [
          role,
          row
            ? JSON.parse(String(row.permissions_json))
            : [...registry.permissions.values()]
                .filter((p) => p.defaults.includes(role))
                .map((p) => p.key),
        ];
      }),
    );
    const result = await commitAdminChange(
      c,
      access,
      {
        permission: 'platform.roles.manage',
        action: 'platform.permissions.update',
        targetType: 'permission-policy',
        targetId: 'system',
        before,
        after: policy,
        input,
        changes: (mutation, version) =>
          Object.entries(policy).map(([role, permissions]) => ({
            sql: `INSERT INTO admin_policy (global_role,permissions_json,version) SELECT ?,?,? WHERE ${mutationGuard} ON CONFLICT(global_role) DO UPDATE SET permissions_json=excluded.permissions_json,version=excluded.version`,
            args: [role, JSON.stringify(permissions), version, mutation],
          })),
      },
      registry,
    );
    return c.json(result);
  });
  api.post('/users/:id/roles', async (c) => {
    const access = await adminAccess(c, 'platform.roles.manage', registry);
    const id = string(c.req.param('id'), 'user ID', 200);
    if (id === access.actor.id)
      throw new HTTPException(403, { message: 'You cannot change your own staff roles' });
    const input = await adminInput(c, ['globalRole', 'roleIds']);
    const globalRole = string(input.globalRole, 'globalRole');
    if (!['individual', 'moderator', 'admin', 'super_admin'].includes(globalRole))
      invalid('Invalid system role');
    if (
      !Array.isArray(input.roleIds) ||
      input.roleIds.length > 20 ||
      new Set(input.roleIds).size !== input.roleIds.length ||
      input.roleIds.some((v) => typeof v !== 'string' || v.length > 200)
    )
      invalid('Invalid role assignments');
    const roleIds = input.roleIds as string[];
    const before = await c
      .get('db')
      .prepare('SELECT id,global_role AS globalRole FROM user WHERE id = ?')
      .bind(id)
      .first();
    if (!before) throw new HTTPException(404, { message: 'User not found' });
    const old = (
      await c
        .get('db')
        .prepare('SELECT role_id FROM admin_user_roles WHERE user_id = ? ORDER BY role_id')
        .bind(id)
        .all()
    ).results.map((r) => r.role_id);
    for (const role of roleIds)
      if (
        !(await c
          .get('db')
          .prepare('SELECT id FROM admin_roles WHERE id = ? AND archived = 0')
          .bind(role)
          .first())
      )
        invalid('Only active custom roles may be assigned');
    const now = Date.now();
    const guard = {
      sql: `EXISTS (SELECT 1 FROM user WHERE id = ?) AND (? = 'super_admin' OR (SELECT global_role FROM user WHERE id = ?) != 'super_admin' OR EXISTS (SELECT 1 FROM user u WHERE u.global_role = 'super_admin' AND u.id != ? AND NOT EXISTS (SELECT 1 FROM account_controls a WHERE a.user_id=u.id AND a.suspended=1 AND (a.ends_at IS NULL OR a.ends_at > ?))))`,
      args: [id, globalRole, id, id, now],
    };
    return c.json(
      await commitAdminChange(
        c,
        access,
        {
          permission: 'platform.roles.manage',
          action: 'platform.users.roles',
          targetType: 'user',
          targetId: id,
          before: { globalRole: before.globalRole, roleIds: old },
          after: { globalRole, roleIds },
          input,
          guard,
          changes: (mutation) => [
            {
              sql: `UPDATE user SET global_role = ?, updated_at = ? WHERE id = ? AND ${mutationGuard}`,
              args: [globalRole, now, id, mutation],
            },
            {
              sql: `DELETE FROM admin_user_roles WHERE user_id = ? AND ${mutationGuard}`,
              args: [id, mutation],
            },
            ...roleIds.map((roleId) => ({
              sql: `INSERT INTO admin_user_roles (user_id,role_id) SELECT ?,? WHERE ${mutationGuard}`,
              args: [id, roleId, mutation],
            })),
          ],
        },
        registry,
      ),
    );
  });
}
