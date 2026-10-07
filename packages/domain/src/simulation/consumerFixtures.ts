import { seriesFixture } from '../core/mnaFixtures';
import { hasOperationEvidence, isCurrentSimulation } from '../simulationEvidence';
import { readVoltage } from '../simulationReadings';
import { GUIDED_CIRCUIT_TEMPLATES } from '../templates';
import { simulate } from './simulate';

/** Cross-runtime consumer replay, with no clocks or synthetic verdicts. */
export function consumerAcceptanceCircuits() {
  const circuits = [
    ['series', seriesFixture()] as const,
    ...GUIDED_CIRCUIT_TEMPLATES.map((t) => [t.id, t.circuit] as const),
  ];
  return Object.fromEntries(circuits);
}

export function consumerEvidenceFixture() {
  return Object.entries(consumerAcceptanceCircuits()).map(([name, circuit]) => {
    const result = simulate(circuit);
    return {
      consumerCase: name,
      result,
      current: isCurrentSimulation(circuit, result),
      staleAccepted: isCurrentSimulation(circuit, { ...result, inputRevision: 'previous' }),
      operationAssessed: hasOperationEvidence(circuit, result),
      pair: readVoltage(
        circuit,
        result,
        { componentId: 'r0', portIndex: 0 },
        { componentId: 'r0', portIndex: 1 },
      ),
    };
  });
}
