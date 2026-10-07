import { evaluateDiagnosis } from './evaluator';
import { buildDiagnosisScenario } from './scenario';

/** Replayed identically in Bun, real workerd and browser Comlink. */
export function diagnosisAcceptanceScenarios() {
  return [
    ...(['beginner', 'intermediate', 'advanced'] as const).map((difficulty) =>
      buildDiagnosisScenario({ seed: 5, difficulty }),
    ),
    ...(['rage-1', 'rage-2', 'rage-3', 'rage-4'] as const).map((rageTier) =>
      buildDiagnosisScenario({ seed: 3, difficulty: 'intermediate', rageTier }),
    ),
  ];
}

export function diagnosisEvidenceFixture() {
  return diagnosisAcceptanceScenarios().flatMap((scenario) => {
    const answer = {
      faultType: scenario.faults[0]!.fault.type,
      locationKey: scenario.faults[0]!.locationKey,
    };
    const circuits = {
      faulted: scenario.faultedCircuit,
      partial: { ...scenario.faultedCircuit, faults: scenario.faults.slice(1).map((f) => f.fault) },
      repaired: scenario.healthyCircuit,
      altered: { ...scenario.healthyCircuit, wires: scenario.healthyCircuit.wires.slice(1) },
    };
    return Object.entries(circuits).map(([step, circuit]) => ({
      diagnosisCase: `${scenario.difficulty}:${scenario.rage?.tier ?? 'normal'}:${step}`,
      scenario,
      circuit,
      evaluation: evaluateDiagnosis(scenario, circuit, answer, {
        identifiedFaultIds: scenario.faults.map((f) => f.fault.id),
      }),
    }));
  });
}
