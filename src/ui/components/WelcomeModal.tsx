/**
 * WelcomeModal — first-visit introduction modal.
 *
 * Shown automatically on first load (localStorage flag not set).
 * Can be re-opened via right-click context menu → "What is ElectraSim?".
 * Closing it sets `electrasim:welcomed` in localStorage so it won't
 * auto-show again.
 *
 * Redesigned from scratch to cover every surface shipped to date:
 * Guided Circuits, the component library, simulation, Challenge Mode,
 * the Diagnosis Lab, the Fault Lab, validation & diagnostics, docs,
 * the command palette and keyboard shortcuts.
 */

import {
  ArrowRight,
  BookOpen,
  Cable,
  CircuitBoard,
  Command,
  FlaskConical,
  Keyboard,
  Layers,
  type LucideIcon,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Target,
  X,
  Zap,
} from 'lucide-react';
import { useRef } from 'react';
import { isMacPlatform, modShortcut } from '../../lib/platform';
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

interface Feature {
  icon: LucideIcon;
  label: string;
  desc: string;
  badge?: string;
  open: () => void;
}

export function WelcomeModal() {
  const open = useUiStore((s) => s.welcomeOpen);
  const close = () => useUiStore.getState().setWelcomeOpen(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  useDialogFocus(open, close, panelRef);

  if (!open) return null;

  // Deferred surfaces mount lazily — close first, then open the target a
  // tick later so the Suspense boundary can resolve underneath.
  const closeThen = (fn: () => void) => {
    close();
    setTimeout(fn, 150);
  };

  const features: Feature[] = [
    {
      icon: BookOpen,
      label: 'Guided Circuits',
      desc: 'Step-by-step circuits with notes and checklists.',
      badge: 'Start here',
      open: () => closeThen(() => useUiStore.getState().setTemplatesOpen(true)),
    },
    {
      icon: Layers,
      label: 'Component Library',
      desc: '120+ parts from breakers to EV chargers, grouped by category.',
      open: () => closeThen(() => useUiStore.getState().setPaletteOpen(true)),
    },
    {
      icon: Target,
      label: 'Challenge Mode',
      desc: 'Build circuits to a spec — scored, timed and fault-checked.',
      open: () => closeThen(() => useUiStore.getState().openChallengeMode()),
    },
    {
      icon: Stethoscope,
      label: 'Diagnosis Lab',
      desc: 'A fault is planted on a generated circuit. Find and clear it.',
      open: () => closeThen(() => useUiStore.getState().setDiagnosisOpen(true)),
    },
    {
      icon: FlaskConical,
      label: 'Fault Lab',
      desc: 'Inject shorts and opens by hand, with canvas spark effects (Pro).',
      open: () =>
        closeThen(() => {
          const s = useUiStore.getState();
          s.setFaultLabOpen(true);
          s.addLog('Fault Lab opened in the Inspector — select a component, then inject.', 'info');
        }),
    },
    {
      icon: ShieldCheck,
      label: 'Validation & Diagnostics',
      desc: 'BS 7671 compliance checks, heat maps and voltage-drop overlays.',
      open: () => closeThen(() => useUiStore.getState().runCircuitValidation()),
    },
  ];

  const mac = isMacPlatform();

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
        className="relative max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/80 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/10 outline-none animate-dialog-fade-in dark:border-slate-700/80 dark:bg-slate-900 dark:ring-slate-700/50"
      >
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-5 text-white">
          {/* soft circuit-board glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full bg-sky-400/20 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 left-1/3 size-44 rounded-full bg-indigo-400/20 blur-3xl"
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close welcome"
            className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
          <div className="relative flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-white/15 shadow-sm ring-1 ring-white/20">
              <Zap aria-hidden="true" className="size-6" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                Welcome to ElectraSim
                <span className="inline-flex items-center rounded-full bg-white/15 px-2 py-0.5 align-middle font-mono text-[10px] font-semibold tracking-wide text-blue-50 ring-1 ring-white/25">
                  v{APP_VERSION}
                </span>
              </h2>
              <div className="text-sm text-blue-100">
                The interactive electrical wiring workbench
              </div>
            </div>
          </div>
          <p className="relative mt-3 max-w-xl text-sm leading-relaxed text-blue-50">
            Learn how a circuit is connected, test component states, and trace the paths that become
            energised. No installation or sign-up is required.
          </p>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {/* Quick start */}
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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

          {/* Feature grid — everything the workbench ships with */}
          <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Explore the workbench
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {features.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={f.open}
                className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition hover:-translate-y-px hover:border-blue-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-blue-600"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100 transition group-hover:bg-blue-600 group-hover:text-white dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-900/60 dark:group-hover:bg-blue-600 dark:group-hover:text-white">
                  <f.icon aria-hidden="true" className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {f.label}
                    </span>
                    {f.badge && (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                        {f.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    {f.desc}
                  </span>
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="mt-1 size-3.5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500 dark:text-slate-600"
                />
              </button>
            ))}
          </div>

          {/* Power-user strip */}
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => closeThen(() => useUiStore.getState().toggleCommandPalette())}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-blue-600"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-white dark:bg-slate-950">
                {mac ? <Command className="size-4" /> : <Search className="size-4" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">
                  Command palette
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Search every action and component
                </span>
              </span>
              <kbd className="shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                {modShortcut('K')}
              </kbd>
            </button>
            <button
              type="button"
              onClick={() => closeThen(() => useUiStore.getState().setShortcutsOpen(true))}
              className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-left transition hover:border-blue-300 hover:bg-white dark:border-slate-700 dark:bg-slate-800/70 dark:hover:border-blue-600"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-indigo-600 text-white">
                <Keyboard className="size-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">
                  Keyboard shortcuts
                </span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  V, W, R, F and friends — press ? anytime
                </span>
              </span>
              <kbd className="shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300">
                ?
              </kbd>
            </button>
          </div>

          {/* Safety note */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-200">
            <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <p>
              ElectraSim is a learning model, not a substitute for electrical design, inspection,
              testing, or work by a competent person.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-5 py-3 dark:border-slate-700/60 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => {
              close();
              useUiStore.getState().startTour('student');
            }}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-900/60"
          >
            <Sparkles aria-hidden="true" className="size-3.5" />
            Take the tour
          </button>
          <button
            type="button"
            onClick={() => closeThen(() => useUiStore.getState().setDocsOpen(true))}
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <BookOpen aria-hidden="true" className="size-3.5" />
            Documentation
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => closeThen(() => useUiStore.getState().setTemplatesOpen(true))}
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
