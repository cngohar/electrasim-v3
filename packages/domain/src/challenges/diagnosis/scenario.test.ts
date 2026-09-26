/**
 * diagnosis/scenario.ts — tests (plan §12 mandatory observability,
 * §14 vague briefing, §15 answer options, §17 progressive hints,
 * §5 determinism, §29 identity).
 */

import { describe, expect, it } from 'vitest';
import { simulate } from '../../simulation';
import { getDifficultyProfile } from '../difficulty/profiles';
import type { ChallengeDifficulty } from '../types';
import {
  DiagnosisScenarioError,
  buildDiagnosisScenario,
  locationKeyFor,
  primaryScenarioFault,
} from './scenario';

const DIFFICULTIES: ChallengeDifficulty[] = ['beginner', 'intermediate', 'advanced'];

describe('buildDiagnosisScenario', () => {
  it('is deterministic: the same seed yields the same scenario', () => {
    for (const difficulty of DIFFICULTIES) {
      const a = buildDiagnosisScenario({ seed: 4242, difficulty });
      const b = buildDiagnosisScenario({ seed: 4242, difficulty });
      expect(a.challengeId).toBe(b.challengeId);
      expect(a.faults).toEqual(b.faults);
      expect(a.faultTypeChoices).toEqual(b.faultTypeChoices);
      expect(JSON.stringify(a.faultedCircuit)).toBe(JSON.stringify(b.faultedCircuit));
    }
  });

  it('mints a diagnosis identity, not a challenge one (plan §29)', () => {
    const scenario = buildDiagnosisScenario({ seed: 7, difficulty: 'beginner' });
    expect(scenario.challengeId).toMatch(/^ES-DIAG-\d{6}$/);
    expect(scenario.identity.displayId).toBe(scenario.challengeId);
  });

  it('injects every scenario fault, and the result is observable (plan §12)', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 25; seed++) {
        const scenario = buildDiagnosisScenario({ seed: seed * 91 + 5, difficulty });
        expect(scenario.faults.length).toBeGreaterThanOrEqual(1);
        // The faulted circuit carries exactly the scenario's faults — no more
        // (a stray fault would be undiagnosable) and no fewer (an uninjected
        // fault would be unfindable).
        expect(scenario.faultedCircuit.faults).toEqual(scenario.faults.map((e) => e.fault));
        expect(scenario.symptom.observable).toBe(true);
      }
    }
  });

  it('a plain exercise carries exactly one fault (§14)', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 15; seed++) {
        const scenario = buildDiagnosisScenario({ seed: seed * 37 + 3, difficulty });
        expect(scenario.faults).toHaveLength(1);
      }
    }
  });

  it('exposes the first fault as the single representative (multi-fault accessor)', () => {
    const scenario = buildDiagnosisScenario({ seed: 909, difficulty: 'intermediate' });
    expect(primaryScenarioFault(scenario)).toBe(scenario.faults[0]);
  });

  it('hands over a healthy circuit that genuinely works', () => {
    for (let seed = 0; seed < 15; seed++) {
      const scenario = buildDiagnosisScenario({ seed: seed * 37 + 2, difficulty: 'intermediate' });
      expect(simulate(scenario.healthyCircuit, { appMode: 'pro' }).errors).toHaveLength(0);
      expect(scenario.healthyCircuit.faults ?? []).toHaveLength(0);
    }
  });

  it('the faulted circuit really does behave differently from the healthy one', () => {
    for (let seed = 0; seed < 15; seed++) {
      const scenario = buildDiagnosisScenario({ seed: seed * 43 + 6, difficulty: 'intermediate' });
      const healthy = simulate(scenario.healthyCircuit, { appMode: 'pro' });
      const faulted = simulate(scenario.faultedCircuit, { appMode: 'pro' });
      const changed =
        healthy.energizedComponents.size !== faulted.energizedComponents.size ||
        healthy.errors.length !== faulted.errors.length ||
        healthy.errorComponents.size !== faulted.errorComponents.size ||
        healthy.errorWires.size !== faulted.errorWires.size ||
        (healthy.trippedComponents?.length ?? 0) !== (faulted.trippedComponents?.length ?? 0);
      expect(changed).toBe(true);
    }
  });

  it('offers the correct answer among the fault-type choices (§15A)', () => {
    for (const difficulty of DIFFICULTIES) {
      const expected = getDifficultyProfile(difficulty).diagnosticChoiceCount;
      for (let seed = 0; seed < 15; seed++) {
        const scenario = buildDiagnosisScenario({ seed: seed * 59 + 8, difficulty });
        const types = scenario.faultTypeChoices.map((c) => c.type);
        expect(types).toContain(primaryScenarioFault(scenario).fault.type);
        expect(new Set(types).size).toBe(types.length);
        expect(types.length).toBeLessThanOrEqual(expected);
      }
    }
  });

  it('offers the correct answer among the location choices (§15B)', () => {
    for (let seed = 0; seed < 20; seed++) {
      const scenario = buildDiagnosisScenario({ seed: seed * 67 + 4, difficulty: 'advanced' });
      const keys = scenario.locationChoices.map((c) => c.key);
      expect(keys).toContain(primaryScenarioFault(scenario).locationKey);
      expect(new Set(keys).size).toBe(keys.length);
      expect(keys.length).toBeGreaterThan(1);
    }
  });

  it('does not let the choice list shape leak the answer', () => {
    // If only one kind of location were ever offered, the fault's placement
    // would be deducible without any diagnosis at all.
    const scenario = buildDiagnosisScenario({ seed: 1234, difficulty: 'advanced' });
    expect(new Set(scenario.locationChoices.map((c) => c.kind)).size).toBeGreaterThan(1);
  });

  it('keeps the brief vague — it never names the fault type (plan §14)', () => {
    for (let seed = 0; seed < 20; seed++) {
      const scenario = buildDiagnosisScenario({ seed: seed * 71 + 3, difficulty: 'intermediate' });
      const prose = `${scenario.complaint} ${scenario.brief}`.toLowerCase();
      expect(prose).not.toContain(primaryScenarioFault(scenario).fault.type.replace(/-/g, ' '));
      expect(prose).not.toContain(primaryScenarioFault(scenario).fault.type);
    }
  });

  it('supplies three progressive hints within the difficulty budget (§17)', () => {
    for (const difficulty of DIFFICULTIES) {
      const scenario = buildDiagnosisScenario({ seed: 999, difficulty });
      expect(scenario.hints.map((h) => h.level)).toEqual([1, 2, 3]);
      expect(scenario.hints.map((h) => h.kind)).toEqual(['observation', 'direction', 'location']);
      for (const hint of scenario.hints) expect(hint.text.length).toBeGreaterThan(10);
      expect(scenario.hintBudget).toBe(getDifficultyProfile(difficulty).hintBudget);
      expect(scenario.parTimeSeconds).toBe(getDifficultyProfile(difficulty).parTimeSeconds);
    }
  });

  it('only the final hint pinpoints the location', () => {
    for (let seed = 0; seed < 10; seed++) {
      const scenario = buildDiagnosisScenario({ seed: seed * 13 + 1, difficulty: 'intermediate' });
      const target = primaryScenarioFault(scenario).fault.target;
      const id = target.type === 'port' ? target.componentId : target.id;
      const label = scenario.locationChoices.find(
        (c) => c.key === primaryScenarioFault(scenario).locationKey,
      )?.label;
      expect(scenario.hints[0].text).not.toContain(id);
      expect(scenario.hints[1].text).not.toContain(id);
      expect(label).toBeTruthy();
    }
  });

  it('does not mutate its returned circuits between calls', () => {
    const a = buildDiagnosisScenario({ seed: 88, difficulty: 'beginner' });
    a.faultedCircuit.wires.pop();
    const b = buildDiagnosisScenario({ seed: 88, difficulty: 'beginner' });
    expect(b.faultedCircuit.wires.length).toBe(a.healthyCircuit.wires.length);
  });

  it('reports the dead loads it describes', () => {
    for (let seed = 0; seed < 20; seed++) {
      const scenario = buildDiagnosisScenario({ seed: seed * 29 + 12, difficulty: 'beginner' });
      expect(scenario.deadLoadLabels).toHaveLength(scenario.symptom.deEnergisedLoadIds.length);
    }
  });

  it('gives up loudly rather than shipping an unobservable scenario (§37)', () => {
    expect(() =>
      buildDiagnosisScenario({ seed: 5, difficulty: 'beginner', maxAttempts: 0 }),
    ).toThrow(DiagnosisScenarioError);
  });
});

describe('locationKeyFor', () => {
  it('matches the key the scenario publishes', () => {
    for (let seed = 0; seed < 10; seed++) {
      const scenario = buildDiagnosisScenario({ seed: seed * 101 + 7, difficulty: 'advanced' });
      const target = primaryScenarioFault(scenario).fault.target;
      expect(
        locationKeyFor({
          type: primaryScenarioFault(scenario).fault.type,
          target,
          placement: 'wire',
          key: 'ignored',
        }),
      ).toBe(primaryScenarioFault(scenario).locationKey);
    }
  });
});

describe('location choices are individually selectable (plan §15)', () => {
  /**
   * Two options that render identically make the exercise unfair: the answer
   * form takes one location, so a learner who picks the wrong twin is marked
   * wrong for a distinction the UI never showed them.
   *
   * Both real causes are covered by sweeping seeds rather than by a fixture,
   * because both arise from ordinary generator output — a socket's live and
   * neutral drops between the same two devices, and a recipe with two
   * identical bulbs on separate branches.
   */
  it('never offers two options with the same label', () => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const) {
      for (let i = 0; i < 40; i++) {
        const seed = i * 7919 + 13;
        const scenario = buildDiagnosisScenario({ seed, difficulty });
        const labels = scenario.locationChoices.map((c) => c.label);
        expect(new Set(labels).size, `${difficulty}/${seed}`).toBe(labels.length);
      }
    }
  });

  it('leaves already-unique labels untouched', () => {
    // The qualifier is a targeted repair, not a blanket rename: a circuit with
    // no collisions must read exactly as it did before.
    const scenario = buildDiagnosisScenario({ seed: 13, difficulty: 'beginner' });
    const labels = scenario.locationChoices.map((c) => c.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels.some((label) => label.includes('['))).toBe(false);
  });

  it('keeps every fault answerable, including the disambiguated ones', () => {
    for (let i = 0; i < 40; i++) {
      const scenario = buildDiagnosisScenario({
        seed: i * 7919 + 13,
        difficulty: 'advanced',
        rageTier: 'rage-3',
      });
      for (const entry of scenario.faults) {
        // Rewriting a label must not break the key the grader matches on.
        expect(scenario.locationChoices.some((c) => c.key === entry.locationKey)).toBe(true);
      }
    }
  });
});
