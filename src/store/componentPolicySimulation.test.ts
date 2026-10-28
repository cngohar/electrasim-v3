import type { Circuit, SimulationResult } from '@electrasim/domain/types';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { protectedLoad } from '../../packages/domain/src/simulation/auditFixtures';
import { authorizationFixture, policyFixture } from '../test/componentAccess';
const { simulateAsync } = vi.hoisted(() => ({ simulateAsync: vi.fn() }));
vi.mock('../sim-worker/client', () => ({ simulateAsync }));
import { useCircuitStore } from './circuitStore';
import { invalidateAccess, refreshComponentPolicy, useSimulatorAccess } from './simulatorAccess';
import { useUiStore } from './uiStore';
import { useSimulation } from './useSimulation';
const circuit: Circuit = protectedLoad('afdd', 60, 16);
let revision = 100;
let policy = policyFixture(revision, ['afdd']);
let capabilities: string[] = [];
let isOnline = true;
let resolve!: (value: SimulationResult) => void;
const result: SimulationResult = {
  energizedComponents: new Set(['load']),
  energizedWires: new Set(['feed']),
  errorComponents: new Set(),
  errorWires: new Set(),
  errors: [],
  warnings: [],
};
const fetcher = vi.fn();
beforeEach(async () => {
  vi.useFakeTimers();
  revision += 10;
  policy = policyFixture(revision, ['afdd']);
  capabilities = [];
  isOnline = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => isOnline);
  invalidateAccess();
  useSimulatorAccess.setState({ userId: null, capabilities: [], pending: 0, message: null });
  useUiStore.setState({ simRunning: false, simResult: null });
  useCircuitStore.getState().setCircuit(circuit);
  fetcher.mockReset().mockImplementation(async (input, init) => {
    if (String(input).endsWith('/catalog/component-access'))
      return new Response(JSON.stringify(policy));
    const { circuit: inputCircuit } = JSON.parse(String(init.body));
    if (
      policy.components.find((item) => item.id === 'afdd')!.access === 'pro' &&
      !capabilities.includes('pro_components')
    )
      return new Response(JSON.stringify({ error: 'Membership required' }), { status: 403 });
    return new Response(
      JSON.stringify(authorizationFixture(inputCircuit, capabilities, policy, null)),
    );
  });
  vi.stubGlobal('fetch', fetcher);
  await refreshComponentPolicy();
  simulateAsync.mockReset().mockImplementation(
    () =>
      new Promise<SimulationResult>((done) => {
        resolve = done;
      }),
  );
});
afterEach(() => {
  act(() => useUiStore.setState({ simRunning: false }));
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe('originally-Pro result publication', () => {
  it('discards a local result if the server downgrades formerly-Free access during computation', async () => {
    renderHook(() => useSimulation());
    act(() => useUiStore.setState({ simRunning: true }));
    await act(async () => vi.advanceTimersByTimeAsync(50));
    expect(simulateAsync).toHaveBeenCalledOnce();
    const original = useCircuitStore.getState().components;
    policy = policyFixture(++revision);
    await act(async () => {
      resolve(result);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(useUiStore.getState().simResult).toBeNull();
    expect(useUiStore.getState().simRunning).toBe(false);
    expect(useCircuitStore.getState().components).toBe(original);
    expect(
      fetcher.mock.calls.filter(([input]) => String(input).endsWith('/simulator/authorize')),
    ).toHaveLength(2);
  });
  it('drops a computed result when offline verification fails and preserves the drawing', async () => {
    renderHook(() => useSimulation());
    act(() => useUiStore.setState({ simRunning: true }));
    await act(async () => vi.advanceTimersByTimeAsync(50));
    const original = useCircuitStore.getState().components;
    isOnline = false;
    await act(async () => {
      resolve(result);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(useUiStore.getState().simResult).toBeNull();
    expect(useCircuitStore.getState().components).toBe(original);
  });
  it('rejects a policy cycle even when the access value is Free again at the final check', async () => {
    renderHook(() => useSimulation());
    act(() => useUiStore.setState({ simRunning: true }));
    await act(async () => vi.advanceTimersByTimeAsync(50));
    revision += 2;
    policy = policyFixture(revision, ['afdd']);
    const original = useCircuitStore.getState().components;
    await act(async () => {
      resolve(result);
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(useUiStore.getState().simResult).toBeNull();
    expect(useCircuitStore.getState().components).toBe(original);
  });
});
