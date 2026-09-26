import { describe, expect, it } from 'vitest';
import {
  STANDARDS,
  recommendCurveForLoad,
  recommendMcbrating,
  voltageDropCeiling,
} from './standards';

describe('teaching profiles and recommendations', () => {
  it('keeps publication and adoption distinct and versions IEC parts independently', () => {
    expect(STANDARDS.uk.citation).toBe('BS 7671:2018+A4:2026');
    expect(STANDARDS.uk.metadata.adoption).toContain('15 October 2026');
    expect(STANDARDS.us.metadata.adoption).toContain('local');
    expect(STANDARDS.int.metadata.references.map((r) => r.document)).toEqual([
      'IEC 60364-1',
      'IEC 60364-8-81',
      'IEC 60364-8-82',
    ]);
  });
  it('does not require a motor curve for EVSE or induction electronics', () => {
    for (const s of Object.values(STANDARDS)) {
      expect(recommendCurveForLoad('ev-charger', s)).toBeNull();
      expect(recommendCurveForLoad('induction-hob', s)).toBeNull();
    }
  });
  it('selects an illustrative rating above P/V without applying 125% everywhere', () => {
    const r = recommendMcbrating(3680, 230, STANDARDS.uk);
    expect(r.designCurrentAmps).toBe(16);
    expect(r.ratingAmps).toBe(16);
    expect(recommendMcbrating(3700, 230, STANDARDS.uk).ratingAmps).toBe(20);
  });
  it('never silently undersizes an oversized or invalid load', () => {
    for (const [p, v] of [
      [15000, 230],
      [-1, 230],
      [100, 0],
      [Number.NaN, 230],
      [100, Number.POSITIVE_INFINITY],
    ]) {
      expect(recommendMcbrating(p, v, STANDARDS.uk).ratingAmps).toBeNull();
    }
  });
  it('does not substitute IEC breakers or UK voltage-drop thresholds for NEC rules', () => {
    expect(recommendMcbrating(1800, 120, STANDARDS.us).ratingAmps).toBeNull();
    expect(recommendCurveForLoad('motor', STANDARDS.us)).toBeNull();
    expect(voltageDropCeiling('bulb', STANDARDS.us)).toBeNull();
    expect(voltageDropCeiling('heater', STANDARDS.us)).toBeNull();
  });
});
