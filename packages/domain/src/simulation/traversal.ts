/**
 * Rail-traversal engine — BFS walks of the live / neutral / earth rails
 * across the indexed port graph.
 *
 * Split verbatim from the former monolithic `simulation.ts`. Pure module:
 * no React / DOM imports so it can ship into `simulation.worker.ts`.
 */

import type { ComponentDef, ComponentInstance, PortType } from '../types';
import { type CircuitIndex, portKey } from './indexing';

// ─── BFS traversal of one rail (live OR neutral OR earth) ────────────────────

export interface TraversalResult {
  /** Loads (and pass-through components carrying the rail) that were reached. */
  reachedComponents: Set<string>;
  /** Wires that participated in propagation. */
  energisedWires: Set<string>;
  /** "compId:portIdx" of every visited port — used for short-circuit detection. */
  visitedPorts: Set<string>;
}

export function traverse(
  startCompId: string,
  startPortIdx: number,
  rail: PortType,
  index: CircuitIndex,
  defs: Record<string, ComponentDef>,
): TraversalResult {
  const reachedComponents = new Set<string>();
  const energisedWires = new Set<string>();
  const visitedPorts = new Set<string>();

  const queue: { compId: string; portIdx: number }[] = [
    { compId: startCompId, portIdx: startPortIdx },
  ];
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const head = queue[queueIndex++];
    if (!head) continue;
    const { compId, portIdx } = head;
    const key = portKey(compId, portIdx);
    if (visitedPorts.has(key)) continue;
    visitedPorts.add(key);

    // If this specific port has a terminal disconnection fault, traversal cannot enter/exit through it
    const portFaults = index.faultsByPort.get(key);
    if (portFaults?.some((f) => f.type === 'terminal-disconnect')) {
      continue;
    }

    const comp = index.byId.get(compId);
    if (!comp) continue;
    const def = defs[comp.type];
    if (!def) continue;

    const compFaults = index.faultsByComponent.get(compId) ?? [];
    const hasSwitchedNeutral = compFaults.some((f) => f.type === 'switched-neutral');

    // Switch state check
    let isOff = false;
    if (def.isSwitch === true && !def.changeover) {
      if (hasSwitchedNeutral) {
        // Switched neutral: switch state ONLY controls Neutral path; Live bypasses switch
        isOff = rail === 'neutral' && comp.state.on !== true;
      } else {
        isOff = comp.state.on !== true;
      }
    }

    if (!def.isSource && (def.isLoad || !isOff)) reachedComponents.add(compId);
    if (!def.isLoad && !isOff) {
      for (const internalPortIndex of connectedPortIndices(def, comp, portIdx, rail, index)) {
        queue.push({ compId, portIdx: internalPortIndex });
      }
    }

    // A wire is a physical conductor.
    const wires = index.byPort.get(key);
    if (!wires) continue;
    for (const wire of wires) {
      if (wire.isBusted) continue;

      // Check wire-level faults
      const wireFaults = index.faultsByWire.get(wire.id) ?? [];
      const hasWireOpenCircuit =
        wire.fault === 'open-circuit' || wireFaults.some((f) => f.type === 'open-circuit');
      const hasWireOpenLive = wireFaults.some((f) => f.type === 'open-live');
      const hasWireOpenNeutral = wireFaults.some((f) => f.type === 'open-neutral');
      const hasWireOpenEarth = wireFaults.some((f) => f.type === 'open-earth');

      if (hasWireOpenCircuit) continue;
      if (rail === 'live' && hasWireOpenLive) continue;
      if (rail === 'neutral' && hasWireOpenNeutral) continue;
      if (rail === 'earth' && hasWireOpenEarth) continue;

      const isFromSide = wire.fromComponentId === compId && wire.fromPortIndex === portIdx;
      const next = isFromSide
        ? { compId: wire.toComponentId, portIdx: wire.toPortIndex }
        : { compId: wire.fromComponentId, portIdx: wire.fromPortIndex };

      const nextPortKey = portKey(next.compId, next.portIdx);
      const nextPortFaults = index.faultsByPort.get(nextPortKey);
      if (nextPortFaults?.some((f) => f.type === 'terminal-disconnect')) {
        continue;
      }

      const nextComp = index.byId.get(next.compId);
      const nextDef = nextComp ? defs[nextComp.type] : undefined;
      if (!nextDef?.ports[next.portIdx]) continue;

      energisedWires.add(wire.id);
      queue.push(next);
    }
  }

  return { reachedComponents, energisedWires, visitedPorts };
}

export function emptyTraversal(): TraversalResult {
  return {
    reachedComponents: new Set(),
    energisedWires: new Set(),
    visitedPorts: new Set(),
  };
}

/** Return the ports internally connected to an entry port for this state. */
export function connectedPortIndices(
  def: ComponentDef,
  comp: ComponentInstance,
  entryPortIndex: number,
  rail?: PortType,
  index?: CircuitIndex,
): number[] {
  const compFaults = index?.faultsByComponent.get(comp.id) ?? [];
  const hasBypass = compFaults.some((f) => f.type === 'protection-bypass');
  const hasForcedOpen = compFaults.some((f) => f.type === 'protection-forced-open');
  const hasOpenCircuit =
    comp.state.fault === 'open-circuit' || compFaults.some((f) => f.type === 'open-circuit');
  const hasOpenLive = compFaults.some((f) => f.type === 'open-live');
  const hasOpenNeutral = compFaults.some((f) => f.type === 'open-neutral');
  const hasShortCircuit =
    comp.state.fault === 'short-circuit' || compFaults.some((f) => f.type === 'short-circuit');

  if (hasForcedOpen) {
    return [];
  }

  if (hasOpenCircuit) {
    return [];
  }

  if (rail === 'live' && hasOpenLive) {
    return [];
  }

  if (rail === 'neutral' && hasOpenNeutral) {
    return [];
  }

  if ((comp.state.isBlown || comp.state.isTripped) && !hasBypass) {
    return [];
  }

  if (hasShortCircuit) {
    // Injected internal short circuit bridges all terminals together
    return def.ports.map((_, i) => i).filter((i) => i !== entryPortIndex);
  }

  const changeover = def.changeover;
  if (changeover) {
    const selectedPortIndex =
      comp.state.on === true ? changeover.onPortIndex : changeover.offPortIndex;
    if (entryPortIndex === changeover.commonPortIndex) return [selectedPortIndex];
    if (entryPortIndex === selectedPortIndex) return [changeover.commonPortIndex];
    return [];
  }

  const entryPortType = def.ports[entryPortIndex]?.type;
  if (!entryPortType) return [];

  const connected: number[] = [];
  for (let i = 0; i < def.ports.length; i++) {
    if (i === entryPortIndex) continue;
    if (def.ports[i]!.type !== entryPortType) continue;
    connected.push(i);
  }
  return connected;
}

/** Traverse every source for one rail and union the resulting graph sets. */
export function traverseSources(
  sources: ComponentInstance[],
  rail: PortType,
  index: CircuitIndex,
  defs: Record<string, ComponentDef>,
): TraversalResult {
  const merged = emptyTraversal();
  for (const source of sources) {
    const def = defs[source.type];
    const startPortIndex = def?.ports.findIndex((port) => port.type === rail) ?? -1;
    if (startPortIndex < 0) continue;
    const result = traverse(source.id, startPortIndex, rail, index, defs);
    for (const id of result.reachedComponents) merged.reachedComponents.add(id);
    for (const id of result.energisedWires) merged.energisedWires.add(id);
    for (const key of result.visitedPorts) merged.visitedPorts.add(key);
  }
  return merged;
}
