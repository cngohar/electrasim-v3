import { COMPONENT_DEFS } from '@electrasim/domain/components';
import { FAULT_REGISTRY } from '@electrasim/domain/faults';
import { describe, expect, it } from 'vitest';
import {
  CAPABILITIES,
  FAULT_ACCESS,
  type Grant,
  grantState,
  missingCapabilities,
  requirementsForContent,
  resolveMembership,
} from './index';

const grant: Grant = {
  id: 'grant',
  status: 'active',
  startsAt: 1000,
  endsAt: 2000,
  noExpiry: false,
  features: [
    {
      key: 'pro_components',
      handler: 'pro_components',
      enabled: true,
      planEnabled: true,
      config: {},
    },
  ],
};
describe('membership resolution', () => {
  it.each([
    [999, 'scheduled'],
    [1000, 'active'],
    [1999, 'active'],
    [2000, 'expired'],
  ] as const)('uses exact millisecond boundaries at %s', (now, state) => {
    expect(grantState(grant, now)).toBe(state);
    expect(resolveMembership([grant], now).capabilities).toEqual(
      state === 'active' ? ['pro_components'] : [],
    );
  });
  it.each(['suspended', 'revoked'] as const)('%s grants never authorize', (status) => {
    expect(resolveMembership([{ ...grant, status }], 1500).capabilities).toEqual([]);
  });
  it('requires explicit no expiry, rejecting malformed validity', () => {
    expect(resolveMembership([{ ...grant, endsAt: null }], 1500).capabilities).toEqual([]);
    expect(resolveMembership([{ ...grant, endsAt: 1000 }], 1500).capabilities).toEqual([]);
    expect(resolveMembership([{ ...grant, noExpiry: true }], 1500).capabilities).toEqual([]);
    expect(
      resolveMembership([{ ...grant, endsAt: null, noExpiry: true }], 1e12).capabilities,
    ).toEqual(['pro_components']);
  });
  it('unions overlapping grants and removes only the revoked contribution', () => {
    const advanced: Grant = {
      ...grant,
      id: 'second',
      endsAt: 3000,
      features: [{ ...grant.features[0], handler: 'advanced_faults' }],
    };
    expect(resolveMembership([grant, advanced], 1500)).toMatchObject({
      capabilities: ['pro_components', 'advanced_faults'],
      nextExpiry: 2000,
      nextChangeAt: 2000,
    });
    expect(
      resolveMembership([{ ...grant, status: 'revoked' }, advanced], 1500).capabilities,
    ).toEqual(['advanced_faults']);
    expect(resolveMembership([grant, advanced], 2000).capabilities).toEqual(['advanced_faults']);
  });
  it('reports future activation independently of next active expiry', () => {
    expect(resolveMembership([grant], 500)).toMatchObject({
      capabilities: [],
      nextExpiry: null,
      nextChangeAt: 1000,
    });
  });
  it.each([
    { enabled: false },
    { planEnabled: false },
    { handler: 'invented_quota' },
    { config: { arbitrary: true } },
    { config: null },
    { config: [] },
  ])('fails closed for unsupported or disabled benefit %j', (change) => {
    expect(
      resolveMembership([{ ...grant, features: [{ ...grant.features[0], ...change }] }], 1500)
        .capabilities,
    ).toEqual([]);
  });
  it('has no role or marketing-state shortcut to paid access', () => {
    expect(resolveMembership([], 1500).capabilities).toEqual([]);
    expect(missingCapabilities([], [...CAPABILITIES])).toEqual(CAPABILITIES);
  });
});

describe('canonical content policy', () => {
  it('covers the entire real component and fault catalog', () => {
    expect(Object.keys(FAULT_ACCESS).sort()).toEqual(Object.keys(FAULT_REGISTRY).sort());
    const pro: string[] = [];
    for (const [type, definition] of Object.entries(COMPONENT_DEFS)) {
      const requirements = requirementsForContent({
        componentTypes: [type],
        injectedFaultTypes: [],
      });
      expect(requirements).toEqual(definition.tier === 'pro' ? ['pro_components'] : []);
      if (definition.tier === 'pro') pro.push(type);
    }
    expect(pro).toHaveLength(41);
  });
  it('keeps each confirmed basic single fault and basic diagnosis free', () => {
    for (const [type, level] of Object.entries(FAULT_ACCESS)) {
      if (level === 'basic')
        expect(
          requirementsForContent({
            componentTypes: [],
            injectedFaultTypes: [type],
            diagnosis: 'basic',
          }),
        ).toEqual([]);
    }
  });
  it('requires all applicable capabilities for premium multi-fault diagnosis', () => {
    const pro = Object.keys(COMPONENT_DEFS).find((key) => COMPONENT_DEFS[key].tier === 'pro')!;
    expect(
      requirementsForContent({
        componentTypes: [pro],
        injectedFaultTypes: ['open-live', 'open-neutral'],
        diagnosis: 'basic',
      }),
    ).toEqual(CAPABILITIES);
    expect(
      requirementsForContent({ componentTypes: [], injectedFaultTypes: ['arc-fault'] }),
    ).toEqual(['advanced_faults']);
  });
  it('requires advanced diagnosis and faults for every Ohmageddon scenario', () => {
    expect(
      requirementsForContent({
        componentTypes: [],
        injectedFaultTypes: [],
        diagnosis: 'ohmageddon',
      }),
    ).toEqual(['advanced_faults', 'advanced_diagnostics']);
    expect(
      requirementsForContent({ componentTypes: [], injectedFaultTypes: [], diagnosis: 'advanced' }),
    ).toEqual(['advanced_diagnostics']);
  });
  it.each(['unknown', '__proto__', 'constructor'])('rejects unknown or prototype IDs %s', (id) => {
    expect(() => requirementsForContent({ componentTypes: [id], injectedFaultTypes: [] })).toThrow(
      'Unknown component',
    );
    expect(() => requirementsForContent({ componentTypes: [], injectedFaultTypes: [id] })).toThrow(
      'Unknown fault',
    );
  });
});
