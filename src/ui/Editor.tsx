/** Composition root for the interactive editor and its optional surfaces. */

import { isGuidedCircuitId } from '@electrasim/domain/guidedCircuitIds';
import { getGuidedCircuitTemplate } from '@electrasim/domain/templates';
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { loadGuidedCircuitIntoEditor } from '../lib/guidedCircuitLoader';
import { useDevice } from '../lib/useDevice';
import {
  releaseMomentarySwitches,
  setMomentarySwitchState,
  useCircuitStore,
  useSettingsStore,
  useSimulation,
  useUiStore,
} from '../store';
import { CircuitCanvas } from './CircuitCanvas';

// Optional dialogs stay out of the main editing bundle.
const ContactModal = lazy(() =>
  import('./components/ContactModal').then((m) => ({ default: m.ContactModal })),
);
const DocsPage = lazy(() => import('./components/DocsPage').then((m) => ({ default: m.DocsPage })));
const ImportExportModal = lazy(() =>
  import('./components/ImportExportModal').then((m) => ({ default: m.ImportExportModal })),
);
const SettingsModal = lazy(() =>
  import('./components/SettingsModal').then((m) => ({ default: m.SettingsModal })),
);
const TemplatesModal = lazy(() =>
  import('./components/TemplatesModal').then((m) => ({ default: m.TemplatesModal })),
);
const GuidedCircuitPanel = lazy(() =>
  import('./components/GuidedCircuitPanel').then((m) => ({ default: m.GuidedCircuitPanel })),
);
const ChallengeModeRuntime = lazy(() =>
  import('./components/ChallengeModeRuntime').then((m) => ({ default: m.ChallengeModeRuntime })),
);
const DiagnosisPanel = lazy(() =>
  import('./components/DiagnosisPanel').then((m) => ({ default: m.DiagnosisPanel })),
);
const MobileSuitabilityModal = lazy(() =>
  import('./components/MobileSuitabilityModal').then((m) => ({
    default: m.MobileSuitabilityModal,
  })),
);
const WelcomeModal = lazy(() =>
  import('./components/WelcomeModal').then((m) => ({ default: m.WelcomeModal })),
);
const TourOverlay = lazy(() =>
  import('./tour/TourOverlay').then((m) => ({ default: m.TourOverlay })),
);
/**
 * Deferred surfaces (docs/PERFORMANCE.md).
 *
 * Each of these renders nothing until a store flag opens it, but importing
 * them eagerly still shipped their code — and their icon and content tables —
 * in the first-paint bundle. They are gated on the same flag they already
 * check internally, so behaviour is unchanged; only the download moves.
 */
const ComponentInfoModal = lazy(() =>
  import('./components/ComponentInfoModal').then((m) => ({ default: m.ComponentInfoModal })),
);
const WhatHappenedModal = lazy(() =>
  import('./components/WhatHappenedModal').then((m) => ({ default: m.WhatHappenedModal })),
);
const ValidationDetailsModal = lazy(() =>
  import('./components/ValidationDetailsModal').then((m) => ({
    default: m.ValidationDetailsModal,
  })),
);
import type { PendingDeletion } from '../store/uiStore';
import { cancelPendingDeletion, confirmPendingDeletion } from './canvas-actions';
import { AlignmentBar } from './components/AlignmentBar';
import { CanvasToolbar } from './components/CanvasToolbar';
import { CommandPalette } from './components/CommandPalette';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ContextMenu } from './components/ContextMenu';
import { EventHistoryPanel } from './components/EventHistoryPanel';
import { FaultAlertModal } from './components/FaultAlertModal';
import { Inspector } from './components/Inspector';
import { LazySurface } from './components/LazySurface';
import { LogPanel } from './components/LogPanel';
import { MenuOverlay } from './components/MenuOverlay';
import { MiniMap } from './components/MiniMap';
import { Palette } from './components/Palette';
import { PhoneDock } from './components/PhoneDock';
import { ShortcutsOverlay } from './components/ShortcutsOverlay';
import { StatusPill } from './components/StatusPill';
import { SubHeaderBar } from './components/SubHeaderBar';
import { Toolbar } from './components/Toolbar';
import { UndoToast } from './components/UndoToast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useResolvedTheme } from './hooks/useResolvedTheme';
import {
  applyCanvasPreset,
  editorBackground,
  editorBackgroundDark,
  labGlassDark,
  labGlassLight,
} from './theme';
import { applyDocumentTheme } from './themePreference';
import { TourOfferChip } from './tour/TourOfferChip';

function confirmTitle(d: PendingDeletion | null): string {
  switch (d?.kind) {
    case 'wire':
      return 'Delete this wire?';
    case 'component':
      return 'Delete this component?';
    case 'components':
      return `Delete ${d.ids.length} components?`;
    case 'clear-wires':
      return 'Clear all wires?';
    case 'clear-all':
      return 'Clear all components?';
    case 'reset':
      return 'Reset to defaults?';
    default:
      return 'Confirm';
  }
}

function confirmDescription(d: PendingDeletion | null): string {
  switch (d?.kind) {
    case 'wire':
      return 'The wire will be removed. Undo with Ctrl+Z.';
    case 'component':
      return 'The component and any wires connected to it will be removed. Undo with Ctrl+Z.';
    case 'components':
      return 'The selected components and their connected wires will be removed in one undo step.';
    case 'clear-wires':
      return 'Every wire will be removed. Components stay. Undo with Ctrl+Z.';
    case 'clear-all':
      return 'Every component and wire will be removed. Undo with Ctrl+Z.';
    case 'reset':
      return 'The circuit will be replaced with the default demo. Undo history and saved settings will be erased. This cannot be undone.';
    default:
      return '';
  }
}

export function Editor() {
  const device = useDevice();
  const isPhone = device === 'phone';
  const isTablet = device === 'tablet';

  useSimulation();
  useKeyboardShortcuts();
  const resolvedTheme = useResolvedTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    applyDocumentTheme(resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    const releaseInterruptedPresses = () => releaseMomentarySwitches();
    const releaseWhenHidden = () => {
      if (document.visibilityState === 'hidden') releaseInterruptedPresses();
    };
    window.addEventListener('blur', releaseInterruptedPresses);
    window.addEventListener('pagehide', releaseInterruptedPresses);
    document.addEventListener('visibilitychange', releaseWhenHidden);
    return () => {
      window.removeEventListener('blur', releaseInterruptedPresses);
      window.removeEventListener('pagehide', releaseInterruptedPresses);
      document.removeEventListener('visibilitychange', releaseWhenHidden);
      releaseInterruptedPresses();
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const templateId = params.get('template');
    if (templateId && isGuidedCircuitId(templateId)) {
      const template = getGuidedCircuitTemplate(templateId);
      if (template) {
        // Clean URL so refresh won't re-trigger prompt
        const nextUrl = new URL(window.location.href);
        nextUrl.searchParams.delete('template');
        window.history.replaceState({}, '', nextUrl.pathname + nextUrl.search + nextUrl.hash);

        const circuit = useCircuitStore.getState();
        const hasCircuit = circuit.components.length > 0 || circuit.wires.length > 0;
        const promptMsg = hasCircuit
          ? `Load Guided Circuit "${template.title}"?\n\nThis will replace the current canvas with the guided circuit.`
          : `Load Guided Circuit "${template.title}" onto the canvas?`;

        if (window.confirm(promptMsg)) {
          loadGuidedCircuitIntoEditor(template);
        }
      }
    }
  }, []);

  const showGrid = useSettingsStore((s) => s.showGrid);
  const canvasPreset = useSettingsStore((s) => s.canvasPreset);
  const wireColorStandard = useSettingsStore((s) => s.wireColorStandard);
  const regulationStandard = useSettingsStore((s) => s.regulationStandard);
  const showMiniMap = useSettingsStore((s) => s.showMiniMap);
  const baseTheme = isDark ? labGlassDark : labGlassLight;
  const canvasTheme = applyCanvasPreset(
    baseTheme,
    { showGrid, canvasPreset, wireColorStandard, regulationStandard },
    isDark,
  );
  const bgGradient = isDark ? editorBackgroundDark : editorBackground;

  // Narrow selectors — see PLAN.md note in `circuitStore.ts` re: object selectors.
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const selectedId = useCircuitStore((s) => s.selectedComponentId);
  const circuit = useMemo(
    () => ({ components, wires, globalVoltage }),
    [components, wires, globalVoltage],
  );

  const simRunning = useUiStore((s) => s.simRunning);
  const simResult = useUiStore((s) => s.simResult);
  const logs = useUiStore((s) => s.logs);
  const paletteOpen = useUiStore((s) => s.paletteOpen);
  const logOpen = useUiStore((s) => s.logOpen);
  const settingsOpen = useUiStore((s) => s.settingsOpen);
  const settingsTab = useUiStore((s) => s.settingsTab);
  const importExportOpen = useUiStore((s) => s.importExportOpen);
  const templatesOpen = useUiStore((s) => s.templatesOpen);
  const activeGuideId = useUiStore((s) => s.activeGuideId);
  const challengeOpen = useUiStore((s) => s.challengeOpen);
  const challengeModeActive = useUiStore((s) => s.challengeModeActive);
  const diagnosisOpen = useUiStore((s) => s.diagnosisOpen);
  const mobileSuitabilityOpen = useUiStore((s) => s.mobileSuitabilityOpen);
  const welcomeOpen = useUiStore((s) => s.welcomeOpen);
  const tourId = useUiStore((s) => s.tourId);
  // Gates for the deferred surfaces above — each mirrors the flag the modal
  // already checks internally, so mounting behaviour is unchanged.
  const whatHappenedOpen = useUiStore((s) => s.whatHappenedOpen);
  const activeValidationIssueModal = useUiStore((s) => s.activeValidationIssueModal);
  const activeComponentInfoType = useUiStore((s) => s.activeComponentInfoType);
  const menuOpen = useUiStore((s) => s.menuOpen);
  const docsOpen = useUiStore((s) => s.docsOpen);
  const contactOpen = useUiStore((s) => s.contactOpen);
  const canvasSvgRef = useRef<SVGSVGElement | null>(null);
  const pendingDeletion = useUiStore((s) => s.pendingDeletion);
  const setSetting = useSettingsStore((s) => s.setSetting);
  const [skipDeleteConfirmation, setSkipDeleteConfirmation] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const eventHistoryOpen = useUiStore((s) => s.eventHistoryOpen);

  useEffect(() => {
    if (pendingDeletion) setSkipDeleteConfirmation(false);
  }, [pendingDeletion]);

  // Persist panel layout (palette / inspector / console) so it survives reloads.
  const savedPaletteOpen = useSettingsStore((s) => s.paletteOpen);
  const savedInspectorCollapsed = useSettingsStore((s) => s.inspectorCollapsed);
  const savedLogOpen = useSettingsStore((s) => s.logOpen);

  const appliedLayoutRef = useRef(false);
  useEffect(() => {
    // Apply saved panel layout once on mount (not on a phone).
    if (appliedLayoutRef.current) return;
    appliedLayoutRef.current = true;
    if (!isPhone) {
      useUiStore.getState().setPaletteOpen(savedPaletteOpen);
      useUiStore.getState().setInspectorCollapsed(savedInspectorCollapsed);
      useUiStore.getState().setLogOpen(savedLogOpen);
    }
  }, [isPhone, savedInspectorCollapsed, savedLogOpen, savedPaletteOpen]);

  useEffect(() => {
    setSetting('paletteOpen', paletteOpen);
  }, [paletteOpen, setSetting]);

  useEffect(() => {
    setSetting('logOpen', logOpen);
  }, [logOpen, setSetting]);

  const inspectorCollapsed = useUiStore((s) => s.inspectorCollapsed);
  useEffect(() => {
    setSetting('inspectorCollapsed', inspectorCollapsed);
  }, [inspectorCollapsed, setSetting]);

  const selectedComp = selectedId ? (components.find((c) => c.id === selectedId) ?? null) : null;
  const selectedWireIds = useCircuitStore((s) => s.selectedWireIds);
  const selectedWire =
    selectedWireIds.length === 1 ? (wires.find((w) => w.id === selectedWireIds[0]) ?? null) : null;
  const tabletConsoleOffset = isTablet ? (logOpen ? 'expanded' : 'collapsed') : 'none';

  return (
    <div
      className="electrasim-editor relative h-full w-full overflow-hidden"
      style={{ fontFamily: canvasTheme.font, background: bgGradient }}
    >
      <CircuitCanvas
        circuit={circuit}
        simResult={simResult}
        selectedId={selectedId}
        theme={canvasTheme}
        className="absolute inset-0 h-full w-full"
        onSelect={(id) => useCircuitStore.getState().selectComponent(id)}
        onToggleSwitch={(id) => useCircuitStore.getState().toggleSwitch(id)}
        onSetSwitchState={setMomentarySwitchState}
        externalSvgRef={canvasSvgRef}
      />
      {(challengeOpen || challengeModeActive) && (
        <LazySurface
          label="Challenge Mode"
          onClose={() => useUiStore.getState().setChallengeOpen(false)}
        >
          <ChallengeModeRuntime isPhone={isPhone} panelOpen={challengeOpen} />
        </LazySurface>
      )}

      <Toolbar
        isPhone={isPhone}
        simRunning={simRunning}
        dashboardOpen={dashboardOpen}
        onToggleDashboard={() => setDashboardOpen(!dashboardOpen)}
      />
      {!isPhone && <SubHeaderBar />}
      {!isPhone && <CanvasToolbar />}
      <Palette open={paletteOpen} isPhone={isPhone} />
      <Inspector
        selectedComp={selectedComp}
        selectedWire={selectedWire}
        simResult={simResult}
        isPhone={isPhone}
        dashboardOpen={dashboardOpen}
      />
      <EventHistoryPanel
        isOpen={eventHistoryOpen}
        onClose={() => useUiStore.getState().setEventHistoryOpen(false)}
      />
      <LogPanel isPhone={isPhone} open={logOpen} simRunning={simRunning} logs={logs} />
      <AlignmentBar />
      {activeGuideId && (
        <Suspense fallback={null}>
          <GuidedCircuitPanel isPhone={isPhone} />
        </Suspense>
      )}

      {diagnosisOpen && (
        <Suspense fallback={null}>
          <DiagnosisPanel isPhone={isPhone} />
        </Suspense>
      )}
      {showMiniMap && !isPhone && (
        <MiniMap consoleOffset={dashboardOpen ? 'expanded' : tabletConsoleOffset} />
      )}
      <StatusPill
        simRunning={simRunning}
        components={components.length}
        wires={wires.length}
        active={simResult?.energizedComponents.size ?? 0}
        dashboardOpen={dashboardOpen}
      />

      {isPhone && <PhoneDock />}

      <MenuOverlay open={menuOpen} onClose={() => useUiStore.getState().setMenuOpen(false)} />

      {docsOpen && (
        <LazySurface label="Documentation" onClose={() => useUiStore.getState().setDocsOpen(false)}>
          <DocsPage open onClose={() => useUiStore.getState().setDocsOpen(false)} />
        </LazySurface>
      )}

      {contactOpen && (
        <LazySurface label="Contact" onClose={() => useUiStore.getState().setContactOpen(false)}>
          <ContactModal open onClose={() => useUiStore.getState().setContactOpen(false)} />
        </LazySurface>
      )}

      {importExportOpen && (
        <LazySurface
          label="Import / Export"
          onClose={() => useUiStore.getState().setImportExportOpen(false)}
        >
          <ImportExportModal
            open
            onClose={() => useUiStore.getState().setImportExportOpen(false)}
            svgRef={canvasSvgRef}
          />
        </LazySurface>
      )}

      {templatesOpen && (
        <LazySurface
          label="Guided Circuits"
          onClose={() => useUiStore.getState().setTemplatesOpen(false)}
        >
          <TemplatesModal open onClose={() => useUiStore.getState().setTemplatesOpen(false)} />
        </LazySurface>
      )}

      {settingsOpen && (
        <LazySurface label="Settings" onClose={() => useUiStore.getState().setSettingsOpen(false)}>
          <SettingsModal
            open
            onClose={() => useUiStore.getState().setSettingsOpen(false)}
            initialTab={settingsTab}
          />
        </LazySurface>
      )}

      {mobileSuitabilityOpen && (
        <Suspense fallback={null}>
          <MobileSuitabilityModal />
        </Suspense>
      )}
      {welcomeOpen && (
        <Suspense fallback={null}>
          <WelcomeModal />
        </Suspense>
      )}
      {tourId && (
        <Suspense fallback={null}>
          <TourOverlay isPhone={isPhone} />
        </Suspense>
      )}
      <TourOfferChip isPhone={isPhone} />
      <FaultAlertModal />
      <CommandPalette />
      <ShortcutsOverlay />
      <UndoToast />
      {whatHappenedOpen && (
        <Suspense fallback={null}>
          <WhatHappenedModal />
        </Suspense>
      )}
      {activeValidationIssueModal && (
        <Suspense fallback={null}>
          <ValidationDetailsModal />
        </Suspense>
      )}
      {activeComponentInfoType && (
        <Suspense fallback={null}>
          <ComponentInfoModal />
        </Suspense>
      )}
      <ContextMenu />

      <ConfirmDialog
        open={!!pendingDeletion}
        title={confirmTitle(pendingDeletion)}
        description={confirmDescription(pendingDeletion)}
        confirmLabel={pendingDeletion?.kind === 'reset' ? 'Reset' : 'Delete'}
        intent="danger"
        alwaysDoLabel={pendingDeletion?.kind === 'reset' ? undefined : "Don't ask again"}
        alwaysDo={skipDeleteConfirmation}
        onAlwaysDoChange={setSkipDeleteConfirmation}
        onConfirm={() => {
          if (skipDeleteConfirmation) setSetting('confirmDelete', false);
          confirmPendingDeletion();
        }}
        onCancel={() => {
          setSkipDeleteConfirmation(false);
          cancelPendingDeletion();
        }}
      />
    </div>
  );
}
