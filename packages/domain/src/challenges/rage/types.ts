/**
 * Ohmageddon modifier interface (plan §25, §26; Phase E step 5).
 *
 * §25 is unambiguous about the architecture:
 *
 *     Do NOT create a separate Ohmageddon Generator.
 *     Use the same generator and add scenario modifiers.
 *
 * So there is no rage generator, no rage recipe set and no rage circuit model.
 * A rage scenario is an ordinary diagnosis scenario that a short, ordered list
 * of *composable modifiers* has been allowed to reshape at four well-defined
 * points in the existing build pipeline:
 *
 *   generateChallenge()            ← untouched, locked by §57
 *          ↓ healthy circuit
 *   ① transformCircuit             ← add red herrings, extra branches
 *          ↓ re-validated circuit
 *   ② rankCandidates               ← push the fault away from the symptom
 *   ②b selectFaults                ← add a second, independent fault
 *          ↓ chosen fault + measured symptom
 *   ③ adjustPresentation           ← ration hints, tighten the clock
 *          ↓
 *   DiagnosisScenario
 *
 * Every hook is optional, so a modifier declares only the stage it needs.
 *
 * ── The two rules that constrain every modifier ───────────────────────────
 *
 * 1. **Honesty (§26).** A modifier may make the puzzle harder; it may never
 *    make the simulation lie. Concretely: anything returned from
 *    `transformCircuit` is pushed back through the *same* `validateCandidate`
 *    gate the generator uses, and a transform that changes which loads are
 *    energised at baseline is discarded. "Rage against the circuit, not
 *    against physics."
 *
 * 2. **Determinism (§57 gate: "Ohmageddon modifiers are deterministic").**
 *    Every hook receives a forked, seeded {@link Rng} and nothing else that
 *    varies — no clock, no storage, no `Math.random`. Same seed + same tier ⇒
 *    same rage scenario, byte for byte.
 *
 * A modifier that cannot apply to a given circuit returns `null`. That is a
 * normal outcome, not an error: it is recorded in {@link RageApplication} so
 * the UI and the stress harness can see exactly which modifiers actually bit.
 */

import type { Circuit } from '../../types';
import type { DifficultyProfile } from '../difficulty/profiles';
import type { FaultCandidate } from '../faults/eligibility';
import type { Rng } from '../generator/seed';
import type { ChallengeDifficulty, GeneratedScenario } from '../types';

/**
 * The modifier vocabulary from plan §25.
 *
 * All seven names are declared here so the tier tables, the settings copy and
 * the tests share one spelling. Declaring a name is not the same as shipping
 * it — see {@link RageModifier.implemented} and §25's closing rule:
 * *"Only implement modifiers that can be supported truthfully by the current
 * simulator."*
 */
export type RageModifierId =
  | 'multiFault'
  | 'misleadingSymptom'
  | 'redHerring'
  | 'remoteFault'
  | 'limitedHints'
  | 'compoundFault'
  | 'timeLimit';

export const RAGE_MODIFIER_IDS: readonly RageModifierId[] = [
  'multiFault',
  'misleadingSymptom',
  'redHerring',
  'remoteFault',
  'limitedHints',
  'compoundFault',
  'timeLimit',
] as const;

// ---------------------------------------------------------------------------
// Shared context
// ---------------------------------------------------------------------------

/** Everything a modifier is allowed to know. Deliberately small. */
export interface RageContext {
  difficulty: ChallengeDifficulty;
  profile: DifficultyProfile;
  tier: RageTierId;
  /**
   * Deterministic randomness, already forked per modifier by the runner so
   * that adding or reordering modifiers cannot shift another one's stream.
   */
  rng: Rng;
}

// ---------------------------------------------------------------------------
// ① Circuit stage
// ---------------------------------------------------------------------------

export interface RageCircuitInput {
  /** The healthy, fully validated circuit straight from the generator. */
  circuit: Circuit;
  /** The recipe's own account of what the circuit contains. */
  scenario: GeneratedScenario;
}

/**
 * A circuit-stage result.
 *
 * The modifier returns the whole reshaped circuit rather than a diff, because
 * the caller re-validates it wholesale anyway — a partial patch would just be
 * a second representation of the same thing (§58).
 */
export interface RageCircuitPatch {
  circuit: Circuit;
  /**
   * Components added purely as decoys.
   *
   * These become *location options* the learner can point at, so the red
   * herring is a real suspect rather than set dressing — but they are never
   * eligible to host the injected fault. That is what makes them herrings.
   */
  decoyComponentIds: string[];
  /**
   * Wire ids that should be treated as legitimate fault candidates after the
   * transform. Splicing a device into a run replaces one wire with two, so the
   * recipe's original candidate list has to be rewritten or the scenario would
   * reference a wire that no longer exists.
   */
  faultCandidateWireIds: string[];
  /** One line for the debug/stress log. Never shown to the learner. */
  note: string;
}

// ---------------------------------------------------------------------------
// ② Candidate stage
// ---------------------------------------------------------------------------

export interface RageCandidateInput {
  circuit: Circuit;
  candidates: readonly FaultCandidate[];
  /** Declared loads — the things whose failure the learner actually notices. */
  loadComponentIds: readonly string[];
}

/**
 * A candidate-stage result: the same candidates, re-ordered and/or filtered.
 *
 * A modifier MUST NOT return an empty list — an empty list is indistinguishable
 * from "this circuit has no faults", which would silently disable the whole
 * scenario. The runner asserts this and ignores a modifier that breaks it.
 */
export interface RageCandidatePatch {
  candidates: FaultCandidate[];
  note: string;
}

// ---------------------------------------------------------------------------
// ②b Selection stage
// ---------------------------------------------------------------------------

/**
 * Input to the stage that decides *how many* faults the scenario carries.
 *
 * This stage exists because none of the other three can express "and another
 * one". `rankCandidates` re-orders a pool from which exactly one candidate is
 * then drawn; a modifier that wanted two faults could only ever have returned
 * a two-element pool and hoped, which is not a mechanism. So multi-fault is
 * its own hook, run *after* selection has produced the first fault, and it
 * proposes additions rather than replacing the choice.
 */
export interface RageSelectionInput {
  circuit: Circuit;
  /** The ranked pool the first fault was drawn from. */
  candidates: readonly FaultCandidate[];
  /**
   * Every eligible candidate, before `rankCandidates` narrowed the field.
   *
   * Needed because ranking is *deliberately* narrowing: `remoteFault` keeps
   * only the most distant band, and on a typical circuit that band is a
   * handful of wires around one node — all sharing a device, so a second fault
   * drawn from it would always be rejected as inseparable. The ranked pool is
   * still tried first (a remote second fault is a better puzzle); this is the
   * fallback that stops the two modifiers cancelling each other out.
   */
  pool: readonly FaultCandidate[];
  /** Already-chosen candidates, in the order they were chosen. */
  selected: readonly FaultCandidate[];
  /** Declared loads — the things whose failure the learner actually notices. */
  loadComponentIds: readonly string[];
}

/**
 * A selection-stage result: candidates to add *alongside* the existing ones.
 *
 * A modifier never removes or replaces an already-selected fault. The runner
 * additionally rejects any addition that duplicates a selected candidate or
 * sits at a location one already occupies — see {@link RageSelectionInput}.
 */
export interface RageSelectionPatch {
  additional: FaultCandidate[];
  note: string;
}

// ---------------------------------------------------------------------------
// ③ Presentation stage
// ---------------------------------------------------------------------------

/**
 * The learner-facing dials a modifier may turn.
 *
 * Note what is absent: nothing here can change the *symptom*. The symptom is
 * measured from two simulator runs (`diffSymptom`), and §26 forbids "random
 * symptoms unrelated to the actual circuit". `misleadingSymptom` works by
 * choosing a fault whose true measured symptom is misleading, not by
 * rewriting the text.
 */
export interface RagePresentation {
  /** Progressive hints (§17), possibly truncated. */
  hints: { level: 1 | 2 | 3; kind: 'observation' | 'direction' | 'location'; text: string }[];
  hintBudget: number;
  parTimeSeconds: number;
  /**
   * Optional countdown in seconds (§27 Rage 4). `null` means untimed.
   * `timeLimit` is the only modifier that writes this; every other tier
   * leaves it null.
   */
  timeLimitSeconds: number | null;
}

// ---------------------------------------------------------------------------
// The modifier itself
// ---------------------------------------------------------------------------

export interface RageModifier {
  id: RageModifierId;
  /** Short label for the badge and the stress log. */
  label: string;
  /** One sentence explaining what it does to the learner's experience. */
  description: string;
  /**
   * False for modifiers that are named in §25 but not yet truthfully
   * supportable. The runner refuses to apply them, so a tier table can never
   * accidentally ship a stub.
   */
  implemented: boolean;

  transformCircuit?(input: RageCircuitInput, ctx: RageContext): RageCircuitPatch | null;
  rankCandidates?(input: RageCandidateInput, ctx: RageContext): RageCandidatePatch | null;
  selectFaults?(input: RageSelectionInput, ctx: RageContext): RageSelectionPatch | null;
  adjustPresentation?(input: RagePresentation, ctx: RageContext): RagePresentation | null;
}

// ---------------------------------------------------------------------------
// Tiers (plan §27)
// ---------------------------------------------------------------------------

export type RageTierId = 'rage-1' | 'rage-2' | 'rage-3' | 'rage-4';

export interface RageTier {
  id: RageTierId;
  /** Display name, e.g. `Rage 1`. */
  label: string;
  /** Learner-facing blurb for the tier picker. */
  blurb: string;
  /** Applied in this order. Order matters: stages run per-modifier in sequence. */
  modifiers: readonly RageModifierId[];
}

// ---------------------------------------------------------------------------
// Outcome record
// ---------------------------------------------------------------------------

/** What one modifier actually did — or why it did nothing. */
export interface RageApplication {
  id: RageModifierId;
  label: string;
  /** True when at least one of the modifier's hooks changed something. */
  applied: boolean;
  /** Human-readable outcome, e.g. `spliced a Wago into the switch drop`. */
  note: string;
}

/**
 * The rage summary attached to a finished scenario.
 *
 * Carried on `DiagnosisScenario.rage`, which is `null` for every normal
 * scenario — that null is the §24 guarantee, checked by test and by the
 * stress harness: *normal mode never receives Ohmageddon modifiers*.
 */
export interface RageSummary {
  tier: RageTierId;
  tierLabel: string;
  /** Stable key folded into the challenge identity (`ES-RAGE-######`). */
  rageProfile: string;
  applications: RageApplication[];
  /** Ids of the decoy components — the canvas may want to leave them unmarked. */
  decoyComponentIds: string[];
  timeLimitSeconds: number | null;
}
