import { describe, expect, it } from 'vitest';
import { MAX_ZS_TABLE, calculateMaxZs } from './calculation';

describe('Max Zs & Disconnection Time Engine', () => {
  it('contains accurate BS 7671 Table 41.3 values for Type B MCB', () => {
    expect(MAX_ZS_TABLE['mcb-b'][32]).toBe(1.37);
    expect(MAX_ZS_TABLE['mcb-b'][16]).toBe(2.73);
    expect(MAX_ZS_TABLE['mcb-b'][6]).toBe(7.28);
  });

  it('contains accurate BS 7671 Table 41.3 values for Type C MCB', () => {
    expect(MAX_ZS_TABLE['mcb-c'][32]).toBe(0.68);
    expect(MAX_ZS_TABLE['mcb-c'][16]).toBe(1.37);
  });

  it('calculates Zs and confirms 0.4s disconnection pass on a standard 32A B-curve ring/radial', () => {
    const result = calculateMaxZs({
      deviceType: 'mcb-b',
      ratingAmps: 32,
      earthArrangement: 'TN-C-S',
      runLengthMeters: 20,
      lineCableMm2: 2.5,
      operatingTempAdjusted: true,
    });

    expect(result.maxZsOhms).toBe(1.37);
    expect(result.coldRuleLimitOhms).toBeCloseTo(1.096, 2);
    expect(result.zeOhms).toBe(0.35);
    // (7.41 + 12.1) mΩ/m = 19.51 mΩ/m * 1.2 = 23.41 mΩ/m * 20m = 0.468 Ω
    // Zs = 0.35 + 0.468 = 0.818 Ω <= 1.096 Ω
    expect(result.calculatedZsOhms).toBeLessThan(result.coldRuleLimitOhms);
    expect(result.passHot).toBe(true);
    expect(result.passCold).toBe(true);
    expect(result.status).toBe('pass');
  });

  it('detects failure when run length makes Zs exceed maximum allowable limit', () => {
    const result = calculateMaxZs({
      deviceType: 'mcb-b',
      ratingAmps: 32,
      earthArrangement: 'TN-C-S',
      runLengthMeters: 65, // excessive length
      lineCableMm2: 2.5,
      operatingTempAdjusted: true,
    });

    expect(result.calculatedZsOhms).toBeGreaterThan(1.37);
    expect(result.passHot).toBe(false);
    expect(result.status).toBe('fail');
  });
});
