import { getSupplyProfile } from "./catalog.ts";
import { applyCircuitCommand } from "./circuit.ts";
import {
  type CircuitComponent,
  type CircuitDocument,
  type DiagnosticSession,
  getTerminal,
  SimulatorError,
  type TerminalReference,
  terminalKey,
} from "./model.ts";
import { solveSteadyState } from "./solver.ts";

export type DiagnosticAction =
  | {
      readonly type: "begin";
      readonly isolationComponentId: string;
      readonly pointOfWorkComponentId: string;
    }
  | { readonly type: "prove_indicator_before" }
  | { readonly type: "isolate_and_lock" }
  | { readonly type: "test_for_dead" }
  | { readonly type: "reprove_indicator" }
  | {
      readonly type: "set_probes";
      readonly from: TerminalReference;
      readonly to: TerminalReference;
    }
  | { readonly type: "null_leads"; readonly measuredLeadResistanceOhms: number }
  | { readonly type: "run_continuity" }
  | { readonly type: "run_insulation"; readonly testVoltage: 50 | 100 | 250 | 500 | 1000 }
  | { readonly type: "advance_discharge"; readonly elapsedMs: number }
  | { readonly type: "release_lock" }
  | { readonly type: "reset" };

export interface DiagnosticResult {
  readonly circuit: CircuitDocument;
  readonly session: DiagnosticSession;
  readonly message: string;
  readonly measurement?: {
    readonly quantity: "voltage" | "resistance" | "insulation_resistance";
    readonly value: number;
    readonly unit: "V" | "ohm" | "Mohm";
    readonly status: "normal" | "open" | "inhibited" | "discharging";
    readonly parallelPathWarning?: boolean;
  };
}

export function defaultDiagnosticSession(): DiagnosticSession {
  return {
    state: "idle",
    locked: false,
    indicatorProvedBefore: false,
    indicatorProvedAfter: false,
    deadChecks: [],
    leadResistanceOhms: 0.2,
    leadsNulled: false,
    insulationTestVoltage: 500,
    storedChargeVolts: 0,
    dischargeRemainingMs: 0,
  };
}

export function applyDiagnosticAction(
  circuit: CircuitDocument,
  action: DiagnosticAction,
): DiagnosticResult {
  const current = circuit.diagnosticSession ?? defaultDiagnosticSession();
  if (action.type === "reset")
    return persist(
      circuit,
      defaultDiagnosticSession(),
      "Diagnostic workflow reset. Treat the circuit as energized until isolation is re-established.",
    );
  if (action.type === "begin") {
    const isolation = circuit.components.find(
      (component) => component.id === action.isolationComponentId,
    );
    const work = circuit.components.find(
      (component) => component.id === action.pointOfWorkComponentId,
    );
    if (!isolation || !work) throw new SimulatorError("component_not_found");
    if (!hasBranch(isolation) || isolation.kind === "resistive_load")
      throw new SimulatorError(
        "invalid_circuit",
        "Choose a switching or protective branch as the isolation point.",
      );
    return persist(
      circuit,
      {
        ...defaultDiagnosticSession(),
        state: "identified",
        isolationComponentId: isolation.id,
        pointOfWorkComponentId: work.id,
      },
      "Isolation point and point of work identified. Prove the voltage indicator before isolation.",
    );
  }
  requireIdentified(current);
  if (action.type === "release_lock") {
    if (
      !current.locked ||
      !current.indicatorProvedAfter ||
      current.storedChargeVolts > 0 ||
      current.dischargeRemainingMs > 0 ||
      !["ready_for_dead_testing", "testing"].includes(current.state)
    )
      invalidSequence(
        "Complete dead testing, re-prove the indicator, and discharge stored energy before releasing the lock.",
      );
    return persist(
      circuit,
      defaultDiagnosticSession(),
      "Diagnostic work closed and the educational lock released. Inspect repairs and protection before controlled re-energization.",
    );
  }
  if (action.type === "prove_indicator_before") {
    if (current.state !== "identified") invalidSequence("Prove-before must follow identification.");
    const voltage = getSupplyProfile(circuit.supplyFamily).nominalVoltage;
    return persist(
      circuit,
      { ...current, state: "indicator_proved_before", indicatorProvedBefore: true },
      `Two-pole indicator proved on the educational ${voltage} V known source.`,
      { quantity: "voltage", value: voltage, unit: "V", status: "normal" },
    );
  }
  if (action.type === "isolate_and_lock") {
    if (current.state !== "indicator_proved_before" || !current.indicatorProvedBefore)
      invalidSequence("The indicator must be proved before lockout.");
    return persist(
      circuit,
      { ...current, state: "isolated_locked", locked: true },
      "Isolation is open and locked in the educational workflow. Absence of voltage is not yet proven.",
    );
  }
  if (action.type === "test_for_dead") {
    if (current.state !== "isolated_locked" || !current.locked)
      invalidSequence("Lock the identified isolation point before testing for dead.");
    const checks = deadChecks(circuit, current);
    const available = checks.filter((check) => check.volts !== null);
    if (available.length < 1 || available.some((check) => (check.volts ?? Infinity) > 30))
      throw new SimulatorError(
        "invalid_circuit",
        "Hazardous voltage remains or no valid conductor combination is available.",
      );
    return persist(
      circuit,
      { ...current, state: "dead_checked", deadChecks: checks },
      "Available conductor combinations read below the 30 V educational inhibition boundary. Re-prove the indicator.",
      {
        quantity: "voltage",
        value: Math.max(...available.map((check) => check.volts ?? 0)),
        unit: "V",
        status: "normal",
      },
    );
  }
  if (action.type === "reprove_indicator") {
    if (current.state !== "dead_checked")
      invalidSequence("Test for dead before re-proving the indicator.");
    const voltage = getSupplyProfile(circuit.supplyFamily).nominalVoltage;
    return persist(
      circuit,
      {
        ...current,
        state: "ready_for_dead_testing",
        indicatorProvedAfter: true,
      },
      "Indicator re-proved. The modeled circuit is ready for bounded dead testing.",
      { quantity: "voltage", value: voltage, unit: "V", status: "normal" },
    );
  }
  if (action.type === "set_probes") {
    requireReady(current);
    assertReference(circuit, action.from);
    assertReference(circuit, action.to);
    return persist(
      circuit,
      { ...current, probeFrom: action.from, probeTo: action.to },
      "Diagnostic probes attached. Confirm the selected test before applying a test source.",
    );
  }
  if (action.type === "null_leads") {
    requireReady(current);
    if (
      !Number.isFinite(action.measuredLeadResistanceOhms) ||
      action.measuredLeadResistanceOhms < 0 ||
      action.measuredLeadResistanceOhms > 10
    )
      throw new SimulatorError("invalid_circuit", "Lead resistance must be between 0 and 10 ohms.");
    return persist(
      circuit,
      { ...current, leadResistanceOhms: action.measuredLeadResistanceOhms, leadsNulled: true },
      `Test leads nulled at ${action.measuredLeadResistanceOhms.toFixed(2)} Ω.`,
    );
  }
  if (action.type === "run_continuity") {
    requireReady(current);
    const [from, to] = requireProbes(current);
    assertDeadAtProbes(circuit, current, from, to);
    const path = shortestResistance(circuit, current, from, to);
    const raw = path.resistanceOhms + current.leadResistanceOhms;
    const value = current.leadsNulled ? Math.max(0, raw - current.leadResistanceOhms) : raw;
    return persist(
      circuit,
      { ...current, state: "testing" },
      path.resistanceOhms === Infinity
        ? "Continuity test reports an open path."
        : `Continuity test measured ${value.toFixed(3)} Ω${path.parallelPathWarning ? "; a parallel path may influence the reading" : ""}.`,
      {
        quantity: "resistance",
        value: path.resistanceOhms === Infinity ? 0 : value,
        unit: "ohm",
        status: path.resistanceOhms === Infinity ? "open" : "normal",
        ...(path.parallelPathWarning ? { parallelPathWarning: true } : {}),
      },
    );
  }
  if (action.type === "run_insulation") {
    requireReady(current);
    const [from, to] = requireProbes(current);
    assertDeadAtProbes(circuit, current, from, to);
    const matchedFault = circuit.faults.find(
      (candidate) =>
        candidate.type === "impedance_bridge" &&
        candidate.active &&
        ((sameReference(candidate.from, from) && sameReference(candidate.to, to)) ||
          (sameReference(candidate.from, to) && sameReference(candidate.to, from))),
    );
    const fault = matchedFault?.type === "impedance_bridge" ? matchedFault : undefined;
    const resistanceOhms = fault?.resistanceOhms ?? 10_000_000_000;
    const capacitanceMicrofarads = fault?.capacitanceMicrofarads ?? 0.2;
    const dischargeRemainingMs = Math.max(100, Math.round(500 * capacitanceMicrofarads));
    return persist(
      circuit,
      {
        ...current,
        state: "discharging",
        insulationTestVoltage: action.testVoltage,
        storedChargeVolts: action.testVoltage,
        dischargeRemainingMs,
      },
      `Insulation test measured ${(resistanceOhms / 1_000_000).toFixed(2)} MΩ. Automatic discharge is required before release.`,
      {
        quantity: "insulation_resistance",
        value: resistanceOhms / 1_000_000,
        unit: "Mohm",
        status: "discharging",
      },
    );
  }
  if (action.type === "advance_discharge") {
    if (current.state !== "discharging") invalidSequence("No stored diagnostic charge is present.");
    if (!Number.isFinite(action.elapsedMs) || action.elapsedMs <= 0 || action.elapsedMs > 60_000)
      throw new SimulatorError("invalid_circuit", "Discharge interval is invalid.");
    const remaining = Math.max(0, current.dischargeRemainingMs - action.elapsedMs);
    const fraction =
      current.dischargeRemainingMs > 0 ? remaining / current.dischargeRemainingMs : 0;
    const storedChargeVolts = current.storedChargeVolts * fraction;
    return persist(
      circuit,
      {
        ...current,
        state: remaining === 0 ? "ready_for_dead_testing" : "discharging",
        dischargeRemainingMs: remaining,
        storedChargeVolts: remaining === 0 ? 0 : storedChargeVolts,
      },
      remaining === 0
        ? "Automatic discharge complete; stored test voltage is zero."
        : "Automatic discharge is still in progress.",
      {
        quantity: "voltage",
        value: remaining === 0 ? 0 : storedChargeVolts,
        unit: "V",
        status: remaining === 0 ? "normal" : "discharging",
      },
    );
  }
  throw new SimulatorError("invalid_circuit", "Unknown diagnostic action.");
}

function persist(
  circuit: CircuitDocument,
  session: DiagnosticSession,
  message: string,
  measurement?: DiagnosticResult["measurement"],
): DiagnosticResult {
  const updated = applyCircuitCommand(circuit, { type: "set_diagnostic_session", session }).circuit;
  return { circuit: updated, session, message, ...(measurement ? { measurement } : {}) };
}

function requireIdentified(session: DiagnosticSession): void {
  if (!session.isolationComponentId || !session.pointOfWorkComponentId)
    invalidSequence("Begin by identifying isolation and work points.");
}

function requireReady(session: DiagnosticSession): void {
  if (session.state !== "ready_for_dead_testing" && session.state !== "testing")
    invalidSequence("Complete prove-isolate-lock-test-reprove before dead testing.");
  if (!session.locked || !session.indicatorProvedBefore || !session.indicatorProvedAfter)
    invalidSequence("Safe-isolation evidence is incomplete.");
  if (session.storedChargeVolts > 0 || session.dischargeRemainingMs > 0)
    invalidSequence("Stored test voltage must discharge before another operation.");
}

function invalidSequence(detail: string): never {
  throw new SimulatorError("invalid_circuit", detail);
}

function hasBranch(
  component: CircuitComponent,
): component is CircuitComponent & { fromTerminalId: string; toTerminalId: string } {
  return "fromTerminalId" in component && "toTerminalId" in component;
}

function assertReference(circuit: CircuitDocument, reference: TerminalReference): void {
  const component = circuit.components.find((entry) => entry.id === reference.componentId);
  if (!component) throw new SimulatorError("component_not_found");
  if (!getTerminal(component, reference.terminalId)) throw new SimulatorError("terminal_not_found");
}

function requireProbes(
  session: DiagnosticSession,
): readonly [TerminalReference, TerminalReference] {
  if (!session.probeFrom || !session.probeTo)
    throw new SimulatorError("invalid_circuit", "Attach both diagnostic probes first.");
  return [session.probeFrom, session.probeTo];
}

function isolatedSolution(circuit: CircuitDocument, session: DiagnosticSession) {
  return solveSteadyState(circuit, {
    openComponentIds: new Set(session.isolationComponentId ? [session.isolationComponentId] : []),
  });
}

function voltageAt(
  solution: ReturnType<typeof solveSteadyState>,
  reference: TerminalReference,
): number {
  return solution.nodeVoltages[terminalKey(reference)] ?? 0;
}

function deadChecks(
  circuit: CircuitDocument,
  session: DiagnosticSession,
): DiagnosticSession["deadChecks"] {
  const work = circuit.components.find(
    (component) => component.id === session.pointOfWorkComponentId,
  );
  if (!work) throw new SimulatorError("component_not_found");
  const find = (role: string) => work.terminals.find((terminal) => terminal.role === role);
  const line = find("line");
  const neutral = find("neutral");
  const earth = find("protective_earth");
  const solution = isolatedSolution(circuit, session);
  const difference = (left: typeof line, right: typeof line): number | null =>
    left && right
      ? Math.abs(
          voltageAt(solution, { componentId: work.id, terminalId: left.id }) -
            voltageAt(solution, { componentId: work.id, terminalId: right.id }),
        )
      : null;
  return [
    { combination: "line_neutral", volts: difference(line, neutral) },
    { combination: "line_earth", volts: difference(line, earth) },
    { combination: "neutral_earth", volts: difference(neutral, earth) },
  ];
}

function assertDeadAtProbes(
  circuit: CircuitDocument,
  session: DiagnosticSession,
  from: TerminalReference,
  to: TerminalReference,
): void {
  const solution = isolatedSolution(circuit, session);
  const volts = Math.abs(voltageAt(solution, from) - voltageAt(solution, to));
  if (volts > 30)
    throw new SimulatorError(
      "invalid_circuit",
      `Dead test inhibited: ${volts.toFixed(1)} V remains at the probes.`,
    );
}

function sameReference(left: TerminalReference, right: TerminalReference): boolean {
  return left.componentId === right.componentId && left.terminalId === right.terminalId;
}

function shortestResistance(
  circuit: CircuitDocument,
  session: DiagnosticSession,
  from: TerminalReference,
  to: TerminalReference,
): { resistanceOhms: number; parallelPathWarning: boolean } {
  const graph = new Map<string, { node: string; resistance: number }[]>();
  const add = (left: string, right: string, resistance: number) => {
    graph.set(left, [...(graph.get(left) ?? []), { node: right, resistance }]);
    graph.set(right, [...(graph.get(right) ?? []), { node: left, resistance }]);
  };
  for (const connection of circuit.connections)
    add(terminalKey(connection.from), terminalKey(connection.to), 0);
  for (const component of circuit.components) {
    if (
      component.id === session.isolationComponentId ||
      component.kind === "supply" ||
      component.kind === "enclosure" ||
      component.kind === "clamp_meter"
    )
      continue;
    if (component.kind === "junction" || component.kind === "busbar") {
      const first = component.terminals[0];
      if (first)
        for (const terminal of component.terminals.slice(1))
          add(`${component.id}:${first.id}`, `${component.id}:${terminal.id}`, 0);
      continue;
    }
    if (component.kind === "switch" && !component.closed) continue;
    if (hasBranch(component))
      add(
        `${component.id}:${component.fromTerminalId}`,
        `${component.id}:${component.toTerminalId}`,
        component.resistanceOhms,
      );
  }
  const start = terminalKey(from),
    finish = terminalKey(to);
  const distances = new Map<string, number>([[start, 0]]),
    visited = new Set<string>();
  let parallelPathWarning = false;
  while (true) {
    const current = [...distances.entries()]
      .filter(([node]) => !visited.has(node))
      .sort((a, b) => a[1] - b[1])[0];
    if (!current) break;
    const [node, distance] = current;
    if (node === finish) break;
    visited.add(node);
    for (const edge of graph.get(node) ?? []) {
      const candidate = distance + edge.resistance;
      const previous = distances.get(edge.node);
      if (
        previous !== undefined &&
        !visited.has(edge.node) &&
        Math.abs(previous - candidate) < 1e-9
      )
        parallelPathWarning = true;
      if (previous === undefined || candidate < previous) distances.set(edge.node, candidate);
    }
  }
  return { resistanceOhms: distances.get(finish) ?? Infinity, parallelPathWarning };
}
