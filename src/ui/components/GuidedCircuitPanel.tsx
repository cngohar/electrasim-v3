import { COMPONENT_DEFS } from '@electrasim/domain/components';
import { getGuideProgress } from '@electrasim/domain/guideProgress';
import { cloneTemplateCircuit, getGuidedCircuitTemplate } from '@electrasim/domain/templates';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Circle,
  Lightbulb,
  MousePointerClick,
  RotateCcw,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { markGuideCompleted } from '../../lib/guideProgressPersistence';
import { useCircuitStore, useUiStore } from '../../store';

interface Props {
  isPhone: boolean;
}

export function GuidedCircuitPanel({ isPhone }: Props) {
  const activeGuideId = useUiStore((s) => s.activeGuideId);
  const simRunning = useUiStore((s) => s.simRunning);
  const simResult = useUiStore((s) => s.simResult);
  const inspectorCollapsed = useUiStore((s) => s.inspectorCollapsed);
  const guideHidden = useUiStore((s) => s.guideHidden);
  const setGuideHidden = useUiStore((s) => s.setGuideHidden);
  // Keep clear of the Inspector's collapsed icon rail (48px at right-0) —
  // same offset as MiniMap/ToolDock/StatusPill use in the collapsed state.
  // (When the drawer is expanded the chip is suppressed entirely and the
  // return-to-guide action lives inline in the drawer header instead.)
  const rightClass = 'right-14';
  const components = useCircuitStore((s) => s.components);
  const wires = useCircuitStore((s) => s.wires);
  const supply = useCircuitStore((s) => s.supply);
  const globalVoltage = useCircuitStore((s) => s.globalVoltage);
  const faults = useCircuitStore((s) => s.faults);
  const selectedComponentId = useCircuitStore((s) => s.selectedComponentId);
  const inspectorVisible = selectedComponentId !== null;
  const [showHint, setShowHint] = useState(false);
  const template = activeGuideId ? getGuidedCircuitTemplate(activeGuideId) : undefined;
  const progress = useMemo(
    () =>
      template
        ? getGuideProgress(
            template,
            { components, wires, supply, globalVoltage, faults },
            simRunning,
            simResult,
          )
        : null,
    [template, components, wires, supply, globalVoltage, faults, simRunning, simResult],
  );

  useEffect(() => {
    if (template && progress?.completed)
      markGuideCompleted(template, { components, wires, supply, globalVoltage, faults }, simResult);
  }, [template, progress?.completed, components, wires, supply, globalVoltage, faults, simResult]);

  if (!template || !progress) return null;

  // Hidden guide: the panel/sheet always has a Hide affordance because it can
  // overlay canvas components (phone bottom-sheet always, tablet/desktop panel
  // on narrower viewports). Hiding must NOT end the guide — progress keeps
  // tracking and this floating pill is the way back.
  if (guideHidden) {
    return (
      <button
        type="button"
        onClick={() => setGuideHidden(false)}
        aria-label="Show guide steps"
        title={`${template.title} — show guide steps`}
        className={[
          'absolute z-20 flex items-center gap-2 rounded-full border border-white/80 bg-white/95 px-3 py-2 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl transition hover:bg-blue-50 dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50 dark:hover:bg-slate-800',
          isPhone ? 'bottom-20 right-3' : 'left-1/2 top-36 -translate-x-1/2',
        ].join(' ')}
      >
        <span className="grid size-6 place-items-center rounded-lg bg-blue-600 text-white shadow-sm shadow-blue-600/30">
          <BookOpen className="size-3.5" />
        </span>
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200">
          Guide steps
        </span>
        <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          {progress.completedIds.length}/{progress.objectives.length}
        </span>
      </button>
    );
  }

  // Guided hand-off (desktop/tablet): selecting a component hides the step
  // checklist so the Inspector can take over. Offer an explicit, discoverable
  // way back — previously the only return path was clicking empty canvas to
  // deselect, which stranded users mid-guide.
  if (!isPhone && inspectorVisible && inspectorCollapsed) {
    const selected = components.find((c) => c.id === selectedComponentId);
    const selectedLabel = selected ? (COMPONENT_DEFS[selected.type]?.label ?? null) : null;
    return (
      <aside
        className={`absolute ${rightClass} top-28 z-20 w-56 overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl lg:w-[340px] dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50`}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700/60">
          <div className="mt-0.5 grid size-8 flex-shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
            <MousePointerClick className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
              Inspector
            </h2>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-indigo-600 dark:text-indigo-300">
              Guide paused
            </p>
          </div>
        </div>
        <div className="space-y-3 px-4 py-3">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {selectedLabel
              ? `${selectedLabel} is selected. The guide steps are hidden while you inspect it.`
              : 'A component is selected. The guide steps are hidden while you inspect it.'}
          </p>
          <button
            type="button"
            onClick={() => {
              useCircuitStore.getState().clearSelection();
              useUiStore.getState().setInspectorCollapsed(true);
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-700"
          >
            <ChevronLeft className="size-3.5" />
            Close inspector and return to guide
          </button>
        </div>
      </aside>
    );
  }

  // Expanded drawer + active selection: the guide panel yields entirely —
  // the Inspector drawer carries an inline "return to guide" strip.
  if (!isPhone && inspectorVisible && !inspectorCollapsed) return null;

  const restart = () => {
    useCircuitStore.getState().setCircuit(cloneTemplateCircuit(template));
    const ui = useUiStore.getState();
    ui.setSimRunning(false);
    ui.setSimResult(null);
    setShowHint(false);
  };

  return (
    <aside
      className={[
        'absolute z-20 overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-xl shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/95 dark:ring-slate-700/50',
        isPhone
          ? 'bottom-20 left-3 right-3 max-h-[52vh]'
          : `${rightClass} top-24 w-56 max-h-[calc(100vh-8rem)] lg:w-[340px]`,
      ].join(' ')}
    >
      <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700/60">
        <div className="mt-0.5 grid size-8 flex-shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
          <BookOpen className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100">
                {template.title}
              </h2>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-blue-600 dark:text-blue-300">
                {template.difficulty} · {template.topic}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGuideHidden(true)}
              className="rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Hide guide"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
      <div className="max-h-[inherit] space-y-3 overflow-y-auto px-4 py-3">
        {simResult && progress.currentObjectiveId === 'safe-result' && (
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Review the findings in the inspector. This circuit has warnings or unassessed electrical
            behavior.
          </p>
        )}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <span>{progress.completed ? 'Guide complete' : 'Checklist'}</span>
          <span>
            {progress.completedIds.length}/{progress.objectives.length} steps
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className="h-full rounded-full bg-blue-600 transition-all"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {template.expected}
        </p>
        <ol className="flex flex-col gap-2">
          {progress.objectives.map((objective) => {
            const done = progress.completedIds.includes(objective.id);
            const current = progress.currentObjectiveId === objective.id;
            return (
              <li
                key={objective.id}
                className={[
                  'flex gap-2 rounded-xl border px-3 py-2 text-[11px] leading-relaxed',
                  done
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'
                    : current
                      ? 'border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30'
                      : 'border-slate-100 dark:border-slate-700/70',
                ].join(' ')}
              >
                <span className="mt-0.5 flex-shrink-0">
                  {done ? (
                    <Check className="size-4 text-emerald-600" />
                  ) : current ? (
                    <ChevronRight className="size-4 text-blue-600" />
                  ) : (
                    <Circle className="size-4 text-slate-300" />
                  )}
                </span>
                <span
                  className={
                    done
                      ? 'text-emerald-800 dark:text-emerald-200'
                      : 'text-slate-600 dark:text-slate-300'
                  }
                >
                  <strong className="block font-semibold">{objective.label}</strong>
                  {objective.description}
                </span>
              </li>
            );
          })}
        </ol>
        <button
          type="button"
          onClick={() => setShowHint((value) => !value)}
          className="flex items-center gap-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
        >
          <Lightbulb className="size-4" />
          {showHint ? 'Hide hint' : 'Show hint'}
        </button>
        {showHint && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-relaxed text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            {template.faultPrompt ?? template.teaches}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-700/60 dark:bg-slate-800/60">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={restart}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300"
          >
            <RotateCcw className="size-3" /> Restart
          </button>
          <button
            type="button"
            onClick={() => {
              useUiStore.getState().setActiveGuideId(null);
              useUiStore.getState().addLog(`Ended guided circuit: ${template.title}`, 'info');
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
            title="Close the guide checklist and keep the circuit on the canvas"
          >
            <X className="size-3" /> End guide
          </button>
        </div>
        <button
          type="button"
          onClick={() => useUiStore.getState().setTemplatesOpen(true)}
          className="text-[11px] font-semibold text-blue-600 dark:text-blue-300"
        >
          Next guide
        </button>
      </div>
    </aside>
  );
}
