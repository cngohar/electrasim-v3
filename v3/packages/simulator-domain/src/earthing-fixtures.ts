import { validateCircuitDocument } from "./circuit.ts";
import { createFaultLoopFixture } from "./fault-fixtures.ts";
import type {
  CircuitComponent,
  CircuitConnection,
  CircuitDocument,
  ConductorComponent,
  InsulationMonitorComponent,
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

/** TN-C-S with a modeled upstream PEN and downstream N/PE split. */
export function createTncsFixture(options: { readonly openPen?: boolean } = {}): CircuitDocument {
  const base = createFaultLoopFixture({ arrangement: "TN-S", residualProtection: false });
  const pen: ConductorComponent = {
    id: "pen",
    kind: "conductor",
    label: options.openPen ? "Interrupted upstream PEN" : "Upstream PEN conductor",
    terminals: [
      powerTerminal("in", "PEN source", "neutral"),
      powerTerminal("out", "PEN service", "neutral"),
    ],
    fromTerminalId: "in",
    toTerminalId: "out",
    resistanceOhms: 0.12,
    reactanceOhms: 0.03,
    protectiveFunction: "pen",
    crossSectionMm2: 16,
    adiabaticK: 115,
    thermalMassJPerC: 40,
    coolingWattsPerC: 0.15,
    insulationLimitC: 120,
    openFailureLimitC: 250,
  };
  const split: ConductorComponent = {
    id: "pen-split",
    kind: "conductor",
    label: "Service PEN split to N and PE",
    terminals: [powerTerminal("in", "PEN/N", "neutral"), earthTerminal("out", "PE")],
    fromTerminalId: "in",
    toTerminalId: "out",
    resistanceOhms: 0.01,
    reactanceOhms: 0.001,
    protectiveFunction: "source_bond",
    crossSectionMm2: 16,
    adiabaticK: 115,
    thermalMassJPerC: 80,
    coolingWattsPerC: 0.2,
    insulationLimitC: 150,
    openFailureLimitC: 300,
  };
  const components: CircuitComponent[] = [...base.components, pen, split];
  const connections: CircuitConnection[] = [
    ...base.connections.filter(
      (connection) => !["load-neutral", "source-earth-cpc"].includes(connection.id),
    ),
    wire("source-pen", "source", "neutral", "pen", "in"),
    wire("pen-load-neutral", "pen", "out", "load", "neutral"),
    wire("pen-split-link", "pen", "out", "pen-split", "in"),
    wire("split-cpc", "pen-split", "out", "cpc-enclosure", "in"),
  ];
  const circuit: CircuitDocument = {
    ...base,
    title: options.openPen ? "TN-C-S open-PEN hazard fixture" : "TN-C-S earth-fault fixture",
    earthingArrangement: "TN-C-S",
    components,
    connections,
    faults: [
      ...(options.openPen
        ? [{ id: "open-pen", type: "open_component" as const, componentId: "pen", active: true }]
        : []),
      ...base.faults.map((fault) =>
        fault.type === "impedance_bridge"
          ? { ...fault, touchReference: { componentId: "source", terminalId: "earth" } }
          : fault,
      ),
    ],
  };
  validateCircuitDocument(circuit);
  return circuit;
}

/**
 * Impedance-earthed IT educational fixture. The first fault alarms without opening; a second
 * fault on another live conductor creates a high-current loop that overcurrent protection clears.
 */
export function createItFixture(options: { readonly secondFault?: boolean } = {}): CircuitDocument {
  const base = createFaultLoopFixture({ arrangement: "TT", residualProtection: false });
  const monitor: InsulationMonitorComponent = {
    id: "imd",
    kind: "insulation_monitor",
    label: "Permanent insulation monitoring device",
    terminals: [powerTerminal("system", "System", "neutral"), earthTerminal("earth", "Earth")],
    fromTerminalId: "system",
    toTerminalId: "earth",
    resistanceOhms: 1_000_000_000,
    monitoredFaultIds: ["fault"],
    alarmThresholdMilliamps: 10,
  };
  const components = base.components.map((component): CircuitComponent => {
    if (component.id === "source-bond" && component.kind === "conductor")
      return {
        ...component,
        label: "IT source-to-earth limiting impedance",
        resistanceOhms: 3_500,
        reactanceOhms: 0,
        protectiveFunction: "neutral_earthing_impedance",
      };
    if (component.id === "cpc-enclosure" && component.kind === "conductor")
      return {
        ...component,
        label: "IT equipotential PE and installation electrode",
        resistanceOhms: 1,
        protectiveFunction: "earth_electrode",
      };
    return component;
  });
  components.push(monitor);
  const circuit: CircuitDocument = {
    ...base,
    title: options.secondFault ? "IT simultaneous second-fault fixture" : "IT first-fault fixture",
    earthingArrangement: "IT",
    components,
    connections: [
      ...base.connections,
      wire("imd-system", "source", "neutral", "imd", "system"),
      wire("imd-earth", "source", "earth", "imd", "earth"),
    ],
    faults: [
      ...base.faults,
      ...(options.secondFault
        ? [
            {
              id: "second-fault",
              type: "impedance_bridge" as const,
              from: { componentId: "source", terminalId: "neutral" },
              to: { componentId: "cpc-enclosure", terminalId: "in" },
              resistanceOhms: 0.2,
              reactanceOhms: 0.01,
              faultKind: "line_earth" as const,
              enclosureComponentId: "cpc-enclosure",
              touchReference: { componentId: "cpc-enclosure", terminalId: "in" },
              active: true,
            },
          ]
        : []),
    ],
  };
  validateCircuitDocument(circuit);
  return circuit;
}

/** North American grounded 120 V branch with service bond, EGC, UL 489 data boundary and Class A GFCI. */
export function createNorthAmericanGroundedFixture(
  options: { readonly openEquipmentGround?: boolean; readonly gfci?: boolean } = {},
): CircuitDocument {
  const gfci = options.gfci ?? true;
  const base = createFaultLoopFixture({ arrangement: "TN-S", residualProtection: gfci });
  const components = base.components.map((component): CircuitComponent => {
    if (component.kind === "supply")
      return {
        ...component,
        label: "120 V grounded source",
        frequencyHz: 60,
        windings: component.windings.map((winding) => ({
          ...winding,
          voltage: 120,
          sourceImpedance: { resistanceOhms: 0.08, reactanceOhms: 0.04 },
        })),
      };
    if (component.kind === "breaker")
      return {
        ...component,
        label: "15 A UL 489 fixture breaker",
        ratingAmps: 15,
        protectionModel: {
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
      };
    if (component.kind === "residual_device")
      return {
        ...component,
        label: "Class A GFCI",
        protectionModel: {
          family: "ul_943_class_a",
          ratedResidualMilliamps: 5,
          referenceId: "UL 943 Class A / OSHA public threshold",
          claim: "standards_envelope",
        },
      };
    if (component.id === "source-bond" && component.kind === "conductor")
      return {
        ...component,
        label: "Service neutral-ground bond",
        resistanceOhms: 0.02,
        protectiveFunction: "source_bond",
      };
    if (component.id === "cpc-enclosure" && component.kind === "conductor")
      return {
        ...component,
        label: "Equipment grounding conductor and enclosure",
        resistanceOhms: 0.12,
        protectiveFunction: "equipment_grounding_conductor",
      };
    if (component.kind === "resistive_load") return { ...component, resistanceOhms: 24 };
    return component;
  });
  const circuit: CircuitDocument = {
    ...base,
    title: options.openEquipmentGround
      ? "North American open-EGC hazard fixture"
      : "North American grounded-system fault fixture",
    supplyFamily: "us_110_120",
    rulePackId: "us_nec_2026_educational",
    earthingArrangement: "north_american_grounded",
    components,
    faults: [
      ...(options.openEquipmentGround
        ? [
            {
              id: "open-egc",
              type: "open_component" as const,
              componentId: "cpc-enclosure",
              active: true,
            },
          ]
        : []),
      ...base.faults,
    ],
  };
  validateCircuitDocument(circuit);
  return circuit;
}
