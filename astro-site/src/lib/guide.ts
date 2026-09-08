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
  .dev { fill:#f1f5f9; stroke:#334155; stroke-width:2.5; }
  .sym { fill:none; stroke:#1e293b; stroke-width:2.5; stroke-linecap:round; stroke-linejoin:round; }
  .dot { fill:#1e293b; }
  .term { fill:#ffffff; stroke:#334155; stroke-width:2.5; }
  .term-l { fill:#dc2626; stroke:#b91c1c; }
  .term-n { fill:#0f172a; stroke:#0f172a; }
  .term-e { fill:#059669; stroke:#047857; }
  .lbl { font-family: ui-monospace, Menlo, monospace; font-size:12px; fill:#475569; }
  .lblw { font-family: ui-monospace, Menlo, monospace; font-size:12px; fill:#1e293b; font-weight:700; }
  .lbl-l { fill:#dc2626; }
  .lbl-n { fill:#0f172a; }
  .lbl-e { fill:#047857; }
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
