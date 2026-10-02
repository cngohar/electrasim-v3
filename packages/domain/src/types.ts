/**
 * Domain types — pure, framework-agnostic.
 *
 * No React, no DOM, no rendering concerns. These types are the contract
 * between the domain layer (simulation engine, circuit model) and every
 * other layer (state store, renderer, UI, workers, persistence).
 *
 * Keep this file dependency-free so it can be imported into a Web Worker
 * without dragging the rest of the app with it (PLAN.md §4 / §5).
 */

import type { ElectricalDeviceModel, ElectricalDiagnostic, ModelCoverage } from './core/contracts';
import type { SupplyProfile } from './core/supplies';

// ─── Geometry ──────────────────────────────────────────────────────────────

export interface Point2D {
  x: number;
  y: number;
}

/**
 * 2D position on the editor canvas. Identical shape to `Point2D` but kept
 * as a distinct type so component instances and pure geometry helpers can
 * evolve independently (e.g. components may later gain rotation while raw
 * points stay primitive).
 */
export interface Position {
  x: number;
  y: number;
}

// ─── Ports & component definitions (the "registry") ────────────────────────

export type PortType = 'live' | 'neutral' | 'earth';

export interface PortDef {
  type: PortType;
  /** Relative X within the component box, 0..1. */
  relX: number;
  /** Relative Y within the component box, 0..1. */
  relY: number;
  /** Short human-readable label shown by the renderer (e.g. "L-in", "COM"). */
  label: string;
}

export interface ComponentDef {
  /** Explicit electrical model override; catalogue metadata, never a saved state field. */
  electricalModel?: ElectricalDeviceModel;
  label: string;
  description?: string;
  category: string;

  // Behavioural flags consumed by the simulation engine.
  isSwitch?: boolean;
  isLoad?: boolean;
  isPassThrough?: boolean;
  isMomentary?: boolean;
  isSocket?: boolean;
  isDimmer?: boolean;
  isProtection?: boolean;
  isSource?: boolean;
  isJunction?: boolean;

  /** For switch-like components, whether they default to on (e.g. MCB). */
  defaultOn?: boolean;

  /** For source terminals, the supply rail kind. */
  sourceType?: PortType;

  /**
   * Optional single-pole changeover topology. `state.on` selects exactly one
   * throw, so the common port never fans out to both throws at once.
   */
  changeover?: {
    commonPortIndex: number;
    onPortIndex: number;
    offPortIndex: number;
  };

  /** Isolated switch poles. A closed pole joins only COM and its selected throw. */
  switchContacts?: { common: number; no: number; nc?: number }[];
  /** Coil terminal indices. Wiring either terminal enables ideal automatic coil control. */
  coilPorts?: readonly [number, number];
  ports: PortDef[];

  /** Tier level for filtering between Basic Student Mode and Pro Electrician Mode. */
  tier?: 'basic' | 'pro';
  /** Rated active power consumption in Watts (for loads) or current capacity (for supplies). */
  powerWatts?: number;
  /** Default maximum voltage rating before overvoltage blow (e.g. 250V for 230V components). */
  maxVolts?: number;
  /** Default maximum current rating in Amps before overcurrent blow. */
  maxAmps?: number;
  /** BS 7671 recommended minimum cable cross-section in mm² for domestic/commercial wiring. */
  recommendedCableMm2?: number;
  /** Professional compliance & regulations note (e.g. BS 7671 requirements). */
  proNotes?: string;

  /** For MCB/RCBO: trip curve type per IEC 60898-1 ('B', 'C', or 'D'). */
  mcbType?: 'B' | 'C' | 'D';

  /** For RCD/RCBO: rated residual leakage current in mA (e.g., 30, 100, 300). */
  ratedLeakage_mA?: number;

  /** Visual glyph (emoji today; richer SVG paths in later phases). */
  icon: string;

  /** Bulb animation type for different lighting technologies. */
  bulbAnimationType?: 'led' | 'cfl' | 'fluorescent' | 'incandescent' | 'halogen';
}

// ─── Runtime instances ─────────────────────────────────────────────────────

/**
 * Fault categories organizing the fault simulation system.
 */
export type FaultCategory =
  | 'conductor'
  | 'polarity'
  | 'earth'
  | 'protection'
  | 'component'
  | 'thermal'
  | 'voltage';

/**
 * Injected fault types — applied by the user in Fault Simulation Mode.
 *
 *  - `'open-circuit'`          — wire/component break; no current can pass.
 *  - `'short-circuit'`         — direct short between live and neutral/ground.
 *  - `'reverse-polarity'`      — live/neutral swapped at this component or wire.
 *  - `'earth-fault'`           — earth conductor missing or low impedance earth fault.
 *  - `'open-live'`             — live line conductor disconnected/broken.
 *  - `'open-neutral'`          — neutral return conductor disconnected/broken.
 *  - `'open-earth'`            — CPC earth conductor disconnected/broken.
 *  - `'terminal-disconnect'`   — loose/disconnected screw terminal on a specific port.
 *  - `'switched-neutral'`      — switch installed on neutral line instead of live (BS 7671 violation).
 *  - `'live-to-earth'`         — insulation breakdown from live to earth/chassis.
 *  - `'protection-forced-open'`— breaker/fuse stuck in open position.
 *  - `'protection-bypass'`     — protective device bypassed/bridged.
 */
export type FaultType =
  | 'open-circuit'
  | 'short-circuit'
  | 'reverse-polarity'
  | 'earth-fault'
  | 'open-live'
  | 'open-neutral'
  | 'open-earth'
  | 'terminal-disconnect'
  | 'switched-neutral'
  | 'live-to-earth'
  | 'smooth-dc-residual'
  | 'arc-fault'
  | 'protection-forced-open'
  | 'protection-bypass';

/**
 * Residual-current device classification (BS 7671 Reg 531.3.3 selects by
 * the fault-current waveforms the load may produce):
 * - `'AC'` sinusoidal AC residual only (applicability depends on equipment and local rules)
 * - `'A'`  AC + pulsating DC; tolerates ≤6 mA smooth DC, does not detect it
 * - `'F'`  Type A + mixed/high frequency; tolerates ≤10 mA smooth DC
 * - `'B'`  all-current-sensitive — also detects smooth DC (BS EN 62423)
 */
export type RCDType = 'AC' | 'A' | 'F' | 'B';

/**
 * Fault kinds that can be mirrored onto the legacy per-wire `fault` field.
 * The modern `InjectedFault` pipeline accepts any `FaultType`, but only
 * these conductor-level kinds are meaningful on a physical conductor run.
 */
export type WireFaultType = Extract<
  FaultType,
  'open-circuit' | 'open-neutral' | 'short-circuit' | 'live-to-earth'
>;

export type FaultTargetType = 'component' | 'wire' | 'port';

export type FaultTarget =
  | { type: 'component'; id: string }
  | { type: 'wire'; id: string }
  | { type: 'port'; componentId: string; portIndex: number };

export interface FaultDefinition {
  id: FaultType;
  label: string;
  category: FaultCategory;
  targetType: 'component' | 'wire' | 'port' | 'any';
  description: string;
  simulationEffect: string;
  detectionBehavior: string;
  repairBehavior: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  standardReference?: string;
  icon?: string;
  allowedWithOtherFaults?: boolean;
}

export interface InjectedFault {
  id: string;
  type: FaultType;
  category: FaultCategory;
  target: FaultTarget;
  parameters?: Record<string, unknown>;
  createdAt: number;
  resolved?: boolean;
  resolvedReason?: string;
}

export interface FaultDiagnostic {
  id: string;
  faultId?: string;
  type: FaultType | string;
  category: FaultCategory;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  affectedComponents: string[];
  affectedWires: string[];
  affectedPorts?: { componentId: string; portIndex: number }[];
  reason: string;
  resolutionHint: string;
  isResolved?: boolean;
  standardReference?: string;
}

export interface ComponentState {
  /** Versioned source configuration. Valid only on declared supply interfaces. */
  sourceProfile?: SupplyProfile;
  /** Manual open/closed state for switch-like and protection components. */
  on?: boolean;
  /** Dimmer / fan speed level (0..N). */
  speed?: number;
  /** Computed by the simulation engine each tick — UI mirrors this. */
  energized?: boolean;
  /** Rotational animation angle for spinning loads (fans, motors). */
  animAngle?: number;
  /**
   * Fault injected by the user in Fault Simulation Mode.
   * Undefined = healthy component.
   */
  fault?: FaultType;

  /** Pro Mode Customizations: */
  /** Custom supply voltage in Volts (for source terminals). */
  customVoltage?: number;
  /** Custom active power rating in Watts (for loads). */
  customPowerWatts?: number;
  /** Custom max current threshold in Amps before overcurrent/overload. */
  customMaxAmps?: number;
  /** Custom max voltage threshold in Volts before overvoltage blow. */
  customMaxVolts?: number;
  /** Custom cable cross-section in mm² (e.g. 1.0, 1.5, 2.5, 4.0, 6.0, 10.0, 16.0). */
  customCableMm2?: number;

  /** Overload / overvoltage / overcurrent blown status (Pro Mode simulation). */
  isBlown?: boolean;
  blownReason?: 'overvoltage' | 'overcurrent' | 'overload';

  /** Protection device tripped status (for breakers/fuses). */
  isTripped?: boolean;
  tripReason?: 'overload' | 'short-circuit' | 'ground-fault' | 'arc-fault' | 'manual-fault';

  /**
   * Residual-current classification on RCD/RCBO devices (default `'A'`).
   * Only `'B'` trips on `smooth-dc-residual` faults; AC/A/F are blind to the
   * DC component (BS EN 62423 tolerance 6 mA for A, 10 mA for F).
   */
  rcdType?: RCDType;

  /** Battery chemistry affecting internal resistance and discharge curve. */
  batteryChemistry?: 'alkaline' | 'li-ion' | 'lead-acid';

  /** Component grouping for complex circuit management. */
  groupId?: string;

  /** Auto-generated label for component organization. */
  autoLabel?: string;
}

export interface ComponentInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation?: number;
  state: ComponentState;
}

/**
 * How a wire's path is drawn between its two endpoints.
 *
 * - `bezier` — smooth cubic Bezier curve (legacy default; what every wire
 *   created before Phase 6.2 uses).
 * - `orthogonal` — Manhattan-style right-angle path computed automatically
 *   from current endpoints + nearby components (Phase 6.2 "Smart routing").
 *
 * Stored on the wire itself so existing bezier circuits keep their look
 * after the smart-routing default flips on (PLAN.md §8.2 SR1 — additive
 * coexistence). New wires take the user's `settingsStore.routingStyle`.
 */
export type WirePathKind = 'bezier' | 'orthogonal';

/**
 * BS 7671 Appendix 4 installation Reference Methods supported by the sim:
 * - `'C'`  clipped direct to a surface (best case, the default)
 * - `'B1'` enclosed in conduit on a wall
 * - `'A'`  enclosed in conduit inside thermal insulation (worst case)
 * Lower methods carry less current for the same conductor size.
 */
export type InstallationMethod = 'C' | 'B1' | 'A';

export interface WireInstance {
  id: string;
  fromComponentId: string;
  fromPortIndex: number;
  toComponentId: string;
  toPortIndex: number;
  /**
   * Optional intermediate routing waypoints. For bezier wires these are
   * user-placed control points; for orthogonal wires they are corner
   * vertices of a hand-drawn polyline (Phase 7 custom wiring). When empty
   * (the common case for orthogonal wires), the renderer recomputes the
   * path on every frame from the current endpoints + obstacles.
   */
  controlPoints: Point2D[];
  /**
   * Path drawing style. Optional for back-compat — saved JSON written
   * before Phase 6.2 has no `pathKind` and is treated as `bezier`.
   */
  pathKind?: WirePathKind;
  /**
   * Fault injected by the user in Fault Simulation Mode.
   * `'open-circuit'` = wire break; the BFS skips this wire entirely.
   * `'open-neutral'` = broken neutral return on this run.
   * `'short-circuit'` = wire short circuit.
   * `'live-to-earth'` = insulation breakdown leaking live to earth.
   */
  fault?: WireFaultType;
  /** Optional one-way cable run length used for voltage-drop calculations. */
  lengthMeters?: number;
  /** Optional installation derating factor, from 0.1 to 1. */
  deratingFactor?: number;
  /** Optional custom cross-section gauge in mm² (e.g. 1.0, 1.5, 2.5, 4.0, 6.0, 10.0, 16.0). */
  customCableMm2?: number;
  /**
   * BS 7671 installation Reference Method for base ampacity (default `'C'`).
   * Multiplied with {@link deratingFactor} (Cg grouping/ambient) by callers.
   */
  installationMethod?: InstallationMethod;
  /** True if wire was melted/busted due to severe current overload without protection. */
  isBusted?: boolean;
  bustedReason?: string;
  /** Wire conductor material affecting resistance and ampacity. */
  material?: 'copper' | 'aluminum';
  /** Wire gauge in AWG or mm² for ampacity calculations. */
  gauge?: number;
}

/** A reference to a specific port on a specific component instance. */
export interface PortRef {
  componentId: string;
  portIndex: number;
}

/** Top-level model handed to the simulation engine. */
export interface Circuit {
  components: ComponentInstance[];
  wires: WireInstance[];
  /** Named document supply/default; independent source blocks retain their own profiles. */
  supply?: SupplyProfile;
  /** Legacy voltage mirror. New documents use supply; retained for old consumers. */
  globalVoltage?: number;
  /** Active user-injected faults (Fault Simulation System). */
  faults?: InjectedFault[];
}

// ─── Simulation output ─────────────────────────────────────────────────────

export interface ElectricalWireCalculation {
  currentAmps: number;
  cableMm2: number;
  lengthMeters: number;
  ampacityAmps: number;
  deratedAmpacityAmps: number;
  resistanceOhms: number;
  voltageDropVolts: number;
  voltageDropPercent: number;
  status: 'pass' | 'warning' | 'fail';
  message: string;
}

export interface SimulationLimitation {
  code:
    | 'transformer-model'
    | 'dc-source-model'
    | 'three-phase-model'
    | 'independent-source-model'
    | 'timing-model'
    | 'dimming-model';
  componentId: string;
  message: string;
  /** No trustworthy electrical result can be produced for this circuit. */
  blocking: boolean;
}

export interface SimulationResult {
  /** Additive migration metadata. Legacy rail results remain estimates until 1.5F. */
  electricalContract?: {
    version: 1;
    engineVersion: string;
    modelVersion: string;
    status: 'invalid' | 'estimated' | 'not-assessed';
    coverage: ModelCoverage[];
    diagnostics: ElectricalDiagnostic[];
  };
  /** Explicit model gaps; blocking gaps suppress electrical telemetry and effects. */
  modelLimitations?: SimulationLimitation[];
  /** Derived coil operation; never persisted into the manual switch state. */
  coilStates?: Record<string, boolean>;
  /** Components reached by both Live and Neutral traversals, including loads and pass-throughs. */
  energizedComponents: Set<string>;
  /** Wires that carry current in either the Live or Neutral subgraphs. */
  energizedWires: Set<string>;
  /** Components flagged as faulty (e.g. short-circuited). */
  errorComponents: Set<string>;
  /** Wires touching a faulty component. */
  errorWires: Set<string>;
  /** Human-readable errors for the log panel. */
  errors: string[];
  /** Human-readable warnings for the log panel. */
  warnings: string[];
  /**
   * Indices into `errors` that name an injected fault outright (e.g. "TERMINAL
   * DISCONNECT: ..."). Diagnosis mode hides these so the console cannot hand
   * the learner the answer they are being asked to work out; the consequence
   * messages ("MCB tripped", "voltage mismatch") stay visible. See §14.
   */
  faultNarrationErrors?: number[];
  /** Indices into `warnings` that name an injected fault outright. */
  faultNarrationWarnings?: number[];
  /** Structured diagnostics for all active/detected faults. */
  faultDiagnostics?: FaultDiagnostic[];
  /** All active injected faults evaluated in this simulation run. */
  activeInjectedFaults?: InjectedFault[];
  /** Mode-independent modeled damage, including operated fuse links. Resettable trips are separate. */
  blownComponents?: { id: string; reason: 'overvoltage' | 'overcurrent' | 'overload' }[];
  /** Wires where load current exceeds cable gauge capacity (Pro Mode). */
  overloadedWires?: Set<string>;
  /** Calculated effective supply voltage level in Volts. */
  supplyVoltage?: number;
  /** Map of wire ID to heating ratio (current / capacity) */
  wireHeatRatios?: Record<string, number>;
  /** Detailed cable sizing and voltage-drop calculations by wire. */
  wireCalculations?: Record<string, ElectricalWireCalculation>;
  /** Wires that melted/busted due to severe overload without protection */
  bustedWires?: Set<string>;
  /** Protection devices that tripped in this simulation pass */
  trippedComponents?: {
    id: string;
    label: string;
    /**
     * Machine-readable cause, matching {@link ComponentState.tripReason}.
     *
     * Kept separate from {@link reason}: the overcurrent branch puts a full
     * sentence in `reason`, and that string was being written straight into
     * `state.tripReason`, producing a circuit that failed its own import
     * validation on export/re-import.
     */
    cause: 'overload' | 'short-circuit' | 'ground-fault' | 'arc-fault';
    /** Human-readable explanation shown in the fault alert. */
    reason: string;
    currentAmps: number;
    ratingAmps: number;
    /**
     * Standards-derived clearing time in seconds, where the operating
     * mechanism has a defined one:
     *   - MCB/RCBO overload → IEC 60898-1 time–current curve
     *   - MCB/RCBO short circuit → instantaneous magnetic band
     *   - RCD/RCBO earth leakage → IEC 61008-1 maximum break time
     * Omitted for mechanisms the engine does not time (e.g. arc detection).
     */
    clearingTimeSeconds?: number;
    /** Which mechanism operated — drives the UI's explanation of *why*. */
    mechanism?: 'thermal' | 'magnetic' | 'residual' | 'arc';
    /** I/In for overcurrent trips; I/IΔn for residual trips. */
    currentMultiple?: number;
  }[];
  /** Wire melt/busted events in this simulation pass */
  wireMeltEvents?: {
    wireId: string;
    currentAmps: number;
    capacityAmps: number;
    cableMm2: number;
  }[];
  /**
   * True when the last simulation pass produced no error-level findings.
   * Gates pro-mode breaker resets — a tripped device may only be reset
   * once the underlying circuit fault has been cleared.
   */
  faultsCleared?: boolean;
  /** Thermal data for each component based on power dissipation. */
  thermalData?: Record<string, ThermalComponentData>;
  /** Live calculation metrics for active components */
  componentCalculations?: Record<
    string,
    {
      voltage?: number;
      currentAmps?: number;
      powerWatts?: number;
    }
  >;
}

export interface ThermalComponentData {
  componentId?: string;
  powerWatts: number;
  temperature: number;
  maxTemperature: number;
  colorCode: string;
  status?: 'normal' | 'warm' | 'hot' | 'critical';
}

// ─── Component Groups ──────────────────────────────────────────────────────

/** A group of components that can be moved together as a single block. */
export interface ComponentGroup {
  id: string;
  name: string;
  componentIds: string[];
  position: { x: number; y: number };
}

// ─── Logs (UI concern but the engine emits structured entries) ─────────────

export type LogLevel = 'error' | 'warning' | 'success' | 'info';

export interface LogEntry {
  id: string;
  type: LogLevel;
  message: string;
}

// ─── Interaction modes (UI layer; lives here only because legacy
//     code relies on it — will move to /store in Phase 2) ────────────────────

export type InteractionMode = 'idle' | 'wiring' | 'dragging' | 'deleting' | 'panning' | 'placing';
