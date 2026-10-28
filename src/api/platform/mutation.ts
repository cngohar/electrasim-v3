import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { type AdminRegistry, adminRegistry } from '../../platform/registry';
import type { ApiEnv } from '../context';
import { integer, string } from '../membership-validation';
import type { AdminAccess } from './access';

export type SqlChange = { sql: string; args?: unknown[] };
export type AdminChange = {
  permission: string;
  action: string;
  targetType: string;
  targetId: string;
  before: unknown;
  after: unknown;
  input: { version?: unknown; reason?: unknown };
  changes: (mutationId: string, version: number) => SqlChange[];
  guard?: SqlChange;
};
// Used in every mutation statement after its revision claim. The unique mutation
// ID belongs to this transaction only; failed claims cannot write data or audit.
export const mutationGuard = '(SELECT mutation_id FROM admin_revision WHERE id = 1) = ?';
export async function commitAdminChange(
  c: Context<ApiEnv>,
  access: AdminAccess,
  change: AdminChange,
  registry: AdminRegistry = adminRegistry,
) {
  const namespace = registry.actions.get(change.action);
  if (
    !namespace ||
    !change.permission.startsWith(`${namespace}.`) ||
    !registry.permissions.has(change.permission) ||
    !access.permissions.includes(change.permission)
  )
    throw new HTTPException(403, { message: 'Unregistered or unauthorized audit action' });
  const expected = integer(change.input.version, 'version', 1);
  const reason = string(change.input.reason, 'reason', 1000);
  if (expected !== access.version)
    throw new HTTPException(409, { message: 'Administration changed; reload before retrying' });
  const id = crypto.randomUUID();
  const now = Date.now();
  const db = c.get('db');
  const guard = change.guard ?? { sql: '1 = 1', args: [] };
  const changes = change.changes(id, expected + 1);
  if (changes.some((stmt) => !stmt.sql.includes(mutationGuard)))
    throw new HTTPException(403, { message: 'Administrative mutations require a revision guard' });
  const result = await db.batch([
    db
      .prepare(`UPDATE admin_revision SET version = version + 1, mutation_id = ? WHERE id = 1 AND version = ?
      AND EXISTS (SELECT 1 FROM user u WHERE u.id = ? AND u.global_role = ?)
      AND NOT EXISTS (SELECT 1 FROM account_controls WHERE user_id = ? AND suspended = 1 AND (ends_at IS NULL OR ends_at > ?))
      AND (${guard.sql})`)
      .bind(
        id,
        expected,
        access.actor.id,
        access.actor.globalRole,
        access.actor.id,
        now,
        ...(guard.args ?? []),
      ),
    ...changes.map((stmt) => db.prepare(stmt.sql).bind(...(stmt.args ?? []))),
    db
      .prepare(`INSERT INTO admin_audit (id,namespace,actor_id,action,target_type,target_id,before_json,after_json,reason,request_id,created_at,version)
      SELECT ?,?,?,?,?,?,?,?,?,?,?,? WHERE ${mutationGuard}`)
      .bind(
        id,
        namespace,
        access.actor.id,
        change.action,
        change.targetType,
        change.targetId,
        change.before == null ? null : JSON.stringify(change.before),
        change.after == null ? null : JSON.stringify(change.after),
        reason,
        c.get('requestId'),
        now,
        expected + 1,
        id,
      ),
  ]);
  if (result[0].meta.changes !== 1)
    throw new HTTPException(409, {
      message: 'Administration changed or action no longer allowed; reload before retrying',
    });
  return { ok: true, version: expected + 1, auditId: id };
}
