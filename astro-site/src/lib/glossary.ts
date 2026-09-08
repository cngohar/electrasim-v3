/**
 * Guide glossary.
 *
 * Every circuit walkthrough, component page and safety note throws around
 * abbreviations — Zs, CPC, Type A, TN-C-S — that a beginner has no way to look
 * up. This module is that lookup table, and it does double duty: `termsIn()`
 * scans a piece of guide prose and returns the terms it uses, which is what
 * builds the glossary chips on the walkthroughs and the "used in" links on
 * each glossary entry. The mesh is derived from the text, so it cannot drift
 * out of step with it.
 */

export type GlossaryTerm = {
  /** Anchor id and the fragment used in `/guide/glossary/#<slug>`. */
  slug: string;
  /** The term as it is written in a sentence, e.g. `Zs`. */
  term: string;
  /** What the abbreviation stands for, if it is one. */
  expansion?: string;
  /** Grouping on the glossary page — also the order the groups render in. */
  category: string;
  /** One to three sentences: what it is, and why anyone cares. */
  definition: string;
  /** Other spellings and abbreviations to match on when scanning prose. */
  aliases?: string[];
  /** Related terms, by slug. */
  see?: string[];
  /**
   * Where to send a reader when no guide page uses the term yet — a calculator
   * or a walkthrough that covers the same ground. Hand-written, unlike `see`,
   * so it is only set where the link genuinely helps.
   */
  pointer?: { label: string; href: string };
};

const CATEGORY = {
  earthing: 'Earthing & bonding',
  protection: 'Protection',
  testing: 'Testing',
  sizing: 'Cables & sizing',
  circuits: 'Circuits & loads',
  lowVoltage: 'Low voltage & generation',
} as const;

export const GLOSSARY: GlossaryTerm[] = [
  /* ── Earthing & bonding ─────────────────────────────────────────────────── */
  {
    slug: 'cpc',
    term: 'CPC',
    expansion: 'circuit protective conductor',
    category: CATEGORY.earthing,
    definition:
      'The earth conductor that runs with the live conductors of a final circuit, so that a fault to exposed metal has a low-impedance path back to the source. Its size is not a guess: it is either the same as the live conductors up to 16 mm² or worked out from the adiabatic equation, whichever applies.',
    aliases: ['circuit protective conductor', 'earth conductor', 'earth wire', 'CPCs'],
    see: ['earthing-systems', 'adiabatic', 'zs'],
  },
  {
    slug: 'earthing-systems',
    term: 'TT, TN-S and TN-C-S',
    expansion: 'earthing arrangements',
    category: CATEGORY.earthing,
    definition:
      'How the installation is earthed, in the standard two-letter code: the first letter is the supply earth (T = one point directly earthed), the second is the exposed metalwork (T = its own earth electrode, N = connected to the supply earth). TN-S has a separate earth all the way back; TN-C-S (PME) combines earth and neutral in the distributor’s cable and splits them at your cut-out; TT relies on your own earth rod.',
    aliases: ['TN-C-S', 'TN-S', 'PME', 'earthing arrangement', 'earth fault loop'],
    see: ['pen', 'ra', 'earth-electrode', 'ze'],
  },
  {
    slug: 'pen',
    term: 'PEN conductor',
    expansion: 'combined protective and neutral conductor',
    category: CATEGORY.earthing,
    definition:
      'A single conductor doing the job of both protective earth and neutral, used by the distributor on a TN-C-S supply up to the point where it splits at your cut-out. If that combined conductor breaks, every earthed metal part in the installation rises towards live — which is why a lost PEN on an EV charge point or a caravan supply has to disconnect all poles, earth included.',
    aliases: ['PEN', 'combined neutral and earth', 'open PEN'],
    see: ['earthing-systems'],
    pointer: { label: 'EV charger circuit', href: '/guide/circuits/ev-charger-circuit/' },
  },
  {
    slug: 'ra',
    term: 'Ra',
    expansion: 'earth electrode resistance',
    category: CATEGORY.earthing,
    definition:
      'The resistance of the earth electrode itself, measured in ohms at the electrode with the supply disconnected. On a TT installation Ra has to be low enough that the whole earth fault loop still lets the RCD trip, because there is no metallic path back to the source to do the work.',
    aliases: ['earth electrode resistance', 'rod resistance'],
    see: ['earth-electrode', 'earthing-systems', 'zs'],
    pointer: { label: 'Generator backup supply', href: '/guide/circuits/generator-backup-supply/' },
  },
  {
    slug: 'earth-electrode',
    term: 'Earth electrode',
    category: CATEGORY.earthing,
    definition:
      'A rod, plate, tape or buried foundation connection that puts the installation in contact with the general mass of earth. TT installations depend on one; TN installations may add one for an outbuilding, a generator or an EV charge point whose supply is not safe to export.',
    aliases: ['earth rod', 'electrode'],
    see: ['ra', 'earthing-systems'],
  },
  {
    slug: 'bonding',
    term: 'Bonding',
    expansion: 'protective bonding',
    category: CATEGORY.earthing,
    definition:
      'Connecting exposed metalwork and extraneous conductive parts — water pipe, gas pipe, structural steel — together so they cannot sit at different potentials during a fault. Main bonding joins them to the installation earth at the origin; supplementary bonding does the same locally in a bathroom or a swimming pool where the risk is higher.',
    aliases: ['protective bonding', 'main bonding', 'supplementary bonding', 'equipotential'],
    see: ['cpc', 'earthing-systems'],
  },

  /* ── Protection ─────────────────────────────────────────────────────────── */
  {
    slug: 'rcd',
    term: 'RCD',
    expansion: 'residual current device',
    category: CATEGORY.protection,
    definition:
      'Compares the current leaving on live with the current returning on neutral and opens if they differ — the difference is current leaking to earth, possibly through a person. A 30 mA RCD is the standard additional protection for socket outlets and most final circuits, and it trips on leakage, not on overload.',
    aliases: ['residual current device', 'RCDs'],
    see: ['rcd-types', 'rcbo', 'idn'],
  },
  {
    slug: 'rcd-types',
    term: 'RCD types AC, A, F and B',
    category: CATEGORY.protection,
    definition:
      'What waveform of leakage the device can actually see. Type AC detects smooth sinusoidal AC only and is being phased out; Type A also detects pulsating DC from electronics and is the normal choice; Type F adds mixed frequencies from variable-speed drives; Type B detects smooth DC as well, and is what an EV charge point or a PV inverter usually calls for.',
    aliases: ['Type AC', 'Type A', 'Type F', 'Type B', 'RCD type', 'RCD types'],
    see: ['rcd', 'idn'],
  },
  {
    slug: 'idn',
    term: 'IΔn',
    expansion: 'rated residual operating current',
    category: CATEGORY.protection,
    definition:
      'The leakage current at which an RCD is designed to trip — 30 mA for additional protection against shock, 100 mA or more for fire protection or for selectivity between devices. The device must trip at IΔn and must not trip at half of it, which is exactly what an RCD tester checks.',
    aliases: ['rated residual operating current', 'tripping current', '30 mA'],
    see: ['rcd', 'rcd-types'],
  },
  {
    slug: 'rcbo',
    term: 'RCBO',
    expansion: 'residual current circuit breaker with overcurrent protection',
    category: CATEGORY.protection,
    definition:
      'An MCB and an RCD in one module, so a fault on one circuit trips that circuit alone instead of the whole board. It also sidesteps the shared-neutral problem that makes a group RCD trip when you least expect it, which is why modern boards are mostly RCBOs.',
    aliases: ['residual current circuit breaker', 'RCBOs'],
    see: ['rcd', 'mcb'],
  },
  {
    slug: 'mcb',
    term: 'MCB',
    expansion: 'miniature circuit breaker',
    category: CATEGORY.protection,
    definition:
      'The overcurrent device in a modern board: a thermal element for overload and a magnetic element for short circuits, both in one module rated in amps. It protects the cable, not the person — that is what the RCD half of the circuit is for.',
    aliases: ['miniature circuit breaker', 'MCBs', 'breaker', 'circuit breaker'],
    see: ['mcb-curves', 'rcbo', 'breaking-capacity'],
  },
  {
    slug: 'mcb-curves',
    term: 'Type B, C and D curves',
    expansion: 'overcurrent instantaneous tripping characteristics',
    category: CATEGORY.protection,
    definition:
      'How much overcurrent the magnetic trip needs before it opens instantly. Type B trips at 3–5 times its rating and covers general sockets and lighting; Type C needs 5–10 times and tolerates the switch-on surge of motors, transformers and LED drivers; Type D needs 10–20 times and is reserved for heavy inrush such as a large motor starting direct-on-line or an X-ray set.',
    aliases: [
      'Type B curve',
      'Type C curve',
      'Type D curve',
      'Type D',
      'Type C',
      'instantaneous trip',
    ],
    see: ['mcb', 'inrush'],
  },
  {
    slug: 'breaking-capacity',
    term: 'Breaking capacity',
    category: CATEGORY.protection,
    definition:
      'The largest fault current a protective device can interrupt safely without destroying itself — stamped on the device in kA, commonly 6 kA for domestic and 10 kA or more near a large transformer. If the prospective fault current at the board is higher than the device rating, the device can explode rather than clear the fault.',
    aliases: ['kA rating', 'rupture capacity', 'Icn'],
    see: ['fault-current', 'mcb'],
  },
  {
    slug: 'afdd',
    term: 'AFDD',
    expansion: 'arc fault detection device',
    category: CATEGORY.protection,
    definition:
      'Samples the current waveform and looks for the signature of an electric arc — the crackle of a loose terminal or a damaged flex — then opens the circuit before the arc starts a fire. It sees the faults an MCB is too slow for and an RCD is blind to, because a series arc is just a normal load current as far as either of them is concerned.',
    aliases: ['arc fault detection device', 'arc fault', 'AFDDs'],
    see: ['mcb', 'rcd'],
  },
  {
    slug: 'discrimination',
    term: 'Discrimination',
    expansion: 'selectivity',
    category: CATEGORY.protection,
    definition:
      'Designing protective devices so that the one nearest the fault operates and everything upstream stays closed. Get it right and a fault in a bedroom socket trips one RCBO; get it wrong and it takes out the whole house while the faulty circuit is still energised.',
    aliases: ['selectivity', 'discriminating'],
    see: ['rcbo', 'mcb-curves'],
  },
  {
    slug: 'fault-current',
    term: 'Prospective fault current',
    expansion: 'PFC',
    category: CATEGORY.protection,
    definition:
      'The current that would flow if live were connected solidly to earth or to neutral at a given point — highest at the origin of the installation, lower at the far end of a long cable. Every protective device in the installation must have a breaking capacity at least equal to the PFC at the point it is fitted.',
    aliases: ['prospective fault current', 'PFC', 'prospective short-circuit current', 'PSCC'],
    see: ['breaking-capacity', 'zs'],
    pointer: { label: 'Consumer unit panel', href: '/guide/circuits/consumer-unit-panel/' },
  },

  /* ── Testing ────────────────────────────────────────────────────────────── */
  {
    slug: 'zs',
    term: 'Zs',
    expansion: 'earth fault loop impedance',
    category: CATEGORY.testing,
    definition:
      'The total impedance of the path an earth fault current takes: the source, the live conductor out, and the CPC back. It has to be low enough that the fault current trips the protective device within the required time — typically 0.4 s for a 230 V final circuit — which is why every Zs reading is checked against a maximum value from the tables rather than judged on its own.',
    aliases: ['earth fault loop impedance', 'loop impedance', 'Zs value'],
    see: ['ze', 'r1r2', 'fault-current'],
  },
  {
    slug: 'ze',
    term: 'Ze',
    expansion: 'external earth fault loop impedance',
    category: CATEGORY.testing,
    definition:
      'The part of the loop that belongs to the distributor — transformer, supply cable, cut-out — measured at the origin with the installation disconnected. Everything downstream adds to it: Zs = Ze + (R1 + R2).',
    aliases: ['external earth fault loop impedance', 'external loop impedance'],
    see: ['zs', 'r1r2', 'earthing-systems'],
  },
  {
    slug: 'r1r2',
    term: 'R1 + R2',
    category: CATEGORY.testing,
    definition:
      'The resistance of the live conductor (R1) plus the circuit protective conductor (R2), measured end to end with the two joined at the far end. Added to Ze it gives Zs without a live loop test, which is how ring final circuits are verified and how long circuits are checked where a loop tester would struggle.',
    aliases: ['R1+R2', 'R1 and R2', 'R2'],
    see: ['zs', 'ze', 'ring-final'],
  },
  {
    slug: 'insulation-resistance',
    term: 'Insulation resistance',
    category: CATEGORY.testing,
    definition:
      'A test at 500 V between conductors, and between each conductor and earth, with loads disconnected — reading in megohms. Anything at or below 1 MΩ on a 230 V circuit is a fail and needs investigating, and a reading taken through surge-protected or electronic equipment means nothing at all.',
    aliases: ['insulation resistance', 'IR test', 'megger'],
    see: ['continuity', 'polarity'],
  },
  {
    slug: 'continuity',
    term: 'Continuity',
    category: CATEGORY.testing,
    definition:
      'Proving a conductor is complete end to end and that its resistance is what the cable length predicts. It is the first dead test on any circuit, because it finds the open CPC and the loose terminal that every later test would quietly misread.',
    aliases: ['continuity test', 'dead test'],
    see: ['r1r2', 'polarity', 'safe-isolation'],
  },
  {
    slug: 'polarity',
    term: 'Polarity',
    category: CATEGORY.testing,
    definition:
      'Confirming that every switch and protective device is in the live conductor and that socket connections are the right way round. A lamp holder with the switch in the neutral works perfectly and still leaves the fitting live with the switch off.',
    aliases: ['polarity test', 'correct polarity'],
    see: ['continuity', 'safe-isolation'],
  },
  {
    slug: 'safe-isolation',
    term: 'Safe isolation',
    category: CATEGORY.testing,
    definition:
      'The full sequence: identify the circuit, switch off and lock off, prove the tester on a known source, prove the circuit dead, test the tester again on the known source. Skipping the re-prove step is how people test with a meter that stopped working halfway through the job.',
    aliases: ['safe isolation', 'prove dead', 'lock off', 'isolate'],
    see: ['continuity', 'polarity'],
  },

  /* ── Cables & sizing ────────────────────────────────────────────────────── */
  {
    slug: 'current-carrying-capacity',
    term: 'Iz',
    expansion: 'current-carrying capacity',
    category: CATEGORY.sizing,
    definition:
      'The current a cable can carry continuously in its installed conditions without exceeding its temperature rating. It is not a fixed property of the cable: the tabulated value is corrected for ambient temperature, grouping with other cables, thermal insulation and the protective device, which is why 2.5 mm² can be rated 20 A in one place and 13 A in another.',
    aliases: ['current-carrying capacity', 'Iz', 'cable rating', 'rating factor'],
    see: ['voltage-drop', 'adiabatic'],
    pointer: { label: 'Cable size calculator', href: '/tools/cable-size-calculator/' },
  },
  {
    slug: 'voltage-drop',
    term: 'Voltage drop',
    category: CATEGORY.sizing,
    definition:
      'The volts lost along the cable because of its resistance, given as a percentage of the supply: 3 % for lighting and 5 % for other circuits from the origin. Long runs, undersized conductors and high currents all push it up, and the lamp dimming at the far end of a run is usually voltage drop rather than a fault.',
    aliases: ['voltage drop', 'volts drop', 'Vdrop'],
    see: ['current-carrying-capacity'],
    pointer: { label: 'Voltage drop calculator', href: '/tools/voltage-drop-calculator/' },
  },
  {
    slug: 'adiabatic',
    term: 'Adiabatic equation',
    category: CATEGORY.sizing,
    definition:
      'The calculation that checks a conductor can survive a fault: it relates the cross-sectional area to the fault current, the disconnection time and a constant for the conductor material. If the CPC comes out smaller than the live conductors, the equation is what decides whether that is actually allowed.',
    aliases: ['adiabatic', 'thermal constraint', 'S ='],
    see: ['cpc', 'fault-current'],
    pointer: { label: 'Cable size calculator', href: '/tools/cable-size-calculator/' },
  },
  {
    slug: 'diversity',
    term: 'Diversity',
    category: CATEGORY.sizing,
    definition:
      'Sizing a cable or a supply for what will realistically be on at once, not for the sum of everything plugged in. The rule of thumb that lets a 32 A ring serve a dozen sockets works because a house does not run every appliance simultaneously — and it is also the assumption a cooker circuit relies on, which is why a cooker control unit’s 13 A socket is not a spare socket for the kettle.',
    aliases: ['diversity', 'maximum demand', 'after diversity'],
    see: ['current-carrying-capacity', 'ring-final'],
  },

  /* ── Circuits & loads ───────────────────────────────────────────────────── */
  {
    slug: 'ring-final',
    term: 'Ring final circuit',
    category: CATEGORY.circuits,
    definition:
      'A 32 A circuit wired as a loop from the board and back to it, so every socket is fed from both directions and the current shares between two paths. It is the standard UK arrangement for general-purpose sockets, and it is the one circuit that needs its own set of tests to prove the ring is intact and no spur has been taken off it illegally.',
    aliases: ['ring final circuit', 'ring circuit', 'ring main'],
    see: ['radial', 'r1r2'],
    pointer: { label: 'RCD socket circuit', href: '/guide/circuits/rcd-socket-circuit/' },
  },
  {
    slug: 'radial',
    term: 'Radial circuit',
    category: CATEGORY.circuits,
    definition:
      'Every cable leaves the board and ends at the last point on the circuit — the opposite of a ring. Simpler to test and easier to protect, which is why radial circuits are the usual choice for kitchens, cookers, EV charge points and anywhere the load is known and fixed.',
    aliases: ['radial circuit', 'radials'],
    see: ['ring-final'],
    pointer: { label: 'RCD socket circuit', href: '/guide/circuits/rcd-socket-circuit/' },
  },
  {
    slug: 'strapper',
    term: 'Strapper',
    expansion: 'switch wire',
    category: CATEGORY.circuits,
    definition:
      'The two conductors running between the two switches in two-way lighting, carrying either live or the switched live depending on which switch was last thrown. They are live conductors in every sense, so they need the same brown or marked sleeving as any other — and a two-way circuit is the classic place where an unmarked strap wire gets mistaken for a neutral.',
    aliases: ['strappers', 'switch wire', 'two-way strapper'],
    see: ['switched-live'],
  },
  {
    slug: 'switched-live',
    term: 'Switched live',
    category: CATEGORY.circuits,
    definition:
      'The conductor that leaves a switch and only becomes live when the switch is on — the feed to a lamp, a PIR’s output or a fan. Confusing it with a permanent live is the reason a fitting can appear dead at the switch yet still be live at the ceiling rose.',
    aliases: ['switched live', 'SL', 'load live'],
    see: ['strapper'],
  },
  {
    slug: 'inrush',
    term: 'Inrush current',
    category: CATEGORY.circuits,
    definition:
      'The brief surge a load takes when it switches on — a motor drawing six times its running current, a transformer saturating, an LED driver charging its capacitors. It is not a fault, but it is what decides whether the circuit can use a Type B breaker or needs Type C.',
    aliases: ['inrush', 'starting current', 'switch-on surge'],
    see: ['mcb-curves', 'dol'],
  },
  {
    slug: 'dol',
    term: 'DOL starter',
    expansion: 'direct-on-line starter',
    category: CATEGORY.circuits,
    definition:
      'The simplest way to start a motor: a contactor puts the full supply straight across the windings. It gives maximum starting torque for the least equipment, and it also gives the largest inrush — which is why bigger motors use star-delta or a soft starter instead.',
    aliases: ['direct-on-line', 'DOL', 'direct on line'],
    see: ['inrush', 'mcb-curves'],
  },

  /* ── Low voltage & generation ───────────────────────────────────────────── */
  {
    slug: 'selv',
    term: 'SELV',
    expansion: 'separated extra-low voltage',
    category: CATEGORY.lowVoltage,
    definition:
      'An extra-low voltage system — 50 V AC or 120 V DC or less — that is electrically separated from earth and from higher-voltage circuits, so a single fault cannot give a shock. It is why garden lighting, bathroom fittings and bell transformers can be touched safely live, and why the separation has to be maintained right back to the transformer.',
    aliases: ['separated extra-low voltage', 'SELV', 'PELV', 'extra-low voltage', 'ELV'],
    see: ['bonding'],
  },
  {
    slug: 'voc',
    term: 'Voc',
    expansion: 'open-circuit voltage',
    category: CATEGORY.lowVoltage,
    definition:
      'A PV module’s voltage with no load connected, and the figure that decides how many modules can go in series before the string exceeds the inverter’s maximum input voltage. It rises as the cells get colder, so a string sized on the standard test conditions can over-volt the inverter on a bright frosty morning.',
    aliases: ['open-circuit voltage', 'Voc', 'open circuit voltage'],
    see: ['bypass-diode'],
  },
  {
    slug: 'bypass-diode',
    term: 'Bypass diode',
    category: CATEGORY.lowVoltage,
    definition:
      'A diode across each string of cells inside a PV module’s junction box. When part of the module is shaded the diode conducts around it, so the rest keeps producing instead of the shaded cells dissipating power as heat — the hotspot that permanently damages a module.',
    aliases: ['bypass diodes', 'bypass diode'],
    see: ['voc'],
  },
];

/** Categories in the order they should render. */
export const GLOSSARY_CATEGORIES = [
  CATEGORY.earthing,
  CATEGORY.protection,
  CATEGORY.testing,
  CATEGORY.sizing,
  CATEGORY.circuits,
  CATEGORY.lowVoltage,
];

/** Word-boundary matcher per term, built once. */
const matchers = GLOSSARY.map((term) => {
  const needles = [term.term, ...(term.aliases ?? [])].filter(Boolean);
  const pattern = needles
    .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'))
    .sort((a, b) => b.length - a.length)
    .join('|');
  return { term, re: new RegExp(`(?:^|[^\\w-])(?:${pattern})(?:[^\\w-]|$)`, 'i') };
});

/**
 * Terms mentioned in a piece of guide prose, in glossary order.
 *
 * Matching is deliberately loose — it casts a wide net and it is fine for a
 * chip row to miss an incidental mention. What it must not do is claim a term
 * appears when it does not, so matching is on word boundaries only.
 */
export function termsIn(text: string): GlossaryTerm[] {
  if (!text) return [];
  const haystack = text.replace(/<[^>]+>/g, ' ');
  return matchers.filter(({ re }) => re.test(haystack)).map(({ term }) => term);
}

/** True when the text mentions a term, by slug. */
export function mentions(text: string, slug: string): boolean {
  return termsIn(text).some((t) => t.slug === slug);
}
