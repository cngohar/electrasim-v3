import { simulate } from '@electrasim/domain/simulation';
import { beforeEach, describe, expect, it } from 'vitest';
import { damageCircuit } from '../../../../packages/domain/src/core/damageFixtures';
import { rememberFaultResponse, useFaultLabStore } from '../../../store/faultLabStore';
import { captureFaultResponse, responseStages } from './faultLabEvidence';

const target = { type: 'wire', id: 'load-feed' } as const;
beforeEach(() => useFaultLabStore.setState({ original: null, responses: {}, edits: [] }));

describe('Fault Lab evidence boundary', () => {
  it('unassessed faults cannot expose captured consequence measurements or timing', () => {
    const circuit = damageCircuit();
    circuit.components[2]!.state.fault = 'arc-fault';
    const result = simulate(circuit);
    const response = captureFaultResponse(circuit, result, { type: 'component', id: 'lamp' });
    if (!response) {
      expect(result.electrical?.status).not.toBe('converged');
      return;
    }
    expect(response.unassessed).toBe(true);
    expect(response.current).toBeNull();
    expect(response.voltage).toBeNull();
    expect(response.damage).toBeNull();
    expect(response.events).toEqual([]);
    expect(response.sources).toEqual([]);
  });

  it('rejects stale results and deleted targets while allowing display-only geometry changes', () => {
    const circuit = damageCircuit();
    const result = simulate(circuit);
    expect(captureFaultResponse(circuit, result, target)).not.toBeNull();
    const moved = {
      ...circuit,
      components: circuit.components.map((c) => ({ ...c, x: c.x + 100 })),
    };
    expect(captureFaultResponse(moved, result, target)).not.toBeNull();
    expect(
      captureFaultResponse({ ...circuit, globalVoltage: 999, supply: undefined }, result, target),
    ).toBeNull();
    expect(captureFaultResponse(circuit, result, { type: 'wire', id: 'deleted' })).toBeNull();
  });

  it('copies real damage timing and final operating points without modifying the solver result', () => {
    const circuit = damageCircuit();
    const result = simulate(circuit, { deltaSeconds: 2 });
    const original = structuredClone(result);
    const response = captureFaultResponse(circuit, result, target)!;
    expect(response.events).toEqual(result.simulationEvents);
    expect(response.events[0]?.type).toBe('damage');
    expect(response.damage?.damaged).toBe(true);
    expect(response.current).toBe(0);
    response.events.length = 0;
    expect(result).toEqual(original);
    expect(responseStages(response)[4]![1]).toContain('causal walkthrough');
  });

  it('retains a recorded event over subsequent accepted steps of the same run', () => {
    const circuit = damageCircuit();
    const result = simulate(circuit, { deltaSeconds: 2 });
    rememberFaultResponse(captureFaultResponse(circuit, result, target)!);
    const later = simulate(circuit, { simulationState: result.simulationState, deltaSeconds: 1 });
    expect(later.simulationEvents).toEqual([]);
    rememberFaultResponse(captureFaultResponse(circuit, later, target)!);
    expect(useFaultLabStore.getState().responses['wire:load-feed']!.current.events).toEqual(
      result.simulationEvents,
    );
  });

  it('a new run does not inherit timed events from the previous simulation clock', () => {
    const circuit = damageCircuit();
    rememberFaultResponse(
      captureFaultResponse(circuit, simulate(circuit, { deltaSeconds: 2 }), target)!,
    );
    rememberFaultResponse(captureFaultResponse(circuit, simulate(circuit), target)!);
    expect(useFaultLabStore.getState().responses['wire:load-feed']!.current.events).toEqual([]);
  });
});
