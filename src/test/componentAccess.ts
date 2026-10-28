import { COMPONENT_ACCESS_BASELINE, validateComponentPolicy } from '@electrasim/access';
import { circuitRequirements } from '@electrasim/access/circuit';
import type { Circuit } from '@electrasim/domain/types';

export function policyFixture(revision = 1, free: readonly string[] = []) {
  return validateComponentPolicy({
    schemaVersion: 1,
    classificationVersion: 1,
    revision,
    components: COMPONENT_ACCESS_BASELINE.map(({ id, originalTier }) => ({
      id,
      access: originalTier === 'basic' || free.includes(id) ? 'free' : 'pro',
    })),
  });
}
export function authorizationFixture(
  circuit: Circuit,
  capabilities: readonly string[] = ['pro_components', 'advanced_faults', 'advanced_diagnostics'],
  policy = policyFixture(),
  userId: string | null = 'paid',
) {
  return {
    userId: userId ?? undefined,
    capabilities,
    policy,
    required: circuitRequirements(circuit, policy),
    nextChangeAt: null,
    asOf: Date.now(),
  };
}
export function authorizationResponse(
  init?: RequestInit,
  capabilities: readonly string[] = ['pro_components'],
  userId = 'member',
) {
  const { circuit } = JSON.parse(String(init?.body)) as { circuit: Circuit };
  return new Response(
    JSON.stringify(authorizationFixture(circuit, capabilities, policyFixture(), userId)),
  );
}
