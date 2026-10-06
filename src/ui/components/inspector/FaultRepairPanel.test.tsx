import { simulate } from '@electrasim/domain/simulation';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { damageCircuit } from '../../../../packages/domain/src/core/damageFixtures';
import { protectionCircuit } from '../../../../packages/domain/src/core/protectionFixtures';
import { selectCircuit, useCircuitStore } from '../../../store/circuitStore';
import { invalidateAccess, useSimulatorAccess } from '../../../store/simulatorAccess';
import { useUiStore } from '../../../store/uiStore';
import FaultRepairPanel from './FaultRepairPanel';

function SelectedPanel({ target }: { target: 'component' | 'wire' }) {
  const component = useCircuitStore((s) => s.components.find((c) => c.id === 'lamp') ?? null);
  const wire = useCircuitStore((s) => s.wires.find((w) => w.id === 'load-feed') ?? null);
  return (
    <FaultRepairPanel
      component={target === 'component' ? component : null}
      wire={target === 'wire' ? wire : null}
    />
  );
}

const document = () => selectCircuit(useCircuitStore.getState());

beforeEach(() => {
  invalidateAccess();
  useSimulatorAccess.setState({ exercise: null, userId: null, capabilities: [], message: null });
  useUiStore.setState({
    simRunning: false,
    simResult: null,
    diagnosisActive: false,
    challengeAttemptId: null,
  });
  useCircuitStore.getState().setCircuit(damageCircuit());
});

describe('Fault Lab damage settings and repair controls', () => {
  it('applies and removes a guest wire budget independently of conductor properties', () => {
    const originalWire = document().wires[1]!;
    render(<SelectedPanel target="wire" />);
    expect(screen.queryByLabelText('Damage stress source')).toBeNull();
    fireEvent.change(screen.getByLabelText('Damage threshold'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Damage stress budget'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply damage model' }));
    expect(document().wires[1]).toEqual({
      ...originalWire,
      damageModel: {
        version: 1,
        kind: 'overcurrent',
        continuousCurrentAmps: 3,
        withstandAmpSquaredSeconds: 20,
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove damage model' }));
    expect(document().wires[1]!.damageModel).toBeUndefined();
    expect(screen.getByLabelText('Damage threshold')).toHaveValue(null);
  });

  it('changes the stress source without rewriting the load nameplate', () => {
    useCircuitStore.getState().setCircuit(damageCircuit('device-current'));
    const original = document().components[2]!.state;
    render(<SelectedPanel target="component" />);
    fireEvent.change(screen.getByLabelText('Damage stress source'), {
      target: { value: 'overvoltage' },
    });
    expect(screen.getByLabelText('Damage threshold')).toHaveValue(null);
    fireEvent.change(screen.getByLabelText('Damage threshold'), { target: { value: '200' } });
    fireEvent.change(screen.getByLabelText('Damage stress budget'), { target: { value: '6000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Apply damage model' }));
    expect(document().components[2]!.state).toEqual({
      ...original,
      damageModel: {
        version: 1,
        kind: 'overvoltage',
        maximumVoltageVolts: 200,
        withstandVoltSquaredSeconds: 6000,
      },
    });
  });

  it('locks configuration in a run or exercise and replacement until stopped', () => {
    const circuit = damageCircuit();
    circuit.wires[1]!.isBusted = true;
    useCircuitStore.getState().setCircuit(circuit);
    render(<SelectedPanel target="wire" />);
    act(() => useUiStore.setState({ simRunning: true }));
    expect(screen.getByRole('button', { name: 'Apply damage model' })).toBeDisabled();
    const replace = screen.getByRole('button', { name: 'Replace wire #load-fee' });
    expect(replace).toBeDisabled();
    fireEvent.click(replace);
    expect(document().wires[1]!.isBusted).toBe(true);
    act(() => useUiStore.setState({ simRunning: false, diagnosisActive: true }));
    expect(screen.getByRole('button', { name: 'Apply damage model' })).toBeDisabled();
    expect(screen.getByText(/locked during this exercise/)).toBeVisible();
    act(() => useUiStore.setState({ diagnosisActive: false }));
    expect(replace).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Apply damage model' })).toBeEnabled();
  });

  it('replaces a damaged wire while preserving an injected break and its model', () => {
    const circuit = damageCircuit();
    circuit.wires[1]!.isBusted = true;
    circuit.wires[1]!.fault = 'open-circuit';
    useCircuitStore.getState().setCircuit(circuit);
    render(<SelectedPanel target="wire" />);
    fireEvent.click(screen.getByRole('button', { name: 'Replace wire #load-fee' }));
    expect(document().wires[1]).toMatchObject({
      isBusted: false,
      fault: 'open-circuit',
      damageModel: circuit.wires[1]!.damageModel,
    });
    expect(simulate(document()).faultsCleared).toBe(false);
    expect(screen.queryByRole('button', { name: 'Replace wire #load-fee' })).toBeNull();
  });

  it('resets restored breaker trips to OFF without replacing an operated fuse', () => {
    const circuit = protectionCircuit('mcb', 16);
    const breaker = circuit.components[1]!;
    breaker.state.protectionModel = undefined;
    breaker.state.isTripped = true;
    breaker.state.autoLabel = 'Breaker';
    const fuse = protectionCircuit('fuse', 1).components[1]!;
    fuse.id = 'fuse';
    fuse.state.isBlown = true;
    fuse.state.autoLabel = 'Fuse';
    circuit.components.push(fuse);
    useCircuitStore.getState().setCircuit(circuit);
    render(<SelectedPanel target="component" />);
    fireEvent.click(screen.getByRole('button', { name: 'Reset Breaker to OFF' }));
    expect(document().components[1]!.state).toMatchObject({ on: false, isTripped: false });
    expect(document().components[3]!.state.isBlown).toBe(true);
    expect(screen.queryByRole('button', { name: /Reset Fuse/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Replace Fuse' })).toBeEnabled();
  });
});
