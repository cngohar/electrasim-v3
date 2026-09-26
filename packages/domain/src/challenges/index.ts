/**
 * Challenge domain barrel.
 *
 * Exposes the circuit generator foundation (Phase A/B), the declarative
 * Challenge Mode, the Diagnosis Lab (Phase D) and Ohmageddon. The old
 * generator-based Challenge Mode was replaced by the declarative system
 * (plan §44: "Do not turn Challenge Mode into a second random generator").
 */

export * from './types';
export * from './difficulty/profiles';
export * from './generator/seed';
export * from './generator/recipes';
export * from './generator/topology';
export * from './generator/layout';
export * from './generator/validator';
export * from './generator/generator';
export * from './declarative';
export * from './faults/eligibility';
export * from './faults/injection';
export * from './faults/labels';
export * from './faults/verification';
export * from './diagnosis/scenario';
export * from './diagnosis/evaluator';
export * from './diagnosis/scoring';
export * from './format';
export * from './share';
export * from './rage';
