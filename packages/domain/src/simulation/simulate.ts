/** One domain entry for the app, Comlink and local Hono. Numerical failures never
 * fall back to rail estimates. The temporary legacy path serves only models
 * which have not migrated yet, with explicitly unavailable numerical telemetry. */
import { COMPONENT_DEFS } from '../components';
import { compileCircuit } from '../core/compile';
import { advanceControlStep } from '../core/controlStep';
import { solveCompiledCircuit } from '../core/mna';
import { getLegacySimulationLimitations, getSimulationLimitations } from '../simulationCoverage';
import type { Circuit, SimulationResult } from '../types';
import { type SimulateOptions, simulateLegacy } from './legacy';
import { adaptMnaResult } from './mnaAdapter';

export type { SimulateOptions } from './legacy';

export function simulate(circuit: Circuit, options: SimulateOptions = {}): SimulationResult {
  const defs = options.defs ?? COMPONENT_DEFS;
  const compiled = compileCircuit(circuit, { defs });
  if (
    compiled.status === 'compiled' &&
    (options.simulationState !== undefined ||
      options.deltaSeconds !== undefined ||
      compiled.graph.devices.some((d) => d.model.kind === 'contacts' && d.model.coilModel))
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
  const electrical = solveCompiledCircuit(compiled, { defs });
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
    getLegacySimulationLimitations(compiled.circuit, defs).some((item) => item.blocking) ||
    getSimulationLimitations(compiled.circuit, defs).some((item) => item.blocking)
  )
    return adaptMnaResult(compiled, electrical, defs);

  const legacy = simulateLegacy(compiled.circuit, options);
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
      'Legacy continuity and fault observations only. Numerical load, wire and operating measurements are not assessed for these models.',
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
  if (electrical.readiness.topology === 'empty' || electrical.readiness.topology === 'no-source')
    legacy.faultsCleared = false;
  return legacy;
}
