import type { D1DatabaseSession, D1PreparedStatement, D1Result } from '@cloudflare/workers-types';
import {
  type Benefit,
  type Grant,
  grantState,
  resolveMembership,
  validFeatureConfig,
} from '@electrasim/access';
import { HTTPException } from 'hono/http-exception';
import type { Data, FeatureInput } from './membership-validation';

export type Resource = 'plans' | 'features' | 'memberships';
export const resources = {
  plans: { table: 'plans', key: 'id' },
  features: { table: 'pro_features', key: 'key' },
  memberships: { table: 'entitlements', key: 'id' },
} as const;
const jsonFields = new Set(['config', 'before_json', 'after_json']);
const boolFields = new Set(['enabled', 'no_expiry']);
export function decode(row: Data): Data {
  return Object.fromEntries(
    Object.entries(row)
      .filter(([key]) => key !== 'mutation_id')
      .map(([key, value]) => {
        const field =
          key === 'before_json'
            ? 'before'
            : key === 'after_json'
              ? 'after'
              : key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        return [
          field,
          jsonFields.has(key) && typeof value === 'string'
            ? JSON.parse(value)
            : boolFields.has(key)
              ? value === 1
              : value,
        ];
      }),
  );
}
function decodeFeature(row: Data): Data {
  return {
    ...decode(row),
    name: JSON.parse(String(row.name)),
    description: JSON.parse(String(row.description)),
  };
}
export function column(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
function sqlValue(value: unknown): string | number | null {
  if (value == null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' || typeof value === 'number') return value;
  return JSON.stringify(value);
}
export async function readResource(
  db: D1DatabaseSession,
  resource: Resource,
  id: string,
): Promise<Data> {
  const { table, key } = resources[resource];
  const statements = [db.prepare(`SELECT * FROM ${table} WHERE ${key} = ?`).bind(id)];
  if (resource === 'plans')
    statements.push(
      db
        .prepare(
          'SELECT feature_key, enabled, config FROM plan_features WHERE plan_id = ? ORDER BY feature_key',
        )
        .bind(id),
      db
        .prepare(
          `SELECT COUNT(*) AS grant_count, COUNT(DISTINCT CASE WHEN status != 'revoked' AND (ends_at IS NULL OR ends_at > ?) THEN user_id END) AS affected_member_count FROM entitlements WHERE plan_id = ?`,
        )
        .bind(Date.now(), id),
    );
  if (resource === 'features')
    statements.push(
      db
        .prepare('SELECT COUNT(*) AS reference_count FROM plan_features WHERE feature_key = ?')
        .bind(id),
    );
  // Keep version, links and impact counts in one read transaction.
  const rows = await db.batch<Data>(statements);
  const row = rows[0].results[0];
  if (!row) throw new HTTPException(404, { message: 'Record not found' });
  const result = resource === 'features' ? decodeFeature(row) : decode(row);
  if (resource === 'plans') {
    result.features = rows[1].results.map(decode);
    Object.assign(result, decode(rows[2].results[0]));
  }
  if (resource === 'features') Object.assign(result, decode(rows[1].results[0]));
  return result;
}

export async function listResource(
  db: D1DatabaseSession,
  resource: Resource,
  limit: number,
  offset: number,
  userId?: string,
) {
  const { table, key } = resources[resource];
  const where = resource === 'memberships' && userId ? ' WHERE user_id = ?' : '';
  const params = where ? [userId!] : [];
  const [rows, total] = await db.batch<Data>([
    db
      .prepare(
        `SELECT * FROM ${table}${where} ORDER BY created_at DESC, ${key} DESC LIMIT ? OFFSET ?`,
      )
      .bind(...params, limit, offset),
    db.prepare(`SELECT COUNT(*) AS total FROM ${table}${where}`).bind(...params),
  ]);
  return {
    items: rows.results.map(resource === 'features' ? decodeFeature : decode),
    total: total.results[0].total,
    limit,
    offset,
  };
}
export async function planBenefits(
  db: D1DatabaseSession,
  features: FeatureInput[],
  existing: FeatureInput[] = [],
) {
  const guards: string[] = [];
  const args: unknown[] = [];
  const rows = features.length
    ? await db
        .prepare(
          `SELECT key, handler, archived_at FROM pro_features WHERE key IN (${features.map(() => '?').join(',')})`,
        )
        .bind(...features.map((feature) => feature.featureKey))
        .all<{ key: string; handler: string; archived_at: number | null }>()
    : { results: [] };
  for (const feature of features) {
    const found = rows.results.find((row) => row.key === feature.featureKey);
    if (!found || !validFeatureConfig(found.handler, feature.config))
      throw new HTTPException(400, { message: `Unsupported feature: ${feature.featureKey}` });
    const attached = existing.some((entry) => entry.featureKey === feature.featureKey);
    if (found.archived_at !== null && !attached)
      throw new HTTPException(400, { message: 'Archived feature cannot be added' });
    guards.push(
      `EXISTS (SELECT 1 FROM pro_features WHERE key = ? AND handler = ?${attached ? '' : ' AND archived_at IS NULL'})`,
    );
    args.push(feature.featureKey, found.handler);
  }
  return { sql: guards.length ? ` AND ${guards.join(' AND ')}` : '', args };
}

/** All writes, feature replacement and audit share one D1 transaction. A random mutation token
 * makes every dependent statement a no-op when the initial version/role/validity check loses.
 * The token cannot be supplied by clients. Timestamps alone are not unique enough here.
 */
export async function mutate(
  db: D1DatabaseSession,
  input: {
    resource: Resource;
    id: string;
    actorId: string;
    requestId: string;
    reason: string;
    before: Data | null;
    after: Data;
    features?: FeatureInput[];
    hardDelete?: boolean;
    guard?: { sql: string; args: unknown[] };
  },
) {
  const { resource, id, actorId, before, features, hardDelete } = input;
  const { table, key } = resources[resource];
  const token = crypto.randomUUID();
  const after: Data = { ...input.after, mutationId: token };
  const entries = Object.entries(after);
  const roleGuard = `EXISTS (SELECT 1 FROM user WHERE id = ? AND global_role = 'super_admin')`;
  const guard = input.guard ?? { sql: '', args: [] };
  const statements: D1PreparedStatement[] = [];
  if (!before) {
    statements.push(
      db
        .prepare(
          `INSERT INTO ${table} (${entries.map(([k]) => column(k)).join(',')}) SELECT ${entries.map(() => '?').join(',')} WHERE ${roleGuard}${guard.sql}`,
        )
        .bind(...entries.map(([, value]) => sqlValue(value)), actorId, ...guard.args),
    );
  } else {
    statements.push(
      db
        .prepare(
          `UPDATE ${table} SET ${entries.map(([k]) => `${column(k)} = ?`).join(',')} WHERE ${key} = ? AND version = ? AND ${roleGuard}${guard.sql}`,
        )
        .bind(
          ...entries.map(([, value]) => sqlValue(value)),
          id,
          before.version,
          actorId,
          ...guard.args,
        ),
    );
  }
  const claimed = `EXISTS (SELECT 1 FROM ${table} WHERE ${key} = ? AND mutation_id = ?)`;
  if (resource === 'plans' && (features || hardDelete)) {
    statements.push(
      db.prepare(`DELETE FROM plan_features WHERE plan_id = ? AND ${claimed}`).bind(id, id, token),
    );
    if (!hardDelete)
      for (const feature of features ?? []) {
        statements.push(
          db
            .prepare(
              `INSERT INTO plan_features (plan_id, feature_key, enabled, config) SELECT ?, ?, ?, ? WHERE ${claimed}`,
            )
            .bind(
              id,
              feature.featureKey,
              Number(feature.enabled),
              JSON.stringify(feature.config),
              id,
              token,
            ),
        );
      }
  }
  const { mutationId: _token, ...auditAfter } = after;
  const allFeatures = resource === 'plans' ? (features ?? before?.features ?? []) : undefined;
  const snapshot = { ...auditAfter, ...(allFeatures ? { features: allFeatures } : {}) };
  statements.push(
    db
      .prepare(
        `INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, before_json, after_json, reason, request_id, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE ${claimed}`,
      )
      .bind(
        crypto.randomUUID(),
        actorId,
        `${resource}.${hardDelete ? 'delete' : !before ? 'create' : resource === 'memberships' && after.status === 'revoked' ? 'revoke' : 'update'}`,
        resource,
        id,
        before ? JSON.stringify(before) : null,
        hardDelete ? null : JSON.stringify(snapshot),
        input.reason,
        input.requestId,
        after.updatedAt,
        id,
        token,
      ),
  );
  if (hardDelete)
    statements.push(
      db.prepare(`DELETE FROM ${table} WHERE ${key} = ? AND mutation_id = ?`).bind(id, token),
    );
  let result: D1Result[];
  try {
    result = await db.batch(statements);
  } catch (error) {
    if (/UNIQUE constraint|FOREIGN KEY constraint|CHECK constraint/i.test(String(error))) {
      throw new HTTPException(409, { message: 'Conflicting data; reload and retry' });
    }
    throw error;
  }
  if (!result[0].meta.changes) {
    const actor = await db
      .prepare('SELECT global_role FROM user WHERE id = ?')
      .bind(actorId)
      .first<{ global_role: string }>();
    throw new HTTPException(actor?.global_role === 'super_admin' ? 409 : 403, {
      message: 'Record or permission changed; reload before retrying',
    });
  }
  return hardDelete ? { deleted: true, id } : snapshot;
}

export async function ownMembership(
  db: D1DatabaseSession,
  userId: string,
  limit: number,
  offset: number,
) {
  const now = Date.now();
  const [effective, history, total] = await db.batch<Data>([
    db
      .prepare(`SELECT e.id, e.status, e.starts_at, e.ends_at, e.no_expiry, f.key, f.handler, f.enabled, pf.enabled AS plan_enabled, pf.config
      FROM entitlements e LEFT JOIN plan_features pf ON pf.plan_id = e.plan_id LEFT JOIN pro_features f ON f.key = pf.feature_key
      WHERE e.user_id = ? AND e.status = 'active' AND (e.ends_at IS NULL OR e.ends_at > ?)`)
      .bind(userId, now),
    db
      .prepare(
        'SELECT id, plan_id, source, status, starts_at, ends_at, no_expiry, version FROM entitlements WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?',
      )
      .bind(userId, limit, offset),
    db.prepare('SELECT COUNT(*) AS total FROM entitlements WHERE user_id = ?').bind(userId),
  ]);
  const grants = new Map<string, Grant>();
  for (const row of effective.results) {
    const id = String(row.id);
    let grant = grants.get(id);
    if (!grant) {
      grant = {
        id,
        status: row.status as Grant['status'],
        startsAt: Number(row.starts_at),
        endsAt: row.ends_at === null ? null : Number(row.ends_at),
        noExpiry: row.no_expiry === 1,
        features: [],
      };
      grants.set(id, grant);
    }
    if (row.key !== null) {
      let config: unknown;
      try {
        config = JSON.parse(String(row.config));
      } catch {
        config = null;
      }
      (grant.features as Benefit[]).push({
        key: String(row.key),
        handler: String(row.handler),
        enabled: row.enabled === 1,
        planEnabled: row.plan_enabled === 1,
        config,
      });
    }
  }
  const { states: _states, ...resolved } = resolveMembership([...grants.values()], now);
  return {
    ...resolved,
    asOf: now,
    grants: history.results.map((row) => ({
      ...decode(row),
      state: grantState(
        {
          id: String(row.id),
          status: row.status as Grant['status'],
          startsAt: Number(row.starts_at),
          endsAt: row.ends_at === null ? null : Number(row.ends_at),
          noExpiry: row.no_expiry === 1,
          features: [],
        },
        now,
      ),
    })),
    total: total.results[0].total,
    limit,
    offset,
  };
}
