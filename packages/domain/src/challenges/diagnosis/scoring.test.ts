/**
 * diagnosis/scoring.ts — tests (plan §17 "do not punish hints",
 * §18 "a wrong diagnosis must not destroy the challenge").
 */

import { describe, expect, it } from 'vitest';
import { getDifficultyProfile } from '../difficulty/profiles';
import type { ChallengeDifficulty } from '../types';
import { scoreDiagnosis } from './scoring';

const DIFFICULTIES: ChallengeDifficulty[] = ['beginner', 'intermediate', 'advanced'];

const perfect = {
  difficulty: 'beginner' as const,
  elapsedMs: 5_000,
  misdiagnoses: 0,
  incompleteRepairs: 0,
  hintsUsed: 0,
};

describe('scoreDiagnosis', () => {
  it('awards a top score for a fast, first-time-right, hint-free run', () => {
    const score = scoreDiagnosis(perfect);
    expect(score.points).toBe(1000);
    expect(score.grade).toBe('gold');
    expect(score.underPar).toBe(true);
    expect(score.firstTimeRight).toBe(true);
  });

  it('never returns zero for a completed exercise (§17/§18)', () => {
    const score = scoreDiagnosis({
      difficulty: 'advanced',
      elapsedMs: 60 * 60 * 1000,
      misdiagnoses: 50,
      incompleteRepairs: 50,
      hintsUsed: 99,
    });
    expect(score.points).toBeGreaterThanOrEqual(400);
    expect(score.grade).toBe('complete');
  });

  it('keeps points inside 0..1000 across a wide sweep', () => {
    for (const difficulty of DIFFICULTIES) {
      for (const elapsedMs of [0, 1_000, 200_000, 9_000_000]) {
        for (const misdiagnoses of [0, 1, 5, 20]) {
          for (const hintsUsed of [0, 1, 3, 10]) {
            const score = scoreDiagnosis({
              difficulty,
              elapsedMs,
              misdiagnoses,
              incompleteRepairs: 1,
              hintsUsed,
            });
            expect(score.points).toBeGreaterThanOrEqual(0);
            expect(score.points).toBeLessThanOrEqual(1000);
            for (const value of Object.values(score.breakdown)) {
              expect(value).toBeGreaterThanOrEqual(0);
              expect(value).toBeLessThanOrEqual(1);
            }
          }
        }
      }
    }
  });

  it('penalises a misdiagnosis more than an unfinished repair', () => {
    const misdiagnosed = scoreDiagnosis({ ...perfect, misdiagnoses: 1 });
    const unrepaired = scoreDiagnosis({ ...perfect, incompleteRepairs: 1 });
    expect(misdiagnosed.points).toBeLessThan(unrepaired.points);
    expect(unrepaired.points).toBeLessThan(1000);
  });

  it('treats hints as a mild, monotonic cost that never fails the run (§17)', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (const hintsUsed of [0, 1, 2, 3, 5, 10]) {
      const score = scoreDiagnosis({ ...perfect, hintsUsed });
      expect(score.points).toBeLessThanOrEqual(previous);
      expect(score.points).toBeGreaterThan(0);
      previous = score.points;
    }
    // One hint must cost less than one wrong diagnosis.
    expect(scoreDiagnosis({ ...perfect, hintsUsed: 1 }).points).toBeGreaterThan(
      scoreDiagnosis({ ...perfect, misdiagnoses: 1 }).points,
    );
  });

  it('decays with time but stays above the floor', () => {
    const par = getDifficultyProfile('beginner').parTimeSeconds * 1000;
    const fast = scoreDiagnosis({ ...perfect, elapsedMs: par });
    const slow = scoreDiagnosis({ ...perfect, elapsedMs: par * 8 });
    expect(fast.underPar).toBe(true);
    expect(slow.underPar).toBe(false);
    expect(slow.points).toBeLessThan(fast.points);
    expect(slow.points).toBeGreaterThanOrEqual(400);
  });

  it('uses each difficulty\u2019s own par time (§9)', () => {
    for (const difficulty of DIFFICULTIES) {
      expect(scoreDiagnosis({ ...perfect, difficulty }).parTimeSeconds).toBe(
        getDifficultyProfile(difficulty).parTimeSeconds,
      );
    }
  });

  it('withholds gold once the learner has misdiagnosed', () => {
    expect(scoreDiagnosis({ ...perfect, misdiagnoses: 1 }).grade).not.toBe('gold');
    expect(scoreDiagnosis({ ...perfect, elapsedMs: 10 * 60 * 1000 }).grade).not.toBe('gold');
  });

  it('tolerates hostile input without producing NaN', () => {
    const score = scoreDiagnosis({
      difficulty: 'beginner',
      elapsedMs: Number.NaN,
      misdiagnoses: -5,
      incompleteRepairs: Number.NaN,
      hintsUsed: -1,
    });
    expect(Number.isFinite(score.points)).toBe(true);
    expect(score.points).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Multiple faults (plan §26/§27)
// ---------------------------------------------------------------------------

/** Par time for a two-fault run of this difficulty — mirrors the module rule. */
function twoFaultPar(difficulty: ChallengeDifficulty): number {
  return scoreDiagnosis({
    difficulty,
    elapsedMs: 0,
    misdiagnoses: 0,
    incompleteRepairs: 0,
    hintsUsed: 0,
    faultCount: 2,
  }).parTimeSeconds;
}

describe('scoreDiagnosis — multiple faults', () => {
  it('defaults to a single fault, fully found', () => {
    const score = scoreDiagnosis(perfect);
    expect(score.faultCount).toBe(1);
    expect(score.faultsIdentified).toBe(1);
    expect(score.completeness).toBe(1);
  });

  it('scales par time with the number of faults, but sub-linearly', () => {
    const one = scoreDiagnosis(perfect);
    const two = scoreDiagnosis({ ...perfect, faultCount: 2 });
    const three = scoreDiagnosis({ ...perfect, faultCount: 3 });

    expect(two.parTimeSeconds).toBeGreaterThan(one.parTimeSeconds);
    expect(three.parTimeSeconds).toBeGreaterThan(two.parTimeSeconds);
    // A second fault must not buy a whole second exercise's worth of time.
    expect(two.parTimeSeconds).toBeLessThan(one.parTimeSeconds * 2);
  });

  it('does not punish a learner for solving the harder exercise', () => {
    // Same quality of work, more faults: the two-fault run must not score less.
    // Without the par scaling and the thoroughness bonus it would, which is the
    // regression this test exists to catch.
    for (const difficulty of DIFFICULTIES) {
      const par = getDifficultyProfile(difficulty).parTimeSeconds;
      const one = scoreDiagnosis({
        ...perfect,
        difficulty,
        elapsedMs: par * 1000 * 0.8,
        faultCount: 1,
      });
      const two = scoreDiagnosis({
        ...perfect,
        difficulty,
        // Proportionally the same fraction of its (longer) par.
        elapsedMs: twoFaultPar(difficulty) * 1000 * 0.8,
        faultCount: 2,
      });
      expect(two.points).toBeGreaterThanOrEqual(one.points);
    }
  });

  it('stays inside 0..1000 however many faults are claimed', () => {
    for (const faultCount of [1, 2, 3, 8, 40]) {
      const score = scoreDiagnosis({ ...perfect, faultCount });
      expect(score.points).toBeGreaterThan(0);
      expect(score.points).toBeLessThanOrEqual(1000);
    }
  });

  it('scores a partly-solved run below a solved one, but above nothing', () => {
    const solved = scoreDiagnosis({ ...perfect, faultCount: 2, faultsIdentified: 2 });
    const half = scoreDiagnosis({ ...perfect, faultCount: 2, faultsIdentified: 1 });
    const none = scoreDiagnosis({ ...perfect, faultCount: 2, faultsIdentified: 0 });

    expect(half.points).toBeLessThan(solved.points);
    expect(half.points).toBeGreaterThan(none.points);
    expect(half.completeness).toBe(0.5);
    expect(none.completeness).toBe(0);
  });

  it('awards no medal while a fault is still unfound', () => {
    // A fast, flawless, hint-free half-run: everything that normally earns gold.
    const half = scoreDiagnosis({ ...perfect, faultCount: 2, faultsIdentified: 1 });
    expect(half.grade).toBe('complete');

    const done = scoreDiagnosis({ ...perfect, faultCount: 2, faultsIdentified: 2 });
    expect(done.grade).toBe('gold');
  });

  it('clamps a nonsensical identified count to the fault count', () => {
    const score = scoreDiagnosis({ ...perfect, faultCount: 2, faultsIdentified: 9 });
    expect(score.faultsIdentified).toBe(2);
    expect(score.completeness).toBe(1);
    expect(score.points).toBeLessThanOrEqual(1000);
  });

  it('treats a negative or non-finite fault count as one fault', () => {
    for (const faultCount of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      const score = scoreDiagnosis({ ...perfect, faultCount });
      expect(score.faultCount).toBe(1);
      expect(score.completeness).toBe(1);
    }
  });

  it('still penalises mistakes on a multi-fault run', () => {
    const clean = scoreDiagnosis({ ...perfect, faultCount: 2 });
    const messy = scoreDiagnosis({ ...perfect, faultCount: 2, misdiagnoses: 3 });
    expect(messy.points).toBeLessThan(clean.points);
    expect(messy.firstTimeRight).toBe(false);
  });
});
