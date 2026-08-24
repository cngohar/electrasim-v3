/**
 * WelcomeModal — first-visit introduction modal.
 *
 * Shown automatically on first load (localStorage flag not set).
 * Can be re-opened via right-click context menu → "What is ElectraSim?".
 * Closing it sets `electrasim:welcomed` in localStorage so it won't
 * auto-show again.
 */

import {
  ArrowRight,
  BookOpen,
  Cable,
  CircuitBoard,
  Info,
  type LucideIcon,
  Play,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { useRef } from 'react';
import { useUiStore } from '../../store';
import { APP_VERSION } from '../../version';
import { useDialogFocus } from '../hooks/useDialogFocus';

const STEPS = [
  {
    icon: CircuitBoard,
    title: 'Start with a Guided Circuit',
    desc: 'Load a ready-made example, then work through its learning notes and checklist.',
  },
  {
    icon: Cable,
    title: 'Place and connect',
    desc: 'Open Components (or Add on a phone), choose a part, then connect matching Live, Neutral, and Earth ports.',
  },
  {
    icon: Play,
    title: 'Run and test',
    desc: 'Select Run, operate the controls, and watch energised paths and reported faults change.',
  },
] satisfies Array<{ icon: LucideIcon; title: string; desc: string }>;

export function WelcomeModal() {
  const open = useUiStore((s) => s.welcomeOpen);
  const close = () => useUiStore.getState().setWelcomeOpen(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(open, close, panelRef);

  if (!open) return null;

  return (
    <dialog
      open
      className="fixed inset-0 z-50 m-0 flex h-dvh w-screen max-h-none max-w-none items-center justify-center overflow-y-auto border-0 bg-transparent p-4"
      aria-modal="true"
      aria-label="Welcome to ElectraSim"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 cursor-default bg-slate-900/50 backdrop-blur-sm animate-backdrop-fade-in"
        onClick={close}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-white/80 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/10 outline-none animate-dialog-fade-in dark:border-slate-700/80 dark:bg-slate-900 dark:ring-slate-700/50"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-5 text-white">
          <button
            type="button"
            onClick={close}
            aria-label="Close welcome"
            className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-white/15 shadow-sm">
              <Zap aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                Welcome to ElectraSim
                <span className="ml-2 inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 align-middle font-mono text-[10px] font-semibold tracking-wide text-blue-50 ring-1 ring-white/25">
                  v{APP_VERSION}
                </span>
              </h2>
              <div className="text-sm text-blue-100">Build your first circuit</div>
            </div>
          </div>
          <p className="relative mt-3 text-sm leading-relaxed text-blue-50">
            Learn how a circuit is connected, test component states, and trace the paths that become
            energised. No installation or sign-up is required.
          </p>
        </div>

        {/* Steps */}
        <div className="px-5 py-4">
          <p className="mb-3 text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
            A simple way to begin
          </p>
          <ol className="space-y-2">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-3 dark:border-slate-700/60 dark:bg-slate-800/60"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm ring-1 ring-slate-100 dark:bg-slate-700 dark:text-blue-300 dark:ring-slate-600">
                  <step.icon aria-hidden="true" className="size-4" />
                </span>
                <div>
                  <h3 className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {index + 1}. {step.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.desc}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              ElectraSim is a learning model, not a substitute for electrical design, inspection,
              testing, or work by a competent person.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="grid gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 sm:grid-cols-[auto_auto_1fr_auto] dark:border-slate-700/60 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => {
              useUiStore.getState().startTour('student');
            }}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60"
          >
            <Sparkles aria-hidden="true" className="size-3.5" />
            Take the tour
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              setTimeout(() => useUiStore.getState().setDocsOpen(true), 150);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <BookOpen aria-hidden="true" className="size-3.5" />
            Documentation
          </button>
          <button
            type="button"
            onClick={() => {
              close();
              setTimeout(() => useUiStore.getState().setTemplatesOpen(true), 150);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800"
          >
            <CircuitBoard aria-hidden="true" className="size-3.5" />
            Open Guided Circuits
          </button>
          <button
            type="button"
            onClick={close}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Continue to canvas
            <ArrowRight aria-hidden="true" className="size-3.5" />
          </button>
        </div>
      </div>
    </dialog>
  );
}
