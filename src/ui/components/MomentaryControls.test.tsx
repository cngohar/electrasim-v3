import type { ComponentInstance } from '@electrasim/domain';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearHistory, useCircuitStore, useUiStore } from '../../store';
import { ContextMenu } from './ContextMenu';
import { Inspector } from './Inspector';

const BUTTON: ComponentInstance = {
  id: 'doorbell-button',
  type: 'push-button',
  x: 100,
  y: 100,
  state: { on: false },
};

function InspectorHarness() {
  const selected = useCircuitStore((state) => state.components[0] ?? null);
  return <Inspector selectedComp={selected} simResult={null} isPhone={false} />;
}

describe('momentary switch controls', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      components: [structuredClone(BUTTON)],
      wires: [],
      selectedComponentId: BUTTON.id,
      selectedComponentIds: [BUTTON.id],
      selectedWireIds: [],
    });
    useUiStore.setState({
      contextMenu: null,
      activeGuideId: null,
      inspectorCollapsed: false,
      activeInspectorTab: 'properties',
    });
    clearHistory();
  });

  it('uses press/release semantics in the Inspector', () => {
    render(<InspectorHarness />);
    const control = screen.getByRole('button', { name: 'Press and hold' });

    fireEvent.pointerDown(control, { button: 0, pointerId: 21 });
    expect(screen.getByText('PRESSED')).toBeInTheDocument();
    fireEvent.pointerUp(control, { button: 0, pointerId: 21 });
    expect(screen.getByText('RELEASED')).toBeInTheDocument();
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(0);
  });

  it('releases the component before closing its context menu', () => {
    useUiStore.setState({
      contextMenu: { x: 12, y: 12, target: { kind: 'component', id: BUTTON.id } },
    });
    render(<ContextMenu />);
    const control = screen.getByRole('button', { name: 'Press and hold' });

    fireEvent.pointerDown(control, { button: 0, pointerId: 22 });
    expect(useCircuitStore.getState().components[0]?.state.on).toBe(true);
    fireEvent.pointerUp(control, { button: 0, pointerId: 22 });

    expect(useCircuitStore.getState().components[0]?.state.on).toBe(false);
    expect(useUiStore.getState().contextMenu).toBeNull();
  });
});
