/**
 * calculation.ts — Max Zs & Disconnection Time Engine
 * Standards basis:
 *  - uk-bs7671 (default): BS 7671:2018+A4:2026 Tables 41.2–41.4 (Cmin-corrected)
 *    with the IET Guidance Note 3 "80% rule" for cold/ambient testing.
 *  - iec-60364: IEC 60364-4-41 fault protection (Zs × Ia ≤ U0, no Cmin factor)
 *    with IEC 60364-6 guidance that ambient-temperature measurements should stay
 *    within ≈⅔ of the operating-temperature limit.
 */

import { type MetricStandardId, STANDARD_PROFILES } from '../standards';
import type { EarthArrangement, MaxZsInputs, MaxZsResult, ProtectiveDeviceType } from './types';

export const ZS_U0 = 230;
export const ZS_CMIN = 0.95;
export const GN3_COLD_FACTOR = 0.8; // 80% rule

/** Ambient/cold measurement limits per standard */
export const COLD_RULE_FACTORS: Record<MetricStandardId, { factor: number; label: string }> = {
  'uk-bs7671': { factor: 0.8, label: 'IET GN3 80% test rule' },
  'iec-60364': {
    factor: 2 / 3,
    label: 'IEC 60364-6 ≈⅔ rule (ambient-temperature measurement)',
  },
};

export const ZE_TYPICAL_MAX: Record<EarthArrangement, number> = {
  'TN-C-S': 0.35,
  'TN-S': 0.8,
  TT: 21.0,
};

/** BS 7671 Table 41.3: Cmin-corrected maximum Zs (Ohms) for 0.4s disconnection at 230V */
export const MAX_ZS_TABLE: Record<ProtectiveDeviceType, Record<number, number>> = {
  'mcb-b': {
    6: 7.28,
    10: 4.37,
    16: 2.73,
    20: 2.19,
    25: 1.75,
    32: 1.37,
    40: 1.09,
    50: 0.87,
    63: 0.69,
  },
  'mcb-c': {
    6: 3.64,
    10: 2.19,
    16: 1.37,
    20: 1.09,
    25: 0.87,
    32: 0.68,
    40: 0.55,
    50: 0.44,
    63: 0.35,
  },
  'mcb-d': {
    6: 1.82,
    10: 1.09,
    16: 0.68,
    20: 0.55,
    25: 0.44,
    32: 0.34,
    40: 0.27,
    50: 0.22,
    63: 0.17,
  },
  bs88: {
    6: 8.5,
    10: 4.9,
    16: 2.65,
    20: 1.88,
    25: 1.43,
    32: 1.04,
    40: 0.77,
    50: 0.57,
    63: 0.42,
  },
  bs1361: {
    5: 10.45,
    15: 3.28,
    20: 1.7,
    30: 1.15,
    45: 0.6,
    60: 0.38,
  },
  'rcd-30ma': {
    6: 1667,
    10: 1667,
    16: 1667,
    20: 1667,
    25: 1667,
    32: 1667,
    40: 1667,
    50: 1667,
    63: 1667,
  },
};

/** Resistance of copper conductors at 20°C in mΩ/m (On-Site Guide Table I1) */
export const COPPER_MOHM_PER_M: Record<number, number> = {
  1.0: 18.1,
  1.5: 12.1,
  2.5: 7.41,
  4.0: 4.61,
  6.0: 3.08,
  10.0: 1.83,
  16.0: 1.15,
  25.0: 0.727,
};

/** Standard CPC sizes for BS 6004 70°C flat twin with earth */
export const DEFAULT_CPC_PAIRS: Record<number, number> = {
  1.0: 1.0,
  1.5: 1.0,
  2.5: 1.5,
  4.0: 1.5,
  6.0: 2.5,
  10.0: 4.0,
  16.0: 6.0,
  25.0: 10.0,
};

export function getDeviceLabel(type: ProtectiveDeviceType): string {
  switch (type) {
    case 'mcb-b':
      return 'Type B MCB / RCBO (BS EN 60898 / 61009)';
    case 'mcb-c':
      return 'Type C MCB / RCBO (BS EN 60898 / 61009)';
    case 'mcb-d':
      return 'Type D MCB / RCBO (BS EN 60898 / 61009)';
    case 'bs88':
      return 'BS 88-2 / BS 88-6 Cartridge Fuse';
    case 'bs1361':
      return 'BS 1361 Cartridge Fuse';
    case 'rcd-30ma':
      return '30mA RCD / RCBO Residual Protection';
  }
}

export function calculateMaxZs(inputs: MaxZsInputs): MaxZsResult {
  const standardId: MetricStandardId = inputs.standard === 'iec-60364' ? 'iec-60364' : 'uk-bs7671';
  const standard = STANDARD_PROFILES[standardId];

  const table = MAX_ZS_TABLE[inputs.deviceType] || MAX_ZS_TABLE['mcb-b'];

  /** Ia — current causing automatic disconnection within the required time */
  const tableValue = table[inputs.ratingAmps];
  const resolveIa = (): number => {
    if (inputs.deviceType === 'mcb-d') return 20 * inputs.ratingAmps;
    if (inputs.deviceType === 'mcb-c') return 10 * inputs.ratingAmps;
    if (inputs.deviceType === 'mcb-b') return 5 * inputs.ratingAmps;
    // Fuses/RCDs: recover Ia from the tabulated Cmin-corrected value; fall
    // back to the generic 5×In approximation for non-tabulated ratings.
    if (typeof tableValue === 'number' && tableValue > 0) {
      return (ZS_U0 * ZS_CMIN) / tableValue;
    }
    return 5 * inputs.ratingAmps;
  };

  let maxZs: number;
  if (standardId === 'uk-bs7671') {
    // Tabulated Cmin-corrected values (Tables 41.2–41.4); formula fallback for
    // non-tabulated ratings.
    maxZs = tableValue ?? (ZS_U0 * ZS_CMIN) / resolveIa();
  } else {
    // IEC 60364-4-41 publishes the relationship Zs × Ia ≤ U0 directly (no
    // Cmin correction), so tabulated UK values are de-corrected by ÷0.95.
    // Exception: RCD limits derive from the 50 V touch-voltage ceiling
    // (50 V / IΔn), not from U0 × Cmin — identical under both standards.
    if (inputs.deviceType === 'rcd-30ma') {
      maxZs = tableValue ?? 50 / 0.03; // 50 V touch voltage ÷ 30 mA trip
    } else {
      maxZs = tableValue ? tableValue / ZS_CMIN : ZS_U0 / resolveIa();
    }
  }

  const coldRule = COLD_RULE_FACTORS[standardId];
  const coldRuleLimit = maxZs * coldRule.factor;

  const ze =
    typeof inputs.zeCustomOhms === 'number' && inputs.zeCustomOhms >= 0
      ? inputs.zeCustomOhms
      : ZE_TYPICAL_MAX[inputs.earthArrangement];

  const lineMmohm = COPPER_MOHM_PER_M[inputs.lineCableMm2] ?? 18.1 / inputs.lineCableMm2;
  const cpcSize = inputs.cpcCableMm2 ?? DEFAULT_CPC_PAIRS[inputs.lineCableMm2] ?? 1.5;
  const cpcMmohm = COPPER_MOHM_PER_M[cpcSize] ?? 18.1 / cpcSize;

  // Temperature multiplier: at 70°C conductor operating temperature, resistance increases ~1.20×
  const tempFactor = inputs.operatingTempAdjusted ? 1.2 : 1.0;
  const r1r2PerMetreOhms = ((lineMmohm + cpcMmohm) / 1000) * tempFactor;
  const r1r2Total = r1r2PerMetreOhms * inputs.runLengthMeters;

  const calculatedZs = ze + r1r2Total;
  const cMinApplied = standardId === 'uk-bs7671' ? ZS_CMIN : 1.0;
  const pfc = (ZS_U0 * cMinApplied) / Math.max(0.01, calculatedZs);

  const passHot = calculatedZs <= maxZs;
  const passCold = calculatedZs <= coldRuleLimit;

  const coldPct = Math.round(coldRule.factor * 100);

  let status: 'pass' | 'warning' | 'fail' = 'pass';
  const recommendations: string[] = [];

  if (!passHot) {
    status = 'fail';
    recommendations.push(
      `Zs (${calculatedZs.toFixed(2)} Ω) exceeds maximum limit (${maxZs.toFixed(2)} Ω). Disconnection within 0.4s cannot be guaranteed.`,
    );
    recommendations.push(
      'Remediation: Increase CPC cable cross-section (e.g. separate single CPC), shorten run length, or install a 30mA RCD/RCBO.',
    );
  } else if (!passCold) {
    status = 'warning';
    recommendations.push(
      `Zs (${calculatedZs.toFixed(2)} Ω) meets the operating-temperature limit (${maxZs.toFixed(2)} Ω) but exceeds the ambient-measurement limit (${coldRuleLimit.toFixed(2)} Ω — ${coldRule.label}).`,
    );
    recommendations.push(
      'When conductors heat up to 70°C operating temperature under full load, Zs may drift beyond compliance.',
    );
  } else {
    recommendations.push(
      `Compliant: Measured/designed Zs (${calculatedZs.toFixed(2)} Ω) is within both the ${coldRule.label} (${coldRuleLimit.toFixed(2)} Ω) and maximum disconnection limit (${maxZs.toFixed(2)} Ω).`,
    );
  }

  const summary =
    status === 'pass'
      ? `Compliant: Zs of ${calculatedZs.toFixed(2)} Ω guarantees 0.4s disconnection for a ${inputs.ratingAmps}A ${inputs.deviceType.toUpperCase()} device per ${standard.label}.`
      : status === 'warning'
        ? `Marginal: Zs (${calculatedZs.toFixed(2)} Ω) exceeds the ambient measurement limit (${coldRuleLimit.toFixed(2)} Ω — ${coldPct}% rule). Check conductor operating temperature.`
        : `Fail: Zs (${calculatedZs.toFixed(2)} Ω) exceeds maximum limit (${maxZs.toFixed(2)} Ω). Automatic disconnection will not operate in 0.4s.`;

  return {
    nominalVoltageU0: ZS_U0,
    cMinFactor: cMinApplied,
    deviceLabel: getDeviceLabel(inputs.deviceType),
    standardLabel: standard.label,
    standardCitation: standard.citation,
    coldRuleLabel: coldRule.label,
    ratingAmps: inputs.ratingAmps,
    disconnectionTimeSec: 0.4,
    maxZsOhms: maxZs,
    coldRuleLimitOhms: coldRuleLimit,
    zeOhms: ze,
    r1OhmsPerMetre: (lineMmohm / 1000) * tempFactor,
    r2OhmsPerMetre: (cpcMmohm / 1000) * tempFactor,
    r1r2TotalOhms: r1r2Total,
    calculatedZsOhms: calculatedZs,
    prospectiveFaultCurrentAmps: pfc,
    passHot,
    passCold,
    status,
    summary,
    recommendations,
  };
}
