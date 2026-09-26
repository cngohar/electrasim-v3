/**
 * topology.test.ts — the port-checked circuit builder (plan §7).
 *
 * The builder is the generator's guard rail: every invariant it enforces is
 * one class of invalid circuit that can never reach the validator.
 */

import { describe, expect, it } from 'vitest';
import { MAX_PORT_FANOUT, createTopologyBuilder } from './topology';

const LINK = { lengthMeters: 3, cableMm2: 1.5 };

function supplyAndLamp() {
  const builder = createTopologyBuilder('t');
  const live = builder.add({ localId: 'live', type: 'live-terminal', column: 0, row: 0 });
  const neutral = builder.add({ localId: 'n', type: 'neutral-terminal', column: 0, row: 1 });
  const lamp = builder.add({ localId: 'lamp', type: 'bulb', column: 1, row: 0 });
  return { builder, live, neutral, lamp };
}

describe('TopologyBuilder — components', () => {
  it('prefixes ids and records placement hints', () => {
    const { builder, lamp } = supplyAndLamp();
    expect(lamp.id).toBe('t-lamp');
    const { placements } = builder.build();
    expect(placements.get('t-lamp')).toEqual({ column: 1, row: 0 });
  });

  it('rejects unknown component types', () => {
    const builder = createTopologyBuilder('t');
    expect(() => builder.add({ localId: 'x', type: 'flux-capacitor', column: 0, row: 0 })).toThrow(
      /unknown component type/,
    );
  });

  it('rejects duplicate component ids', () => {
    const builder = createTopologyBuilder('t');
    builder.add({ localId: 'a', type: 'bulb', column: 0, row: 0 });
    expect(() => builder.add({ localId: 'a', type: 'bulb', column: 1, row: 0 })).toThrow(
      /duplicate component id/,
    );
  });

  it('copies the supplied state instead of aliasing it', () => {
    const builder = createTopologyBuilder('t');
    const state = { on: true };
    builder.add({ localId: 'sw', type: 'single-way-switch', column: 0, row: 0, state });
    state.on = false;
    expect(builder.build().components[0]!.state.on).toBe(true);
  });
});

describe('TopologyBuilder — wires', () => {
  it('connects matching rails and stamps cable metadata', () => {
    const { builder, live, lamp } = supplyAndLamp();
    const wire = builder.connect({
      localId: '0',
      from: live,
      fromPort: 0,
      to: lamp,
      toPort: 0,
      ...LINK,
    });

    expect(wire.id).toBe('t-w-0');
    expect(wire.fromComponentId).toBe(live.id);
    expect(wire.toComponentId).toBe(lamp.id);
    expect(wire.controlPoints).toEqual([]);
    expect(wire.pathKind).toBe('orthogonal');
    expect(wire.lengthMeters).toBe(3);
    expect(wire.customCableMm2).toBe(1.5);
    expect(wire.material).toBe('copper');
    expect(wire.installationMethod).toBe('C');
  });

  it('rounds run lengths to one decimal place', () => {
    const { builder, live, lamp } = supplyAndLamp();
    const wire = builder.connect({
      localId: '0',
      from: live,
      fromPort: 0,
      to: lamp,
      toPort: 0,
      lengthMeters: 3.456_789,
      cableMm2: 1.5,
    });
    expect(wire.lengthMeters).toBe(3.5);
  });

  it('rejects self-loops', () => {
    const { builder, lamp } = supplyAndLamp();
    expect(() =>
      builder.connect({ localId: '0', from: lamp, fromPort: 0, to: lamp, toPort: 1, ...LINK }),
    ).toThrow(/self-loop/);
  });

  it('rejects out-of-range ports', () => {
    const { builder, live, lamp } = supplyAndLamp();
    expect(() =>
      builder.connect({ localId: '0', from: live, fromPort: 9, to: lamp, toPort: 0, ...LINK }),
    ).toThrow(/has no port 9/);
    expect(() =>
      builder.connect({ localId: '1', from: live, fromPort: 0, to: lamp, toPort: 7, ...LINK }),
    ).toThrow(/has no port 7/);
  });

  it('rejects mismatched conductor rails', () => {
    const { builder, live, lamp } = supplyAndLamp();
    // live-terminal[0] is live; bulb[1] is neutral.
    expect(() =>
      builder.connect({ localId: '0', from: live, fromPort: 0, to: lamp, toPort: 1, ...LINK }),
    ).toThrow(/cannot connect live port to neutral port/);
  });

  it('rejects a duplicate wire between the same port pair', () => {
    const { builder, live, lamp } = supplyAndLamp();
    builder.connect({ localId: '0', from: live, fromPort: 0, to: lamp, toPort: 0, ...LINK });
    expect(() =>
      builder.connect({ localId: '1', from: lamp, fromPort: 0, to: live, toPort: 0, ...LINK }),
    ).toThrow(/duplicate wire/);
  });

  it('allows legitimate fan-out from one port', () => {
    const builder = createTopologyBuilder('t');
    const live = builder.add({ localId: 'live', type: 'live-terminal', column: 0, row: 0 });
    for (let i = 0; i < MAX_PORT_FANOUT; i++) {
      const lamp = builder.add({ localId: `lamp${i}`, type: 'bulb', column: 1, row: i });
      builder.connect({ localId: `${i}`, from: live, fromPort: 0, to: lamp, toPort: 0, ...LINK });
    }
    expect(builder.build().wires).toHaveLength(MAX_PORT_FANOUT);
  });

  it('caps fan-out to keep drawings legible', () => {
    const builder = createTopologyBuilder('t');
    const live = builder.add({ localId: 'live', type: 'live-terminal', column: 0, row: 0 });
    for (let i = 0; i < MAX_PORT_FANOUT; i++) {
      const lamp = builder.add({ localId: `lamp${i}`, type: 'bulb', column: 1, row: i });
      builder.connect({ localId: `${i}`, from: live, fromPort: 0, to: lamp, toPort: 0, ...LINK });
    }
    const extra = builder.add({ localId: 'extra', type: 'bulb', column: 1, row: 9 });
    expect(() =>
      builder.connect({ localId: 'x', from: live, fromPort: 0, to: extra, toPort: 0, ...LINK }),
    ).toThrow(/fan-out limit/);
  });

  it('rejects duplicate wire ids', () => {
    const { builder, live, neutral, lamp } = supplyAndLamp();
    builder.connect({ localId: '0', from: live, fromPort: 0, to: lamp, toPort: 0, ...LINK });
    expect(() =>
      builder.connect({ localId: '0', from: neutral, fromPort: 0, to: lamp, toPort: 1, ...LINK }),
    ).toThrow(/duplicate wire id/);
  });
});

describe('TopologyBuilder — output', () => {
  it('reports ids and builds a complete topology', () => {
    const { builder, live, neutral, lamp } = supplyAndLamp();
    builder.connect({ localId: '0', from: live, fromPort: 0, to: lamp, toPort: 0, ...LINK });
    builder.connect({ localId: '1', from: neutral, fromPort: 0, to: lamp, toPort: 1, ...LINK });

    expect(builder.componentIds()).toEqual(['t-live', 't-n', 't-lamp']);
    expect(builder.wireIds()).toEqual(['t-w-0', 't-w-1']);

    const topology = builder.build();
    expect(topology.components).toHaveLength(3);
    expect(topology.wires).toHaveLength(2);
    expect(topology.placements.size).toBe(3);
  });
});
