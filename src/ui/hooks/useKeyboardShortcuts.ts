/**
 * useKeyboardShortcuts — global keyboard bindings for the editor.
 *
 *   Ctrl/Cmd+Z          undo
 *   Ctrl/Cmd+Shift+Z    redo (also Ctrl+Y on non-Mac)
 *   Delete / Backspace  remove selected component or wire (Phase 6.1:
 *                       gated by `confirmDelete` setting)
 *   Escape              cancel pending wire / cancel reroute / clear
 *                       selection / drop back to idle mode
 *   V                   select tool
 *   W                   wire tool
 *   R                   reroute the selected wire's TO end (armed mode);
 *                       press again to swap to the FROM end. Phase 6.1.
 *   Ctrl/Cmd+C          copy selected component(s) to in-memory clipboard (Phase 6.2.4)
 *   Ctrl/Cmd+V          paste clipboard components with +24 px stacked offset (Phase 6.2.4)
 *   Ctrl/Cmd+E          open Import / Export modal (Phase 6.4)
 *   Ctrl/Cmd+S          quick-export circuit as JSON (Phase 6.4)
 *   P                   pause/resume active Challenge Mode session
 *   C                   check Challenge Mode progress
 *   H                   reveal the next Challenge Mode text hint
 *   V                   show the next Challenge Mode visual hint (Select otherwise)
 *
 * Bindings are skipped while the user is focused on a text input/textarea
 * so typing in the palette search bar (Phase 3.5) doesn't trigger them.
 */

import { useEffect } from 'react';
import { downloadText, exportJSON } from '../../lib/exportImport';
import {
  redo,
  undo,
  useCircuitStore,
  useClipboardStore,
  useSettingsStore,
  useUiStore,
  useViewportStore,
} from '../../store';
import { requestDeleteSelection, requestRotateSelection } from '../canvas-actions';

function runChallengeShortcut(key: string): void {
  void import('../../store/declarativeChallengeStore')
    .then(({ useDeclarativeChallengeStore }) => {
      const challenge = useDeclarativeChallengeStore.getState();
      if (key === 'p') {
        if (challenge.paused) challenge.resumeChallenge();
        else challenge.pauseChallenge();
      } else if (key === 'c') {
        challenge.check();
      } else if (key === 'h') {
        challenge.revealHint();
      } else if (key === 'v') {
        challenge.showVisualHint();
      }
    })
    .catch(() => undefined);
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inTextInput =
        target != null &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      // Escape is a universal cancel — allow it even inside text inputs
      // so pressing Esc while the palette search is focused still cancels
      // placement or closes modals.
      if (e.key === 'Escape') {
        const ui = useUiStore.getState();
        if (ui.commandPaletteOpen) {
          e.preventDefault();
          ui.setCommandPaletteOpen(false);
          return;
        }
        if (ui.faultLabOpen) {
          e.preventDefault();
          ui.setFaultLabOpen(false);
          return;
        }
        if (ui.shortcutsOpen) {
          e.preventDefault();
          ui.setShortcutsOpen(false);
          return;
        }
        if (ui.contextMenu) {
          e.preventDefault();
          ui.setContextMenu(null);
          return;
        }
        if (ui.activeValidationIssueModal) {
          e.preventDefault();
          ui.setActiveValidationIssueModal(null);
          return;
        }
        if (ui.whatHappenedOpen) {
          e.preventDefault();
          ui.setWhatHappenedOpen(false);
          return;
        }
        if (ui.faultAlert) {
          e.preventDefault();
          ui.clearFaultAlert();
          return;
        }
        if (ui.pendingDeletion) {
          e.preventDefault();
          ui.setPendingDeletion(null);
          return;
        }
        if (ui.mobileSuitabilityOpen) {
          e.preventDefault();
          ui.dismissMobileSuitability();
          return;
        }
        if (ui.welcomeOpen) {
          e.preventDefault();
          ui.setWelcomeOpen(false);
          return;
        }
        if (ui.templatesOpen) {
          e.preventDefault();
          ui.setTemplatesOpen(false);
          return;
        }
        if (ui.contactOpen) {
          e.preventDefault();
          ui.setContactOpen(false);
          return;
        }
        if (ui.docsOpen) {
          e.preventDefault();
          ui.setDocsOpen(false);
          return;
        }
        if (ui.menuOpen) {
          e.preventDefault();
          ui.setMenuOpen(false);
          return;
        }
        if (ui.importExportOpen) {
          e.preventDefault();
          ui.setImportExportOpen(false);
          return;
        }
        if (ui.settingsOpen) {
          e.preventDefault();
          ui.setSettingsOpen(false);
          return;
        }
        if (ui.challengeRuleFocus) {
          e.preventDefault();
          ui.setChallengeRuleFocus(null);
          return;
        }
        if (ui.pendingCustomPath) {
          e.preventDefault();
          ui.cancelCustomPath();
          return;
        }
        if (ui.reroute) {
          e.preventDefault();
          if (ui.mode === 'wiring') ui.setMode('idle');
          else ui.setReroute(null);
          return;
        }
        if (ui.placingType) {
          e.preventDefault();
          ui.setPlacingType(null);
          // Also blur any focused input so the canvas is ready.
          if (inTextInput) (target as HTMLElement).blur();
        } else if (ui.pendingWireFrom) {
          e.preventDefault();
          ui.setPendingWireFrom(null);
          ui.setMode('idle');
        } else if (!inTextInput) {
          // Only clear selection if we're not in a text input
          // (user might just be pressing Esc to leave the search box).
          useCircuitStore.getState().clearSelection();
          ui.setMode('idle');
        }
        return;
      }

      // Skip all other shortcuts when focused on text input fields or inside
      // a modal. The modal's own focus/Enter/Escape handling should win.
      const inDialog =
        target != null && typeof target.closest === 'function' && target.closest('dialog') !== null;
      if (inTextInput || inDialog) return;

      const ui = useUiStore.getState();
      const meta = e.ctrlKey || e.metaKey;
      const challengeKey = e.key.toLowerCase();

      // Challenge Mode bindings run before the generic pause guard so P can
      // resume a paused session. The dynamic import preserves the lazy
      // Challenge Mode boundary for users who never enter an exercise.
      if (
        ui.challengeModeActive &&
        !meta &&
        !e.shiftKey &&
        !e.repeat &&
        (challengeKey === 'p' ||
          challengeKey === 'c' ||
          challengeKey === 'h' ||
          challengeKey === 'v')
      ) {
        e.preventDefault();
        runChallengeShortcut(challengeKey);
        return;
      }

      // A paused challenge locks every editor shortcut except the Challenge
      // Mode header/indicator controls and the P resume binding above.
      if (ui.challengePaused) return;

      // Blocking overlays own the keyboard while open. This prevents edits,
      // undo/redo, or a second dialog from being triggered behind them.
      if (
        ui.pendingDeletion ||
        ui.activeValidationIssueModal ||
        ui.whatHappenedOpen ||
        ui.faultAlert ||
        ui.mobileSuitabilityOpen ||
        ui.welcomeOpen ||
        ui.challengeIntroOpen ||
        ui.templatesOpen ||
        ui.contactOpen ||
        ui.docsOpen ||
        ui.menuOpen ||
        ui.importExportOpen ||
        ui.settingsOpen
      ) {
        return;
      }

      // Workbench experiment — command palette (Ctrl/Cmd+K).
      if (meta && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        useUiStore.getState().toggleCommandPalette();
        return;
      }

      // Keyboard shortcuts overlay (? key). Must not fire inside an input.
      if (e.key === '?') {
        e.preventDefault();
        useUiStore.getState().toggleShortcuts();
        return;
      }

      // Phase 6.2.4 — Copy / Paste.
      if (meta && (e.key === 'c' || e.key === 'C') && !e.shiftKey) {
        const ids = useCircuitStore.getState().selectedComponentIds;
        if (ids.length === 0) return;
        const allComps = useCircuitStore.getState().components;
        const selected = allComps.filter((c) => ids.includes(c.id));
        useClipboardStore.getState().copy(selected);
        e.preventDefault();
        useUiStore
          .getState()
          .addLog(
            `Copied ${selected.length} component${selected.length === 1 ? '' : 's'}.`,
            'info',
          );
        return;
      }
      if (meta && (e.key === 'v' || e.key === 'V') && !e.shiftKey) {
        const clipboard = useClipboardStore.getState();
        if (clipboard.items.length === 0) return;
        e.preventDefault();
        const PASTE_STEP = 24;
        clipboard.incrementPasteCount();
        const off = PASTE_STEP * clipboard.pasteCount;
        useCircuitStore.getState().pasteComponents(clipboard.items, { x: off, y: off });
        useUiStore
          .getState()
          .addLog(
            `Pasted ${clipboard.items.length} component${clipboard.items.length === 1 ? '' : 's'}.`,
            'info',
          );
        return;
      }

      // Phase 6.4 — Import / Export shortcuts.
      if (meta && (e.key === 'e' || e.key === 'E') && !e.shiftKey) {
        e.preventDefault();
        const ui = useUiStore.getState();
        ui.setImportExportOpen(!ui.importExportOpen);
        return;
      }
      if (meta && (e.key === 's' || e.key === 'S') && !e.shiftKey) {
        e.preventDefault();
        const { components, wires, globalVoltage } = useCircuitStore.getState();
        const json = exportJSON({ components, wires, globalVoltage });
        downloadText(json, 'circuit.electrasim.json', 'application/json');
        useUiStore.getState().addLog('Circuit exported as JSON.', 'success');
        return;
      }

      if (meta && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        meta &&
        ((e.shiftKey && (e.key === 'z' || e.key === 'Z')) || e.key === 'y' || e.key === 'Y')
      ) {
        e.preventDefault();
        redo();
        return;
      }

      if (
        e.key === 'Delete' ||
        e.key === 'Del' ||
        e.key === 'Backspace' ||
        e.code === 'Delete' ||
        e.code === 'Backspace'
      ) {
        const circuit = useCircuitStore.getState();
        const hasSelection =
          circuit.selectedComponentIds.length > 0 ||
          circuit.selectedComponentId !== null ||
          circuit.selectedWireIds.length > 0;
        if (hasSelection) {
          e.preventDefault();
          requestDeleteSelection();
        }
        return;
      }

      if (!meta && (e.key === 'v' || e.key === 'V')) {
        useUiStore.getState().setMode('idle');
        return;
      }
      if (e.key === 'w' || e.key === 'W') {
        const ui = useUiStore.getState();
        ui.setMode(ui.mode === 'wiring' ? 'idle' : 'wiring');
        ui.setPendingWireFrom(null);
        return;
      }
      // Shift+F — toggle the Fault Lab (Pro only; F alone stays zoom-to-fit).
      if (!meta && e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        if (useSettingsStore.getState().appMode === 'pro') {
          useUiStore.getState().toggleFaultLab();
        }
        return;
      }
      if (e.key === 'f' || e.key === 'F') {
        const el = document.querySelector('[data-circuit-canvas]') as HTMLElement | null;
        const rect = el?.getBoundingClientRect();
        if (rect) {
          useViewportStore
            .getState()
            .zoomToFit(
              { width: rect.width, height: rect.height },
              useCircuitStore.getState().components,
            );
        }
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        const circuit = useCircuitStore.getState();
        const hasSelectedComponent =
          circuit.selectedComponentIds.length > 0 || circuit.selectedComponentId !== null;

        // If Shift+R is pressed OR component is selected (and no wire selected), rotate component(s)
        if (e.shiftKey || (hasSelectedComponent && circuit.selectedWireIds.length === 0)) {
          e.preventDefault();
          requestRotateSelection(90);
          return;
        }

        const ui = useUiStore.getState();
        const wireId = circuit.selectedWireIds[0];
        if (!wireId) return;
        // Toggle which end is being rerouted: first press arms the TO
        // end, second press swaps to FROM, third press cancels.
        if (!ui.reroute || ui.reroute.wireId !== wireId) {
          ui.setMode('wiring');
          ui.setReroute({ wireId, end: 'to', source: 'armed' });
        } else if (ui.reroute.end === 'to') {
          if (ui.mode !== 'wiring') ui.setMode('wiring');
          ui.setReroute({ wireId, end: 'from', source: 'armed' });
        } else {
          ui.setMode('idle');
        }
        return;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
