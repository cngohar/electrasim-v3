import { explicitSupplyProfile } from '../../core/supplies';
import type { Circuit } from '../../types';
import type { ChallengeDifficulty } from '../types';
import { CHALLENGE_RECIPES, type ChallengeRecipe } from './recipes';
import type { Rng } from './seed';

/** Current graded envelope. Bell, fan, outlet-demand and undeclared timer
 * recipes remain historical until their own numerical models are available. */
export const SUPPORTED_RECIPE_IDS = [
  'beginner-protected-load',
  'beginner-switched-light',
  'intermediate-two-way-lighting',
  'intermediate-branched-lighting',
  'advanced-distribution-board',
  'advanced-contactor-control',
] as const;

export function supportedRecipes(difficulty: ChallengeDifficulty): ChallengeRecipe[] {
  return CHALLENGE_RECIPES.filter(
    (r) => r.difficulty === difficulty && SUPPORTED_RECIPE_IDS.some((id) => id === r.id),
  );
}

/** Keep the reviewed topologies; choose only modeled devices before building.
 * No LED, sounder or motor nameplate is converted to a resistor. */
export function supportedRecipeRng(rng: Rng): Rng {
  return {
    ...rng,
    pick<T>(items: readonly T[]): T {
      if (items.includes('bulb-incandescent' as T)) return 'bulb-incandescent' as T;
      if (items.includes('single-way-switch' as T) && items.includes('timer-switch' as T))
        return 'single-way-switch' as T;
      return rng.pick(items);
    },
  };
}

export function declareRecipeModels(circuit: Circuit): Circuit {
  return {
    ...circuit,
    supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 }),
    components: circuit.components.map((c) => {
      if (c.type === 'mcb' || c.type === 'fuse') {
        const ratedCurrentAmps = c.state.customMaxAmps ?? 6;
        return {
          ...c,
          state: {
            ...c.state,
            protectionModel:
              c.type === 'mcb'
                ? {
                    version: 1 as const,
                    kind: 'mcb' as const,
                    ratedCurrentAmps,
                    curve: 'B' as const,
                  }
                : {
                    version: 1 as const,
                    kind: 'fuse' as const,
                    ratedCurrentAmps,
                    meltingIntegralSeconds: 10,
                  },
          },
        };
      }
      if (c.type === 'contactor-1p')
        return {
          ...c,
          state: {
            ...c.state,
            coilModel: {
              version: 1 as const,
              supply: { kind: 'ac-single-phase' as const, voltage: 230, frequencyHz: 50 },
              nominalPowerWatts: 2,
              pickupRatio: 0.8,
              dropoutRatio: 0.2,
              onDelaySeconds: 0,
              offDelaySeconds: 0,
            },
          },
        };
      return c;
    }),
  };
}
