/**
 * Research data for the comparison bench.
 *
 * Scores are task-fit signals (0-5), not performance benchmarks. Every
 * competitor claim is paired with a first-party source and a review date on
 * the page so the copy can be audited when a provider changes its product.
 */

export const benchReviewedIso = '2026-09-04';
export const benchReviewedLabel = '4 September 2026';

export type BenchLevel = 'strong' | 'useful' | 'limited' | 'not-confirmed';

export type BenchDimensionId =
  | 'wiring'
  | 'analysis'
  | 'teaching'
  | 'sharing'
  | 'offline'
  | 'access';

export interface BenchSource {
  label: string;
  url: string;
}

export interface BenchSignal {
  level: BenchLevel;
  note: string;
}

export interface BenchTool {
  id: string;
  name: string;
  shortName: string;
  category: 'wiring' | 'analysis' | 'teaching' | 'open';
  categoryLabel: string;
  accent: 'blue' | 'amber' | 'green' | 'coral';
  officialUrl: string;
  tagline: string;
  accessLine: string;
  summary: string;
  status?: string;
  scores: Record<BenchDimensionId, number>;
  signals: Record<BenchDimensionId, BenchSignal>;
  sources: BenchSource[];
}

export interface BenchFaq {
  question: string;
  answer: string;
}

export const benchDimensions: Array<{
  id: BenchDimensionId;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    id: 'wiring',
    label: 'Practical wiring',
    shortLabel: 'Wiring',
    description: 'Domestic installation parts, conductors, protection and fault logic.',
  },
  {
    id: 'analysis',
    label: 'Numeric analysis',
    shortLabel: 'Analysis',
    description: 'SPICE, waveform, frequency or instrument-style analysis.',
  },
  {
    id: 'teaching',
    label: 'Guided teaching',
    shortLabel: 'Teaching',
    description: 'Lessons, examples, assignments or a structured learning path.',
  },
  {
    id: 'sharing',
    label: 'Share and export',
    shortLabel: 'Sharing',
    description: 'Links, public circuits, classroom hand-off or file export.',
  },
  {
    id: 'offline',
    label: 'Offline path',
    shortLabel: 'Offline',
    description: 'A documented way to keep working without a live web session.',
  },
  {
    id: 'access',
    label: 'Low-friction start',
    shortLabel: 'Access',
    description: 'How quickly a learner can reach a useful first circuit.',
  },
];

const signal = (level: BenchLevel, note: string): BenchSignal => ({ level, note });

export const benchTools: BenchTool[] = [
  {
    id: 'electrasim',
    name: 'ElectraSim',
    shortName: 'ElectraSim',
    category: 'wiring',
    categoryLabel: 'Installation-first',
    accent: 'blue',
    officialUrl: 'https://electrasim.com/app/',
    tagline: 'Practical household and installation wiring in a browser.',
    accessLine: 'Free, no account, installable PWA',
    summary:
      'ElectraSim starts with the objects and conductor roles learners meet on a real domestic board: protection, switching, sockets, loads, line, neutral and earth. Its simulator makes energised paths and common wiring faults visible without requiring live equipment.',
    scores: { wiring: 5, analysis: 2, teaching: 5, sharing: 5, offline: 5, access: 5 },
    signals: {
      wiring: signal(
        'strong',
        'MCBs, RCDs, RCBOs, switches, sockets, conductors and faults are the product centre.',
      ),
      analysis: signal(
        'limited',
        'Topology and fault behaviour are modelled; it is not a SPICE solver or calibrated instrument.',
      ),
      teaching: signal(
        'strong',
        'Guided circuits, challenge mode, diagnosis work and a browser-first learning flow.',
      ),
      sharing: signal('strong', 'Local autosave plus JSON, SVG, PNG and shareable circuit URLs.'),
      offline: signal(
        'strong',
        'The installable web app can continue offline after the first successful visit.',
      ),
      access: signal(
        'strong',
        'The simulator opens directly with no sign-up or subscription gate.',
      ),
    },
    sources: [
      { label: 'ElectraSim product overview', url: 'https://electrasim.com/' },
      { label: 'ElectraSim simulator', url: 'https://electrasim.com/app/' },
      { label: 'ElectraSim simulator guide', url: 'https://electrasim.com/guide/' },
      { label: 'ElectraSim privacy policy', url: 'https://electrasim.com/privacy/' },
    ],
  },
  {
    id: 'mechsimulator',
    name: 'MechSimulator House Wiring',
    shortName: 'MechSimulator',
    category: 'wiring',
    categoryLabel: 'Direct wiring rival',
    accent: 'amber',
    officialUrl: 'https://mechsimulator.com/tools/electrical-wiring/',
    tagline: 'A free domestic wiring trainer with live loads and protection.',
    accessLine: 'Free browser tool; account not required for the public workbench',
    summary:
      'MechSimulator is the closest like-for-like browser competitor in this review. Its public page describes consumer units, realistic multicore cables, ring and radial circuits, switch layouts, cable sizing, voltage drop and verification checks.',
    scores: { wiring: 5, analysis: 3, teaching: 4, sharing: 4, offline: 1, access: 5 },
    signals: {
      wiring: signal(
        'strong',
        'The product page explicitly covers consumer units, MCB/RCD/RCBO protection, cables, sockets and domestic layouts.',
      ),
      analysis: signal(
        'useful',
        'It documents live voltage drop, current, power and verification readouts rather than full electronics analysis.',
      ),
      teaching: signal(
        'useful',
        'Examples, a user guide, quizzes and an electrician-style verification workflow are documented.',
      ),
      sharing: signal(
        'useful',
        'The workbench advertises share, save and open controls; the public page does not define a cloud permission model.',
      ),
      offline: signal(
        'not-confirmed',
        'The public product page does not document an offline or installable mode.',
      ),
      access: signal(
        'strong',
        'The public tool is presented as a free, directly usable browser simulator.',
      ),
    },
    sources: [
      {
        label: 'House Wiring Simulator',
        url: 'https://mechsimulator.com/tools/electrical-wiring/',
      },
      {
        label: 'House wiring simulator guide',
        url: 'https://mechsimulator.com/blog/articles/electrical-wiring-simulator-house-circuit-guide/',
      },
      { label: 'MechSimulator home', url: 'https://mechsimulator.com/' },
    ],
  },
  {
    id: 'uk-electrical-sim',
    name: 'UK Electrical SIM',
    shortName: 'UK Electrical SIM',
    category: 'wiring',
    categoryLabel: 'Domestic training',
    accent: 'green',
    officialUrl: 'https://www.electricalsim.com/',
    tagline: 'Account-based domestic layout and testing practice.',
    accessLine: 'Free limited tier; full access is subscription-based',
    summary:
      'UK Electrical SIM is aimed directly at domestic training. Its current public site presents a Domestic SIM with final-testing work, plus off-grid and fault-finding areas marked as in progress or under development.',
    scores: { wiring: 4, analysis: 2, teaching: 4, sharing: 1, offline: 1, access: 2 },
    signals: {
      wiring: signal(
        'strong',
        'Domestic layouts, components, testing and troubleshooting are the stated product direction.',
      ),
      analysis: signal(
        'limited',
        'The public overview is about training workflows, not numerical electronics or SPICE analysis.',
      ),
      teaching: signal(
        'useful',
        'Mode-led practice and progress-oriented account access are documented.',
      ),
      sharing: signal(
        'not-confirmed',
        'The public pages reviewed do not confirm project sharing or file export.',
      ),
      offline: signal(
        'not-confirmed',
        'No offline mode is documented on the public landing or subscription pages.',
      ),
      access: signal(
        'limited',
        'Registration is part of the workflow, with a limited tier and a paid full-access tier.',
      ),
    },
    sources: [
      { label: 'UK Electrical SIM overview', url: 'https://www.electricalsim.com/' },
      {
        label: 'UK Electrical SIM subscription',
        url: 'https://www.electricalsim.com/Subscription/subscription',
      },
      { label: 'UK Electrical SIM about page', url: 'https://www.electricalsim.com/About/about' },
    ],
  },
  {
    id: 'circuitlab',
    name: 'CircuitLab',
    shortName: 'CircuitLab',
    category: 'analysis',
    categoryLabel: 'Engineering analysis',
    accent: 'coral',
    officialUrl: 'https://www.circuitlab.com/',
    tagline: 'Schematic capture and analog/digital circuit analysis.',
    accessLine: 'Free textbook and trial paths; paid memberships for expanded use',
    summary:
      'CircuitLab is the analysis-heavy option in this set. Its official material describes in-browser schematic capture, DC, time-domain and frequency-domain simulation, mixed-mode circuits, configurable plots and presentation-quality exports.',
    scores: { wiring: 1, analysis: 5, teaching: 4, sharing: 5, offline: 1, access: 3 },
    signals: {
      wiring: signal(
        'limited',
        'Its documented purpose is general electronic system design, not installation wiring conventions.',
      ),
      analysis: signal(
        'strong',
        'DC, time-domain, frequency-domain, mixed-mode simulation and signal plotting are documented.',
      ),
      teaching: signal(
        'useful',
        'A free interactive electronics textbook and student memberships support learning.',
      ),
      sharing: signal(
        'strong',
        'Unique circuit URLs and PDF, PNG, EPS and SVG schematic exports are documented.',
      ),
      offline: signal(
        'limited',
        'The reviewed official pages describe a browser service; no full offline workflow is promised.',
      ),
      access: signal(
        'useful',
        'A visitor can inspect the free textbook and try paths, while larger work is membership-based.',
      ),
    },
    sources: [
      { label: 'CircuitLab product overview', url: 'https://www.circuitlab.com/' },
      { label: 'CircuitLab documentation', url: 'https://www.circuitlab.com/docs/' },
      {
        label: 'CircuitLab memberships',
        url: 'https://www.circuitlab.com/accounts/upgrade/academic/',
      },
    ],
  },
  {
    id: 'everycircuit',
    name: 'EveryCircuit',
    shortName: 'EveryCircuit',
    category: 'analysis',
    categoryLabel: 'Animated electronics',
    accent: 'coral',
    officialUrl: 'https://everycircuit.com/',
    tagline: 'Animated analog and digital simulation across web and mobile.',
    accessLine: 'Free tier; paid unlocks for larger circuits and all platforms',
    summary:
      'EveryCircuit focuses on immediacy: animated current and voltage, real-time controls, analog and digital components, and an oscilloscope. It is a strong visual electronics companion, not an installation-wiring trainer.',
    scores: { wiring: 1, analysis: 4, teaching: 3, sharing: 4, offline: 2, access: 3 },
    signals: {
      wiring: signal(
        'limited',
        'The official positioning is analog and digital electronics rather than domestic installation work.',
      ),
      analysis: signal(
        'useful',
        'Real-time simulation, signal animation and dynamic oscilloscope views are documented.',
      ),
      teaching: signal(
        'useful',
        'Public circuits and visual examples make it approachable for exploration.',
      ),
      sharing: signal(
        'useful',
        'A public circuit gallery and public/private sharing model are described.',
      ),
      offline: signal(
        'limited',
        'Mobile apps exist, but a full browser-offline workflow is not documented.',
      ),
      access: signal(
        'useful',
        'The free tier is easy to try, with a five-component limit for own circuits.',
      ),
    },
    sources: [
      { label: 'EveryCircuit product and pricing', url: 'https://everycircuit.com/' },
      { label: 'EveryCircuit conduct and sharing', url: 'https://everycircuit.com/conduct' },
    ],
  },
  {
    id: 'falstad',
    name: 'Falstad / CircuitJS1',
    shortName: 'Falstad',
    category: 'open',
    categoryLabel: 'Open circuit theory',
    accent: 'green',
    officialUrl: 'https://www.falstad.com/circuit/',
    tagline: 'Free, open circuit exploration with a deep example library.',
    accessLine: 'Free hosted simulator plus standalone offline builds',
    summary:
      'Falstad makes circuit behaviour legible through moving current dots, voltage colours, switches, scopes and editable examples. It is unusually frictionless for theory exploration, while its interface is not organised around domestic installation practice.',
    scores: { wiring: 1, analysis: 4, teaching: 4, sharing: 5, offline: 5, access: 5 },
    signals: {
      wiring: signal(
        'limited',
        'The official overview describes an electronic circuit simulator, not installation-specific parts or wiring rules.',
      ),
      analysis: signal(
        'useful',
        'Animated current/voltage, scopes and editable component parameters support circuit-theory analysis.',
      ),
      teaching: signal(
        'useful',
        'A large built-in Circuits menu and example library make it effective for demonstrations.',
      ),
      sharing: signal(
        'strong',
        'Circuit description files and shareable circuit links are documented.',
      ),
      offline: signal('strong', 'The official page links to standalone offline versions.'),
      access: signal('strong', 'The hosted simulator opens directly and is free and open source.'),
    },
    sources: [
      { label: 'Falstad Circuit Simulator', url: 'https://www.falstad.com/circuit/' },
      {
        label: 'Falstad simulator overview',
        url: 'https://www.falstad.com/circuit/doc/overview.html',
      },
      { label: 'CircuitJS1 source repository', url: 'https://github.com/pfalstad/circuitjs1' },
    ],
  },
  {
    id: 'tinkercad',
    name: 'Tinkercad Circuits',
    shortName: 'Tinkercad',
    category: 'teaching',
    categoryLabel: 'Classroom electronics',
    accent: 'amber',
    officialUrl: 'https://www.tinkercad.com/circuits',
    tagline: 'Breadboards, microcontrollers and beginner coding projects.',
    accessLine: 'Free web app; account, class or education access manages work',
    summary:
      'Tinkercad Circuits is the natural choice when the lesson is about breadboards, Arduino, micro:bit or code. Its broad education ecosystem is a strength, but consumer-unit protection and live-neutral-earth installation logic are outside its stated focus.',
    scores: { wiring: 1, analysis: 2, teaching: 5, sharing: 4, offline: 1, access: 4 },
    signals: {
      wiring: signal(
        'limited',
        'Its official circuits pages position it around electronics, breadboards and coding rather than house wiring.',
      ),
      analysis: signal(
        'limited',
        'Useful simulation for beginner electronics, without the deeper analysis scope of SPICE tools.',
      ),
      teaching: signal(
        'strong',
        'Free lessons, classroom workflows and beginner-friendly electronics education are central.',
      ),
      sharing: signal(
        'useful',
        'Classroom and public-design workflows are part of the Tinkercad ecosystem.',
      ),
      offline: signal(
        'limited',
        'The reviewed official pages describe a web app; offline editing is not confirmed.',
      ),
      access: signal(
        'useful',
        'The app is free to use, though saved work and classes are account-managed.',
      ),
    },
    sources: [
      { label: 'Tinkercad Circuits', url: 'https://www.tinkercad.com/circuits' },
      { label: 'Tinkercad learning hub', url: 'https://www.tinkercad.com/learn/circuits' },
      { label: 'Tinkercad classrooms', url: 'https://www.tinkercad.com/classrooms' },
    ],
  },
  {
    id: 'dcaclab',
    name: 'DCACLab',
    shortName: 'DCACLab',
    category: 'teaching',
    categoryLabel: 'Managed virtual lab',
    accent: 'amber',
    officialUrl: 'https://dcaclab.com/',
    tagline: 'Breadboards, instruments and classroom assignments in one lab.',
    accessLine: 'Account-based trial and paid individual or classroom plans',
    summary:
      'DCACLab combines an electronics workbench with meters, a three-channel oscilloscope, public circuits and explicit classroom assignments. That institutional layer is valuable when a teacher needs workflow and progress, but it adds account and subscription overhead.',
    scores: { wiring: 2, analysis: 4, teaching: 5, sharing: 4, offline: 1, access: 2 },
    signals: {
      wiring: signal(
        'useful',
        'It teaches practical electronics and breadboard work; domestic installation is not the stated centre.',
      ),
      analysis: signal(
        'useful',
        'Oscilloscope, meters, RMS and real-time simulation features are documented.',
      ),
      teaching: signal(
        'strong',
        'Assignments, classrooms and student-progress workflows are explicit product features.',
      ),
      sharing: signal(
        'useful',
        'Public circuits and hosted simulations can be shared with others.',
      ),
      offline: signal(
        'limited',
        'The public product and pricing pages describe an online lab; offline use is not confirmed.',
      ),
      access: signal(
        'limited',
        'The lab is account-based, with a trial and paid plans for continued use.',
      ),
    },
    sources: [
      { label: 'DCACLab online simulator', url: 'https://dcaclab.com/' },
      { label: 'DCACLab features', url: 'https://dcaclab.com/en/features' },
      { label: 'DCACLab pricing', url: 'https://dcaclab.com/en/pricing-table' },
    ],
  },
  {
    id: 'multisim-live',
    name: 'Multisim Live',
    shortName: 'Multisim Live',
    category: 'analysis',
    categoryLabel: 'SPICE and lessons',
    accent: 'coral',
    officialUrl: 'https://www.multisim.com/',
    tagline: 'Online SPICE simulation with a published end-of-life date.',
    accessLine: 'Free online tier with account; service scheduled to shut down 15 Sep 2026',
    summary:
      'Multisim Live is worth including because it is a familiar SPICE-and-teaching reference, but its own current banner says the online simulator will shut down on 15 September 2026 as the future moves to desktop Multisim.',
    status: 'Transition notice published: 15 September 2026',
    scores: { wiring: 1, analysis: 5, teaching: 4, sharing: 4, offline: 0, access: 2 },
    signals: {
      wiring: signal(
        'limited',
        'The official product is an online SPICE electronics simulator, not an installation-wiring trainer.',
      ),
      analysis: signal(
        'strong',
        'SPICE simulation, schematic capture and circuit analysis are the stated purpose.',
      ),
      teaching: signal(
        'useful',
        'Featured circuits, lessons and community content support classroom exploration.',
      ),
      sharing: signal(
        'useful',
        'Public circuits and community discovery are documented while the service remains live.',
      ),
      offline: signal(
        'limited',
        'The online service is not an offline product; desktop transition is separate.',
      ),
      access: signal(
        'limited',
        'A free sign-up path exists, but the published shutdown date changes the practical choice.',
      ),
    },
    sources: [
      { label: 'Multisim Live official site', url: 'https://www.multisim.com/' },
      {
        label: 'Multisim Live end-of-life notice',
        url: 'https://support.digilent.com/hc/en-us/articles/41178584173979-Multisim-Live-EOL-Letter',
      },
    ],
  },
];

export const benchFaqs: BenchFaq[] = [
  {
    question: 'Which simulator is the closest match for practical house wiring?',
    answer:
      'ElectraSim and MechSimulator are the closest browser matches in this review. UK Electrical SIM is also directly aimed at domestic training, but its current workflow is account-based and several modes are marked as in progress. The right choice depends on whether you value an instant, offline-capable PWA or a broader verification-oriented workbench.',
  },
  {
    question: 'Why are the scores not an overall ranking?',
    answer:
      'A SPICE simulator, a breadboard classroom and a domestic wiring trainer solve different problems. The six signals on this page describe fit for a specific task, based on what each provider publishes. They do not measure solver accuracy, speed, or product quality against a common benchmark.',
  },
  {
    question: 'Is ElectraSim a replacement for CircuitLab or Multisim?',
    answer:
      'No. ElectraSim is the more direct fit for practical installation wiring, protection and fault reasoning. CircuitLab and Multisim are better aligned with engineering schematics, SPICE-style analysis and plots. Multisim Live is also publishing a September 2026 shutdown notice, so check the current desktop transition before starting a new course around it.',
  },
  {
    question: 'Can any of these tools certify a real installation?',
    answer:
      'No. A simulator is an educational or design aid, not proof of compliance or safe isolation. Real work still needs competent design, manufacturer instructions, the applicable regulations, inspection, calibrated testing and professional judgement.',
  },
];

export const benchSourceCount = benchTools.reduce((total, tool) => total + tool.sources.length, 0);
