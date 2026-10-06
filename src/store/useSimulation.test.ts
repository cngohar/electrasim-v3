import type { Circuit, SimulationResult } from '@electrasim/domain';
import { explicitSupplyProfile } from '@electrasim/domain/core/supplies';
import { simulate } from '@electrasim/domain/simulation';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { controlCircuit } from '../../packages/domain/src/core/controlFixtures';
import { damageCircuit } from '../../packages/domain/src/core/damageFixtures';
import { protectionCircuit } from '../../packages/domain/src/core/protectionFixtures';
import { component, protectedLoad } from '../../packages/domain/src/simulation/auditFixtures';

const { simulateAsync } = vi.hoisted(() => ({
  simulateAsync: vi.fn(),
}));

vi.mock('../sim-worker/client', () => ({ simulateAsync }));

import { useCircuitStore } from './circuitStore';
import { useDiagnosisStore } from './diagnosisStore';
import { useUiStore } from './uiStore';
import { useSimulation } from './useSimulation';

const RUNNABLE_CIRCUIT: Circuit = protectedLoad('mcb', 60, 16);

function resultFor(id: string): SimulationResult {
  return {
    energizedComponents: new Set([id]),
    energizedWires: new Set(),
    errorComponents: new Set(),
    errorWires: new Set(),
    errors: [],
    warnings: [],
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('useSimulation request sequencing', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    simulateAsync.mockReset();
    useCircuitStore.getState().setCircuit(RUNNABLE_CIRCUIT);
    useUiStore.setState({ simRunning: false, simResult: null, logs: [] });
    useDiagnosisStore.setState({ status: 'idle' });
  });

  afterEach(() => {
    act(() => useUiStore.getState().setSimRunning(false));
    vi.useRealTimers();
  });

  it('advances explicit control steps and resets all transient time on Stop/Run', async () => {
    simulateAsync.mockImplementation(async (circuit, options) => simulate(circuit, options));
    useCircuitStore.getState().setCircuit(controlCircuit({ onDelaySeconds: 0.2 }));
    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    expect(useUiStore.getState().simResult?.simulationState?.elapsedSeconds).toBe(0);
    expect(useUiStore.getState().simResult?.coilStates?.relay).toBe(false);
    for (let i = 0; i < 2; i++) {
      await act(async () => vi.advanceTimersByTime(100));
      await act(async () => vi.advanceTimersByTime(1));
    }
    expect(useUiStore.getState().simResult?.simulationState?.elapsedSeconds).toBe(0.2);
    expect(useUiStore.getState().simResult?.coilStates?.relay).toBe(true);
    expect(useCircuitStore.getState().components.find((c) => c.id === 'relay')?.state.on).toBe(
      false,
    );
    act(() => useUiStore.getState().setSimRunning(false));
    await act(async () => vi.advanceTimersByTime(1000));
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    expect(useUiStore.getState().simResult?.simulationState?.elapsedSeconds).toBe(0);
    expect(useUiStore.getState().simResult?.coilStates?.relay).toBe(false);
  });

  it('does not advance accepted time from a stale in-flight clock reply', async () => {
    const stale = deferred<SimulationResult>();
    simulateAsync.mockImplementation(async (circuit, options) => simulate(circuit, options));
    const circuit = controlCircuit({ onDelaySeconds: 0.1 });
    useCircuitStore.getState().setCircuit(circuit);
    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    const initial = useUiStore.getState().simResult!;
    simulateAsync.mockReturnValueOnce(stale.promise);
    await act(async () => vi.advanceTimersByTime(100));
    await act(async () => vi.advanceTimersByTime(1));
    act(() => useCircuitStore.getState().toggleSwitch('switch'));
    await act(async () => {
      stale.resolve(
        simulate(circuit, { simulationState: initial.simulationState, deltaSeconds: 0.1 }),
      );
      await stale.promise;
    });
    expect(useUiStore.getState().simResult).toBeNull();
    await act(async () => vi.advanceTimersByTime(50));
    expect(useUiStore.getState().simResult?.simulationState?.elapsedSeconds).toBe(0);
    expect(useUiStore.getState().simResult?.simulationState?.pending).toEqual({});
    expect(useUiStore.getState().simResult?.coilStates?.relay).toBe(false);
  });

  it('projects cable damage once, retains it across Stop/Run, and replaces it explicitly', async () => {
    simulateAsync.mockImplementation(async (circuit, options) => simulate(circuit, options));
    useCircuitStore.getState().setCircuit(damageCircuit());
    useUiStore.setState({ eventHistory: [] });
    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    for (let i = 0; i < 16; i++) await act(async () => vi.advanceTimersByTime(150));
    expect(useCircuitStore.getState().wires.find((w) => w.id === 'load-feed')?.isBusted).toBe(true);
    expect(useUiStore.getState().simRunning).toBe(true);
    expect(
      useUiStore.getState().eventHistory.filter((e) => e.eventType === 'wire_melted'),
    ).toHaveLength(1);
    act(() => useUiStore.getState().setSimRunning(false));
    await act(async () => vi.advanceTimersByTime(1));
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    expect(useUiStore.getState().simRunning).toBe(false);
    expect(useUiStore.getState().faultAlert?.title).toContain('UNRESOLVED');
    expect(useCircuitStore.getState().wires.find((w) => w.id === 'load-feed')?.isBusted).toBe(true);
    act(() => useUiStore.getState().setSimRunning(false));
    await act(async () => {
      await useCircuitStore.getState().setWireBusted('load-feed', false);
    });
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    expect(
      useUiStore.getState().simResult?.componentCalculations?.lamp?.powerWatts,
    ).toBeGreaterThan(990);
  });

  it('keeps fault injection and clearing on one timed run and resets a trip without destruction', async () => {
    simulateAsync.mockImplementation(async (circuit, options) => simulate(circuit, options));
    useCircuitStore.getState().setCircuit(protectionCircuit('mcb', 16));
    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    await act(async () => vi.advanceTimersByTime(100));
    const time = useUiStore.getState().simResult!.simulationState!.elapsedSeconds;
    await act(async () => {
      await useCircuitStore.getState().setComponentFault('lamp', 'short-circuit');
    });
    await act(async () => vi.advanceTimersByTime(50));
    expect(useUiStore.getState().simRunning).toBe(true);
    expect(useUiStore.getState().simResult?.simulationState?.elapsedSeconds).toBe(time);
    expect(useUiStore.getState().simResult?.protectionContactStates?.control).toBe(false);
    expect(
      useCircuitStore.getState().components.some((c) => c.state.isBlown || c.state.isTripped),
    ).toBe(false);
    await act(async () => {
      await useCircuitStore.getState().clearAllFaults();
    });
    await act(async () => vi.advanceTimersByTime(50));
    expect(useUiStore.getState().simResult?.simulationState?.protection.control?.tripped).toBe(
      true,
    );
    await act(async () => {
      await useCircuitStore.getState().resetTrippedComponent('control');
    });
    await act(async () => vi.advanceTimersByTime(50));
    act(() => useCircuitStore.getState().updateComponentState('control', { on: true }));
    await act(async () => vi.advanceTimersByTime(50));
    expect(
      useUiStore.getState().simResult?.componentCalculations?.lamp?.powerWatts,
    ).toBeGreaterThan(990);
    expect(useUiStore.getState().simResult?.faultsCleared).toBe(true);
  });

  it('clears a published result for a supply-only revision received at the worker boundary', async () => {
    const pending = deferred<SimulationResult>();
    simulateAsync.mockResolvedValueOnce(resultFor('previous')).mockReturnValueOnce(pending.promise);

    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    await act(async () => Promise.resolve());
    expect(useUiStore.getState().simResult?.energizedComponents).toEqual(new Set(['previous']));

    // Public supply edits are locked while running. Exercise a revision arriving
    // at the transport boundary without changing component/wire array identities.
    const supply = explicitSupplyProfile({
      kind: 'ac-single-phase',
      voltage: 230,
      frequencyHz: 60,
    });
    act(() => useCircuitStore.setState({ supply }));

    expect(useUiStore.getState().simResult).toBeNull();
    await act(async () => vi.advanceTimersByTime(50));
    expect(simulateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ globalVoltage: 230, supply }),
      { appMode: 'pro', standard: 'int' },
    );
  });

  it('invalidates an in-flight result before the replacement debounce fires', async () => {
    const stale = deferred<SimulationResult>();
    const current = deferred<SimulationResult>();
    simulateAsync.mockReturnValueOnce(stale.promise).mockReturnValueOnce(current.promise);

    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    expect(simulateAsync).toHaveBeenCalledTimes(1);

    act(() => {
      useCircuitStore.getState().setCircuit({
        components: [{ id: 'new-input', type: 'bulb', x: 0, y: 0, state: {} }],
        wires: [],
      });
    });

    await act(async () => {
      stale.resolve(resultFor('stale'));
      await stale.promise;
    });
    expect(useUiStore.getState().simResult).toBeNull();

    await act(async () => vi.advanceTimersByTime(50));
    expect(simulateAsync).toHaveBeenCalledTimes(2);

    await act(async () => {
      current.resolve(resultFor('current'));
      await current.promise;
    });
    expect(useUiStore.getState().simResult?.energizedComponents).toEqual(new Set(['current']));
  });

  it('stops simulation immediately when a manual fault is injected', async () => {
    useCircuitStore.getState().setCircuit({
      components: [{ id: 'bulb-1', type: 'bulb', x: 0, y: 0, state: {} }],
      wires: [],
    });
    useCircuitStore.getState().setCircuit({
      ...RUNNABLE_CIRCUIT,
      components: [...RUNNABLE_CIRCUIT.components, component('bulb-1', 'bulb')],
    });

    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    expect(useUiStore.getState().simRunning).toBe(true);

    act(() => {
      useCircuitStore.getState().setComponentFault('bulb-1', 'short-circuit');
    });

    expect(useUiStore.getState().simRunning).toBe(false);
  });
  it('withholds fault-narration log lines while a Diagnosis exercise is active (plan §14)', async () => {
    // The simulator narrates the injected fault by name. During a Diagnosis
    // exercise that is the answer under test, so it must not reach the console
    // — while the consequence messages around it still must.
    const narrated: SimulationResult = {
      ...resultFor('bulb-1'),
      errors: [
        'Cartridge Fuse (13A) TRIPPED: bolted short circuit — cleared in <0.1 s.',
        'TERMINAL DISCONNECT: Loose terminal screw on Push Button port!',
      ],
      warnings: ['BREAKER JAMMED OPEN: Device mechanism locked in open state.'],
      // index 1 of errors, index 0 of warnings name the fault outright
      faultNarrationErrors: [1],
      faultNarrationWarnings: [0],
    };
    simulateAsync.mockResolvedValue(narrated);
    useDiagnosisStore.setState({ status: 'active' });

    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    await act(async () => Promise.resolve());

    const messages = useUiStore.getState().logs.map((l) => l.message);
    expect(messages.some((m) => m.includes('TERMINAL DISCONNECT'))).toBe(false);
    expect(messages.some((m) => m.includes('BREAKER JAMMED OPEN'))).toBe(false);
    // The observable consequence is still reported.
    expect(messages.some((m) => m.includes('TRIPPED'))).toBe(true);
  });

  it('still reports fault narration when no Diagnosis is active (negative control)', async () => {
    const narrated: SimulationResult = {
      ...resultFor('bulb-1'),
      errors: ['TERMINAL DISCONNECT: Loose terminal screw on Push Button port!'],
      warnings: ['BREAKER JAMMED OPEN: Device mechanism locked in open state.'],
      faultNarrationErrors: [0],
      faultNarrationWarnings: [0],
    };
    simulateAsync.mockResolvedValue(narrated);
    useDiagnosisStore.setState({ status: 'idle' });

    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    await act(async () => Promise.resolve());

    const messages = useUiStore.getState().logs.map((l) => l.message);
    expect(messages.some((m) => m.includes('TERMINAL DISCONNECT'))).toBe(true);
    expect(messages.some((m) => m.includes('BREAKER JAMMED OPEN'))).toBe(true);
  });

  it('reports a solved B16 overload without persisting an unassessed trip or damage', async () => {
    // Only the transport is stubbed; use the real electrical engine and store projection.
    simulateAsync.mockImplementation(async (circuit) => simulate(circuit));
    useCircuitStore.getState().setCircuit(protectedLoad());
    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    await act(async () => Promise.resolve());
    const breaker = useCircuitStore.getState().components.find((c) => c.id === 'device');
    expect(breaker?.state.isTripped).not.toBe(true);
    expect(useUiStore.getState().simResult?.electrical?.deviceCurrents[0]?.trip).toBe(
      'not-assessed',
    );
    expect(breaker?.state.isBlown).not.toBe(true);
  });

  it('preserves a drawing and reports a real unsupported-model result without damage', async () => {
    const circuit = protectedLoad('mcb', 9);
    circuit.components.push(component('transformer', 'transformer-12v'));
    simulateAsync.mockImplementation(async (input) => simulate(input));
    useCircuitStore.getState().setCircuit(circuit);
    const original = JSON.stringify(useCircuitStore.getState().components);
    renderHook(() => useSimulation());
    // Exercise the result boundary directly, independently of the Pro validation preflight.
    act(() => useUiStore.setState({ simRunning: true }));
    await act(async () => vi.advanceTimersByTime(50));
    await act(async () => Promise.resolve());
    expect(JSON.stringify(useCircuitStore.getState().components)).toBe(original);
    expect(useUiStore.getState().simResult?.electrical?.status).toBe('nonconverged');
    expect(useUiStore.getState().simResult?.legacyObservation).toBeUndefined();
    expect(useUiStore.getState().simResult?.componentCalculations).toBeUndefined();
    expect(useUiStore.getState().logs.some((l) => l.message.includes('not assessed'))).toBe(true);
  });
});
