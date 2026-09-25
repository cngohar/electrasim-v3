import { getSupplyProfile } from "./catalog.ts";
import {
  type CircuitCommand,
  type CircuitComponent,
  type CircuitConnection,
  type CircuitDocument,
  type CircuitFault,
  type DiagnosticSession,
  getTerminal,
  SimulatorError,
  type SupplyFamily,
  type TerminalDefinition,
  type TerminalReference,
} from "./model.ts";

export type { CircuitCommand };

export interface CommandResult {
  readonly circuit: CircuitDocument;
  readonly inverse: CircuitCommand;
}

export function applyCircuitCommand(
  circuit: CircuitDocument,
  command: CircuitCommand,
  entitlements: ReadonlySet<string> = new Set(),
): CommandResult {
  const components = [...circuit.components];
  const connections = [...circuit.connections];
  const faults = [...circuit.faults];
  const componentPositions = { ...(circuit.layout?.componentPositions ?? {}) };
  const connectionRoutes = { ...(circuit.layout?.connectionRoutes ?? {}) };
  let viewport = circuit.layout?.viewport;
  let diagnosticSession = circuit.diagnosticSession;
  let inverse: CircuitCommand;
  switch (command.type) {
    case "add_component":
      if (components.some((entry) => entry.id === command.component.id))
        throw new SimulatorError("duplicate_id");
      assertEntitled(command.component, entitlements);
      components.push(command.component);
      if (command.position) componentPositions[command.component.id] = command.position;
      inverse = { type: "remove_component", componentId: command.component.id };
      break;
    case "remove_component": {
      const component = components.find((entry) => entry.id === command.componentId);
      if (!component) throw new SimulatorError("component_not_found");
      const attached = connections.filter(
        (connection) =>
          connection.from.componentId === component.id ||
          connection.to.componentId === component.id,
      );
      const attachedFaults = faults.filter((fault) =>
        faultReferencesComponent(fault, component.id),
      );
      const componentPosition = componentPositions[component.id];
      const attachedRoutes: Record<string, readonly { x: number; y: number }[]> = {};
      for (const connection of attached) {
        const route = connectionRoutes[connection.id];
        if (route) attachedRoutes[connection.id] = route;
      }
      components.splice(components.indexOf(component), 1);
      delete componentPositions[component.id];
      for (const connection of attached) {
        connections.splice(connections.indexOf(connection), 1);
        delete connectionRoutes[connection.id];
      }
      for (const fault of attachedFaults) faults.splice(faults.indexOf(fault), 1);
      inverse = {
        type: "restore_component",
        component,
        connections: attached,
        faults: attachedFaults,
        ...(componentPosition ? { position: componentPosition } : {}),
        ...(Object.keys(attachedRoutes).length > 0 ? { connectionRoutes: attachedRoutes } : {}),
      };
      break;
    }
    case "restore_component":
      if (components.some((entry) => entry.id === command.component.id))
        throw new SimulatorError("duplicate_id");
      assertEntitled(command.component, entitlements);
      components.push(command.component);
      connections.push(...command.connections);
      faults.push(...command.faults);
      if (command.position) componentPositions[command.component.id] = command.position;
      Object.assign(connectionRoutes, command.connectionRoutes ?? {});
      inverse = { type: "remove_component", componentId: command.component.id };
      break;
    case "update_component": {
      const index = components.findIndex((entry) => entry.id === command.componentId);
      const current = components[index];
      if (!current) throw new SimulatorError("component_not_found");
      const updated = {
        ...current,
        ...command.patch,
        id: current.id,
        kind: current.kind,
      } as CircuitComponent;
      assertEntitled(updated, entitlements);
      components[index] = updated;
      inverse = { type: "replace_component", component: current };
      break;
    }
    case "replace_component": {
      const index = components.findIndex((entry) => entry.id === command.component.id);
      const current = components[index];
      if (!current) throw new SimulatorError("component_not_found");
      assertEntitled(command.component, entitlements);
      components[index] = command.component;
      inverse = { type: "replace_component", component: current };
      break;
    }
    case "connect":
      if (connections.some((entry) => entry.id === command.connection.id))
        throw new SimulatorError("duplicate_id");
      assertConnection(command.connection, components);
      connections.push(command.connection);
      if (command.route) connectionRoutes[command.connection.id] = command.route;
      inverse = { type: "disconnect", connectionId: command.connection.id };
      break;
    case "disconnect": {
      const index = connections.findIndex((entry) => entry.id === command.connectionId);
      const connection = connections[index];
      if (!connection) throw new SimulatorError("invalid_circuit");
      connections.splice(index, 1);
      const route = connectionRoutes[connection.id];
      delete connectionRoutes[connection.id];
      inverse = { type: "connect", connection, ...(route ? { route } : {}) };
      break;
    }
    case "inject_fault":
      if (faults.some((fault) => fault.id === command.fault.id))
        throw new SimulatorError("duplicate_id");
      faults.push(command.fault);
      inverse = { type: "remove_fault", faultId: command.fault.id };
      break;
    case "remove_fault": {
      const index = faults.findIndex((fault) => fault.id === command.faultId);
      const fault = faults[index];
      if (!fault) throw new SimulatorError("invalid_circuit", "Fault does not exist.");
      faults.splice(index, 1);
      inverse = { type: "inject_fault", fault };
      break;
    }
    case "set_component_position": {
      if (!components.some((component) => component.id === command.componentId))
        throw new SimulatorError("component_not_found");
      const previous = componentPositions[command.componentId] ?? null;
      if (command.position) componentPositions[command.componentId] = command.position;
      else delete componentPositions[command.componentId];
      inverse = {
        type: "set_component_position",
        componentId: command.componentId,
        position: previous,
      };
      break;
    }
    case "set_component_positions": {
      const previous: Record<
        string,
        { x: number; y: number; rotation?: number; enclosureId?: string }
      > = {};
      for (const [componentId, position] of Object.entries(command.positions)) {
        const componentIndex = components.findIndex((component) => component.id === componentId);
        if (componentIndex < 0) throw new SimulatorError("component_not_found");
        previous[componentId] = componentPositions[componentId] ?? { x: 0, y: 0 };
        componentPositions[componentId] = position;
      }
      inverse = { type: "set_component_positions", positions: previous };
      break;
    }
    case "set_connection_route": {
      if (!connections.some((connection) => connection.id === command.connectionId))
        throw new SimulatorError("invalid_circuit", "Connection does not exist.");
      const previous = connectionRoutes[command.connectionId] ?? null;
      if (command.route) connectionRoutes[command.connectionId] = command.route;
      else delete connectionRoutes[command.connectionId];
      inverse = {
        type: "set_connection_route",
        connectionId: command.connectionId,
        route: previous,
      };
      break;
    }
    case "set_viewport":
      inverse = { type: "set_viewport", viewport };
      viewport = command.viewport;
      break;
    case "set_diagnostic_session":
      inverse = {
        type: "set_diagnostic_session",
        session: circuit.diagnosticSession ?? null,
      };
      diagnosticSession = command.session ?? undefined;
      break;
    case "set_supply_family":
      inverse = { type: "set_supply_family", supplyFamily: circuit.supplyFamily };
      return {
        circuit: { ...circuit, supplyFamily: command.supplyFamily, revision: circuit.revision + 1 },
        inverse,
      };
  }
  const updated = {
    ...circuit,
    components,
    connections,
    faults,
    ...(Object.keys(componentPositions).length > 0 ||
    Object.keys(connectionRoutes).length > 0 ||
    viewport
      ? { layout: { componentPositions, connectionRoutes, ...(viewport ? { viewport } : {}) } }
      : { layout: undefined }),
    ...(diagnosticSession ? { diagnosticSession } : { diagnosticSession: undefined }),
    revision: circuit.revision + 1,
  };
  validateCircuitDocument(updated);
  return { circuit: updated, inverse };
}

export class CircuitHistory {
  private undoCommands: CircuitCommand[] = [];
  private redoCommands: CircuitCommand[] = [];

  constructor(
    public circuit: CircuitDocument,
    private readonly entitlements: ReadonlySet<string> = new Set(),
  ) {}

  execute(command: CircuitCommand): CircuitDocument {
    const result = applyCircuitCommand(this.circuit, command, this.entitlements);
    this.circuit = result.circuit;
    this.undoCommands.push(result.inverse);
    this.redoCommands = [];
    return this.circuit;
  }

  undo(): CircuitDocument {
    const command = this.undoCommands.pop();
    if (!command) return this.circuit;
    const result = applyCircuitCommand(this.circuit, command, this.entitlements);
    this.circuit = result.circuit;
    this.redoCommands.push(result.inverse);
    return this.circuit;
  }

  redo(): CircuitDocument {
    const command = this.redoCommands.pop();
    if (!command) return this.circuit;
    const result = applyCircuitCommand(this.circuit, command, this.entitlements);
    this.circuit = result.circuit;
    this.undoCommands.push(result.inverse);
    return this.circuit;
  }
}

export function validateCircuitDocument(circuit: unknown): asserts circuit is CircuitDocument {
  if (!isRecord(circuit)) invalid("Document must be an object.");
  if (
    circuit.schemaVersion !== 2 ||
    !isBoundedString(circuit.id, 128) ||
    !isBoundedString(circuit.title, 120) ||
    !Number.isSafeInteger(circuit.revision) ||
    (circuit.supplyFamily !== "us_110_120" && circuit.supplyFamily !== "international_230_240") ||
    (circuit.rulePackId !== undefined &&
      ![
        "iec_international_educational_2025",
        "uk_bs7671_separate_review_required",
        "us_nec_2026_educational",
      ].includes(String(circuit.rulePackId))) ||
    (circuit.earthingArrangement !== undefined &&
      !["TN-S", "TN-C-S", "TT", "IT", "north_american_grounded"].includes(
        String(circuit.earthingArrangement),
      )) ||
    !Array.isArray(circuit.components) ||
    circuit.components.length > 500 ||
    !Array.isArray(circuit.connections) ||
    circuit.connections.length > 1_000 ||
    !Array.isArray(circuit.faults) ||
    circuit.faults.length > 500
  )
    invalid("Document header or collection limits are invalid.");

  const components = circuit.components as unknown[];
  const connections = circuit.connections as unknown[];
  const faults = circuit.faults as unknown[];
  for (const value of components) validateComponent(value);
  const typedComponents = components as CircuitComponent[];
  const componentIds = new Set(typedComponents.map((component) => component.id));
  if (componentIds.size !== typedComponents.length) throw new SimulatorError("duplicate_id");
  for (const component of typedComponents) {
    if (
      component.kind === "coil" &&
      component.controlsContactIds.some(
        (id) =>
          !typedComponents.some(
            (candidate) =>
              candidate.id === id &&
              (candidate.kind === "relay_contact" || candidate.kind === "contactor"),
          ),
      )
    )
      invalid("A coil controls an unknown or incompatible contact.");
  }
  if (circuit.layout !== undefined) {
    if (!isRecord(circuit.layout) || !isRecord(circuit.layout.componentPositions))
      invalid("Invalid circuit layout.");
    const positions = Object.entries(circuit.layout.componentPositions);
    if (positions.length > typedComponents.length)
      invalid("Circuit layout has too many positions.");
    for (const [componentId, position] of positions) {
      if (
        !componentIds.has(componentId) ||
        !isRecord(position) ||
        !isFiniteNumber(position.x) ||
        !isFiniteNumber(position.y) ||
        Math.abs(position.x) > 10_000 ||
        Math.abs(position.y) > 10_000 ||
        (position.rotation !== undefined &&
          (!isFiniteNumber(position.rotation) || Math.abs(position.rotation) > 360)) ||
        (position.enclosureId !== undefined &&
          (!isBoundedString(position.enclosureId, 128) ||
            position.enclosureId === componentId ||
            !typedComponents.some(
              (component) =>
                component.id === position.enclosureId && component.kind === "enclosure",
            )))
      )
        invalid("Invalid component position.");
    }
  }
  for (const value of connections) validateConnection(value, typedComponents);
  const connectionIds = new Set(
    (connections as CircuitConnection[]).map((connection) => connection.id),
  );
  if (connectionIds.size !== connections.length) throw new SimulatorError("duplicate_id");
  if (circuit.layout !== undefined) {
    const routes = circuit.layout.connectionRoutes;
    if (routes !== undefined) {
      if (!isRecord(routes) || Object.keys(routes).length > connections.length)
        invalid("Invalid connection routes.");
      for (const [connectionId, points] of Object.entries(routes)) {
        if (
          !connectionIds.has(connectionId) ||
          !Array.isArray(points) ||
          points.length > 24 ||
          !points.every(
            (point) =>
              isRecord(point) &&
              isFiniteNumber(point.x) &&
              isFiniteNumber(point.y) &&
              Math.abs(point.x) <= 10_000 &&
              Math.abs(point.y) <= 10_000,
          )
        )
          invalid("Invalid connection route.");
      }
    }
    const viewport = circuit.layout.viewport;
    if (
      viewport !== undefined &&
      (!isRecord(viewport) ||
        !isFiniteNumber(viewport.x) ||
        !isFiniteNumber(viewport.y) ||
        !isPositive(viewport.width) ||
        !isPositive(viewport.height) ||
        viewport.width > 20_000 ||
        viewport.height > 20_000)
    )
      invalid("Invalid authoring viewport.");
  }
  if (circuit.diagnosticSession !== undefined)
    validateDiagnosticSession(circuit.diagnosticSession, typedComponents);
  for (const value of faults) validateFault(value, typedComponents);
  const faultIds = new Set((faults as CircuitFault[]).map((fault) => fault.id));
  if (faultIds.size !== faults.length) throw new SimulatorError("duplicate_id");
}

function validateDiagnosticSession(
  value: unknown,
  components: readonly CircuitComponent[],
): asserts value is DiagnosticSession {
  if (
    !isRecord(value) ||
    ![
      "idle",
      "identified",
      "indicator_proved_before",
      "isolated_locked",
      "dead_checked",
      "indicator_reproved",
      "ready_for_dead_testing",
      "testing",
      "discharging",
    ].includes(String(value.state)) ||
    typeof value.locked !== "boolean" ||
    typeof value.indicatorProvedBefore !== "boolean" ||
    typeof value.indicatorProvedAfter !== "boolean" ||
    !Array.isArray(value.deadChecks) ||
    value.deadChecks.length > 3 ||
    !isNonNegative(value.leadResistanceOhms) ||
    typeof value.leadsNulled !== "boolean" ||
    ![50, 100, 250, 500, 1000].includes(Number(value.insulationTestVoltage)) ||
    !isNonNegative(value.storedChargeVolts) ||
    !isNonNegative(value.dischargeRemainingMs)
  )
    invalid("Invalid diagnostic session.");
  for (const id of [value.isolationComponentId, value.pointOfWorkComponentId]) {
    if (
      id !== undefined &&
      (!isBoundedString(id, 128) || !components.some((entry) => entry.id === id))
    )
      invalid("Diagnostic component does not exist.");
  }
  for (const reference of [value.probeFrom, value.probeTo]) {
    if (reference !== undefined) {
      if (!isTerminalReference(reference)) invalid("Invalid diagnostic probe.");
      assertTerminalExists(reference as TerminalReference, components);
    }
  }
  for (const check of value.deadChecks) {
    if (
      !isRecord(check) ||
      !["line_neutral", "line_earth", "neutral_earth"].includes(String(check.combination)) ||
      (check.volts !== null && !isNonNegative(check.volts))
    )
      invalid("Invalid absence-of-voltage evidence.");
  }
}

function validateComponent(value: unknown): asserts value is CircuitComponent {
  if (
    !isRecord(value) ||
    !isBoundedString(value.id, 128) ||
    !isBoundedString(value.label, 160) ||
    !isBoundedString(value.kind, 40)
  )
    invalid("Invalid component identity.");
  if (value.kind === "enclosure") {
    if (
      !Array.isArray(value.terminals) ||
      value.terminals.length !== 0 ||
      !["consumer_unit", "service_panel", "junction_box", "din_rail"].includes(
        String(value.enclosureType),
      )
    )
      invalid("Invalid enclosure model.");
    return;
  }
  if (!Array.isArray(value.terminals) || value.terminals.length < 2 || value.terminals.length > 32)
    invalid("A component must have 2–32 terminals.");
  const terminalIds = new Set<string>();
  for (const terminal of value.terminals) {
    if (
      !isRecord(terminal) ||
      !isBoundedString(terminal.id, 64) ||
      !isBoundedString(terminal.label, 64) ||
      ![
        "line",
        "neutral",
        "protective_earth",
        "dc_positive",
        "dc_negative",
        "control",
        "measurement",
      ].includes(String(terminal.role)) ||
      !["power", "control", "measurement", "protective"].includes(String(terminal.domain))
    )
      invalid("Invalid terminal definition.");
    if (terminalIds.has(terminal.id)) throw new SimulatorError("duplicate_id");
    terminalIds.add(terminal.id);
  }
  if (value.kind === "supply") {
    if (
      !["ac_single_phase", "ac_split_phase", "ac_three_phase", "dc"].includes(
        String(value.system),
      ) ||
      !isNonNegative(value.frequencyHz) ||
      !Array.isArray(value.windings) ||
      value.windings.length < 1 ||
      value.windings.length > 3
    )
      invalid("Invalid supply model.");
    const windingIds = new Set<string>();
    for (const winding of value.windings) {
      if (
        !isRecord(winding) ||
        !isBoundedString(winding.id, 64) ||
        windingIds.has(winding.id) ||
        !terminalIds.has(String(winding.positiveTerminalId)) ||
        !terminalIds.has(String(winding.referenceTerminalId)) ||
        !isPositive(winding.voltage) ||
        !isFiniteNumber(winding.phaseDegrees) ||
        (winding.sourceImpedance !== undefined &&
          (!isRecord(winding.sourceImpedance) ||
            !isPositive(winding.sourceImpedance.resistanceOhms) ||
            !isFiniteNumber(winding.sourceImpedance.reactanceOhms)))
      )
        invalid("Invalid supply winding.");
      windingIds.add(winding.id);
    }
    if (value.system === "dc" && value.frequencyHz !== 0)
      invalid("DC supplies must use zero frequency.");
    if (value.system !== "dc" && value.frequencyHz <= 0)
      invalid("AC supplies require a positive frequency.");
    const expectedWindings =
      value.system === "ac_split_phase" ? 2 : value.system === "ac_three_phase" ? 3 : 1;
    if (value.windings.length !== expectedWindings)
      invalid(`${String(value.system)} requires ${expectedWindings} winding definition(s).`);
    return;
  }
  if (value.kind === "junction" || value.kind === "busbar") {
    const terminals = value.terminals as { role?: unknown; domain?: unknown }[];
    const first = terminals[0];
    if (
      !first ||
      !terminals.every(
        (terminal) => terminal.role === first.role && terminal.domain === first.domain,
      ) ||
      (value.kind === "busbar" &&
        (value.function !== first.role ||
          (value.function !== "neutral" && value.function !== "protective_earth")))
    )
      invalid("Junction and busbar terminals must share one electrical role.");
    return;
  }
  if (value.kind === "clamp_meter") {
    if (
      !isPositive(value.rangeAmps) ||
      (value.targetComponentId !== undefined && !isBoundedString(value.targetComponentId, 128))
    )
      invalid("Invalid clamp-meter model.");
    return;
  }
  if (
    !terminalIds.has(String(value.fromTerminalId)) ||
    !terminalIds.has(String(value.toTerminalId))
  )
    invalid("A branch references an unknown internal terminal.");
  if (
    !isPositive(value.resistanceOhms) ||
    (value.reactanceOhms !== undefined && !isFiniteNumber(value.reactanceOhms))
  )
    invalid("Branch impedance is invalid.");
  if (value.kind === "breaker") {
    if (
      !isPositive(value.ratingAmps) ||
      !validBreakerProtectionModel(value.protectionModel) ||
      !validLetThroughCurve(value.letThroughCurve) ||
      ![undefined, "none", "failed_to_open"].includes(value.failureMode as undefined | string)
    )
      invalid("Invalid breaker model.");
  } else if (value.kind === "residual_device") {
    if (
      !isRecord(value.protectionModel) ||
      !["iec_61008_instantaneous", "ul_943_class_a"].includes(
        String(value.protectionModel.family),
      ) ||
      !isPositive(value.protectionModel.ratedResidualMilliamps) ||
      !isBoundedString(value.protectionModel.referenceId, 200) ||
      value.protectionModel.claim !== "standards_envelope" ||
      !Array.isArray(value.monitoredFaultIds) ||
      value.monitoredFaultIds.length > 100 ||
      !value.monitoredFaultIds.every((id) => isBoundedString(id, 128))
    )
      invalid("Invalid residual protection model.");
  } else if (value.kind === "insulation_monitor") {
    if (
      !isPositive(value.alarmThresholdMilliamps) ||
      !Array.isArray(value.monitoredFaultIds) ||
      value.monitoredFaultIds.length > 100 ||
      !value.monitoredFaultIds.every((id) => isBoundedString(id, 128))
    )
      invalid("Invalid insulation-monitor model.");
  } else if (value.kind === "conductor") {
    if (
      !isPositive(value.thermalMassJPerC) ||
      (value.crossSectionMm2 !== undefined && !isPositive(value.crossSectionMm2)) ||
      (value.adiabaticK !== undefined && !isPositive(value.adiabaticK)) ||
      (value.protectiveFunction !== undefined &&
        ![
          "line",
          "neutral",
          "cpc",
          "pen",
          "earth_electrode",
          "source_bond",
          "equipment_grounding_conductor",
          "neutral_earthing_impedance",
        ].includes(String(value.protectiveFunction))) ||
      !isNonNegative(value.coolingWattsPerC) ||
      !isFiniteNumber(value.insulationLimitC) ||
      !isFiniteNumber(value.openFailureLimitC) ||
      value.openFailureLimitC <= value.insulationLimitC
    )
      invalid("Invalid conductor thermal model.");
  } else if (
    value.kind === "switch" ||
    value.kind === "relay_contact" ||
    value.kind === "contactor" ||
    value.kind === "socket_outlet"
  ) {
    if (typeof value.closed !== "boolean") invalid("Invalid switched-contact model.");
    if (
      value.kind === "socket_outlet" &&
      !["iec_generic", "north_american_nema_5_15", "bs_1363_fused"].includes(
        String(value.regionalForm),
      )
    )
      invalid("Invalid regional socket model.");
    if (
      (value.kind === "relay_contact" || value.kind === "contactor") &&
      value.coilReference !== undefined &&
      !isBoundedString(value.coilReference, 128)
    )
      invalid("Invalid controlled-contact reference.");
  } else if (value.kind === "reactive_load") {
    if (
      !["inductive", "capacitive"].includes(String(value.loadType)) ||
      !isFiniteNumber(value.reactanceOhms) ||
      (value.loadType === "inductive" && Number(value.reactanceOhms) <= 0) ||
      (value.loadType === "capacitive" && Number(value.reactanceOhms) >= 0)
    )
      invalid("Reactive-load sign must match its physical type.");
  } else if (value.kind === "coil") {
    if (
      !isPositive(value.ratedVoltage) ||
      !isFiniteNumber(value.reactanceOhms) ||
      value.reactanceOhms <= 0 ||
      !Array.isArray(value.controlsContactIds) ||
      value.controlsContactIds.length > 32 ||
      !value.controlsContactIds.every((id) => isBoundedString(id, 128))
    )
      invalid("Invalid control-coil model.");
  } else if (value.kind === "motor") {
    if (
      !isPositive(value.ratedMechanicalWatts) ||
      ![1, 3].includes(Number(value.phaseCount)) ||
      !isFiniteNumber(value.reactanceOhms) ||
      Number(value.reactanceOhms) <= 0 ||
      (value.inrushMultiplier !== undefined &&
        (!isPositive(value.inrushMultiplier) || value.inrushMultiplier > 20)) ||
      (value.inrushDurationMs !== undefined &&
        (!isPositive(value.inrushDurationMs) || value.inrushDurationMs > 10_000))
    )
      invalid("Invalid motor model.");
  } else if (value.kind === "voltmeter") {
    if (!isPositive(value.rangeVolts) || value.resistanceOhms < 100_000)
      invalid("A voltmeter requires a bounded range and high input impedance.");
  } else if (value.kind === "ammeter") {
    if (!isPositive(value.rangeAmps) || value.resistanceOhms > 1)
      invalid("An ammeter requires a bounded range and low burden resistance.");
  } else if (value.kind !== "resistive_load") {
    invalid("Unknown component kind.");
  }
}

function validLetThroughCurve(value: unknown): boolean {
  if (value === undefined) return true;
  if (
    !isRecord(value) ||
    !isBoundedString(value.manufacturer, 160) ||
    !isBoundedString(value.curveId, 160) ||
    !isBoundedString(value.referenceUrl, 500) ||
    !Array.isArray(value.points) ||
    value.points.length < 1 ||
    value.points.length > 100
  )
    return false;
  let previousCurrent = 0;
  for (const point of value.points) {
    if (
      !isRecord(point) ||
      !isPositive(point.prospectiveCurrentAmps) ||
      !isPositive(point.maximumI2tAmpSquaredSeconds) ||
      point.prospectiveCurrentAmps <= previousCurrent
    )
      return false;
    previousCurrent = point.prospectiveCurrentAmps;
  }
  return true;
}

function validBreakerProtectionModel(value: unknown): boolean {
  if (!isRecord(value) || !isBoundedString(value.referenceId, 200)) return false;
  if (value.family === "legacy_educational_inverse_time")
    return (
      value.referenceId === "legacy:v1-generic-inverse-time-not-a-standard" &&
      value.claim === "educational" &&
      isPositive(value.tripSecondsAt200Percent)
    );
  if (value.family === "iec_60898_1")
    return ["B", "C", "D"].includes(String(value.curve)) && value.claim === "standards_envelope";
  if (value.family !== "manufacturer_curve") return false;
  if (
    !["UL 489", "IEC 60947-2"].includes(String(value.productStandard)) ||
    !isBoundedString(value.manufacturer, 160) ||
    !isBoundedString(value.curveId, 160) ||
    value.claim !== "educational" ||
    !Array.isArray(value.points) ||
    value.points.length < 1 ||
    value.points.length > 100
  )
    return false;
  let previousMultiple = 0;
  for (const point of value.points) {
    if (
      !isRecord(point) ||
      !isPositive(point.currentMultiple) ||
      !isPositive(point.maxTripSeconds) ||
      point.currentMultiple <= previousMultiple
    )
      return false;
    previousMultiple = point.currentMultiple;
  }
  return true;
}

function validateConnection(value: unknown, components: readonly CircuitComponent[]): void {
  if (!isRecord(value) || !isBoundedString(value.id, 128)) invalid("Invalid connection identity.");
  if (!isTerminalReference(value.from) || !isTerminalReference(value.to))
    invalid("Invalid connection endpoint.");
  assertConnection(value as unknown as CircuitConnection, components);
}

function validateFault(value: unknown, components: readonly CircuitComponent[]): void {
  if (
    !isRecord(value) ||
    !isBoundedString(value.id, 128) ||
    typeof value.active !== "boolean" ||
    !isBoundedString(value.type, 40)
  )
    invalid("Invalid fault identity.");
  if (value.type === "open_component") {
    if (!isBoundedString(value.componentId, 128)) throw new SimulatorError("component_not_found");
    const component = components.find((entry) => entry.id === value.componentId);
    if (!component) throw new SimulatorError("component_not_found");
    if (component.kind === "supply") invalid("Use an open-terminal fault to isolate a supply.");
    return;
  }
  if (value.type === "open_terminal") {
    if (!isTerminalReference(value.terminal)) invalid("Invalid open-terminal fault.");
    assertTerminalExists(value.terminal as TerminalReference, components);
    return;
  }
  if (value.type === "impedance_bridge") {
    if (
      !isTerminalReference(value.from) ||
      !isTerminalReference(value.to) ||
      !isPositive(value.resistanceOhms) ||
      (value.reactanceOhms !== undefined && !isFiniteNumber(value.reactanceOhms)) ||
      (value.capacitanceMicrofarads !== undefined &&
        (!isPositive(value.capacitanceMicrofarads) || value.capacitanceMicrofarads > 1_000)) ||
      (value.faultKind !== undefined &&
        !["line_neutral", "line_earth", "high_impedance_earth", "residual_current"].includes(
          String(value.faultKind),
        )) ||
      (value.enclosureComponentId !== undefined &&
        !isBoundedString(value.enclosureComponentId, 128)) ||
      (value.touchReference !== undefined && !isTerminalReference(value.touchReference))
    )
      invalid("Invalid impedance-bridge fault.");
    assertTerminalExists(value.from as TerminalReference, components);
    assertTerminalExists(value.to as TerminalReference, components);
    if (
      value.enclosureComponentId !== undefined &&
      !components.some((component) => component.id === value.enclosureComponentId)
    )
      throw new SimulatorError("component_not_found");
    if (value.touchReference !== undefined)
      assertTerminalExists(value.touchReference as TerminalReference, components);
    return;
  }
  if (value.type === "terminal_swap") {
    if (
      !isBoundedString(value.componentId, 128) ||
      !isBoundedString(value.firstTerminalId, 64) ||
      !isBoundedString(value.secondTerminalId, 64) ||
      value.firstTerminalId === value.secondTerminalId
    )
      invalid("Invalid terminal-swap fault.");
    assertTerminalExists(
      { componentId: value.componentId, terminalId: value.firstTerminalId },
      components,
    );
    assertTerminalExists(
      { componentId: value.componentId, terminalId: value.secondTerminalId },
      components,
    );
    return;
  }
  invalid("Unknown fault type.");
}

function assertTerminalExists(
  reference: TerminalReference,
  components: readonly CircuitComponent[],
): void {
  const component = components.find((entry) => entry.id === reference.componentId);
  if (!component) throw new SimulatorError("component_not_found");
  if (!getTerminal(component, reference.terminalId)) throw new SimulatorError("terminal_not_found");
}

function faultReferencesComponent(fault: CircuitFault, componentId: string): boolean {
  if (fault.type === "open_component" || fault.type === "terminal_swap")
    return fault.componentId === componentId;
  if (fault.type === "open_terminal") return fault.terminal.componentId === componentId;
  return fault.from.componentId === componentId || fault.to.componentId === componentId;
}

function assertConnection(
  connection: CircuitConnection,
  components: readonly CircuitComponent[],
): void {
  if (
    connection.from.componentId === connection.to.componentId &&
    connection.from.terminalId === connection.to.terminalId
  )
    invalid("A terminal cannot connect to itself.");
  const fromComponent = components.find(
    (component) => component.id === connection.from.componentId,
  );
  const toComponent = components.find((component) => component.id === connection.to.componentId);
  if (!fromComponent || !toComponent) throw new SimulatorError("component_not_found");
  const fromTerminal = getTerminal(fromComponent, connection.from.terminalId);
  const toTerminal = getTerminal(toComponent, connection.to.terminalId);
  if (!fromTerminal || !toTerminal) throw new SimulatorError("terminal_not_found");
  if (!terminalDomainsCompatible(fromTerminal, toTerminal))
    throw new SimulatorError("incompatible_terminal", `${fromTerminal.id} → ${toTerminal.id}`);
}

function terminalDomainsCompatible(left: TerminalDefinition, right: TerminalDefinition): boolean {
  if (left.domain !== right.domain) return false;
  if (left.domain !== "power") return true;
  const acRoles = new Set(["line", "neutral"]);
  const dcRoles = new Set(["dc_positive", "dc_negative"]);
  return (
    (acRoles.has(left.role) && acRoles.has(right.role)) ||
    (dcRoles.has(left.role) && dcRoles.has(right.role))
  );
}

function assertEntitled(component: CircuitComponent, entitlements: ReadonlySet<string>): void {
  if (component.pro && !entitlements.has("simulator.pro")) throw new SimulatorError("pro_required");
}

function isTerminalReference(value: unknown): boolean {
  return (
    isRecord(value) &&
    isBoundedString(value.componentId, 128) &&
    isBoundedString(value.terminalId, 64)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isPositive(value: unknown): value is number {
  return isFiniteNumber(value) && value > 0;
}

function isNonNegative(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0;
}

function invalid(detail: string): never {
  throw new SimulatorError("invalid_circuit", detail);
}

const acTerminal = (id: string, label: string, role: "line" | "neutral"): TerminalDefinition => ({
  id,
  label,
  role,
  domain: "power",
});

const branchTerminals = (): readonly TerminalDefinition[] => [
  acTerminal("in", "IN", "line"),
  acTerminal("out", "OUT", "line"),
];

export function createVerticalSliceCircuit(
  input: {
    supplyFamily?: SupplyFamily;
    loadResistanceOhms?: number;
    breakerFailure?: boolean;
  } = {},
): CircuitDocument {
  const supplyFamily = input.supplyFamily ?? "us_110_120";
  const profile = getSupplyProfile(supplyFamily);
  const components: CircuitComponent[] = [
    {
      id: "supply",
      kind: "supply",
      label: `${profile.shortLabel} ${profile.nominalVoltage} V supply`,
      system: "ac_single_phase",
      frequencyHz: profile.defaultFrequencyHz,
      windings: [
        {
          id: "line-neutral",
          positiveTerminalId: "line",
          referenceTerminalId: "neutral",
          voltage: profile.nominalVoltage,
          phaseDegrees: 0,
        },
      ],
      terminals: [acTerminal("line", "L", "line"), acTerminal("neutral", "N", "neutral")],
    },
    {
      id: "breaker",
      kind: "breaker",
      label: "15 A educational breaker",
      fromTerminalId: "in",
      toTerminalId: "out",
      terminals: branchTerminals(),
      ratingAmps: 15,
      resistanceOhms: 0.005,
      protectionModel:
        supplyFamily === "international_230_240"
          ? {
              family: "iec_60898_1",
              curve: "B",
              referenceId: "IEC 60898-1:2015+A1:2019",
              claim: "standards_envelope",
            }
          : {
              family: "manufacturer_curve",
              productStandard: "UL 489",
              manufacturer: "ElectraSim educational fixture",
              curveId: "UL489-DEMO-15A-v1",
              points: [
                { currentMultiple: 1.35, maxTripSeconds: 120 },
                { currentMultiple: 2, maxTripSeconds: 8 },
                { currentMultiple: 8, maxTripSeconds: 0.01 },
              ],
              referenceId: "fixture:UL489-DEMO-15A-v1-not-for-design",
              claim: "educational",
            },
      failureMode: input.breakerFailure ? "failed_to_open" : "none",
    },
    {
      id: "conductor",
      kind: "conductor",
      label: "Branch conductor",
      fromTerminalId: "in",
      toTerminalId: "out",
      terminals: branchTerminals(),
      resistanceOhms: 0.08,
      thermalMassJPerC: 18,
      coolingWattsPerC: 0.08,
      insulationLimitC: 75,
      openFailureLimitC: 105,
    },
    {
      id: "load",
      kind: "resistive_load",
      label: "Resistive load",
      fromTerminalId: "line",
      toTerminalId: "neutral",
      terminals: [acTerminal("line", "L", "line"), acTerminal("neutral", "N", "neutral")],
      resistanceOhms: input.loadResistanceOhms ?? 12,
    },
  ];
  const connection = (
    id: string,
    fromComponentId: string,
    fromTerminalId: string,
    toComponentId: string,
    toTerminalId: string,
  ): CircuitConnection => ({
    id,
    from: { componentId: fromComponentId, terminalId: fromTerminalId },
    to: { componentId: toComponentId, terminalId: toTerminalId },
  });
  const circuit: CircuitDocument = {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    title: "Protected resistive branch circuit",
    supplyFamily,
    revision: 1,
    components,
    connections: [
      connection("wire-1", "supply", "line", "breaker", "in"),
      connection("wire-2", "breaker", "out", "conductor", "in"),
      connection("wire-3", "conductor", "out", "load", "line"),
      connection("wire-4", "load", "neutral", "supply", "neutral"),
    ],
    faults: [],
  };
  validateCircuitDocument(circuit);
  return circuit;
}
