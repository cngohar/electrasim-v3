/**
 * Rage difficulty progression (plan §27).
 *
 * §27 opens with a warning worth obeying: *"Do not initially create dozens of
 * Rage levels. Start with modifier combinations."* So there is no rage
 * difficulty curve, no XP and no unlock tree — three tiers, each a named
 * combination of the modifiers defined in `modifiers.ts`.
 *
 * All four tiers from the plan now exist. Phase F finished the last three
 * honest modifiers: `multiFault` (Rage 3), `compoundFault` (Rage 4),
 * `misleadingSymptom` (Rage 2, retiring the `remoteFault` stand-in) and the
 * optional `timeLimit` on Rage 4. §27 defines Rage 4 as `2 faults + compound
 * symptom + limited hints + optional timer` — that list is now the one that
 * ships.
 */

import type { RageTier, RageTierId } from './types';

export const RAGE_TIERS: Record<RageTierId, RageTier> = {
  'rage-1': {
    id: 'rage-1',
    label: 'Rage 1',
    blurb: 'One fault, one innocent suspect.',
    // §27 Rage 1 — "1 fault + 1 red herring", exactly.
    modifiers: ['redHerring'],
  },
  'rage-2': {
    id: 'rage-2',
    label: 'Rage 2',
    blurb:
      'One fault whose honest symptom points you at the wrong place, with the hints thinned out.',
    /**
     * §27 Rage 2 is "1 fault + misleading symptom + reduced hints".
     * Phase E substituted `remoteFault` because the symptom-scoring proof
     * did not exist yet. F4/F5 retire that stand-in: `misleadingSymptom`
     * keeps candidates that do not sit on a declared load, and
     * `tryBuildScenario` re-proves the claim against the *measured*
     * symptom before the summary is allowed to say `applied`.
     */
    modifiers: ['misleadingSymptom', 'limitedHints'],
  },
  'rage-3': {
    id: 'rage-3',
    label: 'Rage 3',
    blurb: 'Two faults, one of them a long way off, a decoy in the way, and one hint.',
    /**
     * §27 Rage 3 — "2 faults + remote fault + red herring" — now complete.
     * `limitedHints` is kept from the Phase E shape: with two faults to find,
     * a full hint ladder that names one location makes the tier easier than
     * Rage 2, and a difficulty curve that dips is worse than one that is
     * merely steep.
     *
     * Order matters. `multiFault` runs after `remoteFault` has narrowed the
     * pool, so the *first* fault is the remote one and the second is drawn
     * from the same ranked list — which is why the second fault tends to be
     * remote too rather than sitting conveniently next to the dead load.
     */
    modifiers: ['redHerring', 'remoteFault', 'multiFault', 'limitedHints'],
  },
  'rage-4': {
    id: 'rage-4',
    label: 'Rage 4',
    blurb: 'Two faults, the first one hiding the second, and the clock is running.',
    /**
     * §27 Rage 4 — "2 faults + compound symptom + limited hints + optional
     * timer". The timer now ships: `timeLimit` writes `timeLimitSeconds`
     * and the Diagnosis Lab counts it down. It is still *optional* in the
     * pedagogical sense — expiry scores what the learner has already found
     * rather than fabricating a fail — but it is no longer missing.
     *
     * `compoundFault` replaces `multiFault` rather than joining it. Both add a
     * second fault, so running the pair would either fight over the one slot
     * §27 allows or push the scenario to three faults. They also want opposite
     * things — `multiFault` wants two faults that are *independently* visible,
     * `compoundFault` wants the first to hide the second — so whichever ran
     * second would be proposing against the other's intent.
     *
     * `remoteFault` is deliberately absent. Compound masking already demands a
     * partner deep in the branch the first fault de-energises, and narrowing
     * the pool to the most distant band as well left almost nothing separable:
     * the two constraints intersect to near-empty, exactly the way
     * `remoteFault` + `multiFault` did in Phase E. `redHerring` stays, because
     * a decoy costs the search nothing.
     *
     * When the masking proof fails, the scenario ships as an ordinary
     * two-fault exercise and the summary says so — see the compound proof in
     * `diagnosis/scenario.ts`. It never claims a compound it did not achieve.
     *
     * `timeLimit` is last so `limitedHints` still owns the hint delta in the
     * presentation notes (the runner records current-vs-next, not original).
     */
    modifiers: ['redHerring', 'compoundFault', 'limitedHints', 'timeLimit'],
  },
};

export const RAGE_TIER_IDS: readonly RageTierId[] = [
  'rage-1',
  'rage-2',
  'rage-3',
  'rage-4',
] as const;

export function getRageTier(id: RageTierId): RageTier {
  const tier = RAGE_TIERS[id];
  if (!tier) throw new Error(`Unknown rage tier: ${id}`);
  return tier;
}

export function isRageTierId(value: string): value is RageTierId {
  return RAGE_TIER_IDS.includes(value as RageTierId);
}

/**
 * The `rageProfile` string folded into the challenge identity (§29).
 *
 * Phase A already hashes `rageProfile` into `seedFingerprint`, so two
 * scenarios that differ only by tier get different `ES-RAGE-######` ids for
 * free. Keeping the derivation here means the identity and the tier can never
 * drift apart.
 */
export function rageProfileKey(tier: RageTierId): string {
  return tier;
}
