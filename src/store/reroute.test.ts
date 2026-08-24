/**
 * reroute.test.ts — Phase 6.1 wire reroute validation.
 *
 * Exercises `rerouteWire` directly through the circuit store. The tests
 * use the seed circuit so they cover live/neutral/earth port-type checks
 * end-to-end without hand-rolling fixtures.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useCircuitStore } from './circuitStore';
import { buildSeedCircuit } from './seed';

beforeEach(() => {
  useCircuitStore.setState({
    ...buildSeedCircuit(),
    selectedComponentId: null,
    selectedWireIds: [],
  });
});

describe('rerouteWire — Phase 6.1', () => {
  it('moves the TO end of a wire onto another live port', () => {
    const cs = useCircuitStore.getState();
    // Find any live-to-live wire from the seed (live → MCB).
    const live = cs.components.find((c) => c.type === 'live-terminal');
    const mcb = cs.components.find((c) => c.type === 'mcb');
    const rcbo = cs.components.find((c) => c.type === 'rcbo');
    if (!live || !mcb || !rcbo) throw new Error('seed missing components');

    const wire = cs.wires.find((w) => w.fromComponentId === live.id && w.toComponentId === mcb.id);
    if (!wire) throw new Error('seed missing live→mcb wire');

    const ok = useCircuitStore
      .getState()
      .rerouteWire(wire.id, 'to', { componentId: rcbo.id, portIndex: 0 });

    expect(ok).toBe(true);
    const updated = useCircuitStore.getState().wires.find((w) => w.id === wire.id);
    expect(updated?.toComponentId).toBe(rcbo.id);
    expect(updated?.toPortIndex).toBe(0);
  });

  it('rejects a reroute that would mismatch port types (live → neutral)', () => {
    const cs = useCircuitStore.getState();
    const live = cs.components.find((c) => c.type === 'live-terminal');
    const mcb = cs.components.find((c) => c.type === 'mcb');
    const neutral = cs.components.find((c) => c.type === 'neutral-terminal');
    if (!live || !mcb || !neutral) throw new Error('seed missing components');

    const wire = cs.wires.find((w) => w.fromComponentId === live.id && w.toComponentId === mcb.id);
    if (!wire) throw new Error('seed missing live→mcb wire');

    const ok = useCircuitStore
      .getState()
      .rerouteWire(wire.id, 'to', { componentId: neutral.id, portIndex: 0 });

    expect(ok).toBe(false);
    const unchanged = useCircuitStore.getState().wires.find((w) => w.id === wire.id);
    expect(unchanged?.toComponentId).toBe(mcb.id);
  });

  it('rejects rerouting onto the wire’s own other end (would be self-loop)', () => {
    const cs = useCircuitStore.getState();
    const live = cs.components.find((c) => c.type === 'live-terminal');
    const mcb = cs.components.find((c) => c.type === 'mcb');
    if (!live || !mcb) throw new Error('seed missing components');
    const wire = cs.wires.find((w) => w.fromComponentId === live.id && w.toComponentId === mcb.id);
    if (!wire) throw new Error('seed missing live→mcb wire');

    const ok = useCircuitStore
      .getState()
      .rerouteWire(wire.id, 'from', { componentId: mcb.id, portIndex: 0 });

    expect(ok).toBe(false);
  });

  it('rejects reroute on an unknown wire id', () => {
    const ok = useCircuitStore
      .getState()
      .rerouteWire('does-not-exist', 'from', { componentId: 'x', portIndex: 0 });
    expect(ok).toBe(false);
  });
});

describe('selectWire — Phase 6.1', () => {
  it('puts the wire id in selectedWireIds and clears the selected component', () => {
    useCircuitStore.setState({ selectedComponentId: 'something' });
    useCircuitStore.getState().selectWire('w-1');
    const s = useCircuitStore.getState();
    expect(s.selectedWireIds).toEqual(['w-1']);
    expect(s.selectedComponentId).toBeNull();
  });

  it('clearing wire selection passes null', () => {
    useCircuitStore.setState({ selectedWireIds: ['w-1'] });
    useCircuitStore.getState().selectWire(null);
    expect(useCircuitStore.getState().selectedWireIds).toEqual([]);
  });
});
