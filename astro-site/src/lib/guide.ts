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
  'circuit-9': 'protected-lamp',
  'circuit-10': 'timer-bell',
  'circuit-11': 'rcbo-socket',
  'circuit-12': 'contactor-motor-starter',
  'circuit-13': 'three-phase-dol-starter',
  'circuit-14': 'ev-charger-circuit',
  'circuit-15': 'solar-pv-battery',
  'circuit-16': 'underfloor-heating-zone',
  'circuit-17': 'pir-floodlight',
  'circuit-18': 'cooker-induction-supply',
  'circuit-19': 'generator-backup-supply',
  'circuit-20': 'afdd-bedroom-circuit',
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
  // Order is significant: the first rule that matches a component name wins, so
  // "Two-way Switch" resolves to the two-way page rather than the plain switch.
  { slug: 'two-way-switch', match: /two-way/i },
  { slug: 'timer-switch', match: /timer/i },
  { slug: 'dimmer-switch', match: /dimmer/i },
  { slug: 'switch', match: /switch/i },
  { slug: 'junction-box', match: /junction box/i },
  { slug: 'push-button', match: /push button/i },
  { slug: 'bell', match: /bell|buzzer/i },
  { slug: 'distribution-board', match: /distribution board/i },
  { slug: 'motor', match: /motor/i },
  { slug: 'mcb', match: /mcb/i },
  { slug: 'rcd', match: /rcd/i },
  { slug: 'bulb', match: /bulb/i },
  { slug: 'socket', match: /socket/i },
];

/** The one anatomy page that explains a component name, if any. */
function anatomyForComponent(component: string): string | undefined {
  return COMPONENT_ANATOMY_RULES.find((rule) => rule.match.test(component))?.slug;
}

/** Anatomies that explain at least one of a circuit's components. */
export function anatomiesForCircuit(circuit: Pick<GuideCircuit, 'components'>) {
  const slugs = new Set(
    circuit.components.map((component) => anatomyForComponent(component)).filter(Boolean),
  );
  return COMPONENT_ANATOMY_RULES.filter((rule) => slugs.has(rule.slug));
}

/** Circuits that use a given anatomy (the anatomy → circuit half of the mesh). */
export function circuitsUsingAnatomy(circuits: GuideCircuit[], slug: string): GuideCircuit[] {
  if (!COMPONENT_ANATOMY_RULES.some((rule) => rule.slug === slug)) return [];
  return circuits.filter((circuit) =>
    circuit.components.some((component) => anatomyForComponent(component) === slug),
  );
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
  .we  { stroke:#059669; }
  .wdp { stroke:#dc2626; }
  .wdn { stroke:#1d4ed8; }
  .dev { fill:#f1f5f9; stroke:#334155; stroke-width:2.5; }
  .sym { fill:none; stroke:#1e293b; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
  .dot { fill:#1e293b; }
  .term { fill:#ffffff; stroke:#334155; stroke-width:2.5; }
  .term-l { fill:#dc2626; stroke:#b91c1c; }
  .term-n { fill:#0f172a; stroke:#0f172a; }
  .term-e { fill:#059669; stroke:#047857; }
  .term-p { fill:#dc2626; stroke:#b91c1c; }
  .term-m { fill:#1d4ed8; stroke:#1e40af; }
  .lbl { font-family: ui-monospace, Menlo, monospace; font-size:12px; fill:#475569; }
  .lblw { font-family: ui-monospace, Menlo, monospace; font-size:12px; fill:#1e293b; font-weight:700; }
  .lbl-l { fill:#dc2626; }
  .lbl-n { fill:#0f172a; }
  .lbl-e { fill:#047857; }
  .lbl-p { fill:#dc2626; }
  .lbl-m { fill:#1d4ed8; }
  .flow { fill:none; stroke:#f59e0b; stroke-width:3; stroke-dasharray:5 9; stroke-linecap:round; animation:flow 1.1s linear infinite; }
  @keyframes flow { to { stroke-dashoffset:-28; } }
  @media (prefers-reduced-motion: reduce) { .flow { animation:none; } }
`;

const bulb = (cx: number, cy: number, r = 26) => `
  <circle class="sym" cx="${cx}" cy="${cy}" r="${r}"/>
  <line class="sym" x1="${cx - r * 0.72}" y1="${cy - r * 0.72}" x2="${cx + r * 0.72}" y2="${cy + r * 0.72}"/>
  <line class="sym" x1="${cx + r * 0.72}" y1="${cy - r * 0.72}" x2="${cx - r * 0.72}" y2="${cy + r * 0.72}"/>`;

/* ── schematic symbols ─────────────────────────────────────────────────────
   Small builders so every schematic uses one visual language: live red,
   neutral black, switch wires brown, earth green, devices as slate boxes. */
const wire = (d: string, cls = '') => `\n  <path class="w ${cls}" d="${d}"/>`;
const flow = (d: string) => `\n  <path class="flow" d="${d}"/>`;

/** Labelled device box (MCB, RCD, timer, dimmer, junction box, panel). */
const devBox = (x: number, y: number, w: number, h: number, label: string, y2?: number) => `
  <rect class="dev" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>
  <text class="lblw" x="${x + w / 2}" y="${y2 ?? y + h / 2 + 5}" text-anchor="middle">${label}</text>`;

/** One-way switch: two contacts, a blade and an operating lever. */
const sw1 = (cx: number, y: number, half: number, label = 'SW') => `
  <circle class="dot" cx="${cx - half}" cy="${y}" r="4.5"/>
  <circle class="dot" cx="${cx + half}" cy="${y}" r="4.5"/>
  <line class="sym" x1="${cx - half}" y1="${y}" x2="${cx + half - 3}" y2="${y}"/>
  <line class="sym" x1="${cx}" y1="${y}" x2="${cx}" y2="${y - 26}"/>
  <text class="lbl" x="${cx}" y="${y - 36}" text-anchor="middle">${label}</text>`;

/** UK socket face: earth slot on top, live and neutral below. */
const socketFace = (cx: number, cy: number) => `
  <rect class="sym" x="${cx - 4}" y="${cy - 26}" width="8" height="26" rx="2"/>
  <rect class="sym" x="${cx - 24}" y="${cy + 6}" width="20" height="9" rx="2"/>
  <rect class="sym" x="${cx + 4}" y="${cy + 6}" width="20" height="9" rx="2"/>`;

/** Bell / buzzer: dome on a base with a clapper. */
const bell = (cx: number, cy: number) => `
  <path class="sym" d="M${cx - 22},${cy} A22,22 0 0 1 ${cx + 22},${cy}"/>
  <line class="sym" x1="${cx - 28}" y1="${cy}" x2="${cx + 28}" y2="${cy}"/>
  <line class="sym" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy + 12}"/>
  <circle class="sym" cx="${cx}" cy="${cy + 16}" r="3"/>`;

/** Motor: circle with M. */
const motor = (cx: number, cy: number) => `
  <circle class="sym" cx="${cx}" cy="${cy}" r="26"/>
  <text class="lblw" x="${cx}" y="${cy + 6}" text-anchor="middle">M</text>`;

/** Clock face for the timer switch, rotary arrow for the dimmer. */
const clock = (cx: number, cy: number) => `
  <circle class="sym" cx="${cx}" cy="${cy}" r="15"/>
  <line class="sym" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 9}"/>
  <line class="sym" x1="${cx}" y1="${cy}" x2="${cx + 7}" y2="${cy + 4}"/>`;
const rotary = (cx: number, cy: number) => `
  <circle class="sym" cx="${cx}" cy="${cy}" r="15"/>
  <line class="sym" x1="${cx - 9}" y1="${cy + 9}" x2="${cx + 9}" y2="${cy - 9}"/>
  <path class="sym" d="M${cx + 9},${cy - 9} l-6,1 m6,-1 l-1,-6"/>`;

/** Three-phase motor: circle with its M and 3~ rating. */
const motor3 = (cx: number, cy: number, r = 34) => `
  <circle class="sym" cx="${cx}" cy="${cy}" r="${r}"/>
  <text class="lblw" x="${cx}" y="${cy + 6}" text-anchor="middle">M 3~</text>`;

/** PV array: framed panel split into cell strings. */
const solarPanel = (x: number, y: number, w = 130, h = 70) => `
  <rect class="dev" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>
  <line class="sym" x1="${x + w / 3}" y1="${y + 8}" x2="${x + w / 3}" y2="${y + h - 8}"/>
  <line class="sym" x1="${x + (2 * w) / 3}" y1="${y + 8}" x2="${x + (2 * w) / 3}" y2="${y + h - 8}"/>`;

/** Heating mat: framed serpentine element. */
const heatMat = (x: number, y: number, w = 120, h = 80) => `
  <rect class="dev" x="${x}" y="${y}" width="${w}" height="${h}" rx="4"/>
  <path class="sym" d="M${x + 12},${y + 20} h${w - 44} a10,10 0 0 1 0,20 h-${w - 44} a10,10 0 0 1 0,20 h${w - 44}"/>`;

/** LED luminaire: diode triangle inside a lens. */
const ledLamp = (cx: number, cy: number, r = 24) => `
  <circle class="sym" cx="${cx}" cy="${cy}" r="${r}"/>
  <path class="sym" d="M${cx - 11},${cy - 8} L${cx - 11},${cy + 8} L${cx + 9},${cy} Z"/>
  <line class="sym" x1="${cx + 9}" y1="${cy - 9}" x2="${cx + 9}" y2="${cy + 9}"/>
  <line class="sym" x1="${cx - 11}" y1="${cy - 13}" x2="${cx + 14}" y2="${cy - 13}"/>
  <line class="sym" x1="${cx - 11}" y1="${cy + 13}" x2="${cx + 14}" y2="${cy + 13}"/>`;

/** Alarm siren: horn with two sound arcs. */
const siren = (cx: number, cy: number) => `
  <path class="sym" d="M${cx - 20},${cy - 14} L${cx + 4},${cy - 4} L${cx + 4},${cy + 4} L${cx - 20},${cy + 14} Z"/>
  <path class="sym" d="M${cx + 10},${cy - 10} A14,14 0 0 1 ${cx + 10},${cy + 10}"/>
  <path class="sym" d="M${cx + 18},${cy - 16} A22,22 0 0 1 ${cx + 18},${cy + 16}"/>`;

/** Driven earth rod: rod plus the plate hatching. */
const earthRod = (cx: number, y: number) => `
  <line class="sym" x1="${cx}" y1="${y}" x2="${cx}" y2="${y + 34}"/>
  <line class="sym" x1="${cx - 12}" y1="${y + 34}" x2="${cx + 12}" y2="${y + 34}"/>
  <line class="sym" x1="${cx - 8}" y1="${y + 42}" x2="${cx + 8}" y2="${y + 42}"/>
  <line class="sym" x1="${cx - 4}" y1="${y + 50}" x2="${cx + 4}" y2="${y + 50}"/>`;

/** PIR sensor: boxed lens with detection arcs. */
const pirSensor = (x: number, y: number, w = 130, h = 64) => `
  <rect class="dev" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>
  <circle class="sym" cx="${x + w / 2}" cy="${y + 18}" r="11"/>
  <path class="sym" d="M${x + w / 2},${y + 36} A16,16 0 0 1 ${x + w / 2},${y + 58}"/>
  <path class="sym" d="M${x + w / 2 + 12},${y + 30} A24,24 0 0 1 ${x + w / 2 + 12},${y + 60}"/>`;

/** Normally-open push button: two contacts with a gap and a plunger. */
const pushButton = (cx: number, y: number) => `
  <circle class="dot" cx="${cx - 30}" cy="${y}" r="4.5"/>
  <circle class="dot" cx="${cx + 30}" cy="${y}" r="4.5"/>
  <line class="sym" x1="${cx - 30}" y1="${y}" x2="${cx - 8}" y2="${y}"/>
  <line class="sym" x1="${cx + 8}" y1="${y}" x2="${cx + 30}" y2="${y}"/>
  <line class="sym" x1="${cx}" y1="${y - 6}" x2="${cx}" y2="${y - 30}"/>
  <line class="sym" x1="${cx - 22}" y1="${y - 30}" x2="${cx + 22}" y2="${y - 30}"/>
  <text class="lbl" x="${cx}" y="${y - 40}" text-anchor="middle">PB</text>`;

export const CIRCUIT_SCHEMATICS: Record<string, string> = {
  'circuit-1': `
<svg viewBox="0 0 640 320" role="img" aria-label="Schematic: live from the supply through the MCB and switch to the lamp, with the neutral returning to the supply" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="100" r="9"/><text class="lblw lbl-l" x="38" y="86">L</text>
  <circle class="term term-n" cx="60" cy="240" r="9"/><text class="lblw lbl-n" x="36" y="262">N</text>
  <rect class="dev" x="130" y="84" width="60" height="32" rx="6"/>
  <text class="lblw" x="160" y="74" text-anchor="middle">MCB</text>
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
  <text class="lblw" x="149" y="64" text-anchor="middle">MCB</text>
  <path class="w wl" d="M64,90 H120"/>
  <path class="w wl" d="M178,90 H260"/>
  <rect class="dev" x="225" y="60" width="90" height="170" rx="8"/>
  <text class="lblw" x="270" y="78" text-anchor="middle">SW1</text>
  <circle class="dot" cx="260" cy="90" r="4.5"/>
  <circle class="dot" cx="240" cy="200" r="4.5"/>
  <circle class="dot" cx="280" cy="200" r="4.5"/>
  <text class="lbl" x="248" y="222">L1</text><text class="lbl" x="286" y="222">L2</text>
  <text class="lbl" x="272" y="108">COM</text>
  <line class="sym" x1="260" y1="90" x2="242" y2="196"/>
  <rect class="dev" x="395" y="60" width="90" height="170" rx="8"/>
  <text class="lblw" x="440" y="78" text-anchor="middle">SW2</text>
  <circle class="dot" cx="425" cy="200" r="4.5"/>
  <circle class="dot" cx="465" cy="200" r="4.5"/>
  <circle class="dot" cx="440" cy="90" r="4.5"/>
  <text class="lbl" x="433" y="222">L1</text><text class="lbl" x="469" y="222">L2</text>
  <text class="lbl" x="406" y="108">COM</text>
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

  'circuit-2': `
<svg viewBox="0 0 660 360" role="img" aria-label="Schematic: live runs through the MCB and switch to a junction box that feeds two lamps in parallel, with both neutrals returning to the supply" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="90" r="9"/><text class="lblw lbl-l" x="38" y="76">L</text>
  <circle class="term term-n" cx="60" cy="300" r="9"/><text class="lblw lbl-n" x="36" y="322">N</text>
  ${wire('M69,90 H130', 'wl')}
  ${devBox(130, 74, 60, 32, 'MCB', 64)}
  ${wire('M190,90 H260', 'wl')}
  ${sw1(295, 90, 35)}
  ${wire('M330,90 H420', 'wl')}
  ${devBox(420, 74, 46, 32, 'JB')}
  ${wire('M466,90 H505 V130 H518', 'wl')}
  ${wire('M466,90 H505 V240 H518', 'wl')}
  ${bulb(542, 130, 24)}
  ${bulb(542, 240, 24)}
  <text class="lbl" x="542" y="178" text-anchor="middle">LAMP A</text>
  <text class="lbl" x="542" y="288" text-anchor="middle">LAMP B</text>
  ${wire('M566,130 H610 V300 H69', 'wn')}
  ${wire('M566,240 H610 V300', 'wn')}
  ${flow('M69,90 H420')}
  ${flow('M466,90 H505 V130 H518')}
  ${flow('M466,90 H505 V240 H518')}
  ${flow('M566,130 H610 V300 H69')}
  ${flow('M566,240 H610 V300')}
</svg>`,

  'circuit-4': `
<svg viewBox="0 0 700 420" role="img" aria-label="Schematic: live and neutral both pass through the RCD before reaching the socket, with a separate earth conductor running straight to the socket earth terminal" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="55" cy="80" r="9"/><text class="lblw lbl-l" x="33" y="66">L</text>
  <circle class="term term-n" cx="55" cy="240" r="9"/><text class="lblw lbl-n" x="31" y="262">N</text>
  <circle class="term term-e" cx="55" cy="350" r="9"/><text class="lblw lbl-e" x="31" y="372">E</text>
  ${wire('M64,80 H130', 'wl')}
  ${devBox(130, 64, 60, 32, 'MCB', 54)}
  ${wire('M190,80 H270', 'wl')}
  ${wire('M64,240 H270', 'wn')}
  ${wire('M64,350 H470', 'we')}
  <rect class="dev" x="270" y="50" width="120" height="230" rx="8"/>
  <text class="lblw" x="330" y="72" text-anchor="middle">RCD</text>
  <circle class="term" cx="330" cy="122" r="11"/><text class="lbl" x="330" y="126" text-anchor="middle">T</text>
  ${wire('M270,80 H390', 'wl')}
  ${wire('M270,240 H390', 'wn')}
  <circle class="dot" cx="270" cy="80" r="4.5"/><circle class="dot" cx="390" cy="80" r="4.5"/>
  <circle class="dot" cx="270" cy="240" r="4.5"/><circle class="dot" cx="390" cy="240" r="4.5"/>
  ${wire('M390,80 H470', 'wl')}
  ${wire('M390,240 H470', 'wn')}
  <rect class="dev" x="470" y="56" width="150" height="320" rx="8"/>
  <circle class="dot" cx="470" cy="80" r="4.5"/><circle class="dot" cx="470" cy="240" r="4.5"/><circle class="dot" cx="470" cy="350" r="4.5"/>
  <line class="sym" x1="470" y1="80" x2="500" y2="80"/>
  <line class="sym" x1="470" y1="240" x2="500" y2="240"/>
  <line class="sym" x1="470" y1="350" x2="500" y2="350"/>
  ${socketFace(555, 200)}
  <text class="lblw" x="555" y="120" text-anchor="middle">SOCKET</text>
  <text class="lbl" x="500" y="72">L</text><text class="lbl" x="500" y="232">N</text><text class="lbl lbl-e" x="500" y="342">E</text>
  ${flow('M64,80 H470')}
  ${flow('M470,240 H64')}
</svg>`,

  'circuit-5': `
<svg viewBox="0 0 640 320" role="img" aria-label="Schematic: live feeds a timer switch through the MCB, and the switched live feeds the lamp" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="100" r="9"/><text class="lblw lbl-l" x="38" y="86">L</text>
  <circle class="term term-n" cx="60" cy="250" r="9"/><text class="lblw lbl-n" x="36" y="272">N</text>
  ${wire('M69,100 H130', 'wl')}
  ${devBox(130, 84, 60, 32, 'MCB', 74)}
  ${wire('M190,100 H260', 'wl')}
  <rect class="dev" x="260" y="72" width="100" height="56" rx="6"/>
  ${clock(288, 100)}
  <text class="lblw" x="318" y="88">TIMER</text>
  ${wire('M360,100 H414', 'wl')}
  ${bulb(440, 100)}
  <text class="lbl" x="440" y="152" text-anchor="middle">LAMP</text>
  ${wire('M466,100 H580 V250 H69', 'wn')}
  ${flow('M69,100 H414')}
  ${flow('M466,100 H580 V250 H69')}
</svg>`,

  'circuit-6': `
<svg viewBox="0 0 640 320" role="img" aria-label="Schematic: live feeds a dimmer switch through the MCB, and the dimmed live feeds the lamp" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="100" r="9"/><text class="lblw lbl-l" x="38" y="86">L</text>
  <circle class="term term-n" cx="60" cy="250" r="9"/><text class="lblw lbl-n" x="36" y="272">N</text>
  ${wire('M69,100 H130', 'wl')}
  ${devBox(130, 84, 60, 32, 'MCB', 74)}
  ${wire('M190,100 H260', 'wl')}
  <rect class="dev" x="260" y="72" width="110" height="56" rx="6"/>
  ${rotary(288, 100)}
  <text class="lblw" x="320" y="88">DIMMER</text>
  ${wire('M370,100 H414', 'wl')}
  ${bulb(440, 100)}
  <text class="lbl" x="440" y="152" text-anchor="middle">LAMP</text>
  ${wire('M466,100 H580 V250 H69', 'wn')}
  ${flow('M69,100 H414')}
  ${flow('M466,100 H580 V250 H69')}
</svg>`,

  'circuit-7': `
<svg viewBox="0 0 640 340" role="img" aria-label="Schematic: live feeds a normally-open push button through the MCB, and pressing it completes the circuit to the bell" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="110" r="9"/><text class="lblw lbl-l" x="38" y="96">L</text>
  <circle class="term term-n" cx="60" cy="260" r="9"/><text class="lblw lbl-n" x="36" y="282">N</text>
  ${wire('M69,110 H130', 'wl')}
  ${devBox(130, 94, 60, 32, 'MCB', 84)}
  ${wire('M190,110 H250', 'wl')}
  ${pushButton(280, 110)}
  ${wire('M310,110 H404', 'wl')}
  ${bell(432, 110)}
  <text class="lbl" x="432" y="152" text-anchor="middle">BELL</text>
  ${wire('M460,110 H580 V260 H69', 'wn')}
  ${flow('M69,110 H272')}
  ${flow('M288,110 H404')}
  ${flow('M460,110 H580 V260 H69')}
</svg>`,

  'circuit-8': `
<svg viewBox="0 0 780 500" role="img" aria-label="Schematic: the supply enters a consumer unit main switch, a live busbar feeds three MCBs, and each MCB feeds a lighting circuit, a socket circuit and a motor circuit, with all neutrals returning to the neutral bar" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="50" cy="60" r="9"/><text class="lblw lbl-l" x="28" y="46">L</text>
  <circle class="term term-n" cx="50" cy="440" r="9"/><text class="lblw lbl-n" x="28" y="462">N</text>
  ${wire('M59,60 H110', 'wl')}
  ${devBox(110, 40, 86, 40, 'MAIN SW', 30)}
  <text class="lbl" x="153" y="100" text-anchor="middle">CONSUMER UNIT</text>
  <circle class="dot" cx="110" cy="60" r="4.5"/><circle class="dot" cx="196" cy="60" r="4.5"/>
  ${wire('M196,60 H210 V370', 'wl')}

  ${wire('M210,130 H250', 'wl')}
  ${devBox(250, 114, 64, 32, 'MCB1', 104)}
  ${wire('M314,130 H380', 'wl')}
  ${sw1(410, 130, 30)}
  ${wire('M440,130 H522', 'wl')}
  ${bulb(546, 130, 24)}
  <text class="lbl" x="546" y="178" text-anchor="middle">LIGHTING</text>

  ${wire('M210,260 H250', 'wl')}
  ${devBox(250, 244, 64, 32, 'MCB2', 234)}
  ${wire('M314,260 H520', 'wl')}
  <rect class="dev" x="520" y="228" width="80" height="64" rx="6"/>
  ${socketFace(560, 260)}
  <text class="lbl" x="560" y="318" text-anchor="middle">SOCKETS</text>

  ${wire('M210,370 H250', 'wl')}
  ${devBox(250, 354, 64, 32, 'MCB3', 344)}
  ${wire('M314,370 H520', 'wl')}
  ${motor(546, 370)}
  <text class="lbl" x="546" y="424" text-anchor="middle">MOTOR</text>

  ${wire('M570,130 H700 V440 H59', 'wn')}
  ${wire('M600,260 H700 V440', 'wn')}
  ${wire('M572,370 H700 V440', 'wn')}

  ${flow('M59,60 H196')}
  ${flow('M196,60 H210 V130 H522')}
  ${flow('M210,260 H520')}
  ${flow('M210,370 H520')}
  ${flow('M570,130 H700 V440 H69')}
  ${flow('M600,260 H700 V440')}
  ${flow('M572,370 H700 V440')}
</svg>`,
  'circuit-9': `
<svg viewBox="0 0 560 300" role="img" aria-label="Schematic: live runs from the supply through the MCB to the lamp, with the neutral returning to the supply" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="90" r="9"/><text class="lblw lbl-l" x="38" y="76">L</text>
  <circle class="term term-n" cx="60" cy="230" r="9"/><text class="lblw lbl-n" x="36" y="252">N</text>
  ${wire('M69,90 H130', 'wl')}
  ${devBox(130, 74, 60, 32, 'MCB', 64)}
  ${wire('M190,90 H314', 'wl')}
  ${bulb(340, 90)}
  <text class="lbl" x="340" y="152" text-anchor="middle">LAMP</text>
  ${wire('M366,90 H480 V230 H69', 'wn')}
  ${flow('M69,90 H314')}
  ${flow('M366,90 H480 V230 H69')}
</svg>`,

  'circuit-10': `
<svg viewBox="0 0 640 330" role="img" aria-label="Schematic: live feeds a timer switch through the MCB, and the switched live feeds a bell that returns to neutral" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="100" r="9"/><text class="lblw lbl-l" x="38" y="86">L</text>
  <circle class="term term-n" cx="60" cy="260" r="9"/><text class="lblw lbl-n" x="36" y="282">N</text>
  ${wire('M69,100 H130', 'wl')}
  ${devBox(130, 84, 60, 32, 'MCB', 74)}
  ${wire('M190,100 H260', 'wl')}
  <rect class="dev" x="260" y="72" width="100" height="56" rx="6"/>
  ${clock(288, 100)}
  <text class="lblw" x="318" y="88">TIMER</text>
  ${wire('M360,100 H404', 'wl')}
  ${bell(432, 100)}
  <text class="lbl" x="432" y="150" text-anchor="middle">BELL</text>
  ${wire('M460,100 H580 V260 H69', 'wn')}
  ${flow('M69,100 H260')}
  ${flow('M360,100 H404')}
  ${flow('M460,100 H580 V260 H69')}
</svg>`,

  'circuit-11': `
<svg viewBox="0 0 780 420" role="img" aria-label="Schematic: live and neutral pass through the RCBO before reaching the socket, the earth conductor runs straight to the socket earth terminal, and a test lamp stands in for a plugged-in appliance" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="55" cy="80" r="9"/><text class="lblw lbl-l" x="33" y="66">L</text>
  <circle class="term term-n" cx="55" cy="240" r="9"/><text class="lblw lbl-n" x="31" y="262">N</text>
  <circle class="term term-e" cx="55" cy="350" r="9"/><text class="lblw lbl-e" x="31" y="372">E</text>
  ${wire('M64,80 H150', 'wl')}
  ${wire('M64,240 H150', 'wn')}
  ${wire('M64,350 H470', 'we')}
  <rect class="dev" x="150" y="50" width="120" height="230" rx="8"/>
  <text class="lblw" x="210" y="72" text-anchor="middle">RCBO</text>
  <circle class="term" cx="210" cy="122" r="11"/><text class="lbl" x="210" y="126" text-anchor="middle">T</text>
  <circle class="dot" cx="150" cy="80" r="4.5"/><circle class="dot" cx="270" cy="80" r="4.5"/>
  <circle class="dot" cx="150" cy="240" r="4.5"/><circle class="dot" cx="270" cy="240" r="4.5"/>
  ${wire('M270,80 H470', 'wl')}
  ${wire('M270,240 H470', 'wn')}
  <rect class="dev" x="470" y="56" width="150" height="320" rx="8"/>
  <circle class="dot" cx="470" cy="80" r="4.5"/><circle class="dot" cx="470" cy="240" r="4.5"/><circle class="dot" cx="470" cy="350" r="4.5"/>
  <line class="sym" x1="470" y1="80" x2="500" y2="80"/>
  <line class="sym" x1="470" y1="240" x2="500" y2="240"/>
  <line class="sym" x1="470" y1="350" x2="500" y2="350"/>
  ${socketFace(555, 200)}
  <text class="lblw" x="555" y="120" text-anchor="middle">SOCKET</text>
  <text class="lbl" x="500" y="72">L</text><text class="lbl" x="500" y="232">N</text><text class="lbl lbl-e" x="500" y="342">E</text>
  ${wire('M620,80 H660 V160 H674', 'wl')}
  ${wire('M620,240 H745 V160 H726', 'wn')}
  ${bulb(700, 160)}
  <text class="lbl" x="700" y="120" text-anchor="middle">TEST LAMP</text>
  ${flow('M64,80 H470')}
  ${flow('M470,240 H64')}
  ${flow('M620,80 H660 V160 H674')}
  ${flow('M620,240 H745 V160 H726')}
</svg>`,

  'circuit-12': `
<svg viewBox="0 0 700 360" role="img" aria-label="Schematic: live reaches the contactor through the MCB, the contactor switches both live and neutral through to the motor, and the neutral returns to the supply" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="90" r="9"/><text class="lblw lbl-l" x="38" y="76">L</text>
  <circle class="term term-n" cx="60" cy="280" r="9"/><text class="lblw lbl-n" x="36" y="302">N</text>
  ${wire('M69,90 H130', 'wl')}
  ${devBox(130, 74, 60, 32, 'MCB', 64)}
  ${wire('M190,90 H250 V110 H300', 'wl')}
  <rect class="dev" x="300" y="70" width="150" height="170" rx="8"/>
  <text class="lblw" x="375" y="52" text-anchor="middle">CONTACTOR</text>
  <circle class="dot" cx="300" cy="110" r="4.5"/><circle class="dot" cx="450" cy="110" r="4.5"/>
  <circle class="dot" cx="300" cy="200" r="4.5"/><circle class="dot" cx="450" cy="200" r="4.5"/>
  <line class="sym" x1="300" y1="110" x2="444" y2="110"/>
  <line class="sym" x1="300" y1="200" x2="444" y2="200"/>
  <rect class="dev" x="330" y="140" width="90" height="40" rx="4"/>
  <text class="lbl" x="375" y="166" text-anchor="middle">COIL</text>
  ${wire('M69,280 H240 V200 H300', 'wn')}
  ${wire('M450,110 H534', 'wl')}
  ${wire('M450,200 H620 V110 H586', 'wn')}
  ${motor(560, 110)}
  <text class="lbl" x="560" y="170" text-anchor="middle">MOTOR</text>
  ${flow('M69,90 H250 V110 H300')}
  ${flow('M450,110 H534')}
  ${flow('M586,110 H620 V200 H450')}
  ${flow('M300,200 H240 V280 H69')}
</svg>`,
  'circuit-13': `
<svg viewBox="0 0 780 520" role="img" aria-label="Schematic: three live phases each pass through their own Type-D breaker into a three-pole contactor, which feeds the motor windings U, V and W, with a protective earth to the motor frame" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="55" cy="90" r="9"/><text class="lblw lbl-l" x="31" y="76">L1</text>
  <circle class="term term-l" cx="55" cy="200" r="9"/><text class="lblw lbl-l" x="31" y="186">L2</text>
  <circle class="term term-l" cx="55" cy="310" r="9"/><text class="lblw lbl-l" x="31" y="296">L3</text>
  <circle class="term term-e" cx="55" cy="440" r="9"/><text class="lblw lbl-e" x="31" y="462">E</text>
  ${wire('M64,90 H150', 'wl')}
  ${devBox(150, 74, 74, 32, 'MCB D1', 64)}
  ${wire('M224,90 H320', 'wl')}
  ${wire('M64,200 H150', 'wl')}
  ${devBox(150, 184, 74, 32, 'MCB D2', 174)}
  ${wire('M224,200 H320', 'wl')}
  ${wire('M64,310 H150', 'wl')}
  ${devBox(150, 294, 74, 32, 'MCB D3', 284)}
  ${wire('M224,310 H320', 'wl')}
  <rect class="dev" x="320" y="60" width="150" height="290" rx="8"/>
  <text class="lblw" x="395" y="44" text-anchor="middle">CONTACTOR 3P</text>
  <circle class="dot" cx="320" cy="90" r="4.5"/><circle class="dot" cx="470" cy="90" r="4.5"/>
  <circle class="dot" cx="320" cy="200" r="4.5"/><circle class="dot" cx="470" cy="200" r="4.5"/>
  <circle class="dot" cx="320" cy="310" r="4.5"/><circle class="dot" cx="470" cy="310" r="4.5"/>
  <line class="sym" x1="320" y1="90" x2="464" y2="90"/>
  <line class="sym" x1="320" y1="200" x2="464" y2="200"/>
  <line class="sym" x1="320" y1="310" x2="464" y2="310"/>
  <rect class="dev" x="350" y="232" width="90" height="40" rx="4"/>
  <text class="lbl" x="395" y="258" text-anchor="middle">COIL</text>
  ${wire('M470,90 H560 V200 H616', 'wl')}
  ${wire('M470,200 H616', 'wl')}
  ${wire('M470,310 H590 V200 H616', 'wl')}
  ${motor3(650, 200)}
  <text class="lbl" x="650" y="262" text-anchor="middle">MOTOR 3~</text>
  ${wire('M64,440 H700 V234 H650', 'we')}
  ${flow('M64,90 H320')}
  ${flow('M470,90 H560 V200 H616')}
  ${flow('M64,200 H320')}
  ${flow('M470,200 H616')}
  ${flow('M64,310 H320')}
  ${flow('M470,310 H590 V200 H616')}
</svg>`,

  'circuit-14': `
<svg viewBox="0 0 760 420" role="img" aria-label="Schematic: live and neutral run through a rotary isolator and an RCBO to the charge point, with the protective earth running straight to the charger earth terminal" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="55" cy="90" r="9"/><text class="lblw lbl-l" x="33" y="76">L</text>
  <circle class="term term-n" cx="55" cy="190" r="9"/><text class="lblw lbl-n" x="31" y="214">N</text>
  <circle class="term term-e" cx="55" cy="360" r="9"/><text class="lblw lbl-e" x="31" y="382">E</text>
  ${wire('M64,90 H150', 'wl')}
  ${wire('M64,190 H150', 'wn')}
  <rect class="dev" x="150" y="70" width="90" height="180" rx="8"/>
  <text class="lblw" x="195" y="52" text-anchor="middle">ISOLATOR</text>
  <circle class="dot" cx="150" cy="90" r="4.5"/><circle class="dot" cx="240" cy="90" r="4.5"/>
  <circle class="dot" cx="150" cy="190" r="4.5"/><circle class="dot" cx="240" cy="190" r="4.5"/>
  <line class="sym" x1="150" y1="90" x2="234" y2="90"/>
  <line class="sym" x1="150" y1="190" x2="234" y2="190"/>
  ${wire('M240,90 H320', 'wl')}
  ${wire('M240,190 H320', 'wn')}
  <rect class="dev" x="320" y="50" width="110" height="200" rx="8"/>
  <text class="lblw" x="375" y="72" text-anchor="middle">RCBO</text>
  <circle class="term" cx="375" cy="150" r="11"/><text class="lbl" x="375" y="154" text-anchor="middle">T</text>
  <circle class="dot" cx="320" cy="90" r="4.5"/><circle class="dot" cx="430" cy="90" r="4.5"/>
  <circle class="dot" cx="320" cy="190" r="4.5"/><circle class="dot" cx="430" cy="190" r="4.5"/>
  <line class="sym" x1="320" y1="90" x2="424" y2="90"/>
  <line class="sym" x1="320" y1="190" x2="424" y2="190"/>
  ${wire('M430,90 H470 V170 H520', 'wl')}
  ${wire('M430,190 H500 V210 H520', 'wn')}
  ${wire('M64,360 H560 V250 H520', 'we')}
  <rect class="dev" x="520" y="140" width="120" height="120" rx="6"/>
  <circle class="sym" cx="580" cy="176" r="14"/>
  <path class="sym" d="M580,190 v12 h-26"/>
  <rect class="sym" x="540" y="202" width="26" height="16" rx="3"/>
  <text class="lblw" x="580" y="126" text-anchor="middle">EV CHARGER</text>
  ${flow('M64,90 H430')}
  ${flow('M430,90 H470 V170 H520')}
  ${flow('M520,210 H500 V190 H320')}
  ${flow('M320,190 H64')}
</svg>`,

  'circuit-15': `
<svg viewBox="0 0 720 400" role="img" aria-label="Schematic: the PV array feeds a DC combiner that supplies a 12 volt LED load and charges a battery, with the negative rail returning from both" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  ${solarPanel(90, 120)}
  <text class="lblw" x="155" y="104" text-anchor="middle">PV ARRAY</text>
  <circle class="term term-p" cx="220" cy="142" r="9"/><text class="lblw lbl-p" x="236" y="130">+</text>
  <circle class="term term-m" cx="220" cy="178" r="9"/><text class="lblw lbl-m" x="236" y="192">−</text>
  ${wire('M229,142 H360', 'wdp')}
  <rect class="dev" x="360" y="110" width="110" height="54" rx="6"/>
  <text class="lblw" x="415" y="96" text-anchor="middle">DC COMBINER</text>
  <circle class="dot" cx="360" cy="124" r="4.5"/><circle class="dot" cx="470" cy="124" r="4.5"/>
  <circle class="dot" cx="470" cy="150" r="4.5"/>
  <line class="sym" x1="360" y1="124" x2="464" y2="124"/>
  ${wire('M470,124 H596', 'wdp')}
  ${wire('M470,150 H520 V288 H210', 'wdp')}
  ${wire('M229,178 H250 V320 H210', 'wdn')}
  ${wire('M250,320 H620 V148', 'wdn')}
  <rect class="dev" x="100" y="270" width="110" height="70" rx="6"/>
  <text class="lbl" x="155" y="296" text-anchor="middle">BATTERY</text>
  <text class="lbl" x="155" y="318" text-anchor="middle">12 V</text>
  ${ledLamp(620, 124)}
  <text class="lbl" x="620" y="86" text-anchor="middle">LED 12V</text>
  ${flow('M229,142 H360')}
  ${flow('M470,124 H596')}
  ${flow('M470,150 H520 V288 H210')}
  ${flow('M229,178 H250 V320 H210')}
  ${flow('M250,320 H620 V148')}
</svg>`,

  'circuit-16': `
<svg viewBox="0 0 700 380" role="img" aria-label="Schematic: live reaches the heating thermostat through a Type-C breaker, neutral joins it there, and both switched poles run out to the heating mat" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="110" r="9"/><text class="lblw lbl-l" x="38" y="96">L</text>
  <circle class="term term-n" cx="60" cy="290" r="9"/><text class="lblw lbl-n" x="36" y="312">N</text>
  ${wire('M69,110 H140', 'wl')}
  ${devBox(140, 94, 74, 32, 'MCB C', 84)}
  ${wire('M214,110 H300', 'wl')}
  ${wire('M69,290 H240 V170 H300', 'wn')}
  <rect class="dev" x="300" y="80" width="130" height="190" rx="8"/>
  <text class="lblw" x="365" y="62" text-anchor="middle">THERMOSTAT</text>
  <circle class="dot" cx="300" cy="110" r="4.5"/><circle class="dot" cx="430" cy="110" r="4.5"/>
  <circle class="dot" cx="300" cy="170" r="4.5"/><circle class="dot" cx="430" cy="170" r="4.5"/>
  <line class="sym" x1="300" y1="110" x2="424" y2="110"/>
  <line class="sym" x1="300" y1="170" x2="424" y2="170"/>
  ${wire('M430,110 H470 V130 H520', 'wl')}
  ${wire('M430,170 H495 V165 H520', 'wn')}
  ${heatMat(520, 100)}
  <text class="lbl" x="580" y="206" text-anchor="middle">HEATING MAT</text>
  ${flow('M69,110 H300')}
  ${flow('M430,110 H470 V130 H520')}
  ${flow('M520,165 H495 V170 H300')}
  ${flow('M300,170 H240 V290 H69')}
</svg>`,

  'circuit-17': `
<svg viewBox="0 0 700 380" role="img" aria-label="Schematic: live and neutral both supply the PIR sensor, its switched live output feeds the floodlight, and the floodlight neutral returns to the supply" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="110" r="9"/><text class="lblw lbl-l" x="38" y="96">L</text>
  <circle class="term term-n" cx="60" cy="290" r="9"/><text class="lblw lbl-n" x="36" y="312">N</text>
  ${wire('M69,110 H140', 'wl')}
  ${devBox(140, 94, 60, 32, 'MCB', 84)}
  ${wire('M200,110 H250 V98 H290', 'wl')}
  ${wire('M69,290 H250 V126 H290', 'wn')}
  ${pirSensor(290, 80)}
  <text class="lblw" x="355" y="64" text-anchor="middle">PIR SENSOR</text>
  <circle class="dot" cx="290" cy="98" r="4.5"/><circle class="dot" cx="290" cy="126" r="4.5"/><circle class="dot" cx="420" cy="112" r="4.5"/>
  <line class="sym" x1="290" y1="98" x2="416" y2="112"/>
  <line class="sym" x1="290" y1="126" x2="330" y2="126"/>
  ${wire('M420,112 H534', 'wl')}
  ${bulb(560, 112)}
  <text class="lbl" x="560" y="166" text-anchor="middle">FLOODLIGHT</text>
  ${wire('M586,112 H630 V290 H250', 'wn')}
  ${flow('M69,110 H250 V98 H290')}
  ${flow('M420,112 H534')}
  ${flow('M586,112 H630 V290 H250')}
  ${flow('M250,290 H69')}
</svg>`,

  'circuit-18': `
<svg viewBox="0 0 700 380" role="img" aria-label="Schematic: live reaches a cooker control unit through a breaker, neutral joins it there, and both switched poles feed the induction hob" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="60" cy="110" r="9"/><text class="lblw lbl-l" x="38" y="96">L</text>
  <circle class="term term-n" cx="60" cy="290" r="9"/><text class="lblw lbl-n" x="36" y="312">N</text>
  ${wire('M69,110 H140', 'wl')}
  ${devBox(140, 94, 60, 32, 'MCB', 84)}
  ${wire('M200,110 H290', 'wl')}
  ${wire('M69,290 H240 V180 H290', 'wn')}
  <rect class="dev" x="290" y="80" width="140" height="170" rx="8"/>
  <text class="lblw" x="360" y="62" text-anchor="middle">COOKER UNIT</text>
  <circle class="dot" cx="290" cy="110" r="4.5"/><circle class="dot" cx="430" cy="110" r="4.5"/>
  <circle class="dot" cx="290" cy="180" r="4.5"/><circle class="dot" cx="430" cy="180" r="4.5"/>
  <line class="sym" x1="290" y1="110" x2="424" y2="110"/>
  <line class="sym" x1="290" y1="180" x2="424" y2="180"/>
  ${wire('M430,110 H470 V130 H520', 'wl')}
  ${wire('M430,180 H495 V170 H520', 'wn')}
  <rect class="dev" x="520" y="100" width="110" height="100" rx="6"/>
  <circle class="sym" cx="575" cy="134" r="18"/>
  <line class="sym" x1="575" y1="152" x2="575" y2="176"/>
  <line class="sym" x1="556" y1="164" x2="594" y2="164"/>
  <text class="lbl" x="575" y="222" text-anchor="middle">INDUCTION HOB</text>
  ${flow('M69,110 H290')}
  ${flow('M430,110 H470 V130 H520')}
  ${flow('M520,170 H495 V180 H290')}
  ${flow('M290,180 H240 V290 H69')}
</svg>`,

  'circuit-19': `
<svg viewBox="0 0 720 420" role="img" aria-label="Schematic: a standby generator feeds an MCB that supplies an emergency light and an alarm siren, both returning to the generator neutral, with the generator frame earthed to a rod" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <rect class="dev" x="90" y="170" width="130" height="110" rx="8"/>
  <text class="lblw" x="155" y="152" text-anchor="middle">GENERATOR</text>
  <circle class="term term-l" cx="220" cy="200" r="9"/><text class="lblw lbl-l" x="236" y="190">L</text>
  <circle class="term term-n" cx="220" cy="250" r="9"/><text class="lblw lbl-n" x="236" y="266">N</text>
  <circle class="term term-e" cx="155" cy="280" r="9"/><text class="lblw lbl-e" x="168" y="276">E</text>
  ${wire('M229,200 H330', 'wl')}
  ${devBox(330, 184, 60, 32, 'MCB', 174)}
  ${wire('M390,200 H450 V110 H520', 'wl')}
  ${wire('M390,200 H450 V300 H520', 'wl')}
  <rect class="dev" x="520" y="76" width="110" height="68" rx="6"/>
  ${ledLamp(575, 110, 20)}
  <text class="lbl" x="575" y="166" text-anchor="middle">EMERG. LIGHT</text>
  <rect class="dev" x="520" y="266" width="110" height="68" rx="6"/>
  ${siren(575, 300)}
  <text class="lbl" x="575" y="356" text-anchor="middle">ALARM SIREN</text>
  ${wire('M584,110 H640 V250 H220', 'wn')}
  ${wire('M630,300 H640 V250', 'wn')}
  ${wire('M155,289 V320', 'we')}
  ${earthRod(155, 320)}
  <text class="lbl" x="155" y="392" text-anchor="middle">EARTH ROD</text>
  ${flow('M229,200 H330')}
  ${flow('M390,200 H450 V110 H520')}
  ${flow('M390,200 H450 V300 H520')}
  ${flow('M584,110 H640 V250 H220')}
  ${flow('M630,300 H640 V250')}
</svg>`,

  'circuit-20': `
<svg viewBox="0 0 760 440" role="img" aria-label="Schematic: live and neutral pass through an AFDD-RCBO to a double socket that also feeds a light, with the earth conductor running straight to the socket earth terminal" class="schem">
  <style>${SCHEMATIC_STYLE}</style>
  <circle class="term term-l" cx="55" cy="90" r="9"/><text class="lblw lbl-l" x="33" y="76">L</text>
  <circle class="term term-n" cx="55" cy="240" r="9"/><text class="lblw lbl-n" x="31" y="262">N</text>
  <circle class="term term-e" cx="55" cy="390" r="9"/><text class="lblw lbl-e" x="31" y="412">E</text>
  ${wire('M64,90 H150', 'wl')}
  ${wire('M64,240 H110 V200 H150', 'wn')}
  <rect class="dev" x="150" y="60" width="120" height="250" rx="8"/>
  <text class="lblw" x="210" y="42" text-anchor="middle">AFDD-RCBO</text>
  <circle class="term" cx="210" cy="160" r="11"/><text class="lbl" x="210" y="164" text-anchor="middle">T</text>
  <circle class="dot" cx="150" cy="110" r="4.5"/><circle class="dot" cx="270" cy="110" r="4.5"/>
  <circle class="dot" cx="150" cy="200" r="4.5"/><circle class="dot" cx="270" cy="200" r="4.5"/>
  <line class="sym" x1="150" y1="110" x2="264" y2="110"/>
  <line class="sym" x1="150" y1="200" x2="264" y2="200"/>
  ${wire('M270,110 H400', 'wl')}
  ${wire('M270,200 H400', 'wn')}
  ${wire('M64,390 H370 V240 H400', 'we')}
  <rect class="dev" x="400" y="70" width="150" height="180" rx="8"/>
  <circle class="dot" cx="400" cy="110" r="4.5"/><circle class="dot" cx="400" cy="200" r="4.5"/><circle class="dot" cx="400" cy="240" r="4.5"/>
  <line class="sym" x1="400" y1="110" x2="430" y2="110"/>
  <line class="sym" x1="400" y1="200" x2="430" y2="200"/>
  <line class="sym" x1="400" y1="240" x2="430" y2="240"/>
  ${socketFace(475, 160)}
  <text class="lblw" x="475" y="102" text-anchor="middle">SOCKET</text>
  <text class="lbl" x="440" y="102">L</text><text class="lbl" x="440" y="192">N</text><text class="lbl lbl-e" x="440" y="232">E</text>
  ${wire('M550,110 H590 V300 H620', 'wl')}
  ${wire('M550,200 H610 V330 H620', 'wn')}
  <rect class="dev" x="620" y="280" width="110" height="70" rx="6"/>
  ${ledLamp(675, 315, 20)}
  <text class="lbl" x="675" y="376" text-anchor="middle">LED LIGHT</text>
  ${flow('M64,90 H270')}
  ${flow('M270,110 H400')}
  ${flow('M550,110 H590 V300 H620')}
  ${flow('M620,330 H610 V200 H400')}
  ${flow('M270,200 H110 V240 H64')}
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
  'circuit-11':
    'An RCBO only protects if its earth reference is intact. Confirm it trips from its test button after installation, and never route the circuit protective conductor through the device or through a switch.',
  'circuit-12':
    'Motor circuits draw a heavy starting surge and store energy in their windings. Size protection for the surge, provide a lockable local isolator, and treat the terminals as live until the supply is isolated and proved dead.',
  'circuit-13':
    'Three-phase work is not a step up from domestic wiring — 400 V between phases, and a motor that can start unexpectedly if its control circuit is energised. Isolate and lock off all three phases, prove dead, and check rotation before coupling a load.',
  'circuit-14':
    'A charge point is a continuous high load on a dedicated circuit. It needs the right earthing arrangement for the supply (TN-S, TN-C-S or TT) before any vehicle is connected, and the RCD type the manufacturer specifies — household Type AC devices can be blinded by smooth DC leakage.',
  'circuit-15':
    'A PV array is live whenever light falls on it, and DC arcs do not self-extinguish the way AC arcs do. Isolate at the DC isolator before touching a connector, and remember a battery can deliver fault current far beyond what its size suggests.',
  'circuit-18':
    'Cooker circuits carry some of the highest currents in a home: terminations torque to specification and get re-checked after a heating cycle, because a loose connection here heats rather than trips. The cooker control unit must stay within reach of the appliance.',
  'circuit-19':
    'A generator must never back-feed the supply network — that can energise the incoming cable and kill a linesman working on it. Use an approved changeover arrangement, and earth the generator to its own rod so its protective devices have a fault path.',
  'circuit-20':
    'Arc-fault devices reduce a fire risk ordinary breakers cannot see; they do not remove it. Loose terminations, damaged flexible cords and overloaded adaptors still start fires — AFDDs are additional protection, not a substitute for sound wiring.',
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
