import { COMPONENT_DEFS } from '../components';
import { conductorPaths } from '../core/conductorPaths';
import type {
  CompileResult,
  ElectricalDiagnostic,
  ElectricalSimulationResult,
} from '../core/contracts';
import { terminalId } from '../core/faultTopology';
import { voltageBetween } from '../core/linearMeasurements';
import { LINEAR_SYSTEM_LIMITS } from '../core/linearSystem';
import { normalizeCircuitFaults } from '../faults';
import { FAULT_REGISTRY } from '../faults';
import { getSimulationLimitations } from '../simulationCoverage';
import type { ComponentDef, SimulationResult } from '../types';

/** Project accepted MNA values into existing application fields. No P/V estimates,
 * global source voltage, invented current split, protection events or thermal state. */
export function adaptMnaResult(
  compiled: CompileResult,
  electrical: ElectricalSimulationResult,
  defs: Record<string, ComponentDef> = COMPONENT_DEFS,
): SimulationResult {
  const result: SimulationResult = {
    electrical,
    readiness: electrical.readiness,
    electricalContract: {
      version: electrical.contractVersion,
      engineVersion: electrical.engineVersion,
      modelVersion: electrical.modelVersion,
      status: electrical.status,
      coverage: electrical.coverage,
      diagnostics: electrical.diagnostics,
    },
    energizedComponents: new Set(),
    energizedWires: new Set(),
    errorComponents: new Set(),
    errorWires: new Set(),
    errors: [],
    warnings: [],
    faultNarrationErrors: [],
    faultNarrationWarnings: [],
    faultsCleared: false,
  };
  const seen = new Set<string>();
  const addDiagnostic = (diagnostic: ElectricalDiagnostic) => {
    if (diagnostic.severity === 'info') return;
    const key = JSON.stringify([
      diagnostic.code,
      diagnostic.componentId,
      diagnostic.wireId,
      diagnostic.faultId,
      diagnostic.message,
    ]);
    if (seen.has(key)) return;
    seen.add(key);
    const messages = diagnostic.severity === 'error' ? result.errors : result.warnings;
    if (diagnostic.faultId)
      (diagnostic.severity === 'error'
        ? result.faultNarrationErrors
        : result.faultNarrationWarnings)!.push(messages.length);
    messages.push(diagnostic.message);
    if (diagnostic.severity === 'error') {
      if (diagnostic.componentId) result.errorComponents.add(diagnostic.componentId);
      if (diagnostic.wireId) result.errorWires.add(diagnostic.wireId);
    }
  };
  for (const diagnostic of [...electrical.readiness.diagnostics, ...electrical.diagnostics])
    addDiagnostic(diagnostic);
  if (compiled.status === 'invalid') return result;
  const { circuit, graph } = compiled;
  result.modelLimitations = getSimulationLimitations(circuit, defs);
  for (const limitation of result.modelLimitations)
    if (!result.warnings.includes(limitation.message)) result.warnings.push(limitation.message);
  if (electrical.status !== 'converged' && electrical.status !== 'not-solved') {
    result.modelLimitations.push({
      code: 'solver-model',
      componentId: 'circuit',
      blocking: true,
      message:
        'No accepted electrical solution is available. Measurements and operating results are unavailable.',
    });
  }

  const active = normalizeCircuitFaults(circuit).filter((fault) => !fault.resolved);
  result.activeInjectedFaults = active;
  result.faultDiagnostics = active.map((fault) => {
    const definition = FAULT_REGISTRY[fault.type];
    const target = fault.target;
    const componentId =
      target.type === 'component'
        ? target.id
        : target.type === 'port'
          ? target.componentId
          : undefined;
    const model = graph.faults.find((item) => item.id === fault.id);
    if (
      model?.coverage === 'supported' &&
      (fault.type.startsWith('open-') ||
        fault.type === 'terminal-disconnect' ||
        fault.type === 'protection-forced-open')
    ) {
      // A physically open injected conductor is visible even when it is a CPC
      // or unused traveller carrying zero normal current. Manual switches remain
      // ordinary operating states, not faults.
      for (const branch of graph.branches) {
        if (branch.closed) continue;
        const affected =
          target.type === 'wire'
            ? branch.wireId === target.id
            : target.type === 'component'
              ? branch.componentId === target.id
              : branch.from === terminalId(target.componentId, target.portIndex) ||
                branch.to === terminalId(target.componentId, target.portIndex);
        if (!affected) continue;
        if (branch.wireId) result.errorWires.add(branch.wireId);
        if (componentId) result.errorComponents.add(componentId);
      }
    }
    addDiagnostic({
      code: 'injected-fault',
      severity: 'warning',
      faultId: fault.id,
      componentId,
      ...(target.type === 'wire' ? { wireId: target.id } : {}),
      message: `${definition.label}: ${model?.effect ?? 'Electrical effect is not assessed.'}`,
    });
    return {
      id: `diag_${fault.id}`,
      faultId: fault.id,
      type: fault.type,
      category: definition.category,
      severity: definition.severity,
      title: definition.label,
      description: definition.description,
      affectedComponents: componentId ? [componentId] : [],
      affectedWires: target.type === 'wire' ? [target.id] : [],
      ...(target.type === 'port'
        ? { affectedPorts: [{ componentId: target.componentId, portIndex: target.portIndex }] }
        : {}),
      reason: model?.effect ?? 'Electrical effect is not assessed.',
      resolutionHint: definition.repairBehavior,
      isResolved: false,
    };
  });
  if (electrical.readiness.topology === 'short') {
    // Mark the real shunting path, not every branch sharing a source.
    const paths = conductorPaths(graph);
    const terminals = new Map(graph.terminals.map((terminal) => [terminal.id, terminal]));
    const pairs = [
      ...graph.sources
        .filter((source) => electrical.readiness.shortedSourceIds.includes(source.id))
        .map((source) => [source.positive, source.negative] as const),
      ...electrical.readiness.shortedWindings.flatMap((winding) => {
        const branch = graph.branches.find((item) => item.id === winding.branchId);
        return branch ? [[branch.from, branch.to] as const] : [];
      }),
    ];
    for (const [from, to] of pairs)
      for (const branch of paths.path(from, to) ?? []) {
        if (branch.wireId) result.errorWires.add(branch.wireId);
        for (const id of [branch.from, branch.to]) {
          const componentId = terminals.get(id)?.port?.componentId;
          if (componentId) result.errorComponents.add(componentId);
        }
      }
    result.errors.push(
      'Short circuit — a conductor bypasses a source or winding load. Current is a declared-network estimate; protective clearing is not assessed.',
    );
  }
  if (electrical.status !== 'converged') return result;

  const threshold = LINEAR_SYSTEM_LIMITS.absoluteTolerance;
  const present = (value: number | null | undefined): value is number =>
    value != null && Number.isFinite(value);
  result.componentCalculations = {};
  result.wireCalculations = {};
  result.wireStates = {};
  result.overloadedWires = new Set();
  result.wireHeatRatios = {};
  const wireBranches = new Map(
    graph.branches.filter((branch) => branch.wireId).map((branch) => [branch.wireId!, branch]),
  );
  for (const wire of electrical.wires) {
    const branch = wireBranches.get(wire.wireId)!;
    const from = electrical.terminalVoltages[branch.from];
    const to = electrical.terminalVoltages[branch.to];
    const current = wire.currentAmps;
    const carryingCurrent = present(current) && Math.abs(current) > threshold;
    result.wireStates[wire.wireId] = {
      fromPotentialVolts: present(from) ? from : null,
      toPotentialVolts: present(to) ? to : null,
      fromDomainId: electrical.terminalDomains[branch.from] ?? null,
      toDomainId: electrical.terminalDomains[branch.to] ?? null,
      carryingCurrent,
    };
    if (
      carryingCurrent ||
      (present(from) && Math.abs(from) > threshold) ||
      (present(to) && Math.abs(to) > threshold)
    )
      result.energizedWires.add(wire.wireId);
    if (!present(current)) continue;
    const { capacity, properties } = wire;
    if (capacity.comparison === 'exceeded') result.overloadedWires.add(wire.wireId);
    if (capacity.deratedAmps !== null)
      result.wireHeatRatios[wire.wireId] = Math.abs(current) / capacity.deratedAmps;
    result.wireCalculations[wire.wireId] = {
      currentAmps: current,
      cableMm2: properties.cableMm2,
      lengthMeters: properties.lengthMeters,
      ampacityAmps: capacity.baseAmps,
      deratedAmpacityAmps: capacity.deratedAmps,
      resistanceOhms: properties.resistanceOhms,
      voltageDropVolts: wire.conductorDropVolts,
      voltageDropPercent: null,
      status: capacity.comparison === 'exceeded' ? 'fail' : 'warning',
      message: `One conductor at 20 C. ${capacity.basis}`,
    };
  }
  for (const load of electrical.loads) {
    result.componentCalculations[load.componentId] = {
      ...(present(load.terminalVoltageVolts) ? { voltage: load.terminalVoltageVolts } : {}),
      ...(present(load.currentAmps) ? { currentAmps: load.currentAmps } : {}),
      ...(present(load.powerWatts) ? { powerWatts: load.powerWatts } : {}),
    };
    if (present(load.powerWatts) && Math.abs(load.powerWatts) > threshold)
      result.energizedComponents.add(load.componentId);
  }
  for (const device of graph.devices) {
    if (device.model.kind !== 'outlet') continue;
    const component = circuit.components.find((item) => item.id === device.componentId)!;
    const ports = defs[component.type]!.ports;
    const line = ports.findIndex((port) => port.type === 'live');
    const neutral = ports.findIndex((port) => port.type === 'neutral');
    if (line < 0 || neutral < 0) continue;
    const voltage = voltageBetween(
      electrical,
      terminalId(component.id, line),
      terminalId(component.id, neutral),
    );
    if (!present(voltage)) continue;
    // Outlet capacity is not a consuming load. Its available L-N voltage still
    // matters to the canvas and socket exercises; no current is invented.
    result.componentCalculations[component.id] = { voltage };
    if (Math.abs(voltage) > threshold) result.energizedComponents.add(component.id);
  }
  for (const source of graph.sources) {
    const branch = electrical.sourceBranches[source.id];
    if (!branch) continue;
    // An L or N alias alone is not a device terminal-pair measurement.
    if (source.componentIds.length !== 1) continue;
    const device = graph.devices.find((item) => item.componentId === source.componentIds[0]);
    if (device?.model.kind !== 'source') continue;
    result.componentCalculations[source.componentIds[0]!] = {
      voltage: electrical.branchVoltages[branch],
      currentAmps: electrical.branchCurrents[branch],
      powerWatts: electrical.branchPowers[branch],
    };
  }
  result.faultsCleared =
    active.length === 0 &&
    result.errors.length === 0 &&
    electrical.readiness.topology !== 'empty' &&
    electrical.readiness.topology !== 'no-source';
  return result;
}
