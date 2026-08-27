/**
 * calculation.ts — Max Zs & Disconnection Time Engine
 * Standards basis: BS 7671:2018+A4:2026 Tables 41.2–41.4 & IET Guidance Note 3
 */

import type { EarthArrangement, MaxZsInputs, MaxZsResult, ProtectiveDeviceType } from './types';

export const ZS_U0 = 230;
export const ZS_CMIN = 0.95;
export const GN3_COLD_FACTOR = 0.8; // 80% rule

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
  const table = MAX_ZS_TABLE[inputs.deviceType] || MAX_ZS_TABLE['mcb-b'];
  const maxZs =
    table[inputs.ratingAmps] ??
    (ZS_U0 * ZS_CMIN) /
      (inputs.deviceType === 'mcb-d'
        ? 20 * inputs.ratingAmps
        : inputs.deviceType === 'mcb-c'
          ? 10 * inputs.ratingAmps
          : 5 * inputs.ratingAmps);

  const coldRuleLimit = maxZs * GN3_COLD_FACTOR;

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
  const pfc = (ZS_U0 * ZS_CMIN) / Math.max(0.01, calculatedZs);

  const passHot = calculatedZs <= maxZs;
  const passCold = calculatedZs <= coldRuleLimit;

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
      `Zs (${calculatedZs.toFixed(2)} Ω) meets hot limit (${maxZs.toFixed(2)} Ω) but exceeds the 80% Rule cold test limit (${coldRuleLimit.toFixed(2)} Ω per IET GN3).`,
    );
    recommendations.push(
      'When conductors heat up to 70°C operating temperature under full load, Zs may drift beyond compliance.',
    );
  } else {
    recommendations.push(
      `Compliant: Measured/designed Zs (${calculatedZs.toFixed(2)} Ω) is within both the 80% test rule (${coldRuleLimit.toFixed(2)} Ω) and maximum disconnection limit (${maxZs.toFixed(2)} Ω).`,
    );
  }

  const summary =
    status === 'pass'
      ? `Compliant: Zs of ${calculatedZs.toFixed(2)} Ω guarantees 0.4s disconnection for a ${inputs.ratingAmps}A ${inputs.deviceType.toUpperCase()} device.`
      : status === 'warning'
        ? `Marginal: Zs (${calculatedZs.toFixed(2)} Ω) exceeds the cold 80% test limit (${coldRuleLimit.toFixed(2)} Ω). Check conductor operating temperature.`
        : `Fail: Zs (${calculatedZs.toFixed(2)} Ω) exceeds maximum limit (${maxZs.toFixed(2)} Ω). Automatic disconnection will not operate in 0.4s.`;

  return {
    nominalVoltageU0: ZS_U0,
    cMinFactor: ZS_CMIN,
    deviceLabel: getDeviceLabel(inputs.deviceType),
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
