import { selectCircuit, useCircuitStore } from './circuitStore';
import { closeElectricalEdit, useElectricalEditing } from './electricalEditing';

/** Explicit confirmation for persistence/history tests; public controls only stage. */
export function confirmElectricalEdit() {
  const request = useElectricalEditing.getState().request;
  if (!request || (request.kind === 'supply' && !request.profile)) return false;
  const edit =
    request.kind === 'supply'
      ? { kind: 'supply' as const, target: request.target, profile: request.profile! }
      : { kind: 'variant' as const, componentId: request.componentId, toType: request.toType };
  const result = useCircuitStore
    .getState()
    .applyElectricalEdit(edit, selectCircuit(useCircuitStore.getState()), request.id);
  if (result instanceof Promise) return result.finally(closeElectricalEdit);
  closeElectricalEdit();
  return result;
}
