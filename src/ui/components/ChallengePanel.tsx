/**
 * ChallengePanel — declarative Challenge Mode UI (plan §16–§19).
 *
 * Views in one lazy component:
 *   1. Learn hub    — first-run Mission 0 offer + challenge cards.
 *   2. Active       — Mission, outcome Requirements, Next Action, Check / Hint / Reset.
 *   3. Complete     — the educational celebration (time + hints, never coins).
 *
 * Challenge Mode is a genuine build challenge (UX correction plan §1): the
 * learner sees the MISSION and high-level REQUIREMENTS, not the internal
 * construction recipe. The validator keeps every internal rule; this panel
 * never exposes them as a step-by-step checklist (plan §3, §18, §36).
 *
 * Mission 0 is action-led by `ChallengeTutorialOverlay`; its progress is
 * derived from the same declarative rules rather than manual click counts.
 *
 * The panel owns no electrical logic: it renders `declarativeChallengeStore`
 * state and delegates every verdict to `domain/challenges/declarative`.
 *
 * Accessibility (plan §35): verdict region is a polite live region; every
 * control is a real button with an accessible name; Escape closes dialogs.
 */

import {
  Check,
  ChevronRight,
  CircleAlert,
  Download,
  Focus,
  Lightbulb,
  ListChecks,
  MapPinned,
  Pause,
  Play,
  RotateCcw,
  Target,
  Timer,
  Trophy,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  CHALLENGE_DEFINITIONS,
  type ChallengeDefinition,
  describeExtraComponents,
  formatElapsedDeclarative,
  getChallengeStepProgress,
  validateChallenge,
} from '../../domain/challenges/declarative';
import type {
  ChallengeVerdict,
  RequirementStatus,
  RuleResult,
} from '../../domain/challenges/declarative';
import {
  hasSeenFirstChallengeTutorialOffer,
  markFirstChallengeTutorialOfferSeen,
} from '../../lib/challengeTutorialPersistence';
import { useCircuitStore, useUiStore } from '../../store';
import { useDeclarativeChallengeStore } from '../../store/declarativeChallengeStore';
import { useSettingsStore } from '../../store/settingsStore';
import { Modal } from './Modal';

interface Props {
  isPhone: boolean;
}

type ChallengeFilter =
  | 'all'
  | 'student'
  | 'pro'
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'completed';

const CHALLENGE_FILTERS: Array<{ id: ChallengeFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'student', label: 'Student' },
  { id: 'pro', label: 'Pro' },
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
  { id: 'completed', label: 'Completed' },
];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

/** Live mm:ss ticker driven off the store's monotonic accounting. */
function useElapsedLabel(active: boolean): string {
  const totalElapsedMs = useDeclarativeChallengeStore((s) => s.totalElapsedMs);
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return formatElapsedDeclarative(totalElapsedMs());
}

function difficultyBadge(difficulty: ChallengeDefinition['difficulty']): string {
  switch (difficulty) {
    case 'beginner':
      return 'Beginner';
    case 'intermediate':
      return 'Intermediate';
    case 'advanced':
      return 'Advanced';
  }
}

export function ChallengePanel({ isPhone }: Props) {
  const status = useDeclarativeChallengeStore((s) => s.status);
  const definition = useDeclarativeChallengeStore((s) => s.definition);
  const verdict = useDeclarativeChallengeStore((s) => s.verdict);
  const attempts = useDeclarativeChallengeStore((s) => s.attempts);
  const hintsUsed = useDeclarativeChallengeStore((s) => s.hintsUsed);
  const progress = useDeclarativeChallengeStore((s) => s.progress);
  const confirmingExit = useDeclarativeChallengeStore((s) => s.confirmingExit);
  const paused = useDeclarativeChallengeStore((s) => s.paused);
  const resumePrompt = useDeclarativeChallengeStore((s) => s.resumePrompt);
  const visualHintVisible = useDeclarativeChallengeStore((s) => s.visualHintVisible);

  const start = useDeclarativeChallengeStore((s) => s.start);
  const check = useDeclarativeChallengeStore((s) => s.check);
  const revealHint = useDeclarativeChallengeStore((s) => s.revealHint);
  const showVisualHint = useDeclarativeChallengeStore((s) => s.showVisualHint);
  const hideVisualHint = useDeclarativeChallengeStore((s) => s.hideVisualHint);
  const resetChallenge = useDeclarativeChallengeStore((s) => s.resetChallenge);
  const requestExit = useDeclarativeChallengeStore((s) => s.requestExit);
  const endChallenge = useDeclarativeChallengeStore((s) => s.endChallenge);
  const pauseChallenge = useDeclarativeChallengeStore((s) => s.pauseChallenge);
  const resumeChallenge = useDeclarativeChallengeStore((s) => s.resumeChallenge);
  const cancelExit = useDeclarativeChallengeStore((s) => s.cancelExit);
  const exitToMyCircuit = useDeclarativeChallengeStore((s) => s.exitToMyCircuit);
  const keepCopy = useDeclarativeChallengeStore((s) => s.keepCopy);
  const resumeActive = useDeclarativeChallengeStore((s) => s.resumeActive);
  const returnFromReload = useDeclarativeChallengeStore((s) => s.returnFromReload);
  const refreshProgress = useDeclarativeChallengeStore((s) => s.refreshProgress);

  const setChallengeOpen = useUiStore((s) => s.setChallengeOpen);
  const challengeRuleFocus = useUiStore((s) => s.challengeRuleFocus);
  const setChallengeRuleFocus = useUiStore((s) => s.setChallengeRuleFocus);
  const challengeIntroOpen = useUiStore((s) => s.challengeIntroOpen);
  const setChallengeIntroOpen = useUiStore((s) => s.setChallengeIntroOpen);
  const inspectorCollapsed = useUiStore((s) => s.inspectorCollapsed);
  const appMode = useSettingsStore((s) => s.appMode);
  const reducedMotion = usePrefersReducedMotion();
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const [progressReady, setProgressReady] = useState(false);
  const [tutorialOfferOpen, setTutorialOfferOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    void refreshProgress().finally(() => {
      if (mounted) setProgressReady(true);
    });
    return () => {
      mounted = false;
    };
  }, [refreshProgress]);

  const firstMission = CHALLENGE_DEFINITIONS.find((item) => item.kind === 'tutorial');
  const beginChallenge = (challengeId: ChallengeDefinition['id']) => {
    if (challengeId === firstMission?.id) markFirstChallengeTutorialOfferSeen();
    void start(challengeId);
  };

  useEffect(() => {
    const isHub = status === 'idle' || status === 'exited' || status === 'abandoned' || !definition;
    if (
      !progressReady ||
      !firstMission ||
      !isHub ||
      challengeIntroOpen ||
      resumePrompt ||
      confirmingExit ||
      progress[firstMission.id]?.completed ||
      hasSeenFirstChallengeTutorialOffer()
    ) {
      return;
    }
    setTutorialOfferOpen(true);
  }, [
    challengeIntroOpen,
    confirmingExit,
    definition,
    firstMission,
    progress,
    progressReady,
    resumePrompt,
    status,
  ]);

  const liveCircuit = useMemo(
    () => ({ components, wires, globalVoltage }),
    [components, globalVoltage, wires],
  );
  const liveTutorialVerdict = useMemo<ChallengeVerdict | null>(() => {
    if (!definition || definition.kind !== 'tutorial' || status !== 'active') return null;
    return validateChallenge(definition, liveCircuit);
  }, [definition, liveCircuit, status]);
  const displayedVerdict = liveTutorialVerdict ?? verdict;
  const isTutorial = definition?.kind === 'tutorial';
  const tutorialStepProgress = useMemo(
    () =>
      definition?.kind === 'tutorial'
        ? getChallengeStepProgress(definition, liveTutorialVerdict ?? verdict)
        : null,
    [definition, liveTutorialVerdict, verdict],
  );

  useEffect(() => {
    if (!challengeRuleFocus || !displayedVerdict) return;
    const focusedRule = displayedVerdict.rules.find(
      (rule) => rule.id === challengeRuleFocus.ruleId,
    );
    if (
      focusedRule?.verdict === 'pass' ||
      (!focusedRule && displayedVerdict.nextRule?.id !== challengeRuleFocus.ruleId)
    ) {
      setChallengeRuleFocus(null);
    }
  }, [challengeRuleFocus, displayedVerdict, setChallengeRuleFocus]);

  const elapsedLabel = useElapsedLabel(status === 'active' && !paused);
  const [showSteps, setShowSteps] = useState(false);
  // All hooks must run unconditionally — the conditional returns below are
  // view switches only (React rules of hooks).
  const visibleHints = useMemo(
    () => (definition ? definition.hints.slice(0, hintsUsed) : []),
    [definition, hintsUsed],
  );
  // §19: on phones the bottom sheet can cover the canvas — the learner may
  // collapse it to a floating pill and bring it back, exactly like the
  // guided panel's hide affordance.
  const [panelHidden, setPanelHidden] = useState(false);
  const [challengeFilter, setChallengeFilter] = useState<ChallengeFilter>('all');
  const filteredChallenges = useMemo(
    () =>
      CHALLENGE_DEFINITIONS.filter((challenge) => {
        switch (challengeFilter) {
          case 'student':
            return challenge.audience !== 'pro';
          case 'pro':
            return challenge.audience === 'pro';
          case 'beginner':
          case 'intermediate':
          case 'advanced':
            return challenge.difficulty === challengeFilter;
          case 'completed':
            return progress[challenge.id]?.completed === true;
          default:
            return true;
        }
      }),
    [challengeFilter, progress],
  );
  const recommendedChallengeId = CHALLENGE_DEFINITIONS.find(
    (challenge) =>
      !progress[challenge.id]?.completed && (challenge.audience !== 'pro' || appMode === 'pro'),
  )?.id;

  if (isPhone && panelHidden && status === 'active') {
    return (
      <button
        type="button"
        onClick={() => setPanelHidden(false)}
        aria-label="Show challenge panel"
        className="absolute bottom-20 right-3 z-20 flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl transition hover:bg-blue-50 dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50 dark:hover:bg-slate-800"
      >
        <span className="grid size-6 place-items-center rounded-lg bg-blue-600 text-white">
          <Target className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          Challenge
        </span>
        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {Math.round((verdict?.completion ?? 0) * 100)}%
        </span>
      </button>
    );
  }

  // Keep the challenge surface in its own work area. When the Inspector is
  // expanded, move it left instead of stacking above the Inspector drawer.
  const shell = [
    'absolute flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50',
    paused ? 'z-40' : 'z-30',
    isPhone
      ? 'bottom-20 left-3 right-3 max-h-[52vh]'
      : inspectorCollapsed
        ? 'right-14 top-24 w-56 max-h-[calc(100vh-8rem)] lg:w-[340px]'
        : 'right-[25rem] top-32 w-56 max-h-[calc(100vh-9rem)] lg:w-[340px]',
  ].join(' ');

  const closePanel = () => {
    setChallengeOpen(false);
  };

  const focusRule = (rule: RuleResult) => {
    setChallengeRuleFocus({
      ruleId: rule.id,
      label: rule.reason ?? rule.label,
      targets: rule.targets ?? [],
      paletteTypes: rule.paletteTypes ?? [],
    });
    if ((rule.paletteTypes?.length ?? 0) > 0) {
      useUiStore.getState().setPaletteOpen(true);
    }
  };

  const introModal =
    challengeIntroOpen &&
    (status === 'idle' || status === 'exited' || status === 'abandoned' || !definition) ? (
      <Modal
        open
        onClose={closePanel}
        title="How Challenge Mode works"
        description="Learn by building real circuits one step at a time."
        widthClass="max-w-lg"
        ariaLabel="How Challenge Mode works"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/80 p-3 dark:border-blue-900/70 dark:bg-blue-950/40">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <Target className="size-5" />
            </span>
            <p className="text-sm leading-relaxed text-blue-900 dark:text-blue-100">
              Challenge Mode gives you a practical wiring task, a safe practice circuit, and
              teacher-style feedback while you work in the normal editor.
            </p>
          </div>
          <ol className="grid gap-2 sm:grid-cols-3">
            {[
              ['1', 'Choose a task', 'Pick a circuit that matches your skill level.'],
              ['2', 'Build and check', 'Place components, wire them, and use Check circuit.'],
              ['3', 'Learn from hints', 'Use text or an on-canvas arrow when you get stuck.'],
            ].map(([number, heading, copy]) => (
              <li
                key={number}
                className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"
              >
                <span className="grid size-6 place-items-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                  {number}
                </span>
                <h3 className="mt-2 text-xs font-bold text-slate-800 dark:text-slate-100">
                  {heading}
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {copy}
                </p>
              </li>
            ))}
          </ol>
          <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Your normal circuit is kept safe until you end the mode. When you end it, the circuit
            you built here stays on the canvas and the challenge-only restrictions are removed.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closePanel}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Not now
            </button>
            <button
              type="button"
              onClick={() => setChallengeIntroOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-500"
            >
              Start Challenge Mode <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </Modal>
    ) : null;

  const dismissTutorialOffer = () => {
    markFirstChallengeTutorialOfferSeen();
    setTutorialOfferOpen(false);
  };

  const tutorialOfferModal =
    tutorialOfferOpen && firstMission ? (
      <Modal
        open
        onClose={dismissTutorialOffer}
        title="Start with a quick mission?"
        description="A short, no-score introduction to placing, wiring, and running a circuit."
        widthClass="max-w-md"
        ariaLabel="Start with a quick mission?"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/70 dark:bg-amber-950/40">
            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
              Mission 0: {firstMission.title}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
              Build one small protected lamp with a coach card that advances as you work. It takes
              about {firstMission.estimatedMinutes} minutes and teaches the editor basics before the
              full challenges begin.
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={dismissTutorialOffer}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Skip to Challenges
            </button>
            <button
              type="button"
              onClick={() => {
                dismissTutorialOffer();
                beginChallenge(firstMission.id);
              }}
              className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/25 transition hover:bg-blue-500"
            >
              Start First Mission <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      </Modal>
    ) : null;

  // ── Resume prompt (§14: never silently choose) ─────────────────────────
  if (resumePrompt) {
    return (
      <Modal open onClose={closePanel} title="Continue Challenge?" aria-label="Continue Challenge?">
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          You were in the middle of a challenge. Continue where you left off, or return to your
          saved circuit?
        </p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            onClick={() => void resumeActive()}
          >
            Continue Challenge
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => void returnFromReload()}
          >
            Return to My Circuit
          </button>
        </div>
      </Modal>
    );
  }

  // ── Exit confirmation (§13) ─────────────────────────────────────────────
  if (confirmingExit && definition) {
    return (
      <Modal
        open
        onClose={cancelExit}
        title="End Challenge Mode?"
        ariaLabel="End Challenge Mode?"
        backdropBlur={false}
      >
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          End the challenge and keep the circuit you have built? The challenge indicator, palette
          restrictions, and challenge-only conditions will be removed. Your circuit will stay on the
          canvas as a normal ElectraSim circuit. To abandon this build instead, choose Restore Saved
          Circuit.
        </p>
        <div className="mt-3 space-y-2">
          <button
            type="button"
            aria-label="End Challenge"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500"
            onClick={() => void endChallenge()}
          >
            End Challenge
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={() => void exitToMyCircuit()}
          >
            Restore Saved Circuit
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
            onClick={keepCopy}
          >
            <Download className="size-3.5" /> Keep a Copy
          </button>
          <button
            type="button"
            className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={cancelExit}
          >
            Keep Working
          </button>
        </div>
      </Modal>
    );
  }

  // ── Idle: Learn hub (§16, §17) ──────────────────────────────────────────
  if (status === 'idle' || status === 'exited' || status === 'abandoned' || !definition) {
    const hasUnfinished = status === 'abandoned';
    return (
      <>
        {introModal}
        {tutorialOfferModal}
        <section className={shell} aria-label="Challenge Mode">
          <header className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
            <span className="grid size-6 place-items-center rounded-lg bg-blue-600 text-white">
              <Target className="size-3.5" />
            </span>
            <h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
              Challenge Mode
            </h2>
            <button
              type="button"
              onClick={closePanel}
              aria-label="Close Challenge Mode"
              className="ml-auto rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="size-4" />
            </button>
          </header>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
            {hasUnfinished && (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:hover:bg-blue-900/40"
                onClick={() => void resumeActive()}
              >
                <ChevronRight className="size-3.5 text-blue-600 dark:text-blue-400" />
                <span className="text-[12px] font-semibold text-blue-800 dark:text-blue-200">
                  Continue Challenge
                </span>
              </button>
            )}

            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
              Structured challenges that walk you through real wiring skills. No timers, no scores —
              just build it right.
            </p>
            <div
              className={[
                'rounded-xl border px-3 py-2 text-[10px] leading-relaxed',
                appMode === 'pro'
                  ? 'border-purple-200 bg-purple-50 text-purple-800 dark:border-purple-900 dark:bg-purple-950/40 dark:text-purple-200'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200',
              ].join(' ')}
            >
              <span className="font-bold uppercase tracking-wide">
                {appMode === 'pro' ? 'Pro Electrician Mode' : 'Student Mode'}
              </span>{' '}
              {appMode === 'pro'
                ? 'Advanced commissioning challenges are unlocked below.'
                : 'Switch to Pro mode to unlock advanced commissioning challenges.'}
            </div>
            <fieldset aria-label="Challenge filters" className="flex flex-wrap gap-1">
              <legend className="sr-only">Challenge filters</legend>
              {CHALLENGE_FILTERS.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={challengeFilter === filter.id}
                  onClick={() => setChallengeFilter(filter.id)}
                  className={[
                    'rounded-full border px-2 py-1 text-[9px] font-semibold transition',
                    challengeFilter === filter.id
                      ? 'border-blue-500 bg-blue-600 text-white'
                      : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-700 dark:hover:text-blue-300',
                  ].join(' ')}
                >
                  {filter.label}
                </button>
              ))}
            </fieldset>

            {filteredChallenges.length === 0 && (
              <p className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No challenges match this filter yet.
              </p>
            )}
            {filteredChallenges.map((challenge) => {
              const isTutorial = challenge.kind === 'tutorial';
              const isProChallenge = challenge.audience === 'pro';
              const locked = isProChallenge && appMode !== 'pro';
              const done = progress[challenge.id]?.completed === true;
              const recommended = challenge.id === recommendedChallengeId && !locked;
              return (
                <div
                  key={challenge.id}
                  data-challenge-card={challenge.id}
                  className={[
                    'rounded-xl border p-3',
                    recommended
                      ? 'border-blue-300 shadow-sm shadow-blue-500/10 dark:border-blue-700'
                      : '',
                    isTutorial
                      ? 'border-amber-200 bg-amber-50/45 dark:border-amber-900/70 dark:bg-amber-950/20'
                      : 'border-slate-200 dark:border-slate-700',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-1.5">
                    {isTutorial && (
                      <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-800 dark:bg-amber-900/70 dark:text-amber-200">
                        Mission 0
                      </span>
                    )}
                    <span className="min-w-0 flex-1 text-[12px] font-bold text-slate-800 dark:text-slate-100">
                      {challenge.title}
                    </span>
                    {done && (
                      <Check
                        className="size-3.5 shrink-0 text-emerald-600"
                        aria-label="Completed"
                      />
                    )}
                    {recommended && (
                      <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/70 dark:text-blue-300">
                        Recommended
                      </span>
                    )}
                    <span
                      className={[
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                        done
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : locked
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
                      ].join(' ')}
                    >
                      {done ? 'Completed' : locked ? 'Pro only' : 'Not started'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                    {difficultyBadge(challenge.difficulty)} · ~{challenge.estimatedMinutes} minutes
                    {isProChallenge && ' · Pro only'}
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-600 dark:text-slate-300">
                    {challenge.objective}
                  </p>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => beginChallenge(challenge.id)}
                    className={[
                      'mt-2 w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold transition',
                      locked
                        ? 'cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500'
                        : 'bg-blue-600 text-white hover:bg-blue-500',
                    ].join(' ')}
                  >
                    {locked
                      ? 'Requires Pro Mode'
                      : done
                        ? isTutorial
                          ? 'Replay Mission'
                          : 'Retry Challenge'
                        : isTutorial
                          ? 'Start Mission'
                          : 'Start'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      </>
    );
  }

  // ── Completed: celebration (§32) ───────────────────────────────────────
  if (status === 'completed') {
    const next = CHALLENGE_DEFINITIONS.find(
      (c) =>
        c.id !== definition.id &&
        !progress[c.id]?.completed &&
        (c.audience !== 'pro' || appMode === 'pro'),
    );
    return (
      <>
        {introModal}
        <section className={shell} aria-label="Challenge complete">
          <div
            className={[
              'flex flex-col items-center gap-1 border-b border-emerald-200/70 bg-emerald-50 px-3 py-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/50',
              reducedMotion ? '' : 'animate-in fade-in zoom-in-95 duration-300',
            ].join(' ')}
          >
            <Trophy className="size-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <p className="text-[13px] font-bold text-emerald-800 dark:text-emerald-200">
              COMPLETE!
            </p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">{definition.title}</p>
            <p className="mt-1 text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-200">
              {definition.completionMessage}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-px bg-slate-200 text-center dark:bg-slate-700">
            {[
              ['Time', elapsedLabel],
              isTutorial
                ? ['Steps', `${definition.steps.length}/${definition.steps.length}`]
                : ['Checks', String(attempts)],
              ['Hints', String(hintsUsed)],
            ].map(([label, value]) => (
              <div key={label} className="bg-white px-2 py-2 dark:bg-slate-900">
                <dt className="text-[9px] uppercase tracking-wide text-slate-500">{label}</dt>
                <dd className="text-[13px] font-bold tabular-nums text-slate-800 dark:text-slate-100">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <section
            data-challenge-takeaway
            aria-label="What you learned"
            className="border-b border-slate-200/80 bg-slate-50/70 px-3 py-2.5 dark:border-slate-700/80 dark:bg-slate-800/45"
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              <Lightbulb className="size-3.5 text-amber-500" />
              What you learned
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-700 dark:text-slate-200">
              {definition.teaches}
            </p>
          </section>
          <div className="flex flex-col gap-2 p-3">
            {isTutorial && next && (
              <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-2 text-[10px] dark:border-blue-900/70 dark:bg-blue-950/35">
                <span className="font-semibold text-blue-800 dark:text-blue-200">Next up</span>
                <span className="flex items-center gap-1 text-blue-700 dark:text-blue-300">
                  {next.title}
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 font-bold uppercase tracking-wide dark:bg-blue-900/70">
                    {difficultyBadge(next.difficulty)}
                  </span>
                </span>
              </div>
            )}
            {next && (
              <button
                type="button"
                onClick={() => beginChallenge(next.id)}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white hover:bg-blue-500"
              >
                {isTutorial ? 'Start the Challenge' : 'Next Challenge'}
                <ChevronRight className="size-3.5" />
              </button>
            )}
            {!isTutorial && (
              <button
                type="button"
                onClick={() => beginChallenge(definition.id)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Retry Challenge
              </button>
            )}
            <button
              type="button"
              onClick={requestExit}
              className="rounded-xl border border-red-200 px-3 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/70 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              End Challenge Mode
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="rounded-xl px-3 py-2 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Back to Canvas
            </button>
          </div>
        </section>
      </>
    );
  }

  // ── Active (§19) ────────────────────────────────────────────────────────
  // Learner-facing progress comes from the OUTCOME requirements, not the
  // hidden construction recipe (UX correction plan §6). The tutorial mission
  // keeps its guided rule-based progress because it is a step-by-step lesson.
  const requirementStatuses = displayedVerdict?.requirements ?? [];
  const unmetRequirement = requirementStatuses.find((requirement) => !requirement.met) ?? null;
  const metRequirements = requirementStatuses.filter((requirement) => requirement.met).length;
  const completionPct = isTutorial
    ? Math.round((displayedVerdict?.completion ?? 0) * 100)
    : requirementStatuses.length > 0
      ? Math.round((metRequirements / requirementStatuses.length) * 100)
      : 0;
  const tutorialCurrentStep =
    isTutorial && tutorialStepProgress ? definition.steps[tutorialStepProgress.currentIndex] : null;

  const focusRequirement = (requirement: RequirementStatus) => {
    if (requirement.firstRule) focusRule(requirement.firstRule);
  };

  return (
    <>
      {introModal}
      <section className={shell} aria-label="Challenge Mode">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
          <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-blue-600 text-white">
            <Target className="size-3.5" />
          </span>
          <div className="min-w-[7rem] flex-1">
            <h2 className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
              {definition.title}
            </h2>
            <p className="flex items-center gap-1 text-[9px] uppercase tracking-wide text-slate-500">
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {isTutorial ? 'First mission' : 'Challenge mode'}
              </span>
              <span>·</span>
              <span>{difficultyBadge(definition.difficulty)}</span>
            </p>
          </div>
          <span className="flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <Timer className="size-3" aria-hidden="true" />
            <span aria-label={`Elapsed time ${elapsedLabel}`}>{elapsedLabel}</span>
          </span>
          <button
            type="button"
            data-challenge-pause-toggle
            onClick={paused ? resumeChallenge : pauseChallenge}
            aria-label={paused ? 'Resume challenge' : 'Pause challenge'}
            title={paused ? 'Resume challenge' : 'Pause challenge'}
            className={[
              'flex items-center gap-1 rounded-lg px-1.5 py-1 text-[10px] font-semibold transition',
              paused
                ? 'bg-blue-600 text-white hover:bg-blue-500'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800',
            ].join(' ')}
          >
            {paused ? (
              <Play className="size-3" fill="currentColor" />
            ) : (
              <Pause className="size-3" />
            )}
            <span className="hidden sm:inline">{paused ? 'Resume' : 'Pause'}</span>
          </button>
          <button
            type="button"
            onClick={closePanel}
            aria-label="Close Challenge Mode"
            title="Hide this panel; Challenge Mode remains active"
            className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
          {isPhone && (
            <button
              type="button"
              onClick={() => setPanelHidden(true)}
              aria-label="Hide challenge panel"
              title="Collapse to a pill so the canvas stays reachable"
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
        </header>

        <div
          aria-disabled={paused}
          className={[
            'min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3 transition',
            paused ? 'pointer-events-none select-none opacity-50 blur-[1px]' : '',
          ].join(' ')}
        >
          {/* Mission (UX correction plan §4, §17) */}
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
              <Target className="size-3.5" aria-hidden="true" />
              Mission
            </div>
            <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
              {definition.objective}
            </p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
              {definition.brief}
            </p>
          </div>
          {isTutorial && (
            <p className="rounded-lg border border-blue-100 bg-blue-50 px-2 py-1.5 text-[10px] leading-relaxed text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200">
              Follow the coach card on the canvas. Mission steps update automatically; there is no
              score.
            </p>
          )}

          {/* Next Action / guided step (UX correction plan §7, §8) */}
          <div
            data-challenge-current-step
            aria-live="polite"
            className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-white p-3 shadow-sm dark:border-blue-900/70 dark:from-blue-950/50 dark:to-slate-900"
          >
            {isTutorial && tutorialCurrentStep ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                    Step {tutorialCurrentStep.no} of {definition.steps.length}
                  </span>
                </div>
                <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
                  {tutorialCurrentStep.text}
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-300">
                    Next action
                  </span>
                  {unmetRequirement && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:bg-amber-950/70 dark:text-amber-300">
                      Not complete
                    </span>
                  )}
                </div>
                {unmetRequirement ? (
                  <>
                    <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
                      Your circuit is not complete yet.
                    </p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {unmetRequirement.check}
                    </p>
                    {unmetRequirement.firstRule && (
                      <button
                        type="button"
                        onClick={() => focusRequirement(unmetRequirement)}
                        className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white/80 px-2 py-1.5 text-[10px] font-bold text-indigo-700 shadow-sm transition hover:bg-white dark:bg-slate-900/60 dark:text-indigo-300 dark:hover:bg-slate-900"
                      >
                        <Focus className="size-3" /> Focus this step
                      </button>
                    )}
                  </>
                ) : (
                  <p className="mt-1 text-[12px] font-semibold leading-relaxed text-slate-800 dark:text-slate-100">
                    Build your circuit, then use Check Circuit to see how it is doing.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Requirements (UX correction plan §6, §17) — the learner sees these
              outcome-based goals, never the internal construction recipe. */}
          {requirementStatuses.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                <ListChecks className="size-3.5" aria-hidden="true" />
                Requirements
              </div>
              <ul className="mt-1 space-y-0.5" aria-label="Requirements">
                {requirementStatuses.map((requirement) => (
                  <li key={requirement.id} className="flex items-start text-[11px]">
                    {requirement.met ? (
                      <div className="flex items-start gap-1.5 text-slate-600 dark:text-slate-300">
                        <Check
                          className="mt-px size-3 shrink-0 text-emerald-600 dark:text-emerald-400"
                          aria-hidden="true"
                        />
                        <span>{requirement.label}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => focusRequirement(requirement)}
                        title={requirement.check}
                        aria-label={`Focus requirement: ${requirement.label}`}
                        className="group flex min-w-0 flex-1 items-start gap-1.5 rounded-lg px-1.5 py-1 text-left transition hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                      >
                        <CircleAlert
                          className="mt-px size-3 shrink-0 text-amber-500"
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1 text-slate-600 dark:text-slate-300">
                          {requirement.label}
                        </span>
                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide text-indigo-600 opacity-0 transition group-hover:opacity-100 dark:text-indigo-300">
                          Focus
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Mission steps — tutorial only. Ordinary challenges do NOT expose
              their construction checklist (UX correction plan §3, §18). */}
          {isTutorial && (
            <div>
              <button
                type="button"
                onClick={() => setShowSteps((open) => !open)}
                aria-expanded={showSteps}
                className="flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              >
                <ListChecks className="size-3" aria-hidden="true" />
                Mission steps ({definition.steps.length})
              </button>
              {showSteps && (
                <ol className="mt-1 space-y-0.5">
                  {definition.steps.map((step, index) => {
                    const stepDone = tutorialStepProgress?.completed[index] ?? false;
                    const stepCurrent = tutorialStepProgress?.currentIndex === index;
                    return (
                      <li
                        key={step.id ?? step.no}
                        aria-current={stepCurrent ? 'step' : undefined}
                        className={[
                          'flex items-start gap-1.5 rounded-lg px-1.5 py-1 text-[11px]',
                          stepDone
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300'
                            : stepCurrent
                              ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/35 dark:text-blue-200'
                              : 'text-slate-600 dark:text-slate-300',
                        ].join(' ')}
                      >
                        <span className="mt-px shrink-0">
                          {stepDone ? (
                            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                          ) : stepCurrent ? (
                            <ChevronRight className="size-3.5 text-blue-600 dark:text-blue-400" />
                          ) : (
                            <span className="text-[10px] font-bold tabular-nums text-slate-400">
                              {step.no}.
                            </span>
                          )}
                        </span>
                        <span>{step.text}</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}

          {/* Progress meter (§19) */}
          <div>
            <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wide text-slate-500">
              <span>Progress</span>
              <span className="tabular-nums">{completionPct}%</span>
            </div>
            <progress
              className="h-1.5 w-full overflow-hidden rounded-full [&::-moz-progress-bar]:bg-blue-600 [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-blue-600 dark:[&::-webkit-progress-bar]:bg-slate-700"
              value={completionPct}
              max={100}
              aria-label="Challenge progress"
            >
              {completionPct}%
            </progress>
          </div>

          {/* Verdict (live region — plan §35). High-level, non-recipe feedback:
              which outcome is met/unmet, never a raw rule id or recipe. */}
          <div aria-live="polite" className="space-y-1.5">
            {displayedVerdict && displayedVerdict.state !== 'complete' && (
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/50">
                <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-200">
                  <CircleAlert className="mt-px size-3 shrink-0" aria-hidden="true" />
                  Your circuit is not ready to operate yet.
                </p>
                {unmetRequirement && (
                  <p className="mt-1 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                    {unmetRequirement.check}
                  </p>
                )}
                {unmetRequirement?.firstRule && (
                  <button
                    type="button"
                    onClick={() => focusRequirement(unmetRequirement)}
                    className="mt-2 rounded-lg bg-white/75 px-2 py-1 text-[10px] font-bold text-indigo-700 transition hover:bg-white dark:bg-slate-900/50 dark:text-indigo-300 dark:hover:bg-slate-900/80"
                  >
                    Focus next issue
                  </button>
                )}
              </div>
            )}
            {displayedVerdict && displayedVerdict.extraComponents.length > 0 && (
              <p className="rounded-lg bg-slate-100 px-2 py-1.5 text-[10px] leading-relaxed text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {describeExtraComponents(displayedVerdict.extraComponents)}
              </p>
            )}
          </div>

          {/* Hints (plan §10) */}
          {visibleHints.length > 0 && (
            <ul className="space-y-1">
              {visibleHints.map((hint) => (
                <li
                  key={hint.level}
                  className="rounded-lg bg-blue-50 px-2 py-1.5 text-[10px] leading-relaxed text-blue-800 dark:bg-blue-950/50 dark:text-blue-200"
                >
                  <span className="font-bold uppercase">Hint {hint.level}</span> — {hint.text}
                </li>
              ))}
            </ul>
          )}
          {visualHintVisible && (
            <div className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[10px] leading-relaxed text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-200">
              <MapPinned className="size-3.5 shrink-0" />
              <span>The visual guide is highlighted on the canvas.</span>
            </div>
          )}
        </div>

        <footer
          aria-disabled={paused}
          className={[
            'flex items-center gap-1.5 border-t border-slate-200/80 p-2.5 transition dark:border-slate-700/80',
            paused ? 'pointer-events-none select-none opacity-45' : '',
          ].join(' ')}
        >
          <button
            type="button"
            onClick={() => check()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-500"
          >
            <Check className="size-3.5" aria-hidden="true" />
            {isTutorial ? 'Check progress' : 'Check circuit'}
          </button>
          <button
            type="button"
            onClick={revealHint}
            disabled={hintsUsed >= definition.hints.length}
            aria-label={`Reveal hint (${hintsUsed} of ${definition.hints.length} used)`}
            title="Text hint — hints never cost you the challenge"
            className="rounded-xl border border-slate-200 p-2 text-amber-600 transition hover:bg-amber-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <Lightbulb className="size-4" />
          </button>
          {!isTutorial && (
            <button
              type="button"
              onClick={() => (visualHintVisible ? hideVisualHint() : showVisualHint())}
              disabled={!definition.hints.some((hint) => hint.visual)}
              aria-label={visualHintVisible ? 'Hide visual hint' : 'Show visual hint'}
              title="Visual hint — point to the next component or connection"
              className={`rounded-xl border p-2 transition disabled:opacity-30 dark:border-slate-700 ${
                visualHintVisible
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300'
                  : 'border-slate-200 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800'
              }`}
            >
              <MapPinned className="size-4" />
            </button>
          )}
          <button
            type="button"
            onClick={resetChallenge}
            aria-label="Reset challenge"
            title="Restore this challenge's starter circuit"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RotateCcw className="size-4" />
          </button>
          <button
            type="button"
            onClick={requestExit}
            aria-label="End challenge — Exit challenge"
            title="End Challenge Mode — confirmation keeps this circuit"
            className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        </footer>
        <p className="sr-only" aria-live="polite">
          {attempts > 0 ? `${attempts} checks made.` : ''}
        </p>
      </section>
    </>
  );
}
