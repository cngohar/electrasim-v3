/**
 * calculation.ts — Cable Sizing Engine per BS 7671:2018+A3:2024 / IEC 60364-5-52
 *
 * The BS 7671 Appendix 4 tables used here are harmonized with IEC 60364-5-52
 * (Table B.52.4 for 70 °C thermoplastic two-core copper). The selected
 * `standard` therefore drives the voltage-drop limit banding (BS: 3%/5%,
 * IEC Annex G Table G.52.1: 3%/5%) and the citations shown alongside results.
 */

import { type MetricStandardId, STANDARD_PROFILES } from '../standards';
import {
  ALUMINIUM_AMPACITY_FACTOR,
  ALUMINIUM_MV_RATIO,
  BASE_AMPACITY_TABLE,
  BS3036_FACTOR,
  STANDARD_CPC_SIZES,
  STANDARD_METRIC_SIZES,
  STANDARD_RATINGS_IN,
  VOLTAGE_DROP_MV_PER_A_M,
  getCa,
  getCg,
  getCi,
} from './tables';
import type {
  CableSizingInputs,
  CableSizingResult,
  CorrectionFactors,
  InstallationMethod,
} from './types';

/**
 * Shared conductor data lives in `tables.ts` (single source of truth, mirrored
 * by `public/js/cable-tables.js` for the browser engine). Re-exported here so
 * existing consumers that import from `./calculation` keep working.
 */
export {
  ALUMINIUM_AMPACITY_FACTOR,
  ALUMINIUM_MV_RATIO,
  BASE_AMPACITY_TABLE,
  BS3036_FACTOR,
  getCa,
  getCg,
  getCi,
  STANDARD_CPC_SIZES,
  STANDARD_METRIC_SIZES,
  STANDARD_RATINGS_IN,
  VOLTAGE_DROP_MV_PER_A_M,
};
export type { InstallationMethod };

/**
 * IEC 60364-5-52 Annex G (Table G.52.1 note): main wiring runs longer than
 * 100 m may raise the voltage-drop ceiling by 0.005 % per extra metre, capped
 * at +0.5 %. BS 7671 has no such allowance — its Table 4Ab limits are absolute
 * from the origin of the installation.
 */
export function longRunDropAllowancePct(standard: MetricStandardId, lengthMeters: number): number {
  const profile = STANDARD_PROFILES[standard];
  const allowance = profile.vdrop.longRunAllowancePerMetrePct;
  const start = profile.vdrop.longRunAllowanceStartM;
  const cap = profile.vdrop.longRunAllowanceCapPct;
  if (allowance === undefined || start === undefined || cap === undefined) return 0;
  if (lengthMeters <= start) return 0;
  return Math.min(cap, (lengthMeters - start) * allowance);
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
  // (BS 7671 Reg 525.1/Table 4Ab: 3% lighting / 5% power; IEC 60364-5-52 Annex G
  // Table G.52.1: 3% lighting / 5% other uses on a public LV supply).
  // IEC 60364-5-52 Annex G additionally raises the ceiling by up to +0.5% on
  // runs over 100 m (0.005% per metre); BS 7671 has no such allowance.
  const longRunAllowance = longRunDropAllowancePct(standardId, inputs.runLengthMeters);
  const maxVdropPct =
    (inputs.circuitFunction === 'lighting' ? standard.vdrop.lightingPct : standard.vdrop.powerPct) +
    longRunAllowance;
  const maxVdropVolts = (inputs.voltageVolts * maxVdropPct) / 100;

  const maxSize = STANDARD_METRIC_SIZES[STANDARD_METRIC_SIZES.length - 1];
  const maxTabulatedAmpacity =
    (BASE_AMPACITY_TABLE[inputs.installationMethod][maxSize] ?? 0) *
    (inputs.conductorMaterial === 'aluminum' ? ALUMINIUM_AMPACITY_FACTOR : 1);

  let selectedSize = maxSize;
  // True only when the selection loop below found a size passing both gates.
  let compliant = false;
  // Which gate actually forced this size up. 'voltage-drop' when some smaller
  // cross-section was big enough thermally but failed the drop check — that
  // history used to be overwritten by the selection branch below, which mislabelled
  // every long run as thermally limited.
  let dropWasBinding = false;

  for (const size of STANDARD_METRIC_SIZES) {
    let ampacity = BASE_AMPACITY_TABLE[inputs.installationMethod][size] ?? 0;
    if (inputs.conductorMaterial === 'aluminum') {
      ampacity *= ALUMINIUM_AMPACITY_FACTOR;
    }

    // Check thermal compliance: Iz >= It
    const thermalOk = ampacity >= itRequired;

    // Check voltage drop:
    let mvPerAm = VOLTAGE_DROP_MV_PER_A_M[size] ?? 44;
    if (inputs.systemType === 'three-phase') {
      mvPerAm *= Math.sqrt(3) / 2; // balanced 3-phase factor ≈ 0.866
    }
    if (inputs.conductorMaterial === 'aluminum') {
      mvPerAm *= ALUMINIUM_MV_RATIO;
    }

    const vDropVolts = (mvPerAm * ib * inputs.runLengthMeters) / 1000;
    const vDropOk = vDropVolts <= maxVdropVolts;

    // If this size carries the current but cannot hold the voltage, the drop
    // check is what is still pushing the answer up the ladder.
    if (thermalOk && !vDropOk) {
      dropWasBinding = true;
    }

    if (thermalOk && vDropOk) {
      selectedSize = size;
      compliant = true;
      break;
    }
  }

  const limitingConstraint: 'thermal' | 'voltage-drop' = dropWasBinding
    ? 'voltage-drop'
    : 'thermal';

  // Recalculate chosen cable metrics
  let finalAmpacity = BASE_AMPACITY_TABLE[inputs.installationMethod][selectedSize] ?? 0;
  if (inputs.conductorMaterial === 'aluminum') finalAmpacity *= ALUMINIUM_AMPACITY_FACTOR;

  let finalMvPerAm = VOLTAGE_DROP_MV_PER_A_M[selectedSize] ?? 44;
  if (inputs.systemType === 'three-phase') finalMvPerAm *= Math.sqrt(3) / 2;
  if (inputs.conductorMaterial === 'aluminum') finalMvPerAm *= ALUMINIUM_MV_RATIO;

  const finalVdropVolts = (finalMvPerAm * ib * inputs.runLengthMeters) / 1000;
  const finalVdropPct = (finalVdropVolts / inputs.voltageVolts) * 100;

  const thermalPass = finalAmpacity >= itRequired;
  const vdropPass = finalVdropPct <= maxVdropPct;

  const cpcSize = STANDARD_CPC_SIZES[selectedSize] ?? selectedSize;

  let status: 'pass' | 'warning' | 'fail' = 'pass';
  let summary = `Compliant: ${selectedSize} mm² cable satisfies both thermal capacity (${finalAmpacity} A ≥ ${itRequired.toFixed(1)} A required) and ${inputs.circuitFunction} voltage drop (${finalVdropPct.toFixed(2)}% ≤ ${maxVdropPct}%) per ${standard.label}.`;

  if (!compliant) {
    status = 'fail';
    summary = `No standard size clears both gates: even the largest tabulated ${maxSize} mm² cable only carries ${finalAmpacity} A after derating (It ${itRequired.toFixed(
      1,
    )} A needed) with ${finalVdropPct.toFixed(2)}% volt drop against the ${maxVdropPct.toFixed(
      1,
    )}% ceiling per ${standard.label}. Shorten the run, split the circuit into branches, or improve how the cable is fixed.`;
  } else if (!thermalPass || !vdropPass) {
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
    compliant,
    selectedCableMm2: selectedSize,
    cableAmpacityIz: finalAmpacity,
    maxTabulatedSizeMm2: maxSize,
    maxTabulatedAmpacityIz: maxTabulatedAmpacity,
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

/**
 * The "constraint crossover" curve used by the cable-sizing cutaway scene.
 *
 * Cable sizing has two independent gates, and which one binds depends on the
 * run length: the thermal (ampacity after derating) gate is a flat requirement
 * — it does not care how long the cable is — while the voltage-drop gate rises
 * with length. Plotting both against length shows the point where "how hot"
 * stops being the problem and "how far" becomes it, which is the single most
 * useful mental model for sizing a circuit and something no table conveys.
 *
 * Built from the same tables the selector walks, so the chart can never
 * contradict the headline answer.
 */
export interface CableSizingCurvePoint {
  lengthMeters: number;
  /** Smallest size that passes the ampacity gate on its own (length-independent). */
  thermalMm2: number;
  /** Smallest size that passes the voltage-drop gate at this length. */
  dropMm2: number;
  /** The size the engine actually selects (both gates). */
  selectedMm2: number;
  limitingConstraint: 'thermal' | 'voltage-drop';
  vdropPercent: number;
  /** True from the first length where volt drop, not heat, forces the size up. */
  dropGoverns: boolean;
}

function deratingProduct(inputs: CableSizingInputs): number {
  return (
    getCa(inputs.ambientTempC) *
    getCg(inputs.groupingCircuits) *
    getCi(inputs.thermalInsulationMm) *
    (inputs.fuseTypeCc ? BS3036_FACTOR : 1.0)
  );
}

/** The voltage-drop ceiling (in %) that applies to this circuit's function. */
function dropCeilingPercent(inputs: CableSizingInputs): number {
  const profile = STANDARD_PROFILES[inputs.standard === 'iec-60364' ? 'iec-60364' : 'uk-bs7671'];
  const base =
    inputs.circuitFunction === 'lighting' ? profile.vdrop.lightingPct : profile.vdrop.powerPct;
  return (
    base +
    longRunDropAllowancePct(
      inputs.standard === 'iec-60364' ? 'iec-60364' : 'uk-bs7671',
      inputs.runLengthMeters,
    )
  );
}

/** Per-metre volt-drop factor for a size, adjusted for phase and material. */
function mvPerAmFor(size: number, inputs: CableSizingInputs): number {
  let mv = VOLTAGE_DROP_MV_PER_A_M[size] ?? 44;
  if (inputs.systemType === 'three-phase') mv *= Math.sqrt(3) / 2; // ≈ 0.866
  if (inputs.conductorMaterial === 'aluminum') mv *= ALUMINIUM_MV_RATIO;
  return mv;
}

function largestSize(): number {
  return STANDARD_METRIC_SIZES[STANDARD_METRIC_SIZES.length - 1];
}

/** Smallest size whose derated ampacity covers In / (Ca·Cg·Ci·Cc). Length-independent. */
function sizePassingThermal(inputs: CableSizingInputs): number {
  const itRequired =
    selectProtectiveDeviceRating(calculateDesignCurrent(inputs)) /
    Math.max(0.01, deratingProduct(inputs));
  for (const size of STANDARD_METRIC_SIZES) {
    let ampacity = BASE_AMPACITY_TABLE[inputs.installationMethod][size] ?? 0;
    if (inputs.conductorMaterial === 'aluminum') ampacity *= ALUMINIUM_AMPACITY_FACTOR;
    if (ampacity >= itRequired) return size;
  }
  return largestSize();
}

/** Smallest size whose volt drop stays inside the ceiling at `lengthMeters`. */
function sizePassingVoltageDrop(inputs: CableSizingInputs, lengthMeters: number): number {
  const ib = calculateDesignCurrent(inputs);
  const maxVolts = (Math.max(1, inputs.voltageVolts) * dropCeilingPercent(inputs)) / 100;
  for (const size of STANDARD_METRIC_SIZES) {
    if ((mvPerAmFor(size, inputs) * ib * lengthMeters) / 1000 <= maxVolts) return size;
  }
  return largestSize();
}

export function cableSizingCurve(
  inputs: CableSizingInputs,
  lengths: number[] = Array.from({ length: 40 }, (_, i) => (i + 1) * 3),
): CableSizingCurvePoint[] {
  const thermalMm2 = sizePassingThermal(inputs);

  return lengths.map((lengthMeters) => {
    const dropMm2 = sizePassingVoltageDrop(inputs, lengthMeters);
    const result = calculateCableSizing({ ...inputs, runLengthMeters: lengthMeters });
    return {
      lengthMeters,
      thermalMm2,
      dropMm2,
      selectedMm2: result.selectedCableMm2,
      limitingConstraint: result.limitingConstraint,
      vdropPercent: result.voltageDropPercent,
      dropGoverns: dropMm2 > thermalMm2,
    };
  });
}
