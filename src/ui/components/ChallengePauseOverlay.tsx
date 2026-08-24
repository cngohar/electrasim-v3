import { Pause } from 'lucide-react';
import { useUiStore } from '../../store';
import { useDeclarativeChallengeStore } from '../../store/declarativeChallengeStore';

/**
 * Locks the editor while a Challenge Mode session is paused. The Challenge
 * panel header and persistent indicator sit above this layer, so Resume/End
 * remain available while the canvas, palette, inspector, and other controls
 * cannot be accidentally changed.
 */
export function ChallengePauseOverlay() {
  const paused = useUiStore((s) => s.challengePaused);
  const confirmingExit = useDeclarativeChallengeStore((s) => s.confirmingExit);
  if (!paused || confirmingExit) return null;

  return (
    <div
      data-challenge-paused
      className="pointer-events-auto fixed inset-0 z-[35] flex items-center justify-center bg-slate-950/20 backdrop-blur-sm"
      aria-label="Challenge paused"
      aria-live="polite"
    >
      <div className="pointer-events-none mx-4 flex max-w-xs flex-col items-center rounded-2xl border border-white/70 bg-white/85 px-5 py-4 text-center shadow-xl shadow-slate-900/15 dark:border-slate-700/80 dark:bg-slate-900/85">
        <span className="grid size-9 place-items-center rounded-xl bg-slate-700 text-white dark:bg-slate-100 dark:text-slate-900">
          <Pause className="size-4" fill="currentColor" />
        </span>
        <strong className="mt-2 text-sm text-slate-800 dark:text-slate-100">
          Challenge paused
        </strong>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          The canvas and editor controls are locked. Resume from the Challenge header or the mode
          indicator when you are ready.
        </p>
      </div>
    </div>
  );
}
