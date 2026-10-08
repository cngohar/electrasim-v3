import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { hasOperationEvidence, isCurrentSimulation } from '../simulationEvidence';
import { GUIDED_CIRCUIT_TEMPLATES } from '../templates';
import { TEMPLATE_CALCULATION_STATUS, retirementAcceptanceCircuits } from './retirementFixtures';
import { simulate } from './simulate';

describe('retired rail runtime', () => {
  it.each(Object.entries(retirementAcceptanceCircuits()))(
    '%s has unavailable operation at zero and elapsed time without changing the drawing',
    (_name, circuit) => {
      const snapshot = structuredClone(circuit);
      const restored = importJSON(exportJSON(circuit));
      for (const input of [circuit, restored])
        for (const deltaSeconds of [undefined, 1]) {
          const result = simulate(input, { deltaSeconds });
          expect(result.electricalContract?.status).toBe('unsupported');
          expect(result.electricalContract?.engineVersion).not.toBe('legacy-rail-1.5b');
          expect(result.legacyObservation).toBeUndefined();
          expect(result.energizedComponents.size).toBe(0);
          expect(result.energizedWires.size).toBe(0);
          expect(result.componentCalculations).toBeUndefined();
          expect(result.wireCalculations).toBeUndefined();
          expect(result.simulationState).toBeUndefined();
          expect(result.simulationEvents ?? []).toEqual([]);
          expect(result.trippedComponents ?? []).toEqual([]);
          expect(result.faultsCleared).toBe(false);
          expect(hasOperationEvidence(input, result)).toBe(false);
          expect(
            isCurrentSimulation(input, {
              ...result,
              legacyObservation: { engineVersion: 'legacy-rail-1.5b', reason: 'obsolete cache' },
            }),
          ).toBe(false);
        }
      expect(circuit).toEqual(snapshot);
    },
  );

  it.each(GUIDED_CIRCUIT_TEMPLATES)(
    '$id matches its reviewed model coverage and survives export/restore',
    (template) => {
      const expected =
        TEMPLATE_CALCULATION_STATUS[template.id as keyof typeof TEMPLATE_CALCULATION_STATUS];
      expect(expected).toBeDefined();
      const result = simulate(template.circuit);
      expect(result.electricalContract?.status).toBe(expected);
      expect(result.legacyObservation).toBeUndefined();
      expect(simulate(importJSON(exportJSON(template.circuit)))).toEqual(result);
      if (expected === 'unsupported') {
        expect(result.energizedComponents.size).toBe(0);
        expect(result.componentCalculations).toBeUndefined();
        expect(result.phasorComponents).toBeUndefined();
        expect(result.faultsCleared).toBe(false);
      }
    },
  );
});
