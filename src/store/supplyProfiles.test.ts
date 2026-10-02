import type { Circuit } from '@electrasim/domain';
import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import { explicitSupplyProfile } from '@electrasim/domain/core/supplies';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { component as C, wire as W } from '../../packages/domain/src/simulation/auditFixtures';
import { clearHistory, redo, selectCircuit, undo, useCircuitStore } from './circuitStore';
import { invalidateAccess, useSimulatorAccess } from './simulatorAccess';
import { useUiStore } from './uiStore';

const ac60 = explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 60 });
const fixture = (): Circuit => ({
  supply: ac60,
  globalVoltage: 230,
  components: [
    C('l', 'live-terminal'),
    C('n', 'neutral-terminal'),
    C('pe', 'earth-terminal'),
    C('heater', 'space-heater', { customVoltage: 230, customPowerWatts: 2000 }),
    C('independent', 'ac-mains-supply', { customVoltage: 120 }),
    C('switch', 'single-way-switch', { on: true }),
  ],
  wires: [W('feed', 'l', 0, 'heater', 0), W('return', 'heater', 1, 'n', 0)],
  faults: [
    {
      id: 'open',
      type: 'open-circuit',
      category: 'conductor',
      target: { type: 'wire', id: 'feed' },
      createdAt: 0,
    },
  ],
});

beforeEach(() => {
  invalidateAccess();
  useSimulatorAccess.setState({ exercise: null, userId: null, capabilities: [], message: null });
  useUiStore.setState({
    simRunning: false,
    diagnosisActive: false,
    challengeAttemptId: null,
    validationReport: null,
  });
  useCircuitStore.getState().setCircuit(fixture());
  clearHistory();
});
afterEach(() => vi.unstubAllGlobals());

describe('supply profiles across editor boundaries', () => {
  it('changes only document aliases and restores the full transaction through undo/redo/export', () => {
    const before = selectCircuit(useCircuitStore.getState());
    useCircuitStore.getState().setGlobalSupplyVoltage(12);
    const after = selectCircuit(useCircuitStore.getState());
    expect(after.supply?.model).toEqual({ kind: 'ac-single-phase', voltage: 12, frequencyHz: 60 });
    for (const id of ['heater', 'pe', 'independent'])
      expect(after.components.find((c) => c.id === id)).toEqual(
        before.components.find((c) => c.id === id),
      );
    expect(after.faults).toEqual(before.faults);
    expect(after.wires).toEqual(before.wires);
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(1);
    undo();
    expect(selectCircuit(useCircuitStore.getState())).toEqual(before);
    redo();
    expect(selectCircuit(useCircuitStore.getState())).toEqual(after);
    expect(importJSON(exportJSON(selectCircuit(useCircuitStore.getState())))).toEqual(after);
  });

  it('does not assign a source voltage to the first load in a source-free drawing', () => {
    useCircuitStore.getState().setCircuit({ components: [C('load', 'space-heater')], wires: [] });
    const load = useCircuitStore.getState().components[0];
    useCircuitStore.getState().setGlobalSupplyVoltage(48);
    expect(useCircuitStore.getState().components[0]).toEqual(load);
    expect(useCircuitStore.getState().components[0].state.customVoltage).toBeUndefined();
  });

  it('does not create history for identical or invalid supply edits', () => {
    useCircuitStore.getState().setGlobalSupplyVoltage(230);
    for (const value of [0, -12, Number.NaN, Number.POSITIVE_INFINITY, 100_001])
      useCircuitStore.getState().setGlobalSupplyVoltage(value);
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(0);
    expect(useCircuitStore.getState().supply).toEqual(ac60);
  });

  it('locks source configuration while running but keeps runtime switches operable', () => {
    const before = selectCircuit(useCircuitStore.getState());
    useUiStore.setState({ simRunning: true });
    useCircuitStore.getState().setGlobalSupplyVoltage(12);
    useCircuitStore.getState().updateComponentState('independent', { customVoltage: 48 });
    expect(selectCircuit(useCircuitStore.getState())).toEqual(before);
    useCircuitStore.getState().toggleSwitch('switch');
    expect(useCircuitStore.getState().components.find((c) => c.id === 'switch')?.state.on).toBe(
      false,
    );
  });

  it.each([{ challengeAttemptId: 'attempt' }, { diagnosisActive: true }])(
    'locks authored source edits during an exercise: %j',
    (mode) => {
      useUiStore.setState(mode);
      useCircuitStore.getState().setGlobalSupplyVoltage(12);
      useCircuitStore.getState().updateComponentState('l', { customVoltage: 12 });
      expect(useCircuitStore.getState().supply).toEqual(ac60);
      expect(useCircuitStore.getState().components[0].state.customVoltage).toBeUndefined();
      expect(useUiStore.getState().undoToast?.message).toContain('locked during this exercise');
    },
  );

  it('updates an independent source magnitude without losing its frequency or changing the document', () => {
    useCircuitStore.getState().updateComponentState('independent', { customVoltage: 48 });
    const source = useCircuitStore.getState().components.find((c) => c.id === 'independent')!;
    expect(source.state.sourceProfile?.model).toEqual({
      kind: 'ac-single-phase',
      voltage: 48,
      frequencyHz: 60,
    });
    expect(useCircuitStore.getState().supply).toEqual(ac60);
    expect(importJSON(exportJSON(selectCircuit(useCircuitStore.getState()))).components).toEqual(
      useCircuitStore.getState().components,
    );
  });

  it('preserves a paid circuit and its profiles when fresh authorization fails', async () => {
    const denied = vi.fn(
      async () => new Response(JSON.stringify({ error: 'Membership required' }), { status: 403 }),
    );
    vi.stubGlobal('fetch', denied);
    const circuit = fixture();
    circuit.components.push(C('battery', 'dc-battery-12v'));
    useCircuitStore.getState().setCircuit(circuit);
    const before = selectCircuit(useCircuitStore.getState());
    useCircuitStore.getState().setGlobalSupplyVoltage(12);
    await vi.waitFor(() => expect(useSimulatorAccess.getState().pending).toBe(0));
    expect(denied).toHaveBeenCalledTimes(1);
    expect(selectCircuit(useCircuitStore.getState())).toEqual(before);
  });

  it('rejects an obsolete authorized edit after only the supply profile changed', async () => {
    let finish!: (response: Response) => void;
    vi.stubGlobal(
      'fetch',
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            finish = resolve;
          }),
      ),
    );
    const circuit = fixture();
    circuit.components.push(C('battery', 'dc-battery-12v'));
    useCircuitStore.getState().setCircuit(circuit);
    useCircuitStore.getState().setGlobalSupplyVoltage(12);
    const revised = explicitSupplyProfile({
      kind: 'ac-single-phase',
      voltage: 230,
      frequencyHz: 50,
    });
    useCircuitStore.setState({ supply: revised });
    finish(
      new Response(
        JSON.stringify({ userId: 'paid', capabilities: ['pro_components'], nextChangeAt: null }),
      ),
    );
    await vi.waitFor(() => expect(useSimulatorAccess.getState().pending).toBe(0));
    expect(useCircuitStore.getState().supply).toEqual(revised);
    expect(useCircuitStore.getState().globalVoltage).toBe(230);
    expect(useSimulatorAccess.getState().message).toContain('circuit changed');
  });
});
