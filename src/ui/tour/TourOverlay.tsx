/**
 * TourOverlay — the interactive tutorial engine.
 *
 * Renders a full-screen dim layer with a spotlight cutout over the current
 * step's target, plus a floating card with a directional arrow. The overlay
 * is guidance, not a cage: the dim layer is pointer-transparent so the whole
 * app stays interactive, which is what lets `do` steps wait for the user to
 * genuinely perform each action (observed through the zustand stores — no
 * synthetic clicks anywhere).
 *
 * Accessibility: the card is a non-modal dialog, focused on step change,
 * fully keyboard-drivable (Enter/→ next on look steps, ← back, Esc exits),
 * announces steps via aria-live, and respects prefers-reduced-motion.
 */

import { COMPONENT_DEFS, VIEW_H, VIEW_W, getPortPos } from '@electrasim/domain';
import { ArrowRight, Check, History, RotateCcw, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCircuitStore, useViewportStore } from '../../store';
import { useSettingsStore } from '../../store/settingsStore';
import { useUiStore } from '../../store/uiStore';
import { EmojiGlyph } from '../components/EmojiGlyph';
import { TourCelebration } from './TourCelebration';
import { type CardPlacement, placeCard } from './placement';
import { TOURS, type TourSnapshot, type TourStep, getTourSteps } from './steps';
import { markTourDone } from './storage';

const CARD_W = 320;
const CARD_H_GUESS = 180; // refined after first render measure
const SPOT_PAD = 6;
const MISSING_TARGET_GRACE_MS = 700;
const SUCCESS_LINGER_MS = 550;
const POLL_MS = 250;

type Phase = 'tour' | 'celebration' | 'choice';

function buildSnapshot(): TourSnapshot {
  const ui = useUiStore.getState();
  const settings = useSettingsStore.getState();
  const circuit = useCircuitStore.getState();
  const componentTypeCounts: Record<string, number> = {};
  for (const component of circuit.components) {
    componentTypeCounts[component.type] = (componentTypeCounts[component.type] ?? 0) + 1;
  }
  return {
    appMode: settings.appMode,
    regulationStandard: settings.regulationStandard,
    plugSystem: settings.plugSystem,
    diagnosticOverlayMode: settings.diagnosticOverlayMode,
    paletteOpen: ui.paletteOpen,
    faultLabOpen: ui.faultLabOpen,
    templatesOpen: ui.templatesOpen,
    simRunning: ui.simRunning,
    componentCount: circuit.components.length,
    wireCount: circuit.wires.length,
    validationReport: ui.validationReport,
    placingType: ui.placingType,
    standardPopoverOpen:
      typeof document !== 'undefined' && !!document.querySelector('[data-tour="standard-popover"]'),
    componentTypeCounts,
  };
}

/** Resolve the spotlight selector for a step, honouring `targetWhen`. */
function resolveTarget(step: TourStep): string | null {
  return step.targetWhen ? (step.targetWhen(buildSnapshot()) ?? step.target) : step.target;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

interface Props {
  isPhone: boolean;
}

export function TourOverlay({ isPhone }: Props) {
  const tourId = useUiStore((s) => s.tourId);
  const tourStep = useUiStore((s) => s.tourStep);

  const steps = useMemo(() => (tourId ? getTourSteps(tourId) : []), [tourId]);
  const step: TourStep | undefined = steps[tourStep];
  const tourLabel = tourId ? TOURS[tourId].label : null;

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [phase, setPhase] = useState<Phase>('tour');
  const [choiceCompleted, setChoiceCompleted] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const entryRef = useRef<TourSnapshot | null>(null);
  const missingSinceRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  /* ── Ending the tour: restore prompt when a circuit was saved ── */
  const finishTour = useCallback((completed: boolean) => {
    const state = useUiStore.getState();
    if (completed && state.tourId) markTourDone(state.tourId);
    setChoiceCompleted(completed);
    if (state.tourCircuitBackup) {
      setPhase('choice');
      return;
    }
    if (completed) {
      setPhase('celebration');
      return;
    }
    state.endTour();
  }, []);

  const restoreBackup = useCallback(() => {
    const backup = useUiStore.getState().tourCircuitBackup;
    if (backup) {
      useCircuitStore.getState().setCircuit(backup);
      useUiStore
        .getState()
        .addLog(
          `Previous circuit restored (${backup.components.length} components, ${backup.wires.length} wires).`,
          'success',
        );
    }
    useUiStore.getState().endTour();
  }, []);

  const keepTutorialCircuit = useCallback(() => {
    useUiStore
      .getState()
      .addLog('Tutorial circuit kept — the previous circuit was discarded.', 'info');
    useUiStore.getState().endTour();
  }, []);

  const goto = useCallback(
    (index: number) => {
      const state = useUiStore.getState();
      if (index >= steps.length) {
        // Finished every step: record completion, then celebrate before
        // handing the bench back.
        if (state.tourId) markTourDone(state.tourId);
        setPhase('celebration');
        return;
      }
      if (index < 0) return;
      state.setTourStep(index);
    },
    [steps.length],
  );

  /* ── Per-step lifecycle: entry snapshot, skip resolution, advancement ── */
  useEffect(() => {
    if (!tourId || !step || phase !== 'tour') return;
    setSucceeded(false);
    missingSinceRef.current = null;
    entryRef.current = buildSnapshot();

    // Resolve skipIf immediately (may chain through several steps).
    if (step.skipIf?.(entryRef.current)) {
      goto(tourStep + 1);
      return;
    }

    let advanceTimer = 0;
    let done = false;

    const evaluate = () => {
      if (done) return;
      const snap = buildSnapshot();
      const target = resolveTarget(step);

      // Auto-skip when the target never appears (breakpoint / hidden mode).
      if (target && !document.querySelector(target)) {
        if (missingSinceRef.current === null) missingSinceRef.current = performance.now();
        else if (performance.now() - missingSinceRef.current > MISSING_TARGET_GRACE_MS) {
          done = true;
          goto(tourStep + 1);
          return;
        }
      } else {
        missingSinceRef.current = null;
      }

      if (step.kind === 'do' && entryRef.current && step.advanceWhen?.(snap, entryRef.current)) {
        done = true;
        setSucceeded(true);
        advanceTimer = window.setTimeout(
          () => goto(tourStep + 1),
          reducedMotion ? 120 : SUCCESS_LINGER_MS,
        );
      }
    };

    const unsubs = [
      useUiStore.subscribe(evaluate),
      useSettingsStore.subscribe(evaluate),
      useCircuitStore.subscribe(evaluate),
    ];
    const poll = window.setInterval(evaluate, POLL_MS);
    evaluate();

    return () => {
      done = true;
      for (const unsub of unsubs) unsub();
      window.clearInterval(poll);
      window.clearTimeout(advanceTimer);
    };
  }, [tourId, step, tourStep, goto, reducedMotion, phase]);

  /* ── Target measurement (interval + resize/scroll, cheap while active) ── */
  useEffect(() => {
    if (!tourId || !step || phase !== 'tour') return;
    let scrolled = false;
    const measure = () => {
      const target = resolveTarget(step);
      if (!target) {
        setTargetRect(null);
        return;
      }
      const el = document.querySelector(target);
      if (el && !scrolled && typeof el.scrollIntoView === 'function') {
        // Targets inside scroll containers (palette tiles) may start
        // off-screen — bring them into view once per step.
        scrolled = true;
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
      setTargetRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    const interval = window.setInterval(measure, POLL_MS);
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('scroll', measure, { passive: true, capture: true });
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, { capture: true });
    };
  }, [tourId, step, phase]);

  /* ── Keyboard driving ── */
  useEffect(() => {
    if (!tourId || !step || phase !== 'tour') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        finishTour(false);
      } else if (
        step.kind === 'look' &&
        (event.key === 'ArrowRight' || event.key === 'Enter') &&
        document.activeElement === cardRef.current
      ) {
        event.preventDefault();
        goto(tourStep + 1);
      } else if (event.key === 'ArrowLeft' && document.activeElement === cardRef.current) {
        event.preventDefault();
        goto(tourStep - 1);
      }
    };
    // Capture phase so Esc ends the tour before app-level Esc handlers.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [tourId, step, tourStep, goto, finishTour, phase]);

  /* ── Focus the card on step change (no trap — the app must stay usable) ── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus per step
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [tourStep, tourId]);

  if (!tourId || !step) return null;

  if (phase === 'celebration') {
    return (
      <TourCelebration
        onDone={() => {
          // A saved circuit gets its restore prompt before the bench returns.
          if (useUiStore.getState().tourCircuitBackup) setPhase('choice');
          else useUiStore.getState().endTour();
        }}
      />
    );
  }

  if (phase === 'choice') {
    return (
      <RestoreChoiceCard
        completed={choiceCompleted}
        onRestore={restoreBackup}
        onKeep={keepTutorialCircuit}
      />
    );
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spot = targetRect
    ? {
        top: targetRect.top - SPOT_PAD,
        left: targetRect.left - SPOT_PAD,
        width: targetRect.width + SPOT_PAD * 2,
        height: targetRect.height + SPOT_PAD * 2,
      }
    : null;

  const cardH = cardRef.current?.offsetHeight ?? CARD_H_GUESS;
  const placement: CardPlacement | null =
    !isPhone && spot
      ? placeCard(spot, { width: CARD_W, height: cardH }, { width: vw, height: vh })
      : null;

  const isCentered = !spot || tourStep === 0 || !step.target;
  const cardStyle: React.CSSProperties = isCentered
    ? {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(400px, calc(100vw - 32px))',
        maxWidth: 'calc(100vw - 32px)',
      }
    : isPhone
      ? { position: 'fixed', left: 8, right: 8, bottom: 8, width: 'auto' }
      : placement
        ? { position: 'fixed', top: placement.top, left: placement.left, width: CARD_W }
        : {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(380px, calc(100vw - 32px))',
          };

  const arrowStyle: React.CSSProperties | null =
    !isCentered && placement && spot
      ? placement.side === 'bottom'
        ? { top: -6, left: placement.arrow - 6 }
        : placement.side === 'top'
          ? { bottom: -6, left: placement.arrow - 6 }
          : placement.side === 'right'
            ? { left: -6, top: placement.arrow - 6 }
            : { right: -6, top: placement.arrow - 6 }
      : null;

  const isLast = tourStep === steps.length - 1;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]" data-tour-overlay>
      {/* Dim layer with spotlight cutout — pointer-transparent by design. */}
      <svg
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
        role="presentation"
        style={{ pointerEvents: 'none' }}
      >
        <defs>
          <mask id="tour-spot-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.left}
                y={spot.top}
                width={spot.width}
                height={spot.height}
                rx="10"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(2, 6, 23, 0.55)"
          mask="url(#tour-spot-mask)"
        />
      </svg>

      {/* Spotlight ring */}
      {spot && (
        <div
          aria-hidden="true"
          className={[
            'absolute rounded-[10px] ring-2 ring-offset-0',
            succeeded ? 'ring-emerald-400' : 'ring-sky-400',
            reducedMotion ? '' : 'transition-all duration-200',
          ].join(' ')}
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: succeeded
              ? '0 0 0 4px rgba(52, 211, 153, 0.25)'
              : '0 0 0 4px rgba(56, 189, 248, 0.25)',
          }}
        />
      )}

      {/* Step card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        // biome-ignore lint/a11y/useSemanticElements: intentionally non-modal — the app must stay interactive for “do” steps, which native <dialog> modality would block
        role="dialog"
        aria-label={`Tutorial step ${tourStep + 1} of ${steps.length}: ${step.title}`}
        className={[
          'pointer-events-auto rounded-xl border border-slate-200 bg-white p-4 shadow-2xl outline-none ring-1 ring-slate-900/10',
          'dark:border-slate-700 dark:bg-slate-900 dark:ring-slate-700/60',
          // Opacity-only entrance: the card is centred/anchored by an inline
          // transform, which `animate-dialog-fade-in`'s keyframes would override.
          reducedMotion ? '' : 'animate-fade-in-only',
        ].join(' ')}
        style={cardStyle}
      >
        {arrowStyle && (
          <div
            aria-hidden="true"
            className="absolute size-3 rotate-45 border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
            style={arrowStyle}
          />
        )}

        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-sky-600 ring-1 ring-sky-100 dark:bg-sky-950/60 dark:text-sky-300 dark:ring-sky-900/60">
              <Sparkles aria-hidden="true" className="size-3" />
              {tourLabel}
            </span>
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Step {tourStep + 1} / {steps.length}
            </span>
          </span>
          <button
            type="button"
            onClick={() => finishTour(false)}
            aria-label="End tutorial"
            title="End the tutorial (Esc)"
            className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div
          className="mb-2.5 h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
          aria-hidden="true"
        >
          <div
            className={[
              'h-full rounded-full bg-sky-500',
              reducedMotion ? '' : 'transition-all duration-300',
            ].join(' ')}
            style={{ width: `${Math.round(((tourStep + 1) / steps.length) * 100)}%` }}
          />
        </div>

        <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{step.title}</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {step.body}
        </p>

        {/* Live status line for do-steps */}
        <div aria-live="polite">
          {step.kind === 'do' && (
            <p
              className={[
                'mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold',
                succeeded
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
              ].join(' ')}
            >
              {succeeded ? (
                <>
                  <Check aria-hidden="true" className="size-3.5" /> Nice — done!
                </>
              ) : (
                <>
                  <span
                    aria-hidden="true"
                    className={`size-2 rounded-full bg-sky-500 ${reducedMotion ? '' : 'animate-pulse'}`}
                  />
                  {step.action ?? 'Try it now'}
                </>
              )}
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goto(tourStep - 1)}
            disabled={tourStep === 0}
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {step.kind === 'do' && !succeeded && (
              <button
                type="button"
                onClick={() => goto(tourStep + 1)}
                className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
              >
                Skip step
              </button>
            )}
            {(step.kind === 'look' || succeeded) && (
              <button
                type="button"
                onClick={() => goto(tourStep + 1)}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-4 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:bg-sky-700"
              >
                {isLast ? 'Finish' : 'Next'}
                <ArrowRight aria-hidden="true" className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* Keyboard hints */}
        <div className="mt-2.5 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[9px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono dark:border-slate-700 dark:bg-slate-800">
            Esc
          </kbd>
          exit
          <span className="text-slate-200 dark:text-slate-700">·</span>
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono dark:border-slate-700 dark:bg-slate-800">
            ←
          </kbd>
          back
          <span className="text-slate-200 dark:text-slate-700">·</span>
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono dark:border-slate-700 dark:bg-slate-800">
            Enter
          </kbd>
          next
        </div>
      </div>

      {/* Wiring arrows for the "Wire the circuit" step — draw over the canvas
          in world coordinates so they pan/zoom with the circuit. */}
      <TourWireHints active={step.id === 'wire-ports'} />
    </div>
  );
}

/**
 * TourWireHints — visual guide for the student tour's wiring step.
 *
 * Once the bulb, Live and Neutral terminals are on the canvas, draws two
 * animated dashed arrows between the exact ports the learner must click:
 * Live L-out → bulb L, and bulb N → Neutral N-out. Rendered in the same
 * 1200×720 world space (with the viewport pan/zoom applied) as the canvas,
 * so the arrows stay glued to the components as the user pans/zooms.
 */
function TourWireHints({ active }: { active: boolean }) {
  const components = useCircuitStore((s) => s.components);
  const pan = useViewportStore((s) => s.pan);
  const zoom = useViewportStore((s) => s.zoom);

  const live = components.find((c) => c.type === 'live-terminal');
  const neutral = components.find((c) => c.type === 'neutral-terminal');
  const bulb = components.find((c) => c.type === 'bulb');

  const pairs = useMemo(() => {
    if (!live || !neutral || !bulb) return [];
    const liveOut = getPortPos(live, 0, COMPONENT_DEFS);
    const bulbL = getPortPos(bulb, 0, COMPONENT_DEFS);
    const bulbN = getPortPos(bulb, 1, COMPONENT_DEFS);
    const neutralOut = getPortPos(neutral, 0, COMPONENT_DEFS);
    return [
      { from: liveOut, to: bulbL, label: '1 · L→L' },
      { from: bulbN, to: neutralOut, label: '2 · N→N' },
    ];
  }, [live, neutral, bulb]);

  if (!active || pairs.length === 0) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 block h-full w-full"
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    >
      <defs>
        <marker
          id="tour-wire-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill="#0ea5e9" />
        </marker>
      </defs>
      <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
        {pairs.map(({ from, to, label }) => (
          <g key={label}>
            {/* Glow underlay so the arrow reads over the dim layer */}
            <path
              d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d={`M ${from.x} ${from.y} L ${to.x} ${to.y}`}
              fill="none"
              stroke="#0284c7"
              strokeWidth="3.5"
              strokeDasharray="9 7"
              strokeLinecap="round"
              markerEnd="url(#tour-wire-arrow)"
              className="challenge-hint-line"
            />
            {/* Pulsing endpoint rings on the two ports to click */}
            <circle
              cx={from.x}
              cy={from.y}
              r="11"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              className="challenge-hint-target"
            />
            <circle
              cx={to.x}
              cy={to.y}
              r="11"
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2.5"
              className="challenge-hint-target"
            />
            <g transform={`translate(${(from.x + to.x) / 2} ${(from.y + to.y) / 2 - 20})`}>
              <rect
                x={-34}
                y={-12}
                width={68}
                height={22}
                rx={11}
                fill="#e0f2fe"
                stroke="#38bdf8"
                strokeWidth="1.5"
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="700"
                fill="#0369a1"
                fontFamily="system-ui, sans-serif"
              >
                {label}
              </text>
            </g>
          </g>
        ))}
      </g>
    </svg>
  );
}

/**
 * RestoreChoiceCard — shown when a tour ends while the user's pre-tour
 * circuit is saved: restore the previous circuit or keep the tutorial one.
 * Esc restores (the safe default — the saved circuit is the user's work).
 */
function RestoreChoiceCard({
  completed,
  onRestore,
  onKeep,
}: {
  completed: boolean;
  onRestore: () => void;
  onKeep: () => void;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backup = useUiStore((s) => s.tourCircuitBackup);

  // Modal-ish focus behaviour; Esc maps to restore (safe default).
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onRestore();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onRestore]);

  return (
    <div className="pointer-events-auto fixed inset-0 z-[80] grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm animate-backdrop-fade-in">
      <div
        ref={panelRef}
        tabIndex={-1}
        // biome-ignore lint/a11y/useSemanticElements: lightweight finishing prompt, intentionally non-modal-looking
        role="dialog"
        aria-label="Tutorial finished — restore your circuit?"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none animate-dialog-fade-in dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
            {completed ? (
              <Check aria-hidden="true" className="size-5" />
            ) : (
              <History aria-hidden="true" className="size-5" />
            )}
          </div>
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              {completed ? (
                <>
                  <EmojiGlyph emoji="party" size={14} /> Tutorial complete
                </>
              ) : (
                'Tutorial ended'
              )}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              You had a circuit on the canvas before the tutorial
              {backup
                ? ` (${backup.components.length} components, ${backup.wires.length} wires)`
                : ''}
              . Restore it, or keep the tutorial circuit?
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <button
            type="button"
            onClick={onRestore}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            Restore previous circuit
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Keep this circuit
          </button>
        </div>
        <p className="mt-3 text-center text-[10px] text-slate-400 dark:text-slate-500">
          Press Esc to restore your previous circuit
        </p>
      </div>
    </div>
  );
}
