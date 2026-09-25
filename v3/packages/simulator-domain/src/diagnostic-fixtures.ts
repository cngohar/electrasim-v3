import { createVerticalSliceCircuit } from "./circuit.ts";
import { createFaultLoopFixture } from "./fault-fixtures.ts";
import type { CircuitDocument, ConductorComponent } from "./model.ts";

export type DiagnosticFaultFixtureId =
  | "open_cpc"
  | "high_resistance_joint"
  | "neutral_earth_bond"
  | "insulation_damage"
  | "parallel_path";

/** Deterministic training fixtures; these are not pass/fail limits for field installations. */
export function createDiagnosticFaultFixture(id: DiagnosticFaultFixtureId): CircuitDocument {
  if (id === "open_cpc") {
    const base = createFaultLoopFixture({
      arrangement: "TN-S",
      openProtectiveEarth: true,
      residualProtection: false,
    });
    return { ...base, title: "Open CPC continuity exercise", faults: base.faults.slice(0, 1) };
  }
  if (id === "neutral_earth_bond") {
    const base = createFaultLoopFixture({ arrangement: "TN-S", residualProtection: false });
    return {
      ...base,
      title: "Unintended neutral-earth bond exercise",
      faults: [
        {
          id: "neutral-earth-bond",
          type: "impedance_bridge",
          from: { componentId: "source", terminalId: "neutral" },
          to: { componentId: "cpc-enclosure", terminalId: "out" },
          resistanceOhms: 0.4,
          faultKind: "residual_current",
          active: true,
        },
      ],
    };
  }
  if (id === "insulation_damage") {
    const base = createFaultLoopFixture({ arrangement: "TN-S", residualProtection: false });
    const fault = base.faults.find((entry) => entry.type === "impedance_bridge");
    if (!fault || fault.type !== "impedance_bridge") throw new Error("fault fixture missing");
    return {
      ...base,
      title: "Damaged insulation resistance exercise",
      faults: [{ ...fault, resistanceOhms: 2_000_000, capacitanceMicrofarads: 1 }],
    };
  }
  const base = createVerticalSliceCircuit();
  const conductor = base.components.find(
    (component): component is ConductorComponent => component.kind === "conductor",
  );
  if (!conductor) throw new Error("conductor fixture missing");
  if (id === "high_resistance_joint") {
    return {
      ...base,
      title: "High-resistance joint continuity exercise",
      components: base.components.map((component) =>
        component.id === conductor.id ? { ...conductor, resistanceOhms: 5 } : component,
      ),
    };
  }
  const parallel: ConductorComponent = {
    ...conductor,
    id: "parallel-conductor",
    label: "Equal-resistance parallel conductor",
  };
  return {
    ...base,
    title: "Parallel-path continuity exercise",
    components: [...base.components, parallel],
    connections: [
      ...base.connections,
      {
        id: "parallel-in",
        from: { componentId: conductor.id, terminalId: conductor.fromTerminalId },
        to: { componentId: parallel.id, terminalId: parallel.fromTerminalId },
      },
      {
        id: "parallel-out",
        from: { componentId: conductor.id, terminalId: conductor.toTerminalId },
        to: { componentId: parallel.id, terminalId: parallel.toTerminalId },
      },
    ],
  };
}
