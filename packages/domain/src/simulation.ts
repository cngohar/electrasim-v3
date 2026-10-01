/**
 * Simulation engine — public entry point.
 *
 * The former 1,025-line monolith now lives in `./simulation/`:
 *   - `indexing.ts`   — O(1) circuit lookup maps
 *   - `traversal.ts`  — live/neutral/earth rail BFS
 *   - `tripCurves.ts` — ampacity table + IEC trip-curve calculators
 *   - `simulate.ts`   — the `simulate()` engine entry
 *
 * All modules remain pure (no React / DOM) so the engine still ships into
 * `simulation.worker.ts` unchanged. This shim preserves the historical
 * import path.
 */

export {
  calculateMCBTrip,
  calculateRCDTrip,
  formatClearingTime,
  getCableAmpacity,
  simulate,
  compileCircuit,
  type CompileResult,
  type CompileOptions,
  type RCDTripResult,
  type SimulateOptions,
  type TripCurveResult,
} from './simulation/index';
