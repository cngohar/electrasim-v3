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

describe('Max Zs — IEC 60364 Mode', () => {
  const baseInputs = {
    deviceType: 'mcb-b' as const,
    ratingAmps: 32,
    earthArrangement: 'TN-C-S' as const,
    runLengthMeters: 20,
    lineCableMm2: 2.5,
    operatingTempAdjusted: true,
  };

  it('derives Zs limits from Zs × Ia ≤ U0 without the UK Cmin factor', () => {
    const result = calculateMaxZs({ ...baseInputs, standard: 'iec-60364' });
    // Tabulated UK value 1.37 Ω is Cmin (0.95)-corrected; IEC: 230/160 = 1.4375 ≈ table/0.95
    expect(result.maxZsOhms).toBeCloseTo(1.37 / 0.95, 3);
    expect(result.cMinFactor).toBe(1.0);
    expect(result.standardLabel).toBe('IEC 60364');
  });

  it('applies the IEC 60364-6 ≈2/3 ambient-measurement rule instead of GN3 80%', () => {
    const result = calculateMaxZs({ ...baseInputs, standard: 'iec-60364' });
    expect(result.coldRuleLimitOhms).toBeCloseTo((1.37 / 0.95) * (2 / 3), 3);
    expect(result.coldRuleLabel).toContain('IEC 60364-6');
    // Zs ≈ 0.818 Ω stays within the 0.96 Ω ambient limit
    expect(result.status).toBe('pass');
  });

  it('reports a higher prospective fault current without the Cmin reduction', () => {
    const uk = calculateMaxZs({ ...baseInputs, standard: 'uk-bs7671' });
    const iec = calculateMaxZs({ ...baseInputs, standard: 'iec-60364' });
    expect(iec.prospectiveFaultCurrentAmps).toBeGreaterThan(uk.prospectiveFaultCurrentAmps);
    expect(uk.calculatedZsOhms).toBeCloseTo(iec.calculatedZsOhms, 9);
  });
});

describe('Max Zs — RCD touch-voltage derivation', () => {
  it('keeps the 50 V / 30 mA ceiling identical across standards (no Cmin de-correction)', () => {
    const inputs = {
      deviceType: 'rcd-30ma' as const,
      ratingAmps: 32,
      earthArrangement: 'TT' as const,
      runLengthMeters: 20,
      lineCableMm2: 2.5,
      operatingTempAdjusted: true,
    };
    const uk = calculateMaxZs({ ...inputs, standard: 'uk-bs7671' });
    const iec = calculateMaxZs({ ...inputs, standard: 'iec-60364' });
    expect(uk.maxZsOhms).toBe(1667);
    expect(iec.maxZsOhms).toBe(1667);
  });
});
