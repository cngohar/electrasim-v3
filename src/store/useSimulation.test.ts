import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Circuit, SimulationResult } from '../domain';

const { simulateAsync } = vi.hoisted(() => ({
  simulateAsync: vi.fn(),
}));

vi.mock('../sim-worker/client', () => ({ simulateAsync }));

import { useCircuitStore } from './circuitStore';
import { useDiagnosisStore } from './diagnosisStore';
import { useUiStore } from './uiStore';
import { useSimulation } from './useSimulation';

const EMPTY_CIRCUIT: Circuit = { components: [], wires: [] };

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
    useCircuitStore.getState().setCircuit(EMPTY_CIRCUIT);
    useUiStore.setState({ simRunning: false, simResult: null, logs: [] });
    useDiagnosisStore.setState({ status: 'idle' });
  });

  afterEach(() => {
    act(() => useUiStore.getState().setSimRunning(false));
    vi.useRealTimers();
  });

  it('clears a published result as soon as simulation inputs change', async () => {
    const pending = deferred<SimulationResult>();
    simulateAsync.mockResolvedValueOnce(resultFor('previous')).mockReturnValueOnce(pending.promise);

    renderHook(() => useSimulation());
    act(() => useUiStore.getState().setSimRunning(true));
    await act(async () => vi.advanceTimersByTime(50));
    await act(async () => Promise.resolve());
    expect(useUiStore.getState().simResult?.energizedComponents).toEqual(new Set(['previous']));

    act(() => useCircuitStore.getState().setGlobalSupplyVoltage(120));

    expect(useUiStore.getState().simResult).toBeNull();
    await act(async () => vi.advanceTimersByTime(50));
    expect(simulateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({ globalVoltage: 120 }),
      { appMode: 'basic', standard: 'int' },
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
        '⚡ Cartridge Fuse (13A) TRIPPED: bolted short circuit — cleared in <0.1 s.',
        '🔧 TERMINAL DISCONNECT: Loose terminal screw on Push Button port!',
      ],
      warnings: ['🔒 BREAKER JAMMED OPEN: Device mechanism locked in open state.'],
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
      errors: ['🔧 TERMINAL DISCONNECT: Loose terminal screw on Push Button port!'],
      warnings: ['🔒 BREAKER JAMMED OPEN: Device mechanism locked in open state.'],
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
});
