import { createInjectedFault, normalizeCircuitFaults } from '@electrasim/domain';
import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import { simulate } from '@electrasim/domain/simulation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { damageCircuit } from '../../packages/domain/src/core/damageFixtures';
import { protectionCircuit } from '../../packages/domain/src/core/protectionFixtures';
import { clearHistory, selectCircuit, undo, useCircuitStore } from './circuitStore';
import { invalidateAccess, useSimulatorAccess } from './simulatorAccess';
import { useUiStore } from './uiStore';

const document = () => selectCircuit(useCircuitStore.getState());
beforeEach(() => {
  invalidateAccess();
  useSimulatorAccess.setState({ exercise: null, userId: null, capabilities: [], message: null });
  useUiStore.setState({
    simRunning: false,
    simResult: null,
    diagnosisActive: false,
    challengeAttemptId: null,
  });
  useCircuitStore.getState().setCircuit(damageCircuit());
  clearHistory();
});

describe('Fault Lab damage replacement and reset boundaries', () => {
  it('clears an injected wire fault without silently replacing its damaged conductor', async () => {
    useCircuitStore.getState().setWireBusted('load-feed', true, 'Declared stress limit reached');
    await useCircuitStore.getState().setWireFault('load-feed', 'open-circuit');
    await useCircuitStore.getState().clearAllFaults();
    expect(document().faults).toEqual([]);
    expect(document().wires[1]!.isBusted).toBe(true);
    expect(simulate(document()).faultsCleared).toBe(false);
    const before = document();
    expect(await useCircuitStore.getState().setWireBusted('load-feed', false)).toBe(true);
    expect(document().wires[1]!.damageModel).toEqual(before.wires[1]!.damageModel);
    expect(simulate(document()).faultsCleared).toBe(true);
    undo();
    expect(document().wires[1]!.isBusted).toBe(true);
  });

  it('replacement preserves explicit and legacy faults, and fixes no unassessed operating result', async () => {
    const circuit = damageCircuit('device-current');
    circuit.components[2]!.state.isBlown = true;
    circuit.wires[1]!.isBusted = true;
    circuit.wires[1]!.fault = 'open-circuit';
    circuit.faults = [createInjectedFault('open-circuit', { type: 'wire', id: 'load-feed' })];
    useCircuitStore.getState().setCircuit(circuit);
    const before = document();
    expect(await useCircuitStore.getState().repairAllFaults()).toBe(true);
    const repaired = document();
    expect(repaired.faults).toEqual(before.faults);
    expect(repaired.wires[1]!.fault).toBe('open-circuit');
    expect(repaired.components[2]!.state.damageModel).toEqual(
      before.components[2]!.state.damageModel,
    );
    expect(repaired.supply).toEqual(before.supply);
    expect(repaired.components[2]!.state.isBlown).toBe(false);
    expect(simulate(repaired).faultsCleared).toBe(false);
    expect(importJSON(exportJSON(repaired)).wires[1]!.fault).toBe('open-circuit');
  });

  it('blocks replacement and damage configuration changes during a running simulation', async () => {
    const circuit = damageCircuit('device-current');
    circuit.components[2]!.state.isBlown = true;
    circuit.wires[1]!.isBusted = true;
    useCircuitStore.getState().setCircuit(circuit);
    const before = document();
    useUiStore.setState({ simRunning: true });
    expect(await useCircuitStore.getState().repairAllFaults()).toBe(false);
    expect(await useCircuitStore.getState().repairBlownComponent('lamp')).toBe(false);
    expect(await useCircuitStore.getState().setWireBusted('load-feed', false)).toBe(false);
    useCircuitStore.getState().updateComponentState('lamp', { damageModel: undefined });
    useCircuitStore
      .getState()
      .updateWireProperties('load-feed', { damageModel: damageCircuit().wires[1]!.damageModel });
    expect(document()).toEqual(before);
    useUiStore.setState({ simRunning: false });
  });

  it('removes a restored legacy fault by its visible Fault Lab ID', async () => {
    const circuit = damageCircuit();
    circuit.components[2]!.state.fault = 'open-circuit';
    useCircuitStore.getState().setCircuit(circuit);
    const fault = normalizeCircuitFaults(document())[0]!;
    await useCircuitStore.getState().removeFault(fault.id);
    expect(normalizeCircuitFaults(document())).toEqual([]);
    expect(document().components[2]!.state.fault).toBeUndefined();
  });

  it('preserves a timed run while injecting or clearing a fault, including an in-flight result', async () => {
    useUiStore.setState({ simRunning: true, simResult: null });
    await useCircuitStore.getState().setComponentFault('lamp', 'open-circuit');
    expect(useUiStore.getState().simRunning).toBe(true);
    await useCircuitStore.getState().clearAllFaults();
    expect(useUiStore.getState().simRunning).toBe(true);
    useUiStore.setState({ simRunning: false });
  });

  it('resetting a breaker selects OFF but never replaces a fuse', async () => {
    const breaker = protectionCircuit('mcb', 1);
    useCircuitStore.getState().setCircuit(breaker);
    await useCircuitStore.getState().resetTrippedComponent('control');
    expect(document().components[1]!.state.on).toBe(false);
    const fuse = protectionCircuit('fuse', 1);
    fuse.components[1]!.state.isBlown = true;
    useCircuitStore.getState().setCircuit(fuse);
    await useCircuitStore.getState().resetAllTrippedComponents();
    expect(document().components[1]!.state.isBlown).toBe(true);
  });

  it('cannot replace paid document damage after membership authorization is denied', async () => {
    const circuit = damageCircuit();
    circuit.components.push({ id: 'paid', type: 'digital-weekly-timer', x: 0, y: 0, state: {} });
    circuit.wires[1]!.isBusted = true;
    useCircuitStore.getState().setCircuit(circuit);
    const before = document();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response(JSON.stringify({ error: 'Membership required' }), { status: 403 }),
      ),
    );
    try {
      expect(await useCircuitStore.getState().repairAllFaults()).toBe(false);
      expect(document()).toEqual(before);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
