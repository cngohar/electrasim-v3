import type { CircuitDocument, ConductorComponent } from "./model.ts";
import type { SimulationRun } from "./simulation.ts";

export type EvaluationConfidence =
  | "physical"
  | "educational_approximation"
  | "reviewed_rule"
  | "manufacturer_specific"
  | "not_evaluated";

export interface InstallationRuleResult {
  readonly id: string;
  readonly subjectId?: string;
  readonly status: "pass" | "fail" | "warning" | "not_evaluated";
  readonly confidence: EvaluationConfidence;
  readonly standardProfile: string;
  readonly version: string;
  readonly message: string;
  readonly evidence?: Readonly<Record<string, number | string | boolean | null>>;
}

/**
 * Educational rule evidence is deliberately separate from network physics and product behavior.
 * A pass is only for the named check; it is never an installation compliance certificate.
 */
export function evaluateInstallationRules(
  circuit: CircuitDocument,
  run: SimulationRun,
): readonly InstallationRuleResult[] {
  const results: InstallationRuleResult[] = [
    {
      id: "topology.declared",
      status: circuit.earthingArrangement ? "pass" : "not_evaluated",
      confidence: circuit.earthingArrangement ? "physical" : "not_evaluated",
      standardProfile: circuit.rulePackId ?? "none",
      version: "schema-v2",
      message: circuit.earthingArrangement
        ? `Physical topology is explicitly declared as ${circuit.earthingArrangement}.`
        : "Earthing topology is not declared.",
    },
  ];
  const last = run.snapshots.at(-1);
  const maximumFaultI2t = Math.max(
    0,
    ...Object.values(last?.faults ?? {}).map((fault) => fault.i2tAmpSquaredSeconds),
  );
  for (const conductor of circuit.components.filter(
    (component): component is ConductorComponent => component.kind === "conductor",
  )) {
    if (conductor.crossSectionMm2 === undefined || conductor.adiabaticK === undefined) continue;
    const permitted = (conductor.adiabaticK * conductor.crossSectionMm2) ** 2;
    results.push({
      id: "iec.adiabatic_conductor_withstand",
      subjectId: conductor.id,
      status: maximumFaultI2t <= permitted ? "pass" : "fail",
      confidence: "reviewed_rule",
      standardProfile: "IEC 60364-4-43 / IEC 60364-5-54 educational check",
      version: "public-guide-reviewed-2026-09-25",
      message:
        maximumFaultI2t <= permitted
          ? "Solved fault I²t does not exceed the conductor adiabatic limit."
          : "Solved fault I²t exceeds the conductor adiabatic limit.",
      evidence: {
        observedI2tAmpSquaredSeconds: maximumFaultI2t,
        permittedI2tAmpSquaredSeconds: permitted,
        crossSectionMm2: conductor.crossSectionMm2,
        adiabaticK: conductor.adiabaticK,
      },
    });
  }

  for (const breaker of circuit.components.filter(
    (component) => component.kind === "breaker" && component.letThroughCurve !== undefined,
  )) {
    if (breaker.kind !== "breaker") continue;
    const prospective = Math.max(
      0,
      ...Object.values(run.snapshots[0]?.faults ?? {}).map(
        (fault) => fault.prospectiveFaultCurrentAmps,
      ),
    );
    const maximumI2t = evaluateManufacturerLetThrough(breaker, prospective);
    results.push({
      id: "manufacturer.breaker_let_through",
      subjectId: breaker.id,
      status: maximumI2t === null ? "not_evaluated" : "pass",
      confidence: maximumI2t === null ? "not_evaluated" : "manufacturer_specific",
      standardProfile: breaker.letThroughCurve?.manufacturer ?? "none",
      version: breaker.letThroughCurve?.curveId ?? "none",
      message:
        maximumI2t === null
          ? "Prospective current is outside the supplied manufacturer let-through range."
          : "Manufacturer-specific maximum let-through I²t is available at the solved prospective current.",
      evidence: { prospectiveCurrentAmps: prospective, maximumI2tAmpSquaredSeconds: maximumI2t },
    });
  }

  if (circuit.earthingArrangement === "TT") evaluateTt(circuit, results);
  if (circuit.earthingArrangement === "TN-S") evaluateTn(run, results);
  if (circuit.earthingArrangement === "TN-C-S") evaluateTncs(circuit, run, results);
  if (circuit.earthingArrangement === "IT") evaluateIt(circuit, run, results);
  if (circuit.earthingArrangement === "north_american_grounded")
    evaluateNorthAmerican(circuit, run, results);

  results.push({
    id: "jurisdiction.complete_compliance",
    status: "not_evaluated",
    confidence: "not_evaluated",
    standardProfile: circuit.rulePackId ?? "none",
    version: "v0.2",
    message:
      "Complete jurisdictional compliance is not evaluated; field verification and the applicable adopted code remain required.",
  });
  return results;
}

function evaluateTt(circuit: CircuitDocument, results: InstallationRuleResult[]): void {
  const electrode = circuit.components.find(
    (component) =>
      component.kind === "conductor" && component.protectiveFunction === "earth_electrode",
  );
  const residual = circuit.components.find((component) => component.kind === "residual_device");
  if (
    !electrode ||
    electrode.kind !== "conductor" ||
    !residual ||
    residual.kind !== "residual_device"
  ) {
    results.push({
      id: "iec.tt.residual_protection",
      status: "fail",
      confidence: "reviewed_rule",
      standardProfile: "IEC-derived TT educational rule",
      version: "public-guide-reviewed-2026-09-25",
      message: "TT fixture has no explicit electrode or residual protective device.",
    });
    return;
  }
  const product =
    electrode.resistanceOhms * (residual.protectionModel.ratedResidualMilliamps / 1_000);
  results.push({
    id: "iec.tt.ra_times_idn",
    status: product <= 50 ? "pass" : "fail",
    confidence: "reviewed_rule",
    standardProfile: "IEC-derived TT educational rule",
    version: "public-guide-reviewed-2026-09-25",
    message: `Modeled RA × IΔn is ${product.toFixed(3)} V against the public 50 V relationship.`,
    evidence: {
      electrodeOhms: electrode.resistanceOhms,
      residualAmps: residual.protectionModel.ratedResidualMilliamps / 1_000,
      productVolts: product,
    },
  });
}

function evaluateTn(run: SimulationRun, results: InstallationRuleResult[]): void {
  const cleared = Object.values(run.snapshots.at(-1)?.faults ?? {}).some(
    (fault) => fault.status === "cleared",
  );
  results.push({
    id: "iec.tn.automatic_disconnection",
    status: cleared ? "pass" : "warning",
    confidence: "educational_approximation",
    standardProfile: "IEC-derived TN educational rule",
    version: "public-guide-reviewed-2026-09-25",
    message: cleared
      ? "The solved TN fault operated a protective device. Prescribed jurisdictional time is not evaluated."
      : "The solved TN fault did not clear during the run.",
  });
}

function evaluateTncs(
  circuit: CircuitDocument,
  run: SimulationRun,
  results: InstallationRuleResult[],
): void {
  const openPen = circuit.faults.some(
    (fault) => fault.active && fault.type === "open_component" && fault.componentId === "pen",
  );
  const hazard = Object.values(run.snapshots.at(-1)?.faults ?? {}).some(
    (fault) => fault.status === "persistent_danger",
  );
  results.push({
    id: "iec.tncs.pen_continuity",
    subjectId: "pen",
    status: openPen ? "fail" : "pass",
    confidence: "reviewed_rule",
    standardProfile: "IEC-derived TN-C-S educational rule",
    version: "public-guide-reviewed-2026-09-25",
    message: openPen
      ? "The PEN is interrupted; downstream protective and neutral functions are both compromised."
      : "The modeled PEN path is continuous. Mechanical and field requirements are not evaluated.",
    evidence: { openPen, persistentDanger: hazard },
  });
}

function evaluateIt(
  circuit: CircuitDocument,
  run: SimulationRun,
  results: InstallationRuleResult[],
): void {
  const monitor = circuit.components.find((component) => component.kind === "insulation_monitor");
  const alarmed = run.events.some((event) => event.type === "monitor.insulation_alarm");
  const secondFault = circuit.faults.some((fault) => fault.id === "second-fault" && fault.active);
  const cleared = Object.values(run.snapshots.at(-1)?.faults ?? {}).some(
    (fault) => fault.status === "cleared",
  );
  const electrode = circuit.components.find(
    (component) =>
      component.kind === "conductor" && component.protectiveFunction === "earth_electrode",
  );
  const firstFaultCurrent = run.snapshots[0]?.faults.fault?.prospectiveFaultCurrentAmps;
  if (electrode?.kind === "conductor" && firstFaultCurrent !== undefined && !secondFault) {
    const product = electrode.resistanceOhms * firstFaultCurrent;
    results.push({
      id: "iec.it.first_fault_touch_relationship",
      subjectId: electrode.id,
      status: product <= 50 ? "pass" : "fail",
      confidence: "reviewed_rule",
      standardProfile: "IEC-derived IT educational rule",
      version: "public-guide-reviewed-2026-09-25",
      message: `Modeled Id × RA is ${product.toFixed(3)} V against the public 50 V relationship.`,
      evidence: {
        firstFaultCurrentAmps: firstFaultCurrent,
        electrodeOhms: electrode.resistanceOhms,
        productVolts: product,
      },
    });
  }
  results.push({
    id: "iec.it.insulation_monitoring",
    ...(monitor ? { subjectId: monitor.id } : {}),
    status: monitor && alarmed ? "pass" : "fail",
    confidence: "reviewed_rule",
    standardProfile: "IEC-derived IT educational rule",
    version: "public-guide-reviewed-2026-09-25",
    message:
      monitor && alarmed
        ? "The first insulation fault produced a persistent monitor alarm without treating continued service as repaired."
        : "Required first-fault insulation monitoring evidence is absent.",
  });
  if (secondFault)
    results.push({
      id: "iec.it.second_fault_disconnection",
      status: cleared ? "pass" : "fail",
      confidence: "educational_approximation",
      standardProfile: "IEC-derived IT educational rule",
      version: "public-guide-reviewed-2026-09-25",
      message: cleared
        ? "The modeled second fault was automatically disconnected."
        : "The modeled second fault remained energized.",
    });
}

function evaluateNorthAmerican(
  circuit: CircuitDocument,
  run: SimulationRun,
  results: InstallationRuleResult[],
): void {
  const openEgc = circuit.faults.some(
    (fault) =>
      fault.active && fault.type === "open_component" && fault.componentId === "cpc-enclosure",
  );
  const hazard = Object.values(run.snapshots.at(-1)?.faults ?? {}).some(
    (fault) => fault.status === "persistent_danger",
  );
  results.push({
    id: "osha.equipment_grounding_path",
    subjectId: "cpc-enclosure",
    status: openEgc ? "fail" : "pass",
    confidence: "reviewed_rule",
    standardProfile: "OSHA 29 CFR 1910.304 educational evaluation",
    version: "e-CFR/public-guidance-reviewed-2026-09-25",
    message: openEgc
      ? "The equipment grounding path is open; GFCI behavior does not restore conductor continuity."
      : "The modeled equipment grounding path is permanent and continuous within this fixture.",
    evidence: { openEquipmentGround: openEgc, persistentDanger: hazard },
  });
}

export function evaluateManufacturerLetThrough(
  breaker: Extract<CircuitDocument["components"][number], { kind: "breaker" }>,
  prospectiveCurrentAmps: number,
): number | null {
  const points = breaker.letThroughCurve?.points;
  if (!points || points.length === 0) return null;
  const first = points[0];
  const last = points.at(-1);
  if (
    !first ||
    !last ||
    prospectiveCurrentAmps < first.prospectiveCurrentAmps ||
    prospectiveCurrentAmps > last.prospectiveCurrentAmps
  )
    return null;
  for (let index = 1; index < points.length; index += 1) {
    const lower = points[index - 1];
    const upper = points[index];
    if (!lower || !upper || prospectiveCurrentAmps > upper.prospectiveCurrentAmps) continue;
    const position =
      (Math.log(prospectiveCurrentAmps) - Math.log(lower.prospectiveCurrentAmps)) /
      (Math.log(upper.prospectiveCurrentAmps) - Math.log(lower.prospectiveCurrentAmps));
    return Math.exp(
      Math.log(lower.maximumI2tAmpSquaredSeconds) +
        position *
          (Math.log(upper.maximumI2tAmpSquaredSeconds) -
            Math.log(lower.maximumI2tAmpSquaredSeconds)),
    );
  }
  return null;
}
