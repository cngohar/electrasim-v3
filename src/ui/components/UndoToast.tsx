/**
 * UndoToast — transient bottom toast with an Undo action (appears after a
 * destructive edit like a delete). Auto-dismisses; the Undo button invokes the
 * existing undo() action.
 */

import { Undo2 } from 'lucide-react';
import { undo } from '../../store';
import { useUiStore } from '../../store';

export function UndoToast() {
  const toast = useUiStore((s) => s.undoToast);
  const clear = useUiStore((s) => s.clearUndoToast);

  if (!toast) return null;

  return (
    <div
      key={toast.id}
      className="absolute bottom-16 left-1/2 z-[45] flex -translate-x-1/2 items-center gap-3 rounded-full border border-white/80 bg-slate-900/90 px-4 py-2 text-xs font-medium text-white shadow-2xl backdrop-blur-xl dark:border-slate-700"
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
