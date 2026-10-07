import { terminalId } from './core/faultTopology';
import { voltageBetween } from './core/linearMeasurements';
import { phasorMagnitude, phasorVoltageBetween } from './core/phasor';
import { isCurrentSimulation } from './simulationEvidence';
import type { Circuit, PortRef, SimulationResult } from './types';

/** A named terminal-pair voltage, never a document voltage or a guessed zero. */
export function readVoltage(
  circuit: Circuit,
  result: SimulationResult | null,
  from: PortRef,
  to: PortRef,
): { volts: number | null; convention: 'scalar' | 'complex-rms' | null } {
  if (!isCurrentSimulation(circuit, result) || result.legacyObservation)
    return { volts: null, convention: null };
  const a = terminalId(from.componentId, from.portIndex);
  const b = terminalId(to.componentId, to.portIndex);
  if (result.phasor) {
    const value = phasorVoltageBetween(result.phasor, a, b);
    return { volts: value ? phasorMagnitude(value) : null, convention: 'complex-rms' };
  }
  return {
    volts: result.electrical ? (voltageBetween(result.electrical, a, b) ?? null) : null,
    convention: 'scalar',
  };
}
