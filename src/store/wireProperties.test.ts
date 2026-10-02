import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import { resolveWireProperties } from '@electrasim/domain/core/wireProperties';
import { beforeEach, describe, expect, it } from 'vitest';
import { heaterFixture } from '../../packages/domain/src/core/operatingPointFixtures';
import { clearHistory, redo, selectCircuit, undo, useCircuitStore } from './circuitStore';
import { invalidateAccess, useSimulatorAccess } from './simulatorAccess';
import { useUiStore } from './uiStore';

beforeEach(() => {
  invalidateAccess();
  useSimulatorAccess.setState({ exercise: null, userId: null, capabilities: [], message: null });
  useUiStore.setState({ simRunning: false, diagnosisActive: false, challengeAttemptId: null });
  const circuit = heaterFixture();
  circuit.components[1]!.state.customCableMm2 = 1;
  circuit.wires[0]!.customCableMm2 = undefined;
  circuit.wires[0]!.gauge = 16;
  useCircuitStore.getState().setCircuit(circuit);
  clearHistory();
});

const wire = () => useCircuitStore.getState().wires.find((item) => item.id === 'feed')!;
const area = () =>
  resolveWireProperties(
    wire(),
    new Map(useCircuitStore.getState().components.map((c) => [c.id, c])),
  ).cableMm2;

describe('wire physical size across editor boundaries', () => {
  it('clears stale AWG after a metric edit and restores the original through undo/redo/save', () => {
    const before = selectCircuit(useCircuitStore.getState());
    expect(area()).toBe(1.31);
    useCircuitStore.getState().updateWireProperties('feed', { customCableMm2: 6 });
    expect(area()).toBe(6);
    expect(wire().gauge).toBeUndefined();
    const after = selectCircuit(useCircuitStore.getState());
    expect(after.components).toEqual(before.components);
    undo();
    expect(selectCircuit(useCircuitStore.getState())).toEqual(before);
    redo();
    expect(selectCircuit(useCircuitStore.getState())).toEqual(after);
    expect(importJSON(exportJSON(after))).toEqual(after);
  });

  it('writes the physical equivalent when choosing AWG and does not keep contradictory pairs', () => {
    useCircuitStore.getState().updateWireProperties('feed', { gauge: 12 });
    expect(wire()).toMatchObject({ gauge: 12, customCableMm2: 3.31 });
    useCircuitStore.getState().updateWireProperties('feed', { gauge: 16, customCableMm2: 6 });
    expect(area()).toBe(6);
    expect(wire().gauge).toBeUndefined();
    useCircuitStore.getState().updateWireProperties('feed', { gauge: 16, customCableMm2: 1.31 });
    expect(wire()).toMatchObject({ gauge: 16, customCableMm2: 1.31 });
  });

  it('retains a physical area when clearing the AWG label, and can return to endpoint fallback', () => {
    useCircuitStore.getState().updateWireProperties('feed', { gauge: 12 });
    useCircuitStore.getState().updateWireProperties('feed', { gauge: undefined });
    expect(area()).toBe(3.31);
    useCircuitStore.getState().updateWireProperties('feed', { customCableMm2: undefined });
    expect(area()).toBe(1);
    expect(wire().gauge).toBeUndefined();
  });

  it('rejects unsupported gauges and invalid physical size without changing the document', () => {
    const before = selectCircuit(useCircuitStore.getState());
    for (const gauge of [13, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      useCircuitStore.getState().updateWireProperties('feed', { gauge });
    for (const customCableMm2 of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      useCircuitStore.getState().updateWireProperties('feed', { customCableMm2 });
    expect(selectCircuit(useCircuitStore.getState())).toEqual(before);
  });
});
