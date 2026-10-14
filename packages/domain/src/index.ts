/**
 * Domain barrel — single import path for the rest of the app.
 *
 *   import { COMPONENT_DEFS, type Circuit } from '@electrasim/domain';
 *   import { simulate } from '@electrasim/domain/simulation';
 *
 * Keeps the import surface small and lets us reorganise files internally
 * without touching every consumer.
 */

export * from './types';
export * from './components';
export * from './componentLabel';
export * from './faults';
export * from './faultApplicability';
export * from './geometry';
export * from './electricalCalculations';
export * from './componentHelp';
export * from './circuitValidation';
export * from './electrical';
export * from './protectionRoles';
