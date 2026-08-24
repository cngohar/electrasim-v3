import { ChevronRight, CircleCheck, Target, X } from 'lucide-react';
import { useUiStore } from '../../store';
import { useDeclarativeChallengeStore } from '../../store/declarativeChallengeStore';

interface Props {
  isPhone: boolean;
}

/**
 * Persistent, lightweight mode chrome. Hiding the challenge panel must not
 * make the learner wonder whether Challenge Mode is still active.
 */
export function ChallengeModeIndicator({ isPhone }: Props) {
  const status = useDeclarativeChallengeStore((s) => s.status);
  const definition = useDeclarativeChallengeStore((s) => s.definition);
  const verdict = useDeclarativeChallengeStore((s) => s.verdict);
  const paused = useDeclarativeChallengeStore((s) => s.paused);
  const requestExit = useDeclarativeChallengeStore((s) => s.requestExit);
  const resumeChallenge = useDeclarativeChallengeStore((s) => s.resumeChallenge);
  const challengeOpen = useUiStore((s) => s.challengeOpen);
  const setChallengeOpen = useUiStore((s) => s.setChallengeOpen);

  if (!definition || (status !== 'active' && status !== 'completed')) return null;

  const complete = status === 'completed';
  const isMission = definition.kind === 'tutorial';
  const percent = Math.round((verdict?.completion ?? (complete ? 1 : 0)) * 100);

  return (
    <div
      data-challenge-indicator
      aria-label="Challenge mode indicator"
      className={[
        'fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-full border px-2.5 py-1.5 shadow-lg shadow-slate-900/10 backdrop-blur-xl',
        isPhone
          ? 'top-14 max-w-[calc(100vw-1.5rem)]'
          : 'top-[88px] max-w-[min(520px,calc(100vw-2rem))]',
        complete
          ? 'border-emerald-200/90 bg-emerald-50/95 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/90 dark:text-emerald-200'
          : 'border-blue-200/90 bg-blue-50/95 text-blue-800 dark:border-blue-800/80 dark:bg-blue-950/90 dark:text-blue-200',
      ].join(' ')}
    >
      <span
        className={[
          'grid size-6 shrink-0 place-items-center rounded-full text-white',
          complete ? 'bg-emerald-600' : 'bg-blue-600',
        ].join(' ')}
      >
        {complete ? <CircleCheck className="size-3.5" /> : <Target className="size-3.5" />}
      </span>
      <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.12em]">
        {complete
          ? isMission
            ? 'Mission complete'
            : 'Challenge complete'
          : paused
            ? 'Challenge paused'
            : isMission
              ? 'Mission in progress'
              : 'Challenge mode'}
      </span>
      <span className="hidden max-w-44 truncate text-[11px] font-medium sm:inline">
        {definition.title}
      </span>
      <span className="rounded-full bg-white/75 px-1.5 py-0.5 text-[10px] font-bold tabular-nums dark:bg-slate-900/60">
        {percent}%
      </span>
      {paused && (
        <button
          type="button"
          onClick={resumeChallenge}
          className="flex items-center gap-0.5 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-blue-500"
          aria-label="Resume challenge"
          title="Resume challenge"
        >
          Resume <ChevronRight className="size-3" />
        </button>
      )}
      {!paused && !challengeOpen && (
        <button
          type="button"
          onClick={() => setChallengeOpen(true)}
          className="flex items-center gap-0.5 rounded-full px-1.5 py-1 text-[10px] font-semibold hover:bg-white/70 dark:hover:bg-slate-900/60"
          aria-label="Open challenge panel"
          title="Open challenge panel"
        >
          Open <ChevronRight className="size-3" />
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          // The panel may be hidden. Mount it before opening the confirmation
          // so the end dialog remains reachable from the persistent indicator.
          setChallengeOpen(true);
          requestExit();
        }}
        className="flex items-center gap-1 rounded-full bg-white/80 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm transition hover:bg-white hover:text-red-600 dark:bg-slate-900/60 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-red-300"
        aria-label="End challenge"
        title="End Challenge Mode and keep this circuit"
      >
        <X className="size-3" />
        <span className="hidden sm:inline">End</span>
      </button>
    </div>
  );
}
