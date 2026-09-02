/**
 * Interactive tutorial — step scripts for the Student and Pro tours.
 *
 * Pure data + pure predicates so the whole flow is unit-testable without a
 * DOM. The overlay engine (`TourOverlay.tsx`) resolves `target` selectors,
 * spotlights the element, and for `kind: 'do'` steps advances only when
 * `advanceWhen` reports the user really performed the action.
 *
 * Design rules:
 *  - Steps never simulate clicks: the user does the real thing.
 *  - Any step whose target is missing (breakpoint, mode) is skipped, so the
 *    same script degrades gracefully on phones.
 *  - `skipIf` silently skips steps that are already satisfied (e.g. the
 *    palette is open by default on desktop).
 */

import type { TourId } from './storage';

export type { TourId } from './storage';
export {
  markTourDone,
  isTourDone,
  dismissTourOffer,
  isTourOfferDismissed,
  TOUR_DONE_KEY,
  TOUR_OFFER_DISMISSED_KEY,
} from './storage';

/** Cheap cross-store snapshot rebuilt on every store change / poll tick. */
export interface TourSnapshot {
  appMode: 'basic' | 'pro';
  regulationStandard: string;
  plugSystem: string;
  diagnosticOverlayMode: string;
  paletteOpen: boolean;
  faultLabOpen: boolean;
  templatesOpen: boolean;
  simRunning: boolean;
  componentCount: number;
  wireCount: number;
  /** Reference identity changes on every validation run. */
  validationReport: unknown;
  /** True while the standard-selector popover is present in the DOM. */
  standardPopoverOpen: boolean;
  /** Component type currently armed for placement (null when idle). */
  placingType: string | null;
  /** Count of placed components per type — lets steps react to the actual
   *  circuit (e.g. spotlight the Neutral tile only after Live is placed). */
  componentTypeCounts: Record<string, number>;
}

export interface TourStep {
  id: string;
  /** CSS selector of the element to spotlight; null = centred card. */
  target: string | null;
  /** Dynamic spotlight: when provided and returning a selector, it overrides
   *  `target` (e.g. move the spotlight onto the canvas once the user has
   *  selected a palette tile, so the dim layer never blocks the next action).
   */
  targetWhen?: (snap: TourSnapshot) => string | null;
  title: string;
  body: string;
  kind: 'look' | 'do';
  /** Short imperative hint shown on `do` steps while waiting. */
  action?: string;
  /** `do` steps: return true when the user has performed the action. */
  advanceWhen?: (snap: TourSnapshot, entry: TourSnapshot) => boolean;
  /** Skip the step entirely when already satisfied / not applicable. */
  skipIf?: (snap: TourSnapshot) => boolean;
}

/* ── Tour A — Student: “Your first circuit” ──────────────────────────────── */

const STUDENT_STEPS: TourStep[] = [
  {
    id: 'welcome',
    target: null,
    kind: 'look',
    title: 'Welcome to the interactive tour',
    body: 'In about two minutes you will build a working circuit from scratch: place a bulb, give it power, wire it and switch it on. The canvas is empty for practice — your previous circuit is saved, and when the tour ends you can restore it or keep what you built.',
  },
  {
    id: 'mode-badge',
    target: '[data-tour="mode-toggle"]',
    kind: 'look',
    title: 'You are in Student mode',
    body: 'Student mode keeps the workbench simple: one rule set, domestic components, no compliance jargon. Pro mode unlocks standards, diagnostics and the Fault Lab — the Pro tour covers those.',
  },
  {
    id: 'standard-pill',
    target: '[data-standard-selector]',
    kind: 'look',
    title: 'Your region’s electrical rules',
    body: 'This shows the active standard (International 230 V by default; BS 7671, NEC and IEC presets are available). In Student mode it is locked so beginners learn against one consistent rule set — that is why clicking it does not open a menu here. Pro mode makes it fully selectable.',
  },
  {
    id: 'open-palette',
    target: '[data-tour="palette"]',
    targetWhen: (snap) =>
      snap.paletteOpen ? '[data-tour="palette"]' : '[data-tour="open-palette"]',
    kind: 'look',
    title: 'The Component Palette',
    body: 'Every part you can place — power supplies, circuit breakers, switches, and loads — lives in the palette on the left. You can browse categories or search for specific parts.',
  },
  {
    id: 'place-component',
    target: '[data-palette-type="bulb"]',
    targetWhen: (snap) => (snap.placingType === 'bulb' ? '[data-circuit-canvas]' : null),
    kind: 'do',
    title: 'Place a bulb',
    body: 'Click the LED Bulb tile, then click an empty spot on the canvas to drop it. It has two ports: L (Live) on the left, N (Neutral) on the right.',
    action: 'Place the bulb on the canvas',
    advanceWhen: (snap, entry) => snap.componentCount > entry.componentCount,
  },
  {
    id: 'place-live',
    target: '[data-palette-category="supply"] [data-palette-type="live-terminal"]',
    targetWhen: (snap) =>
      snap.placingType === 'live-terminal' || snap.componentTypeCounts['live-terminal']
        ? '[data-circuit-canvas]'
        : '[data-palette-category="supply"] [data-palette-type="live-terminal"]',
    kind: 'do',
    title: 'Give it power: the Live feed',
    body: 'A load only works with a feed and a return. From the Supply section, click Live Terminal (L), then click the canvas just left of the bulb to place it.',
    action: 'Place the Live terminal',
    advanceWhen: (snap, entry) => (snap.componentTypeCounts['live-terminal'] ?? 0) > 0,
  },
  {
    id: 'place-neutral',
    target: '[data-palette-category="supply"] [data-palette-type="neutral-terminal"]',
    targetWhen: (snap) =>
      snap.placingType === 'neutral-terminal'
        ? '[data-circuit-canvas]'
        : '[data-palette-category="supply"] [data-palette-type="neutral-terminal"]',
    kind: 'do',
    title: 'Give it power: the Neutral return',
    body: 'Now the return path: from the Supply section, click Neutral Terminal (N), then place it just right of the bulb. Like connects to like — L on the left, N on the right.',
    action: 'Place the Neutral terminal',
    advanceWhen: (snap, entry) =>
      (snap.componentTypeCounts['neutral-terminal'] ?? 0) > 0 &&
      (snap.componentTypeCounts['live-terminal'] ?? 0) > 0,
  },
  {
    id: 'wire-ports',
    target: '[data-circuit-canvas]',
    kind: 'do',
    title: 'Wire the circuit',
    body: 'Follow the arrows: click the Live terminal\u2019s L-out port, then the bulb\u2019s L port to draw the feed wire. Then draw the return from the bulb\u2019s N port to the Neutral terminal. Like connects to like: L\u2192L, N\u2192N.',
    action: 'Draw both wires (feed and return)',
    advanceWhen: (snap, entry) => snap.wireCount >= entry.wireCount + 2,
  },
  {
    id: 'run-sim',
    target: '[data-tour="run"]',
    kind: 'do',
    title: 'Switch it on',
    body: 'The engine walks the real Live / Neutral topology you just built. If both wires are in place, current flows and the bulb lights up.',
    action: 'Press Run Simulation',
    advanceWhen: (snap) => snap.simRunning,
  },
  {
    id: 'live-canvas',
    target: '[data-circuit-canvas]',
    kind: 'look',
    title: 'The circuit is live',
    body: 'Current animates along the energised wires and the bulb glows to its wattage. Try adding a Switch or an MCB into the Live path later — components react instantly while the simulation runs.',
  },
  {
    id: 'guided-circuits',
    target: '[data-tour="guided-circuits"]',
    kind: 'look',
    title: 'Guided Circuits — the best next step',
    body: 'Eighteen ready-made circuits with learning notes and checklists: staircase two-way switching, RCD earth-fault checks, a contactor motor starter, an RCBO-protected socket — and ten Pro guides covering three-phase, EV charging, solar, and more.',
  },
  {
    id: 'student-finish',
    target: null,
    kind: 'look',
    title: 'That is the core loop',
    body: 'Place → wire → run → break → fix. When you are ready for regional standards, compliance validation and diagnostics, take the Pro tour from the menu or press Ctrl+K and type “tour”.',
  },
];

/* ── Tour B — Pro: “Standards & compliance” ──────────────────────────────── */

const PRO_STEPS: TourStep[] = [
  {
    id: 'pro-mode-active',
    target: '[data-tour="mode-toggle"]',
    kind: 'look',
    title: 'You are in Pro mode',
    body: 'The tour switched the workbench to Pro Electrician Mode — this button proves it. (Your previous mode is restored when the tour ends.) Pro unlocks the standard selector, compliance validation, the diagnostics overlay, the Fault Lab and circuit analytics.',
  },
  {
    id: 'load-practice-circuit',
    target: '[data-tour="guided-circuits"]',
    kind: 'do',
    title: 'Load a practice circuit',
    body: 'Every tour starts on an empty canvas. Open Guided Circuits and load any guide — the Pro tools below need a real circuit to chew on, and you get a checklist to go with it.',
    action: 'Load any guided circuit',
    advanceWhen: (snap, entry) => snap.componentCount >= entry.componentCount + 4,
  },
  {
    id: 'open-standards',
    target: '[data-standard-selector]',
    kind: 'do',
    title: 'The regional selector is now live',
    body: 'The pill that was read-only in Student mode is now a menu. It owns two independent choices: your electrical rule set and your physical plug type.',
    action: 'Click to open it',
    advanceWhen: (snap) => snap.standardPopoverOpen,
  },
  {
    id: 'pick-standard',
    target: '[data-tour="standard-popover"]',
    kind: 'do',
    title: 'Pick your region’s standard',
    body: 'UK (BS 7671), US (NEC), EU (IEC 60364) or International 230 V. This changes the supply voltage, conductor colours on the canvas, RCD thresholds, voltage-drop ceilings and default MCB curves.',
    action: 'Select a standard or plug type',
    advanceWhen: (snap, entry) =>
      snap.regulationStandard !== entry.regulationStandard ||
      snap.plugSystem !== entry.plugSystem ||
      (entry.standardPopoverOpen && !snap.standardPopoverOpen),
  },
  {
    id: 'validate',
    target: '[data-tour="validate"]',
    kind: 'do',
    title: 'Validate against that rule set',
    body: 'The compliance checker inspects the circuit on the canvas against the standard you picked: voltage-drop percentages, RCD-on-sockets rules, breaker curve recommendations. Blocking issues stop a Pro run until resolved.',
    action: 'Press Validate',
    advanceWhen: (snap, entry) => snap.validationReport !== entry.validationReport,
  },
  {
    id: 'diagnostics',
    target: '[data-tour="diagnostics"]',
    kind: 'do',
    title: 'Diagnostics overlay',
    body: 'Cycle it: Off → Heat → Heat + V-drop. Cable runs are banded by thermal loading and voltage drop so weak points show up along the actual route.',
    action: 'Click to cycle the overlay',
    advanceWhen: (snap, entry) => snap.diagnosticOverlayMode !== entry.diagnosticOverlayMode,
  },
  {
    id: 'fault-lab',
    target: '[data-tour="fault-lab"]',
    kind: 'do',
    title: 'The Fault Lab',
    body: 'The full fault catalogue — open circuits, shorts, reverse polarity, earth faults, arc faults, jammed breakers — injected onto the selected component. It lives in its own Inspector tab: each fault plays a distinct animation on the canvas (severed conductors, fire, conductor swaps) with a persistent indicator. The right-click menu drives the same engine.',
    action: 'Open the Fault Lab',
    advanceWhen: (snap) => snap.faultLabOpen,
  },
  {
    id: 'inspector',
    target: '[data-tour="inspector"]',
    kind: 'look',
    title: 'Inspector: properties, analytics, Zs',
    body: 'Select any component to edit its ratings, view live simulation values, check earth-fault loop impedance (Zs) and read per-circuit analytics.',
  },
  {
    id: 'menu-export',
    target: '[data-tour="menu"]',
    kind: 'look',
    title: 'Hand your work over',
    body: 'The menu holds Import / Export: schema-versioned JSON, animated SVG, PNG, a printable report and a share URL that carries the whole circuit — no account, no backend.',
  },
  {
    id: 'pro-finish',
    target: null,
    kind: 'look',
    title: 'Pro workbench unlocked ✔',
    body: 'Standard picked, compliance validated, diagnostics on and the Fault Lab armed. Everything you set here persists on this device.',
  },
];

export const TOURS: Record<TourId, { label: string; steps: TourStep[] }> = {
  student: { label: 'Your first circuit', steps: STUDENT_STEPS },
  pro: { label: 'Standards & compliance', steps: PRO_STEPS },
};

export function getTourSteps(id: TourId): TourStep[] {
  return TOURS[id].steps;
}
