/** One numerical entry for the app, Comlink and local Hono. Missing models and
 * numerical failures return unavailable results, never rail estimates. */
import { COMPONENT_DEFS } from '../components';
import { compileCircuit } from '../core/compile';
import { advanceControlStep } from '../core/controlStep';
import { solveControlledOperatingPoint } from '../core/dimming';
import { solvePhasorCircuit } from '../core/phasor';
import { advancePhasorControlStep } from '../core/phasorControlStep';
import { circuitRevision } from '../simulationEvidence';
import type { Circuit, SimulationResult } from '../types';
import { adaptMnaResult } from './mnaAdapter';
import type { SimulateOptions } from './options';
import { adaptPhasorResult } from './phasorAdapter';

export type { SimulateOptions } from './options';

export function simulate(circuit: Circuit, options: SimulateOptions = {}): SimulationResult {
  const result = simulateCircuit(circuit, options);
  return result.electricalContract?.status === 'invalid'
    ? result
    : { ...result, inputRevision: circuitRevision(circuit) };
}

function simulateCircuit(circuit: Circuit, options: SimulateOptions): SimulationResult {
  const defs = options.defs ?? COMPONENT_DEFS;
  const compiled = compileCircuit(circuit, { defs });
  if (compiled.status === 'compiled' && compiled.graph.sources.some((s) => s.phaseSystemId)) {
    if (
      options.simulationState !== undefined ||
      options.deltaSeconds !== undefined ||
      compiled.graph.devices.some((d) => d.model.kind === 'contacts' && d.model.coilModel)
    ) {
      const step = advancePhasorControlStep(compiled, {
        defs,
        simulationState: options.simulationState,
        deltaSeconds: options.deltaSeconds,
      });
      return {
        ...adaptPhasorResult(step.compiled, step.phasor),
        ...(step.simulationState
          ? {
              simulationState: step.simulationState,
              coilStates: { ...step.simulationState.contactStates },
            }
          : {}),
        simulationEvents: step.simulationEvents,
      };
    }
    return adaptPhasorResult(compiled, solvePhasorCircuit(circuit, { defs }));
  }
  if (
    compiled.status === 'compiled' &&
    (options.simulationState !== undefined ||
      options.deltaSeconds !== undefined ||
      compiled.circuit.wires.some((wire) => wire.damageModel) ||
      compiled.graph.devices.some(
        (d) =>
          !!d.damageModel ||
          (d.model.kind === 'contacts' &&
            !!(d.model.coilModel || d.model.timerModel || d.model.protectionModel)),
      ))
  ) {
    const step = advanceControlStep(compiled, {
      defs,
      simulationState: options.simulationState,
      deltaSeconds: options.deltaSeconds,
    });
    return {
      ...adaptMnaResult(step.compiled, step.electrical, defs),
      ...(step.simulationState ? { simulationState: step.simulationState } : {}),
      simulationEvents: step.simulationEvents,
    };
  }
  const point = solveControlledOperatingPoint(compiled, { defs });
  return adaptMnaResult(point.compiled, point.electrical, defs);
}
