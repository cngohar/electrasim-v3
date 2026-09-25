import type { BreakerProtectionModel, ResidualProtectionModel, RulePackId } from "./standards.ts";

export type SupplyFamily = "us_110_120" | "international_230_240";
export type EarthingArrangement = "TN-S" | "TN-C-S" | "TT" | "IT" | "north_american_grounded";
export type ElectricalSystem = "ac_single_phase" | "ac_split_phase" | "ac_three_phase" | "dc";
export type ComponentKind =
  | "supply"
  | "breaker"
  | "residual_device"
  | "insulation_monitor"
  | "conductor"
  | "resistive_load"
  | "reactive_load"
  | "coil"
  | "motor"
  | "switch"
  | "relay_contact"
  | "contactor"
  | "socket_outlet"
  | "junction"
  | "busbar"
  | "voltmeter"
  | "ammeter"
  | "clamp_meter"
  | "enclosure";

export interface ComplexImpedance {
  readonly resistanceOhms: number;
  readonly reactanceOhms: number;
}

export type TerminalRole =
  | "line"
  | "neutral"
  | "protective_earth"
  | "dc_positive"
  | "dc_negative"
  | "control"
  | "measurement";

export interface TerminalDefinition {
  readonly id: string;
  readonly label: string;
  readonly role: TerminalRole;
  readonly domain: "power" | "control" | "measurement" | "protective";
}

interface ComponentBase {
  readonly id: string;
  readonly label: string;
  readonly terminals: readonly TerminalDefinition[];
  readonly pro?: boolean;
}

export interface SupplyWinding {
  readonly id: string;
  readonly positiveTerminalId: string;
  readonly referenceTerminalId: string;
  /** RMS for AC and steady value for DC. */
  readonly voltage: number;
  /** Electrical phase angle; zero for DC. */
  readonly phaseDegrees: number;
  /** Positive finite Thevenin source impedance used in prospective-fault calculations. */
  readonly sourceImpedance?: ComplexImpedance;
}

export interface SupplyComponent extends ComponentBase {
  readonly kind: "supply";
  readonly system: ElectricalSystem;
  readonly frequencyHz: number;
  readonly windings: readonly SupplyWinding[];
}

export interface BreakerComponent extends ComponentBase {
  readonly kind: "breaker";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly ratingAmps: number;
  /** Explicit product-standard behavior; IEC curves are never reused for UL 489 devices. */
  readonly protectionModel: BreakerProtectionModel;
  readonly resistanceOhms: number;
  readonly reactanceOhms?: number;
  readonly interruptingRatingAmps?: number;
  /** Optional manufacturer-published maximum let-through data; never synthesized from IEC category. */
  readonly letThroughCurve?: {
    readonly manufacturer: string;
    readonly curveId: string;
    readonly referenceUrl: string;
    readonly points: readonly {
      readonly prospectiveCurrentAmps: number;
      readonly maximumI2tAmpSquaredSeconds: number;
    }[];
  };
  readonly failureMode?: "none" | "failed_to_open";
}

export interface ResidualDeviceComponent extends ComponentBase {
  readonly kind: "residual_device";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly resistanceOhms: number;
  readonly reactanceOhms?: number;
  readonly protectionModel: ResidualProtectionModel;
  /** Fault ids whose solved current returns outside the sensed conductors. */
  readonly monitoredFaultIds: readonly string[];
  readonly failureMode?: "none" | "failed_to_open";
}

export interface InsulationMonitorComponent extends ComponentBase {
  readonly kind: "insulation_monitor";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  /** High measurement impedance; the monitor must not create a protective-current shortcut. */
  readonly resistanceOhms: number;
  readonly reactanceOhms?: number;
  readonly monitoredFaultIds: readonly string[];
  readonly alarmThresholdMilliamps: number;
}

export interface ConductorComponent extends ComponentBase {
  readonly kind: "conductor";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly resistanceOhms: number;
  readonly reactanceOhms?: number;
  readonly protectiveFunction?:
    | "line"
    | "neutral"
    | "cpc"
    | "pen"
    | "earth_electrode"
    | "source_bond"
    | "equipment_grounding_conductor"
    | "neutral_earthing_impedance";
  readonly crossSectionMm2?: number;
  readonly adiabaticK?: number;
  readonly thermalMassJPerC: number;
  readonly coolingWattsPerC: number;
  readonly insulationLimitC: number;
  readonly openFailureLimitC: number;
  readonly ambientTemperatureC?: number;
}

export interface ResistiveLoadComponent extends ComponentBase {
  readonly kind: "resistive_load";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly resistanceOhms: number;
}

export interface ReactiveLoadComponent extends ComponentBase {
  readonly kind: "reactive_load";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly loadType: "inductive" | "capacitive";
  readonly resistanceOhms: number;
  /** Signed AC reactance: positive inductive, negative capacitive. */
  readonly reactanceOhms: number;
}

export interface CoilComponent extends ComponentBase {
  readonly kind: "coil";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly resistanceOhms: number;
  readonly reactanceOhms: number;
  readonly ratedVoltage: number;
  readonly controlsContactIds: readonly string[];
}

export interface MotorComponent extends ComponentBase {
  readonly kind: "motor";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly resistanceOhms: number;
  readonly reactanceOhms: number;
  readonly ratedMechanicalWatts: number;
  readonly phaseCount: 1 | 3;
  readonly inrushMultiplier?: number;
  readonly inrushDurationMs?: number;
}

export interface SwitchComponent extends ComponentBase {
  readonly kind: "switch";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly closed: boolean;
  readonly resistanceOhms: number;
}

export interface ControlledContactComponent extends ComponentBase {
  readonly kind: "relay_contact" | "contactor";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly closed: boolean;
  readonly resistanceOhms: number;
  readonly coilReference?: string;
}

export interface SocketOutletComponent extends ComponentBase {
  readonly kind: "socket_outlet";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  readonly closed: boolean;
  readonly resistanceOhms: number;
  readonly regionalForm: "iec_generic" | "north_american_nema_5_15" | "bs_1363_fused";
}

/** Ideal authoring node. All declared terminals are electrically common in the solver. */
export interface JunctionComponent extends ComponentBase {
  readonly kind: "junction";
}

/** Ideal neutral or protective distribution bar. Geometry never changes its electrical node. */
export interface BusbarComponent extends ComponentBase {
  readonly kind: "busbar";
  readonly function: "neutral" | "protective_earth";
}

export interface VoltmeterComponent extends ComponentBase {
  readonly kind: "voltmeter";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  /** Input impedance represented in the solved network. */
  readonly resistanceOhms: number;
  readonly rangeVolts: number;
}

export interface AmmeterComponent extends ComponentBase {
  readonly kind: "ammeter";
  readonly fromTerminalId: string;
  readonly toTerminalId: string;
  /** Burden resistance represented in series with the measured circuit. */
  readonly resistanceOhms: number;
  readonly rangeAmps: number;
}

/** Non-invasive current instrument. It reads a branch without changing its impedance. */
export interface ClampMeterComponent extends ComponentBase {
  readonly kind: "clamp_meter";
  readonly targetComponentId?: string;
  readonly rangeAmps: number;
}

/** Visual grouping equipment such as a consumer unit or service-panel enclosure. */
export interface EnclosureComponent extends ComponentBase {
  readonly kind: "enclosure";
  readonly enclosureType: "consumer_unit" | "service_panel" | "junction_box" | "din_rail";
}

export type CircuitComponent =
  | SupplyComponent
  | BreakerComponent
  | ResidualDeviceComponent
  | InsulationMonitorComponent
  | ConductorComponent
  | ResistiveLoadComponent
  | ReactiveLoadComponent
  | CoilComponent
  | MotorComponent
  | SwitchComponent
  | ControlledContactComponent
  | SocketOutletComponent
  | JunctionComponent
  | BusbarComponent
  | VoltmeterComponent
  | AmmeterComponent
  | ClampMeterComponent
  | EnclosureComponent;

export interface TerminalReference {
  readonly componentId: string;
  readonly terminalId: string;
}

export interface CircuitConnection {
  readonly id: string;
  readonly from: TerminalReference;
  readonly to: TerminalReference;
}

export type CircuitFault =
  | {
      readonly id: string;
      readonly type: "open_component";
      readonly componentId: string;
      readonly active: boolean;
    }
  | {
      readonly id: string;
      readonly type: "open_terminal";
      readonly terminal: TerminalReference;
      readonly active: boolean;
    }
  | {
      readonly id: string;
      readonly type: "impedance_bridge";
      readonly from: TerminalReference;
      readonly to: TerminalReference;
      readonly resistanceOhms: number;
      readonly reactanceOhms?: number;
      /** Optional educational capacitance for deterministic insulation-test charging/discharge. */
      readonly capacitanceMicrofarads?: number;
      readonly faultKind?:
        | "line_neutral"
        | "line_earth"
        | "high_impedance_earth"
        | "residual_current";
      readonly enclosureComponentId?: string;
      /** Local earth/reference node used for supported touch-potential evidence. */
      readonly touchReference?: TerminalReference;
      readonly active: boolean;
    }
  | {
      readonly id: string;
      readonly type: "terminal_swap";
      readonly componentId: string;
      readonly firstTerminalId: string;
      readonly secondTerminalId: string;
      readonly active: boolean;
    };

export interface ComponentPosition {
  readonly x: number;
  readonly y: number;
  /** Clockwise visual rotation in degrees; electrical topology is unchanged. */
  readonly rotation?: number;
  /** Enclosure that geometrically contains this component. */
  readonly enclosureId?: string;
}

export interface LayoutPoint {
  readonly x: number;
  readonly y: number;
}

export interface CircuitLayout {
  /** Authoring geometry is presentation evidence only; it never affects electrical solving. */
  readonly componentPositions: Readonly<Record<string, ComponentPosition>>;
  /** Optional author-controlled bend points keyed by connection id. */
  readonly connectionRoutes?: Readonly<Record<string, readonly LayoutPoint[]>>;
  /** Last authoring viewport, retained as a convenience rather than electrical evidence. */
  readonly viewport?: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
}

export type DiagnosticWorkflowState =
  | "idle"
  | "identified"
  | "indicator_proved_before"
  | "isolated_locked"
  | "dead_checked"
  | "indicator_reproved"
  | "ready_for_dead_testing"
  | "testing"
  | "discharging";

export interface DiagnosticSession {
  readonly state: DiagnosticWorkflowState;
  readonly isolationComponentId?: string;
  readonly pointOfWorkComponentId?: string;
  readonly locked: boolean;
  readonly indicatorProvedBefore: boolean;
  readonly indicatorProvedAfter: boolean;
  readonly deadChecks: readonly {
    readonly combination: "line_neutral" | "line_earth" | "neutral_earth";
    readonly volts: number | null;
  }[];
  readonly probeFrom?: TerminalReference;
  readonly probeTo?: TerminalReference;
  readonly leadResistanceOhms: number;
  readonly leadsNulled: boolean;
  readonly insulationTestVoltage: 50 | 100 | 250 | 500 | 1000;
  readonly storedChargeVolts: number;
  readonly dischargeRemainingMs: number;
}

export interface CircuitDocument {
  readonly schemaVersion: 2;
  readonly id: string;
  readonly title: string;
  /** Supply selection is a voltage/frequency family, not a compliance claim. */
  readonly supplyFamily: SupplyFamily;
  /** Installation evaluation is kept separate from shared electrical physics. */
  readonly rulePackId?: RulePackId;
  /** Physical topology label; it is not inferred from supply voltage. */
  readonly earthingArrangement?: EarthingArrangement;
  readonly components: readonly CircuitComponent[];
  readonly connections: readonly CircuitConnection[];
  readonly faults: readonly CircuitFault[];
  /** Optional author-controlled SVG positions retained by save/import/export. */
  readonly layout?: CircuitLayout;
  /** Persisted educational diagnostic workflow; never implies field authorization. */
  readonly diagnosticSession?: DiagnosticSession;
  readonly revision: number;
}

export type CircuitCommand =
  | {
      readonly type: "add_component";
      readonly component: CircuitComponent;
      readonly position?: ComponentPosition;
    }
  | { readonly type: "remove_component"; readonly componentId: string }
  | {
      readonly type: "restore_component";
      readonly component: CircuitComponent;
      readonly connections: readonly CircuitConnection[];
      readonly faults: readonly CircuitFault[];
      readonly position?: ComponentPosition;
      readonly connectionRoutes?: Readonly<Record<string, readonly LayoutPoint[]>>;
    }
  | {
      readonly type: "update_component";
      readonly componentId: string;
      readonly patch: Partial<CircuitComponent>;
    }
  | { readonly type: "replace_component"; readonly component: CircuitComponent }
  | {
      readonly type: "connect";
      readonly connection: CircuitConnection;
      readonly route?: readonly LayoutPoint[];
    }
  | { readonly type: "disconnect"; readonly connectionId: string }
  | { readonly type: "inject_fault"; readonly fault: CircuitFault }
  | { readonly type: "remove_fault"; readonly faultId: string }
  | {
      readonly type: "set_component_position";
      readonly componentId: string;
      readonly position: ComponentPosition | null;
    }
  | {
      readonly type: "set_component_positions";
      readonly positions: Readonly<Record<string, ComponentPosition>>;
    }
  | {
      readonly type: "set_connection_route";
      readonly connectionId: string;
      readonly route: readonly LayoutPoint[] | null;
    }
  | {
      readonly type: "set_viewport";
      readonly viewport: CircuitLayout["viewport"];
    }
  | { readonly type: "set_diagnostic_session"; readonly session: DiagnosticSession | null }
  | { readonly type: "set_supply_family"; readonly supplyFamily: SupplyFamily };

export type DamageState = "healthy" | "heating" | "insulation_damaged" | "failed_open";
export type ProtectionState = "closed" | "accumulating" | "tripped" | "failed_to_open";

export class SimulatorError extends Error {
  constructor(
    readonly code:
      | "invalid_circuit"
      | "duplicate_id"
      | "component_not_found"
      | "terminal_not_found"
      | "incompatible_terminal"
      | "singular_circuit"
      | "pro_required"
      | "project_limit_reached"
      | "unsupported_schema",
    readonly detail?: string,
  ) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "SimulatorError";
  }
}

export function terminalKey(reference: TerminalReference): string {
  return `${reference.componentId}:${reference.terminalId}`;
}

export function getTerminal(
  component: CircuitComponent,
  terminalId: string,
): TerminalDefinition | undefined {
  return component.terminals.find((terminal) => terminal.id === terminalId);
}
