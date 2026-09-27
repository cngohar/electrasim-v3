import { COMPONENT_DEFS } from '@electrasim/domain/components';
import type { FaultType } from '@electrasim/domain/types';

export const CAPABILITIES = ['pro_components', 'advanced_faults', 'advanced_diagnostics'] as const;
export type Capability = (typeof CAPABILITIES)[number];
export type GlobalRole = 'individual' | 'admin' | 'moderator' | 'super_admin';
export function isCapability(value: string): value is Capability {
  return (CAPABILITIES as readonly string[]).includes(value);
}

// Boolean handlers only. Future benefit configuration requires an implemented handler.
export function validFeatureConfig(handler: string, config: unknown): boolean {
  return (
    isCapability(handler) &&
    config !== null &&
    typeof config === 'object' &&
    !Array.isArray(config) &&
    Object.keys(config).length === 0
  );
}
export interface Benefit {
  key: string;
  handler: string;
  enabled: boolean;
  planEnabled: boolean;
  config: unknown;
}
export interface Grant {
  id: string;
  status: 'active' | 'suspended' | 'revoked';
  startsAt: number;
  endsAt: number | null;
  noExpiry: boolean;
  features: readonly Benefit[];
}
export type GrantState = Grant['status'] | 'scheduled' | 'expired' | 'invalid';
export function grantState(grant: Grant, now: number): GrantState {
  if (
    !Number.isSafeInteger(now) ||
    !Number.isSafeInteger(grant.startsAt) ||
    grant.startsAt < 0 ||
    (grant.noExpiry
      ? grant.endsAt !== null
      : grant.endsAt === null ||
        !Number.isSafeInteger(grant.endsAt) ||
        grant.endsAt <= grant.startsAt)
  )
    return 'invalid';
  if (grant.status === 'suspended' || grant.status === 'revoked') return grant.status;
  if (grant.status !== 'active') return 'invalid';
  if (now < grant.startsAt) return 'scheduled';
  if (grant.endsAt !== null && now >= grant.endsAt) return 'expired';
  return 'active';
}

/** Pure snapshot resolver; callers supply fresh server data and UTC milliseconds. */
export function resolveMembership(grants: readonly Grant[], now: number) {
  const capabilities = new Set<Capability>();
  const states = grants.map((grant) => ({ id: grant.id, state: grantState(grant, now) }));
  let nextExpiry: number | null = null;
  let nextChangeAt: number | null = null;
  for (let i = 0; i < grants.length; i++) {
    const grant = grants[i];
    const state = states[i].state;
    if (state === 'scheduled') {
      nextChangeAt = Math.min(nextChangeAt ?? Number.POSITIVE_INFINITY, grant.startsAt);
    }
    if (state !== 'active') continue;
    if (grant.endsAt !== null) {
      nextExpiry = Math.min(nextExpiry ?? Number.POSITIVE_INFINITY, grant.endsAt);
      nextChangeAt = Math.min(nextChangeAt ?? Number.POSITIVE_INFINITY, grant.endsAt);
    }
    for (const benefit of grant.features) {
      if (
        benefit.enabled &&
        benefit.planEnabled &&
        isCapability(benefit.handler) &&
        validFeatureConfig(benefit.handler, benefit.config)
      )
        capabilities.add(benefit.handler);
    }
  }
  return {
    capabilities: CAPABILITIES.filter((key) => capabilities.has(key)),
    states,
    nextExpiry,
    nextChangeAt,
  };
}

// Product classification only: electrical severity and automatic safety findings are never gated.
export const FAULT_ACCESS = {
  'open-circuit': 'basic',
  'open-live': 'basic',
  'open-neutral': 'basic',
  'open-earth': 'basic',
  'terminal-disconnect': 'basic',
  'reverse-polarity': 'basic',
  'switched-neutral': 'basic',
  'short-circuit': 'basic',
  'earth-fault': 'basic',
  'live-to-earth': 'basic',
  'smooth-dc-residual': 'advanced',
  'arc-fault': 'advanced',
  'protection-forced-open': 'advanced',
  'protection-bypass': 'advanced',
} as const satisfies Record<FaultType, 'basic' | 'advanced'>;

/** Inputs must come from validated content, after legacy fault normalization, not client claims.
 * Natural safety findings are deliberately absent. No scenario regeneration occurs here.
 */
export function requirementsForContent(content: {
  componentTypes: readonly string[];
  injectedFaultTypes: readonly string[];
  diagnosis?: 'basic' | 'advanced' | 'ohmageddon';
}): Capability[] {
  if (
    content.diagnosis !== undefined &&
    !['basic', 'advanced', 'ohmageddon'].includes(content.diagnosis)
  )
    throw new Error('Unknown diagnosis mode');
  const required = new Set<Capability>();
  for (const type of content.componentTypes) {
    if (!Object.hasOwn(COMPONENT_DEFS, type)) throw new Error(`Unknown component: ${type}`);
    if (COMPONENT_DEFS[type].tier === 'pro') required.add('pro_components');
  }
  for (const type of content.injectedFaultTypes) {
    if (!Object.hasOwn(FAULT_ACCESS, type)) throw new Error(`Unknown fault: ${type}`);
    if (FAULT_ACCESS[type as FaultType] === 'advanced') required.add('advanced_faults');
  }
  if (content.injectedFaultTypes.length > 1) required.add('advanced_faults');
  if (
    content.diagnosis === 'advanced' ||
    content.diagnosis === 'ohmageddon' ||
    (content.diagnosis && required.has('advanced_faults'))
  )
    required.add('advanced_diagnostics');
  if (content.diagnosis === 'ohmageddon') required.add('advanced_faults');
  return CAPABILITIES.filter((key) => required.has(key));
}
export function missingCapabilities(owned: readonly Capability[], required: readonly Capability[]) {
  return required.filter((key) => !owned.includes(key));
}
