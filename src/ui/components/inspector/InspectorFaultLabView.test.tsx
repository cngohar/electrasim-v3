/**
 * Render tests for the Inspector Fault Lab tab: target handling (component
 * and wire), grouped grid, the active-faults command centre
 * (Focus / Replay / Clear), and the arming state.
 */

import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useCircuitStore, useUiStore, useViewportStore } from '../../../store';
import { InspectorFaultLabView } from './InspectorFaultLabView';

function seedBulbId(): string {
  const bulb = useCircuitStore.getState().components.find((c) => c.type === 'bulb');
  if (!bulb) throw new Error('seed circuit must contain a bulb');
  return bulb.id;
}

function resetStores(): void {
  useUiStore.setState({ pendingFaultFx: null });
  useCircuitStore.getState().clearAllFaults();
  useCircuitStore.getState().clearSelection();
  useCircuitStore.getState().selectWire(null);
}

afterEach(() => {
  act(() => resetStores());
});

describe('InspectorFaultLabView', () => {
  it('guides the user when nothing is targeted', () => {
    render(<InspectorFaultLabView />);
    expect(
      screen.getByText(/Click a component or a wire on the canvas to target it/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Short Circuit/ })).toBeDisabled();
  });

  it('targets the selected component with a grouped grid and thresholds', () => {
    const id = seedBulbId();
    act(() => {
      useCircuitStore.getState().selectComponent(id);
    });
    render(<InspectorFaultLabView />);

    expect(screen.getByText('Target')).toBeInTheDocument();
    // Grouped catalogue headers.
    expect(screen.getByText('Conductor')).toBeInTheDocument();
    expect(screen.getByText('Polarity & Wiring')).toBeInTheDocument();
    expect(screen.getByText('Leakage & Residual')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Short Circuit/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Open Neutral/ })).toBeEnabled();
    // Threshold overrides live here (moved from Properties).
    expect(screen.getByText('Threshold Overrides')).toBeInTheDocument();
  });

  it('targets a selected wire with the conductor fault set', () => {
    const wireId = useCircuitStore.getState().wires[0]?.id;
    if (!wireId) throw new Error('seed circuit must contain wires');
    act(() => {
      useCircuitStore.getState().selectWire(wireId);
    });
    render(<InspectorFaultLabView />);

    expect(screen.getByText(`Wire #${wireId.slice(0, 8)}`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Circuit/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Open Neutral/ })).toBeEnabled();
    // Component-only faults and thresholds are not offered for wires.
    expect(screen.queryByRole('button', { name: /Reverse Polarity/ })).toBeNull();
    expect(screen.queryByText('Threshold Overrides')).toBeNull();
  });

  it('injects with choreography: arming state locks the grid, then the fault lands', () => {
    const id = seedBulbId();
    act(() => {
      useCircuitStore.getState().selectComponent(id);
    });
    render(<InspectorFaultLabView />);

    act(() => {
      screen.getByRole('button', { name: /Short Circuit/ }).click();
    });
    expect(useUiStore.getState().pendingFaultFx).toMatchObject({
      target: { componentId: id },
      type: 'short-circuit',
    });
    expect(screen.getByText(/arming short-circuit/i)).toBeInTheDocument();
    expect(screen.getByText(/Arming Short circuit/i)).toBeInTheDocument();
    // Cancel affordance is offered during arming.
    expect(screen.getByTitle('Cancel pending injection')).toBeInTheDocument();
    act(() => {
      useUiStore.getState().clearPendingFaultFx();
    });
  });

  it('lists active faults with Focus / Replay / Clear controls', () => {
    const id = seedBulbId();
    act(() => {
      useCircuitStore.getState().setComponentFault(id, 'earth-fault');
      useCircuitStore.getState().selectComponent(id);
    });
    render(<InspectorFaultLabView />);

    expect(screen.getByText('Active faults (1)')).toBeInTheDocument();
    expect(screen.getByLabelText('Focus Earth fault on canvas')).toBeInTheDocument();
    expect(screen.getByLabelText('Replay Earth fault animation')).toBeInTheDocument();

    // Focus centres the viewport on the faulted component.
    const bulb = useCircuitStore.getState().components.find((c) => c.id === id);
    expect(bulb).toBeDefined();
    act(() => {
      screen.getByLabelText('Focus Earth fault on canvas').click();
    });
    expect(useViewportStore.getState().pan).toEqual({
      x: 600 - (bulb?.x ?? 0),
      y: 360 - (bulb?.y ?? 0),
    });

    // Clear resolves the entry (component state + scenario list together).
    act(() => {
      screen.getByLabelText('Clear Earth fault').click();
    });
    expect(useCircuitStore.getState().faults).toHaveLength(0);
    expect(
      useCircuitStore.getState().components.find((c) => c.id === id)?.state.fault,
    ).toBeUndefined();
  });
});
