/**
 * Simulation module barrel — preserves the exact public surface of the
 * former monolithic `simulation.ts`.
 */

export { getCableAmpacity } from './tripCurves';
export type { RCDTripResult, TripCurveResult } from './tripCurves';
export { calculateMCBTrip, calculateRCDTrip, formatClearingTime } from './tripCurves';
export { simulate } from './simulate';
export type { SimulateOptions } from './simulate';
export { compileCircuit } from '../core/compile';
export type { CompileResult, CompileOptions } from '../core/contracts';
