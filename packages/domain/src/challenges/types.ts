/**
 * Shared vocabulary for the ElectraSim v2 learning modes.
 *
 * This module deliberately declares ONLY the concepts that do not already
 * exist in the domain. `Circuit`, `ComponentInstance`, `WireInstance`,
 * `SimulationResult`, `FaultType` and `FaultTarget` all live in
 * `src/domain/types.ts` and are re-used verbatim (plan §34, §58: never create
 * a second circuit model).
 */

import type { Circuit, SimulationResult } from '../types';

/** Difficulty tiers shared by every learning mode (plan §9). */
export type ChallengeDifficulty = 'beginner' | 'intermediate' | 'advanced';

export const CHALLENGE_DIFFICULTIES: readonly ChallengeDifficulty[] = [
  'beginner',
  'intermediate',
  'advanced',
] as const;

/**
 * Learning mode the circuit is being generated for.
 *
 * The core generator treats this as an *identity* input only — it never
 * branches on it (plan §7, §57: "generator contains no Challenge Mode /
 * diagnosis / Ohmageddon specific logic").
 */
export type ChallengeMode = 'challenge' | 'diagnosis' | 'rage';

export const CHALLENGE_MODES: readonly ChallengeMode[] = [
  'challenge',
  'diagnosis',
  'rage',
] as const;

/**
 * Stable identity for a generated challenge (plan §29).
 *
 *   ChallengeId = hash(generatorVersion, seed, difficulty, mode, rageProfile)
 */
export interface ChallengeIdentity {
  /** 32-bit unsigned hash of every identity input. */
  hash: number;
  /** Six-digit numeric form used in the display id. */
  shortCode: string;
  /** Human-facing id, e.g. `ES-DIAG-482917`. */
  displayId: string;
}

/** Input contract for the generator (plan §35). */
export interface GenerateChallengeRequest {
  /** Any finite number; normalised to a 32-bit unsigned integer internally. */
  seed: number;
  difficulty: ChallengeDifficulty;
  /** Defaults to `'challenge'`. */
  mode?: ChallengeMode;
  /** Defaults to {@link GENERATOR_VERSION}. */
  generatorVersion?: number;
  /**
   * Opaque Ohmageddon profile key. Phase A hashes it into the challenge
   * identity so the §29 shape is stable; it carries no behaviour yet.
   */
  rageProfile?: string;
  /**
   * Restrict generation to a single recipe id — used by tests and by the
   * Phase B stress script. Never set by product code.
   */
  recipeId?: string;
  /** Maximum generation attempts before failing (plan §37). */
  maxAttempts?: number;
}

/** Every knob the recipe randomised, recorded for replay and debugging. */
export interface RecipeParameterSnapshot {
  [key: string]: string | number | boolean;
}

/**
 * The non-electrical description of what the generated circuit *is*.
 *
 * Consumers (Challenge Mode, Diagnosis Lab, Ohmageddon) attach their own
 * scenario data on top of this; the generator never models faults, objectives
 * or scoring (plan §7).
 */
export interface GeneratedScenario {
  recipeId: string;
  recipeTitle: string;
  /** One-line description of the generated circuit. */
  summary: string;
  /** What the circuit is meant to teach. */
  teaches: string;
  /** Plain-language description of correct baseline behaviour. */
  expectedBehaviour: string;
  /** Component ids the recipe considers to be its loads. */
  loadComponentIds: string[];
  /** Component ids of protective devices in the generated circuit. */
  protectionComponentIds: string[];
  /** Component ids of user-operable switches (excluding protective devices). */
  switchComponentIds: string[];
  /** Component ids of supply terminals. */
  supplyComponentIds: string[];
  /** Wire ids the recipe considers safe, meaningful fault candidates. */
  faultCandidateWireIds: string[];
}

/** Everything needed to reproduce and audit a generated circuit. */
export interface GeneratedChallengeMetadata {
  generatorVersion: number;
  seed: number;
  difficulty: ChallengeDifficulty;
  mode: ChallengeMode;
  rageProfile?: string;
  challengeId: string;
  identity: ChallengeIdentity;
  recipeId: string;
  /** 1-based attempt number that produced the accepted circuit (plan §37). */
  attempts: number;
  componentCount: number;
  wireCount: number;
  /** Randomised recipe parameters for this specific circuit. */
  parameters: RecipeParameterSnapshot;
  /** Baseline simulation summary — the "known good" behaviour (plan §10). */
  baseline: BaselineSummary;
}

/** Condensed, serialisable view of the accepted baseline simulation. */
export interface BaselineSummary {
  energizedComponentIds: string[];
  energizedWireIds: string[];
  /** Loads the recipe expects to be energised with default switch states. */
  expectedEnergisedLoadIds: string[];
  warnings: string[];
  supplyVoltage: number;
  totalLoadWatts: number;
}

/** Generator output (plan §35). */
export interface GeneratedChallenge {
  circuit: Circuit;
  scenario: GeneratedScenario;
  metadata: GeneratedChallengeMetadata;
}

/** Why one generation attempt was rejected (plan §10, §37). */
export interface GenerationRejection {
  attempt: number;
  recipeId: string;
  stage: 'structure' | 'rules' | 'validation' | 'simulation' | 'behaviour';
  reasons: string[];
}

/** Result of a bounded-retry generation run. */
export type GenerationOutcome =
  | { ok: true; challenge: GeneratedChallenge; rejections: GenerationRejection[] }
  | { ok: false; rejections: GenerationRejection[]; message: string };

/** Full validation detail for one candidate circuit. */
export interface CandidateValidationResult {
  ok: boolean;
  rejections: Omit<GenerationRejection, 'attempt' | 'recipeId'>[];
  /** Baseline simulation in `basic` app mode, when it was reached. */
  basicResult?: SimulationResult;
  /** Baseline simulation in `pro` app mode, when it was reached. */
  proResult?: SimulationResult;
}
