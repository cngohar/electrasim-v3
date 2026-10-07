import { describe, expect, it } from 'vitest';
import { assessFaultTarget } from '../../faultApplicability';
import { simulate } from '../../simulation';
import { circuitRevision, hasOperationEvidence } from '../../simulationEvidence';
import type { Circuit } from '../../types';
import { formatShareCode, parseShareText } from '../share';
import { diagnosisAssessmentIssue, hasDiagnosisEvidence } from './assessment';
import { evaluateDiagnosis, observeSymptom } from './evaluator';
import { type DiagnosisScenario, buildDiagnosisScenario } from './scenario';

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const answer = (s: DiagnosisScenario, index = 0) => ({
  faultType: s.faults[index]!.fault.type,
  locationKey: s.faults[index]!.locationKey,
});
const grade = (s: DiagnosisScenario, c: Circuit) =>
  evaluateDiagnosis(s, c, answer(s), {
    identifiedFaultIds: s.faults.map((f) => f.fault.id),
  });

describe('current diagnosis assessment', () => {
  it('generates supported, observable, recoverable exercises at every difficulty and rage tier', () => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const)
      for (const rageTier of [undefined, 'rage-1', 'rage-2', 'rage-3', 'rage-4'] as const)
        for (const seed of [5, 17, 91]) {
          const s = buildDiagnosisScenario({ seed, difficulty, rageTier });
          expect(diagnosisAssessmentIssue(s)).toBeNull();
          expect(hasDiagnosisEvidence(s.healthyCircuit, simulate(s.healthyCircuit))).toBe(true);
          for (const f of s.faults) {
            expect(assessFaultTarget(s.healthyCircuit, f.fault.type, f.fault.target).coverage).toBe(
              'supported',
            );
            const solo = { ...s.healthyCircuit, faults: [f.fault] };
            expect(hasOperationEvidence(solo, simulate(solo))).toBe(true);
            expect(f.symptom.deEnergisedLoadIds.length).toBeGreaterThan(0);
          }
          expect(grade(s, s.healthyCircuit).verdict).toBe('success');
          expect(grade(s, s.faultedCircuit).verdict).toBe('incomplete');
        }
  });

  it('rejects device deletion, substitution, changed ratings/models and compensated source edits', () => {
    const s = buildDiagnosisScenario({ seed: 17, difficulty: 'advanced' });
    const loadId = s.loadComponentIds[0]!;
    const edits: ((c: Circuit) => void)[] = [
      (c) => {
        c.components = c.components.filter((d) => d.id !== loadId);
      },
      (c) => {
        c.components.find((d) => d.id === loadId)!.type = 'bulb';
      },
      (c) => {
        c.components.find((d) => d.id === loadId)!.state.customPowerWatts = 30;
      },
      (c) => {
        c.components.find((d) => d.id === loadId)!.state.customMaxVolts = 999;
      },
      (c) => {
        c.components.find((d) => d.state.protectionModel)!.state.protectionModel = undefined;
      },
      (c) => {
        c.wires[0]!.customCableMm2 = 10;
      },
      (c) => {
        c.wires[0]!.lengthMeters = 0.1;
      },
      (c) => {
        c.wires.push({ ...c.wires[0]!, id: 'extra' });
      },
      (c) => {
        c.components.find((d) => d.id === loadId)!.state.isBlown = true;
      },
      (c) => {
        c.wires[0]!.isBusted = true;
      },
    ];
    for (const edit of edits) {
      const c = clone(s.healthyCircuit);
      edit(c);
      expect(grade(s, c).success).toBe(false);
      expect(observeSymptom(s, c).healthy).toBe(false);
    }
  });

  it('accepts routing/layout and equivalent cable replacement, preserving terminal identities', () => {
    const s = buildDiagnosisScenario({ seed: 5, difficulty: 'beginner' });
    const c = clone(s.healthyCircuit);
    c.components.forEach((d) => {
      d.x += 200;
      d.rotation = 90;
    });
    c.wires.forEach((w, i) => {
      w.id = `replacement-${i}`;
      w.controlPoints = [{ x: 1, y: 2 }];
    });
    expect(grade(s, c).success).toBe(true);
    c.components[2]!.id = 'replacement-device';
    expect(grade(s, c).success).toBe(false);
  });

  it('keeps identification, partial repair and full recovery separate on a masked pair', () => {
    const s = buildDiagnosisScenario({ seed: 3, difficulty: 'intermediate', rageTier: 'rage-4' });
    expect(s.faults).toHaveLength(2);
    expect(s.rage?.applications.find((a) => a.id === 'compoundFault')?.applied).toBe(true);
    const partial = { ...s.faultedCircuit, faults: [s.faults[1]!.fault] };
    const first = evaluateDiagnosis(s, partial, answer(s));
    expect(first.progressed).toBe(true);
    expect(first.recovered).toBe(false);
    expect(first.verdict).toBe('incomplete');
    const healthy = evaluateDiagnosis(s, s.healthyCircuit, answer(s));
    expect(healthy.recovered).toBe(true);
    expect(healthy.verdict).toBe('incomplete');
    const final = evaluateDiagnosis(s, s.healthyCircuit, answer(s, 1), {
      identifiedFaultIds: first.identifiedFaultIds,
    });
    expect(final.verdict).toBe('success');
  });

  it('rejects obsolete/tampered baseline evidence, even with the right diagnosis and clear faults', () => {
    const s = buildDiagnosisScenario({ seed: 5, difficulty: 'beginner' });
    for (const change of [
      (old: DiagnosisScenario) => {
        old.generatorVersion = 2;
      },
      (old: DiagnosisScenario) => {
        old.assessment = undefined;
      },
      (old: DiagnosisScenario) => {
        old.assessment!.modelVersion = 'old';
      },
      (old: DiagnosisScenario) => {
        old.assessment!.engineVersion = 'old';
      },
      (old: DiagnosisScenario) => {
        old.assessment!.healthyRevision = 'cached';
      },
      (old: DiagnosisScenario) => {
        old.healthyCircuit.wires.pop();
      },
    ]) {
      const old = clone(s);
      change(old);
      expect(grade(old, s.healthyCircuit).success).toBe(false);
    }
    const result = simulate(s.healthyCircuit);
    expect(hasDiagnosisEvidence(s.healthyCircuit, { ...result, inputRevision: 'cached' })).toBe(
      false,
    );
    expect(
      hasDiagnosisEvidence(s.healthyCircuit, { ...result, electricalContract: undefined }),
    ).toBe(false);
  });

  it('carries the model and engine through share replay without losing the generator identity', () => {
    const s = buildDiagnosisScenario({ seed: 91, difficulty: 'beginner' });
    const code = formatShareCode({
      seed: s.seed,
      difficulty: s.difficulty,
      mode: 'diagnosis',
      generatorVersion: s.generatorVersion,
      rageTier: null,
      assessment: s.assessment,
    });
    const parsed = parseShareText(code, { difficulty: 'advanced', mode: 'rage' })!;
    expect(parsed.assessment?.engineVersion).toBe(s.assessment?.engineVersion);
    expect(parsed.assessmentMismatch).toBe(false);
    expect(
      parseShareText(code.toUpperCase(), { difficulty: 'beginner', mode: 'diagnosis' })
        ?.assessmentMismatch,
    ).toBe(false);
    expect(
      parseShareText(code.replace(/@.*/, '@invalid'), {
        difficulty: 'beginner',
        mode: 'diagnosis',
      }),
    ).toBeNull();
    const replay = buildDiagnosisScenario({ ...parsed, rageTier: parsed.rageTier ?? undefined });
    expect(circuitRevision(replay.faultedCircuit)).toBe(s.assessment?.faultedRevision);
    expect(
      parseShareText(code.replace(s.assessment!.modelVersion, 'obsolete'), {
        difficulty: 'beginner',
        mode: 'diagnosis',
      })?.assessmentMismatch,
    ).toBe(true);
  });
});
