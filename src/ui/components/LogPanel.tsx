/**
 * LogPanel — bottom console drawer (workbench experiment).
 *
 * Normally collapsed to a slim strip above the status bar; expands on click.
 * Shows error/warning/info counts in the collapsed header when present.
 */

import type { LogEntry } from '@electrasim/domain';
import { ChevronUp } from 'lucide-react';
import { useUiStore } from '../../store';

interface Props {
  isPhone: boolean;
  open: boolean;
  simRunning: boolean;
  logs: LogEntry[];
}

const TYPE_COLOR: Record<LogEntry['type'], string> = {
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#94a3b8',
};

export function LogPanel({ isPhone, open, simRunning, logs }: Props) {
  if (isPhone) return null;

  const errors = logs.filter((l) => l.type === 'error').length;
  const warnings = logs.filter((l) => l.type === 'warning').length;
  const issues = errors + warnings;

  return (
    <div className="absolute bottom-7 left-1/2 z-10 w-[min(560px,calc(100%-2rem))] -translate-x-1/2 overflow-hidden rounded-lg border border-white/80 bg-white/95 shadow-2xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl backdrop-saturate-150 dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50">
      <button
        type="button"
        onClick={() => useUiStore.getState().toggleLog()}
        className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50/60 dark:text-slate-300 dark:hover:bg-slate-800/60"
        title="Toggle console"
      >
        <span className="flex items-center gap-2">
          <span
            className={[
              'size-1.5 rounded-full',
              simRunning ? 'bg-emerald-500 shadow-[0_0_6px] shadow-emerald-400' : 'bg-slate-400',
            ].join(' ')}
          />
          <span>Console · {logs.length} entries</span>
          {issues > 0 && (
            <span className="flex items-center gap-1.5">
              {errors > 0 && <span className="text-rose-500">{errors} Error</span>}
              {warnings > 0 && <span className="text-amber-500">{warnings} Warning</span>}
            </span>
          )}
        </span>
        <ChevronUp
          className={['size-3.5 text-slate-400 transition', open ? '' : 'rotate-180'].join(' ')}
        />
      </button>
      {open && (
        <div className="max-h-40 overflow-y-auto border-t border-slate-100 px-3 py-2 text-[11px] leading-relaxed text-slate-700 dark:border-slate-700/60 dark:text-slate-300">
          {logs.length === 0 ? (
            <div className="py-2 text-center text-slate-400">
              No log entries yet — toggle a switch or modify the circuit.
            </div>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="flex items-start gap-2 py-0.5">
                <span
                  className="mt-1 size-1.5 rounded-full"
                  style={{ background: TYPE_COLOR[l.type] }}
                />
                <span>{l.message}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
