/**
 * CanvasToolbar — Workbench experiment: compact contextual toolbar floating
 * near the top of the canvas. Reuses the exact same store actions as the
 * keyboard shortcuts (no duplicate state).
 *
 * This is now the single canvas tool dock: the former bottom-right ToolDock
 * was removed and its unique controls (trace-path, zoom in / out) merged in,
 * so every canvas tool lives in one place directly under the sub-header bar.
 */

import {
  Eye,
  Maximize2,
  MousePointer2,
  Pen,
  Plus,
  ScanSearch,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCircuitStore, useSettingsStore, useUiStore, useViewportStore } from '../../store';
import { requestDeleteSelection } from '../canvas-actions';
import { IconBtn } from './IconBtn';

export function CanvasToolbar() {
  const mode = useUiStore((s) => s.mode);
  const simRunning = useUiStore((s) => s.simRunning);
  const customWiringMode = useSettingsStore((s) => s.customWiringMode);
  const pendingCustomPath = useUiStore((s) => s.pendingCustomPath);
  const tracePathMode = useUiStore((s) => s.tracePathMode);
  const toggleTracePathMode = useUiStore((s) => s.toggleTracePathMode);

  const selectedWireId = useCircuitStore((s) => s.selectedWireIds[0] ?? null);
  const selectedComponentIds = useCircuitStore((s) => s.selectedComponentIds);
  const selectedId = useCircuitStore((s) => s.selectedComponentId);
  const hasSelection = !!(selectedId || selectedWireId || selectedComponentIds.length > 0);

  return (
    <div className="absolute left-1/2 top-[88px] z-10 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-white/80 bg-white/90 p-1 shadow-lg ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 dark:ring-slate-700/50">
      <IconBtn
        icon={MousePointer2}
        title="Select (V)"
        active={mode === 'idle'}
        onClick={() => useUiStore.getState().setMode('idle')}
      />
      <IconBtn
        icon={customWiringMode ? Pen : Plus}
        title={
          customWiringMode
            ? pendingCustomPath
              ? 'Custom wiring — click canvas to add corners, click port to finish (Esc to cancel)'
              : 'Custom wiring mode ON · click a port to start a polyline'
            : 'Wire mode (W) · click a port to start, click another to connect'
        }
        active={mode === 'wiring'}
        onClick={() => {
          if (pendingCustomPath) {
            useUiStore.getState().cancelCustomPath();
          } else if (mode === 'wiring') {
            const ui = useUiStore.getState();
            ui.setPendingWireFrom(null);
            ui.setMode('idle');
          } else {
            useUiStore.getState().setMode('wiring');
          }
        }}
      />
      <IconBtn
        icon={Eye}
        title={
          tracePathMode
            ? 'Trace Circuit Path: ACTIVE (click to turn off)'
            : 'Trace Circuit Path: OFF (click to highlight selected wire path)'
        }
        active={tracePathMode}
        onClick={toggleTracePathMode}
      />
      <IconBtn
        icon={Trash2}
        title={simRunning ? 'Cannot delete while simulation is running' : 'Delete selected (Del)'}
        disabled={!hasSelection || simRunning}
        onClick={requestDeleteSelection}
      />
      <Sep />
      <IconBtn
        icon={ZoomOut}
        title="Zoom out"
        onClick={() => useViewportStore.getState().zoomBy(1 / 1.25)}
      />
      <IconBtn
        icon={ZoomIn}
        title="Zoom in"
        onClick={() => useViewportStore.getState().zoomBy(1.25)}
      />
      <IconBtn
        icon={Maximize2}
        title="Reset view (1:1)"
        onClick={() => useViewportStore.getState().resetView()}
      />
      <IconBtn
        icon={ScanSearch}
        title="Zoom to fit all (F)"
        onClick={() => {
          const el = document.querySelector('[data-circuit-canvas]') as HTMLElement | null;
          const rect = el?.getBoundingClientRect();
          if (!rect) return;
          useViewportStore
            .getState()
            .zoomToFit(
              { width: rect.width, height: rect.height },
              useCircuitStore.getState().components,
            );
        }}
      />
    </div>
  );
}

function Sep() {
  return <div className="mx-0.5 h-4 w-px bg-slate-200 dark:bg-slate-700" />;
}
