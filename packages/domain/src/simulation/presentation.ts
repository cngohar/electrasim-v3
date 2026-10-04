import type { SimulationResult } from '../types';

/** Small presentation mapping; importing it never loads either numerical engine. */
export function calculationLabel(result: SimulationResult): string {
  if (result.legacyObservation) return 'Calculation unassessed · legacy observations';
  switch (result.electrical?.status ?? result.electricalContract?.status) {
    case 'converged':
      return 'Calculated';
    case 'invalid':
      return 'Invalid circuit';
    case 'nonconverged':
      return 'Calculation did not converge';
    case 'unsupported':
      return 'Calculation unassessed';
    case 'not-solved':
      return 'No driven calculation';
    default:
      return 'Calculation unassessed';
  }
}

export function operationLabel(result: SimulationResult): string {
  switch (result.electrical?.operation) {
    case 'no-load':
      return 'No load';
    case 'idle':
      return 'No load current';
    case 'partial':
      return 'Partial operation';
    case 'underpowered':
      return 'Below nominal power';
    case 'incompatible':
      return 'Incompatible operation';
    case 'operating':
      return 'Operating';
    default:
      return 'Operation unassessed';
  }
}
