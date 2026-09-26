/**
 * The Ohmageddon modifier runner (plan §25, §26; Phase E steps 5–8).
 *
 * This is the module that makes "rage against the circuit, not against
 * physics" enforceable rather than aspirational. Every modifier is applied
 * through here, and here is where the two invariants live:
 *
 *   **Honesty gate.** Anything a modifier does to the circuit is pushed back
 *   through `validateCandidate` — the *same* gate `generateChallenge` uses,
 *   not a relaxed copy — and additionally must leave the baseline behaviour
 *   of every declared load unchanged. A modifier that dims a bulb by accident
 *   is silently discarded and the unmodified circuit is kept. There is no
 *   "rage mode is allowed to be a bit wrong".
 *
 *   **Determinism gate.** Each modifier gets its own forked RNG, labelled by
 *   modifier id. Adding, removing or reordering a modifier therefore cannot
 *   shift the random stream any other modifier sees, so a tier's output is a
 *   pure function of (seed, difficulty, tier).
 *
 * The runner is pure: no clock, no storage, no `Math.random`.
 */

import { simulate } from '../../simulation';
import type { Circuit } from '../../types';
import { getDifficultyProfile } from '../difficulty/profiles';
import { type FaultCandidate, candidateKey } from '../faults/eligibility';
import type { Rng } from '../generator/seed';
import { validateCandidate } from '../generator/validator';
import type { ChallengeDifficulty, GeneratedScenario } from '../types';
import { getRageModifier } from './modifiers';
import { getRageTier, rageProfileKey } from './tiers';
import type {
  RageApplication,
  RageContext,
  RagePresentation,
  RageSummary,
  RageTierId,
} from './types';

// ---------------------------------------------------------------------------
// Stage ① — circuit transforms
// ---------------------------------------------------------------------------

export interface ApplyCircuitStageInput {
  circuit: Circuit;
  scenario: GeneratedScenario;
  difficulty: ChallengeDifficulty;
  tier: RageTierId;
  rng: Rng;
  /** Loads that must still be energised afterwards — the honesty reference. */
  expectedEnergisedLoadIds: readonly string[];
}

export interface ApplyCircuitStageResult {
  circuit: Circuit;
  /** Rewritten candidate wire list (a splice replaces one wire with two). */
  faultCandidateWireIds: string[];
  decoyComponentIds: string[];
  applications: RageApplication[];
}

/**
 * Run every circuit-stage modifier for a tier, keeping only honest results.
 *
 * Note the component budget is deliberately *not* passed to
 * `validateCandidate`: a red herring is an extra component by definition, so
 * enforcing the difficulty's component ceiling here would reject the modifier
 * for doing its job. Every other gate — structure, connection rules, BS 7671
 * validation, both simulation modes — applies unchanged.
 */
export function applyCircuitStage(input: ApplyCircuitStageInput): ApplyCircuitStageResult {
  const profile = getDifficultyProfile(input.difficulty);
  const tier = getRageTier(input.tier);

  let circuit = input.circuit;
  let faultCandidateWireIds = [...input.scenario.faultCandidateWireIds];
  const decoyComponentIds: string[] = [];
  const applications: RageApplication[] = [];

  // The behavioural reference every transform is measured against.
  const before = simulate(input.circuit, { appMode: 'pro' });

  for (const id of tier.modifiers) {
    const modifier = getRageModifier(id);
    if (!modifier.transformCircuit) continue;
    if (!modifier.implemented) {
      applications.push({ id, label: modifier.label, applied: false, note: 'not implemented' });
      continue;
    }

    const ctx: RageContext = {
      difficulty: input.difficulty,
      profile,
      tier: input.tier,
      // Per-modifier fork: reordering the tier cannot perturb another stream.
      rng: input.rng.fork(`rage:circuit:${id}`),
    };

    const patch = modifier.transformCircuit(
      { circuit, scenario: { ...input.scenario, faultCandidateWireIds } },
      ctx,
    );
    if (!patch) {
      applications.push({ id, label: modifier.label, applied: false, note: 'no opportunity' });
      continue;
    }

    const rejection = rejectDishonestCircuit(patch.circuit, before, input.expectedEnergisedLoadIds);
    if (rejection) {
      // §26: a modifier does not get to bend the rules. Drop it and move on.
      applications.push({
        id,
        label: modifier.label,
        applied: false,
        note: `discarded — ${rejection}`,
      });
      continue;
    }

    circuit = patch.circuit;
    faultCandidateWireIds = patch.faultCandidateWireIds;
    decoyComponentIds.push(...patch.decoyComponentIds);
    applications.push({ id, label: modifier.label, applied: true, note: patch.note });
  }

  return { circuit, faultCandidateWireIds, decoyComponentIds, applications };
}

/**
 * The §26 honesty check. Returns a reason string, or `null` when the circuit
 * is acceptable.
 *
 * Two questions:
 *   1. Does the *existing* generator gate still accept it? (structure, rules,
 *      BS 7671, both simulation modes, expected loads energised.) This is the
 *      limb that does the work today, and it is the same `validateCandidate`
 *      the generator itself runs — deliberately not a relaxed rage-only copy.
 *   2. Does every declared load still match its pre-transform state?
 *
 * Honest note on limb 2: with today's recipes it is *subsumed* by limb 1,
 * because every declared load is also an expected-energised load, so
 * `validateCandidate`'s own behaviour gate already catches any change
 * (measured: 0 of 90 generated scenarios have a deliberately-off load). It is
 * kept because that equality is a property of the current recipe set, not a
 * guarantee: the moment a recipe ships a load that is *meant* to be off — a
 * second lighting circuit on an open switch, say — limb 1 stops watching it
 * and a modifier that silently energised it would otherwise slip through.
 * It costs one set lookup per load, so the insurance is close to free.
 */
function rejectDishonestCircuit(
  circuit: Circuit,
  before: ReturnType<typeof simulate>,
  expectedEnergisedLoadIds: readonly string[],
): string | null {
  const validation = validateCandidate({ circuit, expectedEnergisedLoadIds });
  if (!validation.ok) {
    const first = validation.rejections[0];
    return `${first?.stage ?? 'validation'}: ${first?.reasons[0] ?? 'rejected'}`;
  }

  const after = validation.proResult ?? simulate(circuit, { appMode: 'pro' });
  for (const id of expectedEnergisedLoadIds) {
    if (before.energizedComponents.has(id) !== after.energizedComponents.has(id)) {
      return `load ${id} changed state`;
    }
  }
  if ((after.trippedComponents?.length ?? 0) !== (before.trippedComponents?.length ?? 0)) {
    return 'protection state changed';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Stage ② — candidate ranking
// ---------------------------------------------------------------------------

export interface ApplyCandidateStageInput {
  circuit: Circuit;
  candidates: readonly FaultCandidate[];
  loadComponentIds: readonly string[];
  difficulty: ChallengeDifficulty;
  tier: RageTierId;
  rng: Rng;
  /** Components that exist only as decoys — never allowed to host the fault. */
  decoyComponentIds: readonly string[];
}

export interface ApplyCandidateStageResult {
  candidates: FaultCandidate[];
  /**
   * Every candidate that survived the decoy filter, *before* any modifier
   * narrowed the field.
   *
   * Returned separately because the selection stage needs a fallback pool for
   * a second fault, and it must be the decoy-filtered one: reaching past this
   * to the raw eligibility list would let a red herring host the second fault,
   * which is precisely the guarantee this stage exists to make.
   */
  pool: FaultCandidate[];
  applications: RageApplication[];
}

/**
 * Re-rank the eligible faults for a tier.
 *
 * Runs one guaranteed filter before any modifier: a decoy is never the fault.
 * A red herring that could turn out to be the culprit is not a herring, and a
 * learner who eventually learns that "the odd extra Wago is always it" has
 * been taught a pattern rather than a skill.
 */
export function applyCandidateStage(input: ApplyCandidateStageInput): ApplyCandidateStageResult {
  const profile = getDifficultyProfile(input.difficulty);
  const tier = getRageTier(input.tier);
  const applications: RageApplication[] = [];

  const decoys = new Set(input.decoyComponentIds);
  const touchesDecoy = (candidate: FaultCandidate): boolean => {
    const target = candidate.target;
    if (target.type === 'component') return decoys.has(target.id);
    if (target.type === 'port') return decoys.has(target.componentId);
    // Hoisted for the same narrowing reason as `candidateDistance`.
    const wireId = target.id;
    const wire = input.circuit.wires.find((w) => w.id === wireId);
    if (!wire) return false;
    return decoys.has(wire.fromComponentId) || decoys.has(wire.toComponentId);
  };

  // Keep the decoy-free candidates — unless that would empty the list, in
  // which case the herring has cornered every option and the honest move is
  // to leave selection alone rather than ship a scenario with no fault.
  const withoutDecoys = input.candidates.filter((c) => !touchesDecoy(c));
  const pool: FaultCandidate[] = withoutDecoys.length > 0 ? withoutDecoys : [...input.candidates];
  let candidates: FaultCandidate[] = [...pool];

  for (const id of tier.modifiers) {
    const modifier = getRageModifier(id);
    if (!modifier.rankCandidates) continue;
    if (!modifier.implemented) {
      applications.push({ id, label: modifier.label, applied: false, note: 'not implemented' });
      continue;
    }

    const ctx: RageContext = {
      difficulty: input.difficulty,
      profile,
      tier: input.tier,
      rng: input.rng.fork(`rage:candidate:${id}`),
    };

    const patch = modifier.rankCandidates(
      { circuit: input.circuit, candidates, loadComponentIds: input.loadComponentIds },
      ctx,
    );
    // An empty result would silently disable the scenario — refuse it.
    if (!patch || patch.candidates.length === 0) {
      applications.push({ id, label: modifier.label, applied: false, note: 'no effect' });
      continue;
    }

    candidates = patch.candidates;
    applications.push({ id, label: modifier.label, applied: true, note: patch.note });
  }

  return { candidates, pool, applications };
}

// ---------------------------------------------------------------------------
// Stage ②b — fault selection
// ---------------------------------------------------------------------------

export interface ApplySelectionStageInput {
  circuit: Circuit;
  /** The ranked pool the first fault was drawn from. */
  candidates: readonly FaultCandidate[];
  /** Every eligible candidate, before ranking narrowed the field. */
  pool: readonly FaultCandidate[];
  /** Already-chosen candidates — never removed, only added to. */
  selected: readonly FaultCandidate[];
  loadComponentIds: readonly string[];
  difficulty: ChallengeDifficulty;
  tier: RageTierId;
  rng: Rng;
}

export interface ApplySelectionStageResult {
  /**
   * The chosen candidates plus any accepted additions, in order. The first
   * entry is always the originally selected fault.
   */
  selected: FaultCandidate[];
  /**
   * Fallback candidates for each addition, in preference order, so the caller
   * can retry when a proposal fails §12's solo-observability gate. Parallel to
   * nothing — it is simply the remaining proposals, best first.
   */
  alternatives: FaultCandidate[];
  applications: RageApplication[];
}

/**
 * Let modifiers add further faults to the scenario (plan §26 "Multiple faults").
 *
 * The runner, not the modifier, owns the invariants — a modifier only proposes:
 *
 *   - **Nothing is ever removed.** The first fault is the one the seeded
 *     selection chose, and a modifier that returned a shorter list would be
 *     silently overriding `selectFaultCandidate`'s placement weighting.
 *   - **No duplicate fault, and no duplicate location.** Two faults sharing a
 *     `locationKey` would collapse into one answer in §15's two-part grader,
 *     so the learner could "find" both with one submission.
 *   - **A cap of three.** Beyond that the odds of one fault masking another
 *     rise sharply and the exercise stops being a diagnosis and becomes an
 *     inventory. §27 asks for two.
 *
 * Observability is deliberately *not* checked here: it needs the simulator and
 * the baseline, both of which live in `tryBuildScenario`. This stage hands back
 * `alternatives` precisely so that caller can reject a masked proposal and try
 * the next one without losing the whole scenario.
 */
export function applySelectionStage(input: ApplySelectionStageInput): ApplySelectionStageResult {
  const profile = getDifficultyProfile(input.difficulty);
  const tier = getRageTier(input.tier);
  const applications: RageApplication[] = [];

  const selected: FaultCandidate[] = [...input.selected];
  const alternatives: FaultCandidate[] = [];

  const keyOf = (c: FaultCandidate) => candidateKey(c.type, c.target);
  const locationOf = (c: FaultCandidate) =>
    c.target.type === 'port'
      ? `port:${c.target.componentId}:${c.target.portIndex}`
      : `${c.target.type}:${c.target.id}`;

  for (const id of tier.modifiers) {
    const modifier = getRageModifier(id);
    if (!modifier.selectFaults) continue;
    if (!modifier.implemented) {
      applications.push({ id, label: modifier.label, applied: false, note: 'not implemented' });
      continue;
    }

    const ctx: RageContext = {
      difficulty: input.difficulty,
      profile,
      tier: input.tier,
      rng: input.rng.fork(`rage:selection:${id}`),
    };

    const patch = modifier.selectFaults(
      {
        circuit: input.circuit,
        candidates: input.candidates,
        pool: input.pool,
        selected,
        loadComponentIds: input.loadComponentIds,
      },
      ctx,
    );
    if (!patch || patch.additional.length === 0) {
      applications.push({ id, label: modifier.label, applied: false, note: 'no opportunity' });
      continue;
    }

    const takenKeys = new Set(selected.map(keyOf));
    const takenLocations = new Set(selected.map(locationOf));
    const accepted: FaultCandidate[] = [];

    for (const candidate of patch.additional) {
      const key = keyOf(candidate);
      const location = locationOf(candidate);
      if (takenKeys.has(key) || takenLocations.has(location)) continue;
      if (selected.length + accepted.length >= MAX_SCENARIO_FAULTS) break;

      if (accepted.length === 0) {
        accepted.push(candidate);
        takenKeys.add(key);
        takenLocations.add(location);
        continue;
      }
      // Everything past the first accepted proposal is a standby, kept for the
      // caller's observability retry rather than injected.
      alternatives.push(candidate);
      takenKeys.add(key);
      takenLocations.add(location);
    }

    if (accepted.length === 0) {
      applications.push({
        id,
        label: modifier.label,
        applied: false,
        note: 'every proposal duplicated an existing fault',
      });
      continue;
    }

    selected.push(...accepted);
    applications.push({
      id,
      label: modifier.label,
      applied: true,
      note: `${patch.note}; accepted ${accepted.length}, ${alternatives.length} in reserve`,
    });
  }

  return { selected, alternatives, applications };
}

/**
 * Hard ceiling on faults per scenario.
 *
 * §27 asks for two. Three is the headroom a future `compoundFault` might want;
 * past that, every extra fault raises the chance one masks another and the
 * `tryBuildScenario` rejection rate with it.
 */
export const MAX_SCENARIO_FAULTS = 3;

// ---------------------------------------------------------------------------
// Stage ③ — presentation
// ---------------------------------------------------------------------------

export interface ApplyPresentationStageInput extends RagePresentation {
  difficulty: ChallengeDifficulty;
  tier: RageTierId;
  rng: Rng;
}

export interface ApplyPresentationStageResult {
  presentation: RagePresentation;
  applications: RageApplication[];
}

export function applyPresentationStage(
  input: ApplyPresentationStageInput,
): ApplyPresentationStageResult {
  const profile = getDifficultyProfile(input.difficulty);
  const tier = getRageTier(input.tier);
  const applications: RageApplication[] = [];

  let presentation: RagePresentation = {
    hints: input.hints,
    hintBudget: input.hintBudget,
    parTimeSeconds: input.parTimeSeconds,
    timeLimitSeconds: input.timeLimitSeconds,
  };

  for (const id of tier.modifiers) {
    const modifier = getRageModifier(id);
    if (!modifier.adjustPresentation) continue;
    if (!modifier.implemented) {
      applications.push({ id, label: modifier.label, applied: false, note: 'not implemented' });
      continue;
    }

    const ctx: RageContext = {
      difficulty: input.difficulty,
      profile,
      tier: input.tier,
      rng: input.rng.fork(`rage:presentation:${id}`),
    };

    const next = modifier.adjustPresentation(presentation, ctx);
    if (!next) {
      applications.push({ id, label: modifier.label, applied: false, note: 'no effect' });
      continue;
    }

    // A scenario with no hints at all is a brick wall, not a challenge.
    if (next.hints.length === 0) {
      applications.push({
        id,
        label: modifier.label,
        applied: false,
        note: 'discarded — would leave no hints',
      });
      continue;
    }

    const bits: string[] = [];
    if (next.hints.length !== presentation.hints.length) {
      bits.push(`hints ${presentation.hints.length} → ${next.hints.length}`);
    }
    if (next.hintBudget !== presentation.hintBudget) {
      bits.push(`budget ${presentation.hintBudget} → ${next.hintBudget}`);
    }
    if (next.timeLimitSeconds !== presentation.timeLimitSeconds) {
      bits.push(`timer ${next.timeLimitSeconds}s`);
    }
    presentation = next;
    applications.push({
      id,
      label: modifier.label,
      applied: true,
      note: bits.join(', ') || 'adjusted',
    });
  }

  return { presentation, applications };
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/** Fold the three stages' records into the summary carried on the scenario. */
export function buildRageSummary(args: {
  tier: RageTierId;
  applications: RageApplication[];
  decoyComponentIds: string[];
  timeLimitSeconds: number | null;
}): RageSummary {
  const tier = getRageTier(args.tier);
  // One row per modifier: a modifier with hooks at two stages should not
  // appear twice. "Applied anywhere" wins, and the notes are joined.
  const byId = new Map<string, RageApplication>();
  for (const application of args.applications) {
    const existing = byId.get(application.id);
    if (!existing) {
      byId.set(application.id, { ...application });
      continue;
    }
    byId.set(application.id, {
      ...existing,
      applied: existing.applied || application.applied,
      note: existing.applied
        ? application.applied
          ? `${existing.note}; ${application.note}`
          : existing.note
        : application.note,
    });
  }

  return {
    tier: args.tier,
    tierLabel: tier.label,
    rageProfile: rageProfileKey(args.tier),
    applications: tier.modifiers
      .map((id) => byId.get(id))
      .filter((a): a is RageApplication => a !== undefined),
    decoyComponentIds: args.decoyComponentIds,
    timeLimitSeconds: args.timeLimitSeconds,
  };
}
