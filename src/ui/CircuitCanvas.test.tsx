import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ComponentInstance, SimulationResult, WireInstance } from '../domain';
import {
  clearHistory,
  setMomentarySwitchState,
  useCircuitStore,
  useSettingsStore,
  useUiStore,
} from '../store';
import { CircuitCanvas } from './CircuitCanvas';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { labGlassLight } from './theme';

const components: ComponentInstance[] = [
  { id: 'source', type: 'live-terminal', x: 120, y: 120, state: {} },
  { id: 'breaker', type: 'mcb', x: 320, y: 120, state: { on: true } },
  { id: 'fuse-target', type: 'fuse', x: 520, y: 120, state: { on: true } },
  { id: 'doorbell-button', type: 'push-button', x: 720, y: 120, state: { on: false } },
];

const wires: WireInstance[] = [
  {
    id: 'wire-1',
    fromComponentId: 'source',
    fromPortIndex: 0,
    toComponentId: 'breaker',
    toPortIndex: 0,
    controlPoints: [],
  },
];

function TestCanvas({ simResult }: { simResult?: SimulationResult | null }) {
  useKeyboardShortcuts();
  const liveComponents = useCircuitStore((state) => state.components);
  const liveWires = useCircuitStore((state) => state.wires);
  const selectedId = useCircuitStore((state) => state.selectedComponentId);
  return (
    <CircuitCanvas
      circuit={{ components: liveComponents, wires: liveWires }}
      simResult={simResult}
      selectedId={selectedId}
      theme={labGlassLight}
      onSelect={(id) => useCircuitStore.getState().selectComponent(id)}
      onToggleSwitch={(id) => useCircuitStore.getState().toggleSwitch(id)}
      onSetSwitchState={setMomentarySwitchState}
    />
  );
}

describe('CircuitCanvas keyboard and screen-reader interaction', () => {
  beforeEach(() => {
    useCircuitStore.setState({
      components: structuredClone(components),
      wires: structuredClone(wires),
      selectedComponentId: null,
      selectedComponentIds: [],
      selectedWireIds: [],
    });
    useUiStore.setState({
      mode: 'idle',
      reroute: null,
      pendingWireFrom: null,
      pendingCustomPath: null,
      placingType: null,
    });
    useSettingsStore.setState({ activeLoadEffects: true, reducedEffects: false });
    clearHistory();
  });

  it('exposes the editor and its components, ports, and wires as keyboard controls', () => {
    render(<TestCanvas />);

    expect(screen.getByRole('application', { name: 'Circuit diagram' })).toBeInTheDocument();
    const source = screen.getByRole('button', { name: 'Live Terminal (L) source' });
    const breaker = screen.getByRole('button', { name: 'MCB Type B (16A) breaker, on' });
    const wire = screen.getByRole('button', { name: 'Wire wire-1' });
    expect(
      screen.getByRole('button', { name: 'L-out port on Live Terminal (L) source' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(source, { key: 'Enter' });
    expect(useCircuitStore.getState().selectedComponentId).toBe('source');

    fireEvent.keyDown(breaker, { key: ' ' });
    expect(useCircuitStore.getState().selectedComponentId).toBe('breaker');
    expect(useCircuitStore.getState().components.find(({ id }) => id === 'breaker')?.state.on).toBe(
      false,
    );

    fireEvent.keyDown(wire, { key: 'Enter' });
    expect(useCircuitStore.getState().selectedWireIds).toEqual(['wire-1']);
  });

  it('reroutes a focused wire with R followed by a focused compatible port', () => {
    render(<TestCanvas />);
    const wire = screen.getByRole('button', { name: 'Wire wire-1' });

    fireEvent.keyDown(wire, { key: 'r' });
    expect(useUiStore.getState().reroute).toEqual({
      wireId: 'wire-1',
      end: 'to',
      source: 'armed',
    });
    expect(useUiStore.getState().mode).toBe('wiring');

    fireEvent.keyDown(screen.getByRole('button', { name: /L-in port on Cartridge Fuse/ }), {
      key: 'Enter',
    });

    expect(useCircuitStore.getState().wires[0]).toMatchObject({
      toComponentId: 'fuse-target',
      toPortIndex: 0,
    });
    expect(useUiStore.getState().reroute).toBeNull();
    expect(useUiStore.getState().mode).toBe('idle');
  });

  it('arms an endpoint handle from the keyboard and clears it on window blur', () => {
    useCircuitStore.setState({ selectedWireIds: ['wire-1'] });
    render(<TestCanvas />);
    const handle = screen.getByRole('button', { name: 'Reroute target of wire wire-1' });

    fireEvent.keyDown(handle, { key: 'Enter' });
    expect(useUiStore.getState().reroute?.source).toBe('armed');

    fireEvent.blur(window);
    expect(useUiStore.getState().reroute).toBeNull();
    expect(useUiStore.getState().mode).toBe('idle');
  });

  it('presses and releases a momentary control with pointer and keyboard input', () => {
    render(<TestCanvas />);
    const control = screen.getByRole('button', {
      name: 'Press and hold Push Button doorbell-button',
    });
    const componentSelection = screen.getByRole('button', {
      name: 'Push Button doorbell-button, released',
    });
    expect(componentSelection).not.toHaveAttribute('aria-pressed');

    fireEvent.pointerDown(control, { button: 0, pointerId: 14 });
    expect(
      useCircuitStore.getState().components.find(({ id }) => id === 'doorbell-button')?.state.on,
    ).toBe(true);
    expect(control).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Push Button doorbell-button, pressed' }),
    ).toBeInTheDocument();
    fireEvent.pointerUp(control, { button: 0, pointerId: 14 });
    expect(
      useCircuitStore.getState().components.find(({ id }) => id === 'doorbell-button')?.state.on,
    ).toBe(false);
    expect(control).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('button', { name: 'Push Button doorbell-button, released' }),
    ).toBeInTheDocument();

    fireEvent.keyDown(control, { key: ' ' });
    expect(
      useCircuitStore.getState().components.find(({ id }) => id === 'doorbell-button')?.state.on,
    ).toBe(true);
    fireEvent.keyUp(control, { key: ' ' });
    expect(
      useCircuitStore.getState().components.find(({ id }) => id === 'doorbell-button')?.state.on,
    ).toBe(false);
  });

  it('pulses an energised bell only while active load effects are enabled', () => {
    const bell: ComponentInstance = {
      id: 'doorbell',
      type: 'bell',
      x: 320,
      y: 240,
      state: {},
    };
    useCircuitStore.setState({ components: [bell], wires: [] });
    const energised: SimulationResult = {
      energizedComponents: new Set([bell.id]),
      energizedWires: new Set(),
      errorComponents: new Set(),
      errorWires: new Set(),
      errors: [],
      warnings: [],
    };

    const { container, rerender } = render(<TestCanvas simResult={energised} />);
    expect(
      container.querySelector('[data-component-id="doorbell"] .electrasim-bell-pulse'),
    ).toBeInTheDocument();

    act(() => useSettingsStore.setState({ activeLoadEffects: false }));
    rerender(<TestCanvas simResult={energised} />);
    expect(
      container.querySelector('[data-component-id="doorbell"] .electrasim-bell-pulse'),
    ).not.toBeInTheDocument();

    act(() => useSettingsStore.setState({ activeLoadEffects: true }));
    rerender(<TestCanvas simResult={{ ...energised, energizedComponents: new Set<string>() }} />);
    expect(
      container.querySelector('[data-component-id="doorbell"] .electrasim-bell-pulse'),
    ).not.toBeInTheDocument();
  });
});
