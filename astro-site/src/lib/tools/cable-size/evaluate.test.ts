/**
 * evaluate.test.ts — the Cable Size domain engine.
 *
 * These tests pin the *relationships* the tool teaches (§25) and the behaviour
 * of the recommendation rule, not a frozen table of numbers. Every electrical
 * figure is produced by the shared voltage-drop engine, so a change there shows
 * up here as a change in the tool's answer — which is exactly what we want.
 */

import { describe, expect, it } from 'vitest';
import { CABLE_SIZE_DEFAULTS, DEFAULT_CANDIDATE_SIZES } from './config';
import {
  designCurrentFromLoad,
  evaluateCableRun,
  evaluateCableSizes,
  resolveLoad,
  selectionVerdict,
  statusForDrop,
} from './evaluate';
import { LOAD_PRESETS, getLoadPreset } from './presets';
import type { CableSizeInputs } from './types';

const BASE: CableSizeInputs = {
  ...CABLE_SIZE_DEFAULTS,
  candidateSizes: [...DEFAULT_CANDIDATE_SIZES],
};

const REQUEST = {
  voltage: 230,
  current: 10,
  length: 25,
  material: 'copper' as const,
  voltageDropLimit: 3,
  candidateSizes: DEFAULT_CANDIDATE_SIZES,
};

describe('evaluateCableSizes — the physics the tool teaches', () => {
  it('drops less voltage as the cable gets bigger', () => {
    const result = evaluateCableSizes(REQUEST);
    const drops = result.candidates.map((c) => c.voltageDropVolts);
    expect(drops.length).toBeGreaterThan(1);
    for (let i = 1; i < drops.length; i += 1) {
      expect(drops[i]).toBeLessThan(drops[i - 1]);
    }
  });

  it('drops more voltage as the current grows', () => {
    const small = evaluateCableSizes({ ...REQUEST, current: 5 });
    const big = evaluateCableSizes({ ...REQUEST, current: 20 });
    const pick = (r: typeof small) =>
      r.candidates.find((c) => c.sizeMm2 === 4)?.voltageDropVolts ?? 0;
    expect(pick(big)).toBeGreaterThan(pick(small));
  });

  it('drops more voltage as the run gets longer', () => {
    const short = evaluateCableSizes({ ...REQUEST, length: 10 });
    const long = evaluateCableSizes({ ...REQUEST, length: 90 });
    const pick = (r: typeof short) =>
      r.candidates.find((c) => c.sizeMm2 === 4)?.voltageDropVolts ?? 0;
    expect(pick(long)).toBeGreaterThan(pick(short));
  });

  it('changes resistance with the conductor material', () => {
    const copper = evaluateCableSizes({ ...REQUEST, material: 'copper' });
    const aluminium = evaluateCableSizes({ ...REQUEST, material: 'aluminium' });
    const pick = (r: typeof copper) =>
      r.candidates.find((c) => c.sizeMm2 === 4)?.voltageDropVolts ?? 0;
    expect(pick(aluminium)).toBeGreaterThan(pick(copper));
    expect(pick(aluminium) / pick(copper)).toBeGreaterThan(1.4);
  });

  it('drops more voltage as the conductor gets hotter', () => {
    // the reason 70 °C is the default: a loaded cable is not a cold one
    const cold = evaluateCableSizes({ ...REQUEST, temperatureC: 20 });
    const hot = evaluateCableSizes({ ...REQUEST, temperatureC: 70 });
    const pick = (r: typeof cold) =>
      r.candidates.find((c) => c.sizeMm2 === 4)?.voltageDropVolts ?? 0;
    expect(pick(hot)).toBeGreaterThan(pick(cold));
  });

  it('scales resistance with the temperature coefficient, not a fudge', () => {
    // copper: ρ_T = ρ_20 × (1 + 0.00393 × (T − 20)) → 70 °C is 1.1965× 20 °C
    const cold = evaluateCableSizes({ ...REQUEST, temperatureC: 20 });
    const hot = evaluateCableSizes({ ...REQUEST, temperatureC: 70 });
    const pick = (r: typeof cold) =>
      r.candidates.find((c) => c.sizeMm2 === 4)?.voltageDropVolts ?? 0;
    expect(pick(hot) / pick(cold)).toBeCloseTo(1.1965, 3);
  });

  it('still answers at a temperature below freezing', () => {
    // the one field where a negative value is legal
    const result = evaluateCableSizes({ ...REQUEST, temperatureC: -25 });
    expect(result.valid).toBe(true);
    expect(result.recommendedCable).not.toBeNull();
  });

  it('reports the voltage actually arriving at the load', () => {
    const result = evaluateCableSizes(REQUEST);
    const cable = result.candidates.find((c) => c.sizeMm2 === 4);
    expect(cable).toBeDefined();
    expect(cable?.voltageAtLoad).toBeCloseTo(230 - (cable?.voltageDropVolts ?? 0), 6);
  });

  it('is deterministic', () => {
    const a = evaluateCableSizes(REQUEST);
    const b = evaluateCableSizes({ ...REQUEST });
    expect(b.candidates).toEqual(a.candidates);
    expect(b.recommendedCable).toEqual(a.recommendedCable);
  });
});

describe('evaluateCableSizes — the recommendation rule', () => {
  it('recommends the smallest passing candidate', () => {
    const result = evaluateCableSizes(REQUEST); // 10 A, 25 m, 3%
    expect(result.recommendedCable).not.toBeNull();
    const passing = result.candidates.filter((c) => c.passes);
    expect(passing.length).toBeGreaterThan(0);
    expect(result.recommendedCable?.sizeMm2).toBe(passing[0].sizeMm2);
    // every size below the recommendation must fail
    for (const c of result.candidates) {
      if (c.sizeMm2 < (result.recommendedCable?.sizeMm2 ?? 0)) expect(c.passes).toBe(false);
    }
  });

  it('sorts candidates ascending whatever order they arrive in', () => {
    const result = evaluateCableSizes({ ...REQUEST, candidateSizes: [10, 1.5, 4, 25, 2.5] });
    expect(result.candidates.map((c) => c.sizeMm2)).toEqual([1.5, 2.5, 4, 10, 25]);
  });

  it('deduplicates candidates', () => {
    const result = evaluateCableSizes({ ...REQUEST, candidateSizes: [2.5, 2.5, 4, 4, 4] });
    expect(result.candidates.map((c) => c.sizeMm2)).toEqual([2.5, 4]);
  });

  it('supports a custom candidate ladder', () => {
    const result = evaluateCableSizes({ ...REQUEST, candidateSizes: [6, 16, 35] });
    expect(result.candidates.map((c) => c.sizeMm2)).toEqual([6, 16, 35]);
    expect(result.recommendedCable?.sizeMm2).toBe(6);
  });

  it('drops unsupported sizes from a custom ladder', () => {
    const result = evaluateCableSizes({ ...REQUEST, candidateSizes: [3.7, 4, 6] });
    expect(result.candidates.map((c) => c.sizeMm2)).toEqual([4, 6]);
  });

  it('returns no recommendation when nothing passes', () => {
    // 60 A over 300 m: even 95 mm² cannot hold 3%
    const result = evaluateCableSizes({
      voltage: 230,
      current: 60,
      length: 300,
      material: 'copper',
      voltageDropLimit: 3,
      candidateSizes: [1.5, 2.5, 4, 6, 10, 16, 25, 35],
    });
    expect(result.valid).toBe(true);
    expect(result.recommendedCable).toBeNull();
    expect(result.candidates.every((c) => !c.passes)).toBe(true);
    expect(result.candidates.every((c) => c.status === 'fail')).toBe(true);
  });

  it('treats a drop exactly on the limit as passing (boundary behaviour)', () => {
    expect(statusForDrop(3, 3)).toBe('near-limit');
    expect(statusForDrop(2.999, 3)).toBe('near-limit');
    expect(statusForDrop(2.5, 3)).toBe('pass');
    expect(statusForDrop(3.001, 3)).toBe('fail');
  });

  it('flags near-limit from 85% of the limit upwards', () => {
    expect(statusForDrop(2.54, 3)).toBe('pass');
    expect(statusForDrop(2.55, 3)).toBe('near-limit');
  });

  it('rejects invalid input instead of guessing', () => {
    for (const bad of [
      { ...REQUEST, voltage: 0 },
      { ...REQUEST, current: -1 },
      { ...REQUEST, length: 0 },
      { ...REQUEST, voltageDropLimit: 0 },
      { ...REQUEST, candidateSizes: [] },
      { ...REQUEST, candidateSizes: [0, -4] },
    ]) {
      const result = evaluateCableSizes(bad);
      expect(result.valid).toBe(false);
      expect(result.candidates).toEqual([]);
      expect(result.recommendedCable).toBeNull();
    }
  });
});

describe('evaluateCableRun — configuration in, answer out', () => {
  it('turns a lighting preset into the right design current', () => {
    const result = evaluateCableRun({ ...BASE, loadType: 'lighting', voltage: 230 });
    expect(result.loadPowerWatts).toBe(100);
    expect(result.designCurrentAmps).toBeCloseTo(100 / 230, 6);
  });

  it('uses the custom load when custom is selected', () => {
    const result = evaluateCableRun({
      ...BASE,
      loadType: 'custom',
      customPowerWatts: 2300,
      customPowerFactor: 0.92,
    });
    expect(result.loadPowerWatts).toBe(2300);
    expect(result.designCurrentAmps).toBeCloseTo(2300 / (230 * 0.92), 6);
  });

  it('ignores DC power factor when deriving current', () => {
    const result = evaluateCableRun({
      ...BASE,
      systemType: 'dc',
      loadType: 'custom',
      customPowerWatts: 2300,
      customPowerFactor: 0.6,
    });
    expect(result.designCurrentAmps).toBeCloseTo(10, 6);
  });

  it('follows the recommendation when no cable is selected', () => {
    const result = evaluateCableRun({ ...BASE, selectedSizeMm2: null });
    expect(result.selectedSizeMm2).toBe(result.recommendedCable?.sizeMm2);
    expect(result.selection).toBe('recommended');
  });

  it('keeps the selected cable separate from the recommendation', () => {
    const recommended = evaluateCableRun({ ...BASE }).recommendedCable;
    const oversize = [...DEFAULT_CANDIDATE_SIZES].filter((s) => s > (recommended?.sizeMm2 ?? 0))[1];
    const result = evaluateCableRun({ ...BASE, selectedSizeMm2: oversize });
    expect(result.selectedSizeMm2).toBe(oversize);
    expect(result.recommendedCable?.sizeMm2).toBe(recommended?.sizeMm2);
    expect(result.selection).toBe('oversized');
  });

  it('marks an inspected cable that is too small as too-small', () => {
    const result = evaluateCableRun({ ...BASE, selectedSizeMm2: 1.5, loadType: 'heater' });
    expect(result.selectedSizeMm2).toBe(1.5);
    expect(result.selected?.passes).toBe(false);
    expect(result.selection).toBe('too-small');
    expect(result.status).toBe('fail');
  });

  it('falls back to a valid size when the selection is not on the ladder', () => {
    const result = evaluateCableRun({ ...BASE, selectedSizeMm2: 50 });
    expect(result.selectedSizeMm2).toBe(result.recommendedCable?.sizeMm2);
  });

  it('grows the recommendation when the load grows', () => {
    const lighting = evaluateCableRun({ ...BASE, loadType: 'lighting', lengthMeters: 40 });
    const heater = evaluateCableRun({ ...BASE, loadType: 'heater', lengthMeters: 40 });
    expect(heater.designCurrentAmps).toBeGreaterThan(lighting.designCurrentAmps);
    expect(heater.recommendedCable?.sizeMm2 ?? 0).toBeGreaterThan(
      lighting.recommendedCable?.sizeMm2 ?? 0,
    );
  });

  it('grows the recommendation when the run gets longer', () => {
    const short = evaluateCableRun({ ...BASE, lengthMeters: 10, loadType: 'heater' });
    const long = evaluateCableRun({ ...BASE, lengthMeters: 120, loadType: 'heater' });
    expect(long.recommendedCable?.sizeMm2 ?? 0).toBeGreaterThan(
      short.recommendedCable?.sizeMm2 ?? 0,
    );
  });

  it('rejects out-of-range custom values', () => {
    const result = evaluateCableRun({ ...BASE, loadType: 'custom', customPowerWatts: -5 });
    expect(result.valid).toBe(false);
    expect(result.errors.customPowerWatts).toBeDefined();
  });

  it('rejects an unknown load type', () => {
    const result = evaluateCableRun({ ...BASE, loadType: 'toaster' as never });
    expect(result.valid).toBe(false);
    expect(result.errors.loadType).toBeDefined();
  });
});

describe('load presets (§3, §31)', () => {
  it('exposes the six documented loads', () => {
    expect(LOAD_PRESETS.map((p) => p.id)).toEqual([
      'lighting',
      'fan',
      'motor',
      'heater',
      'appliance',
      'custom',
    ]);
  });

  it('gives every preset a scene and a believable demand', () => {
    for (const preset of LOAD_PRESETS) {
      expect(preset.scene).toBe(preset.id);
      expect(preset.powerWatts).toBeGreaterThan(0);
      expect(preset.powerFactor).toBeGreaterThanOrEqual(0.5);
      expect(preset.powerFactor).toBeLessThanOrEqual(1);
      expect(preset.summary.length).toBeGreaterThan(0);
    }
  });

  it('matches the headline wattages in the design', () => {
    expect(getLoadPreset('lighting').powerWatts).toBe(100);
    expect(getLoadPreset('fan').powerWatts).toBe(80);
    expect(getLoadPreset('motor').powerWatts).toBe(2200);
    expect(getLoadPreset('heater').powerWatts).toBe(3000);
    expect(getLoadPreset('appliance').powerWatts).toBe(500);
  });

  it('changes the electrical state when the load changes', () => {
    const fan = resolveLoad({ loadType: 'fan', customPowerWatts: 0, customPowerFactor: 1 });
    const motor = resolveLoad({ loadType: 'motor', customPowerWatts: 0, customPowerFactor: 1 });
    expect(motor.powerWatts).toBeGreaterThan(fan.powerWatts);
    expect(designCurrentFromLoad({ systemType: 'ac', voltage: 230, ...motor })).toBeGreaterThan(
      designCurrentFromLoad({ systemType: 'ac', voltage: 230, ...fan }),
    );
  });

  it('falls back to lighting for an unknown id', () => {
    expect(getLoadPreset('nope').id).toBe('lighting');
  });
});

describe('selectionVerdict', () => {
  const cable = (sizeMm2: number, passes: boolean) => ({ sizeMm2, passes }) as never;

  it('classifies the inspected cable against the recommendation', () => {
    expect(selectionVerdict(cable(4, true), cable(4, true))).toBe('recommended');
    expect(selectionVerdict(cable(10, true), cable(4, true))).toBe('oversized');
    expect(selectionVerdict(cable(1.5, false), cable(4, true))).toBe('too-small');
    expect(selectionVerdict(null, cable(4, true))).toBe('unknown');
  });
});
