/**
 * types.ts — Max Zs Disconnection Time Calculator Types
 * Based on BS 7671:2018+A4:2026 Tables 41.2, 41.3, 41.4 & IET Guidance Note 3,
 * with an IEC 60364-4-41 / 60364-6 mode for international metric users.
 */

import type { MetricStandardId } from '../standards';

export type ProtectiveDeviceType = 'mcb-b' | 'mcb-c' | 'mcb-d' | 'bs88' | 'bs1361' | 'rcd-30ma';
export type EarthArrangement = 'TN-C-S' | 'TN-S' | 'TT';

/** Re-exported for consumers: Zs verification supports BS 7671 and IEC 60364. */
export type MaxZsStandard = MetricStandardId;

export interface MaxZsInputs {
  deviceType: ProtectiveDeviceType;
  ratingAmps: number;
  earthArrangement: EarthArrangement;
  zeCustomOhms?: number;
  runLengthMeters: number;
  lineCableMm2: number;
  cpcCableMm2?: number;
  operatingTempAdjusted: boolean; // 70°C multiplier (1.20)
  /**
   * 'uk-bs7671' (default): tabulated Cmin-corrected values (Tables 41.2–41.4)
   * with the IET GN3 80% cold-test rule.
   * 'iec-60364': formula values Zs·Ia ≤ U0 per IEC 60364-4-41 with the
   * IEC 60364-6 ≈2/3 ambient-measurement guidance instead of the 80% rule.
   */
  standard?: MetricStandardId;
}

export interface MaxZsResult {
  nominalVoltageU0: number;
  cMinFactor: number;
  deviceLabel: string;
  /** Standard used, e.g. "BS 7671:2018+A4:2026" */
  standardLabel: string;
  /** Full citation of the rules applied (trust / E-E-A-T) */
  standardCitation: string;
  /** Label of the cold/ambient measurement rule applied (GN3 80% or IEC ⅔) */
  coldRuleLabel: string;
  ratingAmps: number;
  disconnectionTimeSec: number;
  maxZsOhms: number;
  coldRuleLimitOhms: number; // 80% rule
  zeOhms: number;
  r1OhmsPerMetre: number;
  r2OhmsPerMetre: number;
  r1r2TotalOhms: number;
  calculatedZsOhms: number;
  prospectiveFaultCurrentAmps: number;
  passHot: boolean;
  passCold: boolean;
  status: 'pass' | 'warning' | 'fail';
  summary: string;
  recommendations: string[];
}
