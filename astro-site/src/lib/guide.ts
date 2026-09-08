import type { GuideCircuit } from '../types/pages';

export function levelClass(level: string): string {
  if (level === 'Beginner') return 'level-beginner';
  if (level === 'Intermediate') return 'level-intermediate';
  return 'level-advanced';
}

/**
 * Guide helpers shared by the hub, the circuit walkthroughs and the anatomy
 * pages. Everything here is pure data + small string helpers so the pages stay
 * declarative and the same helpers can be unit-tested.
 */

/**
 * Stable URL slugs for the circuit walkthroughs. Keyed by circuit id (not
 * title) so renaming a title never silently changes a published URL.
 */
const CIRCUIT_SLUGS: Record<string, string> = {
  'circuit-1': 'single-lamp-switch',
  'circuit-2': 'two-bulb-parallel',
  'circuit-3': 'two-way-switching',
  'circuit-4': 'rcd-socket-circuit',
  'circuit-5': 'timed-outdoor-lighting',
  'circuit-6': 'dimmable-lighting',
  'circuit-7': 'doorbell-circuit',
  'circuit-8': 'consumer-unit-panel',
};

export function circuitSlug(circuit: Pick<GuideCircuit, 'id' | 'title'>): string {
  return (
    CIRCUIT_SLUGS[circuit.id] ??
    circuit.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  );
}

/**
 * Maps a component name as written in a circuit's `components[]` list to the
 * anatomy page that explains it. This is what turns a circuit walkthrough into
 * a set of links (the circuit → anatomy half of the cross-link mesh).
 */
const COMPONENT_ANATOMY_RULES: { slug: string; match: RegExp }[] = [
  { slug: 'mcb', match: /mcb/i },
  { slug: 'rcd', match: /rcd/i },
  { slug: 'bulb', match: /bulb/i },
  { slug: 'socket', match: /socket/i },
];

/** Anatomies that explain at least one of a circuit's components. */
export function anatomiesForCircuit(circuit: Pick<GuideCircuit, 'components'>) {
  return COMPONENT_ANATOMY_RULES.filter((rule) =>
    circuit.components.some((component) => rule.match.test(component)),
  );
}

/** Circuits that use a given anatomy (the anatomy → circuit half of the mesh). */
export function circuitsUsingAnatomy(circuits: GuideCircuit[], slug: string): GuideCircuit[] {
  const rule = COMPONENT_ANATOMY_RULES.find((r) => r.slug === slug);
  if (!rule) return [];
  return circuits.filter((circuit) => circuit.components.some((c) => rule.match.test(c)));
}

/**
 * SVG schematics, keyed by circuit id.
 *
 * Hand-authored IEC-style line diagrams drawn on a light frame so the
 * conductor colours can follow real wiring practice (live red, neutral black,
 * strappers brown) — black is unreadable on the dark diagram box used by the
 * ASCII schematics. The amber dashed overlay animates the conducting path for
 * demonstration only and stops under `prefers-reduced-motion`.
 *
 * Only two circuits ship a schematic so far; the rest fall back to the ASCII
 * text diagram, which stays on the page in both cases.
 */
const SCHEMATIC_STYLE = `
  .w   { fill:none; stroke:#b45309; stroke-width:3.5; stroke-linecap:round; stroke-linejoin:round; }
  .wl  { stroke:#dc2626; }
  .wn  { stroke:#0f172a; }
  .dev { fill:#f1f5f9; stroke:#334155; stroke-width:2.5; }
  .sym { fill:none; stroke:#1e293b; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
  .dot { fill:#1e293b; }
  .term { fill:#ffffff; stroke:#334155; stroke-width:2.5; }
  .term-l { fill:#dc2626; stroke:#b91c1c; }
  .term-n { fill:#0f172a; stroke:#0f172a; }
  .lbl { font-family: ui-monospace, Menlo, monospace; font-size:12px; fill:#475569; }
  .lblw { font-family: ui-monospace, Menlo, monospace; font-size:12px; fill:#1e293b; font-weight:700; }
  .lbl-l { fill:#dc2626; }
  .lbl-n { fill:#0f172a; }
  .flow { fill:none; stroke:#f59e0b; stroke-width:3; stroke-dasharray:5 9; stroke-linecap:round; animation:flow 1.1s linear infinite; }
  @keyframes flow { to { stroke-dashoffset:-28; } }
  @media (prefers-reduced-motion: reduce) { .flow { animation:none; } }
`;

const bulb = (cx: number, cy: number, r = 26) => `
  <circle class="sym" cx="${cx}" cy="${cy}" r="${r}"/>
  <line class="sym" x1="${cx - r * 0.72}" y1="${cy - r * 0.72}" x2="${cx + r * 0.72}" y2="${cy + r * 0.72}"/>
  <line class="sym" x1="${cx + r * 0.72}" y1="${cy - r * 0.72}" x2="${cx - r * 0.72}" y2="${cy + r * 0.72}"/>`;

export const CIRCUIT_SCHEMATICS: Record<string, string> = {
  'circuit-1': `
<svg viewBox="0 0 640 320" role="img" aria-label="Schematic: live from the supply through the MCB and switch to the lamp, with the neutral returning to the supply" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="100" r="9"/><text class="lblw lbl-l" x="38" y="86">L</text>
  <circle class="term term-n" cx="60" cy="240" r="9"/><text class="lblw lbl-n" x="36" y="262">N</text>
  <rect class="dev" x="130" y="84" width="60" height="32" rx="6"/>
  <text class="lblw" x="160" y="105" text-anchor="middle">MCB</text>
  <path class="w wl" d="M69,100 H130"/>
  <path class="w wl" d="M190,100 H260"/>
  <path class="w wl" d="M340,100 H414"/>
  <circle class="dot" cx="260" cy="100" r="4.5"/>
  <circle class="dot" cx="340" cy="100" r="4.5"/>
  <line class="sym" x1="260" y1="100" x2="337" y2="100"/>
  <line class="sym" x1="300" y1="100" x2="300" y2="74"/>
  <text class="lbl" x="300" y="62" text-anchor="middle">SW</text>
  ${bulb(440, 100)}
  <text class="lbl" x="440" y="152" text-anchor="middle">LAMP</text>
  <path class="w wn" d="M466,100 H580 V240 H69"/>
  <path class="flow" d="M69,100 H414"/>
  <path class="flow" d="M466,100 H580 V240 H69"/>
</svg>`,

  'circuit-3': `
<svg viewBox="0 0 700 360" role="img" aria-label="Schematic: live feeds the common of switch one, two strapper wires link the switches, and the common of switch two feeds the lamp" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="55" cy="90" r="9"/><text class="lblw lbl-l" x="33" y="76">L</text>
  <circle class="term term-n" cx="55" cy="310" r="9"/><text class="lblw lbl-n" x="31" y="332">N</text>
  <rect class="dev" x="120" y="74" width="58" height="32" rx="6"/>
  <text class="lblw" x="149" y="95" text-anchor="middle">MCB</text>
  <path class="w wl" d="M64,90 H120"/>
  <path class="w wl" d="M178,90 H260"/>
  <rect class="dev" x="225" y="60" width="70" height="170" rx="8"/>
  <text class="lblw" x="260" y="82" text-anchor="middle">SW1</text>
  <circle class="dot" cx="260" cy="90" r="4.5"/>
  <circle class="dot" cx="240" cy="200" r="4.5"/>
  <circle class="dot" cx="280" cy="200" r="4.5"/>
  <text class="lbl" x="226" y="222">L1</text><text class="lbl" x="272" y="222">L2</text>
  <text class="lbl" x="260" y="112" text-anchor="middle">COM</text>
  <line class="sym" x1="260" y1="90" x2="242" y2="196"/>
  <rect class="dev" x="405" y="60" width="70" height="170" rx="8"/>
  <text class="lblw" x="440" y="82" text-anchor="middle">SW2</text>
  <circle class="dot" cx="425" cy="200" r="4.5"/>
  <circle class="dot" cx="465" cy="200" r="4.5"/>
  <circle class="dot" cx="440" cy="90" r="4.5"/>
  <text class="lbl" x="411" y="222">L1</text><text class="lbl" x="457" y="222">L2</text>
  <text class="lbl" x="440" y="112" text-anchor="middle">COM</text>
  <line class="sym" x1="425" y1="200" x2="438" y2="94"/>
  <path class="w" d="M240,200 V245 H425 V200"/>
  <path class="w" d="M280,200 V275 H465 V200"/>
  <text class="lbl" x="332" y="238" text-anchor="middle">strappers</text>
  <path class="w wl" d="M440,90 H534"/>
  ${bulb(560, 90)}
  <text class="lbl" x="560" y="142" text-anchor="middle">LAMP</text>
  <path class="w wn" d="M586,90 H640 V310 H64"/>
  <path class="flow" d="M64,90 H260 L242,196 M240,200 V245 H425 V200 L438,94 H534"/>
  <path class="flow" d="M586,90 H640 V310 H64"/>
</svg>`,
};

/**
 * Per-circuit safety practice. Walkthroughs are simulations, so every page
 * carries the isolation/competence rule; circuits where a specific mistake is
 * dangerous get their own wording on top.
 */
const CIRCUIT_SAFETY: Record<string, string> = {
  'circuit-4':
    'This circuit relies on its protective earth and RCD. In practice, confirm the RCD trips with its test button after installation, and never lift the earth — it is the path that clears a fault instead of your body.',
  'circuit-3':
    'Two-way switching must interrupt the live conductor, never neutral. A switch wired on neutral leaves the lampholder live even when the light is off.',
  'circuit-8':
    'A consumer unit carries live busbar and main-switch terminals even with every breaker off. Only a competent person should remove a cover, and the supply must be isolated at the cut-out first.',
};

export const SAFETY_DEFAULT =
  'These walkthroughs teach wiring logic in a simulator. Real installation work must be isolated, tested dead, and carried out by a competent person — in the UK, notified under Part P or done by a registered electrician.';

export function circuitSafety(circuit: Pick<GuideCircuit, 'id'>): string {
  return CIRCUIT_SAFETY[circuit.id] ?? SAFETY_DEFAULT;
}

/**
 * Spoken form of an ASCII schematic: newlines become "; then" so a branching
 * diagram reads as separate paths rather than one run-on sentence, and runs of
 * alignment padding collapse to a single space.
 */
export function diagramLabel(diagram: string): string {
  return diagram
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('; then ');
}
