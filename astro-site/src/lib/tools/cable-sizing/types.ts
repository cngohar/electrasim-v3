/**
 * types.ts — Cable Sizing Tool Types
 * Based on BS 7671:2018+A3:2024 / IEC 60364
 */

import type { MetricStandardId } from '../standards';

export type SupplyPhaseType = 'single-phase' | 'three-phase' | 'dc';
export type CircuitFunction = 'lighting' | 'power';
export type InstallationMethod = 'A' | 'B' | 'C' | 'D' | 'E';
export type ConductorMaterial = 'copper' | 'aluminum';

/** Re-exported for consumers: metric sizing supports BS 7671 and IEC 60364. */
export type CableSizingStandard = MetricStandardId;

export interface CableSizingInputs {
  systemType: SupplyPhaseType;
  voltageVolts: number;
  /** Either power in Watts OR design current in Amps */
  powerWatts?: number;
  currentAmps?: number;
  powerFactor: number;
  runLengthMeters: number;
  circuitFunction: CircuitFunction;
  installationMethod: InstallationMethod;
  conductorMaterial: ConductorMaterial;
  ambientTempC: number;
  groupingCircuits: number;
  thermalInsulationMm: 0 | 50 | 100 | 200;
  fuseTypeCc: boolean; // Semi-enclosed rewireable fuse (BS 3036) factor 0.725
  /**
   * Compliance standard. Ampacity/drop tables are harmonized between
   * BS 7671 Appendix 4 and IEC 60364-5-52; the standard selects the voltage
   * drop limit banding (both 3%/5% for public supplies, with IEC adding the
   * 6%/8% private-supply and >100 m allowances) and result citations.
   * Defaults to 'uk-bs7671'.
   */
  standard?: MetricStandardId;
}

export interface CorrectionFactors {
  ca: number; // Ambient temperature
  cg: number; // Grouping
  ci: number; // Thermal insulation
  cc: number; // BS 3036 fuse
  totalDerating: number;
}

export interface CableSizingResult {
  designCurrentIb: number;
  protectiveDeviceRatingIn: number;
  correctionFactors: CorrectionFactors;
  requiredAmpacityIt: number;
  selectedCableMm2: number;
  cableAmpacityIz: number;
  cpcCableMm2: number;
  voltageDropVolts: number;
  voltageDropPercent: number;
  maxPermissibleVdropPercent: number;
  voltageDropPass: boolean;
  thermalPass: boolean;
  limitingConstraint: 'thermal' | 'voltage-drop';
  status: 'pass' | 'warning' | 'fail';
  summary: string;
  /** Standard used for limits/citations, e.g. "BS 7671:2018+A4:2026" */
  standardLabel: string;
  /** Full citation of the rules applied */
  standardCitation: string;
}
