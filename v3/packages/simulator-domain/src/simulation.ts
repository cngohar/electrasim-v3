import {
  type CircuitComponent,
  type CircuitDocument,
  type ConductorComponent,
  type DamageState,
  type ProtectionState,
  SimulatorError,
  terminalKey,
} from "./model.ts";
import { componentCurrent, type SteadyStateSolution, solveSteadyState } from "./solver.ts";
import { evaluateBreakerTrip, evaluateResidualTrip } from "./standards.ts";

export type SimulationEventType =
  | "simulation.started"
  | "fault.applied"
  | "fault.current_started"
  | "fault.enclosure_hazard"
  | "fault.persistent_danger"
  | "fault.deenergized"
  | "arc.interrupted"
  | "path.energized"
  | "protection.pickup"
  | "protection.accumulating"
  | "protection.tripped"
  | "protection.failed_to_open"
  | "monitor.insulation_alarm"
  | "motor.inrush_started"
  | "motor.inrush_settled"
  | "control.coil_energized"
  | "control.coil_released"
  | "conductor.heating"
  | "conductor.insulation_damaged"
  | "conductor.failed_open"
  | "conductor.cooling"
  | "component.repaired";

export interface SimulationEvent {
  readonly schemaVersion: 1;
  readonly sequence: number;
  readonly atMs: number;
  readonly type: SimulationEventType;
  readonly componentId?: string;
  readonly faultId?: string;
  readonly message: string;
}

export interface ComponentSimulationState {
  readonly componentId: string;
  readonly voltage: number;
  readonly currentAmps: number;
  readonly powerWatts: number;
  readonly temperatureC?: number;
  readonly damage?: DamageState;
  readonly protection?: ProtectionState;
  readonly monitor?: "normal" | "alarm";
  readonly measurement?: {
    readonly quantity: "voltage" | "current";
    readonly value: number;
    readonly unit: "V" | "A";
    readonly status: "normal" | "open_lead" | "out_of_range" | "no_target";
  };
  readonly energized: boolean;
}

export interface FaultSimulationState {
  readonly faultId: string;
  readonly prospectiveFaultCurrentAmps: number;
  readonly currentAmps: number;
  readonly touchPotentialVolts: number | null;
  readonly i2tAmpSquaredSeconds: number;
  readonly damageBeforeIsolation: boolean;
  readonly status: "inactive" | "energized" | "cleared" | "persistent_danger";
  readonly visual: "none" | "arc" | "earth_leakage" | "enclosure_hazard";
}

export interface SimulationSnapshot {
  readonly atMs: number;
  /** Compatibility summary; detailed authority is in `components`. */
  readonly voltage: number;
  readonly currentAmps: number;
  readonly powerWatts: number;
  readonly conductorTemperatureC: number;
  readonly damage: DamageState;
  readonly protection: ProtectionState;
  readonly energized: boolean;
  readonly repairRequired: boolean;
  readonly nodeVoltages: Readonly<Record<string, number>>;
  readonly components: Readonly<Record<string, ComponentSimulationState>>;
  readonly faults: Readonly<Record<string, FaultSimulationState>>;
}

export interface ProtectionSimulationResult {
  readonly componentId: string;
  readonly modelFamily: string;
  readonly referenceId: string;
  readonly confidence: "standards_envelope" | "educational";
  readonly maximumObservedAmps: number;
  readonly clearingTimeMs: number | null;
  readonly interruption: "within_rating" | "exceeds_rating" | "not_evaluated";
}

export interface SimulationRun {
  readonly engineVersion: 0;
  readonly circuitRevision: number;
  readonly stepMs: number;
  readonly snapshots: readonly SimulationSnapshot[];
  readonly events: readonly SimulationEvent[];
  readonly protectionResults: readonly ProtectionSimulationResult[];
}

interface ConductorRuntime {
  temperatureC: number;
  damage: DamageState;
  heating: boolean;
}

interface ProtectionRuntime {
  protection: ProtectionState;
  exposureMs: number;
  pickupEmitted: boolean;
  failureEmitted: boolean;
}

function measurementFor(
  circuit: CircuitDocument,
  component: CircuitComponent,
  solution: SteadyStateSolution,
): ComponentSimulationState["measurement"] {
  if (component.kind === "clamp_meter") {
    if (!component.targetComponentId) {
      return { quantity: "current", value: 0, unit: "A", status: "no_target" };
    }
    const value = solution.components[component.targetComponentId]?.currentAmps ?? 0;
    return {
      quantity: "current",
      value,
      unit: "A",
      status: value > component.rangeAmps ? "out_of_range" : "normal",
    };
  }
  if (component.kind !== "voltmeter" && component.kind !== "ammeter") return undefined;
  const connected = (terminalId: string): boolean =>
    circuit.connections.some(
      (connection) =>
        (connection.from.componentId === component.id &&
          connection.from.terminalId === terminalId) ||
        (connection.to.componentId === component.id && connection.to.terminalId === terminalId),
    );
  const quantity = component.kind === "voltmeter" ? "voltage" : "current";
  const unit = component.kind === "voltmeter" ? "V" : "A";
  const value =
    component.kind === "voltmeter"
      ? (solution.components[component.id]?.voltage ?? 0)
      : (solution.components[component.id]?.currentAmps ?? 0);
  const range = component.kind === "voltmeter" ? component.rangeVolts : component.rangeAmps;
  return {
    quantity,
    value,
    unit,
    status:
      !connected(component.fromTerminalId) || !connected(component.toTerminalId)
        ? "open_lead"
        : value > range
          ? "out_of_range"
          : "normal",
  };
}

/**
 * Advances deterministic thermal and protection state over solved electrical snapshots.
 * The inverse-time breaker model is explicitly educational in kernel v0; rule packs will
 * replace it with reviewed device curves without changing the solver contract.
 */
export function runSimulation(
  circuit: CircuitDocument,
  durationMs: number,
  stepMs = 100,
): SimulationRun {
  if (stepMs < 10 || stepMs > 1_000 || durationMs < stepMs || durationMs > 120_000)
    throw new SimulatorError("invalid_circuit", "Simulation duration or step is out of range.");
  if (circuit.diagnosticSession?.locked)
    throw new SimulatorError(
      "invalid_circuit",
      "Normal energization is prohibited while a diagnostic isolation lock is applied.",
    );

  const conductors = circuit.components.filter(
    (component): component is ConductorComponent => component.kind === "conductor",
  );
  const breakers = circuit.components.filter((component) => component.kind === "breaker");
  const residualDevices = circuit.components.filter(
    (component) => component.kind === "residual_device",
  );
  const insulationMonitors = circuit.components.filter(
    (component) => component.kind === "insulation_monitor",
  );
  const motors = circuit.components.filter((component) => component.kind === "motor");
  const coils = circuit.components.filter((component) => component.kind === "coil");
  const protectiveDevices = [...breakers, ...residualDevices];
  const conductorRuntime = new Map<string, ConductorRuntime>(
    conductors.map((component) => [
      component.id,
      {
        temperatureC: component.ambientTemperatureC ?? 20,
        damage: "healthy" as const,
        heating: false,
      },
    ]),
  );
  const protectionRuntime = new Map<string, ProtectionRuntime>(
    protectiveDevices.map((component) => [
      component.id,
      {
        protection: "closed" as const,
        exposureMs: 0,
        pickupEmitted: false,
        failureEmitted: false,
      },
    ]),
  );
  const maximumProtectionCurrent = new Map<string, number>();
  const prospectiveFaultCurrent = new Map<string, number>();
  const faultI2t = new Map<string, number>();
  const faultWasEnergized = new Map<string, boolean>();
  const faultEverEnergized = new Set<string>();
  const enclosureHazardEmitted = new Set<string>();
  const monitorAlarmEmitted = new Set<string>();
  const motorInrushSettled = new Set<string>();
  const energizedCoils = new Set<string>();
  const events: SimulationEvent[] = [];
  const snapshots: SimulationSnapshot[] = [];
  let sequence = 0;
  let wasEnergized = false;
  const emit = (
    atMs: number,
    type: SimulationEventType,
    message: string,
    componentId?: string,
    faultId?: string,
  ) => {
    events.push({
      schemaVersion: 1,
      sequence: ++sequence,
      atMs,
      type,
      message,
      ...(componentId ? { componentId } : {}),
      ...(faultId ? { faultId } : {}),
    });
  };
  emit(0, "simulation.started", "Deterministic kernel v0 simulation started.");
  for (const motor of motors) {
    if ((motor.inrushMultiplier ?? 1) > 1 && (motor.inrushDurationMs ?? 0) > 0)
      emit(
        0,
        "motor.inrush_started",
        `Motor inrush began with a ${motor.inrushMultiplier?.toFixed(1)}× current approximation.`,
        motor.id,
      );
  }
  for (const fault of circuit.faults) {
    if (fault.active)
      emit(
        0,
        "fault.applied",
        `Physical ${fault.type} fault applied to the network.`,
        undefined,
        fault.id,
      );
  }

  for (let atMs = 0; atMs <= durationMs; atMs += stepMs) {
    const openComponentIds = new Set<string>();
    for (const [id, runtime] of protectionRuntime) {
      if (runtime.protection === "tripped") openComponentIds.add(id);
    }
    for (const [id, runtime] of conductorRuntime) {
      if (runtime.damage === "failed_open") openComponentIds.add(id);
    }
    const impedanceScaleByComponentId = new Map<string, number>();
    for (const motor of motors) {
      const multiplier = motor.inrushMultiplier ?? 1;
      const duration = motor.inrushDurationMs ?? 0;
      if (multiplier > 1 && atMs < duration)
        impedanceScaleByComponentId.set(motor.id, 1 / multiplier);
      else if (multiplier > 1 && !motorInrushSettled.has(motor.id)) {
        emit(
          atMs,
          "motor.inrush_settled",
          "Motor inrush interval ended and steady branch impedance was restored.",
          motor.id,
        );
        motorInrushSettled.add(motor.id);
      }
    }
    let electrical = solveSteadyState(circuit, { openComponentIds, impedanceScaleByComponentId });
    const closedComponentIds = new Set<string>();
    for (const coil of coils) {
      const voltage = electrical.components[coil.id]?.voltage ?? 0;
      const pickedUp = voltage >= coil.ratedVoltage * 0.85;
      if (pickedUp) {
        for (const contactId of coil.controlsContactIds) closedComponentIds.add(contactId);
        if (!energizedCoils.has(coil.id)) {
          emit(
            atMs,
            "control.coil_energized",
            `Control coil picked up at ${voltage.toFixed(1)} V and closed its assigned contacts.`,
            coil.id,
          );
          energizedCoils.add(coil.id);
        }
      } else if (energizedCoils.delete(coil.id)) {
        emit(
          atMs,
          "control.coil_released",
          `Control coil released at ${voltage.toFixed(1)} V and opened its assigned contacts.`,
          coil.id,
        );
      }
    }
    if (closedComponentIds.size > 0)
      electrical = solveSteadyState(circuit, {
        openComponentIds,
        closedComponentIds,
        impedanceScaleByComponentId,
      });
    const energized = Object.values(electrical.components).some(
      (component) => component.currentAmps !== 0,
    );
    if (energized && !wasEnergized)
      emit(atMs, "path.energized", "At least one solved current path is energized.");
    wasEnergized = energized;

    const monitorAlarmById = new Map<string, boolean>();
    for (const monitor of insulationMonitors) {
      const monitoredMilliamps =
        monitor.monitoredFaultIds.reduce(
          (total, faultId) => total + (electrical.faults[faultId]?.currentAmps ?? 0),
          0,
        ) * 1_000;
      const alarm = monitoredMilliamps >= monitor.alarmThresholdMilliamps;
      monitorAlarmById.set(monitor.id, alarm);
      if (alarm && !monitorAlarmEmitted.has(monitor.id)) {
        emit(
          atMs,
          "monitor.insulation_alarm",
          `Insulation monitor alarmed at ${monitoredMilliamps.toFixed(1)} mA; locate and clear the first fault.`,
          monitor.id,
        );
        monitorAlarmEmitted.add(monitor.id);
      }
    }
    for (const breaker of breakers)
      maximumProtectionCurrent.set(
        breaker.id,
        Math.max(
          maximumProtectionCurrent.get(breaker.id) ?? 0,
          componentCurrent(electrical, breaker),
        ),
      );
    for (const device of residualDevices) {
      const residualAmps = device.monitoredFaultIds.reduce(
        (total, faultId) => total + (electrical.faults[faultId]?.currentAmps ?? 0),
        0,
      );
      maximumProtectionCurrent.set(
        device.id,
        Math.max(maximumProtectionCurrent.get(device.id) ?? 0, residualAmps),
      );
    }
    updateProtection(atMs, stepMs, breakers, residualDevices, protectionRuntime, electrical, emit);
    updateConductors(atMs, stepMs, conductors, conductorRuntime, electrical, emit);

    const componentStates: Record<string, ComponentSimulationState> = {};
    for (const component of circuit.components) {
      const result = electrical.components[component.id] ?? {
        componentId: component.id,
        voltage: 0,
        currentAmps: 0,
        powerWatts: 0,
      };
      const conductor = conductorRuntime.get(component.id);
      const breaker = protectionRuntime.get(component.id);
      const measurement = measurementFor(circuit, component, electrical);
      componentStates[component.id] = {
        componentId: component.id,
        voltage: result.voltage,
        currentAmps: result.currentAmps,
        powerWatts: result.powerWatts,
        energized: Math.abs(result.currentAmps) > 1e-9 || Math.abs(result.voltage) > 1e-9,
        ...(conductor ? { temperatureC: conductor.temperatureC, damage: conductor.damage } : {}),
        ...(breaker ? { protection: breaker.protection } : {}),
        ...(component.kind === "insulation_monitor"
          ? {
              monitor: monitorAlarmById.get(component.id)
                ? ("alarm" as const)
                : ("normal" as const),
            }
          : {}),
        ...(measurement ? { measurement } : {}),
      };
    }

    const faultStates: Record<string, FaultSimulationState> = {};
    for (const fault of circuit.faults) {
      const result = electrical.faults[fault.id];
      const currentAmps = result?.currentAmps ?? 0;
      const touchPotentialVolts =
        fault.type === "impedance_bridge" && fault.enclosureComponentId
          ? Math.abs(
              (electrical.nodeVoltages[terminalKey(fault.to)] ?? 0) -
                (fault.touchReference
                  ? (electrical.nodeVoltages[terminalKey(fault.touchReference)] ?? 0)
                  : 0),
            )
          : null;
      if (!prospectiveFaultCurrent.has(fault.id))
        prospectiveFaultCurrent.set(fault.id, currentAmps);
      faultI2t.set(
        fault.id,
        (faultI2t.get(fault.id) ?? 0) + currentAmps * currentAmps * (stepMs / 1_000),
      );
      const faultEnergized = fault.active && currentAmps > 1e-6;
      const previouslyEnergized = faultWasEnergized.get(fault.id) ?? false;
      if (faultEnergized) faultEverEnergized.add(fault.id);
      if (faultEnergized && !previouslyEnergized) {
        emit(
          atMs,
          "fault.current_started",
          `Fault current rose to ${currentAmps.toFixed(2)} A from the solved impedance network.`,
          undefined,
          fault.id,
        );
      }
      if (
        touchPotentialVolts !== null &&
        touchPotentialVolts > 50 &&
        fault.type === "impedance_bridge" &&
        fault.enclosureComponentId &&
        !enclosureHazardEmitted.has(fault.id)
      ) {
        emit(
          atMs,
          "fault.enclosure_hazard",
          "The enclosure is energized; do not infer safety until the fault is cleared.",
          fault.enclosureComponentId,
          fault.id,
        );
        enclosureHazardEmitted.add(fault.id);
      }
      if (!faultEnergized && previouslyEnergized) {
        emit(
          atMs,
          "arc.interrupted",
          "Protective opening interrupted fault current.",
          undefined,
          fault.id,
        );
        emit(atMs, "fault.deenergized", "Solved fault current fell to zero.", undefined, fault.id);
      }
      faultWasEnergized.set(fault.id, faultEnergized);
      const earthFault =
        fault.type === "impedance_bridge" &&
        ["line_earth", "high_impedance_earth", "residual_current"].includes(fault.faultKind ?? "");
      const dangerousEnclosure = touchPotentialVolts !== null && touchPotentialVolts > 50;
      faultStates[fault.id] = {
        faultId: fault.id,
        prospectiveFaultCurrentAmps: prospectiveFaultCurrent.get(fault.id) ?? 0,
        currentAmps,
        touchPotentialVolts,
        i2tAmpSquaredSeconds: faultI2t.get(fault.id) ?? 0,
        damageBeforeIsolation: [...conductorRuntime.values()].some(
          (runtime) => runtime.damage === "insulation_damaged" || runtime.damage === "failed_open",
        ),
        status: fault.active
          ? faultEnergized || dangerousEnclosure
            ? atMs === durationMs
              ? "persistent_danger"
              : "energized"
            : faultEverEnergized.has(fault.id)
              ? "cleared"
              : "inactive"
          : "inactive",
        visual:
          faultEnergized || dangerousEnclosure
            ? fault.type === "impedance_bridge" && fault.enclosureComponentId
              ? "enclosure_hazard"
              : earthFault
                ? "earth_leakage"
                : "arc"
            : "none",
      };
      if ((faultEnergized || dangerousEnclosure) && atMs === durationMs)
        emit(
          atMs,
          "fault.persistent_danger",
          "Fault remains energized at simulation end; isolation has not been achieved.",
          fault.type === "impedance_bridge" ? fault.enclosureComponentId : undefined,
          fault.id,
        );
    }

    const primarySupply = circuit.components.find((component) => component.kind === "supply");
    const primaryLoad = circuit.components.find((component) => component.kind === "resistive_load");
    const primaryConductor = conductors[0];
    const primaryBreaker = breakers[0];
    const loadState = primaryLoad ? componentStates[primaryLoad.id] : undefined;
    const conductorState = primaryConductor ? conductorRuntime.get(primaryConductor.id) : undefined;
    const breakerState = primaryBreaker ? protectionRuntime.get(primaryBreaker.id) : undefined;
    snapshots.push({
      atMs,
      voltage: loadState?.voltage ?? (energized ? (primarySupply?.windings[0]?.voltage ?? 0) : 0),
      currentAmps: Math.abs(loadState?.currentAmps ?? 0),
      powerWatts: loadState?.powerWatts ?? 0,
      conductorTemperatureC: conductorState?.temperatureC ?? 20,
      damage: conductorState?.damage ?? "healthy",
      protection: breakerState?.protection ?? "closed",
      energized,
      repairRequired: [...conductorRuntime.values()].some(
        (runtime) => runtime.damage === "insulation_damaged" || runtime.damage === "failed_open",
      ),
      nodeVoltages: electrical.nodeVoltages,
      components: componentStates,
      faults: faultStates,
    });
  }
  const protectionResults: ProtectionSimulationResult[] = protectiveDevices.map((device) => {
    const trip = events.find(
      (event) => event.type === "protection.tripped" && event.componentId === device.id,
    );
    const model = device.protectionModel;
    const maximumObservedAmps = maximumProtectionCurrent.get(device.id) ?? 0;
    return {
      componentId: device.id,
      modelFamily: model.family,
      referenceId: model.referenceId,
      confidence: model.claim,
      maximumObservedAmps,
      clearingTimeMs: trip?.atMs ?? null,
      interruption:
        device.kind !== "breaker" || device.interruptingRatingAmps === undefined
          ? "not_evaluated"
          : maximumObservedAmps <= device.interruptingRatingAmps
            ? "within_rating"
            : "exceeds_rating",
    };
  });
  return {
    engineVersion: 0,
    circuitRevision: circuit.revision,
    stepMs,
    snapshots,
    events,
    protectionResults,
  };
}

function updateProtection(
  atMs: number,
  stepMs: number,
  breakers: readonly Extract<CircuitDocument["components"][number], { kind: "breaker" }>[],
  residualDevices: readonly Extract<
    CircuitDocument["components"][number],
    { kind: "residual_device" }
  >[],
  runtimeById: Map<string, ProtectionRuntime>,
  electrical: SteadyStateSolution,
  emit: (atMs: number, type: SimulationEventType, message: string, componentId?: string) => void,
): void {
  for (const breaker of breakers) {
    const runtime = runtimeById.get(breaker.id);
    if (!runtime || runtime.protection === "tripped") continue;
    const current = componentCurrent(electrical, breaker);
    const evaluation = evaluateBreakerTrip(breaker.protectionModel, breaker.ratingAmps, current);
    advanceProtection(
      atMs,
      stepMs,
      breaker.id,
      breaker.failureMode,
      evaluation.maximumTripSeconds,
      `${evaluation.referenceId} ${evaluation.mechanism} envelope`,
      runtime,
      emit,
    );
  }
  for (const device of residualDevices) {
    const runtime = runtimeById.get(device.id);
    if (!runtime || runtime.protection === "tripped") continue;
    const residualAmps = device.monitoredFaultIds.reduce(
      (total, faultId) => total + (electrical.faults[faultId]?.currentAmps ?? 0),
      0,
    );
    const evaluation = evaluateResidualTrip(device.protectionModel, residualAmps * 1_000);
    advanceProtection(
      atMs,
      stepMs,
      device.id,
      device.failureMode,
      evaluation.maximumTripSeconds,
      `${evaluation.referenceId} residual-current envelope`,
      runtime,
      emit,
    );
  }
}

function advanceProtection(
  atMs: number,
  stepMs: number,
  componentId: string,
  failureMode: "none" | "failed_to_open" | undefined,
  maximumTripSeconds: number | null,
  basis: string,
  runtime: ProtectionRuntime,
  emit: (atMs: number, type: SimulationEventType, message: string, componentId?: string) => void,
): void {
  if (maximumTripSeconds === null) {
    runtime.exposureMs = 0;
    runtime.pickupEmitted = false;
    if (runtime.protection === "accumulating") runtime.protection = "closed";
    return;
  }
  if (!runtime.pickupEmitted) {
    emit(atMs, "protection.pickup", `Protection picked up using ${basis}.`, componentId);
    emit(atMs, "protection.accumulating", "Protection timing has started.", componentId);
    runtime.pickupEmitted = true;
  }
  runtime.exposureMs += stepMs;
  runtime.protection = failureMode === "failed_to_open" ? "failed_to_open" : "accumulating";
  if (runtime.exposureMs + 1e-9 < maximumTripSeconds * 1_000) return;
  if (failureMode === "failed_to_open") {
    if (!runtime.failureEmitted) {
      emit(
        atMs,
        "protection.failed_to_open",
        "Protective device failed to open after pickup.",
        componentId,
      );
      runtime.failureEmitted = true;
    }
    return;
  }
  runtime.protection = "tripped";
  emit(atMs, "protection.tripped", `Protective device opened within ${basis}.`, componentId);
}

function updateConductors(
  atMs: number,
  stepMs: number,
  conductors: readonly ConductorComponent[],
  runtimeById: Map<string, ConductorRuntime>,
  electrical: SteadyStateSolution,
  emit: (atMs: number, type: SimulationEventType, message: string, componentId?: string) => void,
): void {
  for (const conductor of conductors) {
    const runtime = runtimeById.get(conductor.id);
    if (!runtime) continue;
    const current = componentCurrent(electrical, conductor);
    const heatWatts = current * current * conductor.resistanceOhms;
    const ambient = conductor.ambientTemperatureC ?? 20;
    const coolingWatts = conductor.coolingWattsPerC * Math.max(runtime.temperatureC - ambient, 0);
    runtime.temperatureC +=
      ((heatWatts - coolingWatts) / conductor.thermalMassJPerC) * (stepMs / 1_000);
    const heating = heatWatts > coolingWatts + 1e-9;
    if (heating && !runtime.heating)
      emit(atMs, "conductor.heating", "Conductor temperature is rising.", conductor.id);
    if (!heating && runtime.heating)
      emit(atMs, "conductor.cooling", "Conductor is cooling after isolation.", conductor.id);
    runtime.heating = heating;
    if (runtime.temperatureC >= conductor.openFailureLimitC && runtime.damage !== "failed_open") {
      runtime.damage = "failed_open";
      emit(
        atMs,
        "conductor.failed_open",
        "Conductor failed open after sustained thermal damage.",
        conductor.id,
      );
    } else if (
      runtime.temperatureC >= conductor.insulationLimitC &&
      runtime.damage !== "insulation_damaged" &&
      runtime.damage !== "failed_open"
    ) {
      runtime.damage = "insulation_damaged";
      emit(
        atMs,
        "conductor.insulation_damaged",
        "Insulation temperature limit exceeded; repair is required.",
        conductor.id,
      );
    } else if (heating && runtime.damage === "healthy") {
      runtime.damage = "heating";
    }
  }
}

export function repairCircuit(run: SimulationRun, atMs: number): SimulationEvent {
  return {
    schemaVersion: 1,
    sequence: run.events.length + 1,
    atMs,
    type: "component.repaired",
    message: "Damaged component replaced and service restored.",
  };
}
