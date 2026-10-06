/** Electrical contracts, independent of saved drawings, membership and rendering. */
import type {
  Circuit,
  ComponentDef,
  FaultTarget,
  FaultType,
  InstallationMethod,
  PortRef,
} from '../types';
import type { CoilModel } from './coilModel';
import type { DamageModel, DamageTarget } from './damageModel';
import type { FaultCurrentMeasurement, ProtectiveCurrentMeasurement } from './earthing';
import type {
  CircuitOperatingState,
  DeviceCurrentMeasurement,
  LoadOperatingPoint,
  WireOperatingPoint,
} from './operatingPoint';
import type { ProtectionModel } from './protectionModel';
import type { CircuitReadiness } from './readiness';
import type { TimerModel } from './timerModel';

export const ELECTRICAL_CONTRACT_VERSION = 1 as const;
export const ELECTRICAL_MODEL_VERSION = '1.5e.2.1' as const;
export type CoverageStatus = 'supported' | 'estimated' | 'not-assessed';

export interface ElectricalDiagnostic {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
  componentId?: string;
  wireId?: string;
  faultId?: string;
  domainId?: string;
  branchId?: string;
  sourceId?: string;
}

export interface ModelCoverage {
  subjectId: string;
  aspect:
    | 'topology'
    | 'source'
    | 'load'
    | 'controls'
    | 'protection'
    | 'damage'
    | 'fault'
    | 'measurements';
  status: CoverageStatus;
  reason: string;
}

/** Voltage means DC magnitude, single-phase RMS L-N, or three-phase RMS L-N. */
export type SupplyModel =
  | { kind: 'dc'; voltage: number }
  | { kind: 'ac-single-phase'; voltage: number; frequencyHz: number }
  | { kind: 'ac-three-phase'; voltage: number; frequencyHz: number; sequence: 'abc' | 'acb' };

export type PortPair = readonly [number, number];
export interface ContactPole {
  common: number;
  no: number;
  nc?: number;
}

/** Catalogue contracts. They are not persisted fields or measured values. */
export type ElectricalDeviceModel =
  | {
      kind: 'source';
      ports: PortPair;
      /** Explicit L1/L2/L3; ports is [L1, N]. No conversion of two-terminal sources. */
      phasePorts?: readonly [number, number, number];
      supply: SupplyModel;
      voltageOrigin: 'instance' | 'document' | 'catalogue';
      frequencyAssumed?: boolean;
    }
  | {
      kind: 'source-alias';
      group: string;
      role: 'line' | 'neutral';
      port: number;
      supply: SupplyModel;
      voltageOrigin?: 'instance' | 'document' | 'catalogue';
    }
  | { kind: 'earth-reference'; port: number; reference: 'protective-bus' | 'electrode' }
  | {
      kind: 'resistive-load';
      ports: PortPair;
      resistanceOhms: number;
      nominalVoltage: number;
      nominalPowerWatts: number;
      supplyKinds: readonly SupplyModel['kind'][];
      approximation: string;
      maximumVoltage?: number;
      operatingVoltageRange?: { min: number; max: number };
      frequencyHz?: readonly number[];
    }
  | {
      kind: 'unassessed-load';
      ports: readonly number[];
      nominalPowerWatts?: number;
      nominalVoltage?: number;
      maximumVoltage?: number;
      supplyKinds?: readonly SupplyModel['kind'][];
      operatingVoltageRange?: { min: number; max: number };
      frequencyHz?: readonly number[];
      reason: string;
    }
  | {
      kind: 'three-phase-motor';
      ports: readonly [number, number, number];
      motor: import('./motorModel').MotorModel;
    }
  | { kind: 'outlet'; capacityWatts?: number; maximumVoltage?: number }
  | { kind: 'connections'; groups: readonly (readonly number[])[] }
  | {
      kind: 'contacts';
      poles: readonly ContactPole[];
      fixedGroups?: readonly (readonly number[])[];
      coil?: PortPair;
      coilModel?: CoilModel;
      timerModel?: TimerModel;
      timerSupplyPorts?: PortPair;
      protectionModel?: ProtectionModel;
      dimmer?: 'synchronous-resistive';
      limitation?: string;
    }
  | { kind: 'selector'; on: readonly PortPair[]; off: readonly PortPair[] }
  | {
      kind: 'transformer';
      primary: PortPair;
      secondary: PortPair;
      primaryVoltage: number;
      secondaryVoltage: number;
      isolation: 'isolated';
      approximation: string;
    }
  | { kind: 'unassessed'; reason: string };

export interface ResolvedWireProperties {
  cableMm2: number;
  lengthMeters: number;
  material: 'copper' | 'aluminum';
  installationMethod: InstallationMethod;
  deratingFactor: number;
  /** ONE conductor at 20 C. Not the two-conductor, 70 C voltage-drop table. */
  resistanceOhms: number;
  provenance: {
    cableMm2: 'wire' | 'wire-awg' | 'endpoint' | 'default';
    lengthMeters: 'wire' | 'default';
    material: 'wire' | 'default';
    installationMethod: 'wire' | 'default';
    deratingFactor: 'wire' | 'default';
  };
}

export interface ElectricalTerminal {
  id: string;
  /** Absent only on virtual nodes for the legacy supply aliases. */
  port?: PortRef;
  role: 'line' | 'neutral' | 'pe' | 'positive' | 'negative' | 'l1' | 'l2' | 'l3';
  label: string;
}

export interface ElectricalBranch {
  id: string;
  kind:
    | 'wire'
    | 'link'
    | 'contact'
    | 'source'
    | 'load'
    | 'coil'
    | 'control-supply'
    | 'winding'
    | 'fault';
  from: string;
  to: string;
  closed: boolean;
  /** Only closed ideal links/contacts merge solver nodes. Wires retain impedance. */
  idealConductor: boolean;
  componentId?: string;
  wireId?: string;
  faultId?: string;
  wire?: ResolvedWireProperties;
  resistanceOhms?: number;
}

export interface CompiledSource {
  id: string;
  componentIds: string[];
  positive: string;
  negative: string;
  model: SupplyModel;
  /** A numerical gauge/reference is not an implicit neutral-to-earth bond. */
  reference: 'floating' | 'neutral';
  /** One synchronized phase system; separate source components are unsynchronized. */
  phaseSystemId?: string;
  phase?: 'l1' | 'l2' | 'l3';
  phaseAngleDegrees?: number;
}

export interface CompiledFault {
  id: string;
  type: FaultType;
  target: FaultTarget;
  coverage: CoverageStatus;
  effect: string;
}

export interface CompiledTransformer {
  componentId: string;
  primary: readonly [string, string];
  secondary: readonly [string, string];
  primaryBranchId: string;
  secondaryBranchId: string;
  /** Nprimary / Nsecondary; first terminal of each pair has the same polarity. */
  turnsRatio: number;
}

export interface TerminalGraph {
  terminals: ElectricalTerminal[];
  branches: ElectricalBranch[];
  /** Nodes connected by zero-impedance internal links; finite wires stay branches. */
  nets: { id: string; terminals: string[] }[];
  /** Galvanic connectivity, including loads/sources but never transformer coupling. */
  domains: { id: string; terminals: string[]; sourceIds: string[] }[];
  devices: { componentId: string; model: ElectricalDeviceModel; damageModel?: DamageModel }[];
  sources: CompiledSource[];
  transformers: CompiledTransformer[];
  references: {
    terminal: string;
    kind: 'neutral' | 'protective-bus' | 'electrode' | 'dc-negative';
  }[];
  faults: CompiledFault[];
}

export interface CompileOptions {
  defs?: Record<string, ComponentDef>;
  /** Transient contact state supplied by a device step, never saved into Circuit. */
  contactStates?: ReadonlyMap<string, boolean>;
  /** Internal RMS samples; a static contact override does not model a dimmer. */
  dimmerSampling?: boolean;
  /** Transient protection trips supplied by a device step, never saved into Circuit. */
  trippedComponents?: ReadonlySet<string>;
  /** Transient irreversible opens; saved damage flags remain independently effective. */
  damagedComponents?: ReadonlySet<string>;
  damagedWires?: ReadonlySet<string>;
}

export type CompileResult =
  | {
      status: 'invalid';
      contractVersion: typeof ELECTRICAL_CONTRACT_VERSION;
      modelVersion: typeof ELECTRICAL_MODEL_VERSION;
      diagnostics: ElectricalDiagnostic[];
    }
  | {
      status: 'compiled';
      contractVersion: typeof ELECTRICAL_CONTRACT_VERSION;
      modelVersion: typeof ELECTRICAL_MODEL_VERSION;
      circuit: Circuit;
      graph: TerminalGraph;
      diagnostics: ElectricalDiagnostic[];
      coverage: ModelCoverage[];
    };

export interface PendingControlTransition {
  closed: boolean;
  atSeconds: number;
}

export type ProtectionTripReason = 'overload' | 'short-circuit' | 'residual';

/** Validated transient state. Circuit configuration changes require a reset. */
export interface ElectricalSimulationState {
  version: 1;
  modelVersion: string;
  configurationKey: string;
  elapsedSeconds: number;
  contactStates: Record<string, boolean>;
  pending: Record<string, PendingControlTransition>;
  timers: Record<string, { inputHigh: boolean; deadlineSeconds: number | null }>;
  protection: Record<
    string,
    {
      heat: number;
      tripped: boolean;
      reason: ProtectionTripReason | null;
      trippedAtSeconds: number | null;
      residualSinceSeconds: number | null;
      lastEvaluatedSeconds: number;
    }
  >;
  eventSequence: number;
  /** Keys encode target type and ID, so a component and wire may share an ID. */
  damage: Record<string, DamageRuntime>;
}

export interface DamageRuntime {
  exposure: number;
  damaged: boolean;
  damagedAtSeconds: number | null;
  lastEvaluatedSeconds: number;
  /** Previous accepted stress rate; integrate it before measuring changed inputs. */
  rate: number;
}

export interface DamageOperatingPoint {
  target: DamageTarget;
  kind: DamageModel['kind'];
  exposure: number;
  budget: number;
  unit: 'A²s' | 'V²s';
  damaged: boolean;
  damagedAtSeconds: number | null;
  currentAmps: number | null;
  voltageVolts: number | null;
  pendingAtSeconds: number | null;
}

export interface DamageEvent {
  sequence: number;
  atSeconds: number;
  type: 'damage';
  target: DamageTarget;
  reason: DamageModel['kind'];
  /** Immediately before opening; final readings describe the opened topology. */
  currentAmps: number | null;
  voltageVolts: number | null;
  exposure: number;
  budget: number;
  unit: 'A²s' | 'V²s';
}

interface ControlEventBase {
  sequence: number;
  atSeconds: number;
  componentId: string;
}
export interface CoilControlEvent extends ControlEventBase {
  type: 'coil-pickup' | 'coil-dropout';
  /** Phasor events report RMS magnitudes; scalar engines retain signed DC/RMS. */
  measurementConvention?: 'complex-rms-magnitudes';
  /** Coil readings immediately before this event; result readings are post-event. */
  coilVoltageVolts: number | null;
  coilCurrentAmps: number | null;
  coilPowerWatts: number | null;
}

export interface TimerControlEvent extends ControlEventBase {
  type: 'timer-on' | 'timer-off' | 'timer-retrigger';
  reason: 'schedule' | 'trigger' | 'expiry' | 'disabled' | 'power-loss';
  /** Actual pole current before the event, distinct from the post-event result. */
  contactCurrentAmps: number | null;
}

export interface ProtectionControlEvent extends ControlEventBase {
  type: 'protection-trip' | 'fuse-operated';
  reason: ProtectionTripReason;
  /** Actual worst-pole current immediately before the trip; result readings are post-event. */
  maxPoleCurrentAmps: number | null;
  currentMultiple: number | null;
  residualMilliamps: number | null;
}
export type ElectricalControlEvent =
  | CoilControlEvent
  | TimerControlEvent
  | ProtectionControlEvent
  | DamageEvent;

export interface TimerOperatingPoint {
  componentId: string;
  kind: TimerModel['kind'];
  closed: boolean;
  clock: 'external' | 'declared-supply';
  powered: boolean;
  controlVoltageVolts: number | null;
  controlCurrentAmps: number | null;
  controlPowerWatts: number | null;
  pending: PendingControlTransition | null;
}

export interface ProtectionOperatingPoint {
  componentId: string;
  kind: ProtectionModel['kind'];
  closed: boolean;
  tripped: boolean;
  reason: ProtectionTripReason | null;
  poleCurrentsAmps: (number | null)[];
  maxPoleCurrentAmps: number | null;
  currentMultiple: number | null;
  residualMilliamps: number | null;
  /** Normalized thermal/I²t energy; a trip at the declared limit stays latched open. */
  heat: number;
  pending: { reason: ProtectionTripReason; atSeconds: number } | null;
}

export interface RmsSample {
  weight: number;
  terminalVoltages: Record<string, number>;
  terminalDomains: Record<string, string>;
}

export interface ControlOperatingPoint {
  componentId: string;
  closed: boolean;
  coilVoltageVolts: number | null;
  coilCurrentAmps: number | null;
  coilPowerWatts: number | null;
  pending: PendingControlTransition | null;
}

export interface ElectricalSimulationResult {
  controls?: ControlOperatingPoint[];
  timers?: TimerOperatingPoint[];
  protection?: ProtectionOperatingPoint[];
  damage?: DamageOperatingPoint[];
  dimming?: {
    model: 'synchronous-resistive-rms';
    controls: { componentId: string; powerFraction: number }[];
    /** KCL/KVL are verified per sample; scalar RMS magnitudes cannot be summed. */
    samples: RmsSample[];
  };
  contractVersion: typeof ELECTRICAL_CONTRACT_VERSION;
  engineVersion: string;
  modelVersion: string;
  status: 'invalid' | 'not-solved' | 'unsupported' | 'converged' | 'nonconverged';
  coverage: ModelCoverage[];
  diagnostics: ElectricalDiagnostic[];
  /** Present measurements only; prospective/event currents require separate fields in 1.5D. */
  terminalVoltages: Record<string, number>;
  branchCurrents: Record<string, number>;
  /** Signed from branch.from to branch.to; omitted across independent references. */
  branchVoltages: Record<string, number>;
  /** Passive sign convention: negative source power means delivery. */
  branchPowers: Record<string, number>;
  wireLosses: Record<string, number>;
  terminalDomains: Record<string, string>;
  sourceBranches: Record<string, string>;
  unavailableBranchVoltages: Record<string, 'independent-references'>;
  references: ElectricalReference[];
  transformers: TransformerMeasurement[];
  protectiveCurrents: ProtectiveCurrentMeasurement[];
  faultCurrents: FaultCurrentMeasurement[];
  checks: ElectricalConservationChecks | null;
  /** Preflight stays distinct from solved operating points and standards assessment. */
  readiness: CircuitReadiness;
  loads: LoadOperatingPoint[];
  wires: WireOperatingPoint[];
  deviceCurrents: DeviceCurrentMeasurement[];
  operation: CircuitOperatingState;
  assessment: 'not-assessed';
}

export interface ElectricalReference {
  domainId: string;
  netId: string;
  terminalId: string;
  kind: 'mathematical-gauge';
  /** Shared equations do not make these galvanic domains share a voltage gauge. */
  couplingGroupId: string;
  sourceIds: string[];
  voltageConvention: 'dc' | 'signed-rms' | 'passive-relative';
  frequencyHz?: number;
}

export interface TransformerMeasurement {
  componentId: string;
  turnsRatio: number;
  primaryBranchId: string;
  secondaryBranchId: string;
  primaryDomainId: string;
  secondaryDomainId: string;
  connection: 'galvanically-isolated' | 'externally-connected';
  /** Signed into the first terminal of each winding; passive power convention. */
  primaryVoltageVolts: number;
  secondaryVoltageVolts: number;
  primaryCurrentAmps: number;
  secondaryCurrentAmps: number;
  primaryPowerWatts: number;
  secondaryPowerWatts: number;
  sourceIds: string[];
  frequencyHz: number | null;
  model: 'ideal-isolated-ac';
  lossesAndSaturation: 'not-assessed';
}

export interface ElectricalConservationChecks {
  /** When present, residual maxima describe separately checked switching states. */
  checkedSwitchingSamples?: number;
  relativeTolerance: number;
  absoluteTolerance: number;
  maximumKclResidualAmps: number;
  maximumSourceResidualVolts: number;
  maximumTransformerVoltageResidualVolts: number;
  maximumTransformerCurrentResidualAmps: number;
  maximumTransformerPowerResidualWatts: number;
  maximumPowerResidualWatts: number;
  maximumResidualRatio: number;
  couplingGroups: {
    groupId: string;
    domainIds: string[];
    transformerIds: string[];
    unknowns: number;
    minimumScaledPivot: number;
    maximumEquationResidualRatio: number;
  }[];
  domains: {
    domainId: string;
    /** Local voltage/source unknowns; shared winding unknowns are counted by group. */
    unknowns: number;
    minimumScaledPivot: number;
    maximumEquationResidualRatio: number;
    absorbedPowerWatts: number;
    deliveredPowerWatts: number;
    powerResidualWatts: number;
  }[];
}
