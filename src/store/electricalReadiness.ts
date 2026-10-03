import type { Circuit } from '@electrasim/domain';
import { assessCircuitReadiness } from '@electrasim/domain/core/readiness';
import { useShallow } from 'zustand/react/shallow';
import { selectCircuit, useCircuitStore } from './circuitStore';
import { sameCircuitRevision } from './electricalEditing';

let previous: Circuit | undefined;
let cached: ReturnType<typeof assessCircuitReadiness> | undefined;
export function circuitReadiness(circuit: Circuit) {
  if (!previous || !cached || !sameCircuitRevision(previous, circuit)) {
    cached = assessCircuitReadiness(circuit);
    previous = circuit;
  }
  return cached;
}

export function useCircuitDocument(): Circuit {
  return useCircuitStore(useShallow(selectCircuit));
}

export function useCircuitReadiness() {
  return circuitReadiness(useCircuitDocument());
}
