/**
 * Simulation module barrel — preserves the exact public surface of the
 * former monolithic `simulation.ts`.
 */

export { getCableAmpacity } from './tripCurves';
export type { FuseTripResult, RCDTripResult, TripCurveResult } from './tripCurves';
export {
  calculateFuseTrip,
  calculateMCBTrip,
  calculateRCDTrip,
  formatClearingTime,
} from './tripCurves';
export { simulate } from './simulate';
export type { SimulateOptions } from './simulate';
export {
  TIMED_MODEL_VERSION,
  createSimulationState,
  replaySimulation,
  resetSimulationState,
  simulateTimed,
  stepSimulation,
} from './timed';
export type {
  FaultLabRepairAuthorization,
  FaultLabRepairOperation,
  TimedCoilTiming,
  TimedControl,
  TimedInputEvent,
  TimedReplay,
  TimedSimulationOptions,
  TimedTransition,
} from './timed';
export type {
  ElectricalEventKind,
  ElectricalSimulationEvent,
  ElectricalSimulationState,
  TransientProtectionState,
} from '../core/contracts';
export { compileCircuit } from '../core/compile';
export type { CompileResult, CompileOptions } from '../core/contracts';
