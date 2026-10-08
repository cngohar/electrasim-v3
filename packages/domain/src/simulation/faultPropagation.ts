/** Component adjacency for the conservative Zs applicability check. This is
 * connectivity only; actual protection operation comes from solved pole currents. */
import type { Circuit } from '../types';

/** Component adjacency neighborhood, without terminal or winding isolation.
 * Suitable for conservative drawing checks, never a solved current path. */
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
