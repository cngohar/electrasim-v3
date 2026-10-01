import { type Capability, missingCapabilities } from '@electrasim/access';
import { normalizeCircuit, validateCircuitJSON } from '@electrasim/domain/circuitFormat';
import type { Circuit } from '@electrasim/domain/types';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { type ApiEnv, requireSession } from './context';
import { ownMembership } from './membership-store';

export function readCircuit(value: unknown, preserveMomentary = false): Circuit {
  const error = validateCircuitJSON({ version: 1, circuit: value });
  if (error) throw new HTTPException(400, { message: error });
  return normalizeCircuit(value as Circuit, !preserveMomentary);
}
export async function authorize(c: Context<ApiEnv>, required: readonly Capability[]) {
  if (!required.length)
    return { capabilities: [] as Capability[], nextChangeAt: null, asOf: Date.now() };
  if (!c.get('actor')) await requireSession(c, async () => {});
  const membership = await ownMembership(c.get('db'), c.get('actor').id, 1, 0);
  if (missingCapabilities(membership.capabilities, required).length)
    throw new HTTPException(403, {
      message: 'An active membership with the required benefits is needed.',
    });
  return membership;
}
/** Repeat capability predicates in the write transaction so a racing revocation wins. */
export function capabilityGuard(userId: string, required: readonly Capability[], now: number) {
  return {
    sql: required
      .map(
        () => ` AND EXISTS (SELECT 1 FROM entitlements e JOIN plan_features pf ON pf.plan_id = e.plan_id JOIN pro_features f ON f.key = pf.feature_key
      WHERE e.user_id = ? AND e.status = 'active' AND e.starts_at <= ?
      AND ((e.no_expiry = 1 AND e.ends_at IS NULL) OR (e.no_expiry = 0 AND e.ends_at > ? AND e.ends_at > e.starts_at))
      AND pf.enabled = 1 AND f.enabled = 1 AND f.handler = ? AND json(pf.config) = '{}')`,
      )
      .join(''),
    args: required.flatMap((capability) => [userId, now, now, capability]),
  };
}
