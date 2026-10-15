import { isCurrentSimulation } from '@electrasim/domain/simulationEvidence';
import { beforeEach, describe, expect, it } from 'vitest';
import { profileLoadFixture } from '../../packages/domain/src/core/catalogueProfileFixtures';
import { simulate } from '../../packages/domain/src/simulation/simulate';
import { clearHistory, redo, selectCircuit, undo, useCircuitStore } from './circuitStore';
import { useSimulatorAccess } from './simulatorAccess';
import { useUiStore } from './uiStore';

beforeEach(() => {
  useUiStore.setState({ simRunning: false, simResult: null, validationReport: null });
  useSimulatorAccess.setState({ userId: null, capabilities: [], pending: 0, message: null });
  useCircuitStore.getState().setCircuit(profileLoadFixture());
  clearHistory();
});
describe('profile nameplate transactions', () => {
  it('updates watts and volts atomically, preserves authored bands and Undo/Redo, and invalidates old evidence', async () => {
    const before = selectCircuit(useCircuitStore.getState());
    const result = simulate(before);
    await useCircuitStore
      .getState()
      .updateComponentState('load', { customVoltage: 120, customPowerWatts: 5 });
    let c = selectCircuit(useCircuitStore.getState());
    let p = c.components[1]!.state.electronicLoadProfile!;
    expect(p.nominalVoltage).toBe(120);
    expect(p.inputPowerWatts).toBe(5);
    expect(p.operatingVoltageRange).toEqual({ min: 108, max: 132 });
    expect(isCurrentSimulation(c, result)).toBe(false);
    undo();
    await expect.poll(() => selectCircuit(useCircuitStore.getState())).toEqual(before);
    redo();
    await expect
      .poll(
        () =>
          selectCircuit(useCircuitStore.getState()).components[1]!.state.electronicLoadProfile!
            .nominalVoltage,
      )
      .toBe(120);
    c = selectCircuit(useCircuitStore.getState());
    p = c.components[1]!.state.electronicLoadProfile!;
    await useCircuitStore.getState().updateComponentState('load', {
      electronicLoadProfile: {
        ...p,
        operatingRangeOrigin: 'instance',
        operatingVoltageRange: { min: 100, max: 150 },
        provenance: {
          ...p.provenance,
          overrides: ['nominalVoltage', 'inputPowerWatts', 'operatingVoltageRange'],
        },
      },
    });
    await useCircuitStore.getState().updateComponentState('load', { customVoltage: 130 });
    expect(
      selectCircuit(useCircuitStore.getState()).components[1]!.state.electronicLoadProfile!
        .operatingVoltageRange,
    ).toEqual({ min: 100, max: 150 });
  });
  it('rejects malformed edits and locks configured profiles during Run', async () => {
    const before = selectCircuit(useCircuitStore.getState());
    await useCircuitStore.getState().updateComponentState('load', { customPowerWatts: -1 });
    expect(selectCircuit(useCircuitStore.getState())).toEqual(before);
    useUiStore.setState({ simRunning: true });
    await useCircuitStore.getState().updateComponentState('load', { customPowerWatts: 12 });
    expect(selectCircuit(useCircuitStore.getState())).toEqual(before);
  });
});
