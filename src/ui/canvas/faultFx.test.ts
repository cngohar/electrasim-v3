/**
 * Unit tests for the fault-FX model: the mapping from circuit fault state to
 * canvas effect descriptors. Rendering lives in FaultFxLayer.tsx; these
 * tests pin the non-destructive design decisions:
 *
 *  - open faults sever *wires visually* (the wire objects stay intact);
 *  - reverse-polarity overlays declared L/N identity; unassessed mappings
 *    retain the original conductor colors.
 */

import {
  type ComponentInstance,
  FAULT_REGISTRY,
  type InjectedFault,
  type WireInstance,
} from '@electrasim/domain';
import { describe, expect, it } from 'vitest';
import {
  collectFaultFx,
  faultFxConfig,
  faultFxSignature,
  severedWireIdSet,
  wiresAttachedTo,
} from './faultFx';

function cause(type: InjectedFault['type'], target: InjectedFault['target']): InjectedFault {
  return {
    id: `${type}-${JSON.stringify(target)}`,
    type,
    target,
    category: FAULT_REGISTRY[type].category,
    createdAt: 0,
  };
}

function comp(id: string, type: string, fault?: ComponentInstance['state']['fault']) {
  return { id, type, x: 0, y: 0, state: fault ? { fault } : {} } as ComponentInstance;
}

function wire(
  id: string,
  fromComponentId: string,
  fromPortIndex: number,
  toComponentId: string,
  toPortIndex: number,
  fault?: WireInstance['fault'],
) {
  return {
    id,
    fromComponentId,
    fromPortIndex,
    toComponentId,
    toPortIndex,
    controlPoints: [],
    ...(fault ? { fault } : {}),
  } as WireInstance;
}

/** supply(L,N,PE) ── w1 ── switch(L·L) ── w2 ── bulb(L·N) ── w3 ── supply(N) */
function buildFixture() {
  const supply = comp('s1', 'ac-mains-supply');
  const sw = comp('sw1', 'single-way-switch');
  const bulb = comp('b1', 'bulb');
  const wires = [
    wire('w1', 's1', 0, 'sw1', 0),
    wire('w2', 'sw1', 1, 'b1', 0),
    wire('w3', 's1', 1, 'b1', 1),
  ];
  return { supply, sw, bulb, wires, components: [supply, sw, bulb] };
}

function byId(components: ComponentInstance[]) {
  return new Map(components.map((c) => [c.id, c]));
}

describe('faultFx model', () => {
  it('produces nothing for a healthy circuit', () => {
    const f = buildFixture();
    expect(
      collectFaultFx({ components: f.components, wires: f.wires }, byId(f.components)),
    ).toEqual([]);
  });

  it('open-circuit on a component severs every attached wire', () => {
    const f = buildFixture();
    f.bulb.state.fault = 'open-circuit';
    const items = collectFaultFx({ components: f.components, wires: f.wires }, byId(f.components));
    expect(items).toHaveLength(1);
    expect(items[0]!.indicator).toBe('sever');
    expect(items[0]!.componentId).toBe('b1');
    expect(new Set(items[0]!.severWireIds)).toEqual(new Set(['w2', 'w3']));
    expect(severedWireIdSet(items)).toEqual(new Set(['w2', 'w3']));
  });

  it('open-neutral severs only the neutral run, leaving live connected', () => {
    const f = buildFixture();
    f.bulb.state.fault = 'open-neutral';
    const items = collectFaultFx({ components: f.components, wires: f.wires }, byId(f.components));
    expect(items[0]!.severWireIds).toEqual(['w3']);
    expect(faultFxConfig('open-neutral').code).toBe('ON');
  });

  it('reverse-polarity swaps each attached run to the opposite identity', () => {
    const f = buildFixture();
    f.bulb.state.fault = 'reverse-polarity';
    const items = collectFaultFx({ components: f.components, wires: f.wires }, byId(f.components));
    expect(items[0]!.indicator).toBe('swap');
    expect(new Map(items[0]!.swapWires.map((s) => [s.id, s.as]))).toEqual(
      new Map([
        ['w2', 'neutral'],
        ['w3', 'live'],
      ]),
    );
  });

  it('keeps unassessed switched-neutral mappings as a badge without inventing conductor identities', () => {
    const f = buildFixture();
    f.sw.state.fault = 'switched-neutral';
    const before = structuredClone(f.wires);
    const items = collectFaultFx({ components: f.components, wires: f.wires }, byId(f.components));
    expect(items[0]!.indicator).toBe('badge');
    expect(items[0]!.swapWires).toEqual([]);
    expect(f.wires).toEqual(before);
  });

  it('reads canonical terminal faults and cuts only wires attached to that exact pin', () => {
    const f = buildFixture();
    const faults = [
      cause('terminal-disconnect', { type: 'port', componentId: 'b1', portIndex: 1 }),
    ];
    const circuit = { components: f.components, wires: f.wires, faults };
    const items = collectFaultFx(circuit, byId(f.components));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      key: 'port:b1:1:terminal-disconnect',
      componentId: 'b1',
      portIndex: 1,
      indicator: 'sever',
      severWireIds: ['w3'],
    });
    expect(severedWireIdSet(items).size).toBe(0);
    expect(f.bulb.state.fault).toBeUndefined();
    faults[0]!.resolved = true;
    expect(collectFaultFx(circuit, byId(f.components))).toEqual([]);
  });

  it('retains separate canonical faults, deduplicates legacy mirrors and changes signature when cleared', () => {
    const f = buildFixture();
    f.bulb.state.fault = 'open-neutral';
    const circuit = {
      components: f.components,
      wires: f.wires,
      faults: [
        cause('open-neutral', { type: 'component', id: 'b1' }),
        cause('open-live', { type: 'wire', id: 'w1' }),
      ],
    };
    const items = collectFaultFx(circuit, byId(f.components));
    expect(items).toHaveLength(2);
    expect(items[1]).toMatchObject({ wireId: 'w1', indicator: 'sever' });
    const signature = faultFxSignature(circuit);
    circuit.faults.pop();
    expect(faultFxSignature(circuit)).not.toBe(signature);
  });

  it('wire-level open faults anchor on the wire itself (no sever list — WireLayer already shows them)', () => {
    const f = buildFixture();
    f.wires[0]!.fault = 'open-circuit';
    const items = collectFaultFx({ components: f.components, wires: f.wires }, byId(f.components));
    expect(items).toHaveLength(1);
    expect(items[0]!.key).toBe('wire:w1:open-circuit');
    expect(items[0]!.wireId).toBe('w1');
    expect(items[0]!.severWireIds).toEqual([]);
  });

  it('every fault kind has a cause marker without inventing unmodeled consequences', () => {
    const byKind = {
      'open-circuit': 'sever',
      'open-neutral': 'sever',
      'short-circuit': 'badge',
      'reverse-polarity': 'swap',
      'switched-neutral': 'badge',
      'earth-fault': 'earth',
      'smooth-dc-residual': 'badge',
      'arc-fault': 'badge',
      'protection-bypass': 'bridge',
      'protection-forced-open': 'jam',
    } as const;
    for (const [fault, indicator] of Object.entries(byKind)) {
      expect(faultFxConfig(fault).indicator, fault).toBe(indicator);
    }
    // Badge codes are unique so indicators are distinguishable at a glance.
    const codes = Object.keys(byKind).map((f) => faultFxConfig(f).code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('wiresAttachedTo reports the conductor role at the component end', () => {
    const f = buildFixture();
    const touches = wiresAttachedTo(f.wires, byId(f.components), 'b1');
    expect(new Map(touches.map((t) => [t.id, t.portType]))).toEqual(
      new Map([
        ['w2', 'live'],
        ['w3', 'neutral'],
      ]),
    );
  });

  it('fault signature tracks only fault state and wiring', () => {
    const f = buildFixture();
    const healthy = faultFxSignature({ components: f.components, wires: f.wires });
    f.bulb.state.fault = 'short-circuit';
    const faulted = faultFxSignature({ components: f.components, wires: f.wires });
    expect(faulted).not.toBe(healthy);
    // Moving a component doesn't change the signature (geometry is resolved
    // live at render time).
    f.bulb.x = 500;
    expect(faultFxSignature({ components: f.components, wires: f.wires })).toBe(faulted);
  });
});
