/**
 * visual.ts — visualisation vocabulary for the scene (§11, §14, §17).
 *
 * Two rules from the design live here as code:
 *
 * 1. **Cable thickness is a controlled visual scale, never the physical
 *    cross-section.** A 10 mm² conductor is 6.7× the copper area of 1.5 mm²;
 *    drawn to scale it would be an absurd ribbon. The scene maps size onto a
 *    *diameter-like* curve (√area) between the smallest and largest candidate,
 *    so every step up is visible without any step being ridiculous. The label
 *    always shows the true value: "4 mm² Copper".
 *
 * 2. **The scene receives state; it never calculates state.** Everything below
 *    is a pure function of an evaluation result.
 */

import { DEFAULT_CANDIDATE_SIZES } from './config';
import { getLoadPreset } from './presets';
import type {
  CableSceneState,
  CableSizeEvaluation,
  CableVisualState,
  CandidateEvaluation,
} from './types';

/** Scene stroke widths, in SVG user units, for the thinnest/thickest candidate. */
export const CABLE_VISUAL_WIDTH = { minPx: 5, maxPx: 34 } as const;

/**
 * Authored artwork geometry, shared by the scene component and the browser
 * engine (which hands the content band to the stage fitter) so the two can never
 * disagree about which part of the drawing must stay visible.
 */
export const SCENE_GEOMETRY = {
  baseWidth: 1280,
  baseHeight: 640,
  /** The informative band: source, cable and load. */
  content: { x0: 60, x1: 1220, y0: 200, y1: 580 },
} as const;

/** Current-flow pulse period: gentle at trickle, brisk (not frantic) at load. */
export const FLOW_SECONDS = { slowest: 2.8, fastest: 1.2 } as const;

/**
 * Rotation period at full voltage, and the floor imposed at a weak supply: the
 * scene slows a motor down to 65% of its healthy speed at the worst drop the
 * tool will ever show (a shade under 80% of nominal), never to a standstill.
 */
export const SPIN_SECONDS = { base: 1.6, slowest: 2.6 } as const;

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/**
 * Map a cross-section onto the scene's thickness scale.
 *
 * `t` is the normalised 0–1 position between `minSize` and `maxSize` measured on
 * a √area curve (so 1.5 → 4 → 10 mm² read as clearly different steps), and
 * `widthPx` is that position expressed as an SVG stroke width.
 */
export function cableVisualWidth(
  sizeMm2: number,
  minSize = DEFAULT_CANDIDATE_SIZES[0],
  maxSize = DEFAULT_CANDIDATE_SIZES[DEFAULT_CANDIDATE_SIZES.length - 1],
): { thickness: number; widthPx: number } {
  const size = Number.isFinite(sizeMm2) ? Math.max(0, sizeMm2) : 0;
  const lo = Number.isFinite(minSize) ? Math.max(0, minSize) : 0;
  const hi = Number.isFinite(maxSize) ? Math.max(lo, maxSize) : lo;

  let thickness: number;
  if (hi <= lo) {
    thickness = size >= hi ? 1 : 0;
  } else {
    const span = Math.sqrt(hi) - Math.sqrt(lo);
    thickness = span > 0 ? (Math.sqrt(size) - Math.sqrt(lo)) / span : 0;
  }
  thickness = clamp01(thickness);

  const { minPx, maxPx } = CABLE_VISUAL_WIDTH;
  const widthPx = minPx + thickness * (maxPx - minPx);
  return { thickness, widthPx: Math.round(widthPx * 10) / 10 };
}

/** Seconds per current-flow pulse. Saturates around 25 A so it never races. */
export function currentFlowSeconds(designCurrentAmps: number): number {
  const amps = Number.isFinite(designCurrentAmps) ? Math.max(0, designCurrentAmps) : 0;
  const drive = Math.min(1, Math.sqrt(amps) / 5);
  const seconds = FLOW_SECONDS.slowest - drive * (FLOW_SECONDS.slowest - FLOW_SECONDS.fastest);
  return Math.round(seconds * 100) / 100;
}

/**
 * "Electrical stress" 0–1, used for the cable glow: how much of the selected
 * budget this cable has spent. 0.5 is exactly at the limit, 1 is double it.
 */
export function stressFromUsage(limitUsage: number | undefined): number {
  if (!Number.isFinite(limitUsage)) return 0;
  return clamp01((limitUsage as number) / 2);
}

/**
 * Rotation period for a motor-driven load, in seconds.
 *
 * A motor that is starved of volts turns slower, and that is the most honest
 * thing the scene can *show* about a long run — so the period stretches as the
 * delivered voltage falls, clamped so a badly starved motor still reads as
 * turning rather than as broken.
 */
export function motorSpinSeconds(voltageAtLoad: number, sourceVoltage: number): number {
  const delivered =
    Number.isFinite(sourceVoltage) && sourceVoltage > 0 && Number.isFinite(voltageAtLoad)
      ? clamp01(voltageAtLoad / sourceVoltage)
      : 1;
  const { base, slowest } = SPIN_SECONDS;
  // 0.8 of nominal is as low as the tool lets a run go before it fails outright
  const starved = clamp01((1 - delivered) / 0.2);
  const seconds = base + starved * (slowest - base);
  return Math.round(seconds * 100) / 100;
}

/**
 * Share of the chosen limit the selected cable has spent, 0–1: the fill of the
 * budget meter. Over the limit it simply tops out — the status words carry the
 * bad news, the bar only has to stop growing.
 */
export function budgetFill(limitUsage: number | undefined): number {
  if (!Number.isFinite(limitUsage)) return 1; // an unevaluable run is all budget spent
  return clamp01(limitUsage as number);
}

/** Smallest and largest candidate on the ladder (defaults when empty). */
export function candidateRange(sizes: readonly number[] | undefined): {
  minSize: number;
  maxSize: number;
} {
  const list = (sizes && sizes.length > 0 ? sizes : DEFAULT_CANDIDATE_SIZES).filter((n) =>
    Number.isFinite(n),
  );
  if (list.length === 0) return { minSize: 1.5, maxSize: 35 };
  return { minSize: Math.min(...list), maxSize: Math.max(...list) };
}

/**
 * Build the structured state the scene is painted from (§17).
 *
 * Pure projection of an evaluation result — no rounding policy, no physics, no
 * DOM. The scene reads these numbers; it does not derive them.
 */
export function buildSceneState(
  evaluation: CableSizeEvaluation,
  input: {
    systemType: CableSceneState['systemType'];
    voltage: number;
    loadType: CableSceneState['loadType'];
  },
): CableSceneState {
  const preset = getLoadPreset(input.loadType);
  const selected: CandidateEvaluation | null = evaluation.selected;
  return {
    sourceVoltage: input.voltage,
    systemType: input.systemType,
    loadType: input.loadType,
    loadScene: preset.scene,
    loadPowerWatts: evaluation.loadPowerWatts,
    designCurrent: evaluation.designCurrentAmps,
    cableSize: selected?.sizeMm2 ?? 0,
    material: evaluation.material,
    cableLength: evaluation.lengthMeters,
    voltageAtLoad: selected?.voltageAtLoad ?? 0,
    voltageDrop: selected?.voltageDropVolts ?? 0,
    voltageDropPercent: selected?.voltageDropPercent ?? 0,
    dropLimitPercent: evaluation.dropLimitPercent,
    status: selected?.status ?? 'fail',
  };
}

/** The visual vocabulary that belongs to a scene state. */
export function buildVisualState(
  evaluation: CableSizeEvaluation,
  scene: CableSceneState,
): CableVisualState {
  const sizes = evaluation.candidates.map((candidate) => candidate.sizeMm2);
  const { minSize, maxSize } = candidateRange(sizes);
  const { thickness, widthPx } = cableVisualWidth(scene.cableSize, minSize, maxSize);
  return {
    thickness,
    cableWidthPx: widthPx,
    flowSeconds: currentFlowSeconds(scene.designCurrent),
    stress: stressFromUsage(evaluation.selected?.limitUsage),
    spinSeconds: motorSpinSeconds(scene.voltageAtLoad, scene.sourceVoltage),
    budgetFill: budgetFill(evaluation.selected?.limitUsage),
  };
}
