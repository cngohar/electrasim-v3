/**
 * Fault→protection propagation — find which protective devices a fault can
 * actually reach through the wire graph, so faults operate the devices that
 * guard the faulted network rather than every device on the canvas.
 *
 * Pure module: no React / DOM imports so it can ship into `simulation.worker.ts`.
 *
 * NOTE (teaching simplification): within the faulted connected network ALL
 * capable devices are candidates. Selectivity/discrimination requires actual
 * current paths, device curves/settings and timing; nearest-device selection
 * alone cannot establish it. The replacement core supplies those in Phase 1.5D.
 */

import { isAutomaticProtection } from '../protectionRoles';
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
 * Automatic devices in the connected network, including a fault target that
 * is itself protective. The caller must filter for the fault's actual mechanism.
 */
export function findProtectionDevicesInNetwork(
  faultedComponentId: string,
  circuit: Circuit,
  defs: ComponentDefMap,
): ComponentInstance[] {
  const network = connectedNetworkComponents(faultedComponentId, circuit);
  return circuit.components.filter((c) => network.has(c.id) && isAutomaticProtection(c.type, defs));
}
