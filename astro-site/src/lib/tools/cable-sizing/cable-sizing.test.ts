import { describe, expect, it } from 'vitest';
import {
  calculateCableSizing,
  calculateDesignCurrent,
  getCa,
  getCg,
  getCi,
  selectProtectiveDeviceRating,
} from './calculation';
import type { CableSizingInputs } from './types';

describe('Cable Sizing Calculation Engine', () => {
  it('correctly calculates design current for single phase resistive', () => {
    const ib = calculateDesignCurrent({
      systemType: 'single-phase',
      voltageVolts: 230,
      powerWatts: 7200, // 7.2 kW electric shower
      powerFactor: 1.0,
      runLengthMeters: 15,
      circuitFunction: 'power',
      installationMethod: 'C',
      conductorMaterial: 'copper',
      ambientTempC: 30,
      groupingCircuits: 1,
      thermalInsulationMm: 0,
      fuseTypeCc: false,
    });
    expect(ib).toBeCloseTo(31.3, 1);
  });

  it('selects 32A breaker for 31.3A load', () => {
    expect(selectProtectiveDeviceRating(31.3)).toBe(32);
  });

  it('sizes cable for domestic 40A shower run correctly (6mm² on Method C)', () => {
    const inputs: CableSizingInputs = {
      systemType: 'single-phase',
      voltageVolts: 230,
      powerWatts: 8500, // 8.5 kW shower
      powerFactor: 1.0,
      runLengthMeters: 15,
      circuitFunction: 'power',
      installationMethod: 'C', // clipped direct
      conductorMaterial: 'copper',
      ambientTempC: 30,
      groupingCircuits: 1,
      thermalInsulationMm: 0,
      fuseTypeCc: false,
    };

    const res = calculateCableSizing(inputs);
    expect(res.protectiveDeviceRatingIn).toBe(40);
    expect(res.selectedCableMm2).toBe(6);
    expect(res.thermalPass).toBe(true);
    expect(res.voltageDropPass).toBe(true);
    expect(res.status).toBe('pass');
  });

  it('upsizes cable when voltage drop exceeds 3% on long lighting run', () => {
    const inputs: CableSizingInputs = {
      systemType: 'single-phase',
      voltageVolts: 230,
      powerWatts: 1200, // ~5.2 A
      powerFactor: 0.95,
      runLengthMeters: 55, // long run
      circuitFunction: 'lighting', // 3% max = 6.9V
      installationMethod: 'C',
      conductorMaterial: 'copper',
      ambientTempC: 30,
      groupingCircuits: 1,
      thermalInsulationMm: 0,
      fuseTypeCc: false,
    };

    const res = calculateCableSizing(inputs);
    // 1.5mm² thermally handles 6A breaker, but 55m at 5.5A drops > 3%, so it must upsize
    expect(res.selectedCableMm2).toBeGreaterThanOrEqual(2.5);
    expect(res.voltageDropPercent).toBeLessThanOrEqual(3.0);
  });

  it('applies ambient temperature and grouping derating factors', () => {
    expect(getCa(25)).toBe(1.03);
    expect(getCa(30)).toBe(1.0);
    expect(getCa(40)).toBe(0.87);

    expect(getCg(1)).toBe(1.0);
    expect(getCg(2)).toBe(0.8);
    expect(getCg(4)).toBe(0.65);

    expect(getCi(0)).toBe(1.0);
    expect(getCi(100)).toBe(0.81);
  });
});
