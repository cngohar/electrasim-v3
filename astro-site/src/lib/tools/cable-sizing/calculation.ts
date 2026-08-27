/**
 * calculation.ts — Cable Sizing Engine per BS 7671:2018+A3:2024 / IEC 60364-5-52
 *
 * The BS 7671 Appendix 4 tables used here are harmonized with IEC 60364-5-52
 * (Table B.52.4 for 70 °C thermoplastic two-core copper). The selected
 * `standard` therefore drives the voltage-drop limit banding (BS: 3%/5%,
 * IEC Annex G: 4%/5%) and the citations shown alongside results.
 */

import { type MetricStandardId, STANDARD_PROFILES } from '../standards';
import type {
  CableSizingInputs,
  CableSizingResult,
  CorrectionFactors,
  InstallationMethod,
} from './types';

export const STANDARD_RATINGS_IN = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125] as const;
export const STANDARD_METRIC_SIZES = [1.0, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95] as const;

export const STANDARD_CPC_SIZES: Record<number, number> = {
  1.0: 1.0,
  1.5: 1.0,
  2.5: 1.5,
  4: 1.5,
  6: 2.5,
  10: 4.0,
  16: 6.0,
  25: 10.0,
  35: 16.0,
  50: 25.0,
  70: 35.0,
  95: 50.0,
};

/** BS 7671 Table 4D5: 70°C thermoplastic (PVC) copper cable ampacity (Amps) */
const BASE_AMPACITY_TABLE: Record<InstallationMethod, Record<number, number>> = {
  A: {
    1.0: 11.5,
    1.5: 14.5,
    2.5: 20,
    4: 26,
    6: 34,
    10: 46,
    16: 61,
    25: 80,
    35: 99,
    50: 119,
    70: 151,
    95: 182,
  },
  B: {
    1.0: 13.5,
    1.5: 17.5,
    2.5: 24,
    4: 32,
    6: 41,
    10: 57,
    16: 76,
    25: 101,
    35: 125,
    50: 151,
    70: 192,
    95: 232,
  },
  C: {
    1.0: 16,
    1.5: 20,
    2.5: 27,
    4: 37,
    6: 47,
    10: 65,
    16: 87,
    25: 114,
    35: 141,
    50: 182,
    70: 234,
    95: 284,
  },
  D: {
    1.0: 18,
    1.5: 22,
    2.5: 29,
    4: 38,
    6: 47,
    10: 63,
    16: 83,
    25: 110,
    35: 135,
    50: 165,
    70: 210,
    95: 255,
  },
  E: {
    1.0: 17,
    1.5: 22,
    2.5: 30,
    4: 40,
    6: 52,
    10: 71,
    16: 96,
    25: 128,
    35: 157,
    50: 196,
    70: 249,
    95: 302,
  },
};

/** BS 7671 Table 4D5: Voltage Drop (mV/A/m) for single-phase circuits */
const VOLTAGE_DROP_MV_PER_A_M: Record<number, number> = {
  1.0: 44,
  1.5: 29,
  2.5: 18,
  4: 11,
  6: 7.3,
  10: 4.4,
  16: 2.8,
  25: 1.75,
  35: 1.25,
  50: 0.93,
  70: 0.65,
  95: 0.49,
};

/** Table 4B1: Ambient temperature correction factor Ca (70°C thermoplastic) */
export function getCa(tempC: number): number {
  if (tempC <= 25) return 1.03;
  if (tempC <= 30) return 1.0;
  if (tempC <= 35) return 0.94;
  if (tempC <= 40) return 0.87;
  if (tempC <= 45) return 0.79;
  if (tempC <= 50) return 0.71;
  if (tempC <= 55) return 0.61;
  if (tempC <= 60) return 0.5;
  return 0.35;
}

/** Table 4C1: Grouping factor Cg */
export function getCg(count: number): number {
  if (count <= 1) return 1.0;
  if (count === 2) return 0.8;
  if (count === 3) return 0.7;
  if (count === 4) return 0.65;
  if (count === 5) return 0.6;
  if (count === 6) return 0.57;
  if (count === 7) return 0.54;
  if (count === 8) return 0.52;
  if (count >= 9) return 0.5;
  return 1.0;
}

/** Thermal insulation factor Ci (BS 7671 Reg 523.9) */
export function getCi(mm: 0 | 50 | 100 | 200): number {
  if (mm === 50) return 0.89;
  if (mm === 100) return 0.81;
  if (mm === 200) return 0.5;
  return 1.0;
}

/** Calculate design current Ib */
export function calculateDesignCurrent(inputs: CableSizingInputs): number {
  if (typeof inputs.currentAmps === 'number' && inputs.currentAmps > 0) {
    return inputs.currentAmps;
  }
  const power = inputs.powerWatts ?? 0;
  const v = Math.max(1, inputs.voltageVolts);
  const pf = Math.max(0.1, Math.min(1.0, inputs.powerFactor));

  if (inputs.systemType === 'three-phase') {
    return power / (Math.sqrt(3) * v * pf);
  }
  if (inputs.systemType === 'dc') {
    return power / v;
  }
  return power / (v * pf);
}

/** Select smallest standard protective device rating In >= Ib */
export function selectProtectiveDeviceRating(ib: number): number {
  for (const rating of STANDARD_RATINGS_IN) {
    if (rating >= ib) return rating;
  }
  return 125;
}

/** Main Cable Sizing Algorithm */
export function calculateCableSizing(inputs: CableSizingInputs): CableSizingResult {
  const standardId: MetricStandardId = inputs.standard === 'iec-60364' ? 'iec-60364' : 'uk-bs7671';
  const standard = STANDARD_PROFILES[standardId];

  const ib = calculateDesignCurrent(inputs);
  const inRating = selectProtectiveDeviceRating(ib);

  const ca = getCa(inputs.ambientTempC);
  const cg = getCg(inputs.groupingCircuits);
  const ci = getCi(inputs.thermalInsulationMm);
  const cc = inputs.fuseTypeCc ? 0.725 : 1.0;
  const totalDerating = Math.max(0.01, ca * cg * ci * cc);

  const factors: CorrectionFactors = { ca, cg, ci, cc, totalDerating };

  // Tabulated capacity requirement: It >= In / (Ca * Cg * Ci * Cc)
  const itRequired = inRating / totalDerating;

  // Voltage-drop limit banding follows the selected standard
  // (BS 7671: 3% lighting / 5% power — IEC 60364-5-52 Annex G: 4% / 5%).
  const maxVdropPct =
    inputs.circuitFunction === 'lighting' ? standard.vdrop.lightingPct : standard.vdrop.powerPct;
  const maxVdropVolts = (inputs.voltageVolts * maxVdropPct) / 100;

  let selectedSize = STANDARD_METRIC_SIZES[STANDARD_METRIC_SIZES.length - 1];
  let limitingConstraint: 'thermal' | 'voltage-drop' = 'thermal';

  for (const size of STANDARD_METRIC_SIZES) {
    let ampacity = BASE_AMPACITY_TABLE[inputs.installationMethod][size] ?? 0;
    if (inputs.conductorMaterial === 'aluminum') {
      ampacity *= 0.78; // Aluminum derating ~0.78
    }

    // Check thermal compliance: Iz >= It
    const thermalOk = ampacity >= itRequired;

    // Check voltage drop:
    let mvPerAm = VOLTAGE_DROP_MV_PER_A_M[size] ?? 44;
    if (inputs.systemType === 'three-phase') {
      mvPerAm *= Math.sqrt(3) / 2; // balanced 3-phase factor ≈ 0.866
    }
    if (inputs.conductorMaterial === 'aluminum') {
      mvPerAm *= 1.64; // Aluminum resistivity ratio
    }

    const vDropVolts = (mvPerAm * ib * inputs.runLengthMeters) / 1000;
    const vDropOk = vDropVolts <= maxVdropVolts;

    if (thermalOk && vDropOk) {
      selectedSize = size;
      limitingConstraint = 'thermal';
      break;
    }

    // If thermal was ok but vdrop failed, the constraint is voltage drop
    if (thermalOk && !vDropOk) {
      limitingConstraint = 'voltage-drop';
    }
  }

  // Recalculate chosen cable metrics
  let finalAmpacity = BASE_AMPACITY_TABLE[inputs.installationMethod][selectedSize] ?? 0;
  if (inputs.conductorMaterial === 'aluminum') finalAmpacity *= 0.78;

  let finalMvPerAm = VOLTAGE_DROP_MV_PER_A_M[selectedSize] ?? 44;
  if (inputs.systemType === 'three-phase') finalMvPerAm *= Math.sqrt(3) / 2;
  if (inputs.conductorMaterial === 'aluminum') finalMvPerAm *= 1.64;

  const finalVdropVolts = (finalMvPerAm * ib * inputs.runLengthMeters) / 1000;
  const finalVdropPct = (finalVdropVolts / inputs.voltageVolts) * 100;

  const thermalPass = finalAmpacity >= itRequired;
  const vdropPass = finalVdropPct <= maxVdropPct;

  const cpcSize = STANDARD_CPC_SIZES[selectedSize] ?? selectedSize;

  let status: 'pass' | 'warning' | 'fail' = 'pass';
  let summary = `Compliant: ${selectedSize} mm² cable satisfies both thermal capacity (${finalAmpacity} A ≥ ${itRequired.toFixed(1)} A required) and ${inputs.circuitFunction} voltage drop (${finalVdropPct.toFixed(2)}% ≤ ${maxVdropPct}%) per ${standard.label}.`;

  if (!thermalPass || !vdropPass) {
    status = 'fail';
    summary = `Non-compliant: Run exceeds ${standard.label} conductor limits. Upsize cable route, reduce run length, or split circuit branches.`;
  } else if (finalVdropPct > maxVdropPct * 0.85) {
    status = 'warning';
    summary = `Marginal: ${selectedSize} mm² meets ${standard.label} limits, but voltage drop is close to the ${maxVdropPct}% ceiling (${finalVdropPct.toFixed(2)}%). Consider upsizing if future load expansion is expected.`;
  }

  return {
    designCurrentIb: ib,
    protectiveDeviceRatingIn: inRating,
    correctionFactors: factors,
    requiredAmpacityIt: itRequired,
    selectedCableMm2: selectedSize,
    cableAmpacityIz: finalAmpacity,
    cpcCableMm2: cpcSize,
    voltageDropVolts: finalVdropVolts,
    voltageDropPercent: finalVdropPct,
    maxPermissibleVdropPercent: maxVdropPct,
    voltageDropPass: vdropPass,
    thermalPass,
    limitingConstraint,
    status,
    summary,
    standardLabel: standard.label,
    standardCitation: standard.citation,
  };
}
