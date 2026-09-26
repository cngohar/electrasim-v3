/**
 * guidedCircuitLoader — the single place that loads a guided circuit template
 * into the editor (shared by the Guided Circuits window and the in-app docs).
 *
 * Mirrors the historical TemplatesModal behaviour: confirm before replacing a
 * non-empty canvas, install the cloned circuit, activate the guide checklist,
 * reset simulation/wiring state, promote to Pro mode for Pro guides, and log.
 */
import { type GuidedCircuitTemplate, cloneTemplateCircuit } from '@electrasim/domain/templates';
import { useCircuitStore, useSettingsStore, useUiStore } from '../store';

export function loadGuidedCircuitIntoEditor(template: GuidedCircuitTemplate): void {
  const circuit = useCircuitStore.getState();
  const hasCircuit = circuit.components.length > 0 || circuit.wires.length > 0;
  if (
    hasCircuit &&
    !window.confirm(
      'Replace the current canvas with this guided circuit? You can undo after loading.',
    )
  ) {
    return;
  }

  useCircuitStore.getState().setCircuit(cloneTemplateCircuit(template));
  const ui = useUiStore.getState();
  ui.setActiveGuideId(template.id);
  ui.setSimRunning(false);
  ui.setSimResult(null);
  ui.setPendingWireFrom(null);
  ui.setPlacingType(null);
  ui.setReroute(null);
  ui.cancelCustomPath();
  ui.addLog(`Loaded guided circuit: ${template.title}`, 'success');

  // Pro guides teach Pro components — switch the workbench to Pro mode so
  // the palette and tools match the guide.
  if (template.tier === 'pro' && useSettingsStore.getState().appMode === 'basic') {
    useSettingsStore.getState().setSetting('appMode', 'pro');
    ui.addLog('Switched to Pro Electrician Mode — this guide uses Pro components.', 'info');
  }
}
