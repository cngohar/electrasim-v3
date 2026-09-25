import { describe, expect, test } from "bun:test";
import {
  applyDiagnosticAction,
  type CircuitConnection,
  type CircuitDocument,
  CircuitHistory,
  createCoordinatedProtectionFixture,
  createDiagnosticFaultFixture,
  createFaultLoopFixture,
  createItFixture,
  createNorthAmericanGroundedFixture,
  createSplitPhaseFixture,
  createThreePhaseFixture,
  createTncsFixture,
  createVerticalSliceCircuit,
  evaluateBreakerTrip,
  evaluateInstallationRules,
  evaluateManufacturerLetThrough,
  evaluateResidualTrip,
  evaluateSimulatorLesson,
  getSupplyProfile,
  goldenFixtureCases,
  migrateCircuitDocument,
  runSimulation,
  SimulatorError,
  type SimulatorLessonSubmissionRepository,
  SimulatorLessonSubmissionService,
  type SimulatorProjectRepository,
  SimulatorProjectService,
  type SwitchComponent,
  simulatorProductPolicy,
  solveSteadyState,
  validateCircuitDocument,
  WorkerSimulationJobHost,
} from "@electrasim/simulator-domain";

const switchComponent = (id: string, pro = false): SwitchComponent => ({
  id,
  kind: "switch",
  label: "Isolator",
  terminals: [
    { id: "in", label: "IN", role: "line", domain: "power" },
    { id: "out", label: "OUT", role: "line", domain: "power" },
  ],
  fromTerminalId: "in",
  toTerminalId: "out",
  closed: true,
  resistanceOhms: 0.005,
  ...(pro ? { pro: true } : {}),
});

describe("deterministic simulator kernel v0", () => {
  test("runs deterministic jobs in bounded cancellable workers", async () => {
    const host = new WorkerSimulationJobHost(
      new URL("../packages/simulator-domain/src/simulation-worker.ts", import.meta.url),
      { maximumConcurrent: 1, maximumQueued: 2, timeoutMs: 5_000 },
    );
    const circuit = createVerticalSliceCircuit();
    const [first, second] = await Promise.all([
      host.run(circuit, 1_000, 100),
      host.run(circuit, 1_000, 100),
    ]);
    expect(first).toEqual(second);
    const controller = new AbortController();
    controller.abort();
    await expect(host.run(circuit, 1_000, 100, controller.signal)).rejects.toThrow(
      "simulation_cancelled",
    );
    const activeController = new AbortController();
    const activeRun = host.run(circuit, 120_000, 10, activeController.signal);
    activeController.abort();
    await expect(activeRun).rejects.toThrow("simulation_cancelled");
  });

  test("runs a 100-branch authored circuit within bounded worker limits", async () => {
    const base = createVerticalSliceCircuit();
    const sourceLoad = base.components.find((component) => component.kind === "resistive_load");
    if (!sourceLoad || sourceLoad.kind !== "resistive_load") throw new Error("load missing");
    const branches = Array.from({ length: 100 }, (_, index) => ({
      ...sourceLoad,
      id: `scale-load-${index}`,
      label: `Scale load ${index + 1}`,
      resistanceOhms: 1_200,
    }));
    const circuit: CircuitDocument = {
      ...base,
      components: [...base.components, ...branches],
      connections: [
        ...base.connections,
        ...branches.flatMap((branch, index) => [
          {
            id: `scale-line-${index}`,
            from: { componentId: "supply", terminalId: "line" },
            to: { componentId: branch.id, terminalId: branch.fromTerminalId },
          },
          {
            id: `scale-neutral-${index}`,
            from: { componentId: branch.id, terminalId: branch.toTerminalId },
            to: { componentId: "supply", terminalId: "neutral" },
          },
        ]),
      ],
    };
    validateCircuitDocument(circuit);
    const host = new WorkerSimulationJobHost(
      new URL("../packages/simulator-domain/src/simulation-worker.ts", import.meta.url),
      { maximumConcurrent: 1, maximumQueued: 1, timeoutMs: 5_000 },
    );
    const run = await host.run(circuit, 1_000, 100);
    expect(run.snapshots).toHaveLength(11);
    expect(Object.keys(run.snapshots[0]?.components ?? {})).toHaveLength(circuit.components.length);
  });

  test("produces identical snapshots and events for identical inputs", () => {
    const circuit = createVerticalSliceCircuit({ loadResistanceOhms: 3 });
    expect(runSimulation(circuit, 10_000)).toEqual(runSimulation(circuit, 10_000));
  });

  test("solves actual component voltage, current, and power", () => {
    const solution = solveSteadyState(createVerticalSliceCircuit({ loadResistanceOhms: 12 }));
    const load = solution.components.load;
    const conductor = solution.components.conductor;
    expect(load?.currentAmps).toBeCloseTo(120 / 12.085, 8);
    expect(conductor?.currentAmps).toBeCloseTo(load?.currentAmps ?? 0, 10);
    expect(load?.voltage).toBeCloseTo((load?.currentAmps ?? 0) * 12, 8);
    expect(load?.powerWatts).toBeCloseTo((load?.currentAmps ?? 0) ** 2 * 12, 8);
  });

  test("solves inductive, capacitive, and motor branch impedance as AC phasors", () => {
    const original = createVerticalSliceCircuit({ loadResistanceOhms: 12 });
    const withLoad = (load: CircuitDocument["components"][number]) => ({
      ...original,
      components: original.components.map((component) =>
        component.id === "load" ? load : component,
      ),
    });
    const base = original.components.find((component) => component.id === "load");
    if (!base || base.kind !== "resistive_load") throw new Error("fixture load missing");
    const inductive = solveSteadyState(
      withLoad({
        ...base,
        kind: "reactive_load",
        loadType: "inductive",
        resistanceOhms: 12,
        reactanceOhms: 12,
      }),
    );
    const capacitive = solveSteadyState(
      withLoad({
        ...base,
        kind: "reactive_load",
        loadType: "capacitive",
        resistanceOhms: 12,
        reactanceOhms: -12,
      }),
    );
    const motorComponent = {
      ...base,
      kind: "motor" as const,
      resistanceOhms: 12,
      reactanceOhms: 12,
      ratedMechanicalWatts: 750,
      phaseCount: 1 as const,
      inrushMultiplier: 5,
      inrushDurationMs: 500,
    };
    const motorCircuit = withLoad(motorComponent);
    const motor = solveSteadyState(motorCircuit);
    expect(inductive.components.load?.currentPhaseDegrees).toBeLessThan(0);
    expect(capacitive.components.load?.currentPhaseDegrees).toBeGreaterThan(0);
    expect(motor.components.load?.currentAmps).toBeCloseTo(
      inductive.components.load?.currentAmps ?? 0,
      8,
    );
    const transient = runSimulation(motorCircuit, 1_000, 100);
    expect(transient.events.map((event) => event.type)).toEqual(
      expect.arrayContaining(["motor.inrush_started", "motor.inrush_settled"]),
    );
    expect(transient.snapshots[0]?.components.load?.currentAmps).toBeGreaterThan(
      transient.snapshots.at(-1)?.components.load?.currentAmps ?? Infinity,
    );
  });

  test("energizes a coil and deterministically couples its assigned control contact", () => {
    const base = createVerticalSliceCircuit();
    const circuit: CircuitDocument = {
      ...base,
      components: [
        ...base.components,
        {
          id: "relay-contact",
          kind: "relay_contact",
          label: "Relay NO contact and pilot load",
          terminals: [
            { id: "in", label: "13", role: "line", domain: "power" },
            { id: "out", label: "14", role: "neutral", domain: "power" },
          ],
          fromTerminalId: "in",
          toTerminalId: "out",
          closed: false,
          resistanceOhms: 100,
        },
        {
          id: "coil",
          kind: "coil",
          label: "120 V control coil",
          terminals: [
            { id: "a1", label: "A1", role: "line", domain: "power" },
            { id: "a2", label: "A2", role: "neutral", domain: "power" },
          ],
          fromTerminalId: "a1",
          toTerminalId: "a2",
          resistanceOhms: 2_200,
          reactanceOhms: 800,
          ratedVoltage: 120,
          controlsContactIds: ["relay-contact"],
        },
      ],
      connections: [
        ...base.connections,
        {
          id: "coil-line",
          from: { componentId: "supply", terminalId: "line" },
          to: { componentId: "coil", terminalId: "a1" },
        },
        {
          id: "coil-neutral",
          from: { componentId: "coil", terminalId: "a2" },
          to: { componentId: "supply", terminalId: "neutral" },
        },
        {
          id: "contact-line",
          from: { componentId: "supply", terminalId: "line" },
          to: { componentId: "relay-contact", terminalId: "in" },
        },
        {
          id: "contact-neutral",
          from: { componentId: "relay-contact", terminalId: "out" },
          to: { componentId: "supply", terminalId: "neutral" },
        },
      ],
    };
    validateCircuitDocument(circuit);
    const run = runSimulation(circuit, 500, 100);
    expect(run.events.map((event) => event.type)).toContain("control.coil_energized");
    expect(run.snapshots[0]?.components["relay-contact"]?.currentAmps).toBeGreaterThan(1);
  });

  test("models high-impedance voltage, low-burden series, and non-invasive clamp measurements", () => {
    const base = createVerticalSliceCircuit({ loadResistanceOhms: 12 });
    const meterCircuit: CircuitDocument = {
      ...base,
      components: [
        ...base.components,
        {
          id: "voltmeter",
          kind: "voltmeter",
          label: "600 V CAT educational meter",
          terminals: [
            { id: "v", label: "V", role: "line", domain: "power" },
            { id: "com", label: "COM", role: "neutral", domain: "power" },
          ],
          fromTerminalId: "v",
          toTerminalId: "com",
          resistanceOhms: 10_000_000,
          rangeVolts: 600,
        },
        {
          id: "open-voltmeter",
          kind: "voltmeter",
          label: "Unconnected voltmeter",
          terminals: [
            { id: "v", label: "V", role: "line", domain: "power" },
            { id: "com", label: "COM", role: "neutral", domain: "power" },
          ],
          fromTerminalId: "v",
          toTerminalId: "com",
          resistanceOhms: 10_000_000,
          rangeVolts: 600,
        },
        {
          id: "ammeter",
          kind: "ammeter",
          label: "20 A series ammeter",
          terminals: [
            { id: "a", label: "A", role: "line", domain: "power" },
            { id: "com", label: "COM", role: "line", domain: "power" },
          ],
          fromTerminalId: "a",
          toTerminalId: "com",
          resistanceOhms: 0.01,
          rangeAmps: 20,
        },
        {
          id: "clamp",
          kind: "clamp_meter",
          label: "AC clamp meter",
          terminals: [
            { id: "sense-a", label: "S1", role: "measurement", domain: "measurement" },
            { id: "sense-b", label: "S2", role: "measurement", domain: "measurement" },
          ],
          targetComponentId: "conductor",
          rangeAmps: 400,
        },
      ],
      connections: [
        ...base.connections.filter((connection) => connection.id !== "wire-3"),
        {
          id: "conductor-ammeter",
          from: { componentId: "conductor", terminalId: "out" },
          to: { componentId: "ammeter", terminalId: "a" },
        },
        {
          id: "ammeter-load",
          from: { componentId: "ammeter", terminalId: "com" },
          to: { componentId: "load", terminalId: "line" },
        },
        {
          id: "meter-line",
          from: { componentId: "voltmeter", terminalId: "v" },
          to: { componentId: "supply", terminalId: "line" },
        },
        {
          id: "meter-neutral",
          from: { componentId: "voltmeter", terminalId: "com" },
          to: { componentId: "supply", terminalId: "neutral" },
        },
      ],
    };
    const run = runSimulation(meterCircuit, 100, 100);
    const snapshot = run.snapshots.at(-1);
    expect(snapshot?.components.voltmeter?.measurement).toMatchObject({
      quantity: "voltage",
      unit: "V",
      status: "normal",
    });
    expect(snapshot?.components.voltmeter?.measurement?.value).toBeCloseTo(120, 3);
    expect(snapshot?.components["open-voltmeter"]?.measurement?.status).toBe("open_lead");
    expect(snapshot?.components.ammeter?.measurement).toMatchObject({
      quantity: "current",
      unit: "A",
      status: "normal",
    });
    expect(snapshot?.components.ammeter?.measurement?.value).toBeCloseTo(
      snapshot?.components.conductor?.currentAmps ?? 0,
      8,
    );
    expect(snapshot?.components.clamp?.measurement?.value).toBeCloseTo(
      snapshot?.components.conductor?.currentAmps ?? 0,
      8,
    );
    expect(snapshot?.components.clamp?.measurement?.status).toBe("normal");
  });

  test("enforces prove-isolate-lock-test-reprove before deterministic dead testing", () => {
    let circuit = createVerticalSliceCircuit();
    let result = applyDiagnosticAction(circuit, {
      type: "begin",
      isolationComponentId: "breaker",
      pointOfWorkComponentId: "load",
    });
    circuit = result.circuit;
    expect(circuit.diagnosticSession?.state).toBe("identified");
    expect(() => applyDiagnosticAction(circuit, { type: "run_continuity" })).toThrow(
      SimulatorError,
    );
    circuit = applyDiagnosticAction(circuit, { type: "prove_indicator_before" }).circuit;
    circuit = applyDiagnosticAction(circuit, { type: "isolate_and_lock" }).circuit;
    expect(() => runSimulation(circuit, 1_000, 100)).toThrow(SimulatorError);
    result = applyDiagnosticAction(circuit, { type: "test_for_dead" });
    circuit = result.circuit;
    expect(result.measurement?.value).toBe(0);
    circuit = applyDiagnosticAction(circuit, { type: "reprove_indicator" }).circuit;
    circuit = applyDiagnosticAction(circuit, {
      type: "set_probes",
      from: { componentId: "conductor", terminalId: "in" },
      to: { componentId: "conductor", terminalId: "out" },
    }).circuit;
    circuit = applyDiagnosticAction(circuit, {
      type: "null_leads",
      measuredLeadResistanceOhms: 0.24,
    }).circuit;
    result = applyDiagnosticAction(circuit, { type: "run_continuity" });
    expect(result.measurement).toMatchObject({
      quantity: "resistance",
      unit: "ohm",
      status: "normal",
    });
    expect(result.measurement?.value).toBeCloseTo(0.08, 8);
    const released = applyDiagnosticAction(result.circuit, { type: "release_lock" });
    expect(released.session).toMatchObject({ state: "idle", locked: false });
    expect(() => runSimulation(released.circuit, 1_000, 100)).not.toThrow();
  });

  test("provides deterministic open-CPC, joint, bond, insulation, and parallel-path exercises", () => {
    const ids = [
      "open_cpc",
      "high_resistance_joint",
      "neutral_earth_bond",
      "insulation_damage",
      "parallel_path",
    ] as const;
    const fixtures = {
      open_cpc: createDiagnosticFaultFixture("open_cpc"),
      high_resistance_joint: createDiagnosticFaultFixture("high_resistance_joint"),
      neutral_earth_bond: createDiagnosticFaultFixture("neutral_earth_bond"),
      insulation_damage: createDiagnosticFaultFixture("insulation_damage"),
      parallel_path: createDiagnosticFaultFixture("parallel_path"),
    };
    expect(Object.keys(fixtures)).toEqual([...ids]);
    for (const fixture of Object.values(fixtures))
      expect(() => validateCircuitDocument(fixture)).not.toThrow();
    expect(fixtures.open_cpc.faults).toContainEqual(
      expect.objectContaining({ type: "open_component", componentId: "cpc-enclosure" }),
    );
    expect(
      fixtures.high_resistance_joint.components.find((component) => component.kind === "conductor"),
    ).toMatchObject({ resistanceOhms: 5 });
    expect(fixtures.neutral_earth_bond.faults[0]).toMatchObject({ resistanceOhms: 0.4 });
    expect(fixtures.insulation_damage.faults[0]).toMatchObject({
      resistanceOhms: 2_000_000,
      capacitanceMicrofarads: 1,
    });
    expect(
      fixtures.parallel_path.components.some((component) => component.id === "parallel-conductor"),
    ).toBe(true);
  });

  test("evaluates guided build and diagnostic lessons from persisted circuit evidence", () => {
    const build = evaluateSimulatorLesson("build_protected_lamp", createVerticalSliceCircuit());
    expect(build.completed).toBe(true);
    const openCpc = evaluateSimulatorLesson(
      "diagnose_open_cpc",
      createDiagnosticFaultFixture("open_cpc"),
    );
    expect(openCpc.completed).toBe(false);
    expect(openCpc.checks[0]).toEqual({ label: "Open CPC/EGC fixture present", passed: true });
  });

  test("persists immutable LMS lesson evidence through a repository boundary", async () => {
    const saved: Parameters<SimulatorLessonSubmissionRepository["save"]>[0][] = [];
    const repository: SimulatorLessonSubmissionRepository = {
      async save(submission) {
        saved.push(submission);
        return submission;
      },
      async listForLearner(learnerUserId) {
        return saved.filter((submission) => submission.learnerUserId === learnerUserId);
      },
    };
    const service = new SimulatorLessonSubmissionService(
      repository,
      () => "11111111-1111-4111-8111-111111111111",
      () => new Date("2026-09-25T00:00:00.000Z"),
    );
    const submission = await service.submit({
      learnerUserId: "22222222-2222-4222-8222-222222222222",
      lessonId: "build_protected_lamp",
      circuit: createVerticalSliceCircuit(),
    });
    expect(submission).toMatchObject({ completed: true, circuitRevision: 1 });
    expect(await service.listForLearner(submission.learnerUserId)).toHaveLength(1);
  });

  test("inhibits insulation tests until isolation and discharges stored test voltage", () => {
    let circuit = createFaultLoopFixture({ arrangement: "TN-S", residualProtection: false });
    circuit = {
      ...circuit,
      faults: circuit.faults.map((fault) =>
        fault.type === "impedance_bridge"
          ? { ...fault, resistanceOhms: 2_000_000, capacitanceMicrofarads: 1 }
          : fault,
      ),
    };
    circuit = applyDiagnosticAction(circuit, {
      type: "begin",
      isolationComponentId: "breaker",
      pointOfWorkComponentId: "load",
    }).circuit;
    circuit = applyDiagnosticAction(circuit, { type: "prove_indicator_before" }).circuit;
    circuit = applyDiagnosticAction(circuit, { type: "isolate_and_lock" }).circuit;
    circuit = applyDiagnosticAction(circuit, { type: "test_for_dead" }).circuit;
    circuit = applyDiagnosticAction(circuit, { type: "reprove_indicator" }).circuit;
    const fault = circuit.faults.find((entry) => entry.type === "impedance_bridge");
    expect(fault?.type).toBe("impedance_bridge");
    if (!fault || fault.type !== "impedance_bridge") throw new Error("fault fixture missing");
    circuit = applyDiagnosticAction(circuit, {
      type: "set_probes",
      from: fault.from,
      to: fault.to,
    }).circuit;
    let result = applyDiagnosticAction(circuit, { type: "run_insulation", testVoltage: 500 });
    expect(result.measurement).toMatchObject({
      quantity: "insulation_resistance",
      value: 2,
      unit: "Mohm",
      status: "discharging",
    });
    expect(result.session.storedChargeVolts).toBe(500);
    expect(() => applyDiagnosticAction(result.circuit, { type: "run_continuity" })).toThrow(
      SimulatorError,
    );
    result = applyDiagnosticAction(result.circuit, {
      type: "advance_discharge",
      elapsedMs: 500,
    });
    expect(result.session).toMatchObject({
      state: "ready_for_dead_testing",
      storedChargeVolts: 0,
      dischargeRemainingMs: 0,
    });
  });

  test("makes ideal multi-terminal bars one electrical node", () => {
    const base = createVerticalSliceCircuit();
    const busbar: CircuitDocument = {
      ...base,
      components: [
        ...base.components,
        {
          id: "neutral-bar",
          kind: "busbar",
          label: "Neutral bar",
          function: "neutral",
          terminals: ["n1", "n2", "n3", "n4"].map((id) => ({
            id,
            label: id.toUpperCase(),
            role: "neutral" as const,
            domain: "power" as const,
          })),
        },
      ],
      connections: [
        ...base.connections.filter((connection) => connection.id !== "wire-4"),
        {
          id: "load-neutral-bar",
          from: { componentId: "load", terminalId: "neutral" },
          to: { componentId: "neutral-bar", terminalId: "n1" },
        },
        {
          id: "bar-source-neutral",
          from: { componentId: "neutral-bar", terminalId: "n2" },
          to: { componentId: "supply", terminalId: "neutral" },
        },
      ],
    };
    validateCircuitDocument(busbar);
    const solution = solveSteadyState(busbar);
    expect(solution.components.load?.currentAmps).toBeGreaterThan(9);
    expect(solution.nodeVoltages["neutral-bar:n1"]).toBe(solution.nodeVoltages["neutral-bar:n4"]);
  });

  test("calculates branch-specific currents in parallel instead of applying total current everywhere", () => {
    const original = createVerticalSliceCircuit({ loadResistanceOhms: 12 });
    const load = original.components.find((component) => component.id === "load");
    if (!load || load.kind !== "resistive_load") throw new Error("load fixture missing");
    const secondLoad = { ...load, id: "load-2", label: "Second load", resistanceOhms: 24 };
    const wire = (
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
      ...original,
      components: [...original.components, secondLoad],
      connections: [
        ...original.connections,
        wire("parallel-line", "conductor", "out", "load-2", "line"),
        wire("parallel-neutral", "load-2", "neutral", "supply", "neutral"),
      ],
    };
    const solution = solveSteadyState(circuit);
    expect(Math.abs(solution.components.load?.currentAmps ?? 0)).toBeCloseTo(
      2 * Math.abs(solution.components["load-2"]?.currentAmps ?? 0),
      6,
    );
    expect(Math.abs(solution.components.conductor?.currentAmps ?? 0)).toBeCloseTo(
      Math.abs(solution.components.load?.currentAmps ?? 0) +
        Math.abs(solution.components["load-2"]?.currentAmps ?? 0),
      6,
    );
  });

  test("trips coordinated protection before permanent conductor damage", () => {
    const run = runSimulation(createVerticalSliceCircuit({ loadResistanceOhms: 3 }), 10_000);
    expect(run.events.map((event) => event.type)).toContain("protection.tripped");
    expect(run.events.map((event) => event.type)).not.toContain("conductor.insulation_damaged");
    expect(run.snapshots.at(-1)).toMatchObject({ energized: false, protection: "tripped" });
  });

  test("makes failed protection, persistent damage, and failed-open behavior explicit", () => {
    const run = runSimulation(
      createVerticalSliceCircuit({ loadResistanceOhms: 1.2, breakerFailure: true }),
      60_000,
    );
    const types = run.events.map((event) => event.type);
    expect(types).toContain("protection.failed_to_open");
    expect(types).toContain("conductor.insulation_damaged");
    expect(types).toContain("conductor.failed_open");
    expect(run.snapshots.at(-1)?.repairRequired).toBe(true);
  });

  test("lists Pakistan in the international 230 V / 50 Hz supply family", () => {
    expect(getSupplyProfile("us_110_120")).toMatchObject({
      nominalVoltage: 120,
      frequenciesHz: [60],
    });
    expect(getSupplyProfile("international_230_240")).toMatchObject({
      nominalVoltage: 230,
      defaultFrequencyHz: 50,
      regions: ["Pakistan", "IEC-derived international regions"],
    });
    expect(getSupplyProfile("international_230_240").label).toContain("Pakistan");
    expect(simulatorProductPolicy.freeSavedProjectLimit).toBe(5);
  });

  test("supports both launch supply families without treating them as compliance packs", () => {
    const us = createVerticalSliceCircuit();
    const international = createVerticalSliceCircuit({
      supplyFamily: "international_230_240",
      loadResistanceOhms: 23,
    });
    expect(us.components.find((component) => component.kind === "supply")).toMatchObject({
      frequencyHz: 60,
      windings: [{ voltage: 120, phaseDegrees: 0 }],
    });
    expect(international.components.find((component) => component.kind === "supply")).toMatchObject(
      { frequencyHz: 50, windings: [{ voltage: 230, phaseDegrees: 0 }] },
    );
  });

  test("solves North American 120/240 V split phase as opposing phasors", () => {
    const solution = solveSteadyState(createSplitPhaseFixture());
    expect(solution.nodeVoltages["split-source:l1"]).toBeCloseTo(120, 8);
    expect(solution.nodeVoltages["split-source:l2"]).toBeCloseTo(120, 8);
    expect(Math.abs(solution.nodePhasesDegrees["split-source:l2"] ?? 0)).toBeCloseTo(180, 8);
    expect(solution.components["line-to-line-load"]?.voltage).toBeCloseTo(240, 8);
    expect(solution.components["line-to-line-load"]?.currentAmps).toBeCloseTo(10, 8);
  });

  test("solves a balanced 230/400 V three-phase wye fixture", () => {
    const solution = solveSteadyState(createThreePhaseFixture());
    expect(solution.components["phase-1-load"]?.currentAmps).toBeCloseTo(10, 8);
    expect(solution.components["phase-2-load"]?.currentAmps).toBeCloseTo(10, 8);
    expect(solution.components["phase-3-load"]?.currentAmps).toBeCloseTo(10, 8);
    expect(solution.nodePhasesDegrees["three-phase-source:l2"]).toBeCloseTo(-120, 8);
    expect(solution.nodePhasesDegrees["three-phase-source:l3"]).toBeCloseTo(120, 8);
    expect(solution.supplyWindings["three-phase-source:l1-n"]?.currentAmps).toBeCloseTo(10, 8);
    expect(solution.components["three-phase-source"]?.currentAmps).toBeCloseTo(30, 8);
    expect(solution.components["three-phase-source"]?.powerWatts).toBeCloseTo(6_900, 8);
  });

  test("applies open and finite-impedance faults to the solved network", () => {
    const healthy = createVerticalSliceCircuit({ loadResistanceOhms: 12 });
    const open = solveSteadyState({
      ...healthy,
      faults: [{ id: "open-load", type: "open_component", componentId: "load", active: true }],
    });
    expect(open.components.load?.currentAmps).toBe(0);

    const faulted = solveSteadyState({
      ...healthy,
      faults: [
        {
          id: "line-neutral-bridge",
          type: "impedance_bridge",
          from: { componentId: "conductor", terminalId: "out" },
          to: { componentId: "supply", terminalId: "neutral" },
          resistanceOhms: 0.5,
          active: true,
        },
      ],
    });
    expect(faulted.faults["line-neutral-bridge"]?.currentAmps).toBeGreaterThan(200);
    expect(faulted.components.breaker?.currentAmps).toBeGreaterThan(200);
  });

  test("propagates a downstream impedance fault into protection events", () => {
    const circuit = createVerticalSliceCircuit({ loadResistanceOhms: 12 });
    const run = runSimulation(
      {
        ...circuit,
        faults: [
          {
            id: "downstream-short",
            type: "impedance_bridge",
            from: { componentId: "conductor", terminalId: "out" },
            to: { componentId: "supply", terminalId: "neutral" },
            resistanceOhms: 0.1,
            active: true,
          },
        ],
      },
      2_000,
      10,
    );
    expect(run.events).toContainEqual(
      expect.objectContaining({ type: "fault.applied", faultId: "downstream-short" }),
    );
    expect(run.events.map((event) => event.type)).toContain("protection.tripped");
  });

  test("models reversed polarity by swapping external terminal mapping", () => {
    const circuit = createVerticalSliceCircuit({ loadResistanceOhms: 12 });
    const reversed = solveSteadyState({
      ...circuit,
      faults: [
        {
          id: "reverse-load",
          type: "terminal_swap",
          componentId: "load",
          firstTerminalId: "line",
          secondTerminalId: "neutral",
          active: true,
        },
      ],
    });
    expect(reversed.components.load?.currentAmps).toBeCloseTo(120 / 12.085, 8);
    expect(Math.abs(reversed.components.load?.voltagePhaseDegrees ?? 0)).toBeCloseTo(180, 8);
  });

  test("provides reversible commands and keeps Pro components entitlement-gated", () => {
    const original = createVerticalSliceCircuit();
    const history = new CircuitHistory(original);
    const added = history.execute({
      type: "add_component",
      component: switchComponent("switch"),
      position: { x: 420, y: 180 },
    });
    expect(added.components).toHaveLength(original.components.length + 1);
    expect(added.layout?.componentPositions.switch).toEqual({ x: 420, y: 180 });
    const moved = history.execute({
      type: "set_component_position",
      componentId: "switch",
      position: { x: 510, y: 210 },
    });
    expect(moved.layout?.componentPositions.switch).toEqual({ x: 510, y: 210 });
    expect(history.undo().layout?.componentPositions.switch).toEqual({ x: 420, y: 180 });
    expect(history.undo().components).toHaveLength(original.components.length);
    expect(history.redo().components).toHaveLength(original.components.length + 1);
    expect(() =>
      history.execute({
        type: "add_component",
        component: switchComponent("advanced-relay", true),
      }),
    ).toThrow(SimulatorError);
  });

  test("persists reversible wire routes and viewport without changing electrical topology", () => {
    const original = createVerticalSliceCircuit();
    const history = new CircuitHistory(original);
    const routed = history.execute({
      type: "set_connection_route",
      connectionId: "wire-1",
      route: [
        { x: 180, y: 120 },
        { x: 220, y: 170 },
      ],
    });
    expect(routed.layout?.connectionRoutes?.["wire-1"]).toHaveLength(2);
    const framed = history.execute({
      type: "set_viewport",
      viewport: { x: 40, y: 60, width: 900, height: 488 },
    });
    expect(framed.layout?.viewport).toEqual({ x: 40, y: 60, width: 900, height: 488 });
    expect(history.undo().layout?.viewport).toBeUndefined();
    expect(history.undo().layout?.connectionRoutes?.["wire-1"]).toBeUndefined();
    expect(original.connections).toEqual(routed.connections);
  });

  test("persists and validates rotation plus real enclosure containment", () => {
    const original = createVerticalSliceCircuit();
    const enclosure = {
      id: "panel",
      kind: "enclosure" as const,
      label: "DIN distribution enclosure",
      terminals: [],
      enclosureType: "din_rail" as const,
    };
    const history = new CircuitHistory({
      ...original,
      components: [...original.components, enclosure],
      layout: {
        componentPositions: {
          panel: { x: 80, y: 60 },
          breaker: { x: 120, y: 80, rotation: 90, enclosureId: "panel" },
        },
      },
    });
    expect(history.circuit.layout?.componentPositions.breaker).toEqual({
      x: 120,
      y: 80,
      rotation: 90,
      enclosureId: "panel",
    });
    const moved = history.execute({
      type: "set_component_position",
      componentId: "breaker",
      position: { x: 140, y: 155, rotation: 180, enclosureId: "panel" },
    });
    expect(moved.layout?.componentPositions.breaker?.enclosureId).toBe("panel");
    expect(history.undo().layout?.componentPositions.breaker?.rotation).toBe(90);
    expect(() =>
      validateCircuitDocument({
        ...moved,
        layout: {
          componentPositions: {
            ...moved.layout?.componentPositions,
            breaker: { x: 140, y: 155, enclosureId: "missing-enclosure" },
          },
        },
      }),
    ).toThrow(SimulatorError);
  });

  test("accepts a blank schema-v2 authoring document but refuses invalid connections", () => {
    const circuit = createVerticalSliceCircuit();
    expect(() =>
      validateCircuitDocument({
        ...circuit,
        title: "Blank authoring circuit",
        components: [],
        connections: [],
        faults: [],
      }),
    ).not.toThrow();
  });

  test("rejects connections to missing terminals", () => {
    const circuit = createVerticalSliceCircuit();
    expect(() =>
      validateCircuitDocument({
        ...circuit,
        connections: [
          ...circuit.connections,
          {
            id: "bad-wire",
            from: { componentId: "supply", terminalId: "missing" },
            to: { componentId: "load", terminalId: "line" },
          },
        ],
      }),
    ).toThrow(SimulatorError);
  });

  test("passes the five-project free quota while Pro receives unlimited saves", async () => {
    const limits: (number | null)[] = [];
    const repository = {
      async save(input: Parameters<SimulatorProjectRepository["save"]>[0]) {
        limits.push(input.freeLimit);
        return {
          id: input.projectId,
          title: input.title,
          supplyFamily: input.circuit.supplyFamily,
          revisionNumber: 1,
          shared: false,
          shareId: null,
          updatedAt: new Date(0),
          circuit: input.circuit,
        };
      },
    } as unknown as SimulatorProjectRepository;
    const service = new SimulatorProjectService(repository, () => crypto.randomUUID());
    const circuit = createVerticalSliceCircuit();
    await service.save({
      ownerUserId: crypto.randomUUID(),
      title: "Free circuit",
      circuit,
      pro: false,
    });
    await service.save({
      ownerUserId: crypto.randomUUID(),
      title: "Pro circuit",
      circuit,
      pro: true,
    });
    expect(limits).toEqual([5, null]);
    expect(SimulatorProjectService.freeProjectLimit).toBe(5);
  });

  test("solves prospective fault current from complex source and loop impedance", () => {
    const circuit = createFaultLoopFixture({ arrangement: "TN-S", residualProtection: false });
    const solution = solveSteadyState(circuit);
    const fault = solution.faults.fault;
    expect(fault?.currentAmps).toBeGreaterThan(250);
    expect(fault?.currentAmps).toBeLessThan(275);
    expect(solution.components.breaker?.currentPhaseDegrees).toBeLessThan(0);
  });

  test("clears a TT earth fault with IEC residual protection while overcurrent protection stays selective", () => {
    const run = runSimulation(createFaultLoopFixture(), 1_000, 10);
    expect(run.events).toContainEqual(
      expect.objectContaining({ type: "protection.tripped", componentId: "rcd", atMs: 30 }),
    );
    expect(run.events).not.toContainEqual(
      expect.objectContaining({ type: "protection.tripped", componentId: "breaker" }),
    );
    expect(run.snapshots.at(-1)?.faults.fault).toMatchObject({
      status: "cleared",
      damageBeforeIsolation: false,
    });
    expect(run.protectionResults.find((result) => result.componentId === "rcd")).toMatchObject({
      modelFamily: "iec_61008_instantaneous",
      confidence: "standards_envelope",
      clearingTimeMs: 30,
    });
  });

  test("keeps an open-PE enclosure visibly dangerous even when fault current is too low to trip", () => {
    const run = runSimulation(createFaultLoopFixture({ openProtectiveEarth: true }), 1_000, 10);
    const state = run.snapshots.at(-1)?.faults.fault;
    expect(state?.prospectiveFaultCurrentAmps).toBe(0);
    expect(state?.touchPotentialVolts).toBeGreaterThan(220);
    expect(state).toMatchObject({ status: "persistent_danger", visual: "enclosure_hazard" });
    expect(run.events.map((event) => event.type)).toContain("fault.enclosure_hazard");
    expect(run.events.map((event) => event.type)).not.toContain("protection.tripped");
  });

  test("records cable damage and persistent danger when TT overcurrent protection is inadequate", () => {
    const run = runSimulation(
      createFaultLoopFixture({ residualProtection: false, failedBreaker: true }),
      3_000,
      10,
    );
    expect(run.events.map((event) => event.type)).toContain("conductor.insulation_damaged");
    expect(run.snapshots.at(-1)?.faults.fault).toMatchObject({
      damageBeforeIsolation: true,
      status: "persistent_danger",
    });
  });

  test("separates IEC B/C/D envelopes from UL 489 manufacturer curves", () => {
    const iec = evaluateBreakerTrip(
      {
        family: "iec_60898_1",
        curve: "B",
        referenceId: "IEC 60898-1:2015+A1:2019",
        claim: "standards_envelope",
      },
      16,
      80,
    );
    const ul = evaluateBreakerTrip(
      {
        family: "manufacturer_curve",
        productStandard: "UL 489",
        manufacturer: "Example manufacturer",
        curveId: "published-curve-1",
        points: [{ currentMultiple: 8, maxTripSeconds: 0.08 }],
        referenceId: "manufacturer:published-curve-1",
        claim: "educational",
      },
      16,
      80,
    );
    expect(iec.mechanism).toBe("magnetic");
    expect(iec.maximumTripSeconds).toBeCloseTo(0.1, 10);
    expect(ul).toMatchObject({ mechanism: "none", maximumTripSeconds: null });
  });

  test("selects the downstream IEC breaker before the upstream device", () => {
    const run = runSimulation(createCoordinatedProtectionFixture(), 1_000, 10);
    expect(run.events).toContainEqual(
      expect.objectContaining({ type: "protection.tripped", componentId: "downstream-breaker" }),
    );
    expect(run.events).not.toContainEqual(
      expect.objectContaining({ type: "protection.tripped", componentId: "breaker" }),
    );
    expect(run.snapshots.at(-1)?.faults.fault?.status).toBe("cleared");
  });

  test("keeps North American Class A GFCI semantics separate from IEC RCD timing", () => {
    const classA = {
      family: "ul_943_class_a" as const,
      ratedResidualMilliamps: 5,
      referenceId: "UL 943 Class A / OSHA public threshold",
      claim: "standards_envelope" as const,
    };
    expect(evaluateResidualTrip(classA, 4).shouldTrip).toBe(false);
    expect(evaluateResidualTrip(classA, 6)).toMatchObject({
      shouldTrip: true,
      maximumTripSeconds: 1.5,
    });
    expect(
      evaluateResidualTrip(
        {
          family: "iec_61008_instantaneous",
          ratedResidualMilliamps: 30,
          referenceId: "IEC 61008 timing envelope",
          claim: "standards_envelope",
        },
        150,
      ).maximumTripSeconds,
    ).toBe(0.04);
  });

  test("rejects untrusted protection curves with unsorted or nonpositive points", () => {
    const circuit = createVerticalSliceCircuit();
    const breaker = circuit.components.find((component) => component.kind === "breaker");
    if (!breaker || breaker.kind !== "breaker") throw new Error("breaker fixture missing");
    expect(() =>
      validateCircuitDocument({
        ...circuit,
        components: circuit.components.map((component) =>
          component.id === breaker.id
            ? {
                ...breaker,
                protectionModel: {
                  family: "manufacturer_curve",
                  productStandard: "UL 489",
                  manufacturer: "unsafe import",
                  curveId: "bad",
                  referenceId: "bad",
                  claim: "educational",
                  points: [
                    { currentMultiple: 8, maxTripSeconds: 0.1 },
                    { currentMultiple: 2, maxTripSeconds: -1 },
                  ],
                },
              }
            : component,
        ),
      }),
    ).toThrow(SimulatorError);
  });

  test("migrates schema v1 generic breakers without inventing a product standard", () => {
    const current = createVerticalSliceCircuit({ supplyFamily: "international_230_240" });
    const legacy = {
      ...current,
      schemaVersion: 1,
      rulePackId: undefined,
      components: current.components.map((component) => {
        if (component.kind !== "breaker") return component;
        const { protectionModel: _protectionModel, ...rest } = component;
        return { ...rest, tripSecondsAt200Percent: 2 };
      }),
    };
    const migration = migrateCircuitDocument(legacy);
    const breaker = migration.document.components.find((component) => component.kind === "breaker");
    expect(migration).toMatchObject({ migratedFrom: 1 });
    expect(migration.warnings).toHaveLength(1);
    expect(migration.document).toMatchObject({
      schemaVersion: 2,
      rulePackId: "iec_international_educational_2025",
    });
    expect(breaker).toMatchObject({
      protectionModel: {
        family: "legacy_educational_inverse_time",
        referenceId: "legacy:v1-generic-inverse-time-not-a-standard",
        claim: "educational",
      },
    });
  });

  test("migrates legacy documents before the project repository persists a revision", async () => {
    let persistedSchemaVersion = 0;
    const repository = {
      async save(input: Parameters<SimulatorProjectRepository["save"]>[0]) {
        persistedSchemaVersion = input.circuit.schemaVersion;
        return {
          id: input.projectId,
          title: input.title,
          supplyFamily: input.circuit.supplyFamily,
          revisionNumber: 1,
          shared: false,
          shareId: null,
          updatedAt: new Date(0),
          circuit: input.circuit,
        };
      },
    } as unknown as SimulatorProjectRepository;
    const current = createVerticalSliceCircuit();
    const legacy = {
      ...current,
      schemaVersion: 1,
      components: current.components.map((component) => {
        if (component.kind !== "breaker") return component;
        const { protectionModel: _protectionModel, ...rest } = component;
        return { ...rest, tripSecondsAt200Percent: 2 };
      }),
    };
    await new SimulatorProjectService(repository).save({
      ownerUserId: crypto.randomUUID(),
      title: "Imported legacy project",
      circuit: legacy,
      pro: false,
    });
    expect(persistedSchemaVersion).toBe(2);
  });

  test("rejects unknown future circuit schema versions instead of guessing", () => {
    expect(() =>
      migrateCircuitDocument({ ...createVerticalSliceCircuit(), schemaVersion: 99 }),
    ).toThrow(SimulatorError);
    try {
      migrateCircuitDocument({ ...createVerticalSliceCircuit(), schemaVersion: 99 });
    } catch (error) {
      expect(error).toMatchObject({ code: "unsupported_schema" });
    }
  });

  test("models TN-C-S PEN continuity and makes an open PEN a persistent enclosure hazard", () => {
    const healthy = runSimulation(createTncsFixture(), 2_000, 10);
    const open = runSimulation(createTncsFixture({ openPen: true }), 2_000, 10);
    expect(healthy.snapshots.at(-1)?.faults.fault?.status).toBe("cleared");
    expect(open.snapshots.at(-1)?.faults.fault).toMatchObject({
      status: "persistent_danger",
      touchPotentialVolts: 230,
    });
    expect(evaluateInstallationRules(createTncsFixture({ openPen: true }), open)).toContainEqual(
      expect.objectContaining({ id: "iec.tncs.pen_continuity", status: "fail" }),
    );
  });

  test("alarms rather than disconnecting an IT first fault and clears a modeled second fault", () => {
    const firstCircuit = createItFixture();
    const first = runSimulation(firstCircuit, 2_000, 10);
    const secondCircuit = createItFixture({ secondFault: true });
    const second = runSimulation(secondCircuit, 2_000, 10);
    expect(first.events.map((event) => event.type)).toContain("monitor.insulation_alarm");
    expect(first.events.map((event) => event.type)).not.toContain("protection.tripped");
    expect(first.snapshots.at(-1)?.faults.fault).toMatchObject({
      status: "persistent_danger",
    });
    expect(first.snapshots.at(-1)?.faults.fault?.touchPotentialVolts).toBeLessThan(1);
    expect(second.events.map((event) => event.type)).toContain("protection.tripped");
    expect(second.snapshots.at(-1)?.faults.fault?.status).toBe("cleared");
    expect(evaluateInstallationRules(secondCircuit, second)).toContainEqual(
      expect.objectContaining({ id: "iec.it.second_fault_disconnection", status: "pass" }),
    );
  });

  test("keeps the North American service bond, EGC, GFCI, and open-EGC evidence separate", () => {
    const groundedCircuit = createNorthAmericanGroundedFixture();
    const grounded = runSimulation(groundedCircuit, 2_000, 10);
    const openCircuit = createNorthAmericanGroundedFixture({ openEquipmentGround: true });
    const open = runSimulation(openCircuit, 2_000, 10);
    expect(grounded.protectionResults.map((result) => result.modelFamily)).toContain(
      "ul_943_class_a",
    );
    expect(grounded.snapshots.at(-1)?.faults.fault?.status).toBe("cleared");
    expect(open.snapshots.at(-1)?.faults.fault).toMatchObject({
      status: "persistent_danger",
    });
    expect(evaluateInstallationRules(openCircuit, open)).toContainEqual(
      expect.objectContaining({ id: "osha.equipment_grounding_path", status: "fail" }),
    );
  });

  test("uses manufacturer let-through data only inside its published current range", () => {
    const base = createFaultLoopFixture({ arrangement: "TN-S" });
    const breaker = base.components.find((component) => component.kind === "breaker");
    if (!breaker || breaker.kind !== "breaker") throw new Error("breaker missing");
    const withData = {
      ...breaker,
      letThroughCurve: {
        manufacturer: "Test manufacturer",
        curveId: "published-test-data",
        referenceUrl: "https://example.test/manufacturer-curve",
        points: [
          { prospectiveCurrentAmps: 1_000, maximumI2tAmpSquaredSeconds: 20_000 },
          { prospectiveCurrentAmps: 10_000, maximumI2tAmpSquaredSeconds: 80_000 },
        ],
      },
    };
    expect(evaluateManufacturerLetThrough(withData, 500)).toBeNull();
    expect(evaluateManufacturerLetThrough(withData, 1_000)).toBeCloseTo(20_000, 6);
    expect(evaluateManufacturerLetThrough(withData, 10_000)).toBeCloseTo(80_000, 6);
    expect(evaluateManufacturerLetThrough(withData, 20_000)).toBeNull();
    expect(evaluateManufacturerLetThrough(breaker, 2_000)).toBeNull();
    const inRangeBreaker = {
      ...breaker,
      letThroughCurve: {
        ...withData.letThroughCurve,
        points: [
          { prospectiveCurrentAmps: 100, maximumI2tAmpSquaredSeconds: 2_000 },
          { prospectiveCurrentAmps: 1_000, maximumI2tAmpSquaredSeconds: 20_000 },
        ],
      },
    };
    const circuit = {
      ...base,
      components: base.components.map((component) =>
        component.id === breaker.id ? inRangeBreaker : component,
      ),
    };
    const run = runSimulation(circuit, 1_000, 10);
    expect(evaluateInstallationRules(circuit, run)).toContainEqual(
      expect.objectContaining({
        id: "manufacturer.breaker_let_through",
        status: "pass",
        confidence: "manufacturer_specific",
      }),
    );
  });

  test("runs the 50-case fault-loop golden matrix deterministically", () => {
    expect(goldenFixtureCases).toHaveLength(50);
    for (const fixture of goldenFixtureCases) {
      const circuit = fixture.create();
      const first = runSimulation(circuit, 3_000, 10);
      const second = runSimulation(circuit, 3_000, 10);
      expect(first, fixture.id).toEqual(second);
      expect(first.snapshots.at(-1)?.faults.fault?.status, fixture.id).toBe(
        fixture.expectedFaultStatus,
      );
      if (fixture.expectedEvent)
        expect(
          first.events.map((event) => event.type),
          fixture.id,
        ).toContain(fixture.expectedEvent);
      expect(evaluateInstallationRules(circuit, first).at(-1)).toMatchObject({
        id: "jurisdiction.complete_compliance",
        status: "not_evaluated",
      });
    }
  });

  test("rejects malformed untrusted project JSON before persistence", () => {
    const repository = {} as SimulatorProjectRepository;
    const service = new SimulatorProjectService(repository);
    expect(() =>
      service.save({
        ownerUserId: crypto.randomUUID(),
        title: "Unsafe import",
        circuit: { schemaVersion: 1, title: 42 } as unknown as CircuitDocument,
        pro: false,
      }),
    ).toThrow(SimulatorError);
  });
});
