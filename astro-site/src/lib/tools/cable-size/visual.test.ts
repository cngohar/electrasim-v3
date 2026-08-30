/**
 * visual.test.ts — the visualisation contract (§11, §14, §17, §34).
 *
 * These are the tests that keep the scene honest: the drawing is a *projection*
 * of the calculation, so the projection itself is part of the tool's behaviour
 * and has to be pinned — cable thickness must move with the size, the scene must
 * change with the load, and the state handed to the scene must carry the numbers
 * the panels show.
 */

import { describe, expect, it } from 'vitest';
import { CABLE_SIZE_DEFAULTS, DEFAULT_CANDIDATE_SIZES } from './config';
import { evaluateCableRun } from './evaluate';
import { LOAD_PRESETS } from './presets';
import type { CableSizeInputs } from './types';
import {
  CABLE_VISUAL_WIDTH,
  budgetFill,
  buildSceneState,
  buildVisualState,
  cableVisualWidth,
  candidateRange,
  currentFlowSeconds,
  motorSpinSeconds,
  stressFromUsage,
} from './visual';

const BASE: CableSizeInputs = {
  ...CABLE_SIZE_DEFAULTS,
  candidateSizes: [...DEFAULT_CANDIDATE_SIZES],
};

describe('cable thickness is controlled, not physical (§11)', () => {
  it('gets thicker as the cross-section grows', () => {
    const widths = [1.5, 2.5, 4, 6, 10, 16, 25, 35].map(
      (size) => cableVisualWidth(size, 1.5, 35).widthPx,
    );
    for (let i = 1; i < widths.length; i += 1) {
      expect(widths[i]).toBeGreaterThan(widths[i - 1]);
    }
  });

  it('makes 1.5 / 4 / 10 mm² read as clearly different steps', () => {
    const thin = cableVisualWidth(1.5, 1.5, 35);
    const medium = cableVisualWidth(4, 1.5, 35);
    const thick = cableVisualWidth(10, 1.5, 35);
    expect(medium.widthPx - thin.widthPx).toBeGreaterThan(4);
    expect(thick.widthPx - medium.widthPx).toBeGreaterThan(4);
  });

  it('is NOT proportional to cross-sectional area', () => {
    // 10 mm² is 6.7× the copper of 1.5 mm²; drawn to area it would be absurd.
    // The scale lands well under that and only a little over the true diameter
    // ratio (√6.7 ≈ 2.6), which is the visual cue we actually want.
    const thin = cableVisualWidth(1.5, 1.5, 35).widthPx;
    const thick = cableVisualWidth(10, 1.5, 35).widthPx;
    expect(thick / thin).toBeLessThan(6.7 * 0.75);
    expect(thick / thin).toBeGreaterThan(1.5);
  });

  it('stays inside the authored stroke range for any size', () => {
    for (const size of [0.5, 1, 1.5, 4, 35, 95, 1000]) {
      const { widthPx, thickness } = cableVisualWidth(size, 1.5, 35);
      expect(widthPx).toBeGreaterThanOrEqual(CABLE_VISUAL_WIDTH.minPx);
      expect(widthPx).toBeLessThanOrEqual(CABLE_VISUAL_WIDTH.maxPx);
      expect(thickness).toBeGreaterThanOrEqual(0);
      expect(thickness).toBeLessThanOrEqual(1);
    }
  });

  it('survives a degenerate ladder', () => {
    expect(cableVisualWidth(4, 4, 4).thickness).toBe(1);
    expect(cableVisualWidth(2.5, 4, 4).thickness).toBe(0);
    expect(Number.isFinite(cableVisualWidth(Number.NaN, 1.5, 35).widthPx)).toBe(true);
  });

  it('takes its range from the candidate ladder', () => {
    expect(candidateRange([2.5, 16])).toEqual({ minSize: 2.5, maxSize: 16 });
    expect(candidateRange([])).toEqual({ minSize: 1.5, maxSize: 35 });
  });
});

describe('flow and stress cues (§14)', () => {
  it('speeds the flow up with current, without ever racing', () => {
    const trickle = currentFlowSeconds(0.4);
    const heavy = currentFlowSeconds(16);
    expect(trickle).toBeGreaterThan(heavy);
    expect(currentFlowSeconds(500)).toBeGreaterThanOrEqual(1);
    expect(currentFlowSeconds(0)).toBeLessThanOrEqual(3);
  });

  it('maps limit usage onto a 0–1 glow', () => {
    expect(stressFromUsage(0)).toBe(0);
    expect(stressFromUsage(1)).toBeCloseTo(0.5, 6); // exactly at the limit
    expect(stressFromUsage(4)).toBe(1);
    expect(stressFromUsage(undefined)).toBe(0);
  });

  it('slows a motor down as the supply sags, without ever stopping it', () => {
    const healthy = motorSpinSeconds(230, 230);
    const sagging = motorSpinSeconds(212, 230);
    expect(sagging).toBeGreaterThan(healthy);
    expect(motorSpinSeconds(0, 230)).toBeLessThanOrEqual(2.6);
    // nonsense in, no nonsense out
    expect(motorSpinSeconds(Number.NaN, 230)).toBe(1.6);
    expect(motorSpinSeconds(230, 0)).toBe(1.6);
  });

  it('fills the drop-budget meter up to the limit and no further', () => {
    expect(budgetFill(0)).toBe(0);
    expect(budgetFill(0.5)).toBeCloseTo(0.5, 6);
    expect(budgetFill(1)).toBe(1);
    expect(budgetFill(3.4)).toBe(1); // over the limit: the words say so
    expect(budgetFill(undefined)).toBe(1);
  });
});

describe('scene state is projected, never calculated (§17, §34)', () => {
  it('carries the numbers the results panel shows', () => {
    const evaluation = evaluateCableRun(BASE);
    const scene = buildSceneState(evaluation, {
      systemType: BASE.systemType,
      voltage: BASE.voltage,
      loadType: BASE.loadType,
    });
    expect(scene.cableSize).toBe(evaluation.selectedSizeMm2);
    expect(scene.voltageDrop).toBeCloseTo(evaluation.selected?.voltageDropVolts ?? -1, 6);
    expect(scene.voltageDropPercent).toBeCloseTo(evaluation.selected?.voltageDropPercent ?? -1, 6);
    expect(scene.voltageAtLoad).toBeCloseTo(evaluation.selected?.voltageAtLoad ?? -1, 6);
    expect(scene.status).toBe(evaluation.status);
    expect(scene.dropLimitPercent).toBe(BASE.dropLimitPercent);
  });

  it('maps every load preset onto its own scene', () => {
    const seen = new Set<string>();
    for (const preset of LOAD_PRESETS) {
      const evaluation = evaluateCableRun({ ...BASE, loadType: preset.id });
      const scene = buildSceneState(evaluation, {
        systemType: BASE.systemType,
        voltage: BASE.voltage,
        loadType: preset.id,
      });
      expect(scene.loadScene).toBe(preset.scene);
      expect(scene.loadType).toBe(preset.id);
      seen.add(scene.loadScene);
    }
    expect(seen.size).toBe(LOAD_PRESETS.length);
  });

  it('changes the drawn cable when the selected candidate changes', () => {
    const small = evaluateCableRun({ ...BASE, loadType: 'heater', selectedSizeMm2: 1.5 });
    const large = evaluateCableRun({ ...BASE, loadType: 'heater', selectedSizeMm2: 10 });
    const smallState = buildSceneState(small, {
      systemType: BASE.systemType,
      voltage: BASE.voltage,
      loadType: 'heater',
    });
    const largeState = buildSceneState(large, {
      systemType: BASE.systemType,
      voltage: BASE.voltage,
      loadType: 'heater',
    });
    const smallVisual = buildVisualState(small, smallState);
    const largeVisual = buildVisualState(large, largeState);

    expect(largeVisual.cableWidthPx).toBeGreaterThan(smallVisual.cableWidthPx);
    expect(largeVisual.thickness).toBeGreaterThan(smallVisual.thickness);
    // thicker cable → less drop, and both scenes report their own numbers
    expect(largeState.voltageDrop).toBeLessThan(smallState.voltageDrop);
    expect(smallState.status).toBe('fail');
    expect(largeState.status).not.toBe('fail');
  });

  it('changes the load scene and the demand when the load type changes', () => {
    const lighting = buildSceneState(evaluateCableRun({ ...BASE, loadType: 'lighting' }), {
      systemType: 'ac',
      voltage: 230,
      loadType: 'lighting',
    });
    const heater = buildSceneState(evaluateCableRun({ ...BASE, loadType: 'heater' }), {
      systemType: 'ac',
      voltage: 230,
      loadType: 'heater',
    });
    expect(lighting.loadScene).toBe('lighting');
    expect(heater.loadScene).toBe('heater');
    expect(heater.loadPowerWatts).toBeGreaterThan(lighting.loadPowerWatts);
    expect(heater.designCurrent).toBeGreaterThan(lighting.designCurrent);
  });
});
