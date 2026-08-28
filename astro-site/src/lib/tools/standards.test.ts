import { describe, expect, it } from 'vitest';
import {
  METRIC_STANDARD_OPTIONS,
  STANDARD_PROFILES,
  getStandardProfile,
  isMetricStandard,
} from './standards';

describe('Standards Profiles', () => {
  it('provides three regional profiles: UK BS 7671, IEC 60364, US NEC', () => {
    expect(Object.keys(STANDARD_PROFILES).sort()).toEqual(['iec-60364', 'uk-bs7671', 'us-nec']);
  });

  it('defaults to UK BS 7671 for unknown/undefined ids', () => {
    expect(getStandardProfile(undefined).id).toBe('uk-bs7671');
    expect(getStandardProfile('nonsense' as never).id).toBe('uk-bs7671');
  });

  it('encodes the correct voltage-drop limit banding per standard', () => {
    expect(STANDARD_PROFILES['uk-bs7671'].vdrop.lightingPct).toBe(3);
    expect(STANDARD_PROFILES['uk-bs7671'].vdrop.powerPct).toBe(5);
    // IEC 60364-5-52 Annex G: 4% lighting / 5% other on public LV supplies
    expect(STANDARD_PROFILES['iec-60364'].vdrop.lightingPct).toBe(4);
    expect(STANDARD_PROFILES['iec-60364'].vdrop.powerPct).toBe(5);
    // NEC 210.19(A) / 215.2(A)(1) informational notes: 3% / 5% advisory
    expect(STANDARD_PROFILES['us-nec'].vdrop.lightingPct).toBe(3);
    expect(STANDARD_PROFILES['us-nec'].vdrop.powerPct).toBe(5);
  });

  it('uses imperial conductor/length units only for the US NEC profile', () => {
    expect(STANDARD_PROFILES['uk-bs7671'].conductorUnit).toBe('mm²');
    expect(STANDARD_PROFILES['iec-60364'].conductorUnit).toBe('mm²');
    expect(STANDARD_PROFILES['us-nec'].conductorUnit).toBe('AWG/kcmil');
    expect(STANDARD_PROFILES['us-nec'].lengthUnit).toBe('ft');
  });

  it('exposes citation text for trust surfaces near calculation results', () => {
    expect(STANDARD_PROFILES['uk-bs7671'].citation).toContain('BS 7671');
    expect(STANDARD_PROFILES['iec-60364'].citation).toContain('IEC 60364');
    expect(STANDARD_PROFILES['us-nec'].citation).toContain('NEC 210.19');
  });

  it('excludes NEC from the shared metric selector options', () => {
    expect(METRIC_STANDARD_OPTIONS).toEqual(['uk-bs7671', 'iec-60364']);
    expect(isMetricStandard('us-nec')).toBe(false);
    expect(isMetricStandard('iec-60364')).toBe(true);
    expect(isMetricStandard(undefined)).toBe(true);
  });
});
