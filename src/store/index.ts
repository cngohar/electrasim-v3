/**
 * Store barrel — single import surface.
 *
 *   import { useCircuitStore, useUiStore, useViewportStore, useSimulation,
 *            undo, redo } from '@/src/store';
 */

export {
  clearHistory,
  redo,
  releaseMomentarySwitches,
  selectCircuit,
  setMomentarySwitchState,
  undo,
  useCircuitStore,
} from './circuitStore';
export {
  focusFaultTarget,
  useUiStore,
  type ContextMenuState,
  type PendingCustomPath,
} from './uiStore';
export { useViewportStore } from './viewportStore';
export {
  DEFAULT_CIRCUIT_NAME,
  useCircuitLibraryStore,
  type CircuitLibraryDocument,
} from './circuitLibraryStore';
export { useSimulation } from './useSimulation';
export { useClipboardStore } from './clipboardStore';
export {
  buildSeedCircuit,
  buildSeedCircuitForMode,
  buildProSeedCircuit,
  buildStudentSeedCircuit,
} from './seed';
export {
  clearPersistedSettings,
  startSettingsPersistence,
  useSettingsStore,
  type DiagnosticOverlayMode,
  type UserSettings,
} from './settingsStore';
