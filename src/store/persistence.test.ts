/**
 * persistence.test.ts — Phase 6 IndexedDB autosave round-trip.
 *
 * jsdom doesn't ship a real IndexedDB. We mock `idb-keyval` with an
 * in-memory map so the assertions stay fast and deterministic. The
 * production code path (real IDB) is exercised manually + via Playwright.
 */

import { set } from 'idb-keyval';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = new Map<IDBValidKey, unknown>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mem.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (value === undefined) mem.delete(key);
    else mem.set(key, value);
  }),
}));

import type { Circuit } from '@electrasim/domain';
import { explicitSupplyProfile } from '@electrasim/domain/core/supplies';
import { useCircuitStore } from './circuitStore';
import {
  __STORAGE_KEY,
  clearPersistedCircuit,
  hydrateCircuit,
  persistCircuit,
  startAutosave,
} from './persistence';

const mockedSet = vi.mocked(set);
const writeToMemory = async (key: IDBValidKey, value: unknown) => {
  if (value === undefined) mem.delete(key);
  else mem.set(key, value);
};

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const tinyCircuit: Circuit = {
  components: [
    { id: 'L1', type: 'live-terminal', x: 100, y: 100, state: {} },
    { id: 'B1', type: 'bulb', x: 200, y: 100, state: {} },
  ],
  wires: [
    {
      id: 'w-1',
      fromComponentId: 'L1',
      fromPortIndex: 0,
      toComponentId: 'B1',
      toPortIndex: 0,
      controlPoints: [],
    },
  ],
};

describe('persistence — Phase 6 IndexedDB autosave', () => {
  beforeEach(async () => {
    mockedSet.mockImplementation(writeToMemory);
    mem.clear();
    await clearPersistedCircuit();
  });

  it('hydrate returns false and leaves the seed in place when nothing is stored', async () => {
    const before = useCircuitStore.getState().components.length;
    const ok = await hydrateCircuit();
    expect(ok).toBe(false);
    expect(useCircuitStore.getState().components.length).toBe(before);
  });

  it('hydrate restores a previously saved circuit', async () => {
    mem.set(__STORAGE_KEY, {
      version: 1,
      savedAt: 1,
      circuit: tinyCircuit,
    });
    const ok = await hydrateCircuit();
    expect(ok).toBe(true);
    expect(useCircuitStore.getState().components).toHaveLength(2);
    expect(useCircuitStore.getState().wires).toHaveLength(1);
  });

  it('rejects payloads with the wrong schema version', async () => {
    mem.set(__STORAGE_KEY, { version: 999, savedAt: 0, circuit: tinyCircuit });
    const ok = await hydrateCircuit();
    expect(ok).toBe(false);
  });

  it('rejects payloads with malformed components', async () => {
    useCircuitStore.getState().setCircuit(tinyCircuit);
    const before = useCircuitStore.getState().components;
    mem.set(__STORAGE_KEY, {
      version: 1,
      savedAt: 0,
      circuit: { components: [{ id: 1 }], wires: [] },
    });
    const ok = await hydrateCircuit();
    expect(ok).toBe(false);
    expect(useCircuitStore.getState().components).toBe(before);
  });

  it('rejects payloads with wires referencing missing components', async () => {
    mem.set(__STORAGE_KEY, {
      version: 1,
      savedAt: 0,
      circuit: {
        components: tinyCircuit.components,
        wires: [{ ...tinyCircuit.wires[0], toComponentId: 'missing' }],
      },
    });

    const ok = await hydrateCircuit();

    expect(ok).toBe(false);
  });

  it('normalizes legacy wires without control points', async () => {
    const legacyWire = {
      id: 'w-legacy',
      fromComponentId: 'L1',
      fromPortIndex: 0,
      toComponentId: 'B1',
      toPortIndex: 0,
    };
    mem.set(__STORAGE_KEY, {
      version: 1,
      savedAt: 0,
      circuit: { components: tinyCircuit.components, wires: [legacyWire] },
    });

    const ok = await hydrateCircuit();

    expect(ok).toBe(true);
    expect(useCircuitStore.getState().wires[0]?.controlPoints).toEqual([]);
  });

  it('sanitizes component state restored from IndexedDB', async () => {
    const unsafe = JSON.parse(
      '{"version":1,"savedAt":0,"circuit":{"components":[{"id":"L1","type":"live-terminal","x":100,"y":100,"state":{"__proto__":{"polluted":true},"constructor":{"bad":true}}}],"wires":[]}}',
    );
    mem.set(__STORAGE_KEY, unsafe);

    const ok = await hydrateCircuit();

    expect(ok).toBe(true);
    const state = useCircuitStore.getState().components[0]?.state as Record<string, unknown>;
    expect(Object.hasOwn(state, '__proto__')).toBe(false);
    expect(Object.hasOwn(state, 'constructor')).toBe(false);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('autosave writes (debounced) when the graph mutates', async () => {
    useCircuitStore.getState().setCircuit(tinyCircuit);
    const stop = startAutosave();
    useCircuitStore.getState().moveComponent('B1', 250, 150);

    // Debounce is 250 ms; allow a margin.
    await wait(350);

    const saved = mem.get(__STORAGE_KEY) as { version: number; circuit: Circuit } | undefined;
    expect(saved).toBeDefined();
    expect(saved?.version).toBe(2);
    const moved = saved?.circuit.components.find((c) => c.id === 'B1');
    expect(moved?.x).toBe(250);
    expect(moved?.y).toBe(150);

    stop();
  });

  it('persists an imported circuit immediately', async () => {
    await expect(persistCircuit(tinyCircuit)).resolves.toBe(true);

    const saved = mem.get(__STORAGE_KEY) as { circuit: Circuit } | undefined;
    expect(saved?.circuit).toEqual({
      ...tinyCircuit,
      supply: expect.objectContaining({
        model: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
      }),
    });
  });

  it('autosaves and hydrates the global supply voltage', async () => {
    useCircuitStore.getState().setCircuit({ ...tinyCircuit, globalVoltage: 120 });
    const stop = startAutosave();

    useCircuitStore.getState().setGlobalSupplyVoltage(110);
    await wait(350);

    const saved = mem.get(__STORAGE_KEY) as { circuit: Circuit } | undefined;
    expect(saved?.circuit.globalVoltage).toBe(110);

    useCircuitStore.getState().setCircuit(tinyCircuit);
    expect(useCircuitStore.getState().globalVoltage).toBe(230);
    await expect(hydrateCircuit()).resolves.toBe(true);
    expect(useCircuitStore.getState().globalVoltage).toBe(110);
    stop();
  });

  it('autosaves supply-only revisions in the existing key and restores frequency and independent sources', async () => {
    const supply = explicitSupplyProfile({
      kind: 'ac-single-phase',
      voltage: 230,
      frequencyHz: 60,
    });
    const battery = {
      id: 'dc',
      type: 'dc-battery-12v',
      x: 0,
      y: 0,
      state: { sourceProfile: explicitSupplyProfile({ kind: 'dc', voltage: 48 }) },
    };
    useCircuitStore
      .getState()
      .setCircuit({ ...tinyCircuit, components: [...tinyCircuit.components, battery] });
    const stop = startAutosave();
    useCircuitStore.setState({ supply });
    await wait(350);
    const saved = mem.get(__STORAGE_KEY) as { version: number; circuit: Circuit };
    expect(__STORAGE_KEY).toBe('electrasim:circuit:v1');
    expect(saved.version).toBe(2);
    expect(saved.circuit.supply).toEqual(supply);
    stop();
    useCircuitStore.getState().setCircuit({ components: [], wires: [] });
    await expect(hydrateCircuit()).resolves.toBe(true);
    expect(useCircuitStore.getState().supply).toEqual(supply);
    expect(useCircuitStore.getState().components.find((c) => c.id === 'dc')).toEqual(battery);
  });

  it('reports an immediate persistence failure without rejecting', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockedSet.mockRejectedValueOnce(new Error('storage unavailable'));

    await expect(persistCircuit(tinyCircuit)).resolves.toBe(false);

    expect(mem.has(__STORAGE_KEY)).toBe(false);
    expect(warning).toHaveBeenCalledWith('[persistence] save failed:', 'storage unavailable');
    warning.mockRestore();
  });

  it('logs an autosave failure without surfacing a rejected promise', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockedSet.mockRejectedValueOnce(new Error('autosave unavailable'));
    useCircuitStore.getState().setCircuit(tinyCircuit);
    const stop = startAutosave();

    useCircuitStore.getState().moveComponent('B1', 260, 160);
    await wait(350);

    expect(warning).toHaveBeenCalledWith('[persistence] save failed:', 'autosave unavailable');
    stop();
    warning.mockRestore();
  });

  it('flushes a pending graph change on pagehide', async () => {
    useCircuitStore.getState().setCircuit(tinyCircuit);
    const stop = startAutosave();
    useCircuitStore.getState().moveComponent('B1', 275, 175);

    window.dispatchEvent(new Event('pagehide'));
    await wait(0);

    const saved = mem.get(__STORAGE_KEY) as { circuit: Circuit } | undefined;
    const moved = saved?.circuit.components.find((component) => component.id === 'B1');
    expect(moved).toMatchObject({ x: 275, y: 175 });
    stop();
  });

  it('autosave does NOT fire on selection-only changes', async () => {
    useCircuitStore.getState().setCircuit(tinyCircuit);
    const stop = startAutosave();
    mem.delete(__STORAGE_KEY);

    useCircuitStore.getState().selectComponent('B1');
    await wait(350);

    expect(mem.has(__STORAGE_KEY)).toBe(false);
    stop();
  });

  it('persists component variant type changes and technical parameters to IndexedDB and restores on reload', async () => {
    useCircuitStore.getState().setCircuit(tinyCircuit);
    const stop = startAutosave();

    // Change variant B1 from default 'bulb' to 'bulb-incandescent' (60W)
    useCircuitStore.getState().updateComponentType('B1', 'bulb-incandescent');

    await wait(350);

    // Verify persisted payload in mock IndexedDB
    const saved = mem.get(__STORAGE_KEY) as { circuit: Circuit } | undefined;
    expect(saved).toBeDefined();
    const updatedComp = saved?.circuit.components.find((c) => c.id === 'B1');
    expect(updatedComp?.type).toBe('bulb-incandescent');
    expect(updatedComp?.state.customPowerWatts).toBe(60);

    // Test hydration (simulate page reload)
    useCircuitStore.getState().setCircuit({ components: [], wires: [] });
    const ok = await hydrateCircuit();

    expect(ok).toBe(true);
    const restoredComp = useCircuitStore.getState().components.find((c) => c.id === 'B1');
    expect(restoredComp?.type).toBe('bulb-incandescent');
    expect(restoredComp?.state.customPowerWatts).toBe(60);

    stop();
  });
});
