/**
 * recipes.test.ts — recipe registry invariants (plan §8).
 *
 * Recipes are the one place where a typo produces a silently wrong circuit, so
 * these tests assert the registry itself is coherent before the pipeline ever
 * runs: real component types, real ports, sane weights, and no reference to
 * the component types the plan mentions but the registry does not have.
 */

import { describe, expect, it } from 'vitest';
import { COMPONENT_DEFS } from '../../components';
import { getDifficultyProfile } from '../difficulty/profiles';
import { CHALLENGE_DIFFICULTIES } from '../types';
import {
  CABLE_MM2,
  CHALLENGE_RECIPES,
  PROTECTION_RATING_CEILING_AMPS,
  getRecipeById,
  getRecipesForDifficulty,
  selectRecipe,
} from './recipes';
import { createRng } from './seed';

/**
 * Component types the plan names but this registry does not provide.
 * Referencing one would throw at build time — this test documents the reason.
 */
const ABSENT_FROM_REGISTRY = ['buzzer', 'motor-1phase', 'transformer-step-down'] as const;

function buildOnce(recipeId: string, seed: number) {
  const recipe = getRecipeById(recipeId);
  if (!recipe) throw new Error(`missing recipe ${recipeId}`);
  return recipe.build({
    rng: createRng(seed),
    profile: getDifficultyProfile(recipe.difficulty),
    prefix: `test-${seed}`,
  });
}

describe('recipe registry', () => {
  it('registers unique ids', () => {
    const ids = CHALLENGE_RECIPES.map((recipe) => recipe.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('covers every difficulty tier with at least three recipes', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      expect(getRecipesForDifficulty(difficulty).length).toBeGreaterThanOrEqual(3);
    }
  });

  it('declares positive weights and non-empty teaching copy', () => {
    for (const recipe of CHALLENGE_RECIPES) {
      expect(recipe.weight).toBeGreaterThan(0);
      expect(recipe.title.length).toBeGreaterThan(3);
      expect(recipe.topic.length).toBeGreaterThan(3);
      expect(recipe.teaches.length).toBeGreaterThan(15);
      expect(recipe.expectedBehaviour.length).toBeGreaterThan(15);
      expect(recipe.id.startsWith(recipe.difficulty)).toBe(true);
    }
  });

  it('confirms the plan-named components that this registry lacks', () => {
    // Guards the ADR claim: if one of these ever lands in the registry, the
    // recipes may start using it — but until then a reference would throw.
    for (const type of ABSENT_FROM_REGISTRY) {
      expect(COMPONENT_DEFS[type]).toBeUndefined();
    }
  });

  it('keeps the cable table aligned with BS 7671 standard sizes', () => {
    for (const mm2 of Object.values(CABLE_MM2)) {
      expect([1.0, 1.5, 2.5, 4.0, 6.0, 10.0]).toContain(mm2);
    }
  });
});

describe('recipe builds', () => {
  it.each(CHALLENGE_RECIPES.map((recipe) => recipe.id))(
    '%s builds valid topology across 25 seeds',
    (recipeId) => {
      const recipe = getRecipeById(recipeId)!;
      for (let seed = 1; seed <= 25; seed++) {
        const built = buildOnce(recipeId, seed);
        const topology = built.builder.build();

        expect(topology.components.length).toBeGreaterThan(0);
        expect(topology.wires.length).toBeGreaterThan(0);
        expect(built.summary.length).toBeGreaterThan(20);
        expect(built.loadComponentIds.length).toBeGreaterThan(0);
        expect(built.protectionComponentIds.length).toBeGreaterThan(0);
        expect(built.supplyComponentIds.length).toBeGreaterThanOrEqual(2);
        expect(Object.keys(built.parameters).length).toBeGreaterThan(0);

        // Every declared id must actually exist in the built topology.
        const ids = new Set(topology.components.map((component) => component.id));
        for (const id of [
          ...built.loadComponentIds,
          ...built.protectionComponentIds,
          ...built.switchComponentIds,
          ...built.supplyComponentIds,
          ...built.expectedEnergisedLoadIds,
        ]) {
          expect(ids.has(id), `${recipe.id}: dangling id ${id}`).toBe(true);
        }

        // Every component must carry an explicit cable cross-section.
        for (const component of topology.components) {
          expect(component.state.customCableMm2).toBeGreaterThan(0);
        }

        // Protective devices must stay under the validator's ceiling.
        for (const component of topology.components) {
          const def = COMPONENT_DEFS[component.type];
          if (!def?.isProtection) continue;
          const rating = component.state.customMaxAmps ?? def.maxAmps ?? 0;
          expect(rating).toBeLessThanOrEqual(PROTECTION_RATING_CEILING_AMPS);
          expect(component.state.on).toBe(true);
        }
      }
    },
  );

  it('randomises parameters across seeds rather than emitting one fixed circuit', () => {
    for (const recipe of CHALLENGE_RECIPES) {
      const snapshots = new Set<string>();
      for (let seed = 1; seed <= 30; seed++) {
        snapshots.add(JSON.stringify(buildOnce(recipe.id, seed).parameters));
      }
      expect(snapshots.size, `${recipe.id} never varies`).toBeGreaterThan(1);
    }
  });

  it('is deterministic for a given rng state', () => {
    for (const recipe of CHALLENGE_RECIPES) {
      const a = buildOnce(recipe.id, 42);
      const b = buildOnce(recipe.id, 42);
      expect(JSON.stringify(b.builder.build())).toBe(JSON.stringify(a.builder.build()));
      expect(b.summary).toBe(a.summary);
    }
  });
});

describe('selectRecipe', () => {
  it('only returns recipes from the requested tier', () => {
    const rng = createRng(1234);
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      for (let i = 0; i < 60; i++) {
        expect(selectRecipe(rng, difficulty).difficulty).toBe(difficulty);
      }
    }
  });

  it('eventually selects every recipe in a tier', () => {
    for (const difficulty of CHALLENGE_DIFFICULTIES) {
      const rng = createRng(99);
      const seen = new Set<string>();
      for (let i = 0; i < 400; i++) seen.add(selectRecipe(rng, difficulty).id);
      const expected = getRecipesForDifficulty(difficulty).map((recipe) => recipe.id);
      expect([...seen].sort()).toEqual([...expected].sort());
    }
  });

  it('is deterministic for a given rng state', () => {
    const a = Array.from({ length: 20 }, (_, i) => selectRecipe(createRng(i), 'intermediate').id);
    const b = Array.from({ length: 20 }, (_, i) => selectRecipe(createRng(i), 'intermediate').id);
    expect(b).toEqual(a);
  });
});

describe('getRecipeById', () => {
  it('resolves known ids and returns undefined for unknown ones', () => {
    expect(getRecipeById(CHALLENGE_RECIPES[0]!.id)?.id).toBe(CHALLENGE_RECIPES[0]!.id);
    expect(getRecipeById('nope')).toBeUndefined();
  });
});
