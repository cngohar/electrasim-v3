/**
 * profiles.test.ts — difficulty profile coherence (plan §9).
 *
 * "Difficulty must control more than component count." These tests assert the
 * profiles actually escalate along every axis the plan names, so a later phase
 * can trust the numbers instead of re-deriving difficulty semantics.
 */

import { describe, expect, it } from 'vitest';
import { CHALLENGE_DIFFICULTIES } from '../types';
import { DIFFICULTY_PROFILES, getDifficultyProfile } from './profiles';

const ORDER = ['beginner', 'intermediate', 'advanced'] as const;

describe('difficulty profiles', () => {
  it('defines exactly the declared difficulty tiers', () => {
    expect(Object.keys(DIFFICULTY_PROFILES).sort()).toEqual([...CHALLENGE_DIFFICULTIES].sort());
  });

  it('keys each profile by its own id', () => {
    for (const [key, profile] of Object.entries(DIFFICULTY_PROFILES)) {
      expect(profile.id).toBe(key);
    }
  });

  it('declares coherent ranges', () => {
    for (const profile of Object.values(DIFFICULTY_PROFILES)) {
      expect(profile.componentBudget.min).toBeGreaterThan(0);
      expect(profile.componentBudget.max).toBeGreaterThanOrEqual(profile.componentBudget.min);
      expect(profile.branchCount.min).toBeGreaterThan(0);
      expect(profile.branchCount.max).toBeGreaterThanOrEqual(profile.branchCount.min);
      expect(profile.loadCount.min).toBeGreaterThan(0);
      expect(profile.loadCount.max).toBeGreaterThanOrEqual(profile.loadCount.min);
      expect(profile.runLengthMeters.min).toBeGreaterThan(0);
      expect(profile.runLengthMeters.max).toBeGreaterThan(profile.runLengthMeters.min);
      expect(profile.label.length).toBeGreaterThan(3);
      expect(profile.target.length).toBeGreaterThan(15);
      expect(profile.description.length).toBeGreaterThan(30);
    }
  });

  it('escalates topology size with difficulty', () => {
    for (let i = 1; i < ORDER.length; i++) {
      const previous = DIFFICULTY_PROFILES[ORDER[i - 1]!];
      const current = DIFFICULTY_PROFILES[ORDER[i]!];
      expect(current.componentBudget.max).toBeGreaterThan(previous.componentBudget.max);
      expect(current.branchCount.max).toBeGreaterThanOrEqual(previous.branchCount.max);
      expect(current.loadCount.max).toBeGreaterThanOrEqual(previous.loadCount.max);
    }
  });

  it('reduces hints and widens the diagnostic choice set with difficulty', () => {
    for (let i = 1; i < ORDER.length; i++) {
      const previous = DIFFICULTY_PROFILES[ORDER[i - 1]!];
      const current = DIFFICULTY_PROFILES[ORDER[i]!];
      expect(current.hintBudget).toBeLessThan(previous.hintBudget);
      expect(current.diagnosticChoiceCount).toBeGreaterThan(previous.diagnosticChoiceCount);
      expect(current.maxFaultDistanceFromSymptom).toBeGreaterThan(
        previous.maxFaultDistanceFromSymptom,
      );
      expect(current.parTimeSeconds).toBeGreaterThan(previous.parTimeSeconds);
    }
  });

  it('keeps beginner simple and advanced complex, per plan §9', () => {
    const beginner = DIFFICULTY_PROFILES.beginner;
    expect(beginner.loadCount.max).toBe(1);
    expect(beginner.branchCount.max).toBe(1);
    expect(beginner.allowsComplexSwitching).toBe(false);
    expect(beginner.allowsDistributionBoard).toBe(false);
    expect(beginner.maxFaultDistanceFromSymptom).toBe(1);

    const advanced = DIFFICULTY_PROFILES.advanced;
    expect(advanced.allowsComplexSwitching).toBe(true);
    expect(advanced.allowsDistributionBoard).toBe(true);
    expect(advanced.allowsJunctions).toBe(true);
    expect(advanced.hintBudget).toBeGreaterThanOrEqual(1);
  });

  it('always offers at least one hint and two diagnostic choices', () => {
    for (const profile of Object.values(DIFFICULTY_PROFILES)) {
      expect(profile.hintBudget).toBeGreaterThanOrEqual(1);
      expect(profile.diagnosticChoiceCount).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('getDifficultyProfile', () => {
  it('resolves each known tier', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      expect(getDifficultyProfile(difficulty).id).toBe(difficulty);
    }
  });

  it('throws on an unknown tier', () => {
    // @ts-expect-error — deliberately invalid input.
    expect(() => getDifficultyProfile('expert')).toThrow(/Unknown difficulty/);
  });
});
