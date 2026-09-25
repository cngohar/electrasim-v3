import { validateCircuitDocument } from "./circuit.ts";
import type {
  BreakerComponent,
  CircuitComponent,
  CircuitConnection,
  CircuitDocument,
  ConductorComponent,
  ResidualDeviceComponent,
  ResistiveLoadComponent,
  SupplyComponent,
  TerminalDefinition,
} from "./model.ts";

const powerTerminal = (
  id: string,
  label: string,
  role: "line" | "neutral" = "line",
): TerminalDefinition => ({ id, label, role, domain: "power" });
const earthTerminal = (id: string, label: string): TerminalDefinition => ({
  id,
  label,
  role: "protective_earth",
  domain: "protective",
});
const powerBranch = (): readonly TerminalDefinition[] => [
  powerTerminal("in", "IN"),
  powerTerminal("out", "OUT"),
];
const earthBranch = (): readonly TerminalDefinition[] => [
  earthTerminal("in", "PE IN"),
  earthTerminal("out", "PE OUT"),
];
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

export interface FaultLoopFixtureOptions {
  readonly arrangement?: "TN-S" | "TT";
  readonly fault?: "line_earth" | "high_impedance_earth" | "line_neutral";
  readonly openProtectiveEarth?: boolean;
  readonly failedBreaker?: boolean;
  readonly residualProtection?: boolean;
  readonly faultResistanceOhms?: number;
  readonly breakerCurve?: "B" | "C" | "D";
}

/**
 * Explicit educational fault-loop fixture. Earth electrode, source bond, CPC/enclosure,
 * source impedance and the fault bridge are all solved branches rather than fixed-current shortcuts.
 */
export function createFaultLoopFixture(options: FaultLoopFixtureOptions = {}): CircuitDocument {
  const arrangement = options.arrangement ?? "TT";
  const faultKind = options.fault ?? "line_earth";
  const residualProtection = options.residualProtection ?? arrangement === "TT";
  const faultResistance =
    options.faultResistanceOhms ?? (faultKind === "high_impedance_earth" ? 1_000 : 0.2);
  const source: SupplyComponent = {
    id: "source",
    kind: "supply",
    label: "230 V source with Thevenin impedance",
    system: "ac_single_phase",
    frequencyHz: 50,
    terminals: [
      powerTerminal("line", "L", "line"),
      powerTerminal("neutral", "N", "neutral"),
      earthTerminal("earth", "Source earth"),
    ],
    windings: [
      {
        id: "line-neutral",
        positiveTerminalId: "line",
        referenceTerminalId: "neutral",
        voltage: 230,
        phaseDegrees: 0,
        sourceImpedance: { resistanceOhms: 0.18, reactanceOhms: 0.08 },
      },
    ],
  };
  const breaker: BreakerComponent = {
    id: "breaker",
    kind: "breaker",
    label: `IEC 60898-1 ${options.breakerCurve ?? "B"}16`,
    terminals: powerBranch(),
    fromTerminalId: "in",
    toTerminalId: "out",
    ratingAmps: 16,
    resistanceOhms: 0.01,
    reactanceOhms: 0.002,
    interruptingRatingAmps: 6_000,
    protectionModel: {
      family: "iec_60898_1",
      curve: options.breakerCurve ?? "B",
      referenceId: "IEC 60898-1:2015+A1:2019",
      claim: "standards_envelope",
    },
    failureMode: options.failedBreaker ? "failed_to_open" : "none",
  };
  const rcd: ResidualDeviceComponent = {
    id: "rcd",
    kind: "residual_device",
    label: "IEC 61008 30 mA RCCB",
    terminals: powerBranch(),
    fromTerminalId: "in",
    toTerminalId: "out",
    resistanceOhms: 0.01,
    protectionModel: {
      family: "iec_61008_instantaneous",
      ratedResidualMilliamps: 30,
      referenceId: "IEC 61008-2-1:2024 / IEC installation-guide timing envelope",
      claim: "standards_envelope",
    },
    monitoredFaultIds: ["fault"],
  };
  const line: ConductorComponent = {
    id: "line-conductor",
    kind: "conductor",
    label: "Line conductor",
    terminals: powerBranch(),
    fromTerminalId: "in",
    toTerminalId: "out",
    resistanceOhms: 0.16,
    reactanceOhms: 0.04,
    protectiveFunction: "line",
    crossSectionMm2: 2.5,
    adiabaticK: 115,
    thermalMassJPerC: 100,
    coolingWattsPerC: 0.05,
    insulationLimitC: 70,
    openFailureLimitC: 120,
  };
  const cpc: ConductorComponent = {
    id: "cpc-enclosure",
    kind: "conductor",
    label: options.openProtectiveEarth ? "Open CPC and exposed enclosure" : "CPC and enclosure",
    terminals: earthBranch(),
    fromTerminalId: "in",
    toTerminalId: "out",
    resistanceOhms: arrangement === "TT" ? 35 : 0.22,
    reactanceOhms: 0.03,
    protectiveFunction: arrangement === "TT" ? "earth_electrode" : "cpc",
    crossSectionMm2: 2.5,
    adiabaticK: 115,
    thermalMassJPerC: arrangement === "TT" ? 20 : 100,
    coolingWattsPerC: 0.1,
    insulationLimitC: 90,
    openFailureLimitC: 180,
  };
  const sourceBond: ConductorComponent = {
    id: "source-bond",
    kind: "conductor",
    label:
      arrangement === "TT" ? "Source electrode and neutral-earth bond" : "Source bond / PE return",
    terminals: [
      powerTerminal("in", "Source neutral", "neutral"),
      earthTerminal("out", "Earth bond"),
    ],
    fromTerminalId: "in",
    toTerminalId: "out",
    resistanceOhms: arrangement === "TT" ? 1 : 0.08,
    reactanceOhms: 0.02,
    protectiveFunction: "source_bond",
    crossSectionMm2: 16,
    adiabaticK: 115,
    thermalMassJPerC: 50,
    coolingWattsPerC: 0.2,
    insulationLimitC: 120,
    openFailureLimitC: 250,
  };
  const load: ResistiveLoadComponent = {
    id: "load",
    kind: "resistive_load",
    label: "230 V load",
    terminals: [powerTerminal("line", "L", "line"), powerTerminal("neutral", "N", "neutral")],
    fromTerminalId: "line",
    toTerminalId: "neutral",
    resistanceOhms: 46,
  };
  const components: CircuitComponent[] = [
    source,
    breaker,
    ...(residualProtection ? [rcd] : []),
    line,
    cpc,
    sourceBond,
    load,
  ];
  const lineUpstream = residualProtection ? "rcd" : "breaker";
  const connections: CircuitConnection[] = [
    wire("source-breaker", "source", "line", "breaker", "in"),
    ...(residualProtection
      ? [
          wire("breaker-rcd", "breaker", "out", "rcd", "in"),
          wire("rcd-line", "rcd", "out", "line-conductor", "in"),
        ]
      : [wire("breaker-line", lineUpstream, "out", "line-conductor", "in")]),
    wire("line-load", "line-conductor", "out", "load", "line"),
    wire("load-neutral", "load", "neutral", "source", "neutral"),
    wire("source-neutral-bond", "source", "neutral", "source-bond", "in"),
    wire("bond-source-earth", "source-bond", "out", "source", "earth"),
    wire("source-earth-cpc", "source", "earth", "cpc-enclosure", "in"),
  ];
  const circuit: CircuitDocument = {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    title: `${arrangement} ${faultKind.replaceAll("_", " ")} fault-loop fixture`,
    supplyFamily: "international_230_240",
    rulePackId: "iec_international_educational_2025",
    earthingArrangement: arrangement,
    revision: 1,
    components,
    connections,
    faults: [
      ...(options.openProtectiveEarth
        ? [
            {
              id: "open-pe",
              type: "open_component" as const,
              componentId: "cpc-enclosure",
              active: true,
            },
          ]
        : []),
      {
        id: "fault",
        type: "impedance_bridge",
        from: { componentId: "line-conductor", terminalId: "out" },
        to:
          faultKind === "line_neutral"
            ? { componentId: "source", terminalId: "neutral" }
            : { componentId: "cpc-enclosure", terminalId: "out" },
        resistanceOhms: faultResistance,
        reactanceOhms: 0.01,
        faultKind,
        ...(faultKind === "line_neutral"
          ? {}
          : {
              enclosureComponentId: "cpc-enclosure",
              touchReference: { componentId: "cpc-enclosure", terminalId: "in" },
            }),
        active: true,
      },
    ],
  };
  validateCircuitDocument(circuit);
  return circuit;
}

/** Two IEC devices in series: downstream B16 clears before upstream C32 for this solved fault. */
export function createCoordinatedProtectionFixture(): CircuitDocument {
  const base = createFaultLoopFixture({ arrangement: "TN-S", residualProtection: false });
  const upstream = base.components.find((component) => component.id === "breaker");
  if (!upstream || upstream.kind !== "breaker") throw new Error("fixture breaker missing");
  const upstreamC32: BreakerComponent = {
    ...upstream,
    label: "Upstream IEC 60898-1 C32",
    ratingAmps: 32,
    protectionModel: {
      family: "iec_60898_1",
      curve: "C",
      referenceId: "IEC 60898-1:2015+A1:2019",
      claim: "standards_envelope",
    },
  };
  const downstreamB16: BreakerComponent = {
    ...upstream,
    id: "downstream-breaker",
    label: "Downstream IEC 60898-1 B16",
    ratingAmps: 16,
    protectionModel: {
      family: "iec_60898_1",
      curve: "B",
      referenceId: "IEC 60898-1:2015+A1:2019",
      claim: "standards_envelope",
    },
  };
  const circuit: CircuitDocument = {
    ...base,
    title: "IEC downstream protection coordination fixture",
    components: base.components.flatMap((component) =>
      component.id === "breaker" ? [upstreamC32, downstreamB16] : [component],
    ),
    connections: base.connections.flatMap((connection) =>
      connection.id === "breaker-line"
        ? [
            wire("upstream-downstream", "breaker", "out", "downstream-breaker", "in"),
            wire("downstream-line", "downstream-breaker", "out", "line-conductor", "in"),
          ]
        : [connection],
    ),
  };
  validateCircuitDocument(circuit);
  return circuit;
}
