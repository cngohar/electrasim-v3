import { describe, expect, it } from 'vitest';
import {
  NEC_CONDUCTORS,
  calculateNecVoltageDrop,
  getConductorsForMaterial,
  necResistanceOhmsPerKft,
} from './nec-voltage-drop';

describe('NEC Chapter 9 Table 8 conductor data', () => {
  it('publishes correct 75 °C stranded copper resistances (Ω/kFT)', () => {
    expect(necResistanceOhmsPerKft('14', 'copper')).toBeCloseTo(3.14, 4);
    expect(necResistanceOhmsPerKft('12', 'copper')).toBeCloseTo(1.98, 4);
    expect(necResistanceOhmsPerKft('10', 'copper')).toBeCloseTo(1.24, 4);
    expect(necResistanceOhmsPerKft('8', 'copper')).toBeCloseTo(0.778, 4);
    expect(necResistanceOhmsPerKft('4/0', 'copper')).toBeCloseTo(0.0608, 4);
  });

  it('publishes correct 75 °C stranded aluminum resistances (Ω/kFT)', () => {
    expect(necResistanceOhmsPerKft('12', 'aluminum')).toBeCloseTo(3.25, 4);
    expect(necResistanceOhmsPerKft('4/0', 'aluminum')).toBeCloseTo(0.1, 4);
  });

  it('applies inferred-absolute-zero temperature correction (Cu: K=234.5)', () => {
    // At 30 °C: R = R75 × (234.5 + 30) / (234.5 + 75) = 1.98 × 0.8546 ≈ 1.692
    const r30 = necResistanceOhmsPerKft('12', 'copper', 30);
    expect(r30).not.toBeNull();
    expect(r30!).toBeCloseTo(1.98 * (264.5 / 309.5), 4);
    expect(r30!).toBeLessThan(1.98);
  });

  it('marks 14 AWG and 3 AWG as copper-only (not published for aluminum)', () => {
    expect(necResistanceOhmsPerKft('14', 'aluminum')).toBeNull();
    expect(necResistanceOhmsPerKft('3', 'aluminum')).toBeNull();
    const aluminumSizes = getConductorsForMaterial('aluminum').map((c) => c.awg);
    expect(aluminumSizes).not.toContain('14');
    expect(aluminumSizes).toContain('12');
  });

  it('carries exact metric equivalents (12 AWG = 3.31 mm²)', () => {
    const awg12 = NEC_CONDUCTORS.find((c) => c.awg === '12');
    expect(awg12?.mm2).toBeCloseTo(3.31, 2);
  });
});

describe('NEC Voltage Drop Engine', () => {
  it('flags a long 20A 120V run on 12 AWG as excessive (classic NEC example)', () => {
    // VD = 2 × 20 A × 100 ft × 1.98 Ω/kFT / 1000 = 7.92 V → 6.6%
    const result = calculateNecVoltageDrop({
      systemType: 'single',
      voltage: 120,
      current: 20,
      lengthFeet: 100,
      awg: '12',
      material: 'copper',
      conductorTempC: 75,
    });

    expect(result.valid).toBe(true);
    expect(result.voltageDrop).toBeCloseTo(7.92, 2);
    expect(result.voltageDropPercent).toBeCloseTo(6.6, 2);
    expect(result.voltageAtLoad).toBeCloseTo(120 - 7.92, 2);
    expect(result.severity).toBe('excessive');
  });

  it('rates 10 AWG on the same run as marginal (3–5% band)', () => {
    // VD = 2 × 20 × 100 × 1.24 / 1000 = 4.96 V → 4.13%
    const result = calculateNecVoltageDrop({
      systemType: 'single',
      voltage: 120,
      current: 20,
      lengthFeet: 100,
      awg: '10',
      material: 'copper',
    });

    expect(result.voltageDrop).toBeCloseTo(4.96, 2);
    expect(result.voltageDropPercent).toBeCloseTo(4.133, 2);
    expect(result.severity).toBe('warning');
  });

  it('passes the same amps at 240 V (good ≤3%)', () => {
    const result = calculateNecVoltageDrop({
      systemType: 'single',
      voltage: 240,
      current: 20,
      lengthFeet: 100,
      awg: '10',
      material: 'copper',
    });

    expect(result.voltageDropPercent).toBeCloseTo(2.067, 2);
    expect(result.severity).toBe('good');
  });

  it('uses √3 multiplier for balanced three-phase runs', () => {
    // VD = √3 × 100 A × 250 ft × 0.194 Ω/kFT / 1000 ≈ 8.40 V at 480 V → 1.75%
    const result = calculateNecVoltageDrop({
      systemType: 'three',
      voltage: 480,
      current: 100,
      lengthFeet: 250,
      awg: '2',
      material: 'copper',
    });

    expect(result.voltageDrop).toBeCloseTo(Math.sqrt(3) * 100 * 250 * (0.194 / 1000), 2);
    expect(result.voltageDropPercent).toBeCloseTo(1.75, 1);
    expect(result.severity).toBe('good');
  });

  it('rejects aluminum for sizes NEC Table 8 does not publish', () => {
    const result = calculateNecVoltageDrop({
      systemType: 'single',
      voltage: 120,
      current: 15,
      lengthFeet: 50,
      awg: '14',
      material: 'aluminum',
    });

    expect(result.valid).toBe(false);
    expect(result.errorMessage).toContain('not published');
  });

  it('requires positive voltage and run length', () => {
    const bad = calculateNecVoltageDrop({
      systemType: 'single',
      voltage: 0,
      current: 20,
      lengthFeet: 100,
      awg: '12',
      material: 'copper',
    });
    expect(bad.valid).toBe(false);

    const zeroLength = calculateNecVoltageDrop({
      systemType: 'single',
      voltage: 120,
      current: 20,
      lengthFeet: 0,
      awg: '12',
      material: 'copper',
    });
    expect(zeroLength.valid).toBe(false);
  });

  it('cites the NEC informational notes in its status copy', () => {
    const result = calculateNecVoltageDrop({
      systemType: 'single',
      voltage: 120,
      current: 10,
      lengthFeet: 25,
      awg: '12',
      material: 'copper',
    });
    expect(result.standard.id).toBe('us-nec');
    expect(result.statusDescription).toContain('210.19');
    expect(result.standard.citation).toContain('not an enforceable');
  });

  it('adds reactance above pf<1 when enabled', () => {
    const base = calculateNecVoltageDrop({
      systemType: 'single',
      voltage: 240,
      current: 40,
      lengthFeet: 200,
      awg: '4',
      material: 'copper',
      powerFactor: 0.8,
      includeReactance: false,
    });
    const withX = calculateNecVoltageDrop({
      systemType: 'single',
      voltage: 240,
      current: 40,
      lengthFeet: 200,
      awg: '4',
      material: 'copper',
      powerFactor: 0.8,
      includeReactance: true,
    });
    expect(withX.voltageDrop).toBeGreaterThan(base.voltageDrop);
  });
});
