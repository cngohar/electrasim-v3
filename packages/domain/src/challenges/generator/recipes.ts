/**
 * Circuit recipes — the shared foundation (plan §8).
 *
 * "Do NOT randomly connect every available component. That would produce
 * meaningless or invalid circuits. Instead, create known valid circuit recipes
 * and randomize parameters inside them."
 *
 * Each recipe is a small, hand-verified wiring pattern whose *parameters* the
 * seeded RNG varies: which load, which protective device and rating, which
 * switch family, how many branches, cable sizes, run lengths and row order.
 *
 * Every component type referenced here was verified present in
 * `COMPONENT_DEFS`. Types that do NOT exist in this registry — `buzzer`,
 * `motor-1phase`, `transformer-step-down` — are deliberately absent (plan §8:
 * "Do not assume a component exists merely because it is mentioned in this
 * plan").
 *
 * ── Electrical envelope ────────────────────────────────────────────────────
 * Three production validators constrain what a *generated* circuit may
 * contain. These are not new rules; they are the existing rules read
 * carefully (see ADR 0002):
 *
 *  1. `circuitValidation.ts` compares each protective device against the
 *     conductors it actually sits on, and every generated wire declares its own
 *     `customCableMm2` — so the In ≤ Iz check here reads real data. Generated
 *     circuits stay inside {@link PROTECTION_RATING_CEILING_AMPS} because that
 *     matches a domestic final circuit, not because the validator needs them to.
 *     (It used to: a wire with a `lengthMeters` was costed at 1.5 mm² whatever
 *     it declared, so any device above 20 A raised `mcb_overrated_group`.)
 *  2. The same module treats a load as "undersized" unless its cable matches
 *     its recommendation, so every component carries an explicit
 *     `customCableMm2`.
 *  3. `simulate.ts` compares one circuit-wide load current against every
 *     protective device and every energised wire, so the recipes only use
 *     low-current loads (≤ 65 W each).
 */

import type { DifficultyProfile } from '../difficulty/profiles';
import type { ChallengeDifficulty, RecipeParameterSnapshot } from '../types';
import type { Rng } from './seed';
import { type NodeRef, type TopologyBuilder, createTopologyBuilder } from './topology';

/**
 * Highest protective-device rating a generated circuit may use.
 *
 * BS 7671 domestic final circuits sit at 6/10/16/20 A, so that is the envelope
 * these recipes target. Devices whose registry rating exceeds this (`rcd` 80 A,
 * `main-switch` 100 A, `mcb-type-c` 32 A, `isolator-switch` 100 A) are outside
 * the Phase A envelope.
 *
 * Raised deliberately, not because the validator forces it: generated wires
 * declare their conductor size, and `circuitValidation.ts` now reads that
 * declaration instead of assuming 1.5 mm². Lifting the ceiling is a difficulty
 * decision, not a bug fix.
 */
export const PROTECTION_RATING_CEILING_AMPS = 20;

/** Cable cross-sections used by generated circuits, by conductor role. */
export const CABLE_MM2 = {
  /** Lighting final circuits — BS 7671 1.5 mm² T&E. */
  lighting: 1.5,
  /** Socket / power final circuits — 2.5 mm² T&E. */
  power: 2.5,
  /** Sub-main feed between supply, protection and distribution. */
  feed: 2.5,
} as const;

// ── Component palettes (all verified present in COMPONENT_DEFS) ────────────

const LIGHTING_LOADS = ['bulb', 'bulb-incandescent', 'led-downlight', 'tube-light'] as const;
const FAN_LOADS = ['ceiling-fan', 'extractor-fan'] as const;
const SOUNDER_LOADS = ['bell'] as const;
const SOCKET_TYPES = ['socket-3pin', 'double-socket', 'switched-socket'] as const;
const SIMPLE_SWITCHES = ['single-way-switch', 'timer-switch'] as const;
const LIVE_ONLY_PROTECTION = ['mcb', 'fuse'] as const;

/**
 * Representative connected load for a generated socket outlet, in watts.
 *
 * The registry rates socket outlets at their *maximum* capacity (2990 W /
 * 3120 W — a fully loaded 13 A plug). `compliance.ts` treats that rating as a
 * continuous demand when it estimates voltage drop, which is far harsher than
 * BS 7671 Appendix A diversity for a domestic final circuit. Generated
 * circuits therefore declare an explicit, diversified connected load so the
 * outlet behaves like a realistic teaching example rather than a worst-case
 * design study.
 */
const SOCKET_DIVERSIFIED_WATTS = [200, 500, 800] as const;

/** Ratings each live-only protective device may take, capped by the ceiling. */
const PROTECTION_RATINGS: Record<string, readonly number[]> = {
  mcb: [6, 10, 16, 20],
  fuse: [13],
  rcbo: [16, 20],
};

// ── Recipe context ─────────────────────────────────────────────────────────

export interface RecipeContext {
  rng: Rng;
  profile: DifficultyProfile;
  /** Unique prefix for every component / wire id in this circuit. */
  prefix: string;
}

export interface RecipeBuild {
  builder: TopologyBuilder;
  /** Human summary reflecting the parameters actually chosen. */
  summary: string;
  loadComponentIds: string[];
  protectionComponentIds: string[];
  switchComponentIds: string[];
  supplyComponentIds: string[];
  /** Loads expected to be energised with the generated default states. */
  expectedEnergisedLoadIds: string[];
  parameters: RecipeParameterSnapshot;
}

export interface ChallengeRecipe {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  topic: string;
  teaches: string;
  expectedBehaviour: string;
  /** Relative selection weight within its difficulty tier. */
  weight: number;
  build(context: RecipeContext): RecipeBuild;
}

// ── Wiring helper ──────────────────────────────────────────────────────────

/**
 * Thin wrapper over {@link TopologyBuilder} that remembers each component's
 * cable size and derives per-wire run lengths from the difficulty profile.
 */
class Wiring {
  readonly builder: TopologyBuilder;
  private readonly rng: Rng;
  private readonly profile: DifficultyProfile;
  private readonly cableByComponent = new Map<string, number>();
  private linkCounter = 0;

  constructor(context: RecipeContext) {
    this.builder = createTopologyBuilder(context.prefix);
    this.rng = context.rng;
    this.profile = context.profile;
  }

  node(options: {
    localId: string;
    type: string;
    column: number;
    row: number;
    cableMm2: number;
    state?: Record<string, unknown>;
  }): NodeRef {
    const ref = this.builder.add({
      localId: options.localId,
      type: options.type,
      column: options.column,
      row: options.row,
      state: { ...(options.state ?? {}), customCableMm2: options.cableMm2 },
    });
    this.cableByComponent.set(ref.id, options.cableMm2);
    return ref;
  }

  /** Wire two ports; cable size is the thinner of the two endpoints. */
  link(from: NodeRef, fromPort: number, to: NodeRef, toPort: number): string {
    const cableMm2 = Math.min(
      this.cableByComponent.get(from.id) ?? CABLE_MM2.power,
      this.cableByComponent.get(to.id) ?? CABLE_MM2.power,
    );
    const { min, max } = this.profile.runLengthMeters;
    const wire = this.builder.connect({
      localId: `${this.linkCounter++}`,
      from,
      fromPort,
      to,
      toPort,
      lengthMeters: this.rng.float(min, max),
      cableMm2,
    });
    return wire.id;
  }
}

// ── Shared fragments ───────────────────────────────────────────────────────

interface SupplyNodes {
  live: NodeRef;
  neutral: NodeRef;
  earth?: NodeRef;
  ids: string[];
}

/** Live + neutral supply terminals, optionally an earth terminal. */
function addSupply(wiring: Wiring, options: { withEarth: boolean; rows: number }): SupplyNodes {
  const live = wiring.node({
    localId: 'supply-live',
    type: 'live-terminal',
    column: 0,
    row: 0,
    cableMm2: CABLE_MM2.feed,
  });
  const returnPath = wiring.node({
    localId: 'supply-return',
    type: 'neutral-terminal',
    column: 0,
    row: Math.max(1, options.rows - 1),
    cableMm2: CABLE_MM2.feed,
  });
  const ids = [live.id, returnPath.id];

  let earth: NodeRef | undefined;
  if (options.withEarth) {
    earth = wiring.node({
      localId: 'supply-earth',
      type: 'earth-terminal',
      column: 0,
      row: Math.max(2, options.rows),
      cableMm2: CABLE_MM2.power,
    });
    ids.push(earth.id);
  }

  return { live, neutral: returnPath, earth, ids };
}

/** Pick a live-only protective device (`mcb` / `fuse`) and its rating. */
function addLiveProtection(
  wiring: Wiring,
  rng: Rng,
  options: { localId: string; column: number; row: number; type?: string },
): { node: NodeRef; type: string; ratingAmps: number } {
  const type = options.type ?? rng.pick(LIVE_ONLY_PROTECTION);
  const ratingAmps = rng.pick(PROTECTION_RATINGS[type] ?? [16]);
  const node = wiring.node({
    localId: options.localId,
    type,
    column: options.column,
    row: options.row,
    cableMm2: CABLE_MM2.feed,
    state: { on: true, customMaxAmps: ratingAmps },
  });
  return { node, type, ratingAmps };
}

/** Add a double-pole RCBO (live + neutral in/out) for socket branches. */
function addRcbo(
  wiring: Wiring,
  rng: Rng,
  options: { localId: string; column: number; row: number },
): { node: NodeRef; ratingAmps: number } {
  const ratingAmps = rng.pick(PROTECTION_RATINGS.rcbo ?? [16]);
  const node = wiring.node({
    localId: options.localId,
    type: 'rcbo',
    column: options.column,
    row: options.row,
    cableMm2: CABLE_MM2.power,
    state: { on: true, customMaxAmps: ratingAmps, rcdType: 'A' },
  });
  return { node, ratingAmps };
}

/**
 * Add a socket outlet with a diversified connected load.
 *
 * See {@link SOCKET_DIVERSIFIED_WATTS} for why the registry's full 13 A
 * rating is not used directly.
 */
function addSocket(
  wiring: Wiring,
  rng: Rng,
  options: { localId: string; column: number; row: number },
): { node: NodeRef; type: string; watts: number } {
  const type = rng.pick(SOCKET_TYPES);
  const watts = rng.pick(SOCKET_DIVERSIFIED_WATTS);
  const node = wiring.node({
    localId: options.localId,
    type,
    column: options.column,
    row: options.row,
    cableMm2: CABLE_MM2.power,
    state: { on: true, customPowerWatts: watts },
  });
  return { node, type, watts };
}

function humanLabel(type: string): string {
  return type
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

// ── Beginner recipes ───────────────────────────────────────────────────────

const beginnerProtectedLoad: ChallengeRecipe = {
  id: 'beginner-protected-load',
  title: 'Protected Load',
  difficulty: 'beginner',
  topic: 'Live and neutral paths',
  teaches: 'A load only works when it has both a protected live feed and a neutral return.',
  expectedBehaviour: 'The load energises as soon as the circuit is simulated.',
  weight: 1,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: false, rows: 2 });
    const protection = addLiveProtection(wiring, rng, {
      localId: 'protect',
      column: 1,
      row: 0,
    });
    const loadType = rng.pick([...LIGHTING_LOADS, ...FAN_LOADS, ...SOUNDER_LOADS]);
    const load = wiring.node({
      localId: 'load',
      type: loadType,
      column: 2,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, protection.node, 0);
    wiring.link(protection.node, 1, load, 0);
    wiring.link(supply.neutral, 0, load, 1);

    return {
      builder: wiring.builder,
      summary: `A ${humanLabel(loadType)} fed through a ${protection.ratingAmps} A ${humanLabel(protection.type)}, with a direct neutral return.`,
      loadComponentIds: [load.id],
      protectionComponentIds: [protection.node.id],
      switchComponentIds: [],
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [load.id],
      parameters: {
        loadType,
        protectionType: protection.type,
        protectionRatingAmps: protection.ratingAmps,
      },
    };
  },
};

const beginnerSwitchedLight: ChallengeRecipe = {
  id: 'beginner-switched-light',
  title: 'Switched Lighting Point',
  difficulty: 'beginner',
  topic: 'Switching the live conductor',
  teaches: 'The switch belongs in the live conductor; neutral returns straight to the load.',
  expectedBehaviour:
    'With the switch closed the lamp lights; opening it breaks only the live feed.',
  weight: 1.4,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: false, rows: 2 });
    const protection = addLiveProtection(wiring, rng, {
      localId: 'protect',
      column: 1,
      row: 0,
      type: 'mcb',
    });
    const switchType = rng.pick(SIMPLE_SWITCHES);
    const switchNode = wiring.node({
      localId: 'control',
      type: switchType,
      column: 2,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true },
    });
    const loadType = rng.pick(LIGHTING_LOADS);
    const load = wiring.node({
      localId: 'lamp',
      type: loadType,
      column: 3,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, protection.node, 0);
    wiring.link(protection.node, 1, switchNode, 0);
    wiring.link(switchNode, 1, load, 0);
    wiring.link(supply.neutral, 0, load, 1);

    return {
      builder: wiring.builder,
      summary: `A ${humanLabel(loadType)} controlled by a ${humanLabel(switchType)} on the live conductor, protected by a ${protection.ratingAmps} A MCB.`,
      loadComponentIds: [load.id],
      protectionComponentIds: [protection.node.id],
      switchComponentIds: [switchNode.id],
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [load.id],
      parameters: {
        loadType,
        switchType,
        protectionRatingAmps: protection.ratingAmps,
      },
    };
  },
};

const beginnerProtectedSocket: ChallengeRecipe = {
  id: 'beginner-protected-socket',
  title: 'RCBO-Protected Socket',
  difficulty: 'beginner',
  topic: 'Socket outlets and earthing',
  teaches:
    'A socket outlet needs live, neutral AND a protective earth, behind ≤30 mA residual protection.',
  expectedBehaviour: 'The outlet sits live and earthed with the RCBO closed.',
  weight: 1,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: true, rows: 2 });
    const rcbo = addRcbo(wiring, rng, { localId: 'rcbo', column: 1, row: 0 });
    const outlet = addSocket(wiring, rng, { localId: 'outlet', column: 2, row: 0 });
    const socket = outlet.node;

    wiring.link(supply.live, 0, rcbo.node, 0);
    wiring.link(supply.neutral, 0, rcbo.node, 1);
    wiring.link(rcbo.node, 2, socket, 0);
    wiring.link(rcbo.node, 3, socket, 1);
    if (supply.earth) wiring.link(supply.earth, 0, socket, 2);

    return {
      builder: wiring.builder,
      summary: `A ${humanLabel(outlet.type)} on a ${rcbo.ratingAmps} A RCBO, with the protective earth bonded back to the main earth terminal.`,
      loadComponentIds: [socket.id],
      protectionComponentIds: [rcbo.node.id],
      switchComponentIds: outlet.type === 'switched-socket' ? [socket.id] : [],
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [socket.id],
      parameters: {
        socketType: outlet.type,
        socketWatts: outlet.watts,
        rcboRatingAmps: rcbo.ratingAmps,
      },
    };
  },
};

const beginnerBellPush: ChallengeRecipe = {
  id: 'beginner-bell-push',
  title: 'Bell Push Circuit',
  difficulty: 'beginner',
  topic: 'Momentary switching',
  teaches: 'A push button makes the live path only while it is held closed.',
  expectedBehaviour: 'Holding the push button sounds the bell; releasing it silences the bell.',
  weight: 0.8,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: false, rows: 2 });
    const protection = addLiveProtection(wiring, rng, {
      localId: 'protect',
      column: 1,
      row: 0,
    });
    const button = wiring.node({
      localId: 'push',
      type: 'push-button',
      column: 2,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true },
    });
    const bell = wiring.node({
      localId: 'sounder',
      type: 'bell',
      column: 3,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, protection.node, 0);
    wiring.link(protection.node, 1, button, 0);
    wiring.link(button, 1, bell, 0);
    wiring.link(supply.neutral, 0, bell, 1);

    return {
      builder: wiring.builder,
      summary: `A bell driven by a momentary push button behind a ${protection.ratingAmps} A ${humanLabel(protection.type)}.`,
      loadComponentIds: [bell.id],
      protectionComponentIds: [protection.node.id],
      switchComponentIds: [button.id],
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [bell.id],
      parameters: {
        protectionType: protection.type,
        protectionRatingAmps: protection.ratingAmps,
      },
    };
  },
};

// ── Intermediate recipes ───────────────────────────────────────────────────

const intermediateTwoWayLighting: ChallengeRecipe = {
  id: 'intermediate-two-way-lighting',
  title: 'Two-Way Staircase Lighting',
  difficulty: 'intermediate',
  topic: 'Two-way switching',
  teaches: 'Two changeover switches share a pair of strappers so either can toggle the lamp.',
  expectedBehaviour:
    'With both switches selecting the same strapper the lamp lights; flipping either one breaks the path.',
  weight: 1.2,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: false, rows: 2 });
    const protection = addLiveProtection(wiring, rng, {
      localId: 'protect',
      column: 1,
      row: 0,
      type: 'mcb',
    });
    const first = wiring.node({
      localId: 'switch-a',
      type: 'two-way-switch',
      column: 2,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true },
    });
    const second = wiring.node({
      localId: 'switch-b',
      type: 'two-way-switch',
      column: 3,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true },
    });
    const loadType = rng.pick(LIGHTING_LOADS);
    const load = wiring.node({
      localId: 'lamp',
      type: loadType,
      column: 4,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, protection.node, 0);
    wiring.link(protection.node, 1, first, 0);
    // Strappers: L1↔L1 and L2↔L2.
    wiring.link(first, 1, second, 1);
    wiring.link(first, 2, second, 2);
    wiring.link(second, 0, load, 0);
    wiring.link(supply.neutral, 0, load, 1);

    return {
      builder: wiring.builder,
      summary: `A ${humanLabel(loadType)} switched from two positions through a pair of strappers, protected by a ${protection.ratingAmps} A MCB.`,
      loadComponentIds: [load.id],
      protectionComponentIds: [protection.node.id],
      switchComponentIds: [first.id, second.id],
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [load.id],
      parameters: { loadType, protectionRatingAmps: protection.ratingAmps },
    };
  },
};

const intermediateBranchedLighting: ChallengeRecipe = {
  id: 'intermediate-branched-lighting',
  title: 'Branched Lighting Circuit',
  difficulty: 'intermediate',
  topic: 'Parallel branches from a junction',
  teaches: 'Loads in parallel each need their own switched live and their own neutral return.',
  expectedBehaviour: 'Both lighting points energise independently of one another.',
  weight: 1.2,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: false, rows: 3 });
    const protection = addLiveProtection(wiring, rng, {
      localId: 'protect',
      column: 1,
      row: 1,
      type: 'mcb',
    });
    const junctionType = rng.pick(['junction-box', 'wago-connector'] as const);
    const junction = wiring.node({
      localId: 'hub',
      type: junctionType,
      column: 2,
      row: 1,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, protection.node, 0);
    wiring.link(protection.node, 1, junction, 0);

    const branchCount = 2;
    const loadIds: string[] = [];
    const switchIds: string[] = [];
    const loadTypes: string[] = [];

    for (let branch = 0; branch < branchCount; branch++) {
      const switchType = rng.pick(SIMPLE_SWITCHES);
      const switchNode = wiring.node({
        localId: `control-${branch}`,
        type: switchType,
        column: 3,
        row: branch,
        cableMm2: CABLE_MM2.lighting,
        state: { on: true },
      });
      const loadType = rng.pick(LIGHTING_LOADS);
      const load = wiring.node({
        localId: `lamp-${branch}`,
        type: loadType,
        column: 4,
        row: branch,
        cableMm2: CABLE_MM2.lighting,
      });

      // junction-box outputs are ports 1..3; wago-connector outputs are 1..2.
      wiring.link(junction, branch + 1, switchNode, 0);
      wiring.link(switchNode, 1, load, 0);
      wiring.link(supply.neutral, 0, load, 1);

      loadIds.push(load.id);
      switchIds.push(switchNode.id);
      loadTypes.push(loadType);
    }

    return {
      builder: wiring.builder,
      summary: `Two switched lighting branches fanned out from a ${humanLabel(junctionType)} behind a ${protection.ratingAmps} A MCB.`,
      loadComponentIds: loadIds,
      protectionComponentIds: [protection.node.id],
      switchComponentIds: switchIds,
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: loadIds,
      parameters: {
        junctionType,
        branchCount,
        loadTypes: loadTypes.join('+'),
        protectionRatingAmps: protection.ratingAmps,
      },
    };
  },
};

const intermediateSocketAndLight: ChallengeRecipe = {
  id: 'intermediate-socket-and-light',
  title: 'Socket and Lighting Branch',
  difficulty: 'intermediate',
  topic: 'Mixed final circuits',
  teaches:
    'A residual device protects both the socket and the lighting spur taken from the same feed.',
  expectedBehaviour: 'The outlet is live and earthed, and the lamp lights with its switch closed.',
  weight: 1,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: true, rows: 3 });
    const rcbo = addRcbo(wiring, rng, { localId: 'rcbo', column: 1, row: 1 });

    const outlet = addSocket(wiring, rng, { localId: 'outlet', column: 3, row: 0 });
    const socket = outlet.node;

    const switchType = rng.pick(SIMPLE_SWITCHES);
    const switchNode = wiring.node({
      localId: 'control',
      type: switchType,
      column: 2,
      row: 1,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true },
    });
    const loadType = rng.pick(LIGHTING_LOADS);
    const load = wiring.node({
      localId: 'lamp',
      type: loadType,
      column: 3,
      row: 1,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, rcbo.node, 0);
    wiring.link(supply.neutral, 0, rcbo.node, 1);
    // Live side fans out from the RCBO output to both the outlet and the spur.
    wiring.link(rcbo.node, 2, socket, 0);
    wiring.link(rcbo.node, 2, switchNode, 0);
    wiring.link(switchNode, 1, load, 0);
    // Neutral side likewise.
    wiring.link(rcbo.node, 3, socket, 1);
    wiring.link(rcbo.node, 3, load, 1);
    if (supply.earth) wiring.link(supply.earth, 0, socket, 2);

    return {
      builder: wiring.builder,
      summary: `A ${humanLabel(outlet.type)} and a switched ${humanLabel(loadType)} spur sharing a ${rcbo.ratingAmps} A RCBO.`,
      loadComponentIds: [socket.id, load.id],
      protectionComponentIds: [rcbo.node.id],
      switchComponentIds:
        outlet.type === 'switched-socket' ? [switchNode.id, socket.id] : [switchNode.id],
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [socket.id, load.id],
      parameters: {
        socketType: outlet.type,
        socketWatts: outlet.watts,
        switchType,
        loadType,
        rcboRatingAmps: rcbo.ratingAmps,
      },
    };
  },
};

const intermediateFanRegulator: ChallengeRecipe = {
  id: 'intermediate-fan-regulator',
  title: 'Fan and Speed Regulator',
  difficulty: 'intermediate',
  topic: 'Load-specific controllers',
  teaches: 'A fan regulator may only control inductive fan loads — never lamps or sockets.',
  expectedBehaviour:
    'Legacy continuity observation: the fan has a closed live path through the regulator. Motor speed, power and dimming response are unassessed until the motor model is implemented.',
  weight: 0.9,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: false, rows: 2 });
    const protection = addLiveProtection(wiring, rng, {
      localId: 'protect',
      column: 1,
      row: 0,
      type: 'mcb',
    });
    const isolator = wiring.node({
      localId: 'control',
      type: 'single-way-switch',
      column: 2,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true },
    });
    const speed = rng.int(1, 5);
    const regulator = wiring.node({
      localId: 'regulator',
      type: 'fan-dimmer',
      column: 3,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true, speed },
    });
    const fanType = rng.pick(FAN_LOADS);
    const fan = wiring.node({
      localId: 'fan',
      type: fanType,
      column: 4,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, protection.node, 0);
    wiring.link(protection.node, 1, isolator, 0);
    wiring.link(isolator, 1, regulator, 0);
    wiring.link(regulator, 1, fan, 0);
    wiring.link(supply.neutral, 0, fan, 1);

    return {
      builder: wiring.builder,
      summary: `A ${humanLabel(fanType)} on a speed regulator at setting ${speed}, isolated by a wall switch behind a ${protection.ratingAmps} A MCB.`,
      loadComponentIds: [fan.id],
      protectionComponentIds: [protection.node.id],
      switchComponentIds: [isolator.id, regulator.id],
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [fan.id],
      parameters: { fanType, speed, protectionRatingAmps: protection.ratingAmps },
    };
  },
};

const intermediateTimedLighting: ChallengeRecipe = {
  id: 'intermediate-timed-lighting',
  title: 'Timed Lighting with Local Override',
  difficulty: 'intermediate',
  topic: 'Series control devices',
  teaches: 'Control devices in series each have to be closed before the load can energise.',
  expectedBehaviour: 'The lamp lights only when both the timer and the local switch are closed.',
  weight: 0.9,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: false, rows: 2 });
    const protection = addLiveProtection(wiring, rng, {
      localId: 'protect',
      column: 1,
      row: 0,
    });
    const timer = wiring.node({
      localId: 'timer',
      type: 'timer-switch',
      column: 2,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true },
    });
    const override = wiring.node({
      localId: 'override',
      type: 'single-way-switch',
      column: 3,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true },
    });
    const loadType = rng.pick(LIGHTING_LOADS);
    const load = wiring.node({
      localId: 'lamp',
      type: loadType,
      column: 4,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, protection.node, 0);
    wiring.link(protection.node, 1, timer, 0);
    wiring.link(timer, 1, override, 0);
    wiring.link(override, 1, load, 0);
    wiring.link(supply.neutral, 0, load, 1);

    return {
      builder: wiring.builder,
      summary: `A ${humanLabel(loadType)} in series with a timer and a local override switch, behind a ${protection.ratingAmps} A ${humanLabel(protection.type)}.`,
      loadComponentIds: [load.id],
      protectionComponentIds: [protection.node.id],
      switchComponentIds: [timer.id, override.id],
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [load.id],
      parameters: {
        loadType,
        protectionType: protection.type,
        protectionRatingAmps: protection.ratingAmps,
      },
    };
  },
};

// ── Advanced recipes ───────────────────────────────────────────────────────

const advancedDistributionBoard: ChallengeRecipe = {
  id: 'advanced-distribution-board',
  title: 'Consumer Unit with Protected Branches',
  difficulty: 'advanced',
  topic: 'Distribution and sub-circuits',
  teaches: 'A consumer unit splits one incoming supply into individually protected final circuits.',
  expectedBehaviour: 'Every final circuit energises independently through its own branch device.',
  weight: 1.2,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const branchCount = rng.int(2, 3);
    const supply = addSupply(wiring, { withEarth: false, rows: branchCount + 1 });

    const main = addLiveProtection(wiring, rng, {
      localId: 'main',
      column: 1,
      row: 0,
      type: 'mcb',
    });
    const board = wiring.node({
      localId: 'board',
      type: 'distribution-board',
      column: 2,
      row: 0,
      cableMm2: CABLE_MM2.feed,
    });

    wiring.link(supply.live, 0, main.node, 0);
    wiring.link(main.node, 1, board, 0);
    wiring.link(supply.neutral, 0, board, 1);

    const loadIds: string[] = [];
    const switchIds: string[] = [];
    const protectionIds = [main.node.id];
    const loadTypes: string[] = [];

    for (let branch = 0; branch < branchCount; branch++) {
      const branchProtection = addLiveProtection(wiring, rng, {
        localId: `branch-protect-${branch}`,
        column: 3,
        row: branch,
        type: 'mcb',
      });
      const switchType = rng.pick(SIMPLE_SWITCHES);
      const switchNode = wiring.node({
        localId: `branch-control-${branch}`,
        type: switchType,
        column: 4,
        row: branch,
        cableMm2: CABLE_MM2.lighting,
        state: { on: true },
      });
      const loadType = rng.pick([...LIGHTING_LOADS, ...FAN_LOADS]);
      const load = wiring.node({
        localId: `branch-load-${branch}`,
        type: loadType,
        column: 5,
        row: branch,
        cableMm2: CABLE_MM2.lighting,
      });

      // Live outputs are ports 2..4; neutral outputs are ports 5..6, so the
      // third branch shares the second neutral bar terminal.
      wiring.link(board, 2 + branch, branchProtection.node, 0);
      wiring.link(branchProtection.node, 1, switchNode, 0);
      wiring.link(switchNode, 1, load, 0);
      wiring.link(board, 5 + Math.min(branch, 1), load, 1);

      loadIds.push(load.id);
      switchIds.push(switchNode.id);
      protectionIds.push(branchProtection.node.id);
      loadTypes.push(loadType);
    }

    return {
      builder: wiring.builder,
      summary: `A consumer unit fed through a ${main.ratingAmps} A main device, splitting into ${branchCount} individually protected and switched final circuits.`,
      loadComponentIds: loadIds,
      protectionComponentIds: protectionIds,
      switchComponentIds: switchIds,
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: loadIds,
      parameters: {
        branchCount,
        mainRatingAmps: main.ratingAmps,
        loadTypes: loadTypes.join('+'),
      },
    };
  },
};

const advancedMixedInstallation: ChallengeRecipe = {
  id: 'advanced-mixed-installation',
  title: 'Mixed Socket and Lighting Installation',
  difficulty: 'advanced',
  topic: 'Longer diagnostic paths',
  teaches:
    'Tracing a fault means following one branch at a time through shared protective devices.',
  expectedBehaviour:
    'The outlet is live and earthed while both lighting branches energise through their own switches.',
  weight: 1,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: true, rows: 3 });
    const rcbo = addRcbo(wiring, rng, { localId: 'rcbo', column: 1, row: 1 });

    const outlet = addSocket(wiring, rng, { localId: 'outlet', column: 4, row: 0 });
    const socket = outlet.node;

    const junctionType = rng.pick(['junction-box', 'wago-connector'] as const);
    const junction = wiring.node({
      localId: 'hub',
      type: junctionType,
      column: 2,
      row: 1,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, rcbo.node, 0);
    wiring.link(supply.neutral, 0, rcbo.node, 1);
    wiring.link(rcbo.node, 2, socket, 0);
    wiring.link(rcbo.node, 3, socket, 1);
    if (supply.earth) wiring.link(supply.earth, 0, socket, 2);
    wiring.link(rcbo.node, 2, junction, 0);

    const loadIds: string[] = [];
    const switchIds: string[] = [];
    const loadTypes: string[] = [];

    for (let branch = 0; branch < 2; branch++) {
      const switchType = rng.pick(SIMPLE_SWITCHES);
      const switchNode = wiring.node({
        localId: `control-${branch}`,
        type: switchType,
        column: 3,
        row: branch + 1,
        cableMm2: CABLE_MM2.lighting,
        state: { on: true },
      });
      const loadType = rng.pick(LIGHTING_LOADS);
      const load = wiring.node({
        localId: `lamp-${branch}`,
        type: loadType,
        column: 4,
        row: branch + 1,
        cableMm2: CABLE_MM2.lighting,
      });

      wiring.link(junction, branch + 1, switchNode, 0);
      wiring.link(switchNode, 1, load, 0);
      wiring.link(rcbo.node, 3, load, 1);

      loadIds.push(load.id);
      switchIds.push(switchNode.id);
      loadTypes.push(loadType);
    }

    return {
      builder: wiring.builder,
      summary: `A ${humanLabel(outlet.type)} plus two switched lighting branches distributed from a ${humanLabel(junctionType)}, all behind a ${rcbo.ratingAmps} A RCBO.`,
      loadComponentIds: [socket.id, ...loadIds],
      protectionComponentIds: [rcbo.node.id],
      switchComponentIds: outlet.type === 'switched-socket' ? [...switchIds, socket.id] : switchIds,
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [socket.id, ...loadIds],
      parameters: {
        socketType: outlet.type,
        socketWatts: outlet.watts,
        junctionType,
        loadTypes: loadTypes.join('+'),
        rcboRatingAmps: rcbo.ratingAmps,
      },
    };
  },
};

const advancedContactorControl: ChallengeRecipe = {
  id: 'advanced-contactor-control',
  title: 'Contactor-Controlled Lighting',
  difficulty: 'advanced',
  topic: 'Control circuits versus power circuits',
  teaches: 'A contactor separates a small control circuit from the power circuit it energises.',
  expectedBehaviour:
    'Closing the control switch energises the coil, and the contactor passes live through to the load.',
  weight: 0.9,
  build({ rng, profile, prefix }) {
    const wiring = new Wiring({ rng, profile, prefix });
    const supply = addSupply(wiring, { withEarth: false, rows: 3 });

    // Incoming device, then separately protected control and power circuits —
    // the arrangement a real panel uses so a coil fault cannot drop the load
    // circuit's protection and vice versa.
    const main = addLiveProtection(wiring, rng, {
      localId: 'main',
      column: 1,
      row: 1,
      type: 'mcb',
    });
    const controlFuse = addLiveProtection(wiring, rng, {
      localId: 'control-protect',
      column: 2,
      row: 0,
      type: 'fuse',
    });
    const powerProtection = addLiveProtection(wiring, rng, {
      localId: 'power-protect',
      column: 2,
      row: 1,
      type: 'mcb',
    });

    const controlSwitch = wiring.node({
      localId: 'control',
      type: rng.pick(SIMPLE_SWITCHES),
      column: 3,
      row: 0,
      cableMm2: CABLE_MM2.lighting,
      state: { on: true },
    });
    const contactor = wiring.node({
      localId: 'contactor',
      type: 'contactor-1p',
      column: 4,
      row: 1,
      cableMm2: CABLE_MM2.feed,
      state: { on: true },
    });
    const loadType = rng.pick([...LIGHTING_LOADS, ...FAN_LOADS]);
    const load = wiring.node({
      localId: 'load',
      type: loadType,
      column: 5,
      row: 1,
      cableMm2: CABLE_MM2.lighting,
    });
    const pilotType = rng.pick(LIGHTING_LOADS);
    const pilot = wiring.node({
      localId: 'pilot',
      type: pilotType,
      column: 5,
      row: 2,
      cableMm2: CABLE_MM2.lighting,
    });

    wiring.link(supply.live, 0, main.node, 0);
    wiring.link(main.node, 1, controlFuse.node, 0);
    wiring.link(main.node, 1, powerProtection.node, 0);

    // Control circuit: fuse → switch → coil A1, coil A2 → neutral.
    wiring.link(controlFuse.node, 1, controlSwitch, 0);
    wiring.link(controlSwitch, 1, contactor, 2);
    wiring.link(supply.neutral, 0, contactor, 3);

    // Power circuit: its own MCB → contactor pole → load.
    wiring.link(powerProtection.node, 1, contactor, 0);
    wiring.link(contactor, 1, load, 0);
    wiring.link(supply.neutral, 0, load, 1);

    // Pilot lamp proving the power circuit downstream of the contactor is live.
    wiring.link(contactor, 1, pilot, 0);
    wiring.link(supply.neutral, 0, pilot, 1);

    return {
      builder: wiring.builder,
      summary: `A ${humanLabel(loadType)} and a pilot lamp switched by a single-pole contactor, with the coil circuit on its own ${controlFuse.ratingAmps} A fuse and the power circuit on a ${powerProtection.ratingAmps} A MCB behind a ${main.ratingAmps} A main device.`,
      loadComponentIds: [load.id, pilot.id],
      protectionComponentIds: [main.node.id, controlFuse.node.id, powerProtection.node.id],
      switchComponentIds: [controlSwitch.id, contactor.id],
      supplyComponentIds: supply.ids,
      expectedEnergisedLoadIds: [load.id, pilot.id],
      parameters: {
        loadType,
        pilotType,
        mainRatingAmps: main.ratingAmps,
        controlFuseRatingAmps: controlFuse.ratingAmps,
        powerRatingAmps: powerProtection.ratingAmps,
      },
    };
  },
};

// ── Registry ───────────────────────────────────────────────────────────────

export const CHALLENGE_RECIPES: readonly ChallengeRecipe[] = [
  beginnerProtectedLoad,
  beginnerSwitchedLight,
  beginnerProtectedSocket,
  beginnerBellPush,
  intermediateTwoWayLighting,
  intermediateBranchedLighting,
  intermediateSocketAndLight,
  intermediateFanRegulator,
  intermediateTimedLighting,
  advancedDistributionBoard,
  advancedMixedInstallation,
  advancedContactorControl,
] as const;

export function getRecipesForDifficulty(
  difficulty: ChallengeDifficulty,
): readonly ChallengeRecipe[] {
  return CHALLENGE_RECIPES.filter((recipe) => recipe.difficulty === difficulty);
}

export function getRecipeById(id: string): ChallengeRecipe | undefined {
  return CHALLENGE_RECIPES.find((recipe) => recipe.id === id);
}

/** Deterministic, weighted recipe choice for a difficulty tier (plan §7). */
export function selectRecipe(rng: Rng, difficulty: ChallengeDifficulty): ChallengeRecipe {
  const candidates = getRecipesForDifficulty(difficulty);
  if (candidates.length === 0) {
    throw new Error(`No challenge recipes registered for difficulty "${difficulty}"`);
  }
  return rng.pickWeighted(
    candidates,
    candidates.map((recipe) => recipe.weight),
  );
}
