/**
 * diagnosis/evaluator.ts — tests for the plan §41 truth table.
 *
 *   | diagnosis        | repair            | verdict    |
 *   |------------------|-------------------|------------|
 *   | correct type+loc | circuit recovered | success    |
 *   | correct type+loc | fault still live  | incomplete |
 *   | anything else    | —                 | failure    |
 *
 * Plus §16: never complete on a correct guess alone.
 */

import { describe, expect, it } from 'vitest';
import { validateFaultCoexistence } from '../../faults';
import { simulate } from '../../simulation';
import type { Circuit } from '../../types';
import { collectFaultCandidates } from '../faults/eligibility';
import { createScenarioFault, withScenarioFaults, withoutFault } from '../faults/injection';
import { diffSymptom } from '../faults/verification';
import { evaluateDiagnosis, observeSymptom } from './evaluator';
import {
  type DiagnosisScenario,
  type ScenarioFault,
  buildDiagnosisScenario,
  locationKeyFor,
  primaryScenarioFault,
} from './scenario';

/**
 * Every scenario the ordinary generator produces carries exactly one fault, so
 * these cases read against the first (and only) entry. The multi-fault rules
 * get their own describe block below, built from hand-assembled scenarios.
 */
function scenarioFor(
  seed: number,
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
) {
  const scenario = buildDiagnosisScenario({ seed, difficulty });
  const { fault, locationKey } = primaryScenarioFault(scenario);
  const correct = { faultType: fault.type, locationKey };
  const repaired = withoutFault(scenario.faultedCircuit, fault.id);
  return { scenario, fault, locationKey, correct, repaired };
}

describe('evaluateDiagnosis — §41 truth table', () => {
  it('correct diagnosis + repaired circuit = success', () => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const) {
      for (let seed = 0; seed < 12; seed++) {
        const { scenario, correct, repaired } = scenarioFor(seed * 83 + 5, difficulty);
        const result = evaluateDiagnosis(scenario, repaired, correct);
        expect(result.verdict).toBe('success');
        expect(result.success).toBe(true);
        expect(result.diagnosisCorrect).toBe(true);
        expect(result.recovered).toBe(true);
        expect(result.recoveryGap).toBeNull();
      }
    }
  });

  it('correct diagnosis + unrepaired circuit = incomplete, never success (§16)', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { scenario, correct } = scenarioFor(seed * 97 + 11);
      const result = evaluateDiagnosis(scenario, scenario.faultedCircuit, correct);
      expect(result.verdict).toBe('incomplete');
      expect(result.success).toBe(false);
      expect(result.diagnosisCorrect).toBe(true);
      expect(result.faultCleared).toBe(false);
      expect(result.recoveryGap).toBeTruthy();
    }
  });

  it('wrong fault type = failure, even on a repaired circuit', () => {
    for (let seed = 0; seed < 15; seed++) {
      const { scenario, fault, locationKey, repaired } = scenarioFor(seed * 53 + 7);
      const wrong = scenario.faultTypeChoices.find((c) => c.type !== fault.type);
      if (!wrong) continue;
      const result = evaluateDiagnosis(scenario, repaired, {
        faultType: wrong.type,
        locationKey,
      });
      expect(result.verdict).toBe('failure');
      expect(result.typeCorrect).toBe(false);
      expect(result.locationCorrect).toBe(true);
    }
  });

  it('wrong location = failure, even with the right fault type', () => {
    for (let seed = 0; seed < 15; seed++) {
      const { scenario, fault, locationKey, repaired } = scenarioFor(seed * 61 + 13);
      const wrong = scenario.locationChoices.find((c) => c.key !== locationKey);
      if (!wrong) continue;
      const result = evaluateDiagnosis(scenario, repaired, {
        faultType: fault.type,
        locationKey: wrong.key,
      });
      expect(result.verdict).toBe('failure');
      expect(result.typeCorrect).toBe(true);
      expect(result.locationCorrect).toBe(false);
    }
  });
});

describe('evaluateDiagnosis — what counts as a repair', () => {
  it('accepts a cable replaced by a new one between the same terminals', () => {
    let checked = 0;
    for (let seed = 0; seed < 30 && checked < 6; seed++) {
      const { scenario, fault, correct } = scenarioFor(seed * 313 + 11);
      if (fault.target.type !== 'wire') continue;
      const id = fault.target.id;
      const old = scenario.faultedCircuit.wires.find((w) => w.id === id);
      if (!old) continue;
      const circuit: Circuit = {
        ...scenario.faultedCircuit,
        wires: [
          ...scenario.faultedCircuit.wires.filter((w) => w.id !== id),
          { ...old, id: `wire_replacement_${seed}`, fault: undefined },
        ],
        faults: [],
      };
      expect(evaluateDiagnosis(scenario, circuit, correct).verdict).toBe('success');
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('rejects "repair by deletion" — cutting the faulty wire out is not a fix', () => {
    let checked = 0;
    for (let seed = 0; seed < 40 && checked < 8; seed++) {
      const { scenario, fault, correct } = scenarioFor(seed * 313 + 11);
      if (fault.target.type !== 'wire') continue;
      const id = fault.target.id;
      const circuit: Circuit = {
        ...scenario.faultedCircuit,
        wires: scenario.faultedCircuit.wires.filter((w) => w.id !== id),
        faults: [],
      };
      const result = evaluateDiagnosis(scenario, circuit, correct);
      expect(result.verdict).toBe('incomplete');
      expect(result.success).toBe(false);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('rejects deleting the load to silence the symptom', () => {
    for (let seed = 0; seed < 10; seed++) {
      const { scenario, correct } = scenarioFor(seed * 149 + 3);
      const loadId = scenario.loadComponentIds[0];
      if (!loadId) continue;
      const circuit: Circuit = {
        ...scenario.faultedCircuit,
        components: scenario.faultedCircuit.components.filter((c) => c.id !== loadId),
        wires: scenario.faultedCircuit.wires.filter(
          (w) => w.fromComponentId !== loadId && w.toComponentId !== loadId,
        ),
        faults: [],
      };
      expect(evaluateDiagnosis(scenario, circuit, correct).success).toBe(false);
    }
  });
});

describe('evaluateDiagnosis — feedback', () => {
  it('never reveals the fault location while the answer is still wrong (§14/§17)', () => {
    for (let seed = 0; seed < 15; seed++) {
      const { scenario, fault, locationKey, repaired } = scenarioFor(seed * 71 + 9);
      const wrong = scenario.faultTypeChoices.find((c) => c.type !== fault.type);
      if (!wrong) continue;
      const result = evaluateDiagnosis(scenario, repaired, {
        faultType: wrong.type,
        locationKey,
      });
      const target = fault.target;
      const id = target.type === 'port' ? target.componentId : target.id;
      expect(result.guidance).not.toContain(id);
      expect(result.guidance.length).toBeGreaterThan(10);
    }
  });

  it('tells a learner who found it but has not fixed it what to do next', () => {
    const { scenario, correct } = scenarioFor(2024);
    const result = evaluateDiagnosis(scenario, scenario.faultedCircuit, correct);
    expect(result.verdict).toBe('incomplete');
    expect(result.guidance.toLowerCase()).toContain('clear');
  });

  it('distinguishes the two half-right answers in its summary', () => {
    const { scenario, fault, locationKey, repaired } = scenarioFor(31337);
    const wrongType = scenario.faultTypeChoices.find((c) => c.type !== fault.type);
    const wrongLoc = scenario.locationChoices.find((c) => c.key !== locationKey);
    if (wrongType) {
      const r = evaluateDiagnosis(scenario, repaired, {
        faultType: wrongType.type,
        locationKey,
      });
      expect(r.summary.toLowerCase()).toContain('place');
    }
    if (wrongLoc) {
      const r = evaluateDiagnosis(scenario, repaired, {
        faultType: fault.type,
        locationKey: wrongLoc.key,
      });
      expect(r.summary.toLowerCase()).toContain('kind');
    }
  });

  it('always returns a simulation of the submitted circuit', () => {
    const { scenario, correct, repaired } = scenarioFor(4711);
    expect(evaluateDiagnosis(scenario, repaired, correct).simulation).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Multi-fault grading (plan §26/§27)
// ---------------------------------------------------------------------------

/**
 * Hand-assemble a genuine two-fault scenario.
 *
 * No tier ships two faults yet — that is F2 — so these cases cannot go through
 * `buildDiagnosisScenario`. Rather than fake a scenario object, this takes a
 * real one and injects a *second* real candidate fault next to the first,
 * applying the same §12 gate the builder applies: each fault must be
 * observable on its own, and the pair must be observable together. That keeps
 * the fixture honest — if the grader passes here it will pass on whatever F2
 * generates.
 *
 * Returns `null` when a seed offers no compatible second candidate, so the
 * caller can move on to the next seed instead of asserting on a fixture that
 * does not exist.
 */
function twoFaultScenario(
  seed: number,
  difficulty: 'beginner' | 'intermediate' | 'advanced' = 'intermediate',
): { scenario: DiagnosisScenario; first: ScenarioFault; second: ScenarioFault } | null {
  const base = buildDiagnosisScenario({ seed, difficulty });
  const first = primaryScenarioFault(base);

  // The builder's recipe inputs are not on the scenario, but `locationChoices`
  // was derived from them, so they can be read back off it.
  const wireIds = base.locationChoices.flatMap((c) => (c.wireId ? [c.wireId] : []));
  const componentIds = base.locationChoices.flatMap((c) =>
    c.kind === 'component' && c.componentId ? [c.componentId] : [],
  );
  const candidates = collectFaultCandidates(base.healthyCircuit, {
    faultCandidateWireIds: wireIds,
    loadComponentIds: base.loadComponentIds,
    protectionComponentIds: componentIds.filter((id) => !base.loadComponentIds.includes(id)),
  });

  const baseline = simulate(base.healthyCircuit, { appMode: 'pro' });

  for (const candidate of candidates) {
    // A second fault in the same place would be unanswerable: the form takes
    // one type and one location, so the learner could never distinguish them.
    if (locationKeyFor(candidate) === first.locationKey) continue;

    const fault = createScenarioFault(`${base.challengeId}-b`, candidate);
    if (!validateFaultCoexistence([first.fault], fault).valid) continue;

    const solo = diffSymptom(
      baseline,
      simulate(withScenarioFaults(base.healthyCircuit, [fault]), { appMode: 'pro' }),
      base.loadComponentIds,
    );
    if (!solo.observable) continue;

    const faultedCircuit = withScenarioFaults(base.healthyCircuit, [first.fault, fault]);
    const combined = diffSymptom(
      baseline,
      simulate(faultedCircuit, { appMode: 'pro' }),
      base.loadComponentIds,
    );
    if (!combined.observable) continue;

    const second: ScenarioFault = {
      fault,
      locationKey: locationKeyFor(candidate),
      symptom: solo,
    };
    return {
      scenario: { ...base, faults: [first, second], faultedCircuit, symptom: combined },
      first,
      second,
    };
  }
  return null;
}

/** The first seed in `seeds` that yields a two-fault fixture. */
function anyTwoFaultScenario(seeds: number[] = [17, 91, 143, 205, 311, 467, 599, 733]) {
  for (const seed of seeds) {
    const built = twoFaultScenario(seed);
    if (built) return built;
  }
  throw new Error('no seed produced a two-fault fixture');
}

const answerFor = (entry: ScenarioFault) => ({
  faultType: entry.fault.type,
  locationKey: entry.locationKey,
});

describe('evaluateDiagnosis — multiple faults (§26/§27)', () => {
  it('builds a two-fault fixture from several seeds', () => {
    // Guards the fixture itself: if the helper silently stopped finding second
    // candidates, every test below would pass vacuously on one lucky seed.
    const found = [17, 91, 143, 205, 311, 467].filter((seed) => twoFaultScenario(seed) !== null);
    expect(found.length).toBeGreaterThanOrEqual(3);
  });

  it('naming one of two faults is progress, not completion', () => {
    const { scenario, first } = anyTwoFaultScenario();
    const result = evaluateDiagnosis(scenario, scenario.faultedCircuit, answerFor(first));

    expect(result.verdict).toBe('incomplete');
    expect(result.diagnosisCorrect).toBe(false);
    expect(result.progressed).toBe(true);
    expect(result.matchedFaultId).toBe(first.fault.id);
    expect(result.outstandingCount).toBe(1);
    expect(result.faultCount).toBe(2);
    expect(result.identifiedFaultIds).toEqual([first.fault.id]);
  });

  it('a fully repaired circuit is still incomplete while a fault is unnamed', () => {
    // The §16 rule in reverse: repairing everything does not excuse the learner
    // from saying what was wrong. Both halves are required.
    const { scenario, first } = anyTwoFaultScenario();
    const repaired: Circuit = { ...scenario.faultedCircuit, faults: [] };
    const result = evaluateDiagnosis(scenario, repaired, answerFor(first));

    expect(result.verdict).toBe('incomplete');
    expect(result.recovered).toBe(true);
    expect(result.faultCleared).toBe(true);
    expect(result.diagnosisCorrect).toBe(false);
  });

  it('naming both faults and repairing the circuit succeeds', () => {
    const { scenario, first, second } = anyTwoFaultScenario();
    const step1 = evaluateDiagnosis(scenario, scenario.faultedCircuit, answerFor(first));
    expect(step1.verdict).toBe('incomplete');

    const repaired: Circuit = { ...scenario.faultedCircuit, faults: [] };
    const step2 = evaluateDiagnosis(scenario, repaired, answerFor(second), {
      identifiedFaultIds: step1.identifiedFaultIds,
    });

    expect(step2.verdict).toBe('success');
    expect(step2.success).toBe(true);
    expect(step2.diagnosisCorrect).toBe(true);
    expect(step2.outstandingCount).toBe(0);
    expect(step2.identifiedFaultIds).toHaveLength(2);
    expect(new Set(step2.identifiedFaultIds)).toEqual(new Set([first.fault.id, second.fault.id]));
  });

  it('the order the faults are named in does not matter', () => {
    const { scenario, first, second } = anyTwoFaultScenario();
    const step1 = evaluateDiagnosis(scenario, scenario.faultedCircuit, answerFor(second));
    const repaired: Circuit = { ...scenario.faultedCircuit, faults: [] };
    const step2 = evaluateDiagnosis(scenario, repaired, answerFor(first), {
      identifiedFaultIds: step1.identifiedFaultIds,
    });

    expect(step1.progressed).toBe(true);
    expect(step2.verdict).toBe('success');
  });

  it('re-naming a fault already found is not counted twice', () => {
    const { scenario, first } = anyTwoFaultScenario();
    const step1 = evaluateDiagnosis(scenario, scenario.faultedCircuit, answerFor(first));
    const step2 = evaluateDiagnosis(scenario, scenario.faultedCircuit, answerFor(first), {
      identifiedFaultIds: step1.identifiedFaultIds,
    });

    // Still a correct statement about the installation, so not a failure…
    expect(step2.verdict).toBe('incomplete');
    // …but no new ground was covered, so it must not read as progress.
    expect(step2.progressed).toBe(false);
    expect(step2.identifiedFaultIds).toEqual([first.fault.id]);
    expect(step2.outstandingCount).toBe(1);
    expect(step2.faults.filter((f) => f.newlyIdentified)).toHaveLength(0);
  });

  it('ignores identified ids that belong to a different scenario', () => {
    // A resumed run whose stored ids predate a regenerated circuit must not be
    // able to credit the learner with faults this scenario does not contain.
    const { scenario, first } = anyTwoFaultScenario();
    const result = evaluateDiagnosis(scenario, scenario.faultedCircuit, answerFor(first), {
      identifiedFaultIds: ['fault_scenario_stale', 'nonsense'],
    });

    expect(result.identifiedFaultIds).toEqual([first.fault.id]);
    expect(result.outstandingCount).toBe(1);
  });

  it('a wrong answer part-way through is a failure and loses no progress', () => {
    const { scenario, first, second } = anyTwoFaultScenario();
    const step1 = evaluateDiagnosis(scenario, scenario.faultedCircuit, answerFor(first));
    const wrong = evaluateDiagnosis(
      scenario,
      scenario.faultedCircuit,
      { faultType: second.fault.type, locationKey: first.locationKey },
      { identifiedFaultIds: step1.identifiedFaultIds },
    );

    // The pairing is wrong even though both halves name something real, so it
    // is a plain failure — but the fault already found stays found.
    if (wrong.matchedFaultId === null) {
      expect(wrong.verdict).toBe('failure');
      expect(wrong.identifiedFaultIds).toEqual([first.fault.id]);
      expect(wrong.progressed).toBe(false);
    }
  });

  it('reports one result per fault, with per-fault repair state', () => {
    const { scenario, first, second } = anyTwoFaultScenario();
    const halfRepaired = withoutFault(scenario.faultedCircuit, first.fault.id);
    const result = evaluateDiagnosis(scenario, halfRepaired, answerFor(first));

    expect(result.faults).toHaveLength(2);
    expect(result.faults.map((f) => f.faultId).sort()).toEqual(
      [first.fault.id, second.fault.id].sort(),
    );
    const firstResult = result.faults.find((f) => f.faultId === first.fault.id);
    const secondResult = result.faults.find((f) => f.faultId === second.fault.id);
    expect(firstResult?.cleared).toBe(true);
    expect(secondResult?.cleared).toBe(false);
    expect(result.faultCleared).toBe(false);
    expect(result.verdict).toBe('incomplete');
  });

  it('never leaks the outstanding fault in its feedback', () => {
    // The learner is told *that* more remains, never what or where (§14).
    const { scenario, first, second } = anyTwoFaultScenario();
    const result = evaluateDiagnosis(scenario, scenario.faultedCircuit, answerFor(first));
    const copy = `${result.summary} ${result.guidance}`.toLowerCase();

    expect(copy).not.toContain(second.fault.type);
    expect(copy).not.toContain(second.fault.type.replace(/-/g, ' '));
    expect(copy).not.toContain(second.locationKey.toLowerCase());
  });
});

// ---------------------------------------------------------------------------
// observeSymptom — live evidence (plan §14, §26)
// ---------------------------------------------------------------------------

describe('observeSymptom — what the installation is doing now (§14, §26)', () => {
  it('reports the fault while the circuit is still broken', () => {
    const scenario = buildDiagnosisScenario({ seed: 4242, difficulty: 'intermediate' });
    const observed = observeSymptom(scenario, scenario.faultedCircuit);
    expect(observed.healthy).toBe(false);
    expect(observed.complaint.length).toBeGreaterThan(0);
  });

  it('reports health once the fault is cleared', () => {
    const scenario = buildDiagnosisScenario({ seed: 4242, difficulty: 'intermediate' });
    const repaired = scenario.faults.reduce(
      (circuit, entry) => withoutFault(circuit, entry.fault.id),
      scenario.faultedCircuit,
    );
    const observed = observeSymptom(scenario, repaired);
    expect(observed.healthy).toBe(true);
  });

  /**
   * §14 is absolute, and this function is the one place that re-reads the live
   * circuit — the exact shape of the console leak found in Phase F3, where a
   * message derived from simulator output named the faulted wire.
   *
   * So: the live complaint may never contain the fault's id, its target's id,
   * or its type. Checked across many seeds because a leak that only fires on
   * one fault family is still a leak.
   */
  it('never names the fault, its target or its id (§14)', () => {
    for (const seed of [11, 23, 37, 41, 59, 67, 73, 89]) {
      const scenario = buildDiagnosisScenario({ seed, difficulty: 'advanced' });
      const observed = observeSymptom(scenario, scenario.faultedCircuit);
      const text = observed.complaint.toLowerCase();
      for (const entry of scenario.faults) {
        expect(text, `seed ${seed}`).not.toContain(entry.fault.id.toLowerCase());
        expect(text, `seed ${seed}`).not.toContain(entry.fault.type.toLowerCase());
        // The location key embeds the component/wire id the learner must find.
        for (const token of entry.locationKey.toLowerCase().split(':')) {
          if (token.length < 3) continue;
          expect(text, `seed ${seed}: leaked "${token}"`).not.toContain(token);
        }
      }
    }
  });

  it('agrees with the scenario briefing before anything has been touched', () => {
    // The opening complaint and the first live reading describe the same world,
    // so the panel does not announce a "change" the learner never caused.
    for (const seed of [11, 23, 37, 41]) {
      const scenario = buildDiagnosisScenario({ seed, difficulty: 'intermediate' });
      const observed = observeSymptom(scenario, scenario.faultedCircuit);
      expect(observed.complaint, `seed ${seed}`).toBe(scenario.complaint);
    }
  });
});
