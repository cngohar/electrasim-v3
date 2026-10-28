import type { D1PreparedStatement } from '@cloudflare/workers-types';
import type { GlobalRole } from '@electrasim/access';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { type AdminRegistry, adminRegistry, effectivePermissions } from '../../platform/registry';
import type { ApiEnv } from '../context';

export type AdminAccess = {
  version: number;
  actor: { id: string; name: string; globalRole: GlobalRole };
  permissions: string[];
  navigation: { label: string; href: string; permissions: readonly string[] }[];
  auditNamespaces: string[];
};
export async function adminAccess(
  c: Context<ApiEnv>,
  permission?: string,
  registry: AdminRegistry = adminRegistry,
): Promise<AdminAccess> {
  const id = c.get('actor').id;
  c.set('db', c.env.DB.withSession('first-primary'));
  const [revision, identity, custom, policy] = await c
    .get('db')
    .batch<Record<string, unknown>>([
      c.get('db').prepare('SELECT version FROM admin_revision WHERE id = 1'),
      c
        .get('db')
        .prepare(
          'SELECT u.id, u.name, u.global_role AS globalRole, a.suspended, a.ends_at AS endsAt FROM user u LEFT JOIN account_controls a ON a.user_id = u.id WHERE u.id = ?',
        )
        .bind(id),
      c
        .get('db')
        .prepare(
          'SELECT p.permission FROM admin_user_roles ur JOIN admin_roles r ON r.id = ur.role_id AND r.archived = 0 JOIN admin_role_permissions p ON p.role_id = r.id WHERE ur.user_id = ?',
        )
        .bind(id),
      c
        .get('db')
        .prepare(
          'SELECT permissions_json FROM admin_policy WHERE global_role = (SELECT global_role FROM user WHERE id = ?)',
        )
        .bind(id),
    ]);
  const row = identity.results[0];
  if (!row) throw new HTTPException(401, { message: 'Authentication required' });
  if (row.suspended === 1 && (row.endsAt === null || Number(row.endsAt) > Date.now()))
    throw new HTTPException(403, { message: 'Platform account suspended' });
  const role = row.globalRole as GlobalRole;
  const grants = effectivePermissions(
    registry,
    role,
    policy.results.length ? JSON.parse(String(policy.results[0].permissions_json)) : null,
    custom.results.map((p) => String(p.permission)),
  );
  if (!grants.length || (permission && !grants.includes(permission)))
    throw new HTTPException(403, { message: 'Permission denied' });
  return {
    actor: { id, name: String(row.name), globalRole: role },
    version: Number(revision.results[0].version),
    permissions: grants.sort(),
    navigation: registry.modules
      .flatMap((m) => m.navigation)
      .filter((nav) => nav.permissions.some((key) => grants.includes(key))),
    auditNamespaces: registry.modules
      .filter((m) => m.auditPermission && grants.includes(m.auditPermission))
      .map((m) => m.id),
  };
}
export async function adminSnapshot(
  c: Context<ApiEnv>,
  access: AdminAccess,
  statements: D1PreparedStatement[],
) {
  const [revision, ...data] = await c
    .get('db')
    .batch<Record<string, unknown>>([
      c.get('db').prepare('SELECT version FROM admin_revision WHERE id = 1'),
      ...statements,
    ]);
  if (Number(revision.results[0].version) !== access.version)
    throw new HTTPException(409, { message: 'Administration changed; reload before retrying' });
  return data;
}
