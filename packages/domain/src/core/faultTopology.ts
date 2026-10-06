import type { ComponentDef, InjectedFault } from '../types';
import type { ElectricalDiagnostic, TerminalGraph } from './contracts';

/** Injective IDs, including component IDs containing separators. */
export const terminalId = (componentId: string, portIndex: number): string =>
  JSON.stringify(['terminal', componentId, portIndex]);
export const compareIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Wire swaps precede disconnections; a random fault ID cannot change the topology. */
function faultStage({ type }: InjectedFault): number {
  if (type === 'reverse-polarity') return 0;
  if (type.startsWith('open-') || type === 'terminal-disconnect') return 2;
  return 1;
}

/** Faults with no second conductor/physical law in schema 1 remain explicit gaps.
 * Never invent a connection to an unrelated global neutral or PE rail. */
export function applyGraphFaults(
  graph: TerminalGraph,
  faults: InjectedFault[],
  definitions: ReadonlyMap<string, ComponentDef>,
  diagnostics: ElectricalDiagnostic[],
): void {
  const disableTerminal = (id: string, externalOnly = false) => {
    for (const branch of graph.branches)
      if ((branch.from === id || branch.to === id) && (!externalOnly || branch.kind === 'wire'))
        branch.closed = false;
  };
  const reversedComponents = new Set<string>();
  for (const fault of [...faults].sort(
    (a, b) => faultStage(a) - faultStage(b) || compareIds(a.id, b.id),
  )) {
    const { target, type } = fault;
    let assessed = true;
    let effect = '';
    const componentId =
      target.type === 'component'
        ? target.id
        : target.type === 'port'
          ? target.componentId
          : undefined;
    const definition = componentId === undefined ? undefined : definitions.get(componentId);
    const openRole =
      type === 'open-live'
        ? 'live'
        : type === 'open-neutral'
          ? 'neutral'
          : type === 'open-earth'
            ? 'earth'
            : undefined;
    if (type === 'open-circuit' || openRole || type === 'terminal-disconnect') {
      effect = openRole
        ? `Open the targeted ${openRole} conductor.`
        : 'Open the targeted connection.';
      if (target.type === 'wire') {
        for (const branch of graph.branches) if (branch.wireId === target.id) branch.closed = false;
      } else if (target.type === 'port') {
        disableTerminal(
          terminalId(target.componentId, target.portIndex),
          type === 'terminal-disconnect',
        );
      } else if (definition) {
        if (openRole) {
          const indices = definition.ports.flatMap((port, index) =>
            port.type === openRole ? [index] : [],
          );
          assessed = indices.length > 0;
          for (const index of indices) disableTerminal(terminalId(target.id, index));
        } else {
          for (const branch of graph.branches)
            if (branch.componentId === target.id) branch.closed = false;
        }
      }
    } else if (type === 'protection-forced-open' || type === 'protection-bypass') {
      effect =
        type === 'protection-forced-open'
          ? 'Force each protective contact open.'
          : 'Ideal teaching bypass: disconnect each sensed pole path and route current through its external shunt, including when the handle is open or tripped.';
      const device = graph.devices.find((d) => d.componentId === componentId);
      if (
        target.type !== 'component' ||
        !definition?.isProtection ||
        device?.model.kind !== 'contacts'
      ) {
        assessed = false;
      } else if (type === 'protection-forced-open') {
        for (const branch of graph.branches)
          if (branch.componentId === target.id && branch.kind === 'contact') branch.closed = false;
      } else {
        // Parallel ideal zero-ohm paths have no unique current split. This
        // declared bypass routes current outside the sensed path; it does not
        // predict how current splits through a real parallel bridge.
        for (const branch of graph.branches)
          if (branch.componentId === target.id && branch.kind === 'contact') branch.closed = false;
        for (const [index, pole] of device.model.poles.entries())
          graph.branches.push({
            id: JSON.stringify(['fault', fault.id, index]),
            kind: 'fault',
            from: terminalId(target.id, pole.common),
            to: terminalId(target.id, pole.no),
            closed: true,
            idealConductor: true,
            componentId: target.id,
            faultId: fault.id,
          });
      }
    } else if (type === 'reverse-polarity' && target.type === 'component' && definition) {
      const live = definition.ports.findIndex((port) => port.type === 'live');
      const neutral = definition.ports.findIndex((port) => port.type === 'neutral');
      if (
        live < 0 ||
        neutral < 0 ||
        definition.ports.filter((port) => port.type === 'live').length !== 1 ||
        definition.ports.filter((port) => port.type === 'neutral').length !== 1
      ) {
        assessed = false;
      } else {
        const a = terminalId(target.id, live);
        const b = terminalId(target.id, neutral);
        const swap = (id: string) => (id === a ? b : id === b ? a : id);
        if (!reversedComponents.has(target.id)) {
          for (const branch of graph.branches)
            if (branch.kind === 'wire') {
              branch.from = swap(branch.from);
              branch.to = swap(branch.to);
            }
          reversedComponents.add(target.id);
        }
        effect =
          'Swap the external connections at the two supply/load terminals; saved port IDs stay unchanged.';
      }
    } else if (
      (type === 'short-circuit' || type === 'earth-fault' || type === 'live-to-earth') &&
      target.type === 'component' &&
      definition
    ) {
      const returnRole = type === 'short-circuit' ? 'neutral' : 'earth';
      const lines = definition.ports.flatMap((port, index) =>
        port.type === 'live' ? [index] : [],
      );
      const returns = definition.ports.flatMap((port, index) =>
        port.type === returnRole ? [index] : [],
      );
      const [first] = lines;
      const [second] = returns;
      if (lines.length !== 1 || returns.length !== 1 || first === undefined || second === undefined)
        assessed = false;
      else {
        graph.branches.push({
          id: JSON.stringify(['fault', fault.id]),
          kind: 'fault',
          from: terminalId(target.id, first),
          to: terminalId(target.id, second),
          closed: true,
          // Leakage has no declared impedance in schema 1. Preserve incidence
          // without collapsing L and PE into one zero-resistance solver node.
          idealConductor: type !== 'live-to-earth',
          componentId: target.id,
          faultId: fault.id,
        });
        if (type === 'live-to-earth') {
          assessed = false;
          effect =
            'Leakage path from device live to its own PE terminal; impedance and residual current are unspecified and not assessed.';
        } else {
          effect =
            type === 'earth-fault'
              ? 'Bridge the device live terminal to its own PE terminal; retain CPC continuity.'
              : 'Bridge the device live and neutral terminals, keeping PE separate.';
        }
      }
    } else assessed = false;
    if (!assessed) {
      effect =
        effect && type === 'live-to-earth'
          ? effect
          : `${type}: schema 1 does not specify the required conductor pair or dynamic electrical model for this target; no connection/current is invented.`;
      diagnostics.push({
        code: 'fault-model-unassessed',
        severity: 'warning',
        message: effect,
        faultId: fault.id,
        componentId,
      });
    }
    graph.faults.push({
      id: fault.id,
      type,
      target: { ...target },
      coverage: assessed ? 'supported' : 'not-assessed',
      effect,
    });
  }
  graph.faults.sort((a, b) => compareIds(a.id, b.id));
}
