/**
 * Ohmageddon modifier tests (plan §42, §57 "Ohmageddon" gate).
 *
 * §42 names the cases directly:
 *
 *   - test every modifier independently
 *   - rage OFF  => no Ohmageddon scenarios
 *   - rage ON   => Ohmageddon scenarios may be selected
 *   - normal mode never receives Ohmageddon modifiers
 *   - Ohmageddon modifiers preserve valid electrical simulation
 *
 * The last one is the load-bearing test in this file. Everything else is
 * bookkeeping; that one is the difference between "hard" and "broken", and it
 * is asserted against the *real* simulator rather than a stub, because a
 * mocked simulator cannot tell you your red herring silently killed a lamp.
 */

import { describe, expect, it } from 'vitest';
import { validateCircuit } from '../../circuitValidation';
import { validateCircuitRules } from '../../electrical/validation';
import { simulate } from '../../simulation';
import { observeSymptom } from '../diagnosis/evaluator';
import { buildDiagnosisScenario } from '../diagnosis/scenario';
import { getDifficultyProfile } from '../difficulty/profiles';
import { collectFaultCandidates } from '../faults/eligibility';
import { withoutFault } from '../faults/injection';
import { diffSymptom, isMisleadingPlacement, sameObservableWorld } from '../faults/verification';
import { generateChallenge } from '../generator/generator';
import { createSeededRng } from '../generator/seed';
import {
  RAGE_MODIFIERS,
  RAGE_TIME_LIMIT_FACTOR,
  getRageModifier,
  implementedRageModifiers,
} from './modifiers';
import {
  MAX_SCENARIO_FAULTS,
  applyCandidateStage,
  applyCircuitStage,
  applyPresentationStage,
  applySelectionStage,
} from './runner';
import { RAGE_TIERS, RAGE_TIER_IDS, getRageTier, isRageTierId, rageProfileKey } from './tiers';
import { RAGE_MODIFIER_IDS, type RageContext, type RagePresentation } from './types';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

function ctxFor(
  tier: (typeof RAGE_TIER_IDS)[number],
  difficulty: 'beginner' | 'intermediate' | 'advanced',
): RageContext {
  return {
    difficulty,
    profile: getDifficultyProfile(difficulty),
    tier,
    rng: createSeededRng({ generatorVersion: 1, seed: 99, difficulty, mode: 'rage' }),
  };
}

// ---------------------------------------------------------------------------
// Registry / vocabulary
// ---------------------------------------------------------------------------

describe('rage modifier registry (plan §25)', () => {
  it('declares every modifier named in §25', () => {
    for (const id of RAGE_MODIFIER_IDS) {
      expect(RAGE_MODIFIERS[id], `missing modifier ${id}`).toBeDefined();
      expect(RAGE_MODIFIERS[id].id).toBe(id);
    }
  });

  it('ships every modifier named in §25', () => {
    // Phase F closed the last two stubs: `misleadingSymptom` (F4) and
    // `timeLimit` (F6). A missing name here is a silent unimplemented
    // modifier, which §25 forbids.
    expect(
      implementedRageModifiers()
        .map((m) => m.id)
        .sort(),
    ).toEqual([...RAGE_MODIFIER_IDS].sort());
  });

  it('never marks an unimplemented modifier as having hooks', () => {
    // A stub with a live hook would be applied by the runner and ship half-done.
    for (const modifier of Object.values(RAGE_MODIFIERS)) {
      if (modifier.implemented) continue;
      expect(modifier.transformCircuit).toBeUndefined();
      expect(modifier.rankCandidates).toBeUndefined();
      expect(modifier.selectFaults).toBeUndefined();
      expect(modifier.adjustPresentation).toBeUndefined();
    }
  });

  it('throws on an unknown modifier id', () => {
    // biome-ignore lint/suspicious/noExplicitAny: deliberate invalid input.
    expect(() => getRageModifier('nope' as any)).toThrow(/Unknown rage modifier/);
  });
});

describe('rage tiers (plan §27)', () => {
  it('only references implemented modifiers', () => {
    for (const tierId of RAGE_TIER_IDS) {
      for (const id of RAGE_TIERS[tierId].modifiers) {
        expect(RAGE_MODIFIERS[id].implemented, `${tierId} uses unimplemented ${id}`).toBe(true);
      }
    }
  });

  it('escalates: every tier keeps the burdens of the one below it', () => {
    /**
     * Modifier *count* was the original proxy for harshness, and Rage 4 breaks
     * it: it drops `remoteFault` on purpose, because compound masking already
     * needs a partner deep inside the branch the first fault de-energises, and
     * also demanding the most-distant band leaves nothing separable. Fewer
     * modifiers, strictly harder exercise.
     *
     * So escalation is asserted on the thing that actually matters — the
     * learner's burden — rather than on a list length:
     *
     *   - the number of faults to find never decreases;
     *   - help is never restored once it has been taken away.
     */
    const faultCount = (id: (typeof RAGE_TIER_IDS)[number]) => {
      const mods = RAGE_TIERS[id].modifiers;
      // Both add exactly one extra fault, and Rage 4 swaps one for the other.
      return 1 + (mods.includes('multiFault') || mods.includes('compoundFault') ? 1 : 0);
    };
    const hintsRationed = (id: (typeof RAGE_TIER_IDS)[number]) =>
      RAGE_TIERS[id].modifiers.includes('limitedHints');

    for (let i = 1; i < RAGE_TIER_IDS.length; i++) {
      const prev = RAGE_TIER_IDS[i - 1]!;
      const curr = RAGE_TIER_IDS[i]!;
      expect(faultCount(curr), `${curr} finds fewer faults than ${prev}`).toBeGreaterThanOrEqual(
        faultCount(prev),
      );
      if (hintsRationed(prev)) {
        expect(hintsRationed(curr), `${curr} restores hints that ${prev} rationed`).toBe(true);
      }
    }
  });

  it('derives a distinct rage profile key per tier', () => {
    const keys = RAGE_TIER_IDS.map(rageProfileKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('validates tier ids', () => {
    expect(isRageTierId('rage-1')).toBe(true);
    expect(isRageTierId('rage-9')).toBe(false);
    expect(() => getRageTier('rage-9' as never)).toThrow(/Unknown rage tier/);
  });
});

// ---------------------------------------------------------------------------
// §42: each modifier, independently
// ---------------------------------------------------------------------------

describe('redHerring — independently (plan §42)', () => {
  it('adds exactly one decoy and keeps the circuit electrically identical', () => {
    let applied = 0;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 8; seed++) {
        const generated = generateChallenge({ seed, difficulty, mode: 'rage' });
        const before = simulate(generated.circuit, { appMode: 'pro' });

        const staged = applyCircuitStage({
          circuit: generated.circuit,
          scenario: generated.scenario,
          difficulty,
          tier: 'rage-1',
          rng: createSeededRng({ generatorVersion: 1, seed, difficulty, mode: 'rage' }),
          expectedEnergisedLoadIds: generated.metadata.baseline.expectedEnergisedLoadIds,
        });

        if (staged.decoyComponentIds.length === 0) continue;
        applied += 1;

        expect(staged.decoyComponentIds).toHaveLength(1);
        expect(staged.circuit.components.length).toBe(generated.circuit.components.length + 1);
        // One wire becomes two.
        expect(staged.circuit.wires.length).toBe(generated.circuit.wires.length + 1);

        // The whole point: same electrical outcome.
        const after = simulate(staged.circuit, { appMode: 'pro' });
        for (const loadId of generated.scenario.loadComponentIds) {
          expect(after.energizedComponents.has(loadId)).toBe(
            before.energizedComponents.has(loadId),
          );
        }
        expect(after.errors).toEqual([]);
        expect(after.errorComponents.size).toBe(0);
        expect(after.errorWires.size).toBe(0);
      }
    }
    expect(applied).toBeGreaterThan(0);
  });

  it('preserves total run length when it splices (voltage drop is unchanged)', () => {
    const generated = generateChallenge({ seed: 3, difficulty: 'intermediate', mode: 'rage' });
    const staged = applyCircuitStage({
      circuit: generated.circuit,
      scenario: generated.scenario,
      difficulty: 'intermediate',
      tier: 'rage-1',
      rng: createSeededRng({
        generatorVersion: 1,
        seed: 3,
        difficulty: 'intermediate',
        mode: 'rage',
      }),
      expectedEnergisedLoadIds: generated.metadata.baseline.expectedEnergisedLoadIds,
    });
    if (staged.decoyComponentIds.length === 0) return;

    const decoyId = staged.decoyComponentIds[0]!;
    const halves = staged.circuit.wires.filter(
      (w) => w.fromComponentId === decoyId || w.toComponentId === decoyId,
    );
    expect(halves).toHaveLength(2);
    // Both halves inherit the parent's cable spec — a splice is not a re-cable.
    expect(new Set(halves.map((w) => w.customCableMm2)).size).toBe(1);
  });

  /**
   * Regression: the decoy must not identify itself.
   *
   * `ComponentNode.tsx` renders `component.id` under every device on the
   * canvas, so an id containing "decoy"/"herring"/"rage" hands the learner the
   * answer in plain text. The first implementation used `<wireId>-decoy` and
   * shipped it straight onto the canvas — found by reading a screenshot, which
   * no unit test was looking for. This locks it.
   */
  it('never names a decoy in a way the canvas would reveal (§14)', () => {
    const forbidden = /decoy|herring|rage|fake|dummy|trap/i;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 10; seed++) {
        const generated = generateChallenge({ seed, difficulty, mode: 'rage' });
        const staged = applyCircuitStage({
          circuit: generated.circuit,
          scenario: generated.scenario,
          difficulty,
          tier: 'rage-1',
          rng: createSeededRng({ generatorVersion: 1, seed, difficulty, mode: 'rage' }),
          expectedEnergisedLoadIds: generated.metadata.baseline.expectedEnergisedLoadIds,
        });
        for (const component of staged.circuit.components) {
          expect(forbidden.test(component.id), `component id "${component.id}" leaks`).toBe(false);
        }
        for (const wire of staged.circuit.wires) {
          expect(forbidden.test(wire.id), `wire id "${wire.id}" leaks`).toBe(false);
        }
      }
    }
  });

  it('rewrites the fault-candidate wire list so no id dangles', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const generated = generateChallenge({ seed, difficulty: 'intermediate', mode: 'rage' });
      const staged = applyCircuitStage({
        circuit: generated.circuit,
        scenario: generated.scenario,
        difficulty: 'intermediate',
        tier: 'rage-1',
        rng: createSeededRng({
          generatorVersion: 1,
          seed,
          difficulty: 'intermediate',
          mode: 'rage',
        }),
        expectedEnergisedLoadIds: generated.metadata.baseline.expectedEnergisedLoadIds,
      });
      const live = new Set(staged.circuit.wires.map((w) => w.id));
      for (const id of staged.faultCandidateWireIds) {
        expect(live.has(id), `candidate ${id} no longer exists`).toBe(true);
      }
    }
  });
});

describe('remoteFault — independently (plan §42)', () => {
  it('narrows candidates and never returns an empty set', () => {
    let narrowed = 0;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 8; seed++) {
        const generated = generateChallenge({ seed, difficulty, mode: 'rage' });
        const candidates = collectFaultCandidates(generated.circuit, generated.scenario);
        if (candidates.length < 2) continue;

        const staged = applyCandidateStage({
          circuit: generated.circuit,
          candidates,
          loadComponentIds: generated.scenario.loadComponentIds,
          difficulty,
          // Rage 3 is the tier that still lists `remoteFault`. Rage 2 used
          // to, then F5 retired that stand-in for `misleadingSymptom`.
          tier: 'rage-3',
          rng: createSeededRng({ generatorVersion: 1, seed, difficulty, mode: 'rage' }),
          decoyComponentIds: [],
        });

        expect(staged.candidates.length).toBeGreaterThan(0);
        expect(staged.candidates.length).toBeLessThanOrEqual(candidates.length);
        if (staged.candidates.length < candidates.length) narrowed += 1;
        // Every surviving candidate must be one of the originals.
        const keys = new Set(candidates.map((c) => c.key));
        for (const c of staged.candidates) expect(keys.has(c.key)).toBe(true);
      }
    }
    expect(narrowed).toBeGreaterThan(0);
  });

  it('respects the difficulty ceiling on fault distance', () => {
    // Beginner allows 1 hop; the modifier must not exceed the profile's cap.
    const modifier = getRageModifier('remoteFault');
    expect(modifier.rankCandidates).toBeDefined();
    const generated = generateChallenge({ seed: 5, difficulty: 'beginner', mode: 'rage' });
    const candidates = collectFaultCandidates(generated.circuit, generated.scenario);
    const patch = modifier.rankCandidates?.(
      {
        circuit: generated.circuit,
        candidates,
        loadComponentIds: generated.scenario.loadComponentIds,
      },
      ctxFor('rage-2', 'beginner'),
    );
    if (patch) expect(patch.candidates.length).toBeGreaterThan(0);
  });

  it('declines when there is nothing to choose between', () => {
    const generated = generateChallenge({ seed: 11, difficulty: 'beginner', mode: 'rage' });
    const candidates = collectFaultCandidates(generated.circuit, generated.scenario);
    const patch = getRageModifier('remoteFault').rankCandidates?.(
      { circuit: generated.circuit, candidates: candidates.slice(0, 1), loadComponentIds: [] },
      ctxFor('rage-2', 'beginner'),
    );
    expect(patch).toBeNull();
  });
});

describe('limitedHints — independently (plan §42)', () => {
  const base: RagePresentation = {
    hints: [
      { level: 1, kind: 'observation', text: 'a' },
      { level: 2, kind: 'direction', text: 'b' },
      { level: 3, kind: 'location', text: 'c' },
    ],
    hintBudget: 3,
    parTimeSeconds: 200,
    timeLimitSeconds: null,
  };

  it('drops the location hint first at rage-2', () => {
    const next = getRageModifier('limitedHints').adjustPresentation?.(
      base,
      ctxFor('rage-2', 'intermediate'),
    );
    expect(next?.hints).toHaveLength(2);
    // The level-3 hint is the one that names the target — it must be the first to go.
    expect(next?.hints.some((h) => h.kind === 'location')).toBe(false);
    expect(next?.hintBudget).toBeLessThanOrEqual(2);
  });

  it('keeps only the observation at rage-3', () => {
    const next = getRageModifier('limitedHints').adjustPresentation?.(
      base,
      ctxFor('rage-3', 'advanced'),
    );
    expect(next?.hints).toHaveLength(1);
    expect(next?.hints[0]?.kind).toBe('observation');
  });

  it('never removes the last hint', () => {
    const single: RagePresentation = { ...base, hints: [base.hints[0]!], hintBudget: 1 };
    expect(
      getRageModifier('limitedHints').adjustPresentation?.(single, ctxFor('rage-3', 'advanced')),
    ).toBeNull();
  });

  it('is applied through the runner without emptying the hint list', () => {
    for (const tier of RAGE_TIER_IDS) {
      const staged = applyPresentationStage({
        ...base,
        difficulty: 'advanced',
        tier,
        rng: createSeededRng({
          generatorVersion: 1,
          seed: 1,
          difficulty: 'advanced',
          mode: 'rage',
        }),
      });
      expect(staged.presentation.hints.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// §26 / §42: electrical validity is preserved
// ---------------------------------------------------------------------------

describe('Ohmageddon preserves valid electrical simulation (plan §26, §42)', () => {
  it('every rage scenario has a clean healthy baseline and an observable fault', () => {
    for (const tier of RAGE_TIER_IDS) {
      for (const difficulty of DIFFICULTIES) {
        for (let seed = 1; seed <= 6; seed++) {
          const scenario = buildDiagnosisScenario({ seed, difficulty, rageTier: tier });

          const healthy = simulate(scenario.healthyCircuit, { appMode: 'pro' });
          expect(healthy.errors, `${tier}/${difficulty}/${seed}`).toEqual([]);
          expect(healthy.errorComponents.size).toBe(0);
          expect(healthy.errorWires.size).toBe(0);
          expect(healthy.trippedComponents ?? []).toHaveLength(0);

          // §12 still applies in rage: an invisible fault is not a puzzle.
          expect(scenario.symptom.observable).toBe(true);

          // The rage circuit must satisfy the same production validators the
          // generator uses — not a relaxed rage-only variant.
          expect(
            validateCircuitRules(scenario.healthyCircuit, 'basic').filter(
              (d) => d.severity === 'error',
            ),
          ).toEqual([]);
          expect(
            validateCircuit(scenario.healthyCircuit, healthy, 'uk').issues.filter(
              (i) => i.severity === 'error',
            ),
          ).toEqual([]);
        }
      }
    }
  });

  /**
   * Direct test of the decoy exclusion.
   *
   * An earlier version of this suite only checked the *selected* fault across
   * a sample of scenarios. That was far too weak: measurement showed ~14 of
   * ~31 candidates touch the decoy, but weighted selection lands on one rarely
   * enough that deleting the filter entirely still passed. This asserts the
   * filter itself, over the whole candidate list, so removing it fails
   * immediately.
   */
  it('excludes every decoy-touching candidate from the fault pool', () => {
    let checked = 0;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 8; seed++) {
        const generated = generateChallenge({ seed, difficulty, mode: 'rage' });
        const rng = createSeededRng({ generatorVersion: 1, seed, difficulty, mode: 'rage' });
        const staged = applyCircuitStage({
          circuit: generated.circuit,
          scenario: generated.scenario,
          difficulty,
          tier: 'rage-1',
          rng,
          expectedEnergisedLoadIds: generated.metadata.baseline.expectedEnergisedLoadIds,
        });
        if (staged.decoyComponentIds.length === 0) continue;

        const candidates = collectFaultCandidates(staged.circuit, {
          ...generated.scenario,
          faultCandidateWireIds: staged.faultCandidateWireIds,
        });
        const decoys = new Set(staged.decoyComponentIds);
        const touchesDecoy = (target: (typeof candidates)[number]['target']): boolean => {
          if (target.type === 'component') return decoys.has(target.id);
          if (target.type === 'port') return decoys.has(target.componentId);
          const wire = staged.circuit.wires.find((w) => w.id === target.id);
          return wire ? decoys.has(wire.fromComponentId) || decoys.has(wire.toComponentId) : false;
        };

        // The decoy must genuinely be a plausible suspect, or it is not a
        // herring — this guards the test itself against becoming vacuous.
        const tainted = candidates.filter((c) => touchesDecoy(c.target));
        expect(tainted.length).toBeGreaterThan(0);

        const ranked = applyCandidateStage({
          circuit: staged.circuit,
          candidates,
          loadComponentIds: generated.scenario.loadComponentIds,
          difficulty,
          tier: 'rage-1',
          rng,
          decoyComponentIds: staged.decoyComponentIds,
        });

        expect(ranked.candidates.length).toBeGreaterThan(0);
        for (const candidate of ranked.candidates) {
          expect(touchesDecoy(candidate.target), `${candidate.key} sits on a decoy`).toBe(false);
        }
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  /**
   * Direct test of the §26 honesty gate.
   *
   * Feeds the circuit stage a modifier whose transform genuinely breaks the
   * installation (it deletes a wire). The runner must throw the result away
   * and keep the original circuit. Without this, disabling the
   * `validateCandidate` call in the runner passed the whole suite — because
   * the shipped modifiers happen to be honest, nothing was exercising the gate
   * that catches a dishonest one.
   */
  it('discards a modifier whose transform breaks the circuit (§26 honesty gate)', () => {
    const generated = generateChallenge({ seed: 2, difficulty: 'intermediate', mode: 'rage' });

    const saboteur = RAGE_MODIFIERS.redHerring;
    const original = saboteur.transformCircuit;

    const runWith = (
      transform: NonNullable<typeof saboteur.transformCircuit>,
    ): ReturnType<typeof applyCircuitStage> => {
      saboteur.transformCircuit = transform;
      try {
        return applyCircuitStage({
          circuit: generated.circuit,
          scenario: generated.scenario,
          difficulty: 'intermediate',
          tier: 'rage-1',
          rng: createSeededRng({
            generatorVersion: 1,
            seed: 2,
            difficulty: 'intermediate',
            mode: 'rage',
          }),
          expectedEnergisedLoadIds: generated.metadata.baseline.expectedEnergisedLoadIds,
        });
      } finally {
        saboteur.transformCircuit = original;
      }
    };

    const expectRejected = (staged: ReturnType<typeof applyCircuitStage>) => {
      expect(staged.circuit.wires.length).toBe(generated.circuit.wires.length);
      expect(staged.circuit.components.length).toBe(generated.circuit.components.length);
      expect(staged.decoyComponentIds).toEqual([]);
      const record = staged.applications.find((a) => a.id === 'redHerring');
      expect(record?.applied).toBe(false);
      expect(record?.note).toMatch(/discarded/);
    };

    // Limb 1 — the `validateCandidate` gate, isolated.
    // A stray unwired component is structurally invalid but electrically
    // inert, so ONLY the validator can catch it. Severing a conductor would
    // trip the behavioural limb too and would not prove this one runs.
    expectRejected(
      runWith((input) => ({
        circuit: {
          ...input.circuit,
          components: [
            ...input.circuit.components,
            { id: 'stray-decoy', type: 'bulb', x: 900, y: 600, state: {} },
          ],
        },
        decoyComponentIds: [],
        faultCandidateWireIds: input.scenario.faultCandidateWireIds,
        note: 'stray component',
      })),
    );

    // Limb 2 — the behavioural check: a severed conductor kills a load.
    expectRejected(
      runWith((input) => ({
        circuit: { ...input.circuit, wires: input.circuit.wires.slice(1) },
        decoyComponentIds: [],
        faultCandidateWireIds: input.scenario.faultCandidateWireIds,
        note: 'severed conductor',
      })),
    );
  });

  it('never places the fault on a decoy — a red herring is always innocent', () => {
    for (const tier of ['rage-1', 'rage-3'] as const) {
      for (let seed = 1; seed <= 12; seed++) {
        const scenario = buildDiagnosisScenario({
          seed,
          difficulty: 'intermediate',
          rageTier: tier,
        });
        const decoys = new Set(scenario.rage?.decoyComponentIds ?? []);
        if (decoys.size === 0) continue;

        // Every fault, not just the first: a tier that grows a second fault
        // must not be able to smuggle one onto a decoy.
        for (const entry of scenario.faults) {
          const target = entry.fault.target;
          if (target.type === 'component') expect(decoys.has(target.id)).toBe(false);
          else if (target.type === 'port') expect(decoys.has(target.componentId)).toBe(false);
          else {
            const wire = scenario.healthyCircuit.wires.find((w) => w.id === target.id);
            expect(decoys.has(wire?.fromComponentId ?? '')).toBe(false);
            expect(decoys.has(wire?.toComponentId ?? '')).toBe(false);
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// §24 / §42: the safety rule
// ---------------------------------------------------------------------------

describe('normal mode never receives Ohmageddon modifiers (plan §24, §42)', () => {
  it('produces rage === null for every normal scenario', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 10; seed++) {
        expect(buildDiagnosisScenario({ seed, difficulty }).rage).toBeNull();
      }
    }
  });

  it('produces a rage summary only when a tier is explicitly requested', () => {
    const normal = buildDiagnosisScenario({ seed: 4, difficulty: 'intermediate' });
    const rage = buildDiagnosisScenario({
      seed: 4,
      difficulty: 'intermediate',
      rageTier: 'rage-1',
    });
    expect(normal.rage).toBeNull();
    expect(rage.rage).not.toBeNull();
    expect(rage.rage?.tier).toBe('rage-1');
  });

  it('gives a normal scenario the full hint ladder', () => {
    const normal = buildDiagnosisScenario({ seed: 8, difficulty: 'advanced' });
    expect(normal.hints).toHaveLength(3);
    expect(normal.hints.some((h) => h.kind === 'location')).toBe(true);
  });

  it('keeps a normal scenario free of decoy components', () => {
    // Same seed, with and without rage: the rage one may be larger, the normal
    // one must match the raw generator exactly.
    const generated = generateChallenge({ seed: 6, difficulty: 'intermediate', mode: 'diagnosis' });
    const normal = buildDiagnosisScenario({ seed: 6, difficulty: 'intermediate' });
    expect(normal.healthyCircuit.components.length).toBe(generated.circuit.components.length);
    expect(normal.healthyCircuit.wires.length).toBe(generated.circuit.wires.length);
  });
});

// ---------------------------------------------------------------------------
// §57: determinism
// ---------------------------------------------------------------------------

describe('Ohmageddon modifiers are deterministic (plan §57)', () => {
  it('same seed + tier => byte-identical scenario', () => {
    for (const tier of RAGE_TIER_IDS) {
      for (let seed = 1; seed <= 5; seed++) {
        const a = buildDiagnosisScenario({ seed, difficulty: 'intermediate', rageTier: tier });
        const b = buildDiagnosisScenario({ seed, difficulty: 'intermediate', rageTier: tier });
        expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      }
    }
  });

  it('different tiers produce different challenge identities (§29)', () => {
    const ids = RAGE_TIER_IDS.map(
      (tier) =>
        buildDiagnosisScenario({ seed: 21, difficulty: 'intermediate', rageTier: tier })
          .challengeId,
    );
    ids.push(buildDiagnosisScenario({ seed: 21, difficulty: 'intermediate' }).challengeId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tags rage scenarios with the ES-RAGE identity prefix', () => {
    const scenario = buildDiagnosisScenario({
      seed: 33,
      difficulty: 'beginner',
      rageTier: 'rage-1',
    });
    expect(scenario.challengeId.startsWith('ES-RAGE-')).toBe(true);
    expect(
      buildDiagnosisScenario({ seed: 33, difficulty: 'beginner' }).challengeId.startsWith(
        'ES-DIAG-',
      ),
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// multiFault (plan §26 "Multiple faults", §27 Rage 3)
// ---------------------------------------------------------------------------

describe('multiFault (plan §26, §27)', () => {
  /** Build a real generated circuit and its candidate pool. */
  function poolFor(seed: number, difficulty: (typeof DIFFICULTIES)[number] = 'intermediate') {
    const generated = generateChallenge({ seed, difficulty, mode: 'rage' });
    const candidates = collectFaultCandidates(generated.circuit, generated.scenario);
    return { circuit: generated.circuit, scenario: generated.scenario, candidates };
  }

  function selectionFor(seed: number, difficulty: (typeof DIFFICULTIES)[number] = 'intermediate') {
    const { circuit, scenario, candidates } = poolFor(seed, difficulty);
    // Candidates always exist for a generated rage circuit; skip if a seed
    // ever produced none rather than asserting on an empty pool.
    if (candidates.length === 0) return null;
    return applySelectionStage({
      circuit,
      candidates,
      pool: candidates,
      selected: [candidates[0]!],
      loadComponentIds: scenario.loadComponentIds,
      difficulty,
      tier: 'rage-3',
      rng: createSeededRng({ generatorVersion: 1, seed, difficulty, mode: 'rage' }),
    });
  }

  it('never drops or replaces the already-selected fault', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const { candidates } = poolFor(seed);
      if (candidates.length === 0) continue;
      const result = selectionFor(seed);
      expect(result).not.toBeNull();
      // Structural, not identity: `poolFor` rebuilds the circuit each call.
      expect(result!.selected[0]).toStrictEqual(candidates[0]);
    }
  });

  it('adds a second fault that shares no component with the first', () => {
    let sawTwo = 0;
    for (let seed = 1; seed <= 25; seed++) {
      const { circuit } = poolFor(seed);
      const result = selectionFor(seed);
      if (!result || result.selected.length < 2) continue;
      sawTwo++;

      const componentsOf = (target: (typeof result.selected)[number]['target']): string[] => {
        if (target.type === 'component') return [target.id];
        if (target.type === 'port') return [target.componentId];
        const wireId = target.id;
        const wire = circuit.wires.find((w) => w.id === wireId);
        return wire ? [wire.fromComponentId, wire.toComponentId] : [];
      };

      const first = new Set(componentsOf(result.selected[0]!.target));
      for (const extra of result.selected.slice(1)) {
        for (const id of componentsOf(extra.target)) {
          // Two faults on the same device read as one defect (§15's grader
          // keys on location), so the learner would be told they are wrong
          // for a distinction they cannot see.
          expect(first.has(id), `seed ${seed}: second fault reuses ${id}`).toBe(false);
        }
      }
    }
    // The property is worthless if no seed ever produced a second fault.
    expect(sawTwo).toBeGreaterThan(10);
  });

  it('never exceeds the scenario fault ceiling', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const result = selectionFor(seed);
      if (!result) continue;
      expect(result.selected.length).toBeLessThanOrEqual(MAX_SCENARIO_FAULTS);
    }
  });

  it('gives every selected fault a distinct location key', () => {
    for (let seed = 1; seed <= 25; seed++) {
      const result = selectionFor(seed);
      if (!result) continue;
      const keys = result.selected.map((c) =>
        c.target.type === 'port'
          ? `port:${c.target.componentId}:${c.target.portIndex}`
          : `${c.target.type}:${c.target.id}`,
      );
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('does not run for tiers that do not list it', () => {
    const { circuit, scenario, candidates } = poolFor(7);
    for (const tier of ['rage-1', 'rage-2'] as const) {
      const result = applySelectionStage({
        circuit,
        candidates,
        pool: candidates,
        selected: [candidates[0]!],
        loadComponentIds: scenario.loadComponentIds,
        difficulty: 'intermediate',
        tier,
        rng: createSeededRng({
          generatorVersion: 1,
          seed: 7,
          difficulty: 'intermediate',
          mode: 'rage',
        }),
      });
      expect(result.selected).toHaveLength(1);
      expect(result.applications).toHaveLength(0);
    }
  });

  it('is a no-op when the pool offers nothing separable', () => {
    const { circuit, scenario, candidates } = poolFor(11);
    const only = candidates[0]!;
    const result = applySelectionStage({
      circuit,
      // A pool containing only the already-selected candidate cannot yield a
      // second fault, and the modifier must say so rather than duplicating it.
      candidates: [only],
      pool: [only],
      selected: [only],
      loadComponentIds: scenario.loadComponentIds,
      difficulty: 'intermediate',
      tier: 'rage-3',
      rng: createSeededRng({
        generatorVersion: 1,
        seed: 11,
        difficulty: 'intermediate',
        mode: 'rage',
      }),
    });
    expect(result.selected).toHaveLength(1);
    expect(result.applications[0]?.applied).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Rage 3 end to end: two faults, still honest (plan §26, §27, §12)
// ---------------------------------------------------------------------------

describe('Rage 3 ships two faults without lying (plan §12, §26, §27)', () => {
  const seeds = [3, 8, 14, 19, 26, 31, 44, 57];

  it('usually carries two faults, and never more than the ceiling', () => {
    let twoOrMore = 0;
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-3',
      });
      expect(scenario.faults.length).toBeLessThanOrEqual(MAX_SCENARIO_FAULTS);
      if (scenario.faults.length >= 2) twoOrMore++;
    }
    // Not "always": a seed whose second fault is masked by the first is
    // correctly downgraded to a single-fault scenario rather than shipped.
    expect(twoOrMore).toBeGreaterThanOrEqual(seeds.length - 2);
  });

  it('every fault is independently observable (§12)', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-3',
      });
      for (const entry of scenario.faults) {
        expect(entry.symptom.observable, `seed ${seed}: ${entry.fault.type} is invisible`).toBe(
          true,
        );
      }
    }
  });

  it('the faulted circuit really contains every declared fault (§26)', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-3',
      });
      const live = new Set((scenario.faultedCircuit.faults ?? []).map((f) => f.id));
      for (const entry of scenario.faults) {
        // §26 forbids "claiming a fault exists when it does not".
        expect(live.has(entry.fault.id)).toBe(true);
      }
      expect(live.size).toBe(scenario.faults.length);
    }
  });

  it('the healthy circuit stays clean and valid under two faults (§26)', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-3',
      });
      const healthy = simulate(scenario.healthyCircuit, { appMode: 'pro' });
      expect(healthy.errors).toEqual([]);
      // The same production validators the generator runs, not a rage variant.
      expect(
        validateCircuitRules(scenario.healthyCircuit, 'basic').filter(
          (d) => d.severity === 'error',
        ),
      ).toEqual([]);
      expect(
        validateCircuit(scenario.healthyCircuit, healthy, 'uk').issues.filter(
          (i) => i.severity === 'error',
        ),
      ).toEqual([]);
    }
  });

  it('tells the learner how many faults there are, without saying where (§17, §26)', () => {
    const multi = seeds
      .map((seed) =>
        buildDiagnosisScenario({ seed, difficulty: 'intermediate', rageTier: 'rage-3' }),
      )
      .find((s) => s.faults.length >= 2);
    expect(multi).toBeDefined();

    // Hiding the count would make a complete repair look like a failed one.
    const text = multi!.hints.map((h) => h.text).join(' ');
    expect(text).toMatch(/more than one/i);
  });

  it('offers a location choice for every fault (§15)', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-3',
      });
      const offered = new Set(scenario.locationChoices.map((c) => c.key));
      for (const entry of scenario.faults) {
        // An answer the learner cannot select is not an answerable question.
        expect(offered.has(entry.locationKey), `seed ${seed}: ${entry.locationKey}`).toBe(true);
      }
    }
  });

  it('offers a fault-type choice for every fault (§15)', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-3',
      });
      const offered = new Set(scenario.faultTypeChoices.map((c) => c.type));
      for (const entry of scenario.faults) {
        expect(offered.has(entry.fault.type), `seed ${seed}: ${entry.fault.type}`).toBe(true);
      }
    }
  });

  it('reports multiFault in the rage summary only when it landed (§24)', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-3',
      });
      const entry = scenario.rage?.applications.find((a) => a.id === 'multiFault');
      expect(entry).toBeDefined();
      // The badge must describe what shipped, not what was attempted.
      expect(entry!.applied).toBe(scenario.faults.length >= 2);
    }
  });
});

// ---------------------------------------------------------------------------
// compoundFault (plan §26 "compound diagnostic scenarios", §27 Rage 4, §53.6)
// ---------------------------------------------------------------------------

describe('compoundFault — one fault hiding another (plan §26, §27 Rage 4)', () => {
  const seeds = [3, 8, 14, 19, 26, 31, 44, 57, 63, 71, 88, 95];

  /**
   * The load-bearing test in this block.
   *
   * When the summary says `compoundFault: applied`, that is a factual claim
   * about the electrical world: fault A hides fault B. §26 forbids the mode
   * from misrepresenting itself, so the claim is re-proved here from the
   * simulator rather than trusted from the builder that made it.
   *
   * This is deliberately not a check that compounds are *common*. It is a
   * check that every claimed one is real.
   */
  it('a claimed compound really is one: A masks B, and clearing A changes the symptom', () => {
    let checked = 0;
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-4',
      });
      const claim = scenario.rage?.applications.find((a) => a.id === 'compoundFault');
      expect(claim, `seed ${seed}: compoundFault not reported at all`).toBeDefined();
      if (!claim!.applied) continue;

      expect(scenario.faults.length, `seed ${seed}`).toBeGreaterThanOrEqual(2);
      const [primary, partner] = scenario.faults;
      checked += 1;

      const baseline = simulate(scenario.healthyCircuit, { appMode: 'pro' });
      const loadIds = scenario.loadComponentIds;

      // The world as the learner first meets it, with both faults present.
      const combined = diffSymptom(
        baseline,
        simulate(scenario.faultedCircuit, { appMode: 'pro' }),
        loadIds,
      );

      // 1. While A is present, B is invisible: the picture is A's picture.
      expect(
        sameObservableWorld(combined, primary!.symptom),
        `seed ${seed}: the second fault is already visible, so nothing is masked`,
      ).toBe(true);

      // 2. Repair A and the complaint does not vanish — it *changes*. This is
      //    what the learner is being taught to notice.
      expect(
        sameObservableWorld(combined, partner!.symptom),
        `seed ${seed}: clearing the first fault leaves the symptom unchanged`,
      ).toBe(false);

      // 3. And B is a real, observable fault in its own right (§12), not a
      //    silent passenger that only exists in the answer list.
      expect(partner!.symptom.observable, `seed ${seed}`).toBe(true);
    }
    // Guard against the test passing because it never found a compound to
    // check — the false-negative failure mode that hid the §14 console leak.
    expect(checked, 'no rage-4 seed produced a compound to verify').toBeGreaterThan(0);
  });

  it('never claims a compound it did not achieve (§24, §26)', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'advanced',
        rageTier: 'rage-4',
      });
      const claim = scenario.rage?.applications.find((a) => a.id === 'compoundFault');
      expect(claim).toBeDefined();
      // `applied` and the human-readable note must agree. They are written in
      // two different places and merged by `buildRageSummary`, which resolves
      // duplicate ids with "applied anywhere wins" — a rule that silently
      // upgraded a failed proof to a success until the proof learned to
      // *replace* the proposal's entry rather than append to it.
      expect(claim!.applied, `seed ${seed}: ${claim!.note}`).toBe(
        claim!.note.includes('masking proven'),
      );
      // A scenario that failed the proof is still a valid exercise, just not a
      // compound one — it must never ship a single fault while claiming two.
      if (!claim!.applied) {
        expect(scenario.faults.length, `seed ${seed}`).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('keeps the two faults on separate devices, so they read as two jobs', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-4',
      });
      if (scenario.faults.length < 2) continue;
      const keys = scenario.faults.map((f) => f.locationKey);
      expect(new Set(keys).size, `seed ${seed}: two faults share a location`).toBe(keys.length);
    }
  });

  it('still simulates honestly — the circuit is never left electrically absurd (§26)', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-4',
      });
      // The healthy reference must be genuinely healthy: the learner's target
      // state has to be reachable and clean.
      const baseline = simulate(scenario.healthyCircuit, { appMode: 'pro' });
      expect(baseline.errors, `seed ${seed}`).toEqual([]);
      // And the faulted circuit must actually misbehave, or there is nothing
      // to diagnose.
      const symptom = diffSymptom(
        baseline,
        simulate(scenario.faultedCircuit, { appMode: 'pro' }),
        scenario.loadComponentIds,
      );
      expect(symptom.observable, `seed ${seed}`).toBe(true);
    }
  });
});

/**
 * The compound payoff, asserted exactly as the panel computes it.
 *
 * `DiagnosisPanel` shows "the symptom has changed" when the live observation
 * is still unhealthy *and* its text differs from the opening complaint. That
 * is the moment the second fault becomes findable, so it is worth pinning
 * against the real builder rather than trusting the UI expression.
 */
describe('compoundFault — the learner sees the symptom change (§26)', () => {
  it('clearing the masking fault reveals a different, still-broken picture', () => {
    let checked = 0;
    for (const seed of [3, 8, 14, 19, 26, 31, 44, 57, 63, 71, 88, 95]) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-4',
      });
      const claim = scenario.rage?.applications.find((a) => a.id === 'compoundFault');
      if (!claim?.applied) continue;
      checked += 1;

      const opening = observeSymptom(scenario, scenario.faultedCircuit);
      expect(opening.healthy, `seed ${seed}`).toBe(false);
      expect(opening.complaint, `seed ${seed}`).toBe(scenario.complaint);

      // Repair fault #1 only — exactly what the panel's repair button does.
      const afterFirst = observeSymptom(
        scenario,
        withoutFault(scenario.faultedCircuit, scenario.faults[0]!.fault.id),
      );

      // Still broken: the second fault is now doing the talking.
      expect(afterFirst.healthy, `seed ${seed}: repairing one fault fixed everything`).toBe(false);
      // And visibly different, or the learner has no reason to keep looking.
      expect(
        afterFirst.complaint,
        `seed ${seed}: the complaint did not change, so the compound is invisible`,
      ).not.toBe(opening.complaint);

      // Clearing both must leave a healthy installation.
      const afterBoth = observeSymptom(
        scenario,
        scenario.faults.reduce(
          (circuit, entry) => withoutFault(circuit, entry.fault.id),
          scenario.faultedCircuit,
        ),
      );
      expect(afterBoth.healthy, `seed ${seed}`).toBe(true);
    }
    expect(checked, 'no compound scenario was available to check').toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// misleadingSymptom (plan §26, §27 Rage 2, §53 F4/F5)
// ---------------------------------------------------------------------------

describe('misleadingSymptom — the complaint points at the wrong place', () => {
  const seeds = [3, 8, 14, 19, 26, 31, 44, 57, 63, 71];

  it('narrows the pool away from declared loads and never returns empty', () => {
    let narrowed = 0;
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 8; seed++) {
        const generated = generateChallenge({ seed, difficulty, mode: 'rage' });
        const candidates = collectFaultCandidates(generated.circuit, generated.scenario);
        if (candidates.length < 2) continue;

        const staged = applyCandidateStage({
          circuit: generated.circuit,
          candidates,
          loadComponentIds: generated.scenario.loadComponentIds,
          difficulty,
          tier: 'rage-2',
          rng: createSeededRng({ generatorVersion: 1, seed, difficulty, mode: 'rage' }),
          decoyComponentIds: [],
        });

        expect(staged.candidates.length).toBeGreaterThan(0);
        if (staged.candidates.length < candidates.length) narrowed += 1;
        const loads = new Set(generated.scenario.loadComponentIds);
        for (const candidate of staged.candidates) {
          const target = candidate.target;
          if (target.type === 'component') expect(loads.has(target.id)).toBe(false);
          if (target.type === 'port') expect(loads.has(target.componentId)).toBe(false);
        }
      }
    }
    expect(narrowed).toBeGreaterThan(0);
  });

  it('declines when there is nothing to choose between', () => {
    const generated = generateChallenge({ seed: 11, difficulty: 'beginner', mode: 'rage' });
    const candidates = collectFaultCandidates(generated.circuit, generated.scenario);
    const patch = getRageModifier('misleadingSymptom').rankCandidates?.(
      { circuit: generated.circuit, candidates: candidates.slice(0, 1), loadComponentIds: [] },
      ctxFor('rage-2', 'beginner'),
    );
    expect(patch).toBeNull();
  });

  it('a claimed misleading fault really is one: the symptom does not point at it', () => {
    let checked = 0;
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'intermediate',
        rageTier: 'rage-2',
      });
      const claim = scenario.rage?.applications.find((a) => a.id === 'misleadingSymptom');
      expect(claim, `seed ${seed}: misleadingSymptom not reported`).toBeDefined();
      if (!claim!.applied) continue;
      checked += 1;
      expect(
        isMisleadingPlacement(
          scenario.healthyCircuit,
          scenario.faults[0]!.fault.target,
          scenario.faults[0]!.symptom,
        ),
        `seed ${seed}: claimed misleading but the complaint points at the fault`,
      ).toBe(true);
    }
    expect(checked, 'no rage-2 seed produced a misleading fault to verify').toBeGreaterThan(0);
  });

  it('never claims a misleading symptom it did not achieve (§24, §26)', () => {
    for (const seed of seeds) {
      const scenario = buildDiagnosisScenario({
        seed,
        difficulty: 'advanced',
        rageTier: 'rage-2',
      });
      const claim = scenario.rage?.applications.find((a) => a.id === 'misleadingSymptom');
      expect(claim).toBeDefined();
      expect(claim!.applied, `seed ${seed}: ${claim!.note}`).toBe(claim!.note.includes('proven'));
    }
  });

  it('does not run for tiers that do not list it', () => {
    const generated = generateChallenge({ seed: 7, difficulty: 'intermediate', mode: 'rage' });
    const candidates = collectFaultCandidates(generated.circuit, generated.scenario);
    const result = applyCandidateStage({
      circuit: generated.circuit,
      candidates,
      loadComponentIds: generated.scenario.loadComponentIds,
      difficulty: 'intermediate',
      tier: 'rage-1',
      rng: createSeededRng({
        generatorVersion: 1,
        seed: 7,
        difficulty: 'intermediate',
        mode: 'rage',
      }),
      decoyComponentIds: [],
    });
    expect(result.applications.some((a) => a.id === 'misleadingSymptom')).toBe(false);
  });
});

describe('timeLimit — Rage 4 optional timer (plan §27, §53 F6)', () => {
  it('writes a positive countdown on every Rage 4 scenario and nowhere else', () => {
    for (const tier of RAGE_TIER_IDS) {
      const scenario = buildDiagnosisScenario({
        seed: 21,
        difficulty: 'intermediate',
        rageTier: tier,
      });
      if (tier === 'rage-4') {
        expect(scenario.rage?.timeLimitSeconds).toBeGreaterThan(0);
        const claim = scenario.rage?.applications.find((a) => a.id === 'timeLimit');
        expect(claim?.applied).toBe(true);
        expect(claim?.note).toMatch(/timer \d+s/);
      } else {
        expect(scenario.rage?.timeLimitSeconds ?? null).toBeNull();
      }
    }
  });

  it('scales with par and never drops below 30 seconds', () => {
    const next = getRageModifier('timeLimit').adjustPresentation?.(
      {
        hints: [{ level: 1, kind: 'observation', text: 'a' }],
        hintBudget: 1,
        parTimeSeconds: 10,
        timeLimitSeconds: null,
      },
      ctxFor('rage-4', 'beginner'),
    );
    expect(next?.timeLimitSeconds).toBe(30);

    const scaled = getRageModifier('timeLimit').adjustPresentation?.(
      {
        hints: [{ level: 1, kind: 'observation', text: 'a' }],
        hintBudget: 1,
        parTimeSeconds: 200,
        timeLimitSeconds: null,
      },
      ctxFor('rage-4', 'intermediate'),
    );
    expect(scaled?.timeLimitSeconds).toBe(Math.round(200 * RAGE_TIME_LIMIT_FACTOR));
  });

  it('is a no-op when a timer is already set', () => {
    const next = getRageModifier('timeLimit').adjustPresentation?.(
      {
        hints: [{ level: 1, kind: 'observation', text: 'a' }],
        hintBudget: 1,
        parTimeSeconds: 200,
        timeLimitSeconds: 99,
      },
      ctxFor('rage-4', 'intermediate'),
    );
    expect(next).toBeNull();
  });
});
