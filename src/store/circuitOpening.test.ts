import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import type { Circuit } from '@electrasim/domain/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizationFixture, policyFixture } from '../test/componentAccess';
const storage = vi.hoisted(() => ({ values: new Map<string, string>(), set: vi.fn() }));
vi.mock('idb-keyval', () => ({
  set: (key: string, value: string) => storage.set(key, value),
  entries: async () => [...storage.values.entries()],
}));
import { openCircuitDocument, openImportedCircuit } from './circuitOpening';
import { basicCopy, recoveryCopies, saveRecovery } from './circuitRecovery';
import { useCircuitStore } from './circuitStore';
import { invalidateAccess, refreshComponentPolicy, useSimulatorAccess } from './simulatorAccess';
const basic: Circuit = importJSON(
  exportJSON({
    components: [{ id: 'lamp', type: 'bulb', x: 0, y: 0, state: {} }],
    wires: [],
  }),
);
const pro: Circuit = importJSON(
  exportJSON({
    ...basic,
    components: [...basic.components, { id: 'pro', type: 'afdd', x: 200, y: 0, state: {} }],
  }),
);
const fetcher = vi.fn();
beforeEach(() => {
  invalidateAccess();
  useSimulatorAccess.setState({ userId: null, message: null, pending: 0 });
  useCircuitStore.getState().setCircuit(basic);
  storage.values.clear();
  storage.set.mockReset().mockImplementation(async (key: string, value: string) => {
    storage.values.set(key, value);
  });
  vi.stubGlobal('fetch', fetcher);
  fetcher
    .mockReset()
    .mockResolvedValue(
      new Response(JSON.stringify({ error: 'Membership required' }), { status: 403 }),
    );
});
afterEach(() => vi.unstubAllGlobals());

describe('original drawings and recovery', () => {
  it('opens a denied Pro original unchanged for viewing and checks actual content', async () => {
    openCircuitDocument(pro);
    await vi.waitFor(() => expect(useSimulatorAccess.getState().pending).toBe(0));
    expect(useCircuitStore.getState().components).toEqual(importJSON(exportJSON(pro)).components);
    expect(JSON.parse(fetcher.mock.calls[0]![1].body).circuit.components).toEqual(pro.components);
  });
  it('backs up exact raw imported text before opening a read-only drawing', async () => {
    const raw = JSON.stringify({ version: 3, exportedAt: 123, circuit: pro }, null, 4);
    await openImportedCircuit(importJSON(raw), raw);
    await vi.waitFor(() => expect(useSimulatorAccess.getState().pending).toBe(0));
    expect((await recoveryCopies())[0]!.json).toBe(raw);
    expect(useCircuitStore.getState().components).toEqual(pro.components);
  });
  it('does not replace the current drawing if preserving the raw import fails', async () => {
    const before = useCircuitStore.getState().components;
    storage.set.mockRejectedValueOnce(new Error('Quota exceeded'));
    await expect(openImportedCircuit(pro, exportJSON(pro))).rejects.toThrow('Quota exceeded');
    expect(useCircuitStore.getState().components).toBe(before);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it.each(['session', 'document'])(
    'keeps a delayed imported original as a backup after the %s changes',
    async (kind) => {
      let finish!: () => void;
      storage.set.mockImplementationOnce(
        (key: string, value: string) =>
          new Promise<void>((done) => {
            finish = () => {
              storage.values.set(key, value);
              done();
            };
          }),
      );
      const raw = exportJSON(pro);
      const pending = openImportedCircuit(pro, raw);
      if (kind === 'session') invalidateAccess();
      else useCircuitStore.getState().moveComponent('lamp', 50, 60);
      const before = useCircuitStore.getState().components;
      finish();
      await expect(pending).rejects.toThrow('changed while reading');
      expect(useCircuitStore.getState().components).toBe(before);
      expect((await recoveryCopies())[0]!.json).toBe(raw);
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it('leaves Basic imports synchronous and usable without network or backup writes', async () => {
    const before = fetcher.mock.calls.length;
    const opening = openImportedCircuit(basic, exportJSON(basic));
    expect(useCircuitStore.getState().components).toEqual(basic.components);
    await opening;
    expect(storage.set).not.toHaveBeenCalled();
    expect(fetcher.mock.calls.length).toBe(before);
  });
  it('keeps an explicit Basic copy independent of a temporary Free override and preserves the original', async () => {
    const policy = policyFixture(1, ['afdd']);
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify(policy)));
    await refreshComponentPolicy();
    expect(() => basicCopy(pro, [], [])).toThrow('Choose');
    await saveRecovery(pro);
    const copy = basicCopy(pro, ['pro'], []);
    expect(copy.components.map((item) => item.type)).toEqual(['bulb']);
    const backup = (await recoveryCopies())[0]!;
    expect(importJSON(backup.json).components).toEqual(pro.components);
    fetcher.mockResolvedValueOnce(
      new Response(JSON.stringify(authorizationFixture(pro, [], policy, null))),
    );
    openCircuitDocument(importJSON(backup.json));
    await vi.waitFor(() => expect(useSimulatorAccess.getState().pending).toBe(0));
    expect(useCircuitStore.getState().components).toEqual(pro.components);
  });
});
