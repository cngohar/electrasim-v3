/** Electrical contracts, independent of saved drawings, membership and rendering. */
import type {
  Circuit,
  ComponentDef,
  FaultTarget,
  FaultType,
  InstallationMethod,
  PortRef,
} from '../types';
import type { FaultCurrentMeasurement, ProtectiveCurrentMeasurement } from './earthing';
import type {
  CircuitOperatingState,
  DeviceCurrentMeasurement,
  LoadOperatingPoint,
  WireOperatingPoint,
} from './operatingPoint';
import type { CircuitReadiness } from './readiness';

export const ELECTRICAL_CONTRACT_VERSION = 1 as const;
export const ELECTRICAL_MODEL_VERSION = '1.5c.5.1' as const;
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
  aspect: 'topology' | 'source' | 'load' | 'controls' | 'protection' | 'fault' | 'measurements';
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
  | { kind: 'outlet'; capacityWatts?: number; maximumVoltage?: number }
  | { kind: 'connections'; groups: readonly (readonly number[])[] }
  | {
      kind: 'contacts';
      poles: readonly ContactPole[];
      fixedGroups?: readonly (readonly number[])[];
      coil?: PortPair;
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
  kind: 'wire' | 'link' | 'contact' | 'source' | 'load' | 'coil' | 'winding' | 'fault';
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
  devices: { componentId: string; model: ElectricalDeviceModel }[];
  sources: CompiledSource[];
  transformers: CompiledTransformer[];
  references: {
    terminal: string;
    kind: 'neutral' | 'protective-bus' | 'electrode' | 'dc-negative';
  }[];
  faults: CompiledFault[];
}

export type TransientProtectionState = 'closed' | 'tripped' | 'blown';

export interface CompileOptions {
  defs?: Record<string, ComponentDef>;
  /** Transient contact state supplied by a device step, never saved into Circuit. */
  contactStates?: ReadonlyMap<string, boolean>;
  /** Transient protection state supplied by a device step, never saved into Circuit. */
  protectionStates?: ReadonlyMap<string, TransientProtectionState>;
  /** 0..1 dimmer command supplied by a device step, never saved into Circuit. */
  dimmerLevels?: ReadonlyMap<string, number>;
  /** Cables damaged during a previous step are open in the next solve. */
  openWires?: ReadonlySet<string>;
  /** Component ids whose explicit timed model has replaced the manual-only guard. */
  timedControls?: ReadonlySet<string>;
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

/**
 * State owned by the time/protection layer. The linear solver consumes these
 * values but never advances or persists them. Keeping this separate from
 * `Circuit` makes reset/replay deterministic and prevents a simulation tick
 * from silently rewriting a learner's drawing.
 */
export interface ElectricalSimulationState {
  modelVersion: string;
  elapsedSeconds: number;
  contactStates: Record<string, boolean>;
  protectionStates: Record<string, TransientProtectionState>;
  /** Elapsed exposure used by inverse-time protective models. */
  protectionElapsedSeconds: Record<string, number>;
  /** Normalised I²t-like cable exposure. The scale is a declared teaching model. */
  cableDamageProgress: Record<string, number>;
  /** Wires opened by a modeled cable-damage event. */
  openWires: string[];
  /** Active control triggers, keyed by component id. */
  controlTriggers: Record<string, number>;
  /** Last commanded dimmer level, 0..1. */
  dimmerLevels: Record<string, number>;
  /** Derived coil operation; manual Circuit state remains untouched. */
  coilStates: Record<string, boolean>;
}

export type ElectricalEventKind =
  | 'contact-changed'
  | 'dimmer-changed'
  | 'protection-trip'
  | 'device-blown'
  | 'cable-damaged'
  | 'control-triggered'
  | 'control-reset'
  | 'simulation-reset';

export interface ElectricalSimulationEvent {
  id: string;
  timeSeconds: number;
  kind: ElectricalEventKind;
  componentId?: string;
  wireId?: string;
  from?: boolean;
  to?: boolean;
  value?: number;
  cause?: 'schedule' | 'manual' | 'overload' | 'short-circuit' | 'ground-fault' | 'arc-fault';
  currentAmps?: number;
  clearingTimeSeconds?: number;
  message: string;
}

export interface ElectricalSimulationResult {
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
