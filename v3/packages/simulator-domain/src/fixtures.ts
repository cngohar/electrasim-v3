import { validateCircuitDocument } from "./circuit.ts";
import type {
  CircuitComponent,
  CircuitConnection,
  CircuitDocument,
  ResistiveLoadComponent,
  SupplyComponent,
  TerminalDefinition,
} from "./model.ts";

const terminal = (id: string, label: string, role: "line" | "neutral"): TerminalDefinition => ({
  id,
  label,
  role,
  domain: "power",
});

const load = (id: string, resistanceOhms: number): ResistiveLoadComponent => ({
  id,
  kind: "resistive_load",
  label: id,
  terminals: [terminal("a", "A", "line"), terminal("b", "B", "line")],
  fromTerminalId: "a",
  toTerminalId: "b",
  resistanceOhms,
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

export function createSplitPhaseFixture(): CircuitDocument {
  const source: SupplyComponent = {
    id: "split-source",
    kind: "supply",
    label: "120/240 V split-phase source",
    system: "ac_split_phase",
    frequencyHz: 60,
    terminals: [
      terminal("l1", "L1", "line"),
      terminal("l2", "L2", "line"),
      terminal("neutral", "N", "neutral"),
    ],
    windings: [
      {
        id: "l1-n",
        positiveTerminalId: "l1",
        referenceTerminalId: "neutral",
        voltage: 120,
        phaseDegrees: 0,
      },
      {
        id: "l2-n",
        positiveTerminalId: "l2",
        referenceTerminalId: "neutral",
        voltage: 120,
        phaseDegrees: 180,
      },
    ],
  };
  const branch = load("line-to-line-load", 24);
  const circuit: CircuitDocument = {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    title: "North American split-phase fixture",
    supplyFamily: "us_110_120",
    revision: 1,
    components: [source, branch],
    connections: [
      wire("l1-load", source.id, "l1", branch.id, "a"),
      wire("l2-load", source.id, "l2", branch.id, "b"),
    ],
    faults: [],
  };
  validateCircuitDocument(circuit);
  return circuit;
}

export function createThreePhaseFixture(): CircuitDocument {
  const source: SupplyComponent = {
    id: "three-phase-source",
    kind: "supply",
    label: "230/400 V three-phase wye source",
    system: "ac_three_phase",
    frequencyHz: 50,
    terminals: [
      terminal("l1", "L1", "line"),
      terminal("l2", "L2", "line"),
      terminal("l3", "L3", "line"),
      terminal("neutral", "N", "neutral"),
    ],
    windings: [
      {
        id: "l1-n",
        positiveTerminalId: "l1",
        referenceTerminalId: "neutral",
        voltage: 230,
        phaseDegrees: 0,
      },
      {
        id: "l2-n",
        positiveTerminalId: "l2",
        referenceTerminalId: "neutral",
        voltage: 230,
        phaseDegrees: -120,
      },
      {
        id: "l3-n",
        positiveTerminalId: "l3",
        referenceTerminalId: "neutral",
        voltage: 230,
        phaseDegrees: 120,
      },
    ],
  };
  const loads = [load("phase-1-load", 23), load("phase-2-load", 23), load("phase-3-load", 23)];
  const components: CircuitComponent[] = [source, ...loads];
  const connections = loads.flatMap((branch, index) => [
    wire(`l${index + 1}-load`, source.id, `l${index + 1}`, branch.id, "a"),
    wire(`neutral-${index + 1}`, source.id, "neutral", branch.id, "b"),
  ]);
  const circuit: CircuitDocument = {
    schemaVersion: 2,
    id: crypto.randomUUID(),
    title: "International three-phase fixture",
    supplyFamily: "international_230_240",
    revision: 1,
    components,
    connections,
    faults: [],
  };
  validateCircuitDocument(circuit);
  return circuit;
}
