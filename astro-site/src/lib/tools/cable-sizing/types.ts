/**
 * types.ts — Cable Sizing Tool Types
 * Based on BS 7671:2018+A3:2024 / IEC 60364
 */

export type SupplyPhaseType = 'single-phase' | 'three-phase' | 'dc';
export type CircuitFunction = 'lighting' | 'power';
export type InstallationMethod = 'A' | 'B' | 'C' | 'D' | 'E';
export type ConductorMaterial = 'copper' | 'aluminum';

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
}
