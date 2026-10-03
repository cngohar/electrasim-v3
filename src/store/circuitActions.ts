/**
 * Standalone circuit-store actions (undo/redo plumbing, momentary-contact
 * helpers, workhorse selectors).
 *
 * Split verbatim from the former monolithic `circuitStore.ts`. One-way
 * dependency: this module imports the store; the store does not import
 * this module.
 */

import { COMPONENT_DEFS, type Circuit } from '@electrasim/domain';
import { sameDocument } from './circuitAccess';
import { useCircuitStore } from './circuitStore';
import type { CircuitState } from './circuitStore.types';
import { editingAllowed } from './electricalEditing';
import {
  accessGeneration,
  accessMessage,
  authorizeCircuit,
  requiredForEditor,
} from './simulatorAccess';
import { useUiStore } from './uiStore';

function reconcileSelection(): void {
  const state = useCircuitStore.getState();
  const componentIds = new Set(state.components.map((component) => component.id));
  const wireIds = new Set(state.wires.map((wire) => wire.id));
  const selectedComponentIds = state.selectedComponentIds.filter((id) => componentIds.has(id));
  const selectedComponentId =
    state.selectedComponentId && componentIds.has(state.selectedComponentId)
      ? state.selectedComponentId
      : (selectedComponentIds[0] ?? null);
  const selectedWireIds = state.selectedWireIds.filter((id) => wireIds.has(id));

  if (
    selectedComponentId !== state.selectedComponentId ||
    selectedComponentIds.length !== state.selectedComponentIds.length ||
    selectedWireIds.length !== state.selectedWireIds.length
  ) {
    useCircuitStore.setState({ selectedComponentId, selectedComponentIds, selectedWireIds });
  }
}

function notifySpatialChange(
  beforeComps: Map<string, { x: number; y: number }>,
  kind: 'undo' | 'redo',
): void {
  try {
    const after = useCircuitStore.getState();
    const afterMap = new Map(after.components.map((c) => [c.id, c]));

    // 1. Moved component
    for (const [id, beforePos] of beforeComps) {
      const afterComp = afterMap.get(id);
      if (
        afterComp &&
        (Math.abs(afterComp.x - beforePos.x) > 1 || Math.abs(afterComp.y - beforePos.y) > 1)
      ) {
        useUiStore.getState().triggerSpatialIndicator(afterComp.x, afterComp.y, kind);
        return;
      }
    }

    // 2. Added/restored component
    for (const [id, afterComp] of afterMap) {
      if (!beforeComps.has(id)) {
        useUiStore.getState().triggerSpatialIndicator(afterComp.x, afterComp.y, kind);
        return;
      }
    }

    // 3. Removed component
    for (const [id, beforePos] of beforeComps) {
      if (!afterMap.has(id)) {
        useUiStore.getState().triggerSpatialIndicator(beforePos.x, beforePos.y, kind);
        return;
      }
    }

    // 4. Selected item
    if (after.selectedComponentId) {
      const c = afterMap.get(after.selectedComponentId);
      if (c) {
        useUiStore.getState().triggerSpatialIndicator(c.x, c.y, kind);
      }
    }
  } catch {
    // Non-fatal UI enhancement
  }
}

function changeHistory(kind: 'undo' | 'redo') {
  if (!editingAllowed()) return;
  const state = useCircuitStore.getState();
  const generation = accessGeneration();
  const history = useCircuitStore.temporal.getState();
  const target = (kind === 'undo' ? history.pastStates : history.futureStates).at(-1);
  if (!target) return;
  const candidate = { ...state, ...target };
  const apply = () => {
    if (
      generation !== accessGeneration() ||
      !sameDocument(state, useCircuitStore.getState()) ||
      !editingAllowed()
    ) {
      accessMessage('Circuit changed; retry undo or redo.');
      return;
    }
    const before = new Map(state.components.map((c) => [c.id, { x: c.x, y: c.y }]));
    history[kind]();
    reconcileSelection();
    notifySpatialChange(before, kind);
  };
  if (!requiredForEditor(state).length && !requiredForEditor(candidate).length) {
    apply();
    return;
  }
  void (async () => {
    await authorizeCircuit(state);
    await authorizeCircuit(candidate);
    apply();
  })().catch(() => {});
}
export const undo = () => changeHistory('undo');
export const redo = () => changeHistory('redo');
export const clearHistory = () => useCircuitStore.temporal.getState().clear();

/**
 * Momentary contacts are live interaction state, not an edit to the circuit.
 * Keep press/release out of undo history while still publishing the component
 * update to the renderer and simulation worker.
 */
const momentaryIntents = new Map<string, number>();
export function setMomentarySwitchState(id: string, on: boolean): boolean {
  const state = useCircuitStore.getState();
  const generation = accessGeneration();
  const component = state.components.find((item) => item.id === id);
  if (!component || !COMPONENT_DEFS[component.type]?.isMomentary) return false;
  const intent = (momentaryIntents.get(id) ?? 0) + 1;
  momentaryIntents.set(id, intent);
  if (component.state.on === on) return true;
  const apply = () => {
    if (
      momentaryIntents.get(id) !== intent ||
      (on && generation !== accessGeneration()) ||
      !sameDocument(state, useCircuitStore.getState())
    )
      return;
    const temporal = useCircuitStore.temporal.getState();
    const tracking = temporal.isTracking;
    temporal.pause();
    useCircuitStore.setState({
      components: state.components.map((c) =>
        c.id === id ? { ...c, state: { ...c.state, on } } : c,
      ),
    });
    if (tracking) temporal.resume();
  };
  if (!on || !requiredForEditor(state).length) apply();
  else
    void authorizeCircuit(state)
      .then(apply)
      .catch(() => {});
  return true;
}

/** Cancel pending presses as well as contacts already held down. */
export function releaseMomentarySwitches(): void {
  for (const component of useCircuitStore.getState().components) {
    if (
      COMPONENT_DEFS[component.type]?.isMomentary &&
      (component.state.on || momentaryIntents.has(component.id))
    )
      setMomentarySwitchState(component.id, false);
  }
}

// ── Convenient derived selector: the full Circuit shape ───────────────────
export const selectCircuit = (s: CircuitState): Circuit => ({
  components: s.components,
  wires: s.wires,
  globalVoltage: s.globalVoltage,
  supply: s.supply,
  faults: s.faults,
});
