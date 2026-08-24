/**
 * Circuit topology analysis helper functions for ElectraSim v2.
 *
 * Checks downstream connections, protection device placement, and path integrity.
 */

import { COMPONENT_DEFS } from '../components';
import type { Circuit, ComponentInstance, WireInstance } from '../types';

export interface TopologySummary {
  hasSupplySource: boolean;
  hasProtection: boolean;
  activeLoopsCount: number;
  unprotectedLoads: string[];
}

/**
 * Builds an adjacency map of connected components for graph traversal.
 */
export function buildCircuitAdjacency(circuit: Circuit): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();

  for (const comp of circuit.components) {
    adj.set(comp.id, new Set());
  }

  for (const wire of circuit.wires) {
    if (wire.fault === 'open-circuit' || wire.isBusted) continue;
    adj.get(wire.fromComponentId)?.add(wire.toComponentId);
    adj.get(wire.toComponentId)?.add(wire.fromComponentId);
  }

  return adj;
}

/**
 * Checks if a specific target component is directly connected to a power supply source
 * without passing through an MCB / fuse / protection device when protection is available.
 */
export function isBypassingProtection(
  sourceComp: ComponentInstance,
  targetComp: ComponentInstance,
  circuit?: Circuit,
): boolean {
  if (!circuit || circuit.components.length === 0) return false;

  const sourceDef = COMPONENT_DEFS[sourceComp.type];
  const targetDef = COMPONENT_DEFS[targetComp.type];

  // If source is a raw supply rail and target is a load or socket
  if (sourceDef?.isSource && (targetDef?.isLoad || targetDef?.isSocket)) {
    // Check if there are protection devices placed on canvas that were bypassed
    const hasProtectionOnCanvas = circuit.components.some(
      (c) => COMPONENT_DEFS[c.type]?.isProtection,
    );
    return hasProtectionOnCanvas;
  }

  return false;
}
