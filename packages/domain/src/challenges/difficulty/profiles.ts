/**
 * Shared difficulty profiles (plan §9).
 *
 * Difficulty must control more than component count, so a profile carries the
 * generator-facing shape knobs (component budget, branch count, switching
 * complexity, run lengths) alongside the *declarative* learning knobs the
 * later phases consume (hint budget, diagnostic choice-set size, fault
 * distance).
 *
 * The learning knobs are plain numbers with no behaviour attached — the
 * generator never reads them. They live here so Challenge Mode, the Diagnosis
 * Lab and Ohmageddon all agree on what "intermediate" means instead of each
 * re-deriving it (plan §57 still holds: no fault or mode logic in the
 * generator itself).
 */

import type { ChallengeDifficulty } from '../types';

export interface DifficultyProfile {
  id: ChallengeDifficulty;
  label: string;
  /** One-line teaching goal, straight from plan §9. */
  target: string;
  description: string;

  // ── Generator-facing shape knobs ──────────────────────────────────────
  /** Inclusive component-count window the generated circuit should land in. */
  componentBudget: { min: number; max: number };
  /** Inclusive number of parallel load branches. */
  branchCount: { min: number; max: number };
  /** Inclusive number of loads in the finished circuit. */
  loadCount: { min: number; max: number };
  /** Whether recipes may use two-way / intermediate / relay switching. */
  allowsComplexSwitching: boolean;
  /** Whether recipes may use a distribution board as the branch hub. */
  allowsDistributionBoard: boolean;
  /** Whether recipes may add junction boxes / Wago connectors mid-run. */
  allowsJunctions: boolean;
  /** Inclusive cable run length window in metres, per wire. */
  runLengthMeters: { min: number; max: number };

  // ── Declarative learning knobs (consumed by later phases) ─────────────
  /** Hints offered before scoring is affected. */
  hintBudget: number;
  /** Size of the multiple-choice diagnostic set presented to the learner. */
  diagnosticChoiceCount: number;
  /**
   * How far (in graph hops) a fault may sit from its visible symptom.
   * Beginner keeps cause and effect adjacent; advanced allows remote faults.
   */
  maxFaultDistanceFromSymptom: number;
  /** Suggested par time in seconds for completion scoring. */
  parTimeSeconds: number;
}

export const DIFFICULTY_PROFILES: Record<ChallengeDifficulty, DifficultyProfile> = {
  beginner: {
    id: 'beginner',
    label: 'Beginner',
    target: 'Teach the learner how to reason about a fault.',
    description:
      'Few components, a single obvious load and a short path from symptom to cause. Generous hints and a small diagnostic choice set.',
    componentBudget: { min: 4, max: 7 },
    branchCount: { min: 1, max: 1 },
    loadCount: { min: 1, max: 1 },
    allowsComplexSwitching: false,
    allowsDistributionBoard: false,
    allowsJunctions: false,
    runLengthMeters: { min: 1.5, max: 4 },
    hintBudget: 3,
    diagnosticChoiceCount: 3,
    maxFaultDistanceFromSymptom: 1,
    parTimeSeconds: 120,
  },

  intermediate: {
    id: 'intermediate',
    label: 'Intermediate',
    target: 'Teach circuit tracing and fault isolation.',
    description:
      'More components and multiple branches, so the fault need not sit next to the symptom. Fewer hints and a wider diagnostic choice set.',
    componentBudget: { min: 6, max: 11 },
    branchCount: { min: 1, max: 2 },
    loadCount: { min: 1, max: 2 },
    allowsComplexSwitching: true,
    allowsDistributionBoard: false,
    allowsJunctions: true,
    runLengthMeters: { min: 2, max: 6 },
    hintBudget: 2,
    diagnosticChoiceCount: 5,
    maxFaultDistanceFromSymptom: 3,
    parTimeSeconds: 210,
  },

  advanced: {
    id: 'advanced',
    label: 'Advanced',
    target: 'Test genuine troubleshooting ability.',
    description:
      'Larger topology with several protected branches, mixed loads and longer diagnostic paths. Minimal hints and distant fault locations.',
    componentBudget: { min: 9, max: 16 },
    branchCount: { min: 2, max: 3 },
    loadCount: { min: 2, max: 3 },
    allowsComplexSwitching: true,
    allowsDistributionBoard: true,
    allowsJunctions: true,
    runLengthMeters: { min: 2, max: 8 },
    hintBudget: 1,
    diagnosticChoiceCount: 7,
    maxFaultDistanceFromSymptom: 6,
    parTimeSeconds: 330,
  },
};

export function getDifficultyProfile(difficulty: ChallengeDifficulty): DifficultyProfile {
  const profile = DIFFICULTY_PROFILES[difficulty];
  if (!profile) throw new Error(`Unknown difficulty: ${difficulty}`);
  return profile;
}
