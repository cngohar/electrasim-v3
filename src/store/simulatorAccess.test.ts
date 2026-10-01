import { COMPONENT_DEFS, type Circuit, createInjectedFault } from '@electrasim/domain';
import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { releaseMomentarySwitches, setMomentarySwitchState } from './circuitActions';
import { basicCopy } from './circuitRecovery';
import { clearHistory, redo, undo, useCircuitStore } from './circuitStore';
import { authorizeCircuit, invalidateAccess, useSimulatorAccess } from './simulatorAccess';
import { useUiStore } from './uiStore';
const type = Object.keys(COMPONENT_DEFS).find((key) => COMPONENT_DEFS[key].tier === 'pro')!;
const basic: Circuit = {
  components: [{ id: 'lamp', type: 'bulb', x: 0, y: 0, state: {} }],
  wires: [],
  globalVoltage: 120,
};
const premium: Circuit = {
  ...basic,
  components: [...basic.components, { id: 'premium', type, x: 200, y: 0, state: {} }],
};
const capabilities = ['pro_components', 'advanced_faults', 'advanced_diagnostics'];
const fetcher = vi.fn();
const response = (ok: boolean) =>
  new Response(
    JSON.stringify(
      ok ? { userId: 'paid', capabilities, nextChangeAt: null } : { error: 'Membership required' },
    ),
    { status: ok ? 200 : 403 },
  );
async function settled() {
  await vi.waitFor(() => expect(useSimulatorAccess.getState().pending).toBe(0));
}
beforeEach(() => {
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockReset().mockImplementation(async () => response(true));
  invalidateAccess();
  useSimulatorAccess.setState({
    exercise: null,
    userId: 'paid',
    capabilities: capabilities as 'pro_components'[],
    message: null,
  });
  useUiStore.setState({ simRunning: false });
  useCircuitStore.getState().setCircuit(basic);
  clearHistory();
});
afterEach(() => vi.unstubAllGlobals());
describe('editor authorization boundary', () => {
  it('cancels a delayed paid press when its pointer has already been released', async () => {
    useCircuitStore.getState().setCircuit({
      ...premium,
      components: [
        ...premium.components,
        { id: 'push', type: 'push-button', x: 0, y: 0, state: { on: false } },
      ],
    });
    let finish!: (response: Response) => void;
    fetcher.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    setMomentarySwitchState('push', true);
    releaseMomentarySwitches();
    finish(response(true));
    await settled();
    expect(useCircuitStore.getState().components.find((c) => c.id === 'push')?.state.on).toBe(
      false,
    );
  });

  it('keeps basic edits and one basic fault synchronous and offline', () => {
    fetcher.mockRejectedValue(new Error('offline'));
    useCircuitStore.getState().moveComponent('lamp', 40, 50);
    useCircuitStore.getState().setComponentFault('lamp', 'open-circuit');
    expect(useCircuitStore.getState().components[0].x).toBe(40);
    expect(useCircuitStore.getState().components[0].state.fault).toBe('open-circuit');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('does not trust cached access for placement, paste, injected faults or undo', async () => {
    fetcher.mockImplementation(async () => response(false));
    useCircuitStore.getState().addComponent(premium.components[1]);
    await settled();
    useCircuitStore.getState().pasteComponents([premium.components[1]], { x: 20, y: 20 });
    await settled();
    const faultId = await useCircuitStore
      .getState()
      .injectFault({ type: 'arc-fault', target: { type: 'component', id: 'lamp' } });
    expect(faultId).toBe('');
    expect(useCircuitStore.getState().components).toHaveLength(1);
    expect(useCircuitStore.getState().faults).toEqual([]);
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(0);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });
  it('opens premium imports unchanged, rejects revoked edits, and preserves backups in basic copies', async () => {
    const original = importJSON(
      exportJSON({
        ...premium,
        faults: [createInjectedFault('arc-fault', { type: 'component', id: 'lamp' })],
      }),
    );
    useCircuitStore.getState().setCircuit(original);
    clearHistory();
    fetcher.mockImplementation(async () => response(false));
    useCircuitStore.getState().removeComponent('premium');
    await settled();
    expect(useCircuitStore.getState().components).toEqual(original.components);
    const copy = basicCopy(original, ['premium'], [original.faults![0].id]);
    expect(copy.components).toHaveLength(1);
    expect(copy.faults).toEqual([]);
    expect(original.components).toHaveLength(2);
    expect(original.faults).toHaveLength(1);
    expect(() => basicCopy(original, [], [])).toThrow('Choose');
  });
  it('checks undo/redo afresh without consuming denied history', async () => {
    useCircuitStore.getState().addComponent(premium.components[1]);
    await settled();
    expect(useCircuitStore.getState().components).toHaveLength(2);
    const history = useCircuitStore.temporal.getState().pastStates;
    fetcher.mockImplementation(async () => response(false));
    undo();
    await settled();
    expect(useCircuitStore.temporal.getState().pastStates).toBe(history);
    fetcher.mockImplementation(async () => response(true));
    undo();
    await settled();
    expect(useCircuitStore.getState().components).toHaveLength(1);
    fetcher.mockImplementation(async () => response(false));
    redo();
    await settled();
    expect(useCircuitStore.getState().components).toHaveLength(1);
  });
  it('drops delayed edits when the document or session changes', async () => {
    let finish!: (response: Response) => void;
    fetcher.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    useCircuitStore.getState().addComponent(premium.components[1]);
    useCircuitStore.getState().moveComponent('lamp', 90, 90);
    finish(response(true));
    await settled();
    expect(useCircuitStore.getState().components).toHaveLength(1);
    const request = authorizeCircuit(premium);
    invalidateAccess();
    finish(response(true));
    await expect(request).rejects.toThrow('Session changed');
  });
});
