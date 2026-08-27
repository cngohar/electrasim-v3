/**
 * ShortcutsOverlay — a quick keyboard-shortcuts reference (toggle with ?).
 * A lightweight in-canvas overlay (unlike the full Docs page) so users can
 * glance at the keys without leaving the editor.
 */

import { Keyboard, X } from 'lucide-react';
import { remapShortcutLabel } from '../../lib/platform';
import { useUiStore } from '../../store';
import { SHORTCUTS } from './docs/data';

export function ShortcutsOverlay() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm"
      onMouseDown={() => setOpen(false)}
    >
      <dialog
        open
        className="m-0 w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-700 dark:bg-slate-900"
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-blue-600 text-white">
              <Keyboard className="size-4" />
            </span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Keyboard Shortcuts
            </span>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="Close shortcuts"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-3">
          {SHORTCUTS.map(([rawKey, action]) => {
            // System-aware key labels: ⌘ on macOS, Ctrl elsewhere.
            const key = remapShortcutLabel(rawKey);
            return (
              <div
                key={rawKey}
                className="flex items-center justify-between gap-3 border-b border-slate-50 py-2 last:border-0 dark:border-slate-800/60"
              >
                <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {key}
                </kbd>
                <span className="text-right text-[11px] text-slate-500 dark:text-slate-400">
                  {action}
                </span>
              </div>
            );
          })}
        </div>
        <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800">
          Press <kbd className="rounded bg-slate-100 px-1 dark:bg-slate-800">?</kbd> anywhere to
          toggle this · Esc to close
        </div>
      </dialog>
    </div>
  );
}
