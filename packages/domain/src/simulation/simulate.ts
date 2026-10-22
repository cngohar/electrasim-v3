/** One numerical entry for the app, Comlink and local Hono. Missing models and
 * numerical failures return unavailable results, never rail estimates. */
import { COMPONENT_DEFS } from '../components';
import { compileCircuit } from '../core/compile';
import { advanceControlStep } from '../core/controlStep';
import { solveControlledOperatingPoint } from '../core/dimming';
import { solvePhasorCircuit } from '../core/phasor';
import { advancePhasorControlStep } from '../core/phasorControlStep';
import { circuitRevision, circuitRevisionFromNormalized } from '../simulationEvidence';
import type { Circuit, SimulationResult } from '../types';
import { adaptMnaResult } from './mnaAdapter';
import type { SimulateOptions } from './options';
import { adaptPhasorResult } from './phasorAdapter';

export type { SimulateOptions } from './options';

export function simulate(circuit: Circuit, options: SimulateOptions = {}): SimulationResult {
  const { result, normalized } = simulateCircuit(circuit, options);
  return result.electricalContract?.status === 'invalid'
    ? result
    : {
        ...result,
        inputRevision: normalized
          ? circuitRevisionFromNormalized(normalized)
          : circuitRevision(circuit),
      };
}

function simulateCircuit(
  circuit: Circuit,
  options: SimulateOptions,
): { result: SimulationResult; normalized?: Circuit } {
  const defs = options.defs ?? COMPONENT_DEFS;
  const compiled = compileCircuit(circuit, { defs });
  const normalized =
    compiled.status === 'compiled' && options.defs === undefined ? compiled.circuit : undefined;
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
        result: {
          ...adaptPhasorResult(step.compiled, step.phasor),
          ...(step.simulationState
            ? {
                simulationState: step.simulationState,
                coilStates: { ...step.simulationState.contactStates },
              }
            : {}),
          simulationEvents: step.simulationEvents,
        },
        normalized,
      };
    }
    return {
      result: adaptPhasorResult(compiled, solvePhasorCircuit(circuit, { defs })),
      normalized,
    };
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
      result: {
        ...adaptMnaResult(step.compiled, step.electrical, defs),
        ...(step.simulationState ? { simulationState: step.simulationState } : {}),
        simulationEvents: step.simulationEvents,
      },
      normalized,
    };
  }
  const point = solveControlledOperatingPoint(compiled, { defs });
  return { result: adaptMnaResult(point.compiled, point.electrical, defs), normalized };
}
