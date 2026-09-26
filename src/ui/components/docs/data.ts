import { COMPONENT_DEFS, type ComponentDef } from '@electrasim/domain';
import {
  BookOpen,
  Cpu,
  Globe,
  GraduationCap,
  Keyboard,
  Lightbulb,
  type LucideIcon,
  MousePointerClick,
  Shield,
  Zap,
} from 'lucide-react';

export const SHORTCUTS: Array<[key: string, action: string]> = [
  ['Space', 'Toggle simulation (Run / Pause)'],
  ['V', 'Select tool — pick and move components (visual hint in Challenge Mode)'],
  ['W', 'Wire tool — click two ports to connect them'],
  ['R', 'Reroute — cycle TO → FROM → cancel on selected wire'],
  ['F', 'Zoom-to-fit — frame all components in the viewport'],
  ['Shift+F', 'Fault Lab — toggle fault mode; the Inspector snaps to its tab (Pro only)'],
  ['Ctrl+E', 'Open Import / Export modal'],
  ['Ctrl+S', 'Quick-export circuit as JSON'],
  ['Ctrl+C', 'Copy selected component(s) to the in-memory clipboard'],
  ['Ctrl+V', 'Paste clipboard — each paste offsets by 24 px so copies stack visibly'],
  ['Delete', 'Delete selected component(s) or wire — multi-select deletes all at once'],
  ['Escape', 'Dismiss challenge focus / cancel placement / close modal / deselect'],
  ['Ctrl+Z', 'Undo'],
  ['Ctrl+Shift+Z', 'Redo (or Ctrl+Y)'],
  ['Ctrl+K', 'Open the command palette'],
  ['P', 'Challenge Mode — pause or resume the active challenge'],
  ['C', 'Challenge Mode — check progress'],
  ['H', 'Challenge Mode — reveal the next text hint'],
  ['?', 'Open the keyboard shortcuts overlay'],
];

export const DOCS_TOC: Array<{ id: string; label: string; icon: LucideIcon }> = [
  { id: 'getting-started', label: 'Getting Started', icon: MousePointerClick },
  { id: 'guided-circuits', label: 'Guided Circuits', icon: BookOpen },
  { id: 'components', label: 'Components Reference', icon: Cpu },
  { id: 'wiring', label: 'Wiring Guide', icon: Zap },
  { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'simulation', label: 'Simulation & Faults', icon: Shield },
  { id: 'learning-modes', label: 'Learning Modes', icon: GraduationCap },
  { id: 'tips', label: 'Tips & Tricks', icon: Lightbulb },
  { id: 'on-the-website', label: 'On the Website', icon: Globe },
];

/**
 * Deep links into the marketing site. The in-app docs stay quick-reference;
 * the website hosts the long-form versions.
 */
export const SITE_DESTINATIONS: Array<{
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}> = [
  {
    label: 'The complete guide',
    description: 'Step-by-step circuit walkthroughs, diagrams and the recommended workflow.',
    href: 'https://electrasim.com/guide/',
    icon: BookOpen,
  },
  {
    label: 'Voltage drop calculator',
    description: 'Work out conductor voltage drop against the active standard, on the web.',
    href: 'https://electrasim.com/tools/voltage-drop-calculator/',
    icon: Shield,
  },
  {
    label: 'Explore — coming in v2.1',
    description:
      'The immersive 3D historical electrical laboratory is being rebuilt and returns in v2.1.',
    href: 'https://electrasim.com/explore/',
    icon: Lightbulb,
  },
  {
    label: 'Blog & changelog',
    description: 'Feature announcements, teaching notes and version history.',
    href: 'https://electrasim.com/blog/',
    icon: Globe,
  },
  {
    label: 'About & contact',
    description: 'The project, its roadmap, and how to report bugs or feedback.',
    href: 'https://electrasim.com/about/',
    icon: Zap,
  },
];

/**
 * Which in-app guided circuit matches which step-by-step walkthrough on the
 * website's guide page (anchored by `#circuit-N`).
 */
export const GUIDE_WALKTHROUGH_ANCHORS: Record<string, string> = {
  'simple-lamp': '#circuit-1',
  'two-way-staircase-light': '#circuit-3',
  'rcd-earth-fault-demo': '#circuit-4',
  'pro-staircase-timer': '#circuit-5',
  'push-button-doorbell': '#circuit-7',
  'pro-spd-consumer-unit': '#circuit-8',
};

/**
 * The v2 learning modes (plan §49: "Document — seed system, difficulty levels,
 * Diagnosis Lab, Ohmageddon Mode, IndexedDB statistics, deterministic
 * generation").
 *
 * Held as data next to the other docs content so the section stays declarative
 * and the copy can be reviewed without reading JSX.
 */
export const LEARNING_MODES: Array<{
  name: string;
  tagline: string;
  body: string;
}> = [
  {
    name: 'Guided Circuits',
    tagline: 'Follow this',
    body: 'Twenty ready-made circuits load straight onto the canvas with a checklist: trace the wiring, run the simulation, then review the result. Starter circuits cover lamps, one-way and two-way switching, parallel lamps, dimmable lighting, RCD/RCBO protection, contactors, timers and a momentary doorbell; the ten Pro guides cover three-phase motor control, EV charging, solar with battery storage, underfloor heating, staircase timers, PIR floodlights, cooker supplies, surge-protected consumer units, generator backup and AFDD bedrooms. Guided circuits are walkthroughs, not challenges — the checklist tracks what you have done and there is no score or timer.',
  },
  {
    name: 'Challenge Mode',
    tagline: 'Build this',
    body: 'Challenge Mode gives you a goal and validates the result — it does not hand you a step-by-step construction recipe. Build a protected lamp, wire a momentary doorbell, protect a socket with an RCBO. Each challenge presents a clear mission and high-level outcome requirements (e.g. "Protected by an MCB", "Complete return path"); how you arrange and wire the components is up to you. Check Circuit gives plain-English, non-spoiling feedback on which outcome is not yet met, and three progressive hints reveal more only if you want them. Extra components are warned about, never deleted. Your normal circuit is snapshotted the moment a challenge starts and restored exactly when you leave — challenges can never destroy it.',
  },
  {
    name: 'Diagnosis Lab',
    tagline: 'Fix this',
    body: 'A working installation develops one intentional fault. You are told only that something is wrong — never what or where. Investigate by running the simulation, operating switches and tracing wires, then name both the fault type and its location. The exercise is complete only once the installation actually recovers, not merely when you guess the right name.',
  },
  {
    name: 'Ohmageddon Mode',
    tagline: 'Survive this',
    body: 'Off by default; enable it in Settings. It adds deliberately harder scenarios — decoy components, faults far from the visible symptom, two faults at once, fewer hints and an optional timer. It never makes the simulation dishonest: every symptom you see is what the circuit genuinely does.',
  },
];

/** Difficulty profiles, shared by every learning mode (plan §9, §49). */
export const LEARNING_DIFFICULTIES: Array<[name: string, description: string]> = [
  ['Beginner', 'Few components, simple topology, one obvious load, generous hints.'],
  ['Intermediate', 'More components and branches; the fault may sit away from the symptom.'],
  ['Advanced', 'Larger topology, complex switching, subtle symptoms, minimal hints.'],
];

export const CATEGORY_ORDER = [
  'supply',
  'protection',
  'distribution',
  'switch',
  'control',
  'relay',
  'contactor',
  'sensor',
  'thermostat',
  'timer',
  'transformer',
  'lighting',
  'fan',
  'load',
  'motor',
  'heater',
  'sounder',
  'socket',
  'junction',
];

export interface ComponentGroup {
  category: string;
  items: Array<{ type: string; definition: ComponentDef }>;
}

export function buildComponentGroups(): ComponentGroup[] {
  const groups = new Map<string, ComponentGroup>();
  for (const [type, definition] of Object.entries(COMPONENT_DEFS)) {
    const group = groups.get(definition.category) ?? {
      category: definition.category,
      items: [],
    };
    group.items.push({ type, definition });
    groups.set(definition.category, group);
  }
  return CATEGORY_ORDER.flatMap((category) => {
    const group = groups.get(category);
    return group ? [group] : [];
  });
}

export const TIPS = [
  'Take your work with you: Settings → Backup downloads one JSON file with all your preferences and your circuit; restore it on any computer from the same tab. Every imported file is validated before anything is applied.',
  'Use the search bar in the palette to quickly find components by name.',
  'Click the MCB breaker lever to access Settings, Import/Export, and bulk actions from one place.',
  'Ctrl+Z undoes almost everything — including wire creation, component placement, and deletion.',
  'Press F to zoom-to-fit — frames every component in the viewport with smart padding.',
  'Smart wiring (Settings → Wiring style → Smart) routes new wires around components automatically and re-routes them as you drag.',
  'Switch between Light, Dark, and System color schemes in Settings — the canvas re-themes instantly.',
  'Use "PDF / Print" in Import / Export to generate a printable circuit sheet with a title block.',
  'Share your circuit via URL — the entire state is compressed into the link, no account needed.',
  'Use the confirm-delete setting (in Settings) to prevent accidental deletions.',
  'On older laptops or for big circuits, enable Settings → Simulation visuals → Reduce visual effects to keep frame rates steady. It auto-enables above 50 components.',
  'Dark mode: open Settings → Display → Color scheme and pick Dark or System. Every panel — toolbar, palette, inspector, log, all modals — switches instantly.',
  'Multi-select: drag an empty area to rubber-band select components, or Shift-click to add/remove individual ones. Drag any selected component to move the whole group.',
  'Copy/paste: select one or more components, press Ctrl+C, then Ctrl+V. Each paste lands 24 px offset from the last so copies are visible. The clipboard is in-memory — it clears on page reload.',
  'Alignment toolbar: select 2+ components (drag-rect or Shift-click), then use the toolbar that appears at the top of the canvas to align or distribute them. Each action is one undo step.',
  'Gridless mode: go to Settings → Display and turn off “Show dot grid” for a clean, distraction-free canvas.',
  'Colour presets: Settings → Display → Canvas colour preset. Choose High Contrast or Colour-blind (deuteranopia) to replace the default red/green/blue wire palette with more accessible colours.',
  'Mini-map: the thumbnail in the bottom-right shows your whole circuit. Click anywhere on it to jump the canvas view to that area. Toggle it in Settings → Display.',
  'Custom wiring mode (Settings → Editing → Custom wiring mode): click a port to start a polyline, click empty canvas to add corners, then click the destination port to commit — each wire is one undo entry. Press Esc any time to cancel without leaving a partial wire.',
  'MCB: ElectraSim treats the breaker as a manually opened or closed Live path. Pro mode provides an educational overload estimate, not standards-compliant fault-current thresholds or trip timing.',
  'RCD / RCCB: connect both Live and Neutral in and out. The simulated control opens or closes both rails together, but does not measure leakage current, apply an mA threshold, or trip automatically.',
  'RCBO: use the separate Live and Neutral inputs and outputs for one circuit. Pro mode provides an educational overload estimate, but leakage and standards-compliant trip thresholds or timing are not modelled.',
  'Push Button: press and hold the centre control to close its normally-open contact, then release it to open the circuit. Normally-closed and latching contact modes are not modelled.',
  'Contactor: ElectraSim models a manually toggled two-pole power contact. It does not provide coil terminals, coil-control logic, interlocks, or auxiliary contacts.',
  'Timer Switch: place it in series on a Live line to simulate a timed or scheduled circuit. Toggle it manually during simulation to test ON/OFF states.',
  'Dimmer Switch: works like Fan Dimmer but is intended for lighting circuits. Connect it in the Live path between the supply and a bulb.',
  'Distribution Board: has two Live bus ports (L-in) and five output rails (L1–L3, N1–N2). Wire individual MCBs or loads to the output rails for a realistic consumer-unit layout.',
  'Bell / Buzzer: treated as a load — it energises when both Live and Neutral paths are complete. Use it with a push button for a doorbell circuit.',
];

export const FAULTS: Array<[name: string, description: string]> = [
  ['Short Circuit', 'Live and Neutral share a zero-impedance path.'],
  ['Reverse Polarity', 'A component has its Live and Neutral connections swapped.'],
  ['Earth Fault', 'A component is missing its required protective-earth connection.'],
  ['Open Circuit', 'An injected wire break interrupts the current path.'],
];
