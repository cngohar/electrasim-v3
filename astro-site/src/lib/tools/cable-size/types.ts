/**
 * types.ts — Cable Size Calculator v2 types.
 *
 * The model is deliberately generic:
 *
 * ```text
 * SOURCE ──── CABLE ──── LOAD
 * 230 V       4 mm²      100 W
 * ```
 *
 * "Pole → house" is one possible *picture* of that run, never the concept, so
 * the load is a first-class, selectable input (lighting, fan, motor, heater,
 * appliance or custom) and the cable is the thing being sized.
 *
 * Everything here is data — no DOM, no React, no measurement. The scene
 * consumes the structured `CableSceneState` these types describe; it never
 * calculates anything itself.
 */

/** The kind of thing plugged into the end of the cable. */
export type LoadType = 'lighting' | 'fan' | 'motor' | 'heater' | 'appliance' | 'custom';

/** Scene variant drawn for a load. Mirrors `LoadType` one-to-one (§31). */
export type LoadSceneId = LoadType;

/** Single-phase AC or DC. Three-phase is out of scope for v1 (§5, §24). */
export type SystemType = 'ac' | 'dc';

/** Conductor material. Spelled the way electricians write it. */
export type ConductorMaterial = 'copper' | 'aluminium';

/**
 * Three-state verdict (§21):
 *
 * - `pass`       — inside the selected voltage-drop limit.
 * - `near-limit` — inside it, but with little headroom left.
 * - `fail`       — over the limit for this calculated condition.
 */
export type CableStatus = 'pass' | 'near-limit' | 'fail';

/** How the selected cable compares with the algorithmic recommendation (§12). */
export type SelectionVerdict = 'recommended' | 'oversized' | 'too-small' | 'unknown';

/** A selectable load. Presets are data, never literals inside a component (§31). */
export interface LoadPreset {
  id: LoadType;
  name: string;
  /** Chip sub-label, e.g. "100 W". */
  summary: string;
  /** The teaching line for an AC run. */
  note: string;
  /**
   * The teaching line for a DC run. Optional: a load whose physics is the same
   * on both (a heater, a custom demand) can simply omit it and the AC note is
   * used verbatim.
   */
  noteDc?: string;
  /** Default demand in watts. Ignored for `custom` (the user supplies it). */
  powerWatts: number;
  /** Displacement power factor used to turn watts into design current. */
  powerFactor: number;
  /** Which scene variant this load draws. */
  scene: LoadSceneId;
}

/** Everything the calculator needs to produce an answer. */
export interface CableSizeInputs {
  systemType: SystemType;
  /** Nominal source voltage in volts. */
  voltage: number;
  loadType: LoadType;
  /** Only read when `loadType === 'custom'`. */
  customPowerWatts: number;
  /** Only read when `loadType === 'custom'`. */
  customPowerFactor: number;
  material: ConductorMaterial;
  /** One-way cable length in metres. */
  lengthMeters: number;
  /**
   * Conductor temperature the resistance is corrected to, in °C. Copper and
   * aluminium gain about 0.4% of their resistance per kelvin, so a loaded run
   * drops measurably more than a cold one — 70 °C (the figure BS 7671's
   * voltage-drop tables assume for thermoplastic under load) is the default.
   */
  temperatureC: number;
  /** Selected voltage-drop limit, as a percentage of the source voltage. */
  dropLimitPercent: number;
  /** Candidate cross-sections to evaluate, in mm². */
  candidateSizes: number[];
  /** Cable the user is inspecting; `null` follows the recommendation. */
  selectedSizeMm2: number | null;
}

/** One candidate cross-section, evaluated against the run. */
export interface CandidateEvaluation {
  sizeMm2: number;
  voltageDropVolts: number;
  voltageDropPercent: number;
  /** Voltage actually arriving at the load. */
  voltageAtLoad: number;
  /** Round-trip loop resistance of the run, in ohms. */
  totalResistanceOhms: number;
  /** I²R loss in the cable, in watts. */
  powerLossWatts: number;
  /** Fraction of the selected limit used (1 = exactly at the limit). */
  limitUsage: number;
  status: CableStatus;
  passes: boolean;
}

/** Request shape for the low-level evaluator (§30). */
export interface EvaluateCableSizesRequest {
  voltage: number;
  /** Design current in amperes. */
  current: number;
  /** One-way length in metres. */
  length: number;
  material: ConductorMaterial;
  /** Voltage-drop limit as a percentage of the source voltage. */
  voltageDropLimit: number;
  candidateSizes?: readonly number[];
  systemType?: SystemType;
  powerFactor?: number;
  /** Conductor temperature for the resistivity correction, in °C. */
  temperatureC?: number;
}

/** Result shape for the low-level evaluator (§30). */
export interface EvaluateCableSizesResult {
  valid: boolean;
  errors: Record<string, string>;
  candidates: CandidateEvaluation[];
  /** Smallest passing candidate, or `null` when none passes (§12). */
  recommendedCable: CandidateEvaluation | null;
  voltageDropLimit: number;
  designCurrentAmps: number;
}

/** The full answer the UI renders from. */
export interface CableSizeEvaluation extends EvaluateCableSizesResult {
  /** Demand actually used, in watts. */
  loadPowerWatts: number;
  loadType: LoadType;
  material: ConductorMaterial;
  lengthMeters: number;
  /** Cable the user is inspecting (never changes the recommendation). */
  selected: CandidateEvaluation | null;
  selectedSizeMm2: number | null;
  /** How the inspected cable relates to the recommendation (§12). */
  selection: SelectionVerdict;
  /** Verdict of the *selected* cable. */
  status: CableStatus;
  dropLimitPercent: number;
}

/**
 * The structured state the scene is painted from (§17).
 *
 * The scene receives this. It does not calculate it.
 */
export interface CableSceneState {
  sourceVoltage: number;
  systemType: SystemType;
  loadType: LoadType;
  loadScene: LoadSceneId;
  loadPowerWatts: number;
  designCurrent: number;
  cableSize: number;
  material: ConductorMaterial;
  cableLength: number;
  voltageAtLoad: number;
  voltageDrop: number;
  voltageDropPercent: number;
  dropLimitPercent: number;
  status: CableStatus;
}

/** Controlled visual vocabulary derived from the scene state (§11, §14). */
export interface CableVisualState {
  /** Normalised 0–1 thickness position between the smallest/largest candidate. */
  thickness: number;
  /** Stroke width in SVG user units for the scene cable. */
  cableWidthPx: number;
  /** Seconds per current-flow pulse; lower is faster. */
  flowSeconds: number;
  /** 0–1 "electrical stress" used for cable glow. */
  stress: number;
  /**
   * Rotation period, in seconds, for a motor-driven load (fan, motor). A motor
   * turns slower on a low supply, so the scene can show the consequence of
   * volt drop instead of only printing it.
   */
  spinSeconds: number;
  /**
   * 0–1 share of the chosen voltage-drop limit spent by the selected cable —
   * the fill of the budget meter under the run (§20's numbers, drawn once).
   */
  budgetFill: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}
