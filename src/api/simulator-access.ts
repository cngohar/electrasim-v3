import {
  type Capability,
  type ValidatedComponentPolicy,
  missingCapabilities,
} from '@electrasim/access';
import { circuitRequirements } from '@electrasim/access/circuit';
import { normalizeCircuit } from '@electrasim/domain/circuitFormat';
import { validateCircuitInput } from '@electrasim/domain/core/input';
import type { Circuit } from '@electrasim/domain/types';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { readComponentPolicy } from './component-access-store';
import { type ApiEnv, requestAuth, requireSession } from './context';
import { ownMembership } from './membership-store';

export function readCircuit(value: unknown, preserveMomentary = false): Circuit {
  // This endpoint accepts a circuit, not a versioned file envelope. Apply the
  // shared strict validator directly; schema-1 wrapping would reject new laws.
  const result = validateCircuitInput(value);
  if (!result.valid)
    throw new HTTPException(400, { message: result.diagnostics[0]?.message ?? 'Invalid circuit.' });
  return normalizeCircuit(result.circuit, !preserveMomentary);
}
/** Compare revisions around the primary membership read. No client snapshot grants authority. */
export async function circuitAccess(
  c: Context<ApiEnv>,
  circuits: readonly Circuit[],
  expectedRevision?: number,
  enforce = true,
) {
  const policy = await readComponentPolicy(c);
  if (expectedRevision !== undefined && policy.revision !== expectedRevision) policyConflict();
  const required = [
    ...new Set(circuits.flatMap((circuit) => circuitRequirements(circuit, policy))),
  ];
  // Optional authenticated Free access still returns the actual user's benefits.
  // Repeating this check at response time also catches expired/revoked sessions.
  const authenticated =
    c.get('actor') ||
    required.length ||
    (c.req.header('Cookie') &&
      (await requestAuth(c).api.getSession({
        headers: c.req.raw.headers,
        query: { disableCookieCache: true },
      })));
  if (authenticated) {
    c.set('db', c.env.DB.withSession('first-primary'));
    await requireSession(c, async () => {});
  }
  const membership = c.get('actor')
    ? await ownMembership(c.env.DB.withSession('first-primary'), c.get('actor').id, 1, 0)
    : { capabilities: [] as Capability[], nextChangeAt: null, asOf: Date.now() };
  const finalPolicy = await readComponentPolicy(c);
  if (finalPolicy.revision !== policy.revision) policyConflict();
  if (enforce && missingCapabilities(membership.capabilities, required).length)
    throw new HTTPException(403, {
      message: 'An active membership with the required benefits is needed.',
    });
  return {
    userId: c.get('actor')?.id,
    required,
    capabilities: membership.capabilities,
    nextChangeAt: membership.nextChangeAt,
    asOf: membership.asOf,
    policy,
  };
}

export function policyConflict(): never {
  throw new HTTPException(409, { message: 'Component policy changed; reload before retrying' });
}

/** Final response authorization, after computation, uses a new primary snapshot. */
export function recheckCircuitAccess(
  c: Context<ApiEnv>,
  circuits: readonly Circuit[],
  policy: ValidatedComponentPolicy,
) {
  return circuitAccess(c, circuits, policy.revision);
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
