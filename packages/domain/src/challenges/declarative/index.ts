/**
 * Declarative Challenge Mode barrel (plan §5).
 *
 * The structured learning layer: declarative challenges + rules + validator,
 * built on the real circuit model and simulation engine. No generator, no
 * randomness (plan §44).
 */

export * from './types';
export * from './definitions';
export * from './graph';
export * from './rules';
export * from './stepProgress';
export * from './validator';
export { formatElapsed as formatElapsedDeclarative } from '../format';
