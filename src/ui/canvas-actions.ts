/**
 * canvas-actions — renderer-agnostic business logic for canvas interactions.
 *
 * `CircuitCanvas` (SVG) calls into this module so wire-creation rules, drop
 * logic, and validation only exist in one place. The renderer is responsible
 * only for *visuals* and *pointer→canvas-
 * coord conversion*.
 */

import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type ConnectionValidationResult,
  type WireInstance,
  snapToGrid,
  validateConnection,
} from '../domain';
import {
  buildSeedCircuitForMode,
  clearHistory,
  useCircuitStore,
  useSettingsStore,
  useUiStore,
} from '../store';
import { clearPersistedCircuit } from '../store/persistence';
import { clearPersistedSettings } from '../store/settingsStore';

export interface PortLoc {
  componentId: string;
  portIndex: number;
}

let wireSeq = 0;

/** Surface any non-blocking connection warnings to the log panel. */
function logConnectionWarnings(
  validation: ConnectionValidationResult,
  addLog: (message: string, type: 'warning') => void,
): void {
  if (!validation.warnings) return;
  for (const warning of validation.warnings) {
    addLog(`Warning: ${warning.message}`, 'warning');
  }
}

/** Validate a candidate wire and return an error string or null if OK. */
export function validateWire(
  a: PortLoc,
  b: PortLoc,
  byId: Map<string, ComponentInstance>,
): string | null {
  const mode = useSettingsStore.getState().appMode ?? 'basic';
  const result = validateConnection({
    source: a,
    target: b,
    componentsById: byId,
    mode,
  });
  if (!result.allowed) {
    return result.explanation ? `${result.message} (${result.explanation})` : result.message;
  }
  return null;
}

/**
 * Drive the click-port-click-port wire-creation state machine.
 * Returns true if a wire was committed, false otherwise.
 */
export function handlePortClick(
  compId: string,
  portIndex: number,
  byId: Map<string, ComponentInstance>,
): boolean {
  const ui = useUiStore.getState();
  const pending = ui.pendingWireFrom;
  if (!pending) {
    ui.setMode('wiring');
    ui.setPendingWireFrom({ componentId: compId, portIndex });
    return false;
  }
  if (pending.componentId === compId && pending.portIndex === portIndex) {
    ui.setPendingWireFrom(null);
    ui.setMode('idle');
    return false;
  }
  const mode = useSettingsStore.getState().appMode ?? 'basic';
  const validation = validateConnection({
    source: pending,
    target: { componentId: compId, portIndex },
    componentsById: byId,
    mode,
  });

  if (!validation.allowed) {
    const errorMsg = validation.explanation
      ? `${validation.message} — ${validation.explanation}`
      : validation.message;
    ui.addLog(errorMsg, 'error');
    ui.setPendingWireFrom(null);
    ui.setMode('idle');
    return false;
  }

  logConnectionWarnings(validation, ui.addLog);

  // Duplicate guard: skip if this exact port→port connection already exists.
  const existingWires = useCircuitStore.getState().wires;
  const duplicate = existingWires.find(
    (w) =>
      (w.fromComponentId === pending.componentId &&
        w.fromPortIndex === pending.portIndex &&
        w.toComponentId === compId &&
        w.toPortIndex === portIndex) ||
      (w.fromComponentId === compId &&
        w.fromPortIndex === portIndex &&
        w.toComponentId === pending.componentId &&
        w.toPortIndex === pending.portIndex),
  );
  if (duplicate) {
    console.log('[ElectraSim] Wire already exists between these ports — skipping.');
    ui.addLog('Wire already exists between these ports.', 'info');
    ui.setPendingWireFrom(null);
    ui.setMode('idle');
    return false;
  }
  // Phase 6.2: new wires inherit the user's current `routingStyle` so the
  // smart-routing default flips on without touching existing wires.
  const routingStyle = useSettingsStore.getState().routingStyle;
  const wire: WireInstance = {
    id: `w-${Date.now().toString(36)}-${(++wireSeq).toString(36)}`,
    fromComponentId: pending.componentId,
    fromPortIndex: pending.portIndex,
    toComponentId: compId,
    toPortIndex: portIndex,
    controlPoints: [],
    pathKind: routingStyle,
  };
  useCircuitStore.getState().addWire(wire);
  ui.setPendingWireFrom(null);
  ui.setMode('idle');
  ui.addLog('Wire connected.', 'info');
  return true;
}

/**
 * Drop a new component from the palette at the given canvas-space coords.
 */
export function dropComponentAt(canvasX: number, canvasY: number, gridSize: number): boolean {
  const ui = useUiStore.getState();
  if (!ui.placingType) return false;
  const def = COMPONENT_DEFS[ui.placingType];
  if (!def) return false;
  const snap = useSettingsStore.getState().snapToGrid;
  const x = snap ? snapToGrid(canvasX, gridSize) : canvasX;
  const y = snap ? snapToGrid(canvasY, gridSize) : canvasY;
  const id = `${ui.placingType.split('-')[0]}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
  useCircuitStore.getState().addComponent({
    id,
    type: ui.placingType,
    x,
    y,
    state: def.defaultOn ? { on: true } : {},
  });
  useCircuitStore.getState().selectComponent(id);
  ui.setPlacingType(null);
  ui.addLog(`Placed ${def.label}.`, 'info');
  useSettingsStore.getState().recordRecentComponent(ui.placingType);
  return true;
}

/** Commit a drag — snap final position to grid when snapping is enabled. */
export function commitDrag(componentId: string, gridSize: number) {
  const comp = useCircuitStore.getState().components.find((c) => c.id === componentId);
  if (!comp) return;
  const snap = useSettingsStore.getState().snapToGrid;
  useCircuitStore
    .getState()
    .moveComponent(
      comp.id,
      snap ? snapToGrid(comp.x, gridSize) : comp.x,
      snap ? snapToGrid(comp.y, gridSize) : comp.y,
    );
}

// ─── Phase 6.1: deletion + reroute ────────────────────────────────────────

/**
 * Request deletion of a component. Honours the user's `confirmDelete`
 * setting: when on, this stages a `pendingDeletion` for the modal to
 * pick up; when off, the deletion runs immediately.
 */
export function requestDeleteComponent(id: string): void {
  const ui = useUiStore.getState();
  if (ui.simRunning) {
    ui.addLog(
      'Cannot delete component while simulation is running. Pause simulation first.',
      'warning',
    );
    return;
  }
  const cs = useCircuitStore.getState();
  if (!cs.components.some((c) => c.id === id)) return;
  if (useSettingsStore.getState().confirmDelete) {
    ui.setPendingDeletion({ kind: 'component', id });
  } else {
    cs.removeComponent(id);
    ui.addLog('Component deleted.', 'info');
  }
}

/** Same contract as `requestDeleteComponent` but for a wire. */
export function requestDeleteWire(id: string): void {
  const ui = useUiStore.getState();
  if (ui.simRunning) {
    ui.addLog('Cannot delete wire while simulation is running. Pause simulation first.', 'warning');
    return;
  }
  const cs = useCircuitStore.getState();
  if (!cs.wires.some((w) => w.id === id)) return;
  if (useSettingsStore.getState().confirmDelete) {
    ui.setPendingDeletion({ kind: 'wire', id });
  } else {
    cs.removeWire(id);
    ui.addLog('Wire deleted.', 'info');
  }
}

/** Rotate the selected component(s) by delta degrees. */
export function requestRotateSelection(deltaDegrees = 90): void {
  const ui = useUiStore.getState();
  if (ui.simRunning) {
    ui.addLog('Cannot rotate components while simulation is running.', 'warning');
    return;
  }
  const circuit = useCircuitStore.getState();
  const hasSelection =
    circuit.selectedComponentIds.length > 0 || circuit.selectedComponentId !== null;
  if (!hasSelection) return;

  circuit.rotateSelected(deltaDegrees);
  ui.addLog(`Rotated component(s) ${deltaDegrees}°.`, 'info');
}

/** Delete the current component group, multi-selection, or wire through the same guarded flow. */
export function requestDeleteSelection(): void {
  const ui = useUiStore.getState();
  if (ui.simRunning) {
    ui.addLog('Cannot delete while simulation is running. Pause simulation first.', 'warning');
    return;
  }

  const circuit = useCircuitStore.getState();
  const componentIds = Array.from(
    new Set([
      ...circuit.selectedComponentIds,
      ...(circuit.selectedComponentId ? [circuit.selectedComponentId] : []),
    ]),
  ).filter((id) => circuit.components.some((c) => c.id === id));

  const wireIds = circuit.selectedWireIds.filter((id) => circuit.wires.some((w) => w.id === id));

  const totalItems = componentIds.length + wireIds.length;
  if (totalItems === 0) return;

  if (componentIds.length === 1 && wireIds.length === 0) {
    requestDeleteComponent(componentIds[0]!);
    return;
  }

  if (wireIds.length === 1 && componentIds.length === 0) {
    requestDeleteWire(wireIds[0]!);
    return;
  }

  if (useSettingsStore.getState().confirmDelete) {
    ui.setPendingDeletion({ kind: 'components', ids: componentIds });
  } else {
    circuit.removeSelected();
    ui.addLog(
      `Deleted ${componentIds.length} component${componentIds.length === 1 ? '' : 's'}${wireIds.length > 0 ? ` and ${wireIds.length} wire${wireIds.length === 1 ? '' : 's'}` : ''} in a single action.`,
      'info',
    );
  }
}

// ─── Phase 7: Custom-path wire commit ────────────────────────────────────

/**
 * Called when the user clicks a destination port while a custom path is
 * in flight. Validates the connection, builds a wire whose `controlPoints`
 * are the user-placed checkpoints, and commits it as one undoable entry.
 * Returns true on success, false (with a log entry) on error.
 */
export function commitCustomPath(destCompId: string, destPortIndex: number): boolean {
  const ui = useUiStore.getState();
  const path = ui.pendingCustomPath;
  if (!path) return false;
  const { components } = useCircuitStore.getState();
  const byId = new Map(components.map((c) => [c.id, c]));
  const mode = useSettingsStore.getState().appMode ?? 'basic';
  const validation = validateConnection({
    source: path.from,
    target: { componentId: destCompId, portIndex: destPortIndex },
    componentsById: byId,
    mode,
  });
  if (!validation.allowed) {
    const errorMsg = validation.explanation
      ? `${validation.message} — ${validation.explanation}`
      : validation.message;
    ui.addLog(errorMsg, 'error');
    ui.cancelCustomPath();
    return false;
  }
  logConnectionWarnings(validation, ui.addLog);
  const existingWiresC = useCircuitStore.getState().wires;
  const duplicateC = existingWiresC.find(
    (w) =>
      (w.fromComponentId === path.from.componentId &&
        w.fromPortIndex === path.from.portIndex &&
        w.toComponentId === destCompId &&
        w.toPortIndex === destPortIndex) ||
      (w.fromComponentId === destCompId &&
        w.fromPortIndex === destPortIndex &&
        w.toComponentId === path.from.componentId &&
        w.toPortIndex === path.from.portIndex),
  );
  if (duplicateC) {
    console.log('[ElectraSim] Wire already exists between these ports — skipping.');
    ui.addLog('Wire already exists between these ports.', 'info');
    ui.cancelCustomPath();
    return false;
  }
  const routingStyle = useSettingsStore.getState().routingStyle;
  const wire: import('../domain').WireInstance = {
    id: `w-${Date.now().toString(36)}-${(++wireSeq).toString(36)}`,
    fromComponentId: path.from.componentId,
    fromPortIndex: path.from.portIndex,
    toComponentId: destCompId,
    toPortIndex: destPortIndex,
    controlPoints: path.checkpoints.slice(),
    pathKind: routingStyle,
  };
  useCircuitStore.getState().addWire(wire);
  ui.cancelCustomPath();
  ui.addLog(
    `Custom wire connected (${path.checkpoints.length} corner${path.checkpoints.length === 1 ? '' : 's'}).`,
    'info',
  );
  return true;
}

// ─── Phase 6.3-slim: Alignment + Distribute ──────────────────────────────────

export type AlignAxis = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
export type DistributeAxis = 'horizontal' | 'vertical';

/**
 * Align all selected components along the given axis.
 * Uses the bounding box of the selection as the reference.
 * Each call is one undoable history entry (all moves batched via `moveComponents`).
 */
export function alignSelected(axis: AlignAxis): void {
  const { components, selectedComponentIds, setComponentPositions } = useCircuitStore.getState();
  if (selectedComponentIds.length < 2) return;
  const selected = components.filter((c) => selectedComponentIds.includes(c.id));
  const xs = selected.map((c) => c.x);
  const ys = selected.map((c) => c.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const updates: { id: string; x: number; y: number }[] = selected.map((c) => {
    let x = c.x;
    let y = c.y;
    if (axis === 'left') x = minX;
    else if (axis === 'right') x = maxX;
    else if (axis === 'center-h') x = midX;
    else if (axis === 'top') y = minY;
    else if (axis === 'bottom') y = maxY;
    else if (axis === 'center-v') y = midY;
    return { id: c.id, x, y };
  });
  setComponentPositions(updates);
}

/**
 * Distribute selected components evenly along an axis.
 * Keeps the two outermost components in place; spaces the rest uniformly.
 */
export function distributeSelected(axis: DistributeAxis): void {
  const { components, selectedComponentIds, setComponentPositions } = useCircuitStore.getState();
  if (selectedComponentIds.length < 3) return;
  const selected = components.filter((c) => selectedComponentIds.includes(c.id));
  if (axis === 'horizontal') {
    const sorted = [...selected].sort((a, b) => a.x - b.x);
    const span = sorted[sorted.length - 1].x - sorted[0].x;
    const gap = span / (sorted.length - 1);
    const updates = sorted.map((c, i) => ({ id: c.id, x: sorted[0].x + i * gap, y: c.y }));
    setComponentPositions(updates);
  } else {
    const sorted = [...selected].sort((a, b) => a.y - b.y);
    const span = sorted[sorted.length - 1].y - sorted[0].y;
    const gap = span / (sorted.length - 1);
    const updates = sorted.map((c, i) => ({ id: c.id, x: c.x, y: sorted[0].y + i * gap }));
    setComponentPositions(updates);
  }
}

/** Confirm whatever is pending — invoked by the dialog. */
export function confirmPendingDeletion(): void {
  const ui = useUiStore.getState();
  if (ui.simRunning) {
    ui.addLog(
      'Cannot perform deletion while simulation is running. Pause simulation first.',
      'warning',
    );
    ui.setPendingDeletion(null);
    return;
  }
  const pending = ui.pendingDeletion;
  if (!pending) return;
  const cs = useCircuitStore.getState();
  switch (pending.kind) {
    case 'component':
      cs.removeComponent(pending.id);
      ui.addLog('Component deleted.', 'info');
      ui.showUndoToast('Component deleted');
      break;
    case 'components':
      cs.removeComponents(pending.ids);
      ui.addLog(`Deleted ${pending.ids.length} components.`, 'info');
      ui.showUndoToast(`Deleted ${pending.ids.length} components`);
      break;
    case 'wire':
      cs.removeWire(pending.id);
      ui.addLog('Wire deleted.', 'info');
      ui.showUndoToast('Wire deleted');
      break;
    case 'clear-wires':
      cs.clearAllWires();
      ui.addLog('All wires cleared.', 'info');
      ui.showUndoToast('All wires cleared');
      break;
    case 'clear-all':
      cs.clearAllComponents();
      ui.addLog('All components and wires cleared.', 'info');
      ui.showUndoToast('All components and wires cleared');
      break;
    case 'reset':
      cs.setCircuit(buildSeedCircuitForMode(useSettingsStore.getState().appMode));
      clearHistory();
      void clearPersistedCircuit();
      void clearPersistedSettings();
      ui.addLog('Circuit reset to defaults.', 'success');
      break;
  }
  ui.setPendingDeletion(null);
}

export function cancelPendingDeletion(): void {
  useUiStore.getState().setPendingDeletion(null);
}

// ─── Phase 6.9: Bulk-action requests ──────────────────────────────────────

/** Clear all wires, keep components. Gated by confirmDelete setting. */
export function requestClearWires(): void {
  const ui = useUiStore.getState();
  if (ui.simRunning) {
    ui.addLog('Cannot clear wires while simulation is running. Pause simulation first.', 'warning');
    return;
  }
  const cs = useCircuitStore.getState();
  if (cs.wires.length === 0) {
    ui.addLog('No wires to clear.', 'warning');
    return;
  }
  if (useSettingsStore.getState().confirmDelete) {
    ui.setPendingDeletion({ kind: 'clear-wires' });
  } else {
    cs.clearAllWires();
    ui.addLog('All wires cleared.', 'info');
  }
}

/** Clear all components AND wires. Gated by confirmDelete setting. */
export function requestClearAll(): void {
  const ui = useUiStore.getState();
  if (ui.simRunning) {
    ui.addLog(
      'Cannot clear circuit while simulation is running. Pause simulation first.',
      'warning',
    );
    return;
  }
  const cs = useCircuitStore.getState();
  if (cs.components.length === 0 && cs.wires.length === 0) {
    ui.addLog('Circuit is already empty.', 'warning');
    return;
  }
  if (useSettingsStore.getState().confirmDelete) {
    ui.setPendingDeletion({ kind: 'clear-all' });
  } else {
    cs.clearAllComponents();
    ui.addLog('All components and wires cleared.', 'info');
  }
}

/** Reset to seed circuit, clear undo history + persisted data. Always confirms. */
export function requestReset(): void {
  const ui = useUiStore.getState();
  if (ui.simRunning) {
    ui.addLog(
      'Cannot reset circuit while simulation is running. Pause simulation first.',
      'warning',
    );
    return;
  }
  // Reset is destructive enough to always confirm, regardless of setting.
  ui.setPendingDeletion({ kind: 'reset' });
}

/**
 * Apply a wire reroute to a target port. Returns true on success, false
 * (with a log entry) on validation failure. Called by both the drag-
 * endpoint flow and the select-then-click flow.
 */
export function applyReroute(wireId: string, end: 'from' | 'to', target: PortLoc): boolean {
  const ui = useUiStore.getState();
  const cs = useCircuitStore.getState();
  const wire = cs.wires.find((w) => w.id === wireId);
  if (!wire) return false;

  const otherCompId = end === 'from' ? wire.toComponentId : wire.fromComponentId;
  const otherPortIdx = end === 'from' ? wire.toPortIndex : wire.fromPortIndex;

  const byId = new Map(cs.components.map((c) => [c.id, c]));
  const mode = useSettingsStore.getState().appMode ?? 'basic';
  const validation = validateConnection({
    source: { componentId: otherCompId, portIndex: otherPortIdx },
    target,
    componentsById: byId,
    mode,
  });

  if (!validation.allowed) {
    const errorMsg = validation.explanation
      ? `Cannot reroute: ${validation.message} (${validation.explanation})`
      : `Cannot reroute: ${validation.message}`;
    ui.addLog(errorMsg, 'error');
    if (ui.mode === 'wiring') ui.setMode('idle');
    else ui.setReroute(null);
    return false;
  }

  const ok = cs.rerouteWire(wireId, end, target);
  if (ok) {
    ui.addLog(`Wire ${end === 'from' ? 'origin' : 'target'} rerouted.`, 'info');
    logConnectionWarnings(validation, ui.addLog);
  } else {
    ui.addLog('Cannot reroute: invalid target port.', 'error');
  }
  if (ui.mode === 'wiring') ui.setMode('idle');
  else ui.setReroute(null);
  return ok;
}
