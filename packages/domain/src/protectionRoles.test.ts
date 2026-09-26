import { describe, expect, it } from 'vitest';
import { COMPONENT_DEFS } from './components';
import {
  getProtectionRole,
  isArcFaultDevice,
  isAutomaticProtection,
  isOvercurrentDevice,
  isResidualDevice,
} from './protectionRoles';

describe('getProtectionRole', () => {
  it('classifies every MCB curve as overcurrent-only', () => {
    for (const type of ['mcb', 'mcb-type-c', 'mcb-type-d']) {
      const role = getProtectionRole(type);
      expect(role.overcurrent, type).toBe(true);
      expect(role.residual, type).toBe(false);
      expect(role.arcFault, type).toBe(false);
    }
  });

  it('classifies a plain RCD as residual-only — it has no overcurrent element', () => {
    const role = getProtectionRole('rcd');
    expect(role.residual).toBe(true);
    expect(role.overcurrent).toBe(false);
  });

  it('classifies an RCBO as both overcurrent and residual', () => {
    const role = getProtectionRole('rcbo');
    expect(role.overcurrent).toBe(true);
    expect(role.residual).toBe(true);
    expect(role.arcFault).toBe(false);
  });

  it('is the only classifier that sees the AFDD as an RCBO with arc detection', () => {
    const role = getProtectionRole('afdd');
    expect(role.overcurrent).toBe(true);
    expect(role.residual).toBe(true);
    expect(role.arcFault).toBe(true);
    // The substring checks this replaced looked for 'rcd'/'rcbo', which the
    // string "afdd" does not contain — so the AFDD was invisible to them.
    expect('afdd'.includes('rcd')).toBe(false);
    expect('afdd'.includes('rcbo')).toBe(false);
  });

  it('classifies fuses and MCCBs as overcurrent despite having no IEC 60898 curve', () => {
    expect(isOvercurrentDevice('fuse')).toBe(true);
    expect(isOvercurrentDevice('fused-spur')).toBe(true);
    expect(isOvercurrentDevice('mccb')).toBe(true);
    expect(COMPONENT_DEFS.fuse?.mcbType).toBeUndefined();
    expect(COMPONENT_DEFS.mccb?.mcbType).toBeUndefined();
  });

  it('treats a GFCI outlet as a residual device even though it is a socket', () => {
    expect(isResidualDevice('socket-gfci')).toBe(true);
    expect(COMPONENT_DEFS['socket-gfci']?.isProtection).toBeUndefined();
  });

  it('separates isolation from protection', () => {
    for (const type of ['main-switch', 'isolator-switch']) {
      const role = getProtectionRole(type);
      expect(role.isolationOnly, type).toBe(true);
      expect(isAutomaticProtection(type), type).toBe(false);
      // Both are flagged isProtection in the registry, which is why the flag
      // alone cannot answer "will this trip?".
      expect(COMPONENT_DEFS[type]?.isProtection, type).toBe(true);
    }
  });

  it('treats an SPD as surge diversion, not fault interruption', () => {
    const role = getProtectionRole('spd');
    expect(role.surge).toBe(true);
    expect(isAutomaticProtection('spd')).toBe(false);
  });

  it('returns an all-false role for loads, switches and unknown types', () => {
    for (const type of ['bulb', 'single-way-switch', 'socket-3pin', 'not-a-real-type']) {
      const role = getProtectionRole(type);
      expect(isAutomaticProtection(type), type).toBe(false);
      expect(role.isolationOnly, type).toBe(false);
      expect(role.surge, type).toBe(false);
    }
  });

  it('never reports a role for a component the registry does not flag as protection', () => {
    for (const [type, def] of Object.entries(COMPONENT_DEFS)) {
      if (def.isProtection || type === 'socket-gfci') continue;
      const role = getProtectionRole(type);
      expect(
        role.overcurrent || role.residual || role.arcFault || role.surge || role.isolationOnly,
        `${type} should have no protective role`,
      ).toBe(false);
    }
  });

  it('gives every isProtection device exactly one classification', () => {
    for (const [type, def] of Object.entries(COMPONENT_DEFS)) {
      if (!def.isProtection) continue;
      const role = getProtectionRole(type);
      expect(
        role.overcurrent || role.residual || role.arcFault || role.surge || role.isolationOnly,
        `${type} is flagged isProtection but has no classified role`,
      ).toBe(true);
    }
  });

  it('exposes arc detection for the AFDD alone', () => {
    const arcDevices = Object.keys(COMPONENT_DEFS).filter((t) => isArcFaultDevice(t));
    expect(arcDevices).toEqual(['afdd']);
  });
});
