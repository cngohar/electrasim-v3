/**
 * circuitStore.test.ts — covers the mutators, selection invariants, and the
 * zundo undo/redo wiring (PLAN.md §5: bounded partial-state history).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildSeedCircuit, setMomentarySwitchState, undo, useCircuitStore } from './index';

const reset = () => {
  const seed = buildSeedCircuit();
  useCircuitStore.setState({
    components: seed.components,
    wires: seed.wires,
    globalVoltage: 230,
    selectedComponentId: null,
    selectedWireIds: [],
    selectedComponentIds: [],
  });
  useCircuitStore.temporal.getState().clear();
};

/**
 * The demo benches no longer ship a push button, so momentary-control tests
 * inject one directly (setState, not the undoable action) and clear history
 * so `pastStates` assertions start from a clean slate.
 */
const addTestPushButton = () => {
  const button = {
    id: 'test-push-button',
    type: 'push-button',
    x: 900,
    y: 300,
    state: { on: false },
  };
  useCircuitStore.setState((s) => ({ components: [...s.components, button] }));
  useCircuitStore.temporal.getState().clear();
  return button;
};

beforeEach(reset);
afterEach(reset);

describe('circuitStore — selection', () => {
  it('selectComponent clears wire selection', () => {
    useCircuitStore.setState({ selectedWireIds: ['w-1', 'w-2'] });
    useCircuitStore.getState().selectComponent('comp-1');
    const s = useCircuitStore.getState();
    expect(s.selectedComponentId).toBe('comp-1');
    expect(s.selectedWireIds).toEqual([]);
  });

  it('toggleWireSelection toggles a wire id and clears component selection', () => {
    useCircuitStore.setState({ selectedComponentId: 'c-1' });
    const { toggleWireSelection } = useCircuitStore.getState();
    toggleWireSelection('w-1');
    expect(useCircuitStore.getState().selectedWireIds).toEqual(['w-1']);
    expect(useCircuitStore.getState().selectedComponentId).toBeNull();
    toggleWireSelection('w-1');
    expect(useCircuitStore.getState().selectedWireIds).toEqual([]);
  });

  it('clearSelection wipes both', () => {
    useCircuitStore.setState({
      selectedComponentId: 'c-1',
      selectedWireIds: ['w-1'],
    });
    useCircuitStore.getState().clearSelection();
    const s = useCircuitStore.getState();
    expect(s.selectedComponentId).toBeNull();
    expect(s.selectedWireIds).toEqual([]);
  });
});

describe('circuitStore — mutations', () => {
  it('removeComponent also removes its connected wires', () => {
    const before = useCircuitStore.getState();
    const target = before.components[0]!; // live-terminal
    const wiresOn = before.wires.filter(
      (w) => w.fromComponentId === target.id || w.toComponentId === target.id,
    ).length;
    expect(wiresOn).toBeGreaterThan(0);

    useCircuitStore.getState().removeComponent(target.id);
    const after = useCircuitStore.getState();
    expect(after.components.find((c) => c.id === target.id)).toBeUndefined();
    expect(
      after.wires.some((w) => w.fromComponentId === target.id || w.toComponentId === target.id),
    ).toBe(false);
  });

  it('removeComponent also removes stale multi-selection state', () => {
    const [target, remaining] = useCircuitStore.getState().components;
    useCircuitStore.setState({
      selectedComponentId: target!.id,
      selectedComponentIds: [target!.id, remaining!.id],
    });

    useCircuitStore.getState().removeComponent(target!.id);

    const after = useCircuitStore.getState();
    expect(after.selectedComponentIds).toEqual([remaining!.id]);
    expect(after.selectedComponentId).toBe(remaining!.id);
  });

  it('toggleSwitch flips state.on for switch-like components only', () => {
    const mcb = useCircuitStore.getState().components.find((c) => c.type === 'mcb')!;
    const before = mcb.state.on;
    useCircuitStore.getState().toggleSwitch(mcb.id);
    expect(useCircuitStore.getState().components.find((c) => c.id === mcb.id)?.state.on).toBe(
      !before,
    );

    // Try toggling a load — should be a no-op.
    const bulb = useCircuitStore.getState().components.find((c) => c.type === 'bulb')!;
    const bulbBefore = bulb.state.on;
    useCircuitStore.getState().toggleSwitch(bulb.id);
    expect(useCircuitStore.getState().components.find((c) => c.id === bulb.id)?.state.on).toBe(
      bulbBefore,
    );
  });

  it('sets an explicit switch state without latching momentary controls', () => {
    const mcb = useCircuitStore.getState().components.find((c) => c.type === 'mcb')!;
    useCircuitStore.getState().setSwitchState(mcb.id, false);
    expect(useCircuitStore.getState().components.find((c) => c.id === mcb.id)?.state.on).toBe(
      false,
    );

    const button = addTestPushButton();
    expect(button.state.on).toBe(false);
    useCircuitStore.getState().toggleSwitch(button.id);
    expect(useCircuitStore.getState().components.find((c) => c.id === button.id)?.state.on).toBe(
      false,
    );
  });

  it('keeps momentary press and release out of undo history', () => {
    const button = addTestPushButton();

    expect(setMomentarySwitchState(button.id, true)).toBe(true);
    expect(useCircuitStore.getState().components.find((c) => c.id === button.id)?.state.on).toBe(
      true,
    );
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(0);

    expect(setMomentarySwitchState(button.id, false)).toBe(true);
    expect(useCircuitStore.getState().components.find((c) => c.id === button.id)?.state.on).toBe(
      false,
    );
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(0);
  });

  it('never restores a held momentary state from an undo snapshot', () => {
    const button = addTestPushButton();

    setMomentarySwitchState(button.id, true);
    useCircuitStore.getState().selectComponent(button.id);
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(0);
    useCircuitStore.getState().moveComponent(button.id, button.x + 40, button.y + 20);
    setMomentarySwitchState(button.id, false);

    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(1);
    undo();

    const restored = useCircuitStore.getState().components.find((c) => c.id === button.id)!;
    expect(restored.x).toBe(button.x);
    expect(restored.y).toBe(button.y);
    expect(restored.state.on).toBe(false);
  });

  it('moveComponent updates x/y of the named component', () => {
    const target = useCircuitStore.getState().components[0]!;
    useCircuitStore.getState().moveComponent(target.id, 999, 888);
    const after = useCircuitStore.getState().components.find((c) => c.id === target.id)!;
    expect(after.x).toBe(999);
    expect(after.y).toBe(888);
  });

  it('rejects invalid global supply voltages', () => {
    useCircuitStore.getState().setGlobalSupplyVoltage(Number.NaN);
    useCircuitStore.getState().setGlobalSupplyVoltage(-12);
    expect(useCircuitStore.getState().globalVoltage).toBe(230);
  });
});

describe('circuitStore — undo/redo (zundo)', () => {
  it('records a multi-component position update as one undo entry', () => {
    const [first, second] = useCircuitStore.getState().components;
    expect(first).toBeDefined();
    expect(second).toBeDefined();
    const originals = [
      { id: first!.id, x: first!.x, y: first!.y },
      { id: second!.id, x: second!.x, y: second!.y },
    ];

    useCircuitStore.getState().setComponentPositions([
      { id: first!.id, x: first!.x + 24, y: first!.y + 24 },
      { id: second!.id, x: second!.x + 24, y: second!.y + 24 },
    ]);

    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(1);
    undo();
    for (const original of originals) {
      const component = useCircuitStore
        .getState()
        .components.find((item) => item.id === original.id);
      expect(component).toMatchObject(original);
    }
  });

  it('undoes a toggleSwitch change', () => {
    const mcb = useCircuitStore.getState().components.find((c) => c.type === 'mcb')!;
    const original = mcb.state.on;

    useCircuitStore.getState().toggleSwitch(mcb.id);
    expect(useCircuitStore.getState().components.find((c) => c.id === mcb.id)?.state.on).toBe(
      !original,
    );

    undo();
    expect(useCircuitStore.getState().components.find((c) => c.id === mcb.id)?.state.on).toBe(
      original,
    );
  });

  it('does NOT record selection changes in history', () => {
    const before = useCircuitStore.temporal.getState().pastStates.length;
    useCircuitStore.getState().selectComponent('comp-1');
    useCircuitStore.getState().toggleWireSelection('w-1');
    useCircuitStore.getState().clearSelection();
    const after = useCircuitStore.temporal.getState().pastStates.length;
    expect(after).toBe(before);
  });

  it('undoes global voltage and synchronized source voltage together', () => {
    const source = useCircuitStore
      .getState()
      .components.find((component) => component.type.includes('terminal'))!;

    useCircuitStore.getState().setGlobalSupplyVoltage(120);
    expect(useCircuitStore.getState().globalVoltage).toBe(120);
    expect(
      useCircuitStore.getState().components.find((component) => component.id === source.id)?.state
        .customVoltage,
    ).toBe(120);

    undo();

    expect(useCircuitStore.getState().globalVoltage).toBe(230);
    expect(
      useCircuitStore.getState().components.find((component) => component.id === source.id)?.state
        .customVoltage,
    ).toBe(source.state.customVoltage);
  });

  it('reconciles selection after undo removes a selected component', () => {
    const component = { id: 'temporary', type: 'bulb', x: 10, y: 20, state: {} };
    useCircuitStore.getState().addComponent(component);
    useCircuitStore.getState().selectComponent(component.id);

    undo();

    const state = useCircuitStore.getState();
    expect(state.components.some((item) => item.id === component.id)).toBe(false);
    expect(state.selectedComponentId).toBeNull();
    expect(state.selectedComponentIds).toEqual([]);
  });

  it('undo removes an injected fault and its mirrored component marker together', () => {
    useCircuitStore.setState({ faults: [] });
    const bulb = useCircuitStore.getState().components.find((c) => c.type === 'bulb')!;
    const entriesBefore = useCircuitStore.temporal.getState().pastStates.length;

    useCircuitStore.getState().setComponentFault(bulb.id, 'short-circuit');
    expect(useCircuitStore.getState().faults).toHaveLength(1);
    expect(useCircuitStore.getState().components.find((c) => c.id === bulb.id)?.state.fault).toBe(
      'short-circuit',
    );
    expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(entriesBefore + 1);

    undo();

    // Without `faults` in the temporal partialize the scenario array kept the
    // stale fault while the tracked marker reverted — an invisible ghost that
    // still tripped protection on the next run.
    expect(useCircuitStore.getState().faults).toHaveLength(0);
    expect(
      useCircuitStore.getState().components.find((c) => c.id === bulb.id)?.state.fault,
    ).toBeUndefined();
  });
});

describe('circuitStore — region-aware demo socket swap', () => {
  const socketType = () =>
    useCircuitStore.getState().components.find((c) => c.type.includes('socket'))?.type;

  it('swaps the demo socket to the requested plug type while the circuit is pristine', () => {
    expect(socketType()).toBe('socket-3pin');
    useCircuitStore.getState().swapDemoSocketForPlug('socket-as3112');
    expect(socketType()).toBe('socket-as3112');
  });

  it('keeps swapping as the socket changes (uses current socket as reference)', () => {
    useCircuitStore.getState().swapDemoSocketForPlug('socket-bs546');
    expect(socketType()).toBe('socket-bs546');
    useCircuitStore.getState().swapDemoSocketForPlug('socket-schuko');
    expect(socketType()).toBe('socket-schuko');
  });

  it('does NOT swap once the user has modified the circuit', () => {
    // Toggle a switch so the circuit no longer matches the pristine seed.
    const sw = useCircuitStore.getState().components.find((c) => c.type === 'single-way-switch');
    expect(sw).toBeDefined();
    useCircuitStore.getState().toggleSwitch(sw!.id);
    expect(useCircuitStore.getState().components.find((c) => c.id === sw!.id)?.state.on).toBe(
      false,
    );

    useCircuitStore.getState().swapDemoSocketForPlug('socket-nema');
    expect(socketType()).toBe('socket-3pin'); // unchanged
  });

  it('falls back to the UK socket for an unknown plug socket type', () => {
    useCircuitStore.getState().swapDemoSocketForPlug('not-a-real-socket');
    expect(socketType()).toBe('socket-3pin');
  });
});
