import type { MetricStandardId } from '../standards';

export type SystemType = 'dc' | 'single' | 'three';
export type ConductorMaterial = 'copper' | 'aluminum';
export type VoltageDropSeverity = 'good' | 'warning' | 'excessive';

/** Re-exported so consumers can type against the metric standard set. */
export type VoltageDropStandard = MetricStandardId;

export interface MaterialProperties {
  rho20: number; // resistivity at 20°C in Ω·mm²/m
  alpha: number; // temperature coefficient per °C
}

export interface VoltageDropInputs {
  systemType: SystemType;
  voltage: number; // Volts
  current: number; // Amperes
  length: number; // One-way meters
  size: number; // mm²
  material: ConductorMaterial;
  powerFactor?: number; // 0.1 to 1.0 (default 1.0 / 0.92 for AC)
  temperature?: number; // °C (default 20°C)
  includeReactance?: boolean; // include line reactance
  /**
   * Compliance standard for severity banding and status copy.
   * Physics is identical (resistivity-based); only the limit thresholds and
   * citations change. Defaults to 'uk-bs7671'.
   */
  standard?: MetricStandardId;
}

export interface VoltageDropResult {
  valid: boolean;
  systemType: SystemType;
  sourceVoltage: number; // V
  loadCurrent: number; // A
  cableLengthOneWay: number; // m
  cableLengthRoundTrip: number; // m
  cableSize: number; // mm²
  material: ConductorMaterial;
  resistancePerMeter: number; // Ω/m
  totalResistance: number; // Ω
  voltageDrop: number; // V
  voltageDropPercent: number; // %
  voltageAtLoad: number; // V
  powerLoss: number; // W
  severity: VoltageDropSeverity;
  statusTitle: string;
  statusDescription: string;
  /** Standard used for limit banding, e.g. "BS 7671:2018+A4:2026" */
  standardLabel: string;
  /** Citation for the limits that were applied (trust / E-E-A-T) */
  standardCitation: string;
  errorMessage?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
