/**
 * PhoneDock — bottom-mounted button strip for the phone layout.
 *
 * Mirrors the essential desktop ToolDock actions without stacking a second
 * control over the phone navigation area.
 */

import {
  type LucideIcon,
  Maximize2,
  MousePointer2,
  PenLine,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { useCircuitStore, useUiStore, useViewportStore } from '../../store';
import { requestDeleteComponent, requestDeleteWire } from '../canvas-actions';

export function PhoneDock() {
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const selectedWireId = useCircuitStore((s) => s.selectedWireIds[0] ?? null);
  const mode = useUiStore((s) => s.mode);
  const pendingCustomPath = useUiStore((s) => s.pendingCustomPath);
  const simRunning = useUiStore((s) => s.simRunning);
  const hasSelection = Boolean(selectedComponentId || selectedWireId);

  const deleteSelection = () => {
    if (selectedComponentId) requestDeleteComponent(selectedComponentId);
    else if (selectedWireId) requestDeleteWire(selectedWireId);
  };

  const zoomToFit = () => {
    const canvas = document.querySelector('[data-circuit-canvas]') as HTMLElement | null;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;
    useViewportStore
      .getState()
      .zoomToFit({ width: rect.width, height: rect.height }, useCircuitStore.getState().components);
  };

  return (
    <div className="absolute bottom-2 left-1/2 z-10 flex w-[calc(100%-1rem)] -translate-x-1/2 items-center gap-0.5 overflow-x-auto rounded-full border border-white/80 bg-white/80 p-1.5 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/85 dark:ring-slate-700/50">
      <PhoneBtn
        icon={Plus}
        label="Add"
        accent
        data-tour="open-palette"
        onClick={() => {
          const ui = useUiStore.getState();
          if (!ui.paletteOpen) ui.togglePalette();
        }}
      />
      <PhoneBtn
        icon={MousePointer2}
        label="Select"
        active={mode === 'idle'}
        onClick={() => useUiStore.getState().setMode('idle')}
      />
      <PhoneBtn
        icon={PenLine}
        label="Wire"
        active={mode === 'wiring'}
        onClick={() => {
          const ui = useUiStore.getState();
          if (pendingCustomPath) ui.cancelCustomPath();
          else if (mode === 'wiring') {
            ui.setPendingWireFrom(null);
            ui.setMode('idle');
          } else {
            ui.setMode('wiring');
          }
        }}
      />
      <PhoneBtn
        icon={Trash2}
        label="Delete"
        disabled={!hasSelection || simRunning}
        onClick={deleteSelection}
      />
      <PhoneBtn icon={Maximize2} label="Fit" onClick={zoomToFit} />
      <PhoneBtn
        icon={Settings}
        label="Cfg"
        onClick={() => useUiStore.getState().setSettingsOpen(true)}
      />
    </div>
  );
}

interface PhoneBtnProps {
  icon: LucideIcon;
  label: string;
  accent?: boolean;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  /** Optional tutorial anchor forwarded to the underlying button. */
  'data-tour'?: string;
}

function PhoneBtn({
  icon: Icon,
  label,
  accent,
  active,
  disabled,
  onClick,
  'data-tour': dataTour,
}: PhoneBtnProps) {
  return (
    <button
      type="button"
      data-tour={dataTour}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={[
        'flex min-w-10 flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-0.5 text-[9px] font-medium text-slate-700 transition active:scale-95 disabled:opacity-35 dark:text-slate-300',
      ].join(' ')}
    >
      <span
        className={[
          'grid size-7 place-items-center rounded-full',
          accent || active
            ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/30'
            : 'bg-white/80 text-slate-700 shadow ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700',
        ].join(' ')}
      >
        <Icon className="size-4" />
      </span>
      {label}
    </button>
  );
}
