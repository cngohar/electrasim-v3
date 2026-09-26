/**
 * Circuit indexing — O(1) lookup maps rebuilt each simulation tick.
 *
 * Split verbatim from the former monolithic `simulation.ts`. Pure module:
 * no React / DOM imports so it can ship into `simulation.worker.ts`.
 */

import { normalizeCircuitFaults } from '../faults';
import type { Circuit, ComponentInstance, InjectedFault, WireInstance } from '../types';

// ─── Indexed views over a Circuit (rebuilt each tick — cheap) ──────────────

export interface CircuitIndex {
  /** componentId → component */
  byId: Map<string, ComponentInstance>;
  /** "compId:portIdx" → wires touching that port (both directions). */
  byPort: Map<string, WireInstance[]>;
  /** wireId → wire */
  wireById: Map<string, WireInstance>;
  /** Normalized active injected faults */
  activeFaults: InjectedFault[];
  faultsByComponent: Map<string, InjectedFault[]>;
  faultsByWire: Map<string, InjectedFault[]>;
  faultsByPort: Map<string, InjectedFault[]>;
}

export const portKey = (compId: string, portIdx: number) => `${compId}:${portIdx}`;

export function indexCircuit(circuit: Circuit): CircuitIndex {
  const byId = new Map<string, ComponentInstance>();
  for (const c of circuit.components) byId.set(c.id, c);

  const byPort = new Map<string, WireInstance[]>();
  const wireById = new Map<string, WireInstance>();
  const pushAt = (key: string, w: WireInstance) => {
    const list = byPort.get(key);
    if (list) {
      list.push(w);
    } else {
      byPort.set(key, [w]);
    }
  };

  const activeFaults = normalizeCircuitFaults(circuit);
  const faultsByComponent = new Map<string, InjectedFault[]>();
  const faultsByWire = new Map<string, InjectedFault[]>();
  const faultsByPort = new Map<string, InjectedFault[]>();

  for (const f of activeFaults) {
    if (f.target.type === 'component') {
      const list = faultsByComponent.get(f.target.id) ?? [];
      list.push(f);
      faultsByComponent.set(f.target.id, list);
    } else if (f.target.type === 'wire') {
      const list = faultsByWire.get(f.target.id) ?? [];
      list.push(f);
      faultsByWire.set(f.target.id, list);
    } else if (f.target.type === 'port') {
      const key = portKey(f.target.componentId, f.target.portIndex);
      const list = faultsByPort.get(key) ?? [];
      list.push(f);
      faultsByPort.set(key, list);
    }
  }

  for (const w of circuit.wires) {
    wireById.set(w.id, w);
    pushAt(portKey(w.fromComponentId, w.fromPortIndex), w);
    pushAt(portKey(w.toComponentId, w.toPortIndex), w);
  }

  return {
    byId,
    byPort,
    wireById,
    activeFaults,
    faultsByComponent,
    faultsByWire,
    faultsByPort,
  };
}
