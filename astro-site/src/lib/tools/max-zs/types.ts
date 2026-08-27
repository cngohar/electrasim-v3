/**
 * types.ts — Max Zs Disconnection Time Calculator Types
 * Based on BS 7671:2018+A4:2026 Tables 41.2, 41.3, 41.4 & IET Guidance Note 3
 */

export type ProtectiveDeviceType = 'mcb-b' | 'mcb-c' | 'mcb-d' | 'bs88' | 'bs1361' | 'rcd-30ma';
export type EarthArrangement = 'TN-C-S' | 'TN-S' | 'TT';

export interface MaxZsInputs {
  deviceType: ProtectiveDeviceType;
  ratingAmps: number;
  earthArrangement: EarthArrangement;
  zeCustomOhms?: number;
  runLengthMeters: number;
  lineCableMm2: number;
  cpcCableMm2?: number;
  operatingTempAdjusted: boolean; // 70°C multiplier (1.20)
}

export interface MaxZsResult {
  nominalVoltageU0: number;
  cMinFactor: number;
  deviceLabel: string;
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
