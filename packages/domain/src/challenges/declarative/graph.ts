/**
 * Challenge rule graph queries (plan §7: topology, not coordinates).
 *
 * Traverses the SAME wiring semantics as the real simulator (`traversal.ts`):
 *   - wires are bidirectional conductors followed from every port,
 *   - loads are leaves for INTERNAL expansion but their ports still carry
 *     wires onward (daisy-chaining is legitimate wiring),
 *   - tripped/blown components block.
 *
 * Connection rules ask "is this rail wired from A to B" — switch POSITION is
 * a state question (§6 keeps connection and state rules separate), so those
 * walks pass through switches regardless of on/off. Functional rules do not
 * live here at all: they run the real simulator with evidence states (see
 * rules.ts), so there is exactly one source of electrical truth.
 *
 * Everything here is pure and id-agnostic: rules only ever ask about types
 * and ports, so generated ids, layout coordinates and routing style are
 * irrelevant to the verdict (plan §7).
 */

import { COMPONENT_DEFS } from '../../components';
import type { Circuit, ComponentInstance, WireInstance } from '../../types';

export interface CircuitGraph {
  components: readonly ComponentInstance[];
  wires: readonly WireInstance[];
  byId: ReadonlyMap<string, ComponentInstance>;
  /** componentId → wire-ends leaving it. */
  adjacency: ReadonlyMap<string, WireEnd[]>;
}

export interface WireEnd {
  /** Port on this component the wire leaves from. */
  port: number;
  otherId: string;
  otherPort: number;
  wireId: string;
}

export type Rail = 'live' | 'neutral' | 'earth';

export function indexGraph(circuit: Circuit): CircuitGraph {
  const byId = new Map(circuit.components.map((c) => [c.id, c]));
  const adjacency = new Map<string, WireEnd[]>();
  for (const component of circuit.components) adjacency.set(component.id, []);
  for (const wire of circuit.wires) {
    if (!byId.has(wire.fromComponentId) || !byId.has(wire.toComponentId)) continue;
    adjacency.get(wire.fromComponentId)!.push({
      port: wire.fromPortIndex,
      otherId: wire.toComponentId,
      otherPort: wire.toPortIndex,
      wireId: wire.id,
    });
    adjacency.get(wire.toComponentId)!.push({
      port: wire.toPortIndex,
      otherId: wire.fromComponentId,
      otherPort: wire.fromPortIndex,
      wireId: wire.id,
    });
  }
  return { components: circuit.components, wires: circuit.wires, byId, adjacency };
}

interface WalkOptions {
  /**
   * Ignore switch positions while walking (connection rules). When false,
   * closed switches block and changeovers route through their selected throw.
   */
  ignoreSwitchState?: boolean;
}

/** Ports internally connected to `entryPort` on this rail. */
function internalPorts(
  def: (typeof COMPONENT_DEFS)[string],
  component: ComponentInstance,
  entryPort: number,
  rail: Rail,
  ignoreSwitchState: boolean,
): number[] {
  if (!ignoreSwitchState) {
    if (def.changeover) {
      const selected =
        component.state.on === true ? def.changeover.onPortIndex : def.changeover.offPortIndex;
      if (entryPort === def.changeover.commonPortIndex) return [selected];
      if (entryPort === selected) return [def.changeover.commonPortIndex];
      return [];
    }
    if (def.isSwitch && component.state.on !== true) return [];
    if (def.isMomentary) return []; // released unless evidence says otherwise
  }

  const connected: number[] = [];
  for (let i = 0; i < def.ports.length; i += 1) {
    if (i === entryPort) continue;
    if (def.ports[i]!.type !== rail) continue;
    connected.push(i);
  }
  return connected;
}

/**
 * Walk one rail from `startKeys` ("id:port") across the wiring graph.
 * Mirrors `simulation/traversal.ts` semantics for the fault-free case.
 */
export function walkRail(
  graph: CircuitGraph,
  rail: Rail,
  startKeys: Iterable<string>,
  options: WalkOptions = {},
): { reached: Set<string>; touched: Set<string>; wires: Set<string> } {
  const ignoreSwitchState = options.ignoreSwitchState === true;
  const reached = new Set<string>();
  const touched = new Set<string>();
  const wires = new Set<string>();
  const visited = new Set<string>();
  const queue: string[] = [...startKeys];
  for (const key of queue) visited.add(key);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const separator = current.lastIndexOf(':');
    const compId = current.slice(0, separator);
    const portIndex = Number(current.slice(separator + 1));
    const component = graph.byId.get(compId);
    if (!component) continue;
    const def = COMPONENT_DEFS[component.type];
    if (!def) continue;

    touched.add(compId);
    if (!def.isSource) reached.add(compId);
    if (component.state.isTripped || component.state.isBlown) continue;

    // Internal port expansion (loads are leaves; switches gate by state).
    if (!def.isLoad) {
      for (const index of internalPorts(def, component, portIndex, rail, ignoreSwitchState)) {
        const key = `${compId}:${index}`;
        if (!visited.has(key)) {
          visited.add(key);
          queue.push(key);
        }
      }
    }

    // Wires are physical conductors, followed from every port (both ends).
    for (const end of graph.adjacency.get(compId) ?? []) {
      if (end.port !== portIndex) continue;
      const farDef = COMPONENT_DEFS[graph.byId.get(end.otherId)?.type ?? ''];
      if (!farDef?.ports[end.otherPort]) continue;
      if (farDef.ports[end.otherPort]!.type !== rail) continue;
      wires.add(end.wireId);
      const key = `${end.otherId}:${end.otherPort}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push(key);
      }
    }
  }
  return { reached, touched, wires };
}

// ── Public rule-oriented queries ───────────────────────────────────────────

export function componentsOfType(graph: CircuitGraph, type: string): ComponentInstance[] {
  return graph.components.filter((component) => component.type === type);
}

/** True when a wire directly joins an instance of `fromType` to `toType`. */
export function hasDirectConnection(
  graph: CircuitGraph,
  rail: Rail,
  fromType: string,
  toType: string,
): boolean {
  const targets = new Set(componentsOfType(graph, toType).map((c) => c.id));
  if (targets.size === 0) return false;
  for (const component of componentsOfType(graph, fromType)) {
    for (const end of graph.adjacency.get(component.id) ?? []) {
      if (!targets.has(end.otherId)) continue;
      const far = graph.byId.get(end.otherId);
      if (COMPONENT_DEFS[far?.type ?? '']?.ports[end.otherPort]?.type !== rail) continue;
      return true;
    }
  }
  return false;
}

/**
 * True when the rail can flow from an instance of `fromType` to an instance
 * of `toType` through the wiring graph (plan §8 `conductorPath`). The walk
 * starts at every `fromType` port of that rail, so a path that bypasses
 * `fromType` cannot satisfy the rule. Switch positions are ignored.
 */
export function hasRailPath(
  graph: CircuitGraph,
  rail: Rail,
  fromType: string,
  toType: string,
): boolean {
  const targets = new Set(componentsOfType(graph, toType).map((c) => c.id));
  const starts = new Set<string>();
  for (const component of componentsOfType(graph, fromType)) {
    const def = COMPONENT_DEFS[component.type];
    if (!def) continue;
    for (let i = 0; i < def.ports.length; i += 1) {
      if (def.ports[i]!.type === rail) starts.add(`${component.id}:${i}`);
    }
  }
  if (targets.size === 0 || starts.size === 0) return false;
  const { touched } = walkRail(graph, rail, starts, { ignoreSwitchState: true });
  return [...targets].some((id) => touched.has(id));
}

/**
 * True when every rail path from `fromType` to `toType` passes through
 * `throughType` (plan §25: the socket must be fed THROUGH the RCBO, not
 * bypassed). Returns false when no path exists at all.
 */
export function hasRailPathExclusivelyThrough(
  graph: CircuitGraph,
  rail: Rail,
  fromType: string,
  toType: string,
  throughType: string,
): boolean {
  if (!hasRailPath(graph, rail, fromType, toType)) return false;
  if (!hasRailPath(graph, rail, throughType, toType)) return false;

  // Block `throughType` internally: if the far side is still reachable from
  // the source, a bypass exists.
  const sourceStarts = new Set<string>();
  for (const component of componentsOfType(graph, fromType)) {
    const def = COMPONENT_DEFS[component.type];
    if (!def) continue;
    for (let i = 0; i < def.ports.length; i += 1) {
      if (def.ports[i]!.type === rail) sourceStarts.add(`${component.id}:${i}`);
    }
  }
  const targets = new Set(componentsOfType(graph, toType).map((c) => c.id));
  const blocked = componentsOfType(graph, throughType);
  const blockedKeys = new Set<string>();
  for (const component of blocked) {
    for (const end of graph.adjacency.get(component.id) ?? []) {
      blockedKeys.add(`${component.id}:${end.port}`);
    }
  }
  // Rebuild a graph view where the through-component's ports do not fan out.
  const filtered: CircuitGraph = {
    ...graph,
    adjacency: new Map(
      [...graph.adjacency].map(([id, ends]) => [
        id,
        ends.filter((end) => !blockedKeys.has(`${id}:${end.port}`)),
      ]),
    ),
  };
  const { touched } = walkRail(filtered, rail, sourceStarts, { ignoreSwitchState: true });
  return [...targets].every((id) => !touched.has(id));
}

/** Structural soundness: every wire lands on real components/ports. */
export function structuralIssues(graph: CircuitGraph): string[] {
  const issues: string[] = [];
  for (const wire of graph.wires) {
    const from = graph.byId.get(wire.fromComponentId);
    const to = graph.byId.get(wire.toComponentId);
    if (!from || !to) {
      issues.push('A wire is not connected at both ends.');
      continue;
    }
    const fromPort = COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex];
    const toPort = COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex];
    if (!fromPort || !toPort) {
      issues.push('A wire references a terminal that does not exist.');
    }
  }
  return issues;
}
