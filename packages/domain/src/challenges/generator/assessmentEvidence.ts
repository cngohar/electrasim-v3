import { hasOperationEvidence } from '../../simulationEvidence';
import type { Circuit, SimulationResult } from '../../types';

/** Shared healthy generated-circuit evidence, retained independently of retired grading. */
export function hasSupportedGeneratedBaseline(circuit: Circuit, result: SimulationResult): boolean {
  return (
    hasOperationEvidence(circuit, result) &&
    !!result.electrical &&
    result.errors.length === 0 &&
    !result.electrical.diagnostics.some(
      (d) => d.severity === 'error' || d.severity === 'warning',
    ) &&
    result.faultsCleared === true &&
    (result.activeInjectedFaults?.length ?? 0) === 0 &&
    (result.trippedComponents?.length ?? 0) === 0 &&
    (result.blownComponents?.length ?? 0) === 0 &&
    (result.bustedWires?.size ?? 0) === 0 &&
    !circuit.components.some((c) => c.state.isBlown || c.state.isTripped) &&
    !circuit.wires.some((w) => w.isBusted)
  );
}
