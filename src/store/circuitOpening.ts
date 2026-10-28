import type { Circuit } from '@electrasim/domain/types';
import { sameDocument } from './circuitAccess';
import { saveRawRecovery } from './circuitRecovery';
import { useCircuitStore } from './circuitStore';
import { accessGeneration, authorizeCircuit, requiresServerAuthorization } from './simulatorAccess';
import { useUiStore } from './uiStore';

/** Opening is a view operation: denied access preserves the complete drawing.
 * Editing and running still cross the fresh action boundary independently.
 */
export function openCircuitDocument(circuit: Circuit) {
  useUiStore.getState().setSimRunning(false);
  useCircuitStore.getState().setCircuit(circuit);
  if (requiresServerAuthorization(circuit)) void authorizeCircuit(circuit).catch(() => {});
}

/** Keep the exact imported text before replacing the view; late reads cannot replace a new session/drawing. */
export async function openImportedCircuit(
  circuit: Circuit,
  raw: string,
  before = useCircuitStore.getState(),
  generation = accessGeneration(),
) {
  if (requiresServerAuthorization(circuit)) await saveRawRecovery(raw);
  if (generation !== accessGeneration() || !sameDocument(before, useCircuitStore.getState()))
    throw new Error('The circuit or access changed while reading the import. Please retry.');
  openCircuitDocument(circuit);
}
