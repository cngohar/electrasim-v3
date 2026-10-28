import { produce } from 'immer';
import type { CircuitState } from './circuitStore.types';
import {
  accessMessage,
  authorizeCircuitChange,
  receiptIsCurrent,
  requiresServerAuthorization,
} from './simulatorAccess';

type Recipe = (state: CircuitState) => void;
export function sameDocument(a: CircuitState, b: CircuitState) {
  return (
    a.components === b.components &&
    a.wires === b.wires &&
    a.faults === b.faults &&
    a.globalVoltage === b.globalVoltage &&
    a.supply === b.supply &&
    a.componentGroups === b.componentGroups
  );
}
/** Central mutation boundary: compute once, authorize the actual content, then commit only
 * if the document has not changed while the request was pending. Selection stays synchronous.
 * setCircuit is a separate view/import operation and may open premium content read-only.
 */
export function guardedCircuitSet(get: () => CircuitState, commit: (state: CircuitState) => void) {
  return (recipe: Recipe, canCommit: () => boolean = () => true) => {
    if (!canCommit()) return false;
    const before = get();
    const next = produce(before, recipe);
    if (sameDocument(before, next)) {
      commit(next);
      return true;
    }
    try {
      if (!requiresServerAuthorization(before) && !requiresServerAuthorization(next)) {
        commit(next);
        return true;
      }
      return (async () => {
        // Both drawings cross the fresh boundary, even when their displayed requirements are empty.
        const receipt = await authorizeCircuitChange(
          before,
          next,
          () => sameDocument(before, get()) && canCommit(),
        );
        if (!receiptIsCurrent(receipt) || !sameDocument(before, get()) || !canCommit()) {
          accessMessage('The circuit changed while checking access. Please retry the edit.');
          return false;
        }
        // Preserve selection and other UI state that may have changed during the request.
        commit({
          ...get(),
          components: next.components,
          wires: next.wires,
          faults: next.faults,
          globalVoltage: next.globalVoltage,
          supply: next.supply,
          componentGroups: next.componentGroups,
          selectedComponentId:
            next.selectedComponentId === before.selectedComponentId
              ? get().selectedComponentId
              : next.selectedComponentId,
          selectedComponentIds:
            next.selectedComponentIds === before.selectedComponentIds
              ? get().selectedComponentIds
              : next.selectedComponentIds,
          selectedWireIds:
            next.selectedWireIds === before.selectedWireIds
              ? get().selectedWireIds
              : next.selectedWireIds,
        });
        return true;
      })().catch(() => false);
    } catch (error) {
      accessMessage(error instanceof Error ? error.message : 'Invalid circuit content');
      return false;
    }
  };
}
