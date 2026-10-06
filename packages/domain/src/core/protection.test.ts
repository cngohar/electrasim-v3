import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { simulate } from '../simulation';
import {
  protectionCircuit,
  rcboCircuit,
  rcdBalancedCircuit,
  rcdLeakingCircuit,
} from './protectionFixtures';

describe('declared timed protection', () => {
  it('trips an MCB thermally on overload and opens the protected circuit', () => {
    const circuit = protectionCircuit('mcb', 2);
    const first = simulate(circuit, { deltaSeconds: 10 });
    expect(first.electrical?.status).toBe('converged');
    expect(first.simulationEvents).toEqual([]);
    expect(first.simulationState).toBeDefined();
    const advanced = simulate(circuit, {
      simulationState: first.simulationState,
      deltaSeconds: 3600,
    });
    const trip = advanced.simulationEvents?.find((event) => event.type === 'protection-trip');
    expect(trip).toBeDefined();
    if (trip?.type === 'protection-trip') {
      expect(trip.reason).toBe('overload');
      expect(trip.atSeconds).toBeGreaterThan(60);
      expect(trip.atSeconds).toBeLessThan(600);
    }
    expect(advanced.protectionContactStates?.control).toBe(false);
    expect(Math.abs(advanced.componentCalculations?.lamp.currentAmps ?? 0)).toBe(0);
  });

  it('trips instantaneously on a short-circuit-level overcurrent', () => {
    const circuit = protectionCircuit('mcb', 0.5);
    const result = simulate(circuit, { deltaSeconds: 1 });
    const trip = result.simulationEvents?.find((event) => event.type === 'protection-trip');
    expect(trip?.type).toBe('protection-trip');
    if (trip?.type === 'protection-trip') {
      expect(trip.reason).toBe('short-circuit');
      expect(trip.atSeconds).toBe(0);
    }
  });

  it('melts a fuse on its declared I2t budget', () => {
    const circuit = protectionCircuit('fuse', 1);
    const result = simulate(circuit, { deltaSeconds: 30 });
    const trip = result.simulationEvents?.find((event) => event.type === 'fuse-operated');
    expect(trip?.type).toBe('fuse-operated');
    if (trip?.type === 'fuse-operated') {
      expect(['overload', 'short-circuit']).toContain(trip.reason);
      expect(trip.atSeconds).toBeLessThan(30);
    }
    expect(result.protectionContactStates?.control).toBe(false);
  });

  it('balances a two-pole RCBO and trips it overcurrent', () => {
    const balanced = simulate(rcboCircuit(32, 30), { deltaSeconds: 1 });
    expect(balanced.electrical?.status).toBe('converged');
    expect(balanced.simulationEvents?.length ?? 0).toBe(0);
    const trip = simulate(rcboCircuit(1, 30), { deltaSeconds: 60 });
    expect(trip.simulationEvents?.some((event) => event.type === 'protection-trip')).toBe(true);
  });

  it('trips a residual device on an unbalanced pole pair and not on a balanced pair', () => {
    const leaking = simulate(rcdLeakingCircuit(), { deltaSeconds: 1 });
    const event = leaking.simulationEvents?.find((event) => event.type === 'protection-trip');
    expect(event).toBeDefined();
    if (event?.type === 'protection-trip') {
      expect(event.reason).toBe('residual');
      expect(event.atSeconds).toBeCloseTo(0.04, 5);
      expect(event.residualMilliamps).toBeGreaterThan(30);
    }
    const balanced = simulate(rcdBalancedCircuit(), { deltaSeconds: 1 });
    expect(balanced.simulationEvents?.length ?? 0).toBe(0);
  });

  it('latches the trip until the protected device is switched off, and resets without state', () => {
    const tripped = simulate(protectionCircuit('mcb', 1), { deltaSeconds: 3600 });
    expect(tripped.simulationState?.protection?.control?.tripped).toBe(true);
    const reset = simulate(protectionCircuit('mcb', 1));
    expect(reset.simulationState?.protection?.control?.tripped).toBe(false);
  });

  it('replays deterministically and rejects a foreign protection state', () => {
    const circuit = protectionCircuit('fuse', 1);
    const a = simulate(circuit, { deltaSeconds: 30 });
    const b = simulate(circuit, { deltaSeconds: 30 });
    expect(a.simulationState).toEqual(b.simulationState);
    const other = simulate(circuit, { simulationState: a.simulationState, deltaSeconds: 1 });
    expect(other.simulationState?.elapsedSeconds).toBe(31);
    const foreign = simulate(circuit, {
      simulationState: { ...a.simulationState!, configurationKey: 'x' },
      deltaSeconds: 1,
    });
    expect(foreign.electrical?.status).toBe('invalid');
  });

  it('persists the protection model field through export/import', () => {
    const circuit = rcdLeakingCircuit();
    const restored = importJSON(exportJSON(circuit)) as typeof circuit;
    expect(restored.components[1]?.state.protectionModel).toEqual(
      circuit.components[1]?.state.protectionModel,
    );
  });

  it('is identical for basic and Pro modes', () => {
    const circuit = protectionCircuit('fuse', 1);
    const pro = simulate(circuit, { appMode: 'pro', deltaSeconds: 30 });
    const basic = simulate(circuit, { appMode: 'basic', deltaSeconds: 30 });
    expect(pro.simulationState).toEqual(basic.simulationState);
  });
});
