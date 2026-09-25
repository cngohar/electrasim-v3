import type { CircuitDocument } from "./model.ts";

export type SimulatorLessonId = "build_protected_lamp" | "diagnose_open_cpc" | "insulation_fault";

export interface SimulatorLesson {
  readonly id: SimulatorLessonId;
  readonly title: string;
  readonly summary: string;
  readonly instructorTemplate: boolean;
  readonly steps: readonly string[];
}

export interface LessonEvaluation {
  readonly lessonId: SimulatorLessonId;
  readonly completed: boolean;
  readonly checks: readonly { readonly label: string; readonly passed: boolean }[];
}

export const simulatorLessons: readonly SimulatorLesson[] = [
  {
    id: "build_protected_lamp",
    title: "Build a protected lamp circuit",
    summary: "Author, wire, run, and inspect a source–protection–conductor–load circuit.",
    instructorTemplate: true,
    steps: [
      "Place a regional supply, breaker, conductor, and lamp.",
      "Wire an explicit closed path without inferred connections.",
      "Run the circuit and inspect voltage, current, and protection evidence.",
    ],
  },
  {
    id: "diagnose_open_cpc",
    title: "Find an open protective conductor",
    summary:
      "Use prove–isolate–lock–test–re-prove and continuity evidence to locate an open CPC/EGC.",
    instructorTemplate: true,
    steps: [
      "Load the open CPC / EGC diagnostic exercise.",
      "Complete safe isolation in the required order.",
      "Attach probes and obtain an OPEN continuity result before repair.",
      "Close work and release the lock only after stored energy is zero.",
    ],
  },
  {
    id: "insulation_fault",
    title: "Measure damaged insulation",
    summary:
      "Select a test voltage, observe insulation resistance, and complete automatic discharge.",
    instructorTemplate: true,
    steps: [
      "Load the insulation-damage exercise and establish safe isolation.",
      "Test the fault path using an educational insulation-test voltage.",
      "Wait for automatic discharge before releasing the lock.",
    ],
  },
];

export function evaluateSimulatorLesson(
  lessonId: SimulatorLessonId,
  circuit: CircuitDocument,
): LessonEvaluation {
  const kinds = new Set(circuit.components.map((component) => component.kind));
  const session = circuit.diagnosticSession;
  const checks =
    lessonId === "build_protected_lamp"
      ? [
          { label: "Supply placed", passed: kinds.has("supply") },
          { label: "Protection placed", passed: kinds.has("breaker") },
          { label: "Conductor placed", passed: kinds.has("conductor") },
          { label: "Lamp or resistive load placed", passed: kinds.has("resistive_load") },
          { label: "At least four explicit wires", passed: circuit.connections.length >= 4 },
        ]
      : lessonId === "diagnose_open_cpc"
        ? [
            {
              label: "Open CPC/EGC fixture present",
              passed: circuit.faults.some(
                (fault) =>
                  fault.type === "open_component" &&
                  circuit.components.some(
                    (component) =>
                      component.id === fault.componentId &&
                      component.kind === "conductor" &&
                      ["cpc", "equipment_grounding_conductor"].includes(
                        component.protectiveFunction ?? "",
                      ),
                  ),
              ),
            },
            { label: "Safe isolation locked", passed: session?.locked === true },
            {
              label: "Indicator re-proved",
              passed: session?.indicatorProvedAfter === true,
            },
            {
              label: "Diagnostic probes attached",
              passed: Boolean(session?.probeFrom && session.probeTo),
            },
          ]
        : [
            {
              label: "Insulation fault present",
              passed: circuit.faults.some(
                (fault) => fault.type === "impedance_bridge" && fault.resistanceOhms >= 100_000,
              ),
            },
            { label: "Safe isolation locked", passed: session?.locked === true },
            {
              label: "Insulation source selected",
              passed: Boolean(session?.insulationTestVoltage),
            },
            {
              label: "Stored energy discharged",
              passed: session?.storedChargeVolts === 0 && session.dischargeRemainingMs === 0,
            },
          ];
  return { lessonId, completed: checks.every((check) => check.passed), checks };
}
