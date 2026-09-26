/**
 * Fault→protection propagation — find which protective devices a fault can
 * actually reach through the wire graph, so faults operate the devices that
 * guard the faulted network rather than every device on the canvas.
 *
 * Pure module: no React / DOM imports so it can ship into `simulation.worker.ts`.
 *
 * NOTE (teaching simplification): within the faulted connected network ALL
 * reachable protective devices operate. Real-world selectivity/discrimination
 * (only the *nearest upstream* device trips, BS 7671 Section 536) needs
 * direction-aware path analysis — flagged in the roadmap (Zs checker work).
 */

import type { Circuit, ComponentDef, ComponentInstance } from '../types';

/** ComponentDefMap alias matching the traverse/simulate modules. */
type ComponentDefMap = Record<string, ComponentDef>;

/** All component ids in the same galvanically-connected network as `startId`. */
export function connectedNetworkComponents(startId: string, circuit: Circuit): Set<string> {
  // Component-to-component adjacency from the wire list (undirected: fault
  // current propagates both ways through a network)
  const adjacency = new Map<string, string[]>();
  for (const w of circuit.wires) {
    const from = adjacency.get(w.fromComponentId);
    if (from) from.push(w.toComponentId);
    else adjacency.set(w.fromComponentId, [w.toComponentId]);

    const to = adjacency.get(w.toComponentId);
    if (to) to.push(w.fromComponentId);
    else adjacency.set(w.toComponentId, [w.fromComponentId]);
  }

  const visited = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift() as string;
    for (const next of adjacency.get(current) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }
  return visited;
}

/**
 * Protective devices (MCB / RCBO / fuse / MCCB — `isProtection` defs) that
 * share a connected wire network with the faulted component.
 */
export function findProtectionDevicesInNetwork(
  faultedComponentId: string,
  circuit: Circuit,
  defs: ComponentDefMap,
): ComponentInstance[] {
  const network = connectedNetworkComponents(faultedComponentId, circuit);
  return circuit.components.filter(
    (c) => c.id !== faultedComponentId && network.has(c.id) && defs[c.type]?.isProtection,
  );
}
