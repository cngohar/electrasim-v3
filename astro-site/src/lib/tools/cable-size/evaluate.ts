/**
 * evaluate.ts — the Cable Size domain engine (§8, §30).
 *
 * One rule, stated once:
 *
 * > Recommend the **smallest candidate cable size that passes the selected
 * > voltage-drop limit** for this load and run.
 *
 * The electrical mathematics is *not* re-implemented here. Every candidate is
 * scored by the shared voltage-drop engine
 * (`src/lib/tools/voltage-drop/calculation.ts`), the same engine the Voltage
 * Drop calculator runs on, so the two tools can never disagree about what a
 * given copper run loses.
 *
 * This module is pure: no DOM, no React, no I/O. The UI builds its scene state
 * from the result and never recomputes the physics (§4, §29).
 */

import { calculateVoltageDrop } from '../voltage-drop/calculation';
import {
  CABLE_SIZE_BOUNDS,
  CONDUCTOR_TEMPERATURE_C,
  DEFAULT_CANDIDATE_SIZES,
  NEAR_LIMIT_HEADROOM,
} from './config';
import { getLoadPreset } from './presets';
import type {
  CableSizeEvaluation,
  CableSizeInputs,
  CandidateEvaluation,
  ConductorMaterial,
  EvaluateCableSizesRequest,
  EvaluateCableSizesResult,
  SelectionVerdict,
  SystemType,
} from './types';
import { normaliseCandidateSizes, validateCableSizeInputs } from './validation';

/** Map the tool's material spelling onto the shared engine's union. */
function toEngineMaterial(material: ConductorMaterial): 'copper' | 'aluminum' {
  return material === 'aluminium' ? 'aluminum' : 'copper';
}

/** Map the tool's system type onto the shared engine's union. */
function toEngineSystemType(systemType: SystemType): 'dc' | 'single' {
  return systemType === 'dc' ? 'dc' : 'single';
}

/** Three-state verdict for a drop against the selected limit (§21). */
export function statusForDrop(
  dropPercent: number,
  limitPercent: number,
): CandidateEvaluation['status'] {
  if (!Number.isFinite(dropPercent) || !Number.isFinite(limitPercent)) return 'fail';
  if (dropPercent > limitPercent) return 'fail';
  if (limitPercent > 0 && dropPercent >= limitPercent * (1 - NEAR_LIMIT_HEADROOM)) {
    return 'near-limit';
  }
  return 'pass';
}

/**
 * Design current for a load.
 *
 * - AC: `I = P / (U × cos φ)`
 * - DC: `I = P / U`
 *
 * Three-phase is deliberately absent (§24).
 */
export function designCurrentFromLoad({
  systemType,
  voltage,
  powerWatts,
  powerFactor,
}: {
  systemType: SystemType;
  voltage: number;
  powerWatts: number;
  powerFactor: number;
}): number {
  const v = Number.isFinite(voltage) ? Math.max(1, voltage) : 0;
  const p = Number.isFinite(powerWatts) ? Math.max(0, powerWatts) : 0;
  if (systemType === 'dc') return p / v;
  const pf = Math.min(1, Math.max(0.1, Number.isFinite(powerFactor) ? powerFactor : 1));
  return p / (v * pf);
}

/** Resolve the demand a configuration is actually asking about. */
export function resolveLoad(
  inputs: Pick<CableSizeInputs, 'loadType' | 'customPowerWatts' | 'customPowerFactor'>,
): {
  powerWatts: number;
  powerFactor: number;
} {
  const preset = getLoadPreset(inputs.loadType);
  if (preset.id === 'custom') {
    return {
      powerWatts: Number.isFinite(inputs.customPowerWatts)
        ? Math.max(0, inputs.customPowerWatts)
        : preset.powerWatts,
      powerFactor: Number.isFinite(inputs.customPowerFactor)
        ? Math.min(1, Math.max(0.1, inputs.customPowerFactor))
        : preset.powerFactor,
    };
  }
  return { powerWatts: preset.powerWatts, powerFactor: preset.powerFactor };
}

/**
 * Evaluate every candidate cross-section for one run (§30).
 *
 * The ladder is normalised (deduped, sorted, capped) so a duplicate or
 * out-of-order list can never change which size is recommended.
 */
export function evaluateCableSizes(request: EvaluateCableSizesRequest): EvaluateCableSizesResult {
  const errors: Record<string, string> = {};

  const voltage = Number.parseFloat(String(request.voltage));
  const current = Number.parseFloat(String(request.current));
  const length = Number.parseFloat(String(request.length));
  const limit = Number.parseFloat(String(request.voltageDropLimit));

  if (!Number.isFinite(voltage) || voltage <= 0)
    errors.voltage = 'Source voltage must be greater than 0 V.';
  if (!Number.isFinite(current) || current < 0)
    errors.current = 'Design current cannot be negative.';
  if (!Number.isFinite(length) || length <= 0)
    errors.length = 'Cable length must be greater than 0 m.';
  if (!Number.isFinite(limit) || limit <= 0)
    errors.voltageDropLimit = 'Voltage-drop limit must be greater than 0%.';

  if (current > CABLE_SIZE_BOUNDS.current.max) {
    errors.current = `Design current cannot exceed ${CABLE_SIZE_BOUNDS.current.max} A.`;
  }

  const rawSizes = request.candidateSizes ?? DEFAULT_CANDIDATE_SIZES;
  const sizes = normaliseCandidateSizes(rawSizes);
  if (sizes.length === 0) {
    errors.candidateSizes = 'At least one supported cable size is required.';
  }

  if (Object.keys(errors).length > 0) {
    return {
      valid: false,
      errors,
      candidates: [],
      recommendedCable: null,
      voltageDropLimit: Number.isFinite(limit) ? limit : 0,
      designCurrentAmps: Number.isFinite(current) ? current : 0,
    };
  }

  const material = request.material === 'aluminium' ? 'aluminium' : 'copper';
  const systemType: SystemType = request.systemType === 'dc' ? 'dc' : 'ac';
  const powerFactor = Number.isFinite(request.powerFactor)
    ? Math.min(1, Math.max(0.1, request.powerFactor as number))
    : 1;
  const temperatureC = Number.isFinite(request.temperatureC)
    ? (request.temperatureC as number)
    : CONDUCTOR_TEMPERATURE_C;

  const candidates: CandidateEvaluation[] = sizes.map((sizeMm2) => {
    const drop = calculateVoltageDrop({
      systemType: toEngineSystemType(systemType),
      voltage,
      current,
      length,
      size: sizeMm2,
      material: toEngineMaterial(material),
      powerFactor,
      temperature: temperatureC,
      // AC runs carry reactance as well as resistance; the shared engine holds
      // this at zero for DC internally. Omitting it understates the drop on
      // larger sizes at anything below unity power factor, and BS 7671's own
      // mV/A/m tables already include a reactive term, so this moves the tool
      // toward the tabulated figures rather than away from them.
      includeReactance: true,
    });

    const status = statusForDrop(drop.voltageDropPercent, limit);
    return {
      sizeMm2,
      voltageDropVolts: drop.voltageDrop,
      voltageDropPercent: drop.voltageDropPercent,
      voltageAtLoad: drop.voltageAtLoad,
      totalResistanceOhms: drop.totalResistance,
      powerLossWatts: drop.powerLoss,
      limitUsage: limit > 0 ? drop.voltageDropPercent / limit : Number.POSITIVE_INFINITY,
      status,
      passes: drop.voltageDropPercent <= limit,
    };
  });

  const recommendedCable = candidates.find((candidate) => candidate.passes) ?? null;

  return {
    valid: true,
    errors: {},
    candidates,
    recommendedCable,
    voltageDropLimit: limit,
    designCurrentAmps: current,
  };
}

/** How the cable being inspected relates to the algorithmic answer (§12). */
export function selectionVerdict(
  selected: CandidateEvaluation | null,
  recommended: CandidateEvaluation | null,
): SelectionVerdict {
  if (!selected || !recommended) return 'unknown';
  if (!selected.passes) return 'too-small';
  if (selected.sizeMm2 === recommended.sizeMm2) return 'recommended';
  return 'oversized';
}

/**
 * The one call the UI makes: configuration in, everything the panels and the
 * scene need out (§8).
 */
export function evaluateCableRun(inputs: CableSizeInputs): CableSizeEvaluation {
  const validation = validateCableSizeInputs(inputs);
  // A stale selection (a shared link kept `size=50` after the ladder changed) is
  // not a reason to refuse the answer: it falls back to the recommendation. Any
  // *other* invalid field still is — the physics would be invented.
  const onlySelectionIsStale =
    !validation.isValid && Object.keys(validation.errors).every((key) => key === 'selectedSizeMm2');
  if (!validation.isValid && !onlySelectionIsStale) {
    return {
      valid: false,
      errors: validation.errors,
      candidates: [],
      recommendedCable: null,
      voltageDropLimit: Number.isFinite(inputs.dropLimitPercent) ? inputs.dropLimitPercent : 0,
      designCurrentAmps: 0,
      loadPowerWatts: 0,
      loadType: inputs.loadType,
      material: inputs.material,
      lengthMeters: inputs.lengthMeters,
      selected: null,
      selectedSizeMm2: inputs.selectedSizeMm2 ?? null,
      selection: 'unknown',
      status: 'fail',
      dropLimitPercent: inputs.dropLimitPercent,
    };
  }

  const { powerWatts, powerFactor } = resolveLoad(inputs);
  const designCurrent = designCurrentFromLoad({
    systemType: inputs.systemType,
    voltage: inputs.voltage,
    powerWatts,
    powerFactor,
  });

  const result = evaluateCableSizes({
    voltage: inputs.voltage,
    current: designCurrent,
    length: inputs.lengthMeters,
    material: inputs.material,
    temperatureC: inputs.temperatureC,
    voltageDropLimit: inputs.dropLimitPercent,
    candidateSizes: inputs.candidateSizes,
    systemType: inputs.systemType,
    powerFactor,
  });

  if (!result.valid) {
    return {
      ...result,
      loadPowerWatts: powerWatts,
      loadType: inputs.loadType,
      material: inputs.material,
      lengthMeters: inputs.lengthMeters,
      selected: null,
      selectedSizeMm2: inputs.selectedSizeMm2 ?? null,
      selection: 'unknown',
      status: 'fail',
      dropLimitPercent: inputs.dropLimitPercent,
    };
  }

  const sizes = result.candidates.map((candidate) => candidate.sizeMm2);
  const fallbackSize = result.recommendedCable?.sizeMm2 ?? sizes[sizes.length - 1] ?? null;
  let selectedSizeMm2 = inputs.selectedSizeMm2;
  if (selectedSizeMm2 === null || !sizes.includes(selectedSizeMm2)) {
    selectedSizeMm2 = fallbackSize;
  }
  const selected =
    result.candidates.find((candidate) => candidate.sizeMm2 === selectedSizeMm2) ?? null;

  return {
    ...result,
    loadPowerWatts: powerWatts,
    loadType: inputs.loadType,
    material: inputs.material,
    lengthMeters: inputs.lengthMeters,
    selected,
    selectedSizeMm2,
    selection: selectionVerdict(selected, result.recommendedCable),
    status: selected?.status ?? 'fail',
    dropLimitPercent: inputs.dropLimitPercent,
  };
}
