import {
  BookOpen,
  Cpu,
  Globe,
  GraduationCap,
  Keyboard,
  Lightbulb,
  MousePointerClick,
  Shield,
  Zap,
} from 'lucide-react';
import { COMPONENT_DEFS } from '../../../domain';
import { GUIDED_CIRCUIT_TEMPLATES, type GuidedCircuitTemplate } from '../../../domain/templates';
import { loadGuidedCircuitIntoEditor } from '../../../lib/guidedCircuitLoader';
import { remapShortcutLabel } from '../../../lib/platform';
import { useUiStore } from '../../../store';
import { APP_VERSION } from '../../../version';
import { ComponentCard, ExternalLink, SectionHeading, Step, WireSeparator } from './DocsPrimitives';
import {
  CATEGORY_ORDER,
  type ComponentGroup,
  FAULTS,
  GUIDE_WALKTHROUGH_ANCHORS,
  LEARNING_DIFFICULTIES,
  LEARNING_MODES,
  SHORTCUTS,
  SITE_DESTINATIONS,
  TIPS,
} from './data';

export function DocsContent({ groups }: { groups: ComponentGroup[] }) {
  return (
    <main className="min-w-0 flex-1">
      <div className="mb-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          ElectraSim Documentation
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          Quick reference for building and simulating electrical circuits in the browser. Each
          section links to the full guide on the website where you can read more.
        </p>
      </div>

      <WireSeparator />
      <GettingStartedSection />
      <WireSeparator />
      <GuidedCircuitsSection />
      <WireSeparator />
      <ComponentReferenceSection groups={groups} />
      <WireSeparator />
      <WiringSection />
      <WireSeparator />
      <ShortcutsSection />
      <WireSeparator />
      <SimulationSection />
      <WireSeparator />
      <LearningModesSection />
      <WireSeparator />
      <TipsSection />
      <WireSeparator />
      <OnTheWebsiteSection />

      <div className="mt-10 flex items-center gap-3">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
        <div className="size-2 rounded-full border-2 border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900" />
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-700" />
      </div>
      <div className="mt-4 pb-8 text-center text-[10px] text-slate-400 dark:text-slate-500">
        ElectraSim v{APP_VERSION} · {Object.keys(COMPONENT_DEFS).length} components · full guide at
        electrasim.com
      </div>
    </main>
  );
}

function GettingStartedSection() {
  const steps = [
    [
      'Pick a component',
      'Open the palette (left panel) and click any component — switches, bulbs, sockets, and more.',
    ],
    [
      'Place it on the canvas',
      'Click anywhere on the grid to drop the component. Press Escape to cancel.',
    ],
    [
      'Wire them together',
      'Press W for wire mode, then click a port on one component and click a matching port on another. Ports are colour-coded: red = Live, blue = Neutral, green = Earth.',
    ],
    [
      'Watch it come alive',
      'Start the simulation with the Run Simulation button. Double-click or double-tap switches on the canvas; on desktop, you can also use the Inspector. Energised wires and loads update in real time.',
    ],
    [
      'Save & share',
      'Press Ctrl+E to export as JSON, SVG, or PNG. Copy a shareable URL link — no backend required.',
    ],
  ] as const;

  return (
    <section id="getting-started">
      <SectionHeading icon={MousePointerClick} color="bg-blue-600">
        Getting Started
      </SectionHeading>
      <div className="space-y-3">
        {steps.map(([title, desc], index) => (
          <Step key={title} n={index + 1} title={title} desc={remapShortcutLabel(desc)} />
        ))}
      </div>
      <div className="mt-3">
        <ExternalLink href="https://electrasim.com/guide/">
          Full step-by-step guide on electrasim.com
        </ExternalLink>
      </div>
    </section>
  );
}

/**
 * Guided Circuits — the in-app guides and their long-form walkthroughs on the
 * website. Every row loads the guide straight into the editor and links to
 * the matching walkthrough on the site where one exists.
 */
function GuidedCircuitsSection() {
  const basic = GUIDED_CIRCUIT_TEMPLATES.filter((template) => template.tier === 'basic');
  const pro = GUIDED_CIRCUIT_TEMPLATES.filter((template) => template.tier === 'pro');

  const guideRows = (templates: GuidedCircuitTemplate[]) =>
    templates.map((template) => {
      const anchor = GUIDE_WALKTHROUGH_ANCHORS[template.id];
      const siteHref = anchor
        ? `https://electrasim.com/guide/${anchor}`
        : 'https://electrasim.com/guide/#templates-h';
      return (
        <div
          key={template.id}
          className="flex items-start gap-3 rounded-xl border border-slate-100 bg-white/60 p-3 transition hover:border-blue-200 dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-blue-800"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                {template.title}
              </span>
              <span
                className={[
                  'rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                  template.difficulty === 'Beginner'
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : template.difficulty === 'Intermediate'
                      ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300',
                ].join(' ')}
              >
                {template.difficulty}
              </span>
              {template.tier === 'pro' && (
                <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  Pro
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
              {template.summary}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  loadGuidedCircuitIntoEditor(template);
                  useUiStore.getState().setDocsOpen(false);
                }}
                className="rounded-lg bg-blue-600 px-2.5 py-1 text-[10px] font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                Open guide
              </button>
              <a
                href={siteHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold text-blue-600 underline-offset-2 transition hover:underline dark:text-blue-300"
              >
                {anchor ? 'Site walkthrough ↗' : 'All guides on the site ↗'}
              </a>
            </div>
          </div>
        </div>
      );
    });

  return (
    <section id="guided-circuits">
      <SectionHeading icon={BookOpen} color="bg-blue-600">
        Guided Circuits
      </SectionHeading>
      <p className="mb-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        {GUIDED_CIRCUIT_TEMPLATES.length} ready-made circuits load straight onto the canvas with a
        checklist. Where a guide matches a walkthrough on the website, the link takes you to the
        long-form version with diagrams.
      </p>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
          Getting started
        </span>
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
          {basic.length}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
      </div>
      <div className="mb-5 space-y-2">{guideRows(basic)}</div>
      <div className="mb-4 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-500 dark:text-purple-400">
          Pro toolbox
        </span>
        <span className="rounded-full bg-purple-100 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:bg-purple-950/60 dark:text-purple-300">
          {pro.length}
        </span>
        <div className="h-px flex-1 bg-gradient-to-r from-purple-200 to-transparent dark:from-purple-900" />
      </div>
      <div className="space-y-2">{guideRows(pro)}</div>
    </section>
  );
}

function ComponentReferenceSection({ groups }: { groups: ComponentGroup[] }) {
  return (
    <section id="components">
      <SectionHeading icon={Cpu} color="bg-indigo-600">
        Components Reference
      </SectionHeading>
      <p className="mb-4 text-xs text-slate-600 dark:text-slate-400">
        ElectraSim ships with <strong>{Object.keys(COMPONENT_DEFS).length}</strong> components
        across {CATEGORY_ORDER.length} categories. Each shows its ports, type, and a short
        description.
      </p>
      {groups.map((group) => (
        <div key={group.category} className="mb-5">
          <div className="mb-2 flex items-center gap-2">
            <div className="size-1.5 rounded-full bg-indigo-400" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {group.category}
            </span>
            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-700" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {group.items.map((item) => (
              <ComponentCard key={item.type} definition={item.definition} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function WiringSection() {
  const portTypes = [
    {
      label: 'Live',
      color: 'bg-red-500',
      text: 'text-red-700 dark:text-red-300',
      bg: 'bg-red-50 dark:bg-red-950/50',
    },
    {
      label: 'Neutral',
      color: 'bg-blue-500',
      text: 'text-blue-700 dark:text-blue-300',
      bg: 'bg-blue-50 dark:bg-blue-950/50',
    },
    {
      label: 'Earth',
      color: 'bg-green-500',
      text: 'text-green-700 dark:text-green-300',
      bg: 'bg-green-50 dark:bg-green-950/50',
    },
  ];

  return (
    <section id="wiring">
      <SectionHeading icon={Zap} color="bg-amber-500">
        Wiring Guide
      </SectionHeading>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-100 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Port Compatibility
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Standard connections join ports of the <strong>same type</strong>: Live → Live, Neutral
            → Neutral, and Earth → Earth. A direct Live-terminal-to-Neutral-terminal connection is
            available only to demonstrate short-circuit detection; it is always an invalid circuit.
          </p>
          <div className="mt-3 flex gap-4">
            {portTypes.map((port) => (
              <div
                key={port.label}
                className={`flex items-center gap-2 rounded-full ${port.bg} px-3 py-1.5`}
              >
                <span className={`size-2.5 rounded-full ${port.color}`} />
                <span className={`text-[10px] font-semibold ${port.text}`}>{port.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Wiring Style (Smart vs Curved)
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            New wires use one of two styles, picked in <strong>Settings → Wiring style</strong>.
            Existing wires keep whatever style they had when saved.
          </p>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            <li>
              <strong className="text-slate-800 dark:text-slate-200">┗ Smart (default)</strong> — a
              right-angle path that automatically routes around components. It keeps diagrams tidy.
            </li>
            <li>
              <strong className="text-slate-800 dark:text-slate-200">∿ Curved</strong> — a smooth
              bezier curve between the two ports, retained for free-form layouts and older circuits.
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            Smart routing recomputes the path when you drag a component. Curved wires keep their
            stored shape.
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Wire Rerouting
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Select a wire and press{' '}
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[9px] dark:border-slate-600 dark:bg-slate-700">
              R
            </kbd>{' '}
            to reroute one endpoint. Press again to swap ends, or{' '}
            <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[9px] dark:border-slate-600 dark:bg-slate-700">
              Esc
            </kbd>{' '}
            to cancel.
          </p>
        </div>

        <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 py-10 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="text-center">
            <div className="mb-2 text-4xl">🔴 → 🔌 → 💡 → 🔵</div>
            <div className="text-[10px] text-blue-300 dark:text-blue-500">
              A complete circuit: Live → Switch → Bulb → Neutral
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3">
        <ExternalLink href="https://electrasim.com/guide/#circuit-walkthroughs">
          Eight step-by-step circuit walkthroughs on the website
        </ExternalLink>
      </div>
    </section>
  );
}

function ShortcutsSection() {
  return (
    <section id="shortcuts">
      <SectionHeading icon={Keyboard} color="bg-purple-600">
        Keyboard Shortcuts
      </SectionHeading>
      <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-700">
        <table className="w-full text-xs">
          <thead className="bg-slate-50/80 dark:bg-slate-800/80">
            <tr>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-200">
                Key
              </th>
              <th className="px-4 py-2.5 text-left font-semibold text-slate-700 dark:text-slate-200">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {SHORTCUTS.map(([rawKey, action]) => (
              <tr
                key={rawKey}
                className="transition hover:bg-slate-50/60 dark:hover:bg-slate-800/60"
              >
                <td className="px-4 py-2.5">
                  <kbd className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200">
                    {remapShortcutLabel(rawKey)}
                  </kbd>
                </td>
                <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SimulationSection() {
  return (
    <section id="simulation">
      <SectionHeading icon={Shield} color="bg-emerald-600">
        Simulation & Faults
      </SectionHeading>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-100 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            How the Simulation Works
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            ElectraSim uses a <strong>path-tracing engine</strong> that runs on every state change.
            Starting from every supply terminal, it walks the circuit graph through wires and
            pass-through components. A load is energised when both a Live path and a Neutral return
            reach it.
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            Simulation Limits
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-amber-800 dark:text-amber-200">
            Results show logical connectivity, manual control states, and teaching fault
            annotations. They are not electrical measurements. ElectraSim does not calculate
            voltage, current, impedance, load demand, cable sizing, protection ratings, leakage
            current, trip thresholds, or trip timing. MCB, RCD, RCBO, and contactor states are
            operated manually; fault annotations do not trip protection automatically.
          </p>
        </div>
        <div className="rounded-xl border border-slate-100 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Fault Detection
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            The engine detects or simulates these conditions and surfaces them in the log panel:
          </p>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {FAULTS.map(([name, description]) => (
              <li key={name} className="flex gap-2">
                <span className="mt-0.5 size-1.5 flex-shrink-0 rounded-full bg-red-400" />
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">{name}</strong> —{' '}
                  {description}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-3">
        <ExternalLink href="https://electrasim.com/guide/#latest-features">
          Fault simulation and the full workflow on the website
        </ExternalLink>
      </div>
    </section>
  );
}

/**
 * Learning Modes (plan §49).
 *
 * Documents the three generated exercises and the two ideas that underpin all
 * of them — deterministic seeds and locally-stored statistics — because both
 * are user-visible: the seed is copyable, and the stats persist across reloads.
 */
function LearningModesSection() {
  return (
    <section id="learning-modes">
      <SectionHeading icon={GraduationCap} color="bg-indigo-600">
        Learning Modes
      </SectionHeading>
      <div className="space-y-3">
        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Beyond the free-form canvas, ElectraSim offers structured learning. Challenge Mode gives
          you hand-authored build tasks; the Diagnosis Lab generates faults for you to find. Both
          use the same circuit model and simulator as the rest of the app, so every circuit they
          involve is an ordinary ElectraSim circuit — you can inspect, rewire and export it exactly
          as usual.
        </p>

        {LEARNING_MODES.map((mode) => (
          <div
            key={mode.name}
            className="rounded-xl border border-slate-100 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/60"
          >
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {mode.name}{' '}
              <span className="ml-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                {mode.tagline}
              </span>
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {mode.body}
            </p>
          </div>
        ))}

        <div className="rounded-xl border border-slate-100 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Difficulty levels
          </h3>
          <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
            {LEARNING_DIFFICULTIES.map(([name, description]) => (
              <li key={name} className="flex gap-2">
                <span className="mt-0.5 size-1.5 flex-shrink-0 rounded-full bg-indigo-400" />
                <span>
                  <strong className="text-slate-800 dark:text-slate-200">{name}</strong> —{' '}
                  {description}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Seeds &amp; replay
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Every exercise is generated from a <strong>seed</strong> — a number shown next to its id
            (for example{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-700">ES-DIAG-482917</code>).
            Generation is deterministic, so the same seed, difficulty and app version always rebuild
            the identical circuit and fault. Use <strong>Copy seed</strong> in the Diagnosis Lab
            header to share an exercise with a tutor or attach it to a bug report, and paste one
            into <strong>Replay a seed</strong> to work through exactly the same problem. Nothing is
            uploaded — the seed is all that travels.
          </p>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white/60 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            Progress &amp; privacy
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            Attempts, hints used, completion times and accuracy are stored locally in your browser
            (IndexedDB), alongside the exercise you currently have open — so a reload drops you back
            where you were. None of it leaves your device, and there is no account or backend.
          </p>
        </div>
      </div>
      <div className="mt-3">
        <ExternalLink href="https://electrasim.com/guide/#templates-h">
          Every built-in guided circuit, listed on the website
        </ExternalLink>
      </div>
    </section>
  );
}

function TipsSection() {
  return (
    <section id="tips">
      <SectionHeading icon={Lightbulb} color="bg-amber-500">
        Tips & Tricks
      </SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {TIPS.map((tip) => (
          <div
            key={tip}
            className="flex gap-2 rounded-xl border border-slate-100 bg-white/60 p-3 dark:border-slate-700 dark:bg-slate-800/60"
          >
            <span className="mt-0.5 text-amber-400">💡</span>
            <span className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {remapShortcutLabel(tip)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * On the Website — the bridge to the long-form docs on the Astro site. The
 * in-app documentation is deliberately quick-reference; anything deeper links
 * out here (plus per-section links above).
 */
function OnTheWebsiteSection() {
  return (
    <section id="on-the-website">
      <SectionHeading icon={Globe} color="bg-cyan-600">
        On the Website
      </SectionHeading>
      <p className="mb-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        These pages are the long-form half of the documentation — step-by-step guides, the
        voltage-drop calculator, the 3D history explorer and project news. Everything opens on
        electrasim.com in a new tab.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SITE_DESTINATIONS.map((destination) => (
          <a
            key={destination.href}
            href={destination.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-start gap-3 rounded-xl border border-slate-100 bg-white/60 p-3 transition hover:-translate-y-px hover:border-cyan-200 hover:shadow-sm dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-cyan-800"
          >
            <span className="grid size-8 flex-shrink-0 place-items-center rounded-lg bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100 transition group-hover:bg-cyan-600 group-hover:text-white dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-900/60">
              <destination.icon className="size-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-800 dark:text-slate-100">
                {destination.label}
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {destination.description}
              </span>
            </span>
            <span className="text-slate-300 transition group-hover:text-cyan-500 dark:text-slate-600">
              ↗
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
