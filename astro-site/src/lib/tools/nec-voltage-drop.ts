/**
 * nec-voltage-drop.ts — US NEC Voltage Drop Engine
 *
 * Standards basis:
 *  - Conductor DC resistance: NEC (NFPA 70) Chapter 9, Table 8
 *    "Conductor Properties", stranded conductors at 75 °C, converted to Ω/ft.
 *  - Temperature correction: R(T) = R(75 °C) × (K + T) / (K + 75),
 *    K = 234.5 for copper, 228.1 for aluminum (inferred absolute-zero constants).
 *  - AC reactance (optional): ~0.045 Ω/kFT typical for 600 V conductors in
 *    PVC conduit per NEC Chapter 9, Table 9 (mid-size approximation).
 *  - Compliance guidance: NEC 210.19(A) Informational Note No. 4 and
 *    215.2(A)(1) Informational Note No. 2 — 3% max on any feeder or branch
 *    circuit, 5% total. Advisory only, not an enforceable requirement.
 */

import { getStandardProfile } from './standards';
import type { StandardProfile } from './standards';

export type NecSystemType = 'dc' | 'single' | 'three';
export type NecConductorMaterial = 'copper' | 'aluminum';
export type NecSeverity = 'good' | 'warning' | 'excessive';

export interface NecConductorEntry {
  /** Display designation, e.g. "12" or "4/0" */
  awg: string;
  /** Cross-sectional area in mm² (28.19 mm²/kcmil… exact AWG equivalents) */
  mm2: number;
  /** True when the entry is a kcmil size rather than AWG */
  isKcmil?: boolean;
  /** NEC Ch.9 Table 8 — DC Ω/kFT, stranded, 75 °C (copper) */
  copperOhmsPerKft75: number;
  /** NEC Ch.9 Table 8 — DC Ω/kFT, stranded, 75 °C (aluminum), null when not published */
  aluminumOhmsPerKft75: number | null;
}

/**
 * NEC Chapter 9, Table 8 (Conductor Properties), stranded, 75 °C.
 * Aluminum is not published for 14 AWG and 3 AWG — those stay copper-only.
 */
export const NEC_CONDUCTORS: NecConductorEntry[] = [
  { awg: '14', mm2: 2.08, copperOhmsPerKft75: 3.14, aluminumOhmsPerKft75: null },
  { awg: '12', mm2: 3.31, copperOhmsPerKft75: 1.98, aluminumOhmsPerKft75: 3.25 },
  { awg: '10', mm2: 5.26, copperOhmsPerKft75: 1.24, aluminumOhmsPerKft75: 2.04 },
  { awg: '8', mm2: 8.37, copperOhmsPerKft75: 0.778, aluminumOhmsPerKft75: 1.28 },
  { awg: '6', mm2: 13.3, copperOhmsPerKft75: 0.491, aluminumOhmsPerKft75: 0.808 },
  { awg: '4', mm2: 21.2, copperOhmsPerKft75: 0.308, aluminumOhmsPerKft75: 0.508 },
  { awg: '3', mm2: 26.7, copperOhmsPerKft75: 0.245, aluminumOhmsPerKft75: null },
  { awg: '2', mm2: 33.6, copperOhmsPerKft75: 0.194, aluminumOhmsPerKft75: 0.319 },
  { awg: '1', mm2: 42.4, copperOhmsPerKft75: 0.154, aluminumOhmsPerKft75: 0.253 },
  { awg: '1/0', mm2: 53.5, copperOhmsPerKft75: 0.122, aluminumOhmsPerKft75: 0.201 },
  { awg: '2/0', mm2: 67.4, copperOhmsPerKft75: 0.0967, aluminumOhmsPerKft75: 0.159 },
  { awg: '3/0', mm2: 85.0, copperOhmsPerKft75: 0.0766, aluminumOhmsPerKft75: 0.126 },
  { awg: '4/0', mm2: 107.2, copperOhmsPerKft75: 0.0608, aluminumOhmsPerKft75: 0.1 },
  {
    awg: '250 kcmil',
    mm2: 127,
    isKcmil: true,
    copperOhmsPerKft75: 0.0515,
    aluminumOhmsPerKft75: 0.0848,
  },
  {
    awg: '300 kcmil',
    mm2: 152,
    isKcmil: true,
    copperOhmsPerKft75: 0.0429,
    aluminumOhmsPerKft75: 0.0707,
  },
  {
    awg: '350 kcmil',
    mm2: 177,
    isKcmil: true,
    copperOhmsPerKft75: 0.0367,
    aluminumOhmsPerKft75: 0.0605,
  },
  {
    awg: '400 kcmil',
    mm2: 203,
    isKcmil: true,
    copperOhmsPerKft75: 0.0321,
    aluminumOhmsPerKft75: 0.0529,
  },
  {
    awg: '500 kcmil',
    mm2: 253,
    isKcmil: true,
    copperOhmsPerKft75: 0.0258,
    aluminumOhmsPerKft75: 0.0424,
  },
];

/** Inferred absolute-zero temperature constants (°C) */
const TEMP_CONSTANT: Record<NecConductorMaterial, number> = {
  copper: 234.5,
  aluminum: 228.1,
};

/** Reference temperature of NEC Table 8 values */
export const NEC_TABLE8_REFERENCE_TEMP_C = 75;

/** Typical AC reactance for 600 V conductors in PVC conduit (NEC Ch.9 Table 9, mid sizes) */
export const NEC_DEFAULT_REACTANCE_OHMS_PER_KFT = 0.045;

/** Common US nominal system voltages offered as one-tap presets */
export const NEC_VOLTAGE_PRESETS: Array<{ volts: number; label: string; system: NecSystemType }> = [
  { volts: 12, label: '12 V DC', system: 'dc' },
  { volts: 24, label: '24 V DC', system: 'dc' },
  { volts: 48, label: '48 V DC', system: 'dc' },
  { volts: 120, label: '120 V 1-Ø', system: 'single' },
  { volts: 208, label: '208 V', system: 'three' },
  { volts: 240, label: '240 V 1-Ø', system: 'single' },
  { volts: 277, label: '277 V 1-Ø', system: 'single' },
  { volts: 480, label: '480 V 3-Ø', system: 'three' },
];

export interface NecVoltageDropInputs {
  systemType: NecSystemType;
  voltage: number; // Volts
  current: number; // Amperes
  lengthFeet: number; // One-way feet
  awg: string; // key into NEC_CONDUCTORS
  material: NecConductorMaterial;
  /** Conductor operating temperature °C (default 75 — NEC Table 8 basis) */
  conductorTempC?: number;
  /** Load displacement power factor 0.1–1.0 (AC only, default 1.0) */
  powerFactor?: number;
  /** Include AC inductive reactance (~0.045 Ω/kFT, NEC Ch.9 Table 9 typical) */
  includeReactance?: boolean;
}

export interface NecVoltageDropResult {
  valid: boolean;
  standard: StandardProfile;
  systemType: NecSystemType;
  sourceVoltage: number;
  loadCurrent: number;
  lengthFeet: number;
  awg: string;
  mm2Equivalent: number;
  material: NecConductorMaterial;
  /** Ω per 1000 ft at the selected operating temperature */
  ohmsPerKft: number;
  /** Total one-way conductor resistance (Ω) */
  totalResistance: number;
  voltageDrop: number;
  voltageDropPercent: number;
  voltageAtLoad: number;
  powerLossWatts: number;
  severity: NecSeverity;
  statusTitle: string;
  statusDescription: string;
  errorMessage?: string;
}

export function getConductorEntry(awg: string): NecConductorEntry | undefined {
  return NEC_CONDUCTORS.find((c) => c.awg === awg);
}

/** Conductors available for a material (aluminum not published for 14 AWG / 3 AWG) */
export function getConductorsForMaterial(material: NecConductorMaterial): NecConductorEntry[] {
  return NEC_CONDUCTORS.filter((c) =>
    material === 'copper' ? true : c.aluminumOhmsPerKft75 !== null,
  );
}

/** DC resistance in Ω/kFT at a given operating temperature, from NEC Table 8 @75 °C. */
export function necResistanceOhmsPerKft(
  awg: string,
  material: NecConductorMaterial,
  tempC = NEC_TABLE8_REFERENCE_TEMP_C,
): number | null {
  const entry = getConductorEntry(awg);
  if (!entry) return null;
  const at75 = material === 'copper' ? entry.copperOhmsPerKft75 : entry.aluminumOhmsPerKft75;
  if (at75 === null) return null;
  const k = TEMP_CONSTANT[material];
  const clamped = Math.min(150, Math.max(-40, tempC));
  return at75 * ((k + clamped) / (k + NEC_TABLE8_REFERENCE_TEMP_C));
}

const SEVERITY_COPY: Record<NecSeverity, { title: string; description: string }> = {
  good: {
    title: 'Within NEC Guidance',
    description:
      'Voltage drop is ≤ 3% — within the NEC advisory maximum for a single branch circuit or feeder (NEC 210.19(A) Informational Note No. 4 & 215.2(A)(1) Informational Note No. 2).',
  },
  warning: {
    title: 'Marginal',
    description:
      'Voltage drop is between 3% and 5%. Acceptable only if the combined feeder + branch-circuit drop stays within 5% total. Consider upsizing the conductor for long runs.',
  },
  excessive: {
    title: 'Excessive',
    description:
      'Voltage drop exceeds 5%. This can starve motors, dim lighting and waste energy. Upsize the AWG/kcmil conductor or shorten the run.',
  },
};

/**
 * Pure NEC voltage-drop calculation.
 *   1-Ø / DC: VD = 2 × I × L × (R′ cos φ + X′ sin φ)
 *   3-Ø:      VD = √3 × I × L × (R′ cos φ + X′ sin φ)
 * with R′, X′ in Ω per foot (one-way run length L in feet).
 */
export function calculateNecVoltageDrop(inputs: NecVoltageDropInputs): NecVoltageDropResult {
  const standard = getStandardProfile('us-nec');
  const systemType: NecSystemType =
    inputs.systemType === 'three' || inputs.systemType === 'dc' ? inputs.systemType : 'single';
  const voltage = Number.isFinite(inputs.voltage) ? Math.max(0, inputs.voltage) : 0;
  const current = Number.isFinite(inputs.current) ? Math.max(0, inputs.current) : 0;
  const lengthFeet = Number.isFinite(inputs.lengthFeet) ? Math.max(0, inputs.lengthFeet) : 0;
  const material: NecConductorMaterial = inputs.material === 'aluminum' ? 'aluminum' : 'copper';
  const tempC = Number.isFinite(inputs.conductorTempC)
    ? inputs.conductorTempC!
    : NEC_TABLE8_REFERENCE_TEMP_C;
  const pf = systemType === 'dc' ? 1 : Math.min(1, Math.max(0.1, inputs.powerFactor ?? 1));
  const includeReactance = Boolean(inputs.includeReactance) && systemType !== 'dc';

  const entry = getConductorEntry(inputs.awg);
  const ohmsPerKft = necResistanceOhmsPerKft(inputs.awg, material, tempC);

  const invalid = (message: string): NecVoltageDropResult => ({
    valid: false,
    standard,
    systemType,
    sourceVoltage: voltage,
    loadCurrent: current,
    lengthFeet,
    awg: inputs.awg,
    mm2Equivalent: entry?.mm2 ?? 0,
    material,
    ohmsPerKft: 0,
    totalResistance: 0,
    voltageDrop: 0,
    voltageDropPercent: 0,
    voltageAtLoad: 0,
    powerLossWatts: 0,
    severity: 'warning',
    statusTitle: 'Check Inputs',
    statusDescription: message,
    errorMessage: message,
  });

  if (!entry || ohmsPerKft === null || ohmsPerKft === undefined) {
    return invalid(
      material === 'aluminum'
        ? `Aluminum is not published for ${inputs.awg} in NEC Chapter 9 Table 8 — choose the next size or copper.`
        : `Unknown conductor size "${inputs.awg}".`,
    );
  }
  if (voltage <= 0) return invalid('System voltage must be greater than 0 V.');
  if (lengthFeet <= 0) return invalid('One-way conductor run length must be greater than 0 ft.');

  const rOhmsPerFt = ohmsPerKft / 1000;
  const totalResistance = rOhmsPerFt * lengthFeet; // one-way
  const xOhmsPerFt = includeReactance ? NEC_DEFAULT_REACTANCE_OHMS_PER_KFT / 1000 : 0;
  const sinPhi = systemType === 'dc' ? 0 : Math.sqrt(Math.max(0, 1 - pf * pf));

  const multiplier = systemType === 'three' ? Math.sqrt(3) : 2;
  const effectiveOhmsPerFt = rOhmsPerFt * pf + xOhmsPerFt * sinPhi;
  const voltageDrop = multiplier * current * lengthFeet * effectiveOhmsPerFt;
  const dropPct = voltage > 0 ? (voltageDrop / voltage) * 100 : 0;
  const voltageAtLoad = Math.max(0, voltage - voltageDrop);
  const conductorCount = systemType === 'three' ? 3 : 2;
  const powerLossWatts = current * current * conductorCount * totalResistance;

  const EPSILON = 1e-9;
  let severity: NecSeverity = 'good';
  if (dropPct > standard.vdrop.powerPct + EPSILON) {
    severity = 'excessive';
  } else if (dropPct > standard.vdrop.lightingPct + EPSILON) {
    severity = 'warning';
  }
  const status = SEVERITY_COPY[severity];

  return {
    valid: true,
    standard,
    systemType,
    sourceVoltage: voltage,
    loadCurrent: current,
    lengthFeet,
    awg: entry.awg,
    mm2Equivalent: entry.mm2,
    material,
    ohmsPerKft,
    totalResistance,
    voltageDrop,
    voltageDropPercent: dropPct,
    voltageAtLoad,
    powerLossWatts,
    severity,
    statusTitle: status.title,
    statusDescription: status.description,
  };
}
