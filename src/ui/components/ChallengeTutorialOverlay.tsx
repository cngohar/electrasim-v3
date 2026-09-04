import { Target } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { VIEW_H, VIEW_W } from '../../domain';
import { getChallengeStepProgress, validateChallenge } from '../../domain/challenges/declarative';
import { useCircuitStore, useViewportStore } from '../../store';
import { useDeclarativeChallengeStore } from '../../store/declarativeChallengeStore';
import { type ResolvedVisual, resolveVisualTarget } from './ChallengeHintOverlay';

/**
 * Mission 0 coach: unlike a normal visual hint, this stays visible and
 * advances automatically as the learner completes each declarative step.
 */
export function ChallengeTutorialOverlay() {
  const status = useDeclarativeChallengeStore((s) => s.status);
  const definition = useDeclarativeChallengeStore((s) => s.definition);
  const paused = useDeclarativeChallengeStore((s) => s.paused);
  const check = useDeclarativeChallengeStore((s) => s.check);
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const pan = useViewportStore((s) => s.pan);
  const zoom = useViewportStore((s) => s.zoom);
  const requestExit = useDeclarativeChallengeStore((s) => s.requestExit);

  const isTutorial = status === 'active' && !paused && definition?.kind === 'tutorial';
  const circuit = useMemo(
    () => ({ components, wires, globalVoltage }),
    [components, globalVoltage, wires],
  );
  const liveVerdict = useMemo(
    () => (isTutorial && definition ? validateChallenge(definition, circuit) : null),
    [circuit, definition, isTutorial],
  );
  const stepProgress = useMemo(
    () =>
      isTutorial && definition
        ? getChallengeStepProgress(definition, liveVerdict)
        : { completed: [], currentIndex: 0, completedCount: 0 },
    [definition, isTutorial, liveVerdict],
  );
  const currentStep =
    isTutorial && definition ? definition.steps[stepProgress.currentIndex] : undefined;

  // A tutorial is action-led: completing its final rule automatically enters
  // the same completion state used by normal challenges and triggers the
  // corresponding celebration.
  useEffect(() => {
    if (isTutorial && liveVerdict?.state === 'complete') check();
  }, [check, isTutorial, liveVerdict]);

  const resolved = useMemo<ResolvedVisual | null>(() => {
    if (!currentStep?.visualTarget) return null;
    return resolveVisualTarget(currentStep.visualTarget, components, currentStep.text);
  }, [components, currentStep]);

  if (!isTutorial || !definition || !currentStep) return null;

  return (
    <div
      data-challenge-tutorial
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <div className="pointer-events-auto absolute left-1/2 top-[104px] w-[min(360px,calc(100vw-1.5rem))] -translate-x-1/2 rounded-2xl border border-blue-200/90 bg-white/95 p-3 shadow-xl shadow-blue-900/10 backdrop-blur-xl dark:border-blue-800/80 dark:bg-slate-900/95">
        <div className="flex items-start gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
            <Target className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-300">
                Mission 0 · Step {currentStep.no} of {definition.steps.length}
              </p>
              <span className="shrink-0 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-blue-700 dark:bg-blue-950 dark:text-blue-200">
                {stepProgress.completedCount}/{definition.steps.length}
              </span>
            </div>
            <p
              aria-live="polite"
              className="mt-1 text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-100"
            >
              {currentStep.text}
            </p>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
              Follow the blue arrow. Progress advances automatically when the step is complete.
            </p>
          </div>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={requestExit}
            className="rounded-lg px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-800 dark:hover:text-red-300"
          >
            Skip tutorial
          </button>
        </div>
      </div>

      {resolved && (
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="block size-full"
          aria-hidden="true"
        >
          <title>Mission target: {currentStep.text}</title>
          <defs>
            <marker
              id="challenge-tutorial-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#2563eb" />
            </marker>
          </defs>
          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
            {resolved.kind === 'connection' ? (
              <>
                <path
                  d={`M ${resolved.from.x} ${resolved.from.y} L ${resolved.to.x} ${resolved.to.y}`}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="4"
                  strokeDasharray="10 8"
                  strokeLinecap="round"
                  markerEnd="url(#challenge-tutorial-arrow)"
                  className="challenge-hint-line"
                />
                <circle
                  cx={resolved.from.x}
                  cy={resolved.from.y}
                  r="10"
                  fill="#2563eb"
                  opacity="0.18"
                />
                <circle
                  cx={resolved.to.x}
                  cy={resolved.to.y}
                  r="10"
                  fill="#2563eb"
                  opacity="0.28"
                />
                <TutorialLabel
                  point={midpoint(resolved.from, resolved.to)}
                  text="Connect these terminals"
                />
              </>
            ) : (
              <>
                {(() => {
                  const start = arrowStart(resolved.point);
                  return (
                    <path
                      d={`M ${start.x} ${start.y} L ${resolved.point.x} ${resolved.point.y}`}
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="4"
                      strokeDasharray="10 8"
                      strokeLinecap="round"
                      markerEnd="url(#challenge-tutorial-arrow)"
                      className="challenge-hint-line"
                    />
                  );
                })()}
                <circle
                  cx={resolved.point.x}
                  cy={resolved.point.y}
                  r="20"
                  fill="#2563eb"
                  fillOpacity="0.12"
                  stroke="#2563eb"
                  strokeWidth="3"
                  strokeDasharray="6 5"
                  className="challenge-hint-target"
                />
                <TutorialLabel
                  point={{ x: resolved.point.x, y: resolved.point.y - 24 }}
                  text="Try here"
                />
              </>
            )}
          </g>
        </svg>
      )}
    </div>
  );
}

function arrowStart(point: { x: number; y: number }) {
  const above = { x: point.x, y: point.y - 92 };
  return above.y >= 20 ? above : { x: point.x, y: point.y + 92 };
}

function midpoint(a: { x: number; y: number }, b: { x: number; y: number }) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 18 };
}

function TutorialLabel({ point, text }: { point: { x: number; y: number }; text: string }) {
  const width = text === 'Try here' ? 88 : 150;
  const x = Math.max(8, Math.min(VIEW_W - width - 8, point.x - width / 2));
  const y = Math.max(18, Math.min(VIEW_H - 18, point.y));
  return (
    <g transform={`translate(${x} ${y - 16})`}>
      <rect width={width} height="25" rx="12.5" fill="#eff6ff" stroke="#60a5fa" strokeWidth="1.5" />
      <text
        x={width / 2}
        y="16.5"
        textAnchor="middle"
        fill="#1d4ed8"
        fontSize="11"
        fontWeight="700"
      >
        {text}
      </text>
    </g>
  );
}
