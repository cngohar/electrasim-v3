/**
 * TemplatesModal — the Guided Circuits window.
 *
 * Revamped from a plain full-bleed card grid into a proper windowed picker:
 *   - a visible header with title, description and an explicit ✕ close
 *     control (plus backdrop-click and Escape, as before)
 *   - a search box and Basics / Pro tier filters
 *   - a scrollable, grouped card list inside a constrained window
 *   - a footer with the guide count and a Close button
 *
 * Loading a Pro guide while in Student mode switches the app to Pro mode so
 * the palette and toolbox match the guide's components.
 */

import { BookOpen, CheckCircle2, CircuitBoard, Search, Sparkles, Wrench, X } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { GUIDED_CIRCUIT_TEMPLATES, type GuidedCircuitTemplate } from '../../domain/templates';
import { isGuideCompleted } from '../../lib/guideProgressPersistence';
import { loadGuidedCircuitIntoEditor } from '../../lib/guidedCircuitLoader';
import { useDialogFocus } from '../hooks/useDialogFocus';

interface Props {
  open: boolean;
  onClose: () => void;
}

type TierFilter = 'all' | 'basic' | 'pro';

function difficultyClass(difficulty: GuidedCircuitTemplate['difficulty']): string {
  switch (difficulty) {
    case 'Beginner':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300';
    case 'Intermediate':
      return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300';
    case 'Advanced':
      return 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300';
  }
}

function GuideCard({
  template,
  onLoad,
}: {
  template: GuidedCircuitTemplate;
  onLoad: (template: GuidedCircuitTemplate) => void;
}) {
  const completed = isGuideCompleted(template.id);
  return (
    <article className="flex min-h-[210px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/70 dark:hover:border-blue-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {template.title}
          </h3>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {template.topic}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${difficultyClass(template.difficulty)}`}
          >
            {template.difficulty}
          </span>
          {template.tier === 'pro' && (
            <span className="flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-700 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
              <Wrench className="size-2.5" /> Pro
            </span>
          )}
        </div>
      </div>

      <div className="mt-1.5 flex items-center gap-2 text-[10px] font-semibold">
        <span
          className={`flex items-center gap-1 ${completed ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}
        >
          {completed ? <CheckCircle2 className="size-3" /> : <CircuitBoard className="size-3" />}
          {completed ? 'Guide completed' : 'Not started'}
        </span>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <span className="text-slate-400 dark:text-slate-500">
          {template.circuit.components.length} components · {template.circuit.wires.length} wires
        </span>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
        {template.summary}
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
        {template.teaches}
      </p>

      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-700/70 dark:bg-slate-800/60">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          First steps
        </div>
        <ol className="mt-1 space-y-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
          {template.steps.slice(0, 2).map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <button
        type="button"
        onClick={() => onLoad(template)}
        className="mt-auto w-full rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
      >
        Load guide
      </button>
    </article>
  );
}

export function TemplatesModal({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(open, onClose, panelRef);

  const [query, setQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (template: GuidedCircuitTemplate) =>
      !q ||
      `${template.title} ${template.topic} ${template.summary} ${template.teaches}`
        .toLowerCase()
        .includes(q);
    const basic = GUIDED_CIRCUIT_TEMPLATES.filter(
      (template) => template.tier === 'basic' && matches(template),
    );
    const pro = GUIDED_CIRCUIT_TEMPLATES.filter(
      (template) => template.tier === 'pro' && matches(template),
    );
    if (tierFilter === 'basic') return [{ label: 'Getting started', templates: basic }];
    if (tierFilter === 'pro') return [{ label: 'Pro toolbox', templates: pro }];
    return [
      { label: 'Getting started', templates: basic },
      { label: 'Pro toolbox', templates: pro },
    ].filter((group) => group.templates.length > 0);
  }, [query, tierFilter]);

  const totalShown = groups.reduce((total, group) => total + group.templates.length, 0);

  const loadTemplate = (template: GuidedCircuitTemplate) => {
    loadGuidedCircuitIntoEditor(template);
    onClose();
  };

  if (!open) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-dvh w-screen max-h-none max-w-none items-center justify-center overflow-y-auto border-0 bg-transparent p-2 sm:p-4"
      aria-modal="true"
      aria-label="Guided Circuits"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default bg-slate-900/50 backdrop-blur-sm animate-backdrop-fade-in"
        onClick={onClose}
      />

      {/* Window */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/80 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/10 outline-none animate-dialog-fade-in dark:border-slate-700/80 dark:bg-slate-900 dark:ring-slate-700/50"
      >
        {/* Header */}
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-700/60">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <BookOpen className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Guided Circuits
              </h2>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Load a ready-made circuit and follow a short checklist inside the simulator.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close guided circuits"
              title="Close (Esc)"
              className="grid size-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Search + tier filter */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search guides — e.g. solar, EV, RCD, three-phase…"
                className="w-full rounded-full border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-xs outline-none placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-800/80 dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:border-blue-500 dark:focus:ring-blue-900/50"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {(
                [
                  ['all', 'All'],
                  ['basic', 'Basics'],
                  ['pro', 'Pro'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTierFilter(key)}
                  className={[
                    'rounded-full px-3 py-1.5 text-[11px] font-semibold transition',
                    tierFilter === key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {totalShown === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">
              No guides match &ldquo;{query}&rdquo;
            </div>
          )}
          {groups.map((group) => (
            <section key={group.label} className="mb-5 last:mb-1">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {group.label}
                </h3>
                {group.label === 'Pro toolbox' && <Sparkles className="size-3 text-purple-500" />}
                <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {group.templates.length}
                </span>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.templates.map((template) => (
                  <GuideCard key={template.id} template={template} onLoad={loadTemplate} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-700/60 dark:bg-slate-800/60">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            {totalShown} guide{totalShown === 1 ? '' : 's'} · loaded circuits are undoable and run
            inside the simulator
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-blue-600 px-5 py-1.5 text-xs font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
