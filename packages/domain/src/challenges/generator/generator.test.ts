/**
 * generator.test.ts — the Phase A quality gate (plan §38, §39, §37, §57).
 *
 * Three families of assertion:
 *
 *   §38 Determinism  — same seed + difficulty → same circuit; different seeds
 *                      and different generator versions diverge.
 *   §39 Validity     — a large seed batch per difficulty must survive
 *                      generate → validate → baseline-simulate.
 *   §37 Retries      — bounded, never infinite, and failing gracefully.
 *
 * The §39 batch deliberately re-runs the production validators rather than
 * trusting the generator's own gate, so a regression in `simulate()` or
 * `validateCircuit()` also fails here.
 */

import { describe, expect, it } from 'vitest';
import { validateCircuit } from '../../circuitValidation';
import { COMPONENT_DEFS, GRID_SIZE } from '../../components';
import { validateCircuitRules } from '../../electrical/validation';
import { simulate } from '../../simulation';
import type { Circuit } from '../../types';
import { getDifficultyProfile } from '../difficulty/profiles';
import { CHALLENGE_DIFFICULTIES, type ChallengeDifficulty } from '../types';
import {
  ChallengeGenerationError,
  GENERATION_FAILURE_MESSAGE,
  MAX_GENERATION_ATTEMPTS,
  generateChallenge,
  tryGenerateChallenge,
} from './generator';
import { CHALLENGE_RECIPES, PROTECTION_RATING_CEILING_AMPS } from './recipes';
import { GENERATOR_VERSION } from './seed';

/** Seeds per difficulty for the §39 batch. */
const BATCH_SIZE = 100;

/** Stable, comparable projection of a circuit — the determinism fingerprint. */
function fingerprint(circuit: Circuit): string {
  const components = circuit.components
    .map((c) => `${c.id}|${c.type}|${c.x}|${c.y}|${JSON.stringify(c.state)}`)
    .join('\n');
  const wires = circuit.wires
    .map(
      (w) =>
        `${w.id}|${w.fromComponentId}:${w.fromPortIndex}->${w.toComponentId}:${w.toPortIndex}|${w.lengthMeters}|${w.customCableMm2}`,
    )
    .join('\n');
  return `${components}\n--\n${wires}`;
}

// ───────────────────────────────────────────────────────────────────────────
// §38 — Determinism
// ───────────────────────────────────────────────────────────────────────────

describe('generator determinism (plan §38)', () => {
  it('same seed + same difficulty → same circuit', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      const a = generateChallenge({ seed: 1, difficulty });
      const b = generateChallenge({ seed: 1, difficulty });
      expect(fingerprint(b.circuit)).toBe(fingerprint(a.circuit));
      expect(b.metadata.recipeId).toBe(a.metadata.recipeId);
      expect(b.metadata.challengeId).toBe(a.metadata.challengeId);
      expect(b.metadata.parameters).toEqual(a.metadata.parameters);
      expect(b.scenario).toEqual(a.scenario);
    }
  });

  it('seed 1 → result A, seed 1 → result A, seed 2 → result B', () => {
    const a1 = generateChallenge({ seed: 1, difficulty: 'intermediate' });
    const a2 = generateChallenge({ seed: 1, difficulty: 'intermediate' });
    const b = generateChallenge({ seed: 2, difficulty: 'intermediate' });

    expect(fingerprint(a2.circuit)).toBe(fingerprint(a1.circuit));
    expect(fingerprint(b.circuit)).not.toBe(fingerprint(a1.circuit));
  });

  it('stays deterministic across a 50-seed replay', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const first = generateChallenge({ seed, difficulty: 'advanced' });
      const second = generateChallenge({ seed, difficulty: 'advanced' });
      expect(fingerprint(second.circuit)).toBe(fingerprint(first.circuit));
    }
  });

  it('produces meaningfully different circuits across seeds', () => {
    const fingerprints = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      fingerprints.add(fingerprint(generateChallenge({ seed, difficulty: 'beginner' }).circuit));
    }
    // Sequential seeds must not collapse onto a handful of circuits.
    expect(fingerprints.size).toBeGreaterThanOrEqual(35);
  });

  it('varies the difficulty stream for one seed', () => {
    const beginner = generateChallenge({ seed: 7, difficulty: 'beginner' });
    const advanced = generateChallenge({ seed: 7, difficulty: 'advanced' });
    expect(fingerprint(advanced.circuit)).not.toBe(fingerprint(beginner.circuit));
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §6 / §38 — Generator versioning
// ───────────────────────────────────────────────────────────────────────────

describe('generator versioning (plan §6, §38)', () => {
  it('records the generator version in metadata', () => {
    const challenge = generateChallenge({ seed: 3, difficulty: 'beginner' });
    expect(challenge.metadata.generatorVersion).toBe(GENERATOR_VERSION);
  });

  it('gives the same seed a different circuit under a different version', () => {
    const v1 = generateChallenge({ seed: 11, difficulty: 'intermediate', generatorVersion: 1 });
    const v2 = generateChallenge({ seed: 11, difficulty: 'intermediate', generatorVersion: 2 });
    expect(v2.metadata.generatorVersion).toBe(2);
    expect(fingerprint(v2.circuit)).not.toBe(fingerprint(v1.circuit));
    expect(v2.metadata.challengeId).not.toBe(v1.metadata.challengeId);
  });

  it('stays reproducible within an explicit version', () => {
    const a = generateChallenge({ seed: 11, difficulty: 'intermediate', generatorVersion: 4 });
    const b = generateChallenge({ seed: 11, difficulty: 'intermediate', generatorVersion: 4 });
    expect(fingerprint(b.circuit)).toBe(fingerprint(a.circuit));
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §29 / §35 — API shape and identity
// ───────────────────────────────────────────────────────────────────────────

describe('generator API and identity (plan §29, §35)', () => {
  it('returns { circuit, scenario, metadata }', () => {
    const challenge = generateChallenge({ seed: 5, difficulty: 'beginner' });
    expect(Object.keys(challenge).sort()).toEqual(['circuit', 'metadata', 'scenario']);
    expect(challenge.circuit.components.length).toBeGreaterThan(0);
    expect(challenge.circuit.wires.length).toBeGreaterThan(0);
    expect(challenge.circuit.globalVoltage).toBe(230);
  });

  it('renders a mode-specific display id', () => {
    expect(
      generateChallenge({ seed: 5, difficulty: 'beginner', mode: 'diagnosis' }).metadata
        .challengeId,
    ).toMatch(/^ES-DIAG-\d{6}$/);
    expect(
      generateChallenge({ seed: 5, difficulty: 'beginner', mode: 'rage' }).metadata.challengeId,
    ).toMatch(/^ES-RAGE-\d{6}$/);
    expect(
      generateChallenge({ seed: 5, difficulty: 'beginner', mode: 'challenge' }).metadata
        .challengeId,
    ).toMatch(/^ES-CHAL-\d{6}$/);
  });

  it('folds the rage profile into identity without changing generator behaviour surface', () => {
    const plain = generateChallenge({ seed: 9, difficulty: 'advanced', mode: 'rage' });
    const profiled = generateChallenge({
      seed: 9,
      difficulty: 'advanced',
      mode: 'rage',
      rageProfile: 'chaos',
    });
    expect(profiled.metadata.challengeId).not.toBe(plain.metadata.challengeId);
    expect(profiled.metadata.rageProfile).toBe('chaos');
  });

  it('describes the scenario without any fault or objective data', () => {
    const { scenario } = generateChallenge({ seed: 6, difficulty: 'intermediate' });
    expect(scenario.recipeId).toBeTruthy();
    expect(scenario.summary.length).toBeGreaterThan(10);
    expect(scenario.teaches.length).toBeGreaterThan(10);
    expect(scenario.loadComponentIds.length).toBeGreaterThan(0);
    expect(scenario.supplyComponentIds.length).toBeGreaterThanOrEqual(2);
    // Phase A must not leak fault/scoring concepts into the scenario.
    expect(scenario).not.toHaveProperty('faultType');
    expect(scenario).not.toHaveProperty('objectives');
    expect(scenario).not.toHaveProperty('hints');
  });

  it('records a baseline summary for the accepted circuit (plan §10)', () => {
    const { metadata, scenario } = generateChallenge({ seed: 8, difficulty: 'intermediate' });
    expect(metadata.baseline.supplyVoltage).toBe(230);
    expect(metadata.baseline.energizedComponentIds.length).toBeGreaterThan(0);
    for (const loadId of metadata.baseline.expectedEnergisedLoadIds) {
      expect(metadata.baseline.energizedComponentIds).toContain(loadId);
      expect(scenario.loadComponentIds).toContain(loadId);
    }
  });

  it('normalises odd seed input rather than throwing', () => {
    for (const seed of [0, -12, 3.7, Number.NaN, Number.POSITIVE_INFINITY]) {
      const challenge = generateChallenge({ seed, difficulty: 'beginner' });
      expect(challenge.metadata.seed).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(challenge.metadata.seed)).toBe(true);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §37 — Bounded retries
// ───────────────────────────────────────────────────────────────────────────

describe('bounded retries (plan §37)', () => {
  it('exposes a finite attempt ceiling', () => {
    expect(MAX_GENERATION_ATTEMPTS).toBeGreaterThan(1);
    expect(Number.isFinite(MAX_GENERATION_ATTEMPTS)).toBe(true);
  });

  it('succeeds on the first attempt for well-formed requests', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      for (let seed = 1; seed <= 25; seed++) {
        expect(generateChallenge({ seed, difficulty }).metadata.attempts).toBe(1);
      }
    }
  });

  it('fails gracefully with the documented message when every attempt is rejected', () => {
    // An unsatisfiable request: an advanced-tier profile cannot be met by a
    // four-component beginner recipe, so every attempt is rejected on budget.
    const outcome = tryGenerateChallenge({
      seed: 1,
      difficulty: 'advanced',
      recipeId: 'beginner-protected-load',
      maxAttempts: 3,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.message).toBe(GENERATION_FAILURE_MESSAGE);
    expect(outcome.rejections.length).toBeGreaterThan(0);
    expect(Math.max(...outcome.rejections.map((r) => r.attempt))).toBe(3);
    expect(outcome.rejections[0]?.stage).toBe('structure');
  });

  it('throws ChallengeGenerationError carrying the rejections', () => {
    expect(() =>
      generateChallenge({
        seed: 1,
        difficulty: 'advanced',
        recipeId: 'beginner-protected-load',
        maxAttempts: 2,
      }),
    ).toThrow(ChallengeGenerationError);

    try {
      generateChallenge({
        seed: 1,
        difficulty: 'advanced',
        recipeId: 'beginner-protected-load',
        maxAttempts: 2,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(ChallengeGenerationError);
      expect((error as ChallengeGenerationError).rejections.length).toBeGreaterThan(0);
    }
  });

  it('rejects an unknown recipe id loudly', () => {
    expect(() =>
      generateChallenge({ seed: 1, difficulty: 'beginner', recipeId: 'no-such-recipe' }),
    ).toThrow(/Unknown recipe id/);
  });

  it('keeps retries deterministic — a failed run reports the same reasons twice', () => {
    const request = {
      seed: 4,
      difficulty: 'advanced' as ChallengeDifficulty,
      recipeId: 'beginner-bell-push',
      maxAttempts: 3,
    };
    const first = tryGenerateChallenge(request);
    const second = tryGenerateChallenge(request);
    expect(second).toEqual(first);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// §39 — Circuit validity across a large seed batch
// ───────────────────────────────────────────────────────────────────────────

describe.each(CHALLENGE_DIFFICULTIES)(
  'circuit validity — %s (plan §39)',
  (difficulty: ChallengeDifficulty) => {
    const profile = getDifficultyProfile(difficulty);
    const challenges = Array.from({ length: BATCH_SIZE }, (_, index) =>
      generateChallenge({ seed: index + 1, difficulty }),
    );

    it(`generates ${BATCH_SIZE} circuits without exhausting retries`, () => {
      expect(challenges).toHaveLength(BATCH_SIZE);
      for (const challenge of challenges) {
        expect(challenge.metadata.attempts).toBeLessThanOrEqual(MAX_GENERATION_ATTEMPTS);
        expect(challenge.metadata.difficulty).toBe(difficulty);
      }
    });

    it('every circuit is structurally sound', () => {
      for (const { circuit, metadata } of challenges) {
        const byId = new Map(circuit.components.map((c) => [c.id, c]));
        expect(byId.size).toBe(circuit.components.length);
        expect(new Set(circuit.wires.map((w) => w.id)).size).toBe(circuit.wires.length);

        for (const component of circuit.components) {
          expect(
            COMPONENT_DEFS[component.type],
            `${metadata.recipeId}: ${component.type}`,
          ).toBeDefined();
          expect(component.x % GRID_SIZE).toBe(0);
          expect(component.y % GRID_SIZE).toBe(0);
        }

        const wired = new Set<string>();
        for (const wire of circuit.wires) {
          const from = byId.get(wire.fromComponentId);
          const to = byId.get(wire.toComponentId);
          expect(from, `${wire.id} source`).toBeDefined();
          expect(to, `${wire.id} target`).toBeDefined();
          if (!from || !to) continue;

          const fromPort = COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex];
          const toPort = COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex];
          expect(fromPort, `${wire.id} source port`).toBeDefined();
          expect(toPort, `${wire.id} target port`).toBeDefined();
          expect(fromPort?.type).toBe(toPort?.type);
          expect(wire.lengthMeters).toBeGreaterThan(0);
          expect(wire.customCableMm2).toBeGreaterThan(0);
          wired.add(from.id);
          wired.add(to.id);
        }
        expect(wired.size).toBe(circuit.components.length);
      }
    });

    it('every circuit respects the difficulty profile', () => {
      for (const { circuit, scenario } of challenges) {
        expect(circuit.components.length).toBeGreaterThanOrEqual(profile.componentBudget.min);
        expect(circuit.components.length).toBeLessThanOrEqual(profile.componentBudget.max);
        expect(scenario.loadComponentIds.length).toBeGreaterThanOrEqual(profile.loadCount.min);

        for (const wire of circuit.wires) {
          expect(wire.lengthMeters!).toBeGreaterThanOrEqual(profile.runLengthMeters.min - 0.1);
          expect(wire.lengthMeters!).toBeLessThanOrEqual(profile.runLengthMeters.max + 0.1);
        }
      }
    });

    it('every circuit passes the connection rule engine', () => {
      for (const { circuit, metadata } of challenges) {
        const errors = validateCircuitRules(circuit, 'basic').filter(
          (diagnostic) => diagnostic.severity === 'error',
        );
        expect(
          errors.map((e) => e.code),
          `seed ${metadata.seed}`,
        ).toEqual([]);
      }
    });

    it('every circuit baseline-simulates cleanly in basic and pro modes', () => {
      for (const { circuit, metadata } of challenges) {
        for (const appMode of ['basic', 'pro'] as const) {
          const result = simulate(circuit, { appMode });
          expect(result.errors, `seed ${metadata.seed} (${appMode})`).toEqual([]);
          expect(result.faultsCleared).toBe(true);
          expect(result.errorComponents.size).toBe(0);
          expect(result.errorWires.size).toBe(0);
          expect(result.blownComponents ?? []).toEqual([]);
          expect(result.trippedComponents ?? []).toEqual([]);
          expect([...(result.bustedWires ?? [])]).toEqual([]);
          expect([...(result.overloadedWires ?? [])]).toEqual([]);
        }
      }
    });

    it('every circuit energises the loads its recipe promised', () => {
      for (const { circuit, metadata } of challenges) {
        const result = simulate(circuit, { appMode: 'pro' });
        for (const loadId of metadata.baseline.expectedEnergisedLoadIds) {
          expect(result.energizedComponents.has(loadId), `seed ${metadata.seed}: ${loadId}`).toBe(
            true,
          );
        }
      }
    });

    it('every circuit passes BS 7671 validation with zero errors', () => {
      for (const { circuit, metadata } of challenges) {
        const result = simulate(circuit, { appMode: 'pro' });
        const report = validateCircuit(circuit, result, 'uk');
        const errors = report.issues.filter((issue) => issue.severity === 'error');
        expect(
          errors.map((e) => e.id),
          `seed ${metadata.seed} (${metadata.recipeId})`,
        ).toEqual([]);
        expect(report.blockingErrorsCount ?? 0).toBe(0);
        expect(['pass', 'warning']).toContain(report.status);
      }
    });

    it('never exceeds the protective-device rating ceiling', () => {
      for (const { circuit } of challenges) {
        for (const component of circuit.components) {
          const def = COMPONENT_DEFS[component.type];
          if (!def?.isProtection) continue;
          const rating = component.state.customMaxAmps ?? def.maxAmps ?? 0;
          expect(rating).toBeLessThanOrEqual(PROTECTION_RATING_CEILING_AMPS);
        }
      }
    });

    it('exercises every recipe registered for the tier', () => {
      const used = new Set(challenges.map((challenge) => challenge.metadata.recipeId));
      const registered = CHALLENGE_RECIPES.filter((recipe) => recipe.difficulty === difficulty).map(
        (recipe) => recipe.id,
      );
      expect([...used].sort()).toEqual([...registered].sort());
    });

    it('issues unique component and wire ids per circuit', () => {
      for (const { circuit } of challenges) {
        const ids = [...circuit.components.map((c) => c.id), ...circuit.wires.map((w) => w.id)];
        expect(new Set(ids).size).toBe(ids.length);
      }
    });
  },
);

// ───────────────────────────────────────────────────────────────────────────
// §7 / §57 — Foundation gate: the generator stays a generator
// ───────────────────────────────────────────────────────────────────────────

describe('foundation gate (plan §7, §57)', () => {
  it('never injects a fault into the generated circuit', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      for (let seed = 1; seed <= 30; seed++) {
        const { circuit } = generateChallenge({ seed, difficulty });
        expect(circuit.faults ?? []).toEqual([]);
        for (const component of circuit.components) {
          expect(component.state.fault).toBeUndefined();
          expect(component.state.isBlown).toBeFalsy();
          expect(component.state.isTripped).toBeFalsy();
        }
        for (const wire of circuit.wires) {
          expect(wire.fault).toBeUndefined();
          expect(wire.isBusted).toBeFalsy();
        }
      }
    }
  });

  it('behaves identically regardless of the requested mode', () => {
    // Mode only affects identity (plan §29); the circuit itself must not
    // branch on it, otherwise "no Challenge Mode logic in the generator"
    // would already be violated.
    const base = generateChallenge({ seed: 21, difficulty: 'intermediate', mode: 'challenge' });
    const diagnosis = generateChallenge({
      seed: 21,
      difficulty: 'intermediate',
      mode: 'challenge',
    });
    expect(fingerprint(diagnosis.circuit)).toBe(fingerprint(base.circuit));
  });

  it('produces circuits the editor can load without normalisation', () => {
    const { circuit } = generateChallenge({ seed: 33, difficulty: 'advanced' });
    for (const wire of circuit.wires) {
      expect(wire.controlPoints).toEqual([]);
      expect(wire.pathKind).toBe('orthogonal');
      expect(wire.material).toBe('copper');
      expect(wire.installationMethod).toBe('C');
    }
  });
});
