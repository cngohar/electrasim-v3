/**
 * Standalone circuit-store actions (undo/redo plumbing, momentary-contact
 * helpers, workhorse selectors).
 *
 * Split verbatim from the former monolithic `circuitStore.ts`. One-way
 * dependency: this module imports the store; the store does not import
 * this module.
 */

import { COMPONENT_DEFS, type Circuit } from '@electrasim/domain';
import { useCircuitStore } from './circuitStore';
import type { CircuitState } from './circuitStore.types';
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

export const undo = () => {
  const before = new Map(
    useCircuitStore.getState().components.map((c) => [c.id, { x: c.x, y: c.y }]),
  );
  useCircuitStore.temporal.getState().undo();
  reconcileSelection();
  notifySpatialChange(before, 'undo');
};
export const redo = () => {
  const before = new Map(
    useCircuitStore.getState().components.map((c) => [c.id, { x: c.x, y: c.y }]),
  );
  useCircuitStore.temporal.getState().redo();
  reconcileSelection();
  notifySpatialChange(before, 'redo');
};
export const clearHistory = () => useCircuitStore.temporal.getState().clear();

/**
 * Momentary contacts are live interaction state, not an edit to the circuit.
 * Keep press/release out of undo history while still publishing the component
 * update to the renderer and simulation worker.
 */
export function setMomentarySwitchState(id: string, on: boolean): boolean {
  const component = useCircuitStore.getState().components.find((item) => item.id === id);
  if (!component || !COMPONENT_DEFS[component.type]?.isMomentary) return false;
  if (component.state.on === on) return true;

  const temporal = useCircuitStore.temporal.getState();
  const shouldResume = temporal.isTracking;
  if (shouldResume) temporal.pause();
  try {
    useCircuitStore.getState().setSwitchState(id, on);
  } finally {
    if (shouldResume) temporal.resume();
  }
  return true;
}

/** Release any contacts left down by an interrupted pointer or keyboard gesture. */
export function releaseMomentarySwitches(): void {
  for (const component of useCircuitStore.getState().components) {
    if (component.state.on && COMPONENT_DEFS[component.type]?.isMomentary) {
      setMomentarySwitchState(component.id, false);
    }
  }
}

// ── Convenient derived selector: the full Circuit shape ───────────────────
export const selectCircuit = (s: CircuitState): Circuit => ({
  components: s.components,
  wires: s.wires,
  globalVoltage: s.globalVoltage,
  faults: s.faults,
});
