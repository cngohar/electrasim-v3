import { describe, expect, it } from 'vitest';
import {
  MATERIAL_PROPERTIES,
  calculateVoltageDrop,
  getResistivityAtTemperature,
} from './calculation';
import {
  formatCableSize,
  formatCurrent,
  formatLength,
  formatPercent,
  formatPower,
  formatResistance,
  formatVoltage,
} from './formatting';
import { validateVoltageDropInputs } from './validation';

describe('Voltage Drop Calculation Engine', () => {
  it('calculates the baseline standard case correctly (230V, 40A, 50m, 10mm², Copper)', () => {
    // 230V, 40A, 50m, 10mm², copper at 20°C
    // rho = 0.0172
    // r = 0.0172 / 10 = 0.00172 Ω/m
    // total R (single-phase round trip = 2 * 50 * 0.00172) = 0.172 Ω
    // with pf = 1.0 (or default AC without reactance)
    // V_drop = 2 * 40 * 50 * (0.00172 * 0.92) = 6.3296 V ≈ 6.33 V
    const result = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 10,
      material: 'copper',
      powerFactor: 0.92,
      temperature: 20,
      includeReactance: false,
    });

    expect(result.valid).toBe(true);
    expect(result.sourceVoltage).toBe(230);
    expect(result.loadCurrent).toBe(40);
    expect(result.cableLengthOneWay).toBe(50);
    expect(result.cableLengthRoundTrip).toBe(100);
    expect(result.cableSize).toBe(10);
    expect(result.material).toBe('copper');
    expect(result.voltageDrop).toBeCloseTo(6.3296, 3);
    expect(result.voltageDropPercent).toBeCloseTo((6.3296 / 230) * 100, 3);
    expect(result.voltageAtLoad).toBeCloseTo(230 - 6.3296, 3);
    expect(result.severity).toBe('good'); // 2.75% <= 3%
  });

  it('calculates pure DC circuit correctly', () => {
    // 24V DC, 10A, 20m, 2.5mm², copper at 20°C
    // rho = 0.0172
    // r = 0.0172 / 2.5 = 0.00688 Ω/m
    // V_drop = 2 * 10 * 20 * 0.00688 = 2.752 V
    const result = calculateVoltageDrop({
      systemType: 'dc',
      voltage: 24,
      current: 10,
      length: 20,
      size: 2.5,
      material: 'copper',
    });

    expect(result.valid).toBe(true);
    expect(result.voltageDrop).toBeCloseTo(2.752, 3);
    expect(result.voltageDropPercent).toBeCloseTo((2.752 / 24) * 100, 3); // 11.47%
    expect(result.severity).toBe('excessive');
  });

  it('calculates 3-Phase AC circuit correctly with square root of 3 multiplier', () => {
    // 400V 3-phase, 50A, 100m, 25mm², copper, pf = 0.95
    // r = 0.0172 / 25 = 0.000688 Ω/m
    // V_drop = √3 * 50 * 100 * (0.000688 * 0.95) = 1.73205 * 5000 * 0.0006536 = 5.660 V
    const result = calculateVoltageDrop({
      systemType: 'three',
      voltage: 400,
      current: 50,
      length: 100,
      size: 25,
      material: 'copper',
      powerFactor: 0.95,
      temperature: 20,
    });

    expect(result.valid).toBe(true);
    expect(result.voltageDrop).toBeCloseTo(5.66, 2);
    expect(result.voltageDropPercent).toBeCloseTo((5.66 / 400) * 100, 2); // ~1.42%
    expect(result.severity).toBe('good');
  });

  it('voltage drop decreases with lower current', () => {
    const base = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 10,
      material: 'copper',
    });

    const lowerCurrent = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 20,
      length: 50,
      size: 10,
      material: 'copper',
    });

    expect(lowerCurrent.voltageDrop).toBeLessThan(base.voltageDrop);
    expect(lowerCurrent.voltageDrop).toBeCloseTo(base.voltageDrop / 2, 4);
  });

  it('voltage drop increases with longer cable', () => {
    const base = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 10,
      material: 'copper',
    });

    const longerCable = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 100,
      size: 10,
      material: 'copper',
    });

    expect(longerCable.voltageDrop).toBeGreaterThan(base.voltageDrop);
    expect(longerCable.voltageDrop).toBeCloseTo(base.voltageDrop * 2, 4);
  });

  it('voltage drop decreases with larger conductor size', () => {
    const smallSize = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 6,
      material: 'copper',
    });

    const largeSize = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 16,
      material: 'copper',
    });

    expect(largeSize.voltageDrop).toBeLessThan(smallSize.voltageDrop);
  });

  it('aluminum conductor has higher resistance and voltage drop than copper of same cross-section', () => {
    const copper = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 10,
      material: 'copper',
    });

    const aluminum = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 10,
      material: 'aluminum',
    });

    expect(aluminum.voltageDrop).toBeGreaterThan(copper.voltageDrop);
    expect(aluminum.voltageDrop / copper.voltageDrop).toBeCloseTo(
      MATERIAL_PROPERTIES.aluminum.rho20 / MATERIAL_PROPERTIES.copper.rho20,
      2,
    );
  });

  it('temperature increases resistivity and voltage drop', () => {
    const rho20 = getResistivityAtTemperature('copper', 20);
    const rho70 = getResistivityAtTemperature('copper', 70);
    expect(rho70).toBeGreaterThan(rho20);

    const cold = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 10,
      material: 'copper',
      temperature: 20,
    });

    const hot = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 10,
      material: 'copper',
      temperature: 70,
    });

    expect(hot.voltageDrop).toBeGreaterThan(cold.voltageDrop);
  });

  it('handles boundary conditions gracefully (zero voltage, zero size, zero length)', () => {
    const zeroVolt = calculateVoltageDrop({
      systemType: 'single',
      voltage: 0,
      current: 40,
      length: 50,
      size: 10,
      material: 'copper',
    });
    expect(zeroVolt.valid).toBe(false);

    const zeroSize = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 50,
      size: 0,
      material: 'copper',
    });
    expect(zeroSize.valid).toBe(false);

    const zeroLength = calculateVoltageDrop({
      systemType: 'single',
      voltage: 230,
      current: 40,
      length: 0,
      size: 10,
      material: 'copper',
    });
    expect(zeroLength.valid).toBe(true);
    expect(zeroLength.voltageDrop).toBe(0);
    expect(zeroLength.voltageAtLoad).toBe(230);
  });
});

describe('Input Validation Module', () => {
  it('passes valid inputs', () => {
    const valid = validateVoltageDropInputs({
      voltage: 230,
      current: 40,
      length: 50,
      size: 10,
      powerFactor: 0.95,
      temperature: 20,
    });
    expect(valid.isValid).toBe(true);
    expect(Object.keys(valid.errors).length).toBe(0);
  });

  it('rejects non-positive voltage, current, length, size', () => {
    const invalid = validateVoltageDropInputs({
      voltage: -10,
      current: -5,
      length: 0,
      size: -2,
    });
    expect(invalid.isValid).toBe(false);
    expect(invalid.errors.voltage).toBeDefined();
    expect(invalid.errors.current).toBeDefined();
    expect(invalid.errors.length).toBeDefined();
    expect(invalid.errors.size).toBeDefined();
  });
});

describe('Formatting Helpers', () => {
  it('formats voltages correctly in V and kV', () => {
    expect(formatVoltage(230)).toBe('230 V');
    expect(formatVoltage(223.67)).toBe('223.7 V');
    expect(formatVoltage(11000)).toBe('11 kV');
    expect(formatVoltage(11500)).toBe('11.50 kV');
    expect(formatVoltage(Number.NaN)).toBe('—');
  });

  it('formats currents, lengths, percentages, and power', () => {
    expect(formatCurrent(40)).toBe('40 A');
    expect(formatLength(50)).toBe('50 m');
    expect(formatLength(2500)).toBe('2.50 km');
    expect(formatCableSize(10)).toBe('10 mm²');
    expect(formatPercent(2.751)).toBe('2.75%');
    expect(formatPower(275.2)).toBe('275.2 W');
    expect(formatPower(1450)).toBe('1.45 kW');
    expect(formatResistance(0.00172)).toBe('1.72 mΩ');
    expect(formatResistance(0.172)).toBe('0.1720 Ω');
  });
});

describe('Standard-aware Limit Banding (IEC 60364)', () => {
  // 230V DC, 10A, 58.5m, 2.5 mm² copper at 20 °C:
  //   VD = 2 × 10 × 58.5 × (0.0172/2.5) = 8.0496 V ≈ 3.4998% of 230 V
  // Lands exactly in the 3% (BS 7671) vs 4% (IEC Annex G) divergence window.
  const gapCase = {
    systemType: 'dc' as const,
    voltage: 230,
    current: 10,
    length: 58.5,
    size: 2.5,
    material: 'copper' as const,
  };

  it('flags 3.5% as marginal under BS 7671 (3% good ceiling)', () => {
    const uk = calculateVoltageDrop({ ...gapCase, standard: 'uk-bs7671' });
    expect(uk.voltageDropPercent).toBeCloseTo(3.4998, 3);
    expect(uk.severity).toBe('warning');
    expect(uk.standardLabel).toBe('BS 7671:2018+A4:2026');
  });

  it('rates the same 3.5% as good under IEC 60364-5-52 Annex G (4% ceiling)', () => {
    const iec = calculateVoltageDrop({ ...gapCase, standard: 'iec-60364' });
    expect(iec.voltageDropPercent).toBeCloseTo(3.4998, 3);
    expect(iec.severity).toBe('good');
    expect(iec.standardLabel).toBe('IEC 60364');
    expect(iec.standardCitation).toContain('Annex G');
  });

  it('keeps identical physics between standards (only limits/copy change)', () => {
    const uk = calculateVoltageDrop({ ...gapCase, standard: 'uk-bs7671' });
    const iec = calculateVoltageDrop({ ...gapCase, standard: 'iec-60364' });
    expect(uk.voltageDrop).toBeCloseTo(iec.voltageDrop, 9);
    expect(uk.totalResistance).toBeCloseTo(iec.totalResistance, 9);
  });
});
