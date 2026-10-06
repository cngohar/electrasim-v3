import { explicitSupplyProfile } from '@electrasim/domain/core/supplies';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editingCircuit, variantCircuit } from '../../packages/domain/src/core/editingFixtures';
import { threePhaseStarFixture } from '../../packages/domain/src/core/threePhaseFixtures';
import { dimmingCircuit, timerCircuit } from '../../packages/domain/src/core/timerDimmingFixtures';
import { component as C } from '../../packages/domain/src/simulation/auditFixtures';
import { clearHistory, redo, selectCircuit, undo, useCircuitStore } from './circuitStore';
import { closeElectricalEdit, requestSupplyEdit, useElectricalEditing } from './electricalEditing';
import { confirmElectricalEdit } from './electricalEditing.testHelpers';
import { buildStudentSeedCircuit } from './seed';
import { useSettingsStore } from './settingsStore';
import { invalidateAccess, useSimulatorAccess } from './simulatorAccess';
import { useUiStore } from './uiStore';

const snapshot = () => selectCircuit(useCircuitStore.getState());
beforeEach(() => {
  invalidateAccess();
  useSimulatorAccess.setState({
    exercise: null,
    capabilities: [],
    userId: null,
    message: null,
    pending: 0,
  });
  useUiStore.setState({
    simRunning: false,
    diagnosisActive: false,
    challengeAttemptId: null,
    simResult: null,
    validationReport: null,
  });
  useElectricalEditing.setState({
    request: null,
    reviewOpen: false,
    notice: null,
    showAll: false,
    activeSupply: { kind: 'document' },
  });
  useSettingsStore.setState({ appMode: 'basic' });
  useCircuitStore.getState().setCircuit(editingCircuit());
  clearHistory();
});
afterEach(() => vi.unstubAllGlobals());

describe('staged configuration and transaction history', () => {
  it('freezes a placed phase source and stages sequence changes as one locked, reversible edit', async () => {
    useCircuitStore.getState().setCircuit(threePhaseStarFixture());
    useCircuitStore.getState().addComponent(C('phase2', 'ac-three-phase-supply'));
    expect(snapshot().components.at(-1)?.state.sourceProfile?.model).toEqual({
      kind: 'ac-three-phase',
      voltage: 230,
      frequencyHz: 50,
      sequence: 'abc',
    });
    clearHistory();
    const before = snapshot();
    const profile = explicitSupplyProfile({
      kind: 'ac-three-phase',
      voltage: 400 / Math.sqrt(3),
      frequencyHz: 60,
      sequence: 'acb',
    });
    useCircuitStore.getState().updateComponentState('s', { sourceProfile: profile });
    expect(snapshot()).toEqual(before);
    expect(await confirmElectricalEdit()).toBe(true);
    const after = snapshot();
    expect(after.components[0]!.state.sourceProfile).toEqual(profile);
    expect(after.components.slice(1)).toEqual(before.components.slice(1));
    expect(after.wires).toEqual(before.wires);
    undo();
    expect(snapshot()).toEqual(before);
    redo();
    expect(snapshot()).toEqual(after);
    useUiStore.setState({ simRunning: true });
    useCircuitStore.getState().updateComponentState('s', { customVoltage: 120 });
    expect(useElectricalEditing.getState().request).toBeNull();
    expect(snapshot()).toEqual(after);
  });
  it('preserves timer programs through undo/redo, validates inputs and locks edits during runs/exercises', () => {
    const circuit = timerCircuit();
    const program = circuit.components[1]!.state.timerModel!;
    circuit.components[1]!.state.timerModel = undefined;
    useCircuitStore.getState().setCircuit(circuit);
    clearHistory();
    const settings = () => snapshot().components[1]!.state.timerModel;
    useCircuitStore.getState().updateComponentState('control', { timerModel: program });
    expect(settings()).toEqual(program);
    undo();
    expect(settings()).toBeUndefined();
    redo();
    expect(settings()).toEqual(program);
    useCircuitStore.getState().updateComponentState('control', {
      timerModel: { version: 1, kind: 'interval', durationSeconds: 1, retrigger: 'restart' },
    });
    expect(settings()).toEqual(program);
    for (const lock of [
      { simRunning: true },
      { simRunning: false, challengeAttemptId: 'graded' },
    ]) {
      useUiStore.setState(lock);
      useCircuitStore.getState().updateComponentState('control', { timerModel: undefined });
      expect(settings()).toEqual(program);
    }
  });

  it('allows valid running dimmer inputs but rejects invalid levels', () => {
    useCircuitStore.getState().setCircuit(dimmingCircuit());
    useUiStore.setState({ simRunning: true });
    useCircuitStore.getState().updateComponentState('control', { speed: 1.5 });
    expect(snapshot().components[1]!.state.speed).toBe(1.5);
    for (const speed of [-1, 4, Number.NaN])
      useCircuitStore.getState().updateComponentState('control', { speed });
    expect(snapshot().components[1]!.state.speed).toBe(1.5);
  });
  it('does not mutate while staging, canceling or choosing an identical supply', () => {
    const before = snapshot();
    useCircuitStore.getState().setGlobalSupplyVoltage(12);
    expect(useElectricalEditing.getState().request?.kind).toBe('supply');
    expect(snapshot()).toEqual(before);
    closeElectricalEdit();
    expect(snapshot()).toEqual(before);
    useCircuitStore.getState().setGlobalSupplyVoltage(230);
    expect(useElectricalEditing.getState().request).toBeNull();
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(0);
  });

  it('applies AC/DC as one stopped, undoable transaction while preserving ratings and independent sources', async () => {
    const before = snapshot();
    requestSupplyEdit({ kind: 'document' }, explicitSupplyProfile({ kind: 'dc', voltage: 48 }));
    expect(await confirmElectricalEdit()).toBe(true);
    const after = snapshot();
    expect(after.supply?.model).toEqual({ kind: 'dc', voltage: 48 });
    for (const id of ['heater', 'other-load', 'independent', 'pe'])
      expect(after.components.find((c) => c.id === id)).toEqual(
        before.components.find((c) => c.id === id),
      );
    expect(useUiStore.getState().simRunning).toBe(false);
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(1);
    undo();
    expect(snapshot()).toEqual(before);
    redo();
    expect(snapshot()).toEqual(after);
  });

  it('rejects a preview if the drawing or only the source frequency changed', () => {
    const before = snapshot();
    useCircuitStore.setState({
      supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 60 }),
    });
    expect(
      useCircuitStore.getState().applyElectricalEdit(
        {
          kind: 'supply',
          target: { kind: 'document' },
          profile: explicitSupplyProfile({ kind: 'dc', voltage: 12 }),
        },
        before,
      ),
    ).toBe(false);
    expect(snapshot().supply?.model).toMatchObject({ voltage: 230, frequencyHz: 60 });
  });

  it('invalidates published results synchronously on configuration changes', async () => {
    useUiStore.setState({
      simResult: {
        energizedComponents: new Set(['heater']),
        energizedWires: new Set(),
        errorComponents: new Set(),
        errorWires: new Set(),
        errors: [],
        warnings: [],
      },
    });
    useCircuitStore.getState().setGlobalSupplyVoltage(12);
    expect(await confirmElectricalEdit()).toBe(true);
    expect(useUiStore.getState().simResult).toBeNull();
  });

  it('maps replacement wires and faults through undo/redo and resets stale design overrides', async () => {
    const input = variantCircuit();
    input.components.at(-1)!.state.fault = undefined; // One free fault; domain tests cover combined fault preservation.
    useCircuitStore.getState().setCircuit(input);
    clearHistory();
    const before = snapshot();
    useCircuitStore.getState().updateComponentType('breaker', 'rcd');
    expect(snapshot()).toEqual(before);
    expect(await confirmElectricalEdit()).toBe(true);
    const after = snapshot();
    expect(after.wires.find((w) => w.id === 'breaker-out')?.fromPortIndex).toBe(2);
    expect(after.components.find((c) => c.id === 'breaker')?.state.customVoltage).toBeUndefined();
    expect(after.faults?.[0]?.target).toMatchObject({ portIndex: 2 });
    undo();
    expect(snapshot()).toEqual(before);
    redo();
    expect(snapshot()).toEqual(after);
  });

  it('locks every source/variant/design entry point while running but permits runtime switch operation', () => {
    const before = snapshot();
    useUiStore.setState({ simRunning: true });
    useCircuitStore.getState().setGlobalSupplyVoltage(12);
    useCircuitStore.getState().updateComponentState('independent', { customVoltage: 48 });
    useCircuitStore.getState().updateComponentState('heater', { customPowerWatts: 800 });
    useCircuitStore.getState().updateComponentType('heater', 'water-heater');
    expect(snapshot()).toEqual(before);
    expect(useElectricalEditing.getState().request).toBeNull();
    useCircuitStore.getState().toggleSwitch('switch');
    expect(snapshot().components.find((c) => c.id === 'switch')?.state.on).toBe(false);
  });

  it.each([{ simRunning: true }, { challengeAttemptId: 'graded' }])(
    'does not replace demo hardware through display preferences while configuration is locked: %j',
    (lock) => {
      useCircuitStore.getState().setCircuit(buildStudentSeedCircuit());
      const before = snapshot();
      useUiStore.setState(lock);
      useCircuitStore.getState().swapDemoSocketForPlug('socket-schuko');
      useCircuitStore.getState().swapDemoForMode('pro');
      expect(snapshot()).toEqual(before);
    },
  );

  it('preserves edited supply, device ratings and wire properties when display preferences change', async () => {
    for (const edit of ['supply', 'imported-supply', 'rating', 'wire', 'fault']) {
      const circuit = buildStudentSeedCircuit();
      if (edit === 'imported-supply')
        circuit.supply = explicitSupplyProfile({ kind: 'dc', voltage: 12 });
      if (edit === 'rating')
        circuit.components.find((c) => c.type === 'bulb')!.state.customPowerWatts = 20;
      if (edit === 'wire') circuit.wires[0].lengthMeters = 25;
      if (edit === 'fault')
        circuit.faults = [
          {
            id: 'broken',
            type: 'open-circuit',
            category: 'conductor',
            target: { type: 'wire', id: circuit.wires[0].id },
            createdAt: 0,
          },
        ];
      useCircuitStore.getState().setCircuit(circuit);
      if (edit === 'supply') {
        useCircuitStore.getState().setGlobalSupplyVoltage(12);
        expect(await confirmElectricalEdit()).toBe(true);
      }
      const before = snapshot();
      useCircuitStore.getState().swapDemoSocketForPlug('socket-schuko');
      useCircuitStore.getState().swapDemoForMode('pro');
      expect(snapshot()).toEqual(before);
    }
  });

  it.each(['challenge', 'diagnosis', 'server-exercise'])(
    'locks authored source and variant configuration during %s',
    (kind) => {
      if (kind === 'challenge') useUiStore.setState({ challengeAttemptId: 'graded' });
      else if (kind === 'diagnosis') useUiStore.setState({ diagnosisActive: true });
      else useSimulatorAccess.setState({ exercise: { circuit: editingCircuit(), mode: 'basic' } });
      const before = snapshot();
      useCircuitStore.getState().setGlobalSupplyVoltage(12);
      useCircuitStore.getState().updateComponentType('heater', 'water-heater');
      useCircuitStore.getState().updateComponentState('heater', { customPowerWatts: 1 });
      expect(snapshot()).toEqual(before);
      expect(useElectricalEditing.getState().request).toBeNull();
      expect(useUiStore.getState().undoToast?.message).toContain('locked during this exercise');
    },
  );

  it.each(['cancel', 'start', 'revise'])(
    'rechecks %s while premium authorization is pending',
    async (action) => {
      const c = editingCircuit();
      c.components.push(C('battery', 'dc-battery-12v'));
      useCircuitStore.getState().setCircuit(c);
      let finish!: (r: Response) => void;
      vi.stubGlobal(
        'fetch',
        vi.fn(
          () =>
            new Promise<Response>((resolve) => {
              finish = resolve;
            }),
        ),
      );
      useCircuitStore.getState().setGlobalSupplyVoltage(12);
      const pending = confirmElectricalEdit();
      expect(finish).toBeTypeOf('function');
      if (action === 'cancel') closeElectricalEdit();
      else if (action === 'start') useUiStore.setState({ simRunning: true });
      else
        useCircuitStore.setState({
          supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 60 }),
        });
      finish(
        new Response(
          JSON.stringify({ userId: 'paid', capabilities: ['pro_components'], nextChangeAt: null }),
        ),
      );
      expect(await pending).toBe(false);
      expect(snapshot().globalVoltage).toBe(230);
    },
  );
});

describe('shared Run entry points', () => {
  it.each([
    'setSimRunning',
    'toggleSim',
    'runWithComplianceOverride',
    'startDiagnosticRun',
  ] as const)('blocks empty and invalid circuits through %s', (method) => {
    useSettingsStore.setState({ appMode: 'pro' });
    for (const circuit of [
      { components: [], wires: [] },
      { components: [C('bad', 'no-such-type')], wires: [] },
    ]) {
      useCircuitStore.getState().setCircuit(circuit);
      if (method === 'setSimRunning') useUiStore.getState().setSimRunning(true);
      else useUiStore.getState()[method]();
      expect(useUiStore.getState().simRunning).toBe(false);
      expect(useElectricalEditing.getState().reviewOpen).toBe(true);
    }
  });
  it('requires an explicit diagnostic for no-load and open-return drawings', () => {
    const circuit = editingCircuit();
    circuit.components = circuit.components.filter((c) => ['l', 'n', 'heater'].includes(c.id));
    circuit.wires = circuit.wires.filter((w) => w.id === 'feed');
    useCircuitStore.getState().setCircuit(circuit);
    useUiStore.getState().toggleSim();
    expect(useUiStore.getState().simRunning).toBe(false);
    useUiStore.getState().startDiagnosticRun();
    expect(useUiStore.getState().simRunning).toBe(true);
    expect(useUiStore.getState().diagnosticRun).toBe(true);
  });
});
