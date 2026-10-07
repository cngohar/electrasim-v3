/** One domain entry for the app, Comlink and local Hono. Numerical failures never
 * fall back to rail estimates. The temporary legacy path serves only models
 * which have not migrated yet, with explicitly unavailable numerical telemetry. */
import { COMPONENT_DEFS } from '../components';
import { compileCircuit } from '../core/compile';
import { advanceControlStep } from '../core/controlStep';
import { dimmerPowerFraction } from '../core/dimmerModel';
import { solveControlledOperatingPoint } from '../core/dimming';
import { solvePhasorCircuit } from '../core/phasor';
import { advancePhasorControlStep } from '../core/phasorControlStep';
import { getLegacySimulationLimitations, getSimulationLimitations } from '../simulationCoverage';
import { circuitRevision } from '../simulationEvidence';
import type { Circuit, SimulationResult } from '../types';
import { type SimulateOptions, simulateLegacy } from './legacy';
import { adaptMnaResult } from './mnaAdapter';
import { adaptPhasorResult } from './phasorAdapter';

export type { SimulateOptions } from './legacy';

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
  const electrical = point.electrical;
  const legacyDeviceGap =
    compiled.status === 'compiled' &&
    compiled.coverage.some(
      (item) =>
        item.status === 'not-assessed' && ['load', 'controls', 'fault'].includes(item.aspect),
    );
  const joinedAcSources =
    compiled.status === 'compiled' &&
    compiled.graph.domains.some(
      (domain) =>
        domain.sourceIds.length > 1 &&
        compiled.graph.sources.some(
          (source) => domain.sourceIds.includes(source.id) && source.model.kind !== 'dc',
        ),
    );
  if (
    compiled.status === 'invalid' ||
    electrical.status !== 'unsupported' ||
    !legacyDeviceGap ||
    joinedAcSources ||
    electrical.diagnostics.some(
      (d) => d.code.startsWith('dimmer-') && d.code !== 'dimmer-rms-model',
    ) ||
    getLegacySimulationLimitations(compiled.circuit, defs).some((item) => item.blocking) ||
    getSimulationLimitations(compiled.circuit, defs).some((item) => item.blocking)
  )
    return adaptMnaResult(point.compiled, electrical, defs);

  // Unmigrated fan/driver exercises retain explicitly qualitative continuity.
  // Zero level opens even this observation; intermediate levels never produce
  // guessed motor speed, dimming measurements, or an accepted timed state.
  const legacyCircuit = {
    ...compiled.circuit,
    components: compiled.circuit.components.map((component) =>
      defs[component.type]?.isDimmer && dimmerPowerFraction(component.state, component.type) === 0
        ? { ...component, state: { ...component.state, on: false } }
        : component,
    ),
  };
  const legacy = simulateLegacy(legacyCircuit, options);
  // Retain existing qualitative switching/fault exercises until 1.5D/F. Do not
  // pass their fixed-nameplate, shared-current or thermal guesses off as readings.
  legacy.componentCalculations = undefined;
  legacy.wireCalculations = undefined;
  legacy.thermalData = undefined;
  legacy.supplyVoltage = undefined;
  legacy.wireHeatRatios = undefined;
  legacy.readiness = electrical.readiness;
  legacy.electrical = electrical;
  legacy.legacyObservation = {
    engineVersion: 'legacy-rail-1.5b',
    reason:
      'Legacy continuity and fault observations only. Numerical load, wire and operating measurements, dimming and motor speed are not assessed for these models.',
  };
  legacy.modelLimitations = getSimulationLimitations(compiled.circuit, defs);
  legacy.warnings.push(
    legacy.legacyObservation.reason,
    ...legacy.modelLimitations.map((item) => item.message),
  );
  legacy.electricalContract = {
    version: electrical.contractVersion,
    engineVersion: 'legacy-rail-1.5b',
    modelVersion: electrical.modelVersion,
    status: 'not-assessed',
    coverage: electrical.coverage,
    diagnostics: electrical.diagnostics,
  };
  // Compatibility observation for unmigrated F.2 generators, never repair evidence.
  if (electrical.readiness.topology === 'empty' || electrical.readiness.topology === 'no-source')
    legacy.faultsCleared = false;
  return legacy;
}
