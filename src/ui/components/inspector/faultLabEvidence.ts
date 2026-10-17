import {
  COMPONENT_DEFS,
  type Circuit,
  type FaultTarget,
  type SimulationResult,
  assessFaultTarget,
  normalizeCircuitFaults,
} from '@electrasim/domain';
import { isCurrentSimulation } from '@electrasim/domain/simulationEvidence';

export function targetKey(target: FaultTarget | null): string {
  return !target
    ? ''
    : target.type === 'port'
      ? `port:${target.componentId}:${target.portIndex}`
      : `${target.type}:${target.id}`;
}

export function targetLabel(circuit: Circuit, target: FaultTarget): string {
  if (target.type === 'wire') {
    const wire = circuit.wires.find((w) => w.id === target.id);
    return wire?.label || `Wire #${target.id.slice(0, 8)}`;
  }
  const id = target.type === 'port' ? target.componentId : target.id;
  const component = circuit.components.find((c) => c.id === id);
  const def = component && COMPONENT_DEFS[component.type];
  const name = component?.state.autoLabel || def?.label || id;
  return target.type === 'port'
    ? `${name} · ${def?.ports[target.portIndex]?.label ?? target.portIndex}`
    : name;
}

function sourceLabel(circuit: Circuit, branchKey: string): string {
  let id = branchKey;
  try {
    const parsed: unknown = JSON.parse(branchKey);
    if (Array.isArray(parsed) && parsed[0] === 'alias-source' && parsed[1] === 'legacy-mains')
      return 'Circuit supply';
    if (Array.isArray(parsed) && parsed[0] === 'source' && typeof parsed[1] === 'string')
      id = parsed[1];
  } catch {
    /* A source id may already be plain text. */
  }
  return `${targetLabel(circuit, { type: 'component', id })} · ${id}`;
}

/** A detached display snapshot. Nothing in this adapter advances the solver. */
export function captureFaultResponse(
  circuit: Circuit,
  result: SimulationResult | null,
  target: FaultTarget | null,
) {
  if (!target || !isCurrentSimulation(circuit, result) || result.electrical?.status !== 'converged')
    return null;
  const id = target.type === 'port' ? target.componentId : target.id;
  const exists =
    target.type === 'wire'
      ? circuit.wires.some((w) => w.id === id)
      : circuit.components.some(
          (c) =>
            c.id === id &&
            (target.type !== 'port' || COMPONENT_DEFS[c.type]?.ports[target.portIndex]),
        );
  if (!exists) return null;
  const faults = normalizeCircuitFaults(circuit).filter(
    (f) =>
      !f.resolved &&
      (targetKey(f.target) === targetKey(target) ||
        (target.type === 'port' && f.target.type === 'component' && f.target.id === id)),
  );
  const unassessed =
    faults.some((f) => assessFaultTarget(circuit, f.type, f.target).coverage !== 'supported') ||
    result.electricalContract?.coverage.some(
      (c) => c.aspect === 'fault' && c.status === 'not-assessed',
    ) === true;
  const reading = target.type === 'wire' ? null : result.componentCalculations?.[id];
  const wirePoint =
    target.type === 'wire' ? result.electrical.wires.find((w) => w.wireId === id) : null;
  return structuredClone({
    revision: result.inputRevision!,
    key: targetKey(target),
    label: targetLabel(circuit, target),
    target,
    elapsedSeconds: result.simulationState?.elapsedSeconds ?? null,
    faults,
    unassessed,
    voltage: unassessed ? null : (reading?.voltage ?? wirePoint?.terminalVoltageVolts ?? null),
    current: unassessed ? null : (reading?.currentAmps ?? wirePoint?.currentAmps ?? null),
    power: unassessed ? null : (reading?.powerWatts ?? wirePoint?.lossWatts ?? null),
    potentials: !unassessed && target.type === 'wire' ? (result.wireStates?.[id] ?? null) : null,
    // Circuit events retain the named device/target. They are never attributed
    // to a selected fault as proof of causation, especially in multi-fault runs.
    events: unassessed ? [] : (result.simulationEvents ?? []),
    protection: unassessed ? [] : (result.electrical.protection ?? []),
    damage: unassessed
      ? null
      : (result.electrical.damage?.find(
          (d) =>
            d.target.type === (target.type === 'wire' ? 'wire' : 'component') && d.target.id === id,
        ) ?? null),
    damaged:
      target.type === 'wire'
        ? circuit.wires.find((w) => w.id === id)?.isBusted === true
        : circuit.components.find((c) => c.id === id)?.state.isBlown === true,
    energized: !unassessed && target.type !== 'wire' && result.energizedComponents.has(id),
    sources: unassessed
      ? []
      : Object.entries(result.electrical.sourceBranches).map(([sourceId, branchId]) => ({
          id: sourceId,
          label: sourceLabel(circuit, sourceId),
          voltage: result.electrical!.branchVoltages[branchId] ?? null,
          current: result.electrical!.branchCurrents[branchId] ?? null,
          power: result.electrical!.branchPowers[branchId] ?? null,
        })),
  });
}

export type FaultResponse = NonNullable<ReturnType<typeof captureFaultResponse>>;
export const formatReading = (value: number | null | undefined, unit: string) =>
  value != null && Number.isFinite(value)
    ? `${Number(value.toPrecision(5))} ${unit}`
    : 'Unavailable';

export function responseStages(response: FaultResponse): [string, string][] {
  const opening = response.faults.some((f) =>
    ['open-circuit', 'open-live', 'open-neutral', 'open-earth', 'terminal-disconnect'].includes(
      f.type,
    ),
  );
  const short = response.faults.some((f) => f.type === 'short-circuit');
  const damage = response.damage;
  return [
    ['Target', response.label],
    [
      'Cause',
      damage?.damaged
        ? 'The declared damage budget has opened this target.'
        : opening
          ? 'The named path is deliberately opened.'
          : short
            ? 'A declared conductor pair is bridged.'
            : response.faults.length
              ? 'Review the injected cause and its model coverage.'
              : 'No injected cause is recorded on this target.',
    ],
    [
      'Path',
      opening
        ? 'The interrupted path may still have source-relative potential. Inspect both sides.'
        : short
          ? 'Fault current depends on the declared path and source impedances.'
          : 'Inspect the selected connections; other branches have their own operating points.',
    ],
    [
      'Response',
      `Accepted target current: ${formatReading(response.current, 'A')}. This is the final operating point.`,
    ],
    [
      'Inspect',
      response.events.length
        ? 'Recorded circuit events name their device or target and simulated time below.'
        : 'No timed event is recorded. These stages are a causal walkthrough, not measured event times.',
    ],
    [
      'Repair',
      'Clear the cause, reset protection to OFF, operate to ON and replace damage as separate edits. Run again to verify.',
    ],
  ];
}
