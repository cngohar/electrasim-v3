import { type CompatibilityResult, assessTerminalCompatibility } from '../core/compatibility';
import type { CompileResult } from '../core/contracts';
import { terminalId } from '../core/faultTopology';
import {
  type Phasor,
  type PhasorSimulationResult,
  phasorMagnitude,
  phasorVoltageBetween,
} from '../core/phasor';
import { assessWireCapacity } from '../core/wireCapacity';
import { FAULT_REGISTRY, normalizeCircuitFaults } from '../faults';
import type { SimulationResult } from '../types';

export interface PhasorBranchReading {
  label: string;
  voltage: Phasor | null;
  current: Phasor | null;
  activePowerWatts: number | null;
}
export interface PhasorComponentReading {
  branches: PhasorBranchReading[];
  voltagePairs: { label: string; voltage: Phasor | null }[];
  /** Current leaving source N into the network; vector sum of internal L→N branches. */
  neutralCurrent: Phasor | null;
  compatibility?: CompatibilityResult;
}

/** Presentation of complex measurements stays separate from scalar/timed currents.
 * Never supply a repair verdict, protection step, invented thermal state or a
 * scalar ElectricalSimulationResult for a phasor network.
 */
export function adaptPhasorResult(
  compiled: CompileResult,
  phasor: PhasorSimulationResult,
): SimulationResult {
  const result: SimulationResult = {
    phasor,
    readiness: phasor.readiness,
    electricalContract: {
      version: phasor.contractVersion,
      engineVersion: phasor.engineVersion,
      modelVersion: phasor.modelVersion,
      status: phasor.status,
      coverage: phasor.coverage,
      diagnostics: phasor.diagnostics,
    },
    energizedComponents: new Set(),
    energizedWires: new Set(),
    errorComponents: new Set(),
    errorWires: new Set(),
    errors: [],
    warnings: [
      'Complex RMS readings with declared motor-equivalent and coil models. Reactive motor behavior, automatic protective clearing, damage and repair assessment are unassessed.',
    ],
    faultsCleared: false,
    faultNarrationErrors: [],
    faultNarrationWarnings: [],
  };
  const seen = new Set<string>();
  for (const d of [...phasor.readiness.diagnostics, ...phasor.diagnostics]) {
    if (d.severity === 'info' || seen.has(JSON.stringify(d))) continue;
    seen.add(JSON.stringify(d));
    const messages = d.severity === 'error' ? result.errors : result.warnings;
    if (d.faultId)
      (d.severity === 'error' ? result.faultNarrationErrors : result.faultNarrationWarnings)!.push(
        messages.length,
      );
    messages.push(d.message);
    if (d.severity === 'error') {
      if (d.componentId) result.errorComponents.add(d.componentId);
      if (d.wireId) result.errorWires.add(d.wireId);
    }
  }
  if (compiled.status !== 'compiled') return result;
  const { graph, circuit } = compiled;
  const active = normalizeCircuitFaults(circuit).filter((f) => !f.resolved);
  result.activeInjectedFaults = active;
  result.faultDiagnostics = active.map((fault) => {
    const def = FAULT_REGISTRY[fault.type];
    const model = graph.faults.find((f) => f.id === fault.id);
    const components =
      fault.target.type === 'component'
        ? [fault.target.id]
        : fault.target.type === 'port'
          ? [fault.target.componentId]
          : [];
    const wires = fault.target.type === 'wire' ? [fault.target.id] : [];
    for (const id of components) result.errorComponents.add(id);
    for (const id of wires) result.errorWires.add(id);
    result.faultNarrationWarnings!.push(result.warnings.length);
    result.warnings.push(`${def.label}: ${model?.effect ?? 'Electrical effect is unassessed.'}`);
    return {
      id: `diag_${fault.id}`,
      faultId: fault.id,
      type: fault.type,
      category: def.category,
      severity: def.severity,
      title: def.label,
      description: def.description,
      affectedComponents: components,
      affectedWires: wires,
      ...(fault.target.type === 'port'
        ? {
            affectedPorts: [
              { componentId: fault.target.componentId, portIndex: fault.target.portIndex },
            ],
          }
        : {}),
      reason: model?.effect ?? 'Electrical effect is unassessed.',
      resolutionHint: def.repairBehavior,
      isResolved: false,
    };
  });
  for (const c of circuit.components.filter((c) => c.state.isBlown)) {
    result.errorComponents.add(c.id);
    result.errors.push('A damaged component or operated fuse requires replacement.');
  }
  for (const w of circuit.wires.filter((w) => w.isBusted)) {
    result.errorWires.add(w.id);
    result.errors.push('A damaged wire requires replacement.');
  }
  if (phasor.status !== 'converged') return result;
  const threshold = 1e-9;
  result.phasorComponents = {};
  result.overloadedWires = new Set();
  for (const device of graph.devices) {
    const measurement: PhasorComponentReading = {
      branches: [],
      voltagePairs: [],
      neutralCurrent: null,
    };
    const model = device.model;
    if (model.kind === 'source' && model.phasePorts) {
      const phases = model.phasePorts;
      for (const [i, port] of phases.entries()) {
        const source = graph.sources.find(
          (s) =>
            s.componentIds.includes(device.componentId) &&
            s.positive === terminalId(device.componentId, port),
        );
        const id = source && phasor.sourceBranches[source.id];
        measurement.branches.push({
          label: `L${i + 1}-N`,
          voltage:
            phasorVoltageBetween(
              phasor,
              terminalId(device.componentId, port),
              terminalId(device.componentId, model.ports[1]),
            ) ?? null,
          current: id ? (phasor.branchCurrents[id] ?? null) : null,
          activePowerWatts: id ? (phasor.branchActivePowersWatts[id] ?? null) : null,
        });
        measurement.voltagePairs.push({
          label: `L${i + 1}-L${((i + 1) % 3) + 1}`,
          voltage:
            phasorVoltageBetween(
              phasor,
              terminalId(device.componentId, port),
              terminalId(device.componentId, phases[(i + 1) % 3]!),
            ) ?? null,
        });
      }
      if (measurement.branches.every((b) => b.current !== null))
        measurement.neutralCurrent = measurement.branches.reduce(
          (sum, b) => ({
            real: sum.real + b.current!.real,
            imaginary: sum.imaginary + b.current!.imaginary,
          }),
          { real: 0, imaginary: 0 },
        );
    } else {
      for (const branch of graph.branches.filter(
        (b) =>
          b.componentId === device.componentId &&
          ['load', 'source', 'coil', 'contact'].includes(b.kind),
      )) {
        measurement.branches.push({
          label:
            model.kind === 'source'
              ? 'L-N'
              : branch.kind === 'coil'
                ? 'A1-A2 coil'
                : branch.kind === 'contact'
                  ? `Pole ${graph.branches.filter((b) => b.componentId === device.componentId && b.kind === 'contact').indexOf(branch) + 1}`
                  : model.kind === 'three-phase-motor'
                    ? ['U-V equivalent', 'V-W equivalent', 'W-U equivalent'][
                        graph.branches
                          .filter((b) => b.componentId === device.componentId && b.kind === 'load')
                          .indexOf(branch)
                      ]!
                    : 'Load terminal pair',
          voltage: phasorVoltageBetween(phasor, branch.from, branch.to) ?? null,
          current: phasor.branchCurrents[branch.id] ?? null,
          activePowerWatts: phasor.branchActivePowersWatts[branch.id] ?? null,
        });
        if (
          branch.kind === 'load' &&
          model.kind !== 'three-phase-motor' &&
          Math.abs(phasor.branchActivePowersWatts[branch.id] ?? 0) > threshold
        )
          result.energizedComponents.add(device.componentId);
      }
    }
    if (model.kind === 'resistive-load') {
      const group = phasor.readiness.capabilities
        .find((c) => c.componentId === device.componentId)
        ?.groups.find((g) => g.role === 'load');
      const value = measurement.branches[0]?.voltage;
      const domain = phasor.terminalDomains[terminalId(device.componentId, model.ports[0])];
      const sources = graph.sources.filter((s) =>
        phasor.references.find((r) => r.domainId === domain)?.sourceIds.includes(s.id),
      );
      if (group && value) {
        measurement.compatibility = assessTerminalCompatibility(group, {
          supply: sources[0]?.model,
          terminalVoltage: phasorMagnitude(value),
        });
        for (const reason of measurement.compatibility.reasons) {
          if (reason.severity === 'error') {
            result.errorComponents.add(device.componentId);
            result.errors.push(reason.message);
          } else if (reason.severity === 'warning') result.warnings.push(reason.message);
        }
      }
    }
    if (measurement.branches.length) result.phasorComponents[device.componentId] = measurement;
  }
  for (const motor of phasor.motors) {
    if (motor.state === 'running') result.energizedComponents.add(motor.componentId);
    if (motor.state === 'blocked') result.errorComponents.add(motor.componentId);
  }
  for (const control of phasor.controls) {
    if (control.closed) result.energizedComponents.add(control.componentId);
  }
  for (const branch of graph.branches.filter((b) => b.wireId)) {
    const id = branch.wireId!;
    const current = phasor.branchCurrents[branch.id];
    const from = phasor.terminalVoltages[branch.from];
    const to = phasor.terminalVoltages[branch.to];
    if (
      (current && phasorMagnitude(current) > threshold) ||
      (from && phasorMagnitude(from) > threshold) ||
      (to && phasorMagnitude(to) > threshold)
    )
      result.energizedWires.add(id);
    if (
      branch.wire &&
      current &&
      assessWireCapacity(branch.wire, phasorMagnitude(current)).comparison === 'exceeded'
    )
      result.overloadedWires.add(id);
  }
  return result;
}
