/**
 * DiagnosisPanel — Diagnosis Lab UI (plan §14 "do not reveal the fault",
 * §15 two-part diagnosis, §16 repair-then-complete, §17 progressive hints,
 * §18 unlimited attempts, §19 celebration, §32 entry point, §33 touch,
 * §46 a11y).
 *
 * The panel owns no electrical logic. It renders `diagnosisStore` state and
 * calls its actions; every verdict comes from `domain/challenges`
 * (scenario → evaluate → score). Repair is performed with the *existing*
 * circuit-store fault action (`removeFault`), exactly as §16 asks — the panel
 * adds no second repair mechanism, and the learner is equally free to fix the
 * installation by rewiring it on the canvas.
 *
 * Two deliberate restraints, both from §14:
 *   - the opening state says only "something isn't working correctly"; the
 *     fault type, its target and even its *placement class* stay hidden;
 *   - the "where is it?" list covers wires, components and terminals across
 *     the whole circuit, so the shape of the options cannot leak the answer.
 *
 * Accessibility (§46): the symptom/verdict region is a polite live region so
 * results are announced without stealing focus; the two questions are real
 * radio groups (arrow-key navigable, one tab stop each); the celebration
 * respects `prefers-reduced-motion` (§19).
 */

import { COMP_H, COMP_W } from '@electrasim/domain';
import type {
  ChallengeDifficulty,
  FaultLocationChoice,
  RageTierId,
} from '@electrasim/domain/challenges';
import {
  GENERATOR_VERSION,
  RAGE_TIERS,
  RAGE_TIER_IDS,
  formatElapsed,
  formatShareText,
  locationKeyForTarget,
  observeSymptom,
  parseShareText,
} from '@electrasim/domain/challenges';
import {
  Check,
  ChevronRight,
  CircleAlert,
  Copy,
  Lightbulb,
  MapPin,
  Play,
  RotateCcw,
  Stethoscope,
  Timer,
  Trophy,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useCircuitStore, useSettingsStore, useUiStore, useViewportStore } from '../../store';
import { useDiagnosisStore } from '../../store/diagnosisStore';
import { MAX_ZOOM, MIN_ZOOM } from '../../store/viewportStore';
import { fitCircuitIntoVisibleRegion } from '../canvas/fitRegion';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { EmojiGlyph } from './EmojiGlyph';

interface Props {
  isPhone: boolean;
}

const DIFFICULTIES: { id: ChallengeDifficulty; label: string; blurb: string }[] = [
  { id: 'beginner', label: 'Beginner', blurb: '3 fault types · short circuit' },
  { id: 'intermediate', label: 'Intermediate', blurb: '5 fault types · branches' },
  { id: 'advanced', label: 'Advanced', blurb: '7 fault types · full install' },
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
  const totalElapsedMs = useDiagnosisStore((s) => s.totalElapsedMs);
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [active]);
  return formatElapsed(totalElapsedMs());
}

/** Remaining time on a Rage 4 countdown; also settles the store when it hits 0. */
function useRemainingLabel(active: boolean): string | null {
  const remainingMs = useDiagnosisStore((s) => s.remainingMs);
  const expire = useDiagnosisStore((s) => s.expire);
  const [, force] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const left = remainingMs();
      if (left === 0) expire();
      force((n) => n + 1);
    }, 250);
    return () => clearInterval(id);
  }, [active, remainingMs, expire]);
  const left = remainingMs();
  return left === null ? null : formatElapsed(left);
}

export function DiagnosisPanel({ isPhone }: Props) {
  const status = useDiagnosisStore((s) => s.status);
  const scenario = useDiagnosisStore((s) => s.scenario);
  const evaluation = useDiagnosisStore((s) => s.evaluation);
  const score = useDiagnosisStore((s) => s.score);
  const misdiagnoses = useDiagnosisStore((s) => s.misdiagnoses);
  const incompleteRepairs = useDiagnosisStore((s) => s.incompleteRepairs);
  const hintsUsed = useDiagnosisStore((s) => s.hintsUsed);
  const identifiedFaultIds = useDiagnosisStore((s) => s.identifiedFaultIds);
  const selectedFaultType = useDiagnosisStore((s) => s.selectedFaultType);
  const selectedLocationKey = useDiagnosisStore((s) => s.selectedLocationKey);
  const error = useDiagnosisStore((s) => s.error);
  const confirmingNew = useDiagnosisStore((s) => s.confirmingNew);
  const start = useDiagnosisStore((s) => s.start);
  const selectFaultType = useDiagnosisStore((s) => s.selectFaultType);
  const selectLocation = useDiagnosisStore((s) => s.selectLocation);
  const submit = useDiagnosisStore((s) => s.submit);
  const revealHint = useDiagnosisStore((s) => s.revealHint);
  const abandon = useDiagnosisStore((s) => s.abandon);
  const requestNew = useDiagnosisStore((s) => s.requestNew);
  const cancelNew = useDiagnosisStore((s) => s.cancelNew);
  const exitDiagnosis = useDiagnosisStore((s) => s.exit);
  const setDiagnosisOpen = useUiStore((s) => s.setDiagnosisOpen);
  const exit = () => {
    exitDiagnosis();
    setDiagnosisOpen(false);
  };

  /**
   * §24: Ohmageddon is opt-in from Settings and nowhere else. The panel reads
   * the flag but never writes it, so the only way into rage is the explicit
   * toggle the plan specifies.
   */
  const ohmageddonMode = useSettingsStore((s) => s.ohmageddonMode);
  const [selectedTier, setSelectedTier] = useState<RageTierId | null>(null);
  // Turning the setting off must not leave a stale rage selection armed.
  useEffect(() => {
    if (!ohmageddonMode) setSelectedTier(null);
  }, [ohmageddonMode]);

  const liveFaults = useCircuitStore((s) => s.faults);
  const liveComponents = useCircuitStore((s) => s.components);
  const liveWires = useCircuitStore((s) => s.wires);
  const liveVoltage = useCircuitStore((s) => s.globalVoltage);

  /**
   * What the installation is doing **now** (§14, §26).
   *
   * `scenario.complaint` is a snapshot of the hand-over state and never
   * changes. Showing only that would make a compound scenario unsolvable in
   * practice: the learner clears the first fault, the symptom genuinely
   * changes, and the panel would still be describing the original one — so the
   * emergent second symptom, which is the entire point of §26's compound
   * exercises, would be invisible.
   *
   * Re-derived from the learner's live circuit instead, by the same domain
   * measurement that wrote the original complaint. It is still vague by
   * construction (`describeSymptom`), so this reveals nothing §14 protects:
   * it reports what is *seen*, never what is wrong or where.
   */
  const liveObservation = useMemo(() => {
    if (!scenario || status !== 'active') return null;
    return observeSymptom(scenario, {
      components: liveComponents,
      wires: liveWires,
      globalVoltage: liveVoltage,
      faults: liveFaults,
    });
  }, [scenario, status, liveComponents, liveWires, liveVoltage, liveFaults]);

  /**
   * Has the picture changed since the exercise began?
   *
   * Drives the "the symptom has changed" note. Compared against the scenario's
   * own opening line so it fires exactly when what the learner is looking at
   * stopped matching what they were told.
   */
  const symptomChanged =
    liveObservation !== null &&
    !liveObservation.healthy &&
    liveObservation.complaint !== scenario?.complaint;

  /** §15: both halves of the answer are required before anything may be done. */
  const canSubmit = selectedFaultType !== null && selectedLocationKey !== null;
  const reducedMotion = usePrefersReducedMotion();

  // §30 replay: the pasted ticket, and the note we show about it.
  const [replayText, setReplayText] = useState('');
  const [replayNote, setReplayNote] = useState<string | null>(null);
  const [seedCopied, copySeed] = useCopyToClipboard();
  const elapsedLabel = useElapsedLabel(status === 'active' || status === 'timed-out');
  const remainingLabel = useRemainingLabel(status === 'active');

  /**
   * Frame the installation under investigation.
   *
   * Generated circuits are laid out around the origin and can extend past the
   * default 1:1 view, and §33 is explicit that the panel must not hide the
   * diagnostic area. So on every new scenario we fit the circuit into the part
   * of the canvas that nothing is covering.
   *
   * This must NOT go through `viewportStore.zoomToFit`: that helper takes a
   * size only (no origin, so it always centres on the whole canvas) and it
   * expects SVG *user units*, whereas `getBoundingClientRect` returns CSS
   * pixels. The canvas has a fixed 1200x720 viewBox with `xMidYMid meet`, so
   * feeding it pixels applies the meet-scale twice — on a 390x844 phone that
   * is a factor of ~0.33, which shrank the circuit to an illegible clump in
   * the letterbox band. `fitCircuitIntoVisibleRegion` converts to user units
   * and measures the real panel rects instead.
   */
  const scenarioId = scenario?.challengeId ?? null;
  // Keyed on the scenario id alone: adding `isPhone` would refit on every
  // orientation change and fight the user's own panning mid-exercise.
  useEffect(() => {
    if (!scenarioId) return;
    // Deferred a frame so the panel has been laid out and measures correctly;
    // on a fresh scenario this effect can run before the sheet has its height.
    const raf = requestAnimationFrame(() => {
      fitCircuitIntoVisibleRegion({
        components: useCircuitStore.getState().components,
        compW: COMP_W,
        compH: COMP_H,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
        // Every floating surface that can sit over the circuit.
        // `[data-canvas-occluder]` only: a CSS attribute selector cannot match
        // the *implicit* `region` role a named <section> carries, so keying off
        // `[role="region"]` silently found nothing and the circuit was framed
        // as if the panel weren't there. Any surface that covers the canvas can
        // opt in by setting this attribute.
        occluderSelectors: ['[data-canvas-occluder]'],
        applyView: ({ pan, zoom }) => {
          const vp = useViewportStore.getState();
          vp.setZoom(zoom);
          vp.setPan(pan);
        },
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [scenarioId]);

  /**
   * §21: pick up an exercise that was interrupted by a reload. The scenario is
   * regenerated from the stored seed, so nothing about the circuit is trusted
   * from disk. Runs once per mount; a `false` result just leaves us idle.
   */
  useEffect(() => {
    const store = useDiagnosisStore.getState();
    void store.refreshStats();
    if (store.status === 'idle') void store.resume();
  }, []);

  const visibleHints = useMemo(
    () => (scenario ? scenario.hints.slice(0, hintsUsed) : []),
    [scenario, hintsUsed],
  );

  /**
   * The running tally for a multi-fault exercise (§26).
   *
   * Only faults the learner has already named appear here, so this is a record
   * of their own findings rather than a hint. It exists because the answer
   * form holds one fault at a time: without a visible tally, someone who found
   * the first fault ten minutes ago has no way to remember what they logged,
   * and no way to tell how much of the job is left.
   */
  const faultProgress = useMemo(() => {
    if (!scenario || scenario.faults.length < 2) return null;
    const found = scenario.faults
      .filter((entry) => identifiedFaultIds.includes(entry.fault.id))
      .map((entry) => ({
        id: entry.fault.id,
        typeLabel:
          scenario.faultTypeChoices.find((choice) => choice.type === entry.fault.type)?.label ??
          entry.fault.type,
        locationLabel:
          scenario.locationChoices.find((choice) => choice.key === entry.locationKey)?.label ??
          'the affected part',
      }));
    return { total: scenario.faults.length, found };
  }, [scenario, identifiedFaultIds]);

  /**
   * Carry out the repair the learner has *described* — the remedial action for
   * the selected fault type at the selected location.
   *
   * Two properties matter here, both from §14/§16:
   *
   *   1. It never reveals anything. The button's enabled state depends only on
   *      the learner's own two selections, and the log line is identical
   *      whether or not a fault was actually cleared. An earlier draft enabled
   *      the button only when a fault really sat at the selection — which
   *      turned it into a location oracle. It does not any more.
   *   2. It cannot be used to brute-force a fix. Only a fault matching *both*
   *      the named type and the named place is cleared, so "repair everything
   *      and guess later" is not a shortcut; and even a cleared fault does not
   *      finish the exercise, because §16 requires the submitted diagnosis to
   *      be right as well.
   *
   * The learner is equally free to ignore this button and put the installation
   * right on the canvas — `evaluateDiagnosis` re-simulates whatever circuit is
   * actually on screen, so rewiring counts just the same.
   */
  const repairSelected = () => {
    if (!selectedFaultType || !selectedLocationKey) return;
    const match = liveFaults.find(
      (f) => f.type === selectedFaultType && locationKeyForTarget(f.target) === selectedLocationKey,
    );
    if (match) useCircuitStore.getState().removeFault(match.id);
    const where =
      scenario?.locationChoices.find((c) => c.key === selectedLocationKey)?.label ??
      'the selected part';
    // Deliberately neutral: the canvas and the simulation report the outcome,
    // this line only confirms the action was taken.
    useUiStore.getState().addLog(`Diagnosis Lab: repair carried out on ${where}.`, 'info');
  };

  /**
   * Replay a shared exercise (plan §30).
   *
   * The ticket carries the identity inputs only; the circuit is rebuilt by the
   * same deterministic generator, so this is a genuine replay rather than a
   * restored snapshot. A ticket from another generator version is still
   * honoured — §6 asks us to *notice* the mismatch, not to refuse it — but we
   * say so plainly instead of implying the circuit is guaranteed identical.
   */
  const replaySharedSeed = () => {
    const parsed = parseShareText(replayText, {
      difficulty: selectedTier ? 'advanced' : 'beginner',
      mode: 'diagnosis',
    });
    if (!parsed) {
      setReplayNote("That doesn't look like a seed or share code.");
      return;
    }
    setReplayNote(
      parsed.versionMismatch
        ? `Replaying seed ${parsed.seed} on generator v${GENERATOR_VERSION}. It was created on v${parsed.generatorVersion}, so the circuit may differ.`
        : null,
    );
    setReplayText('');
    void start(parsed.difficulty, parsed.seed, parsed.rageTier ?? selectedTier ?? undefined);
  };

  /** Point the canvas at whatever the learner is inspecting (§14 "trace wires"). */
  const focusLocation = (choice: FaultLocationChoice) => {
    selectLocation(choice.key);
    const circuit = useCircuitStore.getState();
    if (choice.kind === 'wire' && choice.wireId) {
      circuit.selectWire(choice.wireId);
    } else if (choice.componentId) {
      circuit.selectComponent(choice.componentId);
    }
  };

  // Docked right, clear of the Inspector's collapsed icon rail — the same
  // placement Challenge Mode uses. §33: a bottom sheet on phones, and never
  // taller than half the viewport so the circuit under investigation stays
  // visible.
  const shell = [
    'absolute z-30 flex flex-col overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50',
    isPhone
      ? 'bottom-20 left-3 right-3 max-h-[52vh]'
      : 'right-14 top-24 w-56 max-h-[calc(100vh-8rem)] lg:w-[340px]',
  ].join(' ');

  // ── Idle: difficulty picker (plan §32) ──────────────────────────────────
  if (status === 'idle' || status === 'abandoned' || !scenario) {
    return (
      <section className={shell} aria-label="Diagnosis Lab" data-canvas-occluder>
        <header className="flex items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
          <span className="grid size-6 place-items-center rounded-lg bg-amber-500 text-white">
            <Stethoscope className="size-3.5" />
          </span>
          <h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            Diagnosis Lab
          </h2>
          <button
            type="button"
            onClick={exit}
            aria-label="Close Diagnosis Lab"
            className="ml-auto rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="size-4" />
          </button>
        </header>
        <div className="space-y-2 p-3">
          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
            A working installation has developed a fault. Find it, name it, and put it right.
          </p>
          {error && (
            <p
              role="alert"
              className="rounded-lg bg-red-50 px-2 py-1.5 text-[11px] font-medium text-red-700 dark:bg-red-950/60 dark:text-red-300"
            >
              {error}
            </p>
          )}
          {/*
           * Ohmageddon tier picker (plan §23, §24, §27).
           *
           * Only rendered when the Settings flag is on — §24: "Normal users
           * must never accidentally enter Ohmageddon Mode." When it is off
           * this block does not exist, so there is no stray control to trip
           * over. When it is on, the badge and the tier buttons make the
           * state unmissable rather than tucking it away.
           */}
          {ohmageddonMode && (
            <div className="space-y-1.5 rounded-xl border border-rose-300 bg-rose-50/70 p-2 dark:border-rose-800 dark:bg-rose-950/40">
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800 dark:text-rose-200">
                <EmojiGlyph emoji="devil" size={14} /> Ohmageddon Mode
              </p>
              <p className="text-[9px] leading-relaxed text-rose-700/90 dark:text-rose-300/90">
                Harder to diagnose, never dishonest. Pick a tier, or leave it off for a normal
                exercise.
              </p>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedTier(null)}
                  aria-pressed={selectedTier === null}
                  className={[
                    'min-h-[28px] rounded-lg border px-2 py-1 text-[10px] font-semibold transition',
                    selectedTier === null
                      ? 'border-slate-400 bg-white text-slate-800 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100'
                      : 'border-rose-200 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300',
                  ].join(' ')}
                >
                  Off
                </button>
                {RAGE_TIER_IDS.map((tierId) => {
                  const tier = RAGE_TIERS[tierId];
                  const active = selectedTier === tierId;
                  return (
                    <button
                      key={tierId}
                      type="button"
                      onClick={() => setSelectedTier(tierId)}
                      aria-pressed={active}
                      title={tier.blurb}
                      className={[
                        'min-h-[28px] rounded-lg border px-2 py-1 text-[10px] font-semibold transition',
                        active
                          ? 'border-rose-500 bg-rose-600 text-white'
                          : 'border-rose-200 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300',
                      ].join(' ')}
                    >
                      {tier.label}
                    </button>
                  );
                })}
              </div>
              {selectedTier && (
                <p className="text-[9px] leading-relaxed text-rose-800 dark:text-rose-200">
                  {RAGE_TIERS[selectedTier].blurb}
                </p>
              )}
            </div>
          )}
          {DIFFICULTIES.map((difficulty) => (
            <button
              key={difficulty.id}
              type="button"
              onClick={() => void start(difficulty.id, undefined, selectedTier ?? undefined)}
              className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-amber-400 hover:bg-amber-50 dark:border-slate-700 dark:hover:border-amber-500 dark:hover:bg-slate-800"
            >
              <Play className="size-3.5 text-amber-600 dark:text-amber-400" />
              <span className="flex-1">
                <span className="block text-[12px] font-semibold text-slate-800 dark:text-slate-100">
                  {difficulty.label}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">
                  {difficulty.blurb}
                </span>
              </span>
              <ChevronRight className="size-3.5 text-slate-400" />
            </button>
          ))}

          {/*
           * §30 replay. The generator is deterministic, so a seed is a
           * complete description of an exercise: pasting one someone sent you
           * — or one from your own bug report — rebuilds precisely their
           * circuit and fault. Entirely local; no backend (§3, §30, §48).
           */}
          <div className="space-y-1.5 rounded-xl border border-slate-200 p-2 dark:border-slate-700">
            <label
              htmlFor="diagnosis-replay-seed"
              className="block text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Replay a seed
            </label>
            <div className="flex gap-1.5">
              <input
                id="diagnosis-replay-seed"
                type="text"
                inputMode="text"
                value={replayText}
                onChange={(event) => {
                  setReplayText(event.target.value);
                  if (replayNote) setReplayNote(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    replaySharedSeed();
                  }
                }}
                placeholder="482917 or ES1:482917:…"
                aria-describedby="diagnosis-replay-help"
                className="min-h-[32px] min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={replaySharedSeed}
                disabled={replayText.trim().length === 0}
                className="min-h-[32px] rounded-lg bg-amber-500 px-2.5 text-[11px] font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Replay
              </button>
            </div>
            <p
              id="diagnosis-replay-help"
              className="text-[9px] leading-relaxed text-slate-500 dark:text-slate-400"
            >
              Paste a seed or share code to rebuild the exact same exercise.
            </p>
            {replayNote && (
              <output className="block text-[9px] font-medium leading-relaxed text-amber-700 dark:text-amber-300">
                {replayNote}
              </output>
            )}
          </div>
        </div>
      </section>
    );
  }

  // ── Completed: celebration (plan §19) ───────────────────────────────────
  if (status === 'completed' && score) {
    // Every fault gets its own line: on a multi-fault scenario the learner has
    // just solved two puzzles and deserves to see both named back to them.
    const solved = scenario.faults.map((entry) => ({
      id: entry.fault.id,
      faultLabel:
        scenario.faultTypeChoices.find((choice) => choice.type === entry.fault.type)?.label ??
        entry.fault.type,
      locationLabel:
        scenario.locationChoices.find((choice) => choice.key === entry.locationKey)?.label ??
        'the affected part',
    }));

    return (
      <section className={shell} aria-label="Diagnosis complete">
        <div
          className={[
            'flex flex-col items-center gap-1 border-b border-emerald-200/70 bg-emerald-50 px-3 py-4 text-center dark:border-emerald-900/60 dark:bg-emerald-950/50',
            reducedMotion ? '' : 'animate-in fade-in zoom-in-95 duration-300',
          ].join(' ')}
        >
          <Trophy className="size-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          {/*
            §28: same success pipeline (Diagnose → Repair → Verify → Success),
            "slightly more playful message... Keep it tasteful and optional."
          */}
          <p className="flex items-center justify-center gap-1 text-[13px] font-bold text-emerald-800 dark:text-emerald-200">
            <EmojiGlyph emoji={scenario.rage ? 'devil' : 'party'} size={14} />
            {scenario.rage
              ? solved.length > 1
                ? 'YOU ACTUALLY FOUND THEM ALL'
                : 'YOU ACTUALLY FOUND IT'
              : solved.length > 1
                ? 'ALL FAULTS CLEARED!'
                : 'FAULT CLEARED!'}
          </p>
          {solved.map((entry) => (
            <div key={entry.id}>
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                {entry.faultLabel}
              </p>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">
                {entry.locationLabel} correctly identified
              </p>
            </div>
          ))}
          <p className="mt-1 text-[20px] font-black tabular-nums text-emerald-700 dark:text-emerald-300">
            {score.points}
            <span className="ml-1 text-[11px] font-semibold uppercase">{score.grade}</span>
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-px bg-slate-200 text-center dark:bg-slate-700">
          {[
            ['Time', elapsedLabel],
            ['Attempts', String(misdiagnoses + incompleteRepairs + 1)],
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
        <div className="flex gap-2 p-3">
          <button
            type="button"
            onClick={() => void start(scenario.difficulty, undefined, scenario.rage?.tier)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-amber-400"
          >
            Next Circuit <ChevronRight className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={exit}
            className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </section>
    );
  }

  // ── Timed out (plan §27 Rage 4) ─────────────────────────────────────────
  // Expiry scores what was already found. It does not invent a fail, and it
  // does not name the faults the learner never reached (§14).
  if (status === 'timed-out') {
    const found = scenario.faults
      .filter((entry) => identifiedFaultIds.includes(entry.fault.id))
      .map((entry) => ({
        id: entry.fault.id,
        typeLabel:
          scenario.faultTypeChoices.find((choice) => choice.type === entry.fault.type)?.label ??
          entry.fault.type,
        locationLabel:
          scenario.locationChoices.find((choice) => choice.key === entry.locationKey)?.label ??
          'the affected part',
      }));

    return (
      <section className={shell} aria-label="Time's up" data-canvas-occluder>
        <div
          className={[
            'flex flex-col items-center gap-1 border-b border-rose-200/70 bg-rose-50 px-3 py-4 text-center dark:border-rose-900/60 dark:bg-rose-950/50',
            reducedMotion ? '' : 'animate-in fade-in zoom-in-95 duration-300',
          ].join(' ')}
        >
          <Timer className="size-6 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <p className="text-[13px] font-bold text-rose-800 dark:text-rose-200">TIME&rsquo;S UP</p>
          <p className="text-[10px] leading-relaxed text-rose-700/90 dark:text-rose-300/90">
            The clock ran out. Whatever you already found still counts — the circuit was not
            rewritten.
          </p>
          {found.length > 0 ? (
            found.map((entry) => (
              <div key={entry.id}>
                <p className="text-[11px] font-semibold text-rose-800 dark:text-rose-200">
                  {entry.typeLabel}
                </p>
                <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80">
                  {entry.locationLabel} identified before the bell
                </p>
              </div>
            ))
          ) : (
            <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80">
              No faults logged in time.
            </p>
          )}
          {score && (
            <p className="mt-1 text-[20px] font-black tabular-nums text-rose-700 dark:text-rose-300">
              {score.points}
              <span className="ml-1 text-[11px] font-semibold uppercase">{score.grade}</span>
            </p>
          )}
        </div>
        <dl className="grid grid-cols-3 gap-px bg-slate-200 text-center dark:bg-slate-700">
          {[
            ['Time', elapsedLabel],
            ['Found', `${identifiedFaultIds.length}/${scenario.faults.length}`],
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
        <div className="flex gap-2 p-3">
          <button
            type="button"
            onClick={() => void start(scenario.difficulty, undefined, scenario.rage?.tier)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-[12px] font-semibold text-white hover:bg-amber-400"
          >
            Next Circuit <ChevronRight className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={exit}
            className="rounded-xl border border-slate-200 px-3 py-2 text-[12px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </section>
    );
  }

  // ── Active ──────────────────────────────────────────────────────────────
  const attempts = misdiagnoses + incompleteRepairs;

  return (
    <section className={shell} aria-label="Diagnosis Lab" data-canvas-occluder>
      {/*
       * The badges below (Rage Bait, timer, copy) are intrinsically sized and
       * must never be compressed, but at tablet panel widths (~224px) their
       * combined width leaves nothing for the title column. `flex-1 min-w-0`
       * then resolves to a literal 0px box and the heading/challenge id spill
       * out as a one-character-wide column — present in the DOM, but visually
       * broken and reported as hidden by assistive tech and Playwright alike.
       * Allowing the header to wrap and giving the title column a real basis
       * keeps every element at its natural size on every viewport.
       */}
      <header className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 px-3 py-2 dark:border-slate-700/80">
        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-amber-500 text-white">
          <Stethoscope className="size-3.5" />
        </span>
        <div className="min-w-[7rem] flex-1">
          <h2 className="truncate text-[12px] font-semibold text-slate-800 dark:text-slate-100">
            {scenario.rage ? 'Ohmageddon Challenge' : 'Diagnosis Challenge'}
          </h2>
          <p className="text-[9px] uppercase tracking-wide text-slate-500">
            {scenario.difficulty} · {scenario.challengeId}
          </p>
        </div>
        {/*
         * §30 "Copy Seed". Copies the seed, difficulty and mode as text, so a
         * learner can hand this exact exercise to a tutor, or attach it to a
         * bug report. It gives nothing away: the seed identifies the circuit,
         * not the answer, and reproducing it requires running the generator.
         */}
        <button
          type="button"
          onClick={() =>
            copySeed(
              formatShareText({
                seed: scenario.seed,
                difficulty: scenario.difficulty,
                mode: scenario.rage ? 'rage' : 'diagnosis',
                generatorVersion: scenario.generatorVersion,
                rageTier: scenario.rage?.tier ?? null,
              }),
            )
          }
          aria-label={`Copy seed ${scenario.seed}`}
          title={`Copy seed ${scenario.seed} — replay this exact exercise`}
          className="rounded-lg p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          {seedCopied ? (
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <Copy className="size-3.5" />
          )}
          <output className="sr-only">{seedCopied ? 'Seed copied to clipboard' : ''}</output>
        </button>
        {/* §24: the status indicator. Never hide that the mode is active. */}
        {scenario.rage && (
          <span
            className="flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
            title={`${scenario.rage.tierLabel} — ${scenario.rage.applications
              .filter((a) => a.applied)
              .map((a) => a.label)
              .join(', ')}`}
          >
            <EmojiGlyph emoji="devil" size={12} /> Rage Bait
          </span>
        )}
        <span
          className={[
            'flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
            remainingLabel !== null
              ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-200'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
          ].join(' ')}
        >
          <Timer className="size-3" aria-hidden="true" />
          {remainingLabel !== null ? (
            <span aria-label={`Time remaining ${remainingLabel}`}>{remainingLabel}</span>
          ) : (
            <span aria-label={`Elapsed time ${elapsedLabel}`}>{elapsedLabel}</span>
          )}
        </span>
      </header>

      <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
        {/* §14: the reported symptom, never the fault. */}
        {liveObservation?.healthy ? (
          /**
           * Everything measures healthy — but the exercise is not over, because
           * §16 requires the diagnosis to be *named* as well as the fault
           * cleared. Saying so plainly is honest and still gives nothing away:
           * the learner can see the installation working, and telling them
           * otherwise would be the sort of untruth §26 forbids.
           */
          <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/40">
            <p className="flex items-start gap-1.5 text-[11px] font-semibold text-emerald-900 dark:text-emerald-200">
              <CircleAlert className="mt-px size-3 shrink-0" aria-hidden="true" />
              The installation is running correctly now.
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-emerald-800 dark:text-emerald-300">
              Record what was wrong and where, then submit your diagnosis to finish.
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-950/40">
            <p className="flex items-start gap-1.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
              <CircleAlert className="mt-px size-3 shrink-0" aria-hidden="true" />
              Something isn&rsquo;t working correctly.
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-amber-800 dark:text-amber-300">
              {liveObservation?.complaint ?? scenario.complaint}
            </p>
            {symptomChanged && (
              /**
               * §26: the compound payoff. The learner repaired something real
               * and the installation now misbehaves differently — that change
               * is evidence they earned, and it must be pointed out or it will
               * be read as "my repair did nothing".
               *
               * It names no fault: it says only that the picture has moved,
               * which the learner could establish themselves by re-running the
               * simulation.
               */
              <p className="mt-1.5 border-t border-amber-200 pt-1.5 text-[10px] font-semibold leading-relaxed text-amber-900 dark:border-amber-800 dark:text-amber-200">
                The symptom has changed since you started. Something else is still wrong.
              </p>
            )}
          </div>
        )}
        <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400">
          {scenario.brief}
        </p>

        {/* §26: how much of a multi-fault job is done. Findings only. */}
        {faultProgress && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-800/60">
            <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">
              Faults found: {faultProgress.found.length} of {faultProgress.total}
            </p>
            {faultProgress.found.length > 0 ? (
              <ul className="mt-1 space-y-0.5">
                {faultProgress.found.map((entry) => (
                  <li
                    key={entry.id}
                    className="text-[9px] leading-relaxed text-emerald-700 dark:text-emerald-300"
                  >
                    ✓ {entry.typeLabel} — {entry.locationLabel}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-0.5 text-[9px] leading-relaxed text-slate-500 dark:text-slate-400">
                More than one thing is wrong here. Report them one at a time.
              </p>
            )}
          </div>
        )}

        {/*
         * §24/§26 transparency: say which modifiers are in play and promise,
         * in the product itself, that the physics is untouched. Naming the
         * modifiers does not leak the answer — "there is a decoy somewhere"
         * is a different thing from "the fault is here".
         */}
        {scenario.rage && (
          <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-2 dark:border-rose-900 dark:bg-rose-950/40">
            <p className="flex items-center gap-1 text-[10px] font-bold text-rose-800 dark:text-rose-200">
              <EmojiGlyph emoji="devil" size={12} /> {scenario.rage.tierLabel} active
            </p>
            <ul className="mt-1 space-y-0.5">
              {scenario.rage.applications
                .filter((application) => application.applied)
                .map((application) => (
                  <li
                    key={application.id}
                    className="text-[9px] leading-relaxed text-rose-700 dark:text-rose-300"
                  >
                    • {application.label}
                  </li>
                ))}
            </ul>
            <p className="mt-1 text-[9px] italic leading-relaxed text-rose-600/90 dark:text-rose-400/90">
              Rage against the circuit, not against physics — every reading is honest.
            </p>
          </div>
        )}

        {/* A. What is wrong? (plan §15A) */}
        <fieldset className="space-y-1">
          <legend className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            What is wrong?
          </legend>
          {scenario.faultTypeChoices.map((choice) => {
            const active = selectedFaultType === choice.type;
            return (
              <label
                key={choice.type}
                className={[
                  // §33: a generous touch target, not a 12px radio dot.
                  'flex min-h-[38px] cursor-pointer items-start gap-2 rounded-lg border px-2 py-1.5 text-left transition',
                  active
                    ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/40'
                    : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="diagnosis-fault-type"
                  value={choice.type}
                  checked={active}
                  onChange={() => selectFaultType(choice.type)}
                  className="mt-0.5 size-3.5 shrink-0 accent-amber-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[11px] font-semibold text-slate-800 dark:text-slate-100">
                    {choice.label}
                  </span>
                  <span className="block text-[10px] leading-snug text-slate-500 dark:text-slate-400">
                    {choice.description}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>

        {/* B. Where is it wrong? (plan §15B) */}
        <fieldset className="space-y-1">
          <legend className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <MapPin className="size-3" aria-hidden="true" />
            Where is it?
          </legend>
          <div className="max-h-44 space-y-1 overflow-y-auto pr-0.5">
            {scenario.locationChoices.map((choice) => {
              const active = selectedLocationKey === choice.key;
              return (
                <label
                  key={choice.key}
                  className={[
                    'flex min-h-[34px] cursor-pointer items-center gap-2 rounded-lg border px-2 py-1 text-left transition',
                    active
                      ? 'border-amber-400 bg-amber-50 dark:border-amber-500 dark:bg-amber-950/40'
                      : 'border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="diagnosis-location"
                    value={choice.key}
                    checked={active}
                    onChange={() => focusLocation(choice)}
                    className="size-3.5 shrink-0 accent-amber-500"
                  />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-slate-700 dark:text-slate-200">
                    {choice.label}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* Repair — the existing editor action (plan §16) */}
        <button
          type="button"
          onClick={repairSelected}
          disabled={!canSubmit}
          title="Carry out the repair you have described, then check the circuit"
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-transparent disabled:text-slate-400 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 dark:disabled:border-slate-700"
        >
          <Wrench className="size-3.5" aria-hidden="true" />
          Carry out this repair
        </button>
        <p className="text-[9px] leading-relaxed text-slate-400 dark:text-slate-500">
          Repairs the part you named, in the way you named it. You can also just rewire the circuit
          on the canvas — the simulator decides whether it is fixed, not this button.
        </p>

        {/* Verdict (live region — plan §46) */}
        <div aria-live="polite" className="space-y-1.5">
          {evaluation && !evaluation.success && (
            <div
              className={[
                'rounded-lg p-2',
                evaluation.verdict === 'incomplete'
                  ? 'bg-blue-50 dark:bg-blue-950/50'
                  : 'bg-red-50 dark:bg-red-950/50',
              ].join(' ')}
            >
              <p
                className={[
                  'text-[11px] font-semibold',
                  evaluation.verdict === 'incomplete'
                    ? 'text-blue-800 dark:text-blue-200'
                    : 'text-red-800 dark:text-red-200',
                ].join(' ')}
              >
                {evaluation.summary}
              </p>
              <p
                className={[
                  'mt-0.5 text-[10px] leading-relaxed',
                  evaluation.verdict === 'incomplete'
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-red-700 dark:text-red-300',
                ].join(' ')}
              >
                {evaluation.guidance}
              </p>
            </div>
          )}
        </div>

        {/* Hints (plan §17) */}
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
      </div>

      {/* Abandon confirmation (plan §22) */}
      {confirmingNew && (
        <div className="border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
          <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200">
            Start another exercise?
          </p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">
            This one will be marked as abandoned.
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const difficulty = scenario.difficulty;
                const tier = scenario.rage?.tier;
                void abandon().then(() => start(difficulty, undefined, tier));
              }}
              className="flex-1 rounded-lg bg-red-600 px-2 py-1.5 text-[11px] font-semibold text-white hover:bg-red-500"
            >
              Start new
            </button>
            <button
              type="button"
              onClick={cancelNew}
              className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-white dark:border-slate-600 dark:text-slate-200"
            >
              Keep investigating
            </button>
          </div>
        </div>
      )}

      <footer className="flex items-center gap-1.5 border-t border-slate-200/80 p-2.5 dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => submit()}
          disabled={!canSubmit}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-[12px] font-semibold text-white transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Stethoscope className="size-3.5" aria-hidden="true" />
          Submit diagnosis
        </button>
        <button
          type="button"
          onClick={revealHint}
          disabled={hintsUsed >= scenario.hints.length}
          aria-label={`Reveal hint (${hintsUsed} of ${scenario.hints.length} used)`}
          title="Hints never cost you the exercise"
          className="rounded-xl border border-slate-200 p-2 text-amber-600 transition hover:bg-amber-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <Lightbulb className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            if (!requestNew()) void start(scenario.difficulty, undefined, scenario.rage?.tier);
          }}
          aria-label="New diagnosis exercise"
          title="New diagnosis exercise"
          className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          <RotateCcw className="size-4" />
        </button>
      </footer>
      <p className="sr-only" aria-live="polite">
        {attempts > 0 ? `${attempts} attempts made.` : ''}
      </p>
    </section>
  );
}
