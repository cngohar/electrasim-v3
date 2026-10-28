import { simulate } from '@electrasim/domain/simulation';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { damageCircuit } from '../../../../packages/domain/src/core/damageFixtures';
import { selectCircuit, undo, useCircuitStore } from '../../../store/circuitStore';
import { useFaultLabStore } from '../../../store/faultLabStore';
import { invalidateAccess, useSimulatorAccess } from '../../../store/simulatorAccess';
import { useUiStore } from '../../../store/uiStore';
import { authorizationResponse } from '../../../test/componentAccess';
import { Modal } from '../Modal';
import { InspectorFaultLabView } from './InspectorFaultLabView';

const documentAt = () => selectCircuit(useCircuitStore.getState());
const library = () => {
  fireEvent.click(screen.getByRole('button', { name: /Browse fault library/ }));
  return screen.getByRole('dialog', { name: 'Fault library' });
};
const openDraft = (name = /Open Circuit Break/) => {
  fireEvent.click(within(library()).getByRole('button', { name }));
  return screen.getByRole('dialog', { name: 'Review fault edit' });
};
const capture = () => act(() => useUiStore.setState({ simResult: simulate(documentAt()) }));

beforeEach(() => {
  invalidateAccess();
  useSimulatorAccess.setState({ userId: null, capabilities: [], message: null });
  useUiStore.setState({
    simRunning: false,
    simResult: null,
    faultLabOpen: true,
    pendingFaultFx: null,
  });
  useCircuitStore.getState().setCircuit(damageCircuit());
  useCircuitStore.temporal.getState().clear();
  useFaultLabStore.setState({ original: null, responses: {}, edits: [] });
});

afterEach(() => vi.restoreAllMocks());

describe('accepted Fault Lab investigation', () => {
  it('opening another modal pauses explanation playback without changing the circuit', async () => {
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    capture();
    const before = documentAt();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
    render(
      <Modal open title="Another tool" onClose={() => undefined}>
        Settings
      </Modal>,
    );
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull(), {
      timeout: 5000,
    });
    expect(documentAt()).toEqual(before);
  });

  it('loading another drawing resets the investigation and cannot restore the earlier document', async () => {
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    capture();
    const next = damageCircuit('device-current');
    act(() => useCircuitStore.getState().setCircuit(next));
    await waitFor(() =>
      expect(useFaultLabStore.getState().original?.circuit.components).toEqual(
        documentAt().components,
      ),
    );
    expect(useFaultLabStore.getState().responses).toEqual({});
    expect(useFaultLabStore.getState().original?.circuit.components[2]?.state.damageModel).toEqual(
      next.components[2]?.state.damageModel,
    );
  });
  it('keeps the complete registry visible with target guidance and disables unselected edits', () => {
    render(<InspectorFaultLabView />);
    expect(screen.getByText(/Click a component or a wire on the canvas/)).toBeVisible();
    const browser = within(library());
    expect(browser.getByRole('button', { name: /Dead Short Circuit/ })).toBeDisabled();
    expect(browser.getByRole('button', { name: /Arc Fault/ })).toBeDisabled();
    expect(
      browser.getAllByRole('button').filter((button) => button.closest('.fault-lab-library'))
        .length,
    ).toBe(14);
  });

  it('canceling a fault draft leaves the circuit and history exactly unchanged', () => {
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    const before = documentAt();
    fireEvent.click(within(openDraft()).getByRole('button', { name: 'Cancel' }));
    expect(documentAt()).toEqual(before);
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(0);
    expect(useUiStore.getState().pendingFaultFx).toBeNull();
  });

  it('applies one undoable edit without animation-driven circuit mutation', async () => {
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    fireEvent.click(within(openDraft()).getByRole('button', { name: 'Apply fault edit' }));
    await waitFor(() => expect(documentAt().faults).toHaveLength(1));
    expect(documentAt().faults?.[0]).toMatchObject({
      type: 'open-circuit',
      target: { type: 'wire', id: 'load-feed' },
    });
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(1);
    expect(useUiStore.getState().pendingFaultFx).toBeNull();
    act(() => undo());
    expect(documentAt().faults).toHaveLength(0);
  });

  it('switches the applied edit between Inside and the actual Circuit view, then clears without hook errors', async () => {
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const before = documentAt();
    fireEvent.click(within(openDraft()).getByRole('button', { name: 'Apply fault edit' }));
    await waitFor(() => expect(documentAt().faults).toHaveLength(1));
    expect(document.querySelector('[data-fault-application-state="applied"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Circuit' }));
    const overview = screen.getByRole('img', { name: 'Current circuit topology overview' });
    expect(overview.querySelectorAll('[data-component-symbol]')).toHaveLength(
      before.components.length,
    );
    expect(overview.querySelectorAll('[data-fault-overview-wire]')).toHaveLength(
      before.wires.length,
    );
    expect(overview.querySelector('[data-fault-fx="open-circuit"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Inside' }));
    expect(document.querySelector('[data-fault-application-state="applied"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Open Circuit Break' }));
    await waitFor(() => expect(documentAt().faults).toHaveLength(0));
    expect(document.querySelector('[data-fault-application-state="applied"]')).toBeNull();
    expect(errors.mock.calls).toEqual([]);
  });

  it('applies a named terminal disconnect without rewriting other terminals or wires', async () => {
    useCircuitStore.getState().selectComponent('lamp');
    render(<InspectorFaultLabView />);
    const original = documentAt();
    fireEvent.change(screen.getByLabelText('Fault target terminal'), { target: { value: '0' } });
    fireEvent.click(
      within(openDraft(/Loose \/ Disconnected Terminal/)).getByRole('button', {
        name: 'Apply fault edit',
      }),
    );
    await waitFor(() => expect(documentAt().faults).toHaveLength(1));
    expect(documentAt().faults?.[0]?.target).toEqual({
      type: 'port',
      componentId: 'lamp',
      portIndex: 0,
    });
    expect(documentAt().wires).toEqual(original.wires);
    expect(documentAt().components).toEqual(original.components);
  });

  it('requires fresh accepted results for replay and invalidates readings immediately on edit', async () => {
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    expect(screen.getByRole('button', { name: 'Replay' })).toBeDisabled();
    capture();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Replay' })).toBeEnabled());
    act(() => useCircuitStore.getState().setWireFault('load-feed', 'open-circuit'));
    expect(screen.getByRole('button', { name: 'Replay' })).toBeDisabled();
    expect(screen.getByText(/Stale response/)).toBeVisible();
    fireEvent.click(screen.getByRole('tab', { name: 'Readings' }));
    expect(screen.getByText(/Run the current circuit to capture fresh readings/)).toBeVisible();
  });

  it('seeking, replay, speed and comparison preserve electrical inputs, runtime and undo history', async () => {
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    capture();
    act(() => useCircuitStore.getState().setWireFault('load-feed', 'open-circuit'));
    capture();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Compare previous' })).toBeEnabled(),
    );
    const before = documentAt();
    const runtime = useUiStore.getState().simResult;
    const history = useCircuitStore.temporal.getState().pastStates;
    fireEvent.click(screen.getByRole('button', { name: 'Response' }));
    fireEvent.click(screen.getByRole('button', { name: 'Replay' }));
    fireEvent.change(screen.getByLabelText('Playback speed'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Compare previous' }));
    expect(documentAt()).toEqual(before);
    expect(useUiStore.getState().simResult).toBe(runtime);
    expect(useCircuitStore.temporal.getState().pastStates).toBe(history);
  });

  it('keeps an accepted detached response available after Stop clears live telemetry', async () => {
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    capture();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Replay' })).toBeEnabled());
    act(() => useUiStore.setState({ simResult: null, simRunning: false }));
    expect(screen.getByRole('button', { name: 'Replay' })).toBeEnabled();
    act(() => useCircuitStore.getState().setWireFault('load-feed', 'open-circuit'));
    expect(screen.getByRole('button', { name: 'Replay' })).toBeDisabled();
  });

  it('clearing one cause preserves unrelated faults, cable damage and the declared model', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) =>
      authorizationResponse(init, ['advanced_faults']),
    );
    useSimulatorAccess.setState({ capabilities: ['advanced_faults'] });
    const circuit = damageCircuit();
    circuit.wires[1]!.isBusted = true;
    useCircuitStore.getState().setCircuit(circuit);
    await useCircuitStore
      .getState()
      .injectFault({ type: 'open-circuit', target: { type: 'wire', id: 'load-feed' } });
    await useCircuitStore
      .getState()
      .injectFault({ type: 'open-circuit', target: { type: 'component', id: 'lamp' } });
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    const active = screen.getByLabelText('Active faults');
    fireEvent.click(
      within(active).getAllByRole('button', { name: 'Clear Open Circuit Break' })[0]!,
    );
    await waitFor(() => expect(documentAt().faults).toHaveLength(1));
    expect(documentAt().wires[1]).toMatchObject({
      isBusted: true,
      damageModel: circuit.wires[1]!.damageModel,
    });
    expect(documentAt().faults?.[0]?.target).toEqual({ type: 'component', id: 'lamp' });
  });

  it('does not substitute a related component photograph for a wire target', () => {
    useCircuitStore.getState().selectWire('load-feed');
    render(<InspectorFaultLabView />);
    fireEvent.click(screen.getByRole('button', { name: 'Reference photo' }));
    const photo = screen.getByRole('dialog', { name: 'Target reference photo' });
    expect(within(photo).getByText(/No direct photograph/)).toBeVisible();
    expect(within(photo).queryByRole('img')).toBeNull();
  });

  it('restores the initial drawing and groups as one edit, and Undo recovers the changed drawing', async () => {
    useCircuitStore.getState().selectWire('load-feed');
    useCircuitStore.setState({
      componentGroups: [
        { id: 'g', name: 'Lamp', componentIds: ['lamp'], position: { x: 0, y: 0 } },
      ],
    });
    render(<InspectorFaultLabView />);
    act(() => useCircuitStore.getState().setWireFault('load-feed', 'open-circuit'));
    const changed = documentAt();
    fireEvent.click(screen.getByRole('button', { name: 'Leave the lab' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restore starting circuit and leave' }));
    await waitFor(() => expect(documentAt().faults).toHaveLength(0));
    expect(useCircuitStore.getState().componentGroups[0]?.id).toBe('g');
    act(() => undo());
    expect(documentAt()).toEqual(changed);
  });
});
