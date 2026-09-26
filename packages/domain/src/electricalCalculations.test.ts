import { describe, expect, it } from 'vitest';
import {
  calculateElectricalValues,
  calculateLoadCurrent,
  getMillivoltAmpMeter,
  getStandardCableAmpacity,
} from './electricalCalculations';

describe('electrical calculations', () => {
  it('calculates load current from power and voltage', () => {
    expect(calculateLoadCurrent(2300, 230)).toBe(10);
  });

  it('uses BS 7671 Table 4D5 (Method C) cable ampacity steps', () => {
    // Audit-locked 2026-08: 1.5 mm² is 20 A clipped direct (the old 16 A was
    // a derated-method value mixed into the wrong table).
    expect(getStandardCableAmpacity(1.5)).toBe(20);
    expect(getStandardCableAmpacity(2.5)).toBe(27);
  });

  it('derates ampacity by installation reference method', () => {
    // Table 4D1 (B1, conduit on wall) / Table 4D2A (A, thermal insulation).
    expect(getStandardCableAmpacity(2.5, 'copper', 'B1')).toBe(24);
    expect(getStandardCableAmpacity(2.5, 'copper', 'A')).toBe(18.5);
    expect(getStandardCableAmpacity(6, 'copper', 'B1')).toBe(41);
  });

  it('applies the installation method through the full calculation', () => {
    const result = calculateElectricalValues({
      powerWatts: 4600,
      voltage: 230,
      currentAmps: 20,
      cableMm2: 2.5,
      lengthMeters: 10,
      installationMethod: 'B1',
    });
    // B1 base ampacity 24 A: 20 A load passes; drop 18 × 20 × 10 / 1000 = 3.6 V (1.6 %).
    expect(result.ampacityAmps).toBe(24);
    expect(result.voltageDropVolts).toBeCloseTo(3.6, 1);
    expect(result.status).toBe('pass');
  });

  it('calculates two-way voltage drop from BS 7671 mV/A/m and passes a normal branch', () => {
    const result = calculateElectricalValues({
      powerWatts: 1150,
      voltage: 230,
      currentAmps: 5,
      cableMm2: 2.5,
      lengthMeters: 10,
    });
    // 18 mV/A/m (T&E 70 °C, Table 4D5) × 5 A × 10 m = 0.9 V ≈ 0.39 %.
    expect(result.voltageDropVolts).toBeCloseTo(0.9, 1);
    expect(result.resistanceOhms).toBeCloseTo(0.18, 2);
    expect(result.status).toBe('pass');
  });

  it('exceeds the 3 % guidance limit on long undersized runs', () => {
    const result = calculateElectricalValues({
      powerWatts: 4600,
      voltage: 230,
      currentAmps: 20,
      cableMm2: 1.5,
      lengthMeters: 30,
    });
    // 29 mV/A/m × 20 A × 30 m = 17.4 V ≈ 7.6 % > 3 %.
    expect(result.voltageDropVolts).toBeCloseTo(17.4, 0);
    expect(result.status).toBe('warning');
  });

  it('rejects non-finite and physically invalid inputs', () => {
    expect(calculateLoadCurrent(Number.NaN, 230)).toBe(0);
    expect(getStandardCableAmpacity(Number.NaN)).toBe(0);

    const result = calculateElectricalValues({
      powerWatts: Number.NaN,
      voltage: 0,
      currentAmps: Number.NaN,
      cableMm2: -1,
      lengthMeters: Number.POSITIVE_INFINITY,
    });

    expect(result.status).toBe('fail');
    expect(result.message).toBe('Invalid electrical calculation input.');
    expect(
      Object.values(result).some((value) => typeof value === 'number' && !Number.isFinite(value)),
    ).toBe(false);
  });

  it('calculates voltage drop and derating for aluminum conductor', () => {
    const result = calculateElectricalValues({
      powerWatts: 1150,
      voltage: 230,
      currentAmps: 5,
      cableMm2: 2.5,
      lengthMeters: 10,
      material: 'aluminum',
    });
    // Aluminum falls back to the 70 °C-corrected resistivity model:
    // 2 × 0.0282 × 1.2 × 1000 / 2.5 ≈ 27.1 mV/A/m → 5 A × 10 m ≈ 1.35 V.
    expect(result.voltageDropVolts).toBeCloseTo(1.35, 1);
    expect(result.ampacityAmps).toBe(21);
    expect(result.status).toBe('pass');
  });

  it('supports AWG gauge input', () => {
    const result = calculateElectricalValues({
      powerWatts: 1150,
      voltage: 230,
      currentAmps: 5,
      cableMm2: 0,
      gauge: 14,
      lengthMeters: 10,
    });
    expect(result.cableMm2).toBe(2.08);
    expect(result.status).toBe('pass');
  });
});

it('does not use the next larger tabulated conductor for an intermediate size', () => {
  // Fallback: 2 × 0.0175 Ω mm²/m × 1.2 × 1000 / 2 mm² = 21 mV/A/m.
  expect(getMillivoltAmpMeter(2, 'copper')).toBeCloseTo(21, 6);
  expect(getMillivoltAmpMeter(2.5, 'copper')).toBe(18);
});
