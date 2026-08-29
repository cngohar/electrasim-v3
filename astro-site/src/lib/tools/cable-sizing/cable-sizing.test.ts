import { describe, expect, it } from 'vitest';
import {
  cableSizingCurve,
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

describe('Cable Sizing — Standard Selection (BS 7671 vs IEC 60364)', () => {
  // 500 W lighting load at 230 V → Ib ≈ 2.17 A, In = 6 A (thermal not binding).
  // 1.0 mm² Method C drops 44 mV/A/m × 2.17 A × 85 m ≈ 8.13 V ≈ 3.53%:
  //   → BS 7671 lighting (3%) fails 1.0 mm², selects 1.5 mm²
  //   → IEC 60364 Annex G lighting (4%) passes 1.0 mm²
  const base: CableSizingInputs = {
    systemType: 'single-phase',
    voltageVolts: 230,
    powerWatts: 500,
    powerFactor: 1.0,
    runLengthMeters: 85,
    circuitFunction: 'lighting',
    installationMethod: 'C',
    conductorMaterial: 'copper',
    ambientTempC: 30,
    groupingCircuits: 1,
    thermalInsulationMm: 0,
    fuseTypeCc: false,
  };

  it('applies the 3% lighting ceiling under BS 7671 (default)', () => {
    const res = calculateCableSizing({ ...base });
    expect(res.maxPermissibleVdropPercent).toBe(3);
    expect(res.selectedCableMm2).toBe(1.5);
    expect(res.standardLabel).toBe('BS 7671:2018+A4:2026');
    expect(res.summary).toContain('BS 7671');
  });

  it('applies the same 3% lighting ceiling as BS 7671 under IEC Annex G Table G.52.1', () => {
    const res = calculateCableSizing({ ...base, standard: 'iec-60364' });
    // Table G.52.1 sets 3% for lighting / 5% for other uses on a public LV
    // supply — not the 4% some vendor guides quote (that figure mixes in the
    // >100 m allowance). The selected size therefore matches the UK answer.
    expect(res.maxPermissibleVdropPercent).toBe(3);
    expect(res.selectedCableMm2).toBe(1.5);
    expect(res.thermalPass).toBe(true);
    expect(res.voltageDropPass).toBe(true);
    expect(res.standardLabel).toBe('IEC 60364');
    expect(res.standardCitation).toContain('IEC 60364');
    expect(res.summary).toContain('IEC 60364');
  });
});

describe('Constraint crossover curve (cutaway scene chart)', () => {
  // 32 A single-phase circuit at 230 V, Method C copper, 30 °C, ungrouped.
  // Thermal gate: In = 32 A, derating 1.00, so any cable with Iz >= 32 A works —
  // 2.5 mm² (27 A) fails, 4 mm² (37 A) passes, and that answer never moves
  // with length. Volt-drop gate: ceiling 5% = 11.5 V, so a size needs
  // mV/A/m <= 11500 / (32 x L) — which keeps demanding bigger cable as L grows.
  const base = {
    systemType: 'single-phase' as const,
    voltageVolts: 230,
    currentAmps: 32,
    powerFactor: 1.0,
    runLengthMeters: 10,
    circuitFunction: 'power' as const,
    installationMethod: 'C' as const,
    conductorMaterial: 'copper' as const,
    ambientTempC: 30,
    groupingCircuits: 1,
    thermalInsulationMm: 0 as const,
    fuseTypeCc: false,
  };
  const lengths = [3, 15, 30, 45, 60, 90, 120];
  const curve = cableSizingCurve({ ...base }, lengths);

  it('labels the binding gate by what forced the size up, not by the last check', () => {
    // 4 mm² carries 32 A fine (37 A) but drops 42 V over 120 m, so the answer is
    // 16 mm² *because of volt drop* — the engine must not call that thermal.
    const longRun = calculateCableSizing({ ...base, runLengthMeters: 120 });
    expect(longRun.selectedCableMm2).toBe(16);
    expect(longRun.limitingConstraint).toBe('voltage-drop');

    // short run: 4 mm² passes both gates, so heat (ampacity) is the sizing rule
    const shortRun = calculateCableSizing({ ...base, runLengthMeters: 12 });
    expect(shortRun.selectedCableMm2).toBe(4);
    expect(shortRun.limitingConstraint).toBe('thermal');

    // thermal-only pressure: Method A + grouping makes 4 mm² insufficient no matter
    // how short the run is, and volt drop never enters the argument
    const hotRun = calculateCableSizing({
      ...base,
      runLengthMeters: 5,
      installationMethod: 'A',
      ambientTempC: 45,
      groupingCircuits: 4,
    });
    expect(hotRun.limitingConstraint).toBe('thermal');
    expect(hotRun.selectedCableMm2).toBe(25);
  });

  it('keeps the thermal requirement flat across every length', () => {
    expect(new Set(curve.map((p) => p.thermalMm2))).toEqual(new Set([4]));
  });

  it('rises the volt-drop requirement with length', () => {
    expect(curve.map((p) => p.dropMm2)).toEqual([1.0, 2.5, 4, 6, 10, 16, 16]);
  });

  it('flags exactly the lengths where volt drop becomes the binding gate', () => {
    // 4 mm² (11 mV/A/m) reaches 11.5 V at 11500 / (11 × 32) ≈ 32.7 m
    expect(curve.filter((p) => p.dropGoverns).map((p) => p.lengthMeters)).toEqual([
      45, 60, 90, 120,
    ]);
  });

  it('reports the size the engine actually selects at that length', () => {
    const at30 = curve.find((p) => p.lengthMeters === 30);
    const at120 = curve.find((p) => p.lengthMeters === 120);
    expect(at30?.selectedMm2).toBe(4);
    expect(at30?.limitingConstraint).toBe('thermal');
    expect(at120?.selectedMm2).toBe(16);
    expect(at120?.limitingConstraint).toBe('voltage-drop');
  });

  it('lets a hostile environment move the flat thermal line up instead', () => {
    // Method A + 45 °C + 4 grouped circuits: Ca 0.79 × Cg 0.65 → It = 32 / 0.5135 = 62.3 A
    // Method A: 16 mm² = 61 A (just short) so 25 mm² = 80 A is required.
    const derated = cableSizingCurve(
      { ...base, installationMethod: 'A', ambientTempC: 45, groupingCircuits: 4 },
      [15],
    );
    expect(derated[0].thermalMm2).toBe(25);
    expect(derated[0].dropMm2).toBeLessThan(25);
    expect(derated[0].limitingConstraint).toBe('thermal');
  });

  it('switches which gate dominates when the run is long and the ambient is hot', () => {
    const both = cableSizingCurve(
      { ...base, installationMethod: 'A', ambientTempC: 45, groupingCircuits: 4 },
      [120],
    );
    // 25 mm² thermally, but 120 m at 32 A in Method A needs 16 mm² for drop —
    // so the heat still governs here, and the chart shows the flat line on top.
    expect(both[0].thermalMm2).toBe(25);
    expect(both[0].dropGoverns).toBe(false);
    expect(both[0].selectedMm2).toBe(25);
  });
});

describe('Cable Sizing — IEC 60364 Annex G long-run allowance (>100 m)', () => {
  const base: CableSizingInputs = {
    systemType: 'single-phase',
    voltageVolts: 230,
    powerWatts: 500,
    powerFactor: 1.0,
    runLengthMeters: 120,
    circuitFunction: 'lighting',
    installationMethod: 'C',
    conductorMaterial: 'copper',
    ambientTempC: 30,
    groupingCircuits: 1,
    thermalInsulationMm: 0,
    fuseTypeCc: false,
  };

  it('raises the lighting ceiling by 0.005 %/m past 100 m under IEC', () => {
    const res = calculateCableSizing({ ...base, standard: 'iec-60364' });
    // 3% + (120 − 100) × 0.005% = 3.1%
    expect(res.maxPermissibleVdropPercent).toBeCloseTo(3.1, 3);
  });

  it('raises the power ceiling the same way under IEC', () => {
    const res = calculateCableSizing({
      ...base,
      circuitFunction: 'power',
      standard: 'iec-60364',
    });
    expect(res.maxPermissibleVdropPercent).toBeCloseTo(5.1, 3);
  });

  it('caps the allowance at +0.5%', () => {
    const res = calculateCableSizing({
      ...base,
      runLengthMeters: 200,
      standard: 'iec-60364',
    });
    expect(res.maxPermissibleVdropPercent).toBeCloseTo(3.5, 3);
  });

  it('leaves BS 7671 at the flat 3% ceiling for the same run', () => {
    const res = calculateCableSizing({ ...base });
    expect(res.maxPermissibleVdropPercent).toBe(3);
  });
});

describe('Cable Sizing — honest fail state when no tabulated size clears both gates', () => {
  it('reports non-compliant with the largest size kept only as a reference', () => {
    // Method A (insulation) at 50 °C with 6 grouped circuits: It = 125 A
    // (largest device rating) ÷ (0.71 × 0.57 × 0.725) ≈ 425 A — far beyond the
    // 95 mm² Method A tabulated 182 A (×0.78 aluminium = 142 A), so nothing on
    // the ladder can pass.
    const res = calculateCableSizing({
      systemType: 'three-phase',
      voltageVolts: 400,
      currentAmps: 300,
      powerFactor: 1.0,
      runLengthMeters: 10,
      circuitFunction: 'power',
      installationMethod: 'A',
      conductorMaterial: 'aluminum',
      ambientTempC: 50,
      groupingCircuits: 6,
      thermalInsulationMm: 200,
      fuseTypeCc: true,
    });
    expect(res.status).toBe('fail');
    expect(res.compliant).toBe(false);
    // the reference size is the largest tabulated one, never a real answer
    expect(res.selectedCableMm2).toBe(95);
    expect(res.maxTabulatedSizeMm2).toBe(95);
    expect(res.maxTabulatedAmpacityIz).toBe(182 * 0.78); // aluminium derated
    expect(res.summary).toContain('No standard size clears both gates');
  });

  it('still returns a compliant pass when the load is reasonable', () => {
    const res = calculateCableSizing({
      systemType: 'single-phase',
      voltageVolts: 230,
      powerWatts: 7200,
      powerFactor: 1.0,
      runLengthMeters: 18,
      circuitFunction: 'power',
      installationMethod: 'C',
      conductorMaterial: 'copper',
      ambientTempC: 30,
      groupingCircuits: 1,
      thermalInsulationMm: 0,
      fuseTypeCc: false,
    });
    expect(res.compliant).toBe(true);
    expect(res.status).toBe('pass');
    expect(res.maxTabulatedSizeMm2).toBe(95);
  });
});
