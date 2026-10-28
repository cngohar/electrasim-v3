import type { D1DatabaseSession, D1Result } from '@cloudflare/workers-types';
import {
  COMPONENT_ACCESS_BASELINE,
  type ValidatedComponentPolicy,
  validateComponentPolicy,
} from '@electrasim/access';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ApiEnv } from './context';

type Row = Record<string, unknown>;
export function policyStatements(db: D1DatabaseSession) {
  return [
    db.prepare('SELECT revision FROM component_access_revision WHERE id = 1'),
    db.prepare(
      'SELECT component_id, original_tier FROM component_access_baseline ORDER BY component_id',
    ),
    db.prepare(
      'SELECT component_id, access, version FROM component_access_overrides ORDER BY component_id',
    ),
  ];
}

/** Validate persisted inventory too: missing storage must never fabricate a Free grant. */
export function decodePolicy(rows: D1Result<Row>[]) {
  const [revision, baseline, overrides] = rows;
  try {
    const value = revision.results[0]?.revision;
    if (revision.results.length !== 1 || !Number.isSafeInteger(value) || Number(value) < 1)
      throw new Error('Invalid revision');
    const expected = new Map<string, string>(
      COMPONENT_ACCESS_BASELINE.map((item) => [item.id, item.originalTier]),
    );
    if (
      baseline.results.length !== expected.size ||
      baseline.results.some((row) => expected.get(String(row.component_id)) !== row.original_tier)
    )
      throw new Error('Invalid baseline');
    const changes = new Map<string, 'free' | 'pro'>();
    const versions = new Map<string, number>();
    for (const row of overrides.results) {
      const id = String(row.component_id);
      if (
        expected.get(id) !== 'pro' ||
        changes.has(id) ||
        (row.access !== 'free' && row.access !== 'pro') ||
        !Number.isSafeInteger(row.version) ||
        Number(row.version) < 1
      )
        throw new Error('Invalid override');
      changes.set(id, row.access);
      versions.set(id, Number(row.version));
    }
    const policy = validateComponentPolicy({
      schemaVersion: 1,
      classificationVersion: 1,
      revision: value,
      components: COMPONENT_ACCESS_BASELINE.map(({ id, originalTier }) => ({
        id,
        access: changes.get(id) ?? (originalTier === 'basic' ? 'free' : 'pro'),
      })),
    });
    return { policy, versions };
  } catch {
    throw new HTTPException(503, { message: 'Component access policy unavailable' });
  }
}

/** Each authority read starts on primary, including the final action recheck. */
export async function readComponentPolicy(c: Context<ApiEnv>): Promise<ValidatedComponentPolicy> {
  const db = c.env.DB.withSession('first-primary');
  return decodePolicy(await db.batch<Row>(policyStatements(db))).policy;
}

export function policyGuard(revision: number) {
  return {
    sql: ' AND EXISTS (SELECT 1 FROM component_access_revision WHERE id = 1 AND revision = ?)',
    args: [revision],
  };
}
