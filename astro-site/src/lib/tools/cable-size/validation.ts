/**
 * validation.ts — input validation for the Cable Size Calculator.
 *
 * The evaluator refuses to invent physics from nonsense: every field is
 * checked before the shared voltage-drop engine is called (§8), and the errors
 * are keyed by field so the UI can point at the control that owns them.
 */

import { CABLE_SIZE_BOUNDS, MAX_CANDIDATES, SUPPORTED_CABLE_SIZES } from './config';
import { isLoadType, isMaterial, isSystemType } from './config';
import type { ConductorMaterial, LoadType, SystemType, ValidationResult } from './types';

export interface CableSizeDraft {
  systemType?: unknown;
  voltage?: unknown;
  loadType?: unknown;
  customPowerWatts?: unknown;
  customPowerFactor?: unknown;
  material?: unknown;
  lengthMeters?: unknown;
  temperatureC?: unknown;
  dropLimitPercent?: unknown;
  candidateSizes?: unknown;
  selectedSizeMm2?: unknown;
}

/** Clamp-and-report helper shared by every numeric field. */
function checkNumber(
  errors: Record<string, string>,
  key: string,
  value: unknown,
  { min, max, label }: { min: number; max: number; label: string },
): void {
  if (value === undefined || value === null || value === '') {
    errors[key] = `${label} is required.`;
    return;
  }
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) {
    errors[key] = `${label} must be a number.`;
    return;
  }
  if (n <= 0) {
    errors[key] = `${label} must be greater than zero.`;
    return;
  }
  if (n < min || n > max) {
    errors[key] = `${label} must be between ${min} and ${max}.`;
  }
}

/**
 * Temperatures are the one field where zero and below are legal, so they get
 * their own check rather than the "greater than zero" numeric one.
 */
function checkTemperature(errors: Record<string, string>, value: unknown): void {
  const { min, max } = CABLE_SIZE_BOUNDS.temperature;
  const label = 'Conductor temperature';
  if (value === undefined || value === null || value === '') {
    errors.temperatureC = `${label} is required.`;
    return;
  }
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) {
    errors.temperatureC = `${label} must be a number.`;
    return;
  }
  if (n < min || n > max) {
    errors.temperatureC = `${label} must be between ${min} and ${max} °C.`;
  }
}

/**
 * Deduplicate, sort and cap a candidate ladder. Sizes outside the supported
 * pool are dropped rather than trusted, so a hand-edited link cannot smuggle in
 * a 3.7 mm² conductor.
 */
export function normaliseCandidateSizes(sizes: unknown): number[] {
  if (!Array.isArray(sizes)) return [];
  const cleaned = sizes
    .map((n) => (typeof n === 'number' ? n : Number.parseFloat(String(n))))
    .filter((n) => Number.isFinite(n) && n > 0)
    .filter((n) => SUPPORTED_CABLE_SIZES.includes(n));
  const unique = Array.from(new Set(cleaned)).sort((a, b) => a - b);
  return unique.slice(0, MAX_CANDIDATES);
}

/** Validate a whole draft configuration. */
export function validateCableSizeInputs(draft: CableSizeDraft): ValidationResult {
  const errors: Record<string, string> = {};

  if (!isSystemType(draft.systemType)) {
    errors.systemType = 'Choose AC or DC.';
  }
  if (!isLoadType(draft.loadType)) {
    errors.loadType = 'Choose a load type.';
  }
  if (!isMaterial(draft.material)) {
    errors.material = 'Choose copper or aluminium.';
  }

  checkNumber(errors, 'voltage', draft.voltage, {
    ...CABLE_SIZE_BOUNDS.voltage,
    label: 'Source voltage',
  });
  checkNumber(errors, 'lengthMeters', draft.lengthMeters, {
    ...CABLE_SIZE_BOUNDS.length,
    label: 'Cable length',
  });
  checkTemperature(errors, draft.temperatureC);
  checkNumber(errors, 'dropLimitPercent', draft.dropLimitPercent, {
    ...CABLE_SIZE_BOUNDS.dropLimit,
    label: 'Voltage-drop limit',
  });

  if (draft.loadType === 'custom') {
    checkNumber(errors, 'customPowerWatts', draft.customPowerWatts, {
      ...CABLE_SIZE_BOUNDS.power,
      label: 'Load power',
    });
    const pf = Number.parseFloat(String(draft.customPowerFactor));
    if (!Number.isFinite(pf)) {
      errors.customPowerFactor = 'Power factor is required.';
    } else if (pf < CABLE_SIZE_BOUNDS.powerFactor.min || pf > CABLE_SIZE_BOUNDS.powerFactor.max) {
      errors.customPowerFactor = `Power factor must be between ${CABLE_SIZE_BOUNDS.powerFactor.min} and ${CABLE_SIZE_BOUNDS.powerFactor.max}.`;
    }
  }

  const sizes = normaliseCandidateSizes(draft.candidateSizes);
  if (sizes.length === 0) {
    errors.candidateSizes = 'At least one supported cable size is required.';
  }

  if (
    draft.selectedSizeMm2 !== undefined &&
    draft.selectedSizeMm2 !== null &&
    draft.selectedSizeMm2 !== ''
  ) {
    const selected = Number.parseFloat(String(draft.selectedSizeMm2));
    if (!Number.isFinite(selected) || selected <= 0) {
      errors.selectedSizeMm2 = 'Selected cable size must be greater than zero.';
    } else if (sizes.length > 0 && !sizes.includes(selected)) {
      errors.selectedSizeMm2 = 'Selected cable size is not one of the candidates.';
    }
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

/** Normalise a validated draft into the types the engine consumes. */
export interface NormalisedCableSizeInput {
  systemType: SystemType;
  voltage: number;
  loadType: LoadType;
  customPowerWatts: number;
  customPowerFactor: number;
  material: ConductorMaterial;
  lengthMeters: number;
  dropLimitPercent: number;
  candidateSizes: number[];
  selectedSizeMm2: number | null;
}

export function clampToBounds(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
