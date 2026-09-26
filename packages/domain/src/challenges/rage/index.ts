/**
 * Ohmageddon barrel (plan §23–§28, Phase E).
 *
 * Everything rage-related lives under this folder so the §57 gate
 * ("the generator contains no Ohmageddon-specific logic") is checkable by
 * looking at imports: nothing in `generator/**` may import from here.
 */

export * from './types';
export * from './modifiers';
export * from './tiers';
export * from './runner';
