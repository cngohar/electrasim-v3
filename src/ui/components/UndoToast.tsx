/**
 * UndoToast — transient bottom toast with an Undo action (appears after a
 * destructive edit like a delete). Auto-dismisses; the Undo button invokes the
 * existing undo() action.
 */

import { Undo2 } from 'lucide-react';
import { undo } from '../../store';
import { useUiStore } from '../../store';
import { useClosingValue } from '../hooks/useSurfacePresence';

export function UndoToast() {
  const currentToast = useUiStore((s) => s.undoToast);
  const toast = useClosingValue(currentToast);
  const clear = useUiStore((s) => s.clearUndoToast);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      className="table-undo-toast table-surface absolute left-1/2 z-[45] flex -translate-x-1/2 items-center gap-3"
      data-surface-state={currentToast ? 'open' : 'closing'}
      aria-hidden={!currentToast || undefined}
      inert={!currentToast || undefined}
      // biome-ignore lint/a11y/useSemanticElements: transient toast needs role=status, no suitable HTML element
      role="status"
    >
      <span>{toast.message}</span>
      {toast.showUndo !== false && (
        <button
          type="button"
          onClick={() => {
            undo();
            clear();
          }}
          className="flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white transition hover:bg-white/25"
        >
          <Undo2 className="size-3" />
          Undo
        </button>
      )}
      <button
        type="button"
        onClick={clear}
        className="text-white/60 transition hover:text-white"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
