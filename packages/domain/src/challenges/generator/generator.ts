/**
 * The challenge circuit generator (plan §7, §35, §37).
 *
 *   Seed → Difficulty Profile → Recipe Selection → Component Selection
 *        → Topology Generation → Layout Generation → Electrical Validation
 *        → Baseline Simulation Validation → GeneratedCircuit
 *
 * The pipeline STOPS at a valid circuit. Fault selection, fault injection,
 * diagnosis scoring and Ohmageddon modifiers are the concern of later phases
 * and must never leak into this module (plan §7, §51, §57).
 *
 * The function is pure: same request → same circuit, byte for byte. It reads
 * no clock, touches no storage and holds no module-level mutable state, which
 * also makes it safe to call from the existing simulation worker.
 */

import { COMPONENT_DEFS } from '../../components';
import type { Circuit } from '../../types';
import { getDifficultyProfile } from '../difficulty/profiles';
import type {
  BaselineSummary,
  GenerateChallengeRequest,
  GeneratedChallenge,
  GenerationOutcome,
  GenerationRejection,
} from '../types';
import { applyLayout } from './layout';
import { getRecipeById, selectRecipe } from './recipes';
import {
  GENERATOR_VERSION,
  computeChallengeIdentity,
  createSeededRng,
  normalizeSeed,
} from './seed';
import { declareRecipeModels, supportedRecipeRng, supportedRecipes } from './supportedRecipes';
import { validateCandidate } from './validator';

/**
 * Maximum generation attempts before giving up (plan §37).
 *
 * "Never allow an infinite generation loop. Use a maximum generation-attempt
 * limit." Twelve is comfortably above the observed worst case (recipes are
 * pre-verified, so rejections are rare) while still failing fast enough to be
 * noticed in development.
 */
export const MAX_GENERATION_ATTEMPTS = 12;

/** Message shown to the user when generation genuinely fails (plan §37). */
export const GENERATION_FAILURE_MESSAGE =
  'Unable to generate a valid challenge.\n\nTry generating another circuit.';

/** Thrown by {@link generateChallenge} when every attempt was rejected. */
export class ChallengeGenerationError extends Error {
  readonly rejections: GenerationRejection[];

  constructor(message: string, rejections: GenerationRejection[]) {
    super(message);
    this.name = 'ChallengeGenerationError';
    this.rejections = rejections;
  }
}

/**
 * Attempt generation with bounded retries, returning a structured outcome.
 *
 * Prefer this over {@link generateChallenge} when the caller wants to inspect
 * rejections (the Phase B stress script does).
 */
export function tryGenerateChallenge(request: GenerateChallengeRequest): GenerationOutcome {
  const generatorVersion = request.generatorVersion ?? GENERATOR_VERSION;
  const seed = normalizeSeed(request.seed);
  const mode = request.mode ?? 'challenge';
  const { difficulty, rageProfile } = request;
  const maxAttempts = Math.max(1, request.maxAttempts ?? MAX_GENERATION_ATTEMPTS);

  const profile = getDifficultyProfile(difficulty);
  const identityInputs = { generatorVersion, seed, difficulty, mode, rageProfile };
  const identity = computeChallengeIdentity(identityInputs);
  const rootRng = createSeededRng(identityInputs);

  const rejections: GenerationRejection[] = [];

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Each attempt gets its own forked stream, so a rejected attempt cannot
    // shift the sequence the next one sees — retries stay deterministic.
    const attemptRng = rootRng.fork(`attempt:${attempt}`);

    const recipe = request.recipeId
      ? getRecipeById(request.recipeId)
      : generatorVersion >= 3
        ? attemptRng.pickWeighted(
            supportedRecipes(difficulty),
            supportedRecipes(difficulty).map((r) => r.weight),
          )
        : selectRecipe(attemptRng, difficulty);
    if (!recipe) {
      throw new ChallengeGenerationError(`Unknown recipe id "${request.recipeId}"`, rejections);
    }
    if (
      generatorVersion >= 3 &&
      !supportedRecipes(recipe.difficulty).some((r) => r.id === recipe.id)
    )
      return {
        ok: false,
        message: GENERATION_FAILURE_MESSAGE,
        rejections: [
          {
            attempt,
            recipeId: recipe.id,
            stage: 'simulation',
            reasons: ['This recipe has no supported assessment model for this difficulty.'],
          },
        ],
      };

    const prefix = `gen-${identity.shortCode}-${attempt}`;

    let built: ReturnType<typeof recipe.build>;
    try {
      built = recipe.build({
        rng: generatorVersion >= 3 ? supportedRecipeRng(attemptRng) : attemptRng,
        profile,
        prefix,
      });
    } catch (error) {
      // A recipe that throws is a generator bug worth surfacing in
      // development (plan §37) — record it and let the retry loop continue.
      rejections.push({
        attempt,
        recipeId: recipe.id,
        stage: 'structure',
        reasons: [error instanceof Error ? error.message : String(error)],
      });
      continue;
    }

    const topology = built.builder.build();
    const layout = applyLayout(topology.components, topology.placements);

    let circuit: Circuit = {
      components: layout.components,
      wires: topology.wires,
      globalVoltage: 230,
    };
    if (generatorVersion >= 3) circuit = declareRecipeModels(circuit);

    const validation = validateCandidate({
      circuit,
      expectedEnergisedLoadIds: built.expectedEnergisedLoadIds,
      componentBudget: profile.componentBudget,
      requireAssessment: generatorVersion >= 3,
    });

    if (!validation.ok) {
      for (const rejection of validation.rejections) {
        rejections.push({ attempt, recipeId: recipe.id, ...rejection });
      }
      continue;
    }

    const baselineResult = validation.proResult ?? validation.basicResult;
    const baseline: BaselineSummary = {
      energizedComponentIds: [...(baselineResult?.energizedComponents ?? [])].sort(),
      energizedWireIds: [...(baselineResult?.energizedWires ?? [])].sort(),
      expectedEnergisedLoadIds: [...built.expectedEnergisedLoadIds],
      warnings: [...(baselineResult?.warnings ?? [])],
      supplyVoltage: baselineResult?.supplyVoltage ?? 230,
      totalLoadWatts: totalLoadWatts(circuit, built.loadComponentIds),
    };

    const challenge: GeneratedChallenge = {
      circuit,
      scenario: {
        recipeId: recipe.id,
        recipeTitle: recipe.title,
        summary: built.summary,
        teaches: recipe.teaches,
        expectedBehaviour: recipe.expectedBehaviour,
        loadComponentIds: [...built.loadComponentIds],
        protectionComponentIds: [...built.protectionComponentIds],
        switchComponentIds: [...built.switchComponentIds],
        supplyComponentIds: [...built.supplyComponentIds],
        faultCandidateWireIds: topology.wires.map((wire) => wire.id),
      },
      metadata: {
        generatorVersion,
        seed,
        difficulty,
        mode,
        ...(rageProfile ? { rageProfile } : {}),
        challengeId: identity.displayId,
        identity,
        recipeId: recipe.id,
        attempts: attempt,
        componentCount: circuit.components.length,
        wireCount: circuit.wires.length,
        parameters: built.parameters,
        baseline,
      },
    };

    return { ok: true, challenge, rejections };
  }

  return { ok: false, rejections, message: GENERATION_FAILURE_MESSAGE };
}

/**
 * Generate one valid challenge circuit (plan §35).
 *
 * @throws {ChallengeGenerationError} when bounded retries are exhausted.
 */
export function generateChallenge(request: GenerateChallengeRequest): GeneratedChallenge {
  const outcome = tryGenerateChallenge(request);
  if (!outcome.ok) {
    throw new ChallengeGenerationError(outcome.message, outcome.rejections);
  }
  return outcome.challenge;
}

/** Sum of the rated power of the recipe's declared loads, in watts. */
function totalLoadWatts(circuit: Circuit, loadComponentIds: readonly string[]): number {
  const ids = new Set(loadComponentIds);
  return circuit.components.reduce((total, component) => {
    if (!ids.has(component.id)) return total;
    const def = COMPONENT_DEFS[component.type];
    if (!def?.isLoad) return total;
    return total + (component.state.customPowerWatts ?? def.powerWatts ?? 0);
  }, 0);
}
