/** Educational defaults used when a legacy wire has no explicit metadata. */
export const ELECTRICAL_DEFAULTS = {
  copperResistivityOhmMm2PerM: 0.0175,
  aluminumResistivityOhmMm2PerM: 0.0282,
  defaultLengthMeters: 10,
  maximumVoltageDropPercent: 3,
  deratingFactor: 1,
} as const;

import { getCableAmpacity } from './simulation/tripCurves';
import type { InstallationMethod } from './types';

/**
 * Resistivity multiplier bringing 20 °C conductor resistance to its 70 °C
 * operating value (1 + α·ΔT, α ≈ 0.0039/K for Cu/Al ⇒ ≈ 1.2). Used only for
 * sizes outside the tabulated BS 7671 range and for aluminum.
 */
const TEMP_FACTOR_70C = 1.2;

/**
 * Tabulated mV/A/m (both conductors) per BS 7671 Appendix 4 Table 4D5,
 * 70 °C thermoplastic flat twin-and-earth, COPPER, ≤ 16 mm² — the values
 * used for Regulation 525 voltage-drop checks.
 */
const MV_PER_AMP_METER_COPPER: readonly (readonly [number, number])[] = [
  [1.0, 44],
  [1.5, 29],
  [2.5, 18],
  [4.0, 11],
  [6.0, 7.3],
  [10.0, 4.4],
  [16.0, 2.8],
];

/**
 * Two-way mV/A/m for voltage-drop checks. Tabulated BS 7671 values for
 * standard copper T&E sizes; falls back to the 70 °C-corrected resistivity
 * model for aluminum and for non-standard metric/AWG-derived sizes.
 */
export function getMillivoltAmpMeter(mm2: number, material: 'copper' | 'aluminum'): number {
  if (material === 'copper' && Number.isFinite(mm2) && mm2 > 0) {
    for (const [size, mv] of MV_PER_AMP_METER_COPPER) {
      if (mm2 === size) return mv;
    }
  }
  const resistivity =
    material === 'aluminum'
      ? ELECTRICAL_DEFAULTS.aluminumResistivityOhmMm2PerM
      : ELECTRICAL_DEFAULTS.copperResistivityOhmMm2PerM;
  return mm2 > 0 ? (2 * resistivity * TEMP_FACTOR_70C * 1000) / mm2 : 0;
}

export function awgToMm2(awg: number): number {
  const map: Record<number, number> = {
    10: 5.26,
    12: 3.31,
    14: 2.08,
    16: 1.31,
    18: 0.82,
    20: 0.52,
    22: 0.33,
  };
  return map[awg] ?? 2.08;
}

/**
 * Ampacity for the wire-inspector / validation path. Delegates to the
 * audit-corrected BS 7671 table in `simulation/tripCurves.ts` (installed
 * Reference Method selectable); aluminum uses the Module's traditional 0.78
 * conductivity factor off the copper values — a teaching approximation,
 * BS 7671 publishes separate Al tables.
 */
export function getStandardCableAmpacity(
  mm2: number,
  material: 'copper' | 'aluminum' = 'copper',
  method: InstallationMethod = 'C',
): number {
  if (!Number.isFinite(mm2) || mm2 <= 0) return 0;
  const baseAmpacity = getCableAmpacity(mm2, method);
  return material === 'aluminum' ? Math.round(baseAmpacity * 0.78) : baseAmpacity;
}

export interface ElectricalCalculationInput {
  powerWatts: number;
  voltage: number;
  currentAmps: number;
  cableMm2: number;
  lengthMeters?: number;
  deratingFactor?: number;
  material?: 'copper' | 'aluminum';
  gauge?: number;
  /** BS 7671 installation Reference Method for base ampacity (default `'C'`). */
  installationMethod?: InstallationMethod;
}

export interface ElectricalCalculation {
  currentAmps: number;
  cableMm2: number;
  lengthMeters: number;
  ampacityAmps: number;
  deratedAmpacityAmps: number;
  resistanceOhms: number;
  voltageDropVolts: number;
  voltageDropPercent: number;
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

export function calculateLoadCurrent(powerWatts: number, voltage: number): number {
  if (
    !Number.isFinite(powerWatts) ||
    !Number.isFinite(voltage) ||
    voltage <= 0 ||
    powerWatts <= 0
  ) {
    return 0;
  }
  return powerWatts / voltage;
}

export function calculateElectricalValues(
  input: ElectricalCalculationInput,
): ElectricalCalculation {
  const rawLength = input.lengthMeters ?? ELECTRICAL_DEFAULTS.defaultLengthMeters;
  const rawDerating = input.deratingFactor ?? ELECTRICAL_DEFAULTS.deratingFactor;
  const effectiveMm2 = input.gauge ? awgToMm2(input.gauge) : input.cableMm2;
  const validInput =
    Number.isFinite(input.powerWatts) &&
    input.powerWatts >= 0 &&
    Number.isFinite(input.voltage) &&
    input.voltage > 0 &&
    Number.isFinite(input.currentAmps) &&
    input.currentAmps >= 0 &&
    Number.isFinite(effectiveMm2) &&
    effectiveMm2 > 0 &&
    Number.isFinite(rawLength) &&
    rawLength > 0 &&
    Number.isFinite(rawDerating) &&
    rawDerating > 0 &&
    rawDerating <= 1;

  if (!validInput) {
    return {
      currentAmps: Number.isFinite(input.currentAmps) ? Math.max(0, input.currentAmps) : 0,
      cableMm2: Number.isFinite(effectiveMm2) ? Math.max(0, effectiveMm2) : 0,
      lengthMeters: Number.isFinite(rawLength) ? Math.max(0, rawLength) : 0,
      ampacityAmps: 0,
      deratedAmpacityAmps: 0,
      resistanceOhms: 0,
      voltageDropVolts: 0,
      voltageDropPercent: 0,
      status: 'fail',
      message: 'Invalid electrical calculation input.',
    };
  }

  const cableMm2 = Math.max(0.33, effectiveMm2);
  const lengthMeters = Math.max(0.1, rawLength);
  const deratingFactor = Math.max(0.1, Math.min(1, rawDerating));
  const material = input.material === 'aluminum' ? 'aluminum' : 'copper';
  const installationMethod = input.installationMethod ?? 'C';
  const ampacityAmps = getStandardCableAmpacity(cableMm2, material, installationMethod);
  const deratedAmpacityAmps = ampacityAmps * deratingFactor;
  // BS 7671 tabulated mV/A/m (both conductors) — the Regulation 525 method;
  // resistance is derived from the same value so the inspector's R figure
  // always reconciles with the displayed drop.
  const milliVoltAmpMeter = getMillivoltAmpMeter(cableMm2, material);
  const resistanceOhms = (milliVoltAmpMeter * lengthMeters) / 1000;
  const voltageDropVolts = input.currentAmps * resistanceOhms;
  const voltageDropPercent = input.voltage > 0 ? (voltageDropVolts / input.voltage) * 100 : 0;
  const status =
    input.currentAmps > deratedAmpacityAmps
      ? 'fail'
      : voltageDropPercent > ELECTRICAL_DEFAULTS.maximumVoltageDropPercent
        ? 'warning'
        : 'pass';
  const message =
    status === 'fail'
      ? `Current ${input.currentAmps.toFixed(1)} A exceeds derated ${material} cable capacity ${deratedAmpacityAmps.toFixed(1)} A.`
      : status === 'warning'
        ? `Voltage drop ${voltageDropPercent.toFixed(1)}% exceeds the ${ELECTRICAL_DEFAULTS.maximumVoltageDropPercent}% guidance limit.`
        : `Cable passes: ${voltageDropPercent.toFixed(1)}% voltage drop and ${deratedAmpacityAmps.toFixed(1)} A capacity (${material}).`;
  return {
    currentAmps: input.currentAmps,
    cableMm2,
    lengthMeters,
    ampacityAmps,
    deratedAmpacityAmps,
    resistanceOhms,
    voltageDropVolts,
    voltageDropPercent,
    status,
    message,
  };
}
