/**
 * Diagnosis scoring (plan §17–§20; Phase D step 8).
 *
 * Challenge Mode scores *building*; this scores *fault-finding*, so the
 * dimensions are not the same. The plan's constraints still bind:
 *
 *   - §17 hints inform statistics, they never fail an exercise;
 *   - §18 "a wrong diagnosis should not destroy the challenge";
 *   - §9  each difficulty has its own `parTimeSeconds`.
 *
 * The one judgement this module adds is that **a wrong diagnosis and an
 * unrepaired circuit are different mistakes**. Submitting the wrong fault is a
 * diagnostic error — the learner misread the symptom. Submitting the right
 * fault on a circuit they have not yet fixed is not a diagnostic error at all
 * (§41 calls it `incomplete`); they found it and simply have not finished the
 * job. Charging both at the same rate would teach the learner to fear the
 * submit button, so misdiagnoses are weighted roughly twice an incomplete.
 *
 * Pure arithmetic — no clock reads, no persistence. Callers pass elapsed time.
 */

import { getDifficultyProfile } from '../difficulty/profiles';
import type { ChallengeDifficulty } from '../types';

export type DiagnosisGrade = 'gold' | 'silver' | 'bronze' | 'complete';

export interface DiagnosisScoreInput {
  difficulty: ChallengeDifficulty;
  /** Wall-clock time spent on the exercise. */
  elapsedMs: number;
  /** Submissions with an incorrect fault type and/or location (§41 failure). */
  misdiagnoses: number;
  /** Submissions with a correct diagnosis but an unrepaired circuit (§41 incomplete). */
  incompleteRepairs: number;
  /** Hints revealed (§17). */
  hintsUsed: number;
  /**
   * How many faults the scenario carried (§26 "multiple faults"). Defaults to
   * 1, which is every ordinary exercise.
   *
   * Finding two faults is strictly more work than finding one, so a two-fault
   * run gets a modest thoroughness bonus — otherwise the harder exercise would
   * score *lower*, because it takes longer and invites more submissions.
   */
  faultCount?: number;
  /**
   * How many of those faults were correctly named. Defaults to `faultCount`
   * (a completed exercise, by definition, found them all).
   *
   * Passing a smaller number is how a caller scores an *abandoned* or
   * partially-solved run: the learner who found one fault of two has genuinely
   * achieved something, and §18's "a wrong diagnosis should not destroy the
   * challenge" reads the same way for an unfinished one.
   */
  faultsIdentified?: number;
}

export interface DiagnosisScore {
  /** 0..1000, always > 0 for a completed exercise. */
  points: number;
  grade: DiagnosisGrade;
  breakdown: {
    /** Time against par. */
    speed: number;
    /** Diagnostic accuracy — how directly the fault was identified. */
    accuracy: number;
    /** Hint usage. */
    independence: number;
  };
  parTimeSeconds: number;
  underPar: boolean;
  /** True when the fault was named correctly on the very first submission. */
  firstTimeRight: boolean;
  /** Faults the scenario carried. */
  faultCount: number;
  /** Faults the learner named. Equal to `faultCount` on a completed run. */
  faultsIdentified: number;
  /**
   * Share of the injected faults that were found, 0..1.
   *
   * 1 for any completed exercise; below 1 only when a caller is scoring an
   * unfinished run.
   */
  completeness: number;
}

const MAX_POINTS = 1000;

/** Weights sum to 1. Accuracy dominates: this is a diagnosis exercise. */
const WEIGHT_SPEED = 0.3;
const WEIGHT_ACCURACY = 0.45;
const WEIGHT_INDEPENDENCE = 0.25;

/** Finishing always beats not finishing (§17/§18). */
const COMPLETION_FLOOR = 0.4;

/** A misdiagnosis costs this much of the accuracy score, compounding gently. */
const MISDIAGNOSIS_COST = 0.4;
/** An unrepaired-but-correctly-diagnosed submission costs about half as much. */
const INCOMPLETE_COST = 0.18;

/**
 * Extra time allowed per additional fault, as a fraction of par.
 *
 * Not 100%: the second fault is found on an installation the learner has
 * already half-explored, so it costs real time but not a second full search.
 */
const PAR_PER_EXTRA_FAULT = 0.6;

/**
 * Credit for the extra work an additional fault represents.
 *
 * Deliberately small. It is a recognition that a two-fault exercise is harder,
 * not a reason to grind Ohmageddon for points — and it is capped by the 0..1
 * clamp, so it can never manufacture a score above 1000.
 */
const MULTI_FAULT_BONUS = 0.08;

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function nonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
}

/** Full marks at or under par, then a smooth decay (half the score at 2× par). */
function speedScore(elapsedMs: number, parTimeSeconds: number): number {
  const parMs = parTimeSeconds * 1000;
  if (parMs <= 0) return 1;
  const elapsed = Math.max(0, elapsedMs);
  if (elapsed <= parMs) return 1;
  return clamp01(parMs / elapsed);
}

/**
 * Accuracy: a hyperbolic taper, never zero (§18).
 *
 * Weighted so a wrong fault hurts more than an unfinished repair, but even a
 * learner who guessed wrong five times keeps a meaningful share of the score.
 */
function accuracyScore(misdiagnoses: number, incompleteRepairs: number): number {
  const penalty =
    nonNegative(misdiagnoses) * MISDIAGNOSIS_COST +
    nonNegative(incompleteRepairs) * INCOMPLETE_COST;
  return clamp01(1 / (1 + penalty));
}

/** Mild inside the difficulty's hint budget, steeper beyond, never zero (§17). */
function independenceScore(hintsUsed: number, hintBudget: number): number {
  const hints = nonNegative(hintsUsed);
  if (hints === 0) return 1;
  const budget = Math.max(1, hintBudget);
  const withinBudget = Math.min(hints, budget);
  const beyondBudget = Math.max(0, hints - budget);
  return clamp01(1 - withinBudget * 0.09 - beyondBudget * 0.15);
}

function gradeFor(
  points: number,
  underPar: boolean,
  firstTimeRight: boolean,
  complete: boolean,
): DiagnosisGrade {
  // No medal for a job left half-done. A learner who found one fault of two
  // has achieved something — and keeps the points for it — but a scenario with
  // a live fault still in it is not a bronze-standard result, however quick
  // and hint-free the part they did was.
  if (!complete) return 'complete';
  if (points >= 850 && underPar && firstTimeRight) return 'gold';
  if (points >= 700) return 'silver';
  if (points >= 550) return 'bronze';
  return 'complete';
}

export function scoreDiagnosis(input: DiagnosisScoreInput): DiagnosisScore {
  const profile = getDifficultyProfile(input.difficulty);

  const faultCount = Math.max(1, nonNegative(input.faultCount ?? 1));
  const faultsIdentified = Math.min(
    faultCount,
    input.faultsIdentified === undefined ? faultCount : nonNegative(input.faultsIdentified),
  );
  const completeness = faultsIdentified / faultCount;

  // Par scales with the size of the job, so a two-fault scenario is not
  // penalised for taking longer than a one-fault one (§9 owns the base value).
  const parTimeSeconds = Math.round(
    profile.parTimeSeconds * (1 + (faultCount - 1) * PAR_PER_EXTRA_FAULT),
  );

  const speed = speedScore(input.elapsedMs, parTimeSeconds);
  const accuracy = accuracyScore(input.misdiagnoses, input.incompleteRepairs);
  const independence = independenceScore(input.hintsUsed, profile.hintBudget);

  const weighted =
    speed * WEIGHT_SPEED + accuracy * WEIGHT_ACCURACY + independence * WEIGHT_INDEPENDENCE;
  // Thoroughness bonus, earned only by faults actually found — an unfinished
  // multi-fault run must not out-score a finished single-fault one.
  const bonus = MULTI_FAULT_BONUS * (faultsIdentified - 1);
  // The completion floor is itself pro-rated: finishing beats not finishing
  // (§17/§18), and finding one fault of two beats finding none.
  const floor = COMPLETION_FLOOR * completeness;
  const floored = floor + (1 - floor) * clamp01(weighted * completeness + bonus);
  const points = Math.round(clamp01(floored) * MAX_POINTS);
  const underPar = input.elapsedMs <= parTimeSeconds * 1000;
  const firstTimeRight = nonNegative(input.misdiagnoses) === 0;

  return {
    points,
    // A run that did not find every fault is never a medal run, however fast.
    grade: gradeFor(points, underPar, firstTimeRight, completeness === 1),
    breakdown: { speed, accuracy, independence },
    parTimeSeconds,
    underPar,
    firstTimeRight,
    faultCount,
    faultsIdentified,
    completeness,
  };
}
