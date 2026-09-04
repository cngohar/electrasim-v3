/**
 * Domain barrel — single import path for the rest of the app.
 *
 *   import { COMPONENT_DEFS, type Circuit } from '@/src/domain';
 *   import { simulate } from '@/src/domain/simulation';
 *
 * Keeps the import surface small and lets us reorganise files internally
 * without touching every consumer.
 */

export * from './types';
export * from './components';
export * from './componentLabel';
export * from './faults';
export * from './geometry';
export * from './electricalCalculations';
export * from './componentHelp';
export * from './circuitValidation';
export * from './electrical';
export * from './protectionRoles';

/**
 * NOT re-exported: `./challenges`.
 *
 * The learning modes (generator, recipes, diagnosis, rage) are only reachable
 * from the lazily-loaded Challenge Mode / Diagnosis Lab panels. Re-exporting
 * them here pulled the whole subsystem into the eager entry chunk — every
 * first-paint visitor downloaded the generator whether or not they ever opened
 * an exercise. Import directly from `@/src/domain/challenges` instead, which
 * keeps that code in its own lazy chunk (see docs/PERFORMANCE.md).
 */
