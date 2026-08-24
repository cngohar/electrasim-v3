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

import { ArrowRight, Check, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCircuitStore } from '../../store/circuitStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useUiStore } from '../../store/uiStore';
import { TourCelebration } from './TourCelebration';
import { type CardPlacement, placeCard } from './placement';
import { type TourSnapshot, type TourStep, getTourSteps } from './steps';
import { markTourDone } from './storage';

const CARD_W = 320;
const CARD_H_GUESS = 180; // refined after first render measure
const SPOT_PAD = 6;
const MISSING_TARGET_GRACE_MS = 700;
const SUCCESS_LINGER_MS = 550;
const POLL_MS = 250;

function buildSnapshot(): TourSnapshot {
  const ui = useUiStore.getState();
  const settings = useSettingsStore.getState();
  const circuit = useCircuitStore.getState();
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
    standardPopoverOpen:
      typeof document !== 'undefined' && !!document.querySelector('[data-tour="standard-popover"]'),
  };
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

  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const entryRef = useRef<TourSnapshot | null>(null);
  const missingSinceRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  const end = useCallback((completed: boolean) => {
    const state = useUiStore.getState();
    if (completed && state.tourId) markTourDone(state.tourId);
    state.endTour();
  }, []);

  const goto = useCallback(
    (index: number) => {
      const state = useUiStore.getState();
      if (index >= steps.length) {
        // Finished every step: record completion, then celebrate before
        // handing the bench back.
        if (state.tourId) markTourDone(state.tourId);
        setCelebrating(true);
        return;
      }
      if (index < 0) return;
      state.setTourStep(index);
    },
    [steps.length],
  );

  /* ── Per-step lifecycle: entry snapshot, skip resolution, advancement ── */
  useEffect(() => {
    if (!tourId || !step || celebrating) return;
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

      // Auto-skip when the target never appears (breakpoint / hidden mode).
      if (step.target && !document.querySelector(step.target)) {
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
  }, [tourId, step, tourStep, goto, reducedMotion, celebrating]);

  /* ── Target measurement (interval + resize/scroll, cheap while active) ── */
  useEffect(() => {
    if (!tourId || !step) return;
    let scrolled = false;
    const measure = () => {
      if (!step.target) {
        setTargetRect(null);
        return;
      }
      const el = document.querySelector(step.target);
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
  }, [tourId, step]);

  /* ── Keyboard driving ── */
  useEffect(() => {
    if (!tourId || !step || celebrating) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        end(false);
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
  }, [tourId, step, tourStep, goto, end, celebrating]);

  /* ── Focus the card on step change (no trap — the app must stay usable) ── */
  // biome-ignore lint/correctness/useExhaustiveDependencies: refocus per step
  useEffect(() => {
    cardRef.current?.focus({ preventScroll: true });
  }, [tourStep, tourId]);

  if (!tourId || !step) return null;

  if (celebrating) {
    return <TourCelebration onDone={() => useUiStore.getState().endTour()} />;
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

  const cardStyle: React.CSSProperties = isPhone
    ? { position: 'fixed', left: 8, right: 8, bottom: 8, width: 'auto' }
    : placement
      ? { position: 'fixed', top: placement.top, left: placement.left, width: CARD_W }
      : {
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: CARD_W,
        };

  const arrowStyle: React.CSSProperties | null =
    placement && spot
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
          reducedMotion ? '' : 'animate-dialog-fade-in',
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
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            <Sparkles aria-hidden="true" className="size-3" />
            Step {tourStep + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={() => end(false)}
            aria-label="End tutorial"
            className="grid size-7 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
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
      </div>
    </div>
  );
}
