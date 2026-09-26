/**
 * simulation.test.ts — Behavioural coverage for the pure simulation engine.
 *
 * These tests serve two purposes:
 *   1. Lock in the legacy behaviour (so future engine/Worker changes
 *      can't regress the user-visible simulation outcome).
 *   2. Document the intended semantics of every component flag (isSwitch,
 *      isLoad, isSource, isPassThrough, isJunction, isSocket).
 *
 * Test fixtures are built with small helpers to keep each scenario readable.
 */

import { describe, expect, it } from 'vitest';
import { simulate } from './simulation';
import type { Circuit, ComponentInstance, WireInstance } from './types';

// ─── Tiny circuit-builder DSL ──────────────────────────────────────────────

let nextId = 0;
const uid = (prefix: string) => `${prefix}${++nextId}`;

const C = (type: string, state: ComponentInstance['state'] = {}): ComponentInstance => ({
  id: uid(`${type.replace(/[^a-z]/gi, '').slice(0, 4)}-`),
  type,
  x: 0,
  y: 0,
  state,
});

const W = (
  from: { c: ComponentInstance; p: number },
  to: { c: ComponentInstance; p: number },
): WireInstance => ({
  id: uid('w-'),
  fromComponentId: from.c.id,
  fromPortIndex: from.p,
  toComponentId: to.c.id,
  toPortIndex: to.p,
  controlPoints: [],
});

const circuit = (components: ComponentInstance[], wires: WireInstance[]): Circuit => ({
  components,
  wires,
});

// ─── Empty / degenerate inputs ─────────────────────────────────────────────

describe('simulate — degenerate inputs', () => {
  it('returns an empty result for an empty circuit (no warnings either)', () => {
    const r = simulate({ components: [], wires: [] });
    expect(r.energizedComponents.size).toBe(0);
    expect(r.energizedWires.size).toBe(0);
    expect(r.errorComponents.size).toBe(0);
    expect(r.errorWires.size).toBe(0);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('warns when the live source is missing', () => {
    const n = C('neutral-terminal');
    const r = simulate(circuit([n], []));
    expect(r.warnings).toContain('No Live source found.');
    expect(r.warnings).not.toContain('No Neutral source found.');
  });

  it('warns when the neutral source is missing', () => {
    const l = C('live-terminal');
    const r = simulate(circuit([l], []));
    expect(r.warnings).toContain('No Neutral source found.');
    expect(r.warnings).not.toContain('No Live source found.');
  });
});

// ─── Smallest functional circuit: Live → Bulb ← Neutral ─────────────────────

describe('simulate — minimal lit bulb', () => {
  it('energises a bulb wired directly between live and neutral', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb');
    const w1 = W({ c: l, p: 0 }, { c: b, p: 0 }); // L-out → bulb.L
    const w2 = W({ c: n, p: 0 }, { c: b, p: 1 }); // N-out → bulb.N

    const r = simulate(circuit([l, n, b], [w1, w2]));

    expect(r.energizedComponents.has(b.id)).toBe(true);
    expect(r.energizedWires.has(w1.id)).toBe(true);
    expect(r.energizedWires.has(w2.id)).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.warnings).toEqual([]);
  });

  it('does NOT energise the bulb if the neutral wire is missing', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb');
    const w1 = W({ c: l, p: 0 }, { c: b, p: 0 });
    // No neutral wire.

    const r = simulate(circuit([l, n, b], [w1]));

    expect(r.energizedComponents.has(b.id)).toBe(false);
    // The live wire still lights up so the user sees half-circuit feedback.
    expect(r.energizedWires.has(w1.id)).toBe(true);
  });
});

// ─── Multiple independent supply groups ───────────────────────────────────

describe('simulate — multiple sources', () => {
  it('traverses every live and neutral source, not only the first pair', () => {
    const l1 = C('live-terminal');
    const n1 = C('neutral-terminal');
    const l2 = C('live-terminal');
    const n2 = C('neutral-terminal');
    const b = C('bulb');
    const wires = [W({ c: l2, p: 0 }, { c: b, p: 0 }), W({ c: n2, p: 0 }, { c: b, p: 1 })];

    const r = simulate(circuit([l1, n1, l2, n2, b], wires));

    expect(r.energizedComponents.has(b.id)).toBe(true);
    expect(r.energizedWires).toEqual(new Set(wires.map((wire) => wire.id)));
  });

  it('uses every rail exposed by a combined mains supply', () => {
    const supply = C('ac-mains-supply', { customVoltage: 230 });
    const bulb = C('bulb');
    const wires = [
      W({ c: supply, p: 0 }, { c: bulb, p: 0 }),
      W({ c: supply, p: 1 }, { c: bulb, p: 1 }),
    ];

    const result = simulate(circuit([supply, bulb], wires));

    expect(result.energizedComponents.has(bulb.id)).toBe(true);
    expect(result.warnings).not.toContain('No Neutral source found.');
  });
});

// ─── Switches: open vs closed ──────────────────────────────────────────────

describe('simulate — switch behaviour', () => {
  it('energises the bulb when a 1-way switch is ON', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const sw = C('single-way-switch', { on: true });
    const b = C('bulb');

    const wires = [
      W({ c: l, p: 0 }, { c: sw, p: 0 }), // L → SW.in
      W({ c: sw, p: 1 }, { c: b, p: 0 }), // SW.out → bulb.L
      W({ c: n, p: 0 }, { c: b, p: 1 }), // N → bulb.N
    ];
    const r = simulate(circuit([l, n, sw, b], wires));
    expect(r.energizedComponents.has(b.id)).toBe(true);
  });

  it('does NOT energise the bulb when the switch is OFF', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const sw = C('single-way-switch', { on: false });
    const b = C('bulb');

    const wires = [
      W({ c: l, p: 0 }, { c: sw, p: 0 }),
      W({ c: sw, p: 1 }, { c: b, p: 0 }),
      W({ c: n, p: 0 }, { c: b, p: 1 }),
    ];
    const r = simulate(circuit([l, n, sw, b], wires));
    expect(r.energizedComponents.has(b.id)).toBe(false);

    // The wire on the live side OF the switch should still be carrying live
    // (from L to SW.in), but the wire on the far side should NOT.
    expect(r.energizedWires.has(wires[0]!.id)).toBe(true);
    expect(r.energizedWires.has(wires[1]!.id)).toBe(false);
  });

  it.each([
    [true, true, true],
    [true, false, false],
    [false, true, false],
    [false, false, true],
  ])(
    'models two-way positions A=%s, B=%s with expected bulb state %s',
    (switchAOn, switchBOn, expectedEnergised) => {
      const l = C('live-terminal');
      const n = C('neutral-terminal');
      const switchA = C('two-way-switch', { on: switchAOn });
      const switchB = C('two-way-switch', { on: switchBOn });
      const b = C('bulb');
      const liveIn = W({ c: l, p: 0 }, { c: switchA, p: 0 });
      const travellerL1 = W({ c: switchA, p: 1 }, { c: switchB, p: 1 });
      const travellerL2 = W({ c: switchA, p: 2 }, { c: switchB, p: 2 });
      const liveOut = W({ c: switchB, p: 0 }, { c: b, p: 0 });
      const neutral = W({ c: n, p: 0 }, { c: b, p: 1 });

      const r = simulate(
        circuit([l, n, switchA, switchB, b], [liveIn, travellerL1, travellerL2, liveOut, neutral]),
      );

      expect(r.energizedComponents.has(b.id)).toBe(expectedEnergised);
      expect(r.energizedWires.has(travellerL1.id)).toBe(switchAOn);
      expect(r.energizedWires.has(travellerL2.id)).toBe(!switchAOn);
    },
  );
});

// ─── Pass-through devices: junction box, MCB, fuse ─────────────────────────

describe('simulate — pass-through devices', () => {
  it('a junction box fans out live to multiple branches', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const jb = C('junction-box');
    const b1 = C('bulb');
    const b2 = C('bulb');

    const wires = [
      W({ c: l, p: 0 }, { c: jb, p: 0 }), // L → JB.in
      W({ c: jb, p: 1 }, { c: b1, p: 0 }), // JB.out1 → bulb1.L
      W({ c: jb, p: 2 }, { c: b2, p: 0 }), // JB.out2 → bulb2.L
      W({ c: n, p: 0 }, { c: b1, p: 1 }),
      W({ c: n, p: 0 }, { c: b2, p: 1 }),
    ];
    const r = simulate(circuit([l, n, jb, b1, b2], wires));
    expect(r.energizedComponents.has(b1.id)).toBe(true);
    expect(r.energizedComponents.has(b2.id)).toBe(true);
  });

  it('an ON MCB carries live through; an OFF MCB blocks the branch', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const mcb = C('mcb', { on: true });
    const b = C('bulb');

    const wires = [
      W({ c: l, p: 0 }, { c: mcb, p: 0 }),
      W({ c: mcb, p: 1 }, { c: b, p: 0 }),
      W({ c: n, p: 0 }, { c: b, p: 1 }),
    ];
    const onResult = simulate(circuit([l, n, mcb, b], wires));
    expect(onResult.energizedComponents.has(b.id)).toBe(true);

    mcb.state = { on: false };
    const offResult = simulate(circuit([l, n, mcb, b], wires));
    expect(offResult.energizedComponents.has(b.id)).toBe(false);
  });

  it('a tripped breaker remains electrically open until reset', () => {
    const live = C('live-terminal');
    const neutral = C('neutral-terminal');
    const breaker = C('mcb', { on: true, isTripped: true });
    const bulb = C('bulb');
    const wires = [
      W({ c: live, p: 0 }, { c: breaker, p: 0 }),
      W({ c: breaker, p: 1 }, { c: bulb, p: 0 }),
      W({ c: neutral, p: 0 }, { c: bulb, p: 1 }),
    ];

    const result = simulate(circuit([live, neutral, breaker, bulb], wires));

    expect(result.energizedComponents.has(bulb.id)).toBe(false);
    expect(result.energizedWires.has(wires[1]!.id)).toBe(false);
  });

  it('an RCBO switches Live and Neutral together', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const rcbo = C('rcbo', { on: true });
    const b = C('bulb');
    const wires = [
      W({ c: l, p: 0 }, { c: rcbo, p: 0 }),
      W({ c: n, p: 0 }, { c: rcbo, p: 1 }),
      W({ c: rcbo, p: 2 }, { c: b, p: 0 }),
      W({ c: rcbo, p: 3 }, { c: b, p: 1 }),
    ];

    expect(simulate(circuit([l, n, rcbo, b], wires)).energizedComponents.has(b.id)).toBe(true);

    rcbo.state.on = false;
    const openResult = simulate(circuit([l, n, rcbo, b], wires));
    expect(openResult.energizedComponents.has(b.id)).toBe(false);
    expect(openResult.energizedWires.has(wires[2]!.id)).toBe(false);
    expect(openResult.energizedWires.has(wires[3]!.id)).toBe(false);
  });

  it('only energises a load while a push button is pressed', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const button = C('push-button', { on: false });
    const bell = C('bell');
    const wires = [
      W({ c: l, p: 0 }, { c: button, p: 0 }),
      W({ c: button, p: 1 }, { c: bell, p: 0 }),
      W({ c: n, p: 0 }, { c: bell, p: 1 }),
    ];

    expect(simulate(circuit([l, n, button, bell], wires)).energizedComponents.has(bell.id)).toBe(
      false,
    );
    button.state.on = true;
    expect(simulate(circuit([l, n, button, bell], wires)).energizedComponents.has(bell.id)).toBe(
      true,
    );
  });
});

// ─── Short-circuit detection ───────────────────────────────────────────────

describe('simulate — fault detection', () => {
  it('reports a direct Live-to-Neutral wire as a short circuit', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const short = W({ c: l, p: 0 }, { c: n, p: 0 });

    const result = simulate(circuit([l, n], [short]));

    expect(result.errors).toContain('Short circuit — Live and Neutral are directly connected.');
    expect(result.errorWires).toEqual(new Set([short.id]));
    expect(result.errorComponents).toEqual(new Set([l.id, n.id]));
  });

  it('detects opposite rails meeting through separate wires at one terminal', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb');
    const liveWire = W({ c: l, p: 0 }, { c: b, p: 0 });
    const neutralWire = W({ c: n, p: 0 }, { c: b, p: 0 });

    const result = simulate(circuit([l, n, b], [liveWire, neutralWire]));

    expect(result.errors).toContain('Short circuit — Live and Neutral are directly connected.');
    expect(result.errorComponents.has(b.id)).toBe(true);
    expect(result.errorWires).toEqual(new Set([liveWire.id, neutralWire.id]));
  });

  it('follows the entered conductor channel after a cross-typed connection', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const rcd = C('rcd', { on: true });
    const crossTypedWire = W({ c: l, p: 0 }, { c: rcd, p: 1 });
    const neutralWire = W({ c: rcd, p: 3 }, { c: n, p: 0 });

    const result = simulate(circuit([l, n, rcd], [crossTypedWire, neutralWire]));

    expect(result.errors).toContain('Short circuit — Live and Neutral are directly connected.');
    expect(result.errorWires).toEqual(new Set([crossTypedWire.id, neutralWire.id]));
  });

  it('detects a conductor shunting a load without propagating through the load body', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb');
    const liveWire = W({ c: l, p: 0 }, { c: b, p: 0 });
    const neutralWire = W({ c: n, p: 0 }, { c: b, p: 1 });
    const shunt = W({ c: b, p: 0 }, { c: b, p: 1 });

    const result = simulate(circuit([l, n, b], [liveWire, neutralWire, shunt]));

    expect(result.errors).toContain('Short circuit — Live and Neutral are directly connected.');
    expect(result.errorWires).toEqual(new Set([liveWire.id, neutralWire.id, shunt.id]));
  });

  it('treats a melted wire as an open conductor', () => {
    const live = C('live-terminal');
    const neutral = C('neutral-terminal');
    const bulb = C('bulb');
    const liveWire = W({ c: live, p: 0 }, { c: bulb, p: 0 });
    const neutralWire = W({ c: neutral, p: 0 }, { c: bulb, p: 1 });
    liveWire.isBusted = true;

    const result = simulate(circuit([live, neutral, bulb], [liveWire, neutralWire]));

    expect(result.energizedComponents.has(bulb.id)).toBe(false);
    expect(result.energizedWires.has(liveWire.id)).toBe(false);
  });

  it('does not report an incomplete cross-typed connection as a short', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb');
    const misplacedLive = W({ c: l, p: 0 }, { c: b, p: 1 });

    const result = simulate(circuit([l, n, b], [misplacedLive]));

    expect(result.errors).toEqual([]);
    expect(result.errorComponents.size).toBe(0);
    expect(result.errorWires.size).toBe(0);
  });

  it('keeps valid Live and Neutral channels isolated inside mixed-rail protection', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const rcd = C('rcd', { on: true });
    const b = C('bulb');
    const wires = [
      W({ c: l, p: 0 }, { c: rcd, p: 0 }),
      W({ c: rcd, p: 2 }, { c: b, p: 0 }),
      W({ c: n, p: 0 }, { c: rcd, p: 1 }),
      W({ c: rcd, p: 3 }, { c: b, p: 1 }),
    ];

    const result = simulate(circuit([l, n, rcd, b], wires));

    expect(result.energizedComponents.has(b.id)).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.errorComponents.size).toBe(0);
    expect(result.errorWires.size).toBe(0);
  });
});

describe('simulate — faultsCleared flag', () => {
  it('is true for a healthy energised circuit and for an empty circuit', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb');
    const healthy = simulate(
      circuit([l, n, b], [W({ c: l, p: 0 }, { c: b, p: 0 }), W({ c: n, p: 0 }, { c: b, p: 1 })]),
    );
    expect(healthy.energizedComponents.has(b.id)).toBe(true);
    expect(healthy.faultsCleared).toBe(true);

    expect(simulate(circuit([], [])).faultsCleared).toBe(true);
  });

  it('is false while a short circuit or open wire is present', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const short = W({ c: l, p: 0 }, { c: n, p: 0 });
    expect(simulate(circuit([l, n], [short])).faultsCleared).toBe(false);

    const b = C('bulb');
    const broken = W({ c: b, p: 0 }, { c: b, p: 1 });
    broken.fault = 'open-circuit';
    expect(simulate(circuit([b], [broken])).faultsCleared).toBe(false);
  });

  it('still clears when only warnings are present (e.g. missing live source)', () => {
    const n = C('neutral-terminal');
    expect(simulate(circuit([n], [])).faultsCleared).toBe(true);
  });
});

// ─── Indexing / perf invariants ────────────────────────────────────────────

describe('simulate — invariants', () => {
  it('produces deterministic output across repeated calls (idempotent)', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const sw = C('single-way-switch', { on: true });
    const b = C('bulb');
    const wires = [
      W({ c: l, p: 0 }, { c: sw, p: 0 }),
      W({ c: sw, p: 1 }, { c: b, p: 0 }),
      W({ c: n, p: 0 }, { c: b, p: 1 }),
    ];
    const c = circuit([l, n, sw, b], wires);

    const a = simulate(c);
    const bRes = simulate(c);

    expect(a.energizedComponents.size).toBe(bRes.energizedComponents.size);
    expect(a.energizedWires.size).toBe(bRes.energizedWires.size);
    expect(a.errorComponents.size).toBe(bRes.errorComponents.size);
  });

  it('handles a moderately large circuit without throwing (perf smoke)', () => {
    // 1 live + 1 neutral + 50 bulbs in parallel = 52 components, 100 wires.
    const live = C('live-terminal');
    const neut = C('neutral-terminal');
    const bulbs: ComponentInstance[] = [];
    const wires: WireInstance[] = [];
    for (let i = 0; i < 50; i++) {
      const b = C('bulb');
      bulbs.push(b);
      wires.push(W({ c: live, p: 0 }, { c: b, p: 0 }));
      wires.push(W({ c: neut, p: 0 }, { c: b, p: 1 }));
    }

    const t0 = performance.now();
    const r = simulate(circuit([live, neut, ...bulbs], wires));
    const elapsed = performance.now() - t0;

    expect(r.energizedComponents.size).toBe(50);
    // Ample headroom; the real Phase-4 SLO is < 8 ms for 200 comps.
    expect(elapsed).toBeLessThan(50);
  });
});

// ─── Fault → protection device operation ─────────────────────────────────────

describe('simulate — faults operate upstream protection', () => {
  it('trips the inline MCB on a topology-level bolted Live–Neutral short', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const mcb = C('mcb', { on: true });
    // Live → MCB in, MCB out → Neutral output port ⇒ both rails meet at n:0
    const w1 = W({ c: l, p: 0 }, { c: mcb, p: 0 });
    const w2 = W({ c: mcb, p: 1 }, { c: n, p: 0 });

    const result = simulate(circuit([l, n, mcb], [w1, w2]));

    const trips = result.trippedComponents ?? [];
    expect(trips.map((t) => t.id)).toContain(mcb.id);
    expect(trips.find((t) => t.id === mcb.id)?.reason).toBe('short-circuit');
    expect(result.errors.some((e) => e.includes('TRIPPED'))).toBe(true);
  });

  it('trips the MCB guarding a component with an injected short-circuit fault', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const mcb = C('mcb', { on: true });
    const bulb = C('bulb', { fault: 'short-circuit' });
    const w1 = W({ c: l, p: 0 }, { c: mcb, p: 0 });
    const w2 = W({ c: mcb, p: 1 }, { c: bulb, p: 0 });
    const w3 = W({ c: n, p: 0 }, { c: bulb, p: 1 });

    const result = simulate(circuit([l, n, mcb, bulb], [w1, w2, w3]));

    const trips = result.trippedComponents ?? [];
    expect(trips.map((t) => t.id)).toContain(mcb.id);
  });

  it('does not trip protective devices on an isolated, separate network', () => {
    // Network A: live, mcbA, shorted bulb, neutral.
    const la = C('live-terminal');
    const na = C('neutral-terminal');
    const mcbA = C('mcb');
    const bulbA = C('bulb', { fault: 'short-circuit' });
    // Network B: completely separate healthy circuit with its own MCB + RCD.
    const lb = C('live-terminal');
    const nb = C('neutral-terminal');
    const mcbB = C('mcb');
    const rcdB = C('rcd');
    const bulbB = C('bulb');
    const wires = [
      W({ c: la, p: 0 }, { c: mcbA, p: 0 }),
      W({ c: mcbA, p: 1 }, { c: bulbA, p: 0 }),
      W({ c: na, p: 0 }, { c: bulbA, p: 1 }),
      W({ c: lb, p: 0 }, { c: mcbB, p: 0 }),
      W({ c: mcbB, p: 1 }, { c: bulbB, p: 0 }),
      W({ c: nb, p: 0 }, { c: rcdB, p: 1 }),
      W({ c: rcdB, p: 3 }, { c: bulbB, p: 1 }),
    ];

    const result = simulate(circuit([la, na, mcbA, bulbA, lb, nb, mcbB, rcdB, bulbB], wires));

    const tripIds = (result.trippedComponents ?? []).map((t) => t.id);
    expect(tripIds).toContain(mcbA.id);
    expect(tripIds).not.toContain(mcbB.id);
    expect(tripIds).not.toContain(rcdB.id);
  });

  it('earth leakage trips only the RCD/RCBO in the same network', () => {
    const la = C('live-terminal');
    const na = C('neutral-terminal');
    const rcd = C('rcd');
    const bulbA = C('bulb', { fault: 'live-to-earth' });
    const lb = C('live-terminal');
    const nb = C('neutral-terminal');
    const rcdIsolated = C('rcd');
    const bulbB = C('bulb');
    const wires = [
      W({ c: la, p: 0 }, { c: rcd, p: 0 }),
      W({ c: na, p: 0 }, { c: rcd, p: 1 }),
      W({ c: rcd, p: 2 }, { c: bulbA, p: 0 }),
      W({ c: rcd, p: 3 }, { c: bulbA, p: 1 }),
      W({ c: lb, p: 0 }, { c: bulbB, p: 0 }),
      W({ c: nb, p: 0 }, { c: rcdIsolated, p: 1 }),
      W({ c: rcdIsolated, p: 3 }, { c: bulbB, p: 1 }),
    ];

    const result = simulate(circuit([la, na, rcd, bulbA, lb, nb, rcdIsolated, bulbB], wires));

    const tripIds = (result.trippedComponents ?? []).map((t) => t.id);
    expect(tripIds).toContain(rcd.id);
    expect(tripIds).not.toContain(rcdIsolated.id);
  });

  it('preserves device residual ratings across profiles and does not report IEC timing as US timing', () => {
    const build = (standard: 'uk' | 'us') => {
      const l = C('live-terminal');
      const n = C('neutral-terminal');
      const rcd = C('rcd');
      const bulb = C('bulb', { fault: 'earth-fault' });
      const wires = [
        W({ c: l, p: 0 }, { c: rcd, p: 0 }),
        W({ c: n, p: 0 }, { c: rcd, p: 1 }),
        W({ c: rcd, p: 2 }, { c: bulb, p: 0 }),
        W({ c: rcd, p: 3 }, { c: bulb, p: 1 }),
      ];
      return simulate(circuit([l, n, rcd, bulb], wires), { standard });
    };

    const ukResult = build('uk');
    const usResult = build('us');

    // Both trip the residual device on the earth fault.
    expect((ukResult.trippedComponents ?? []).map((t) => t.id)).toContainEqual(
      expect.stringMatching(/rcd-/),
    );
    expect((usResult.trippedComponents ?? []).map((t) => t.id)).toContainEqual(
      expect.stringMatching(/rcd-/),
    );

    // Selecting a profile must not turn this 30 mA RCD into a 6 mA GFCI.
    expect(ukResult.errors.some((e) => e.includes('RCD') && e.includes('30 mA'))).toBe(true);
    expect(usResult.errors.some((e) => e.includes('30 mA') && e.includes('not assessed'))).toBe(
      true,
    );

    // Both contexts retain the actual device rating.
    const ukTrip = (ukResult.trippedComponents ?? []).find((t) => t.reason === 'ground-fault');
    const usTrip = (usResult.trippedComponents ?? []).find((t) => t.reason === 'ground-fault');
    expect(ukTrip?.ratingAmps).toBe(0.03); // 30 mA
    expect(usTrip?.ratingAmps).toBe(0.03);
    expect(usTrip?.clearingTimeSeconds).toBeUndefined();
    expect(ukTrip?.clearingTimeSeconds).toBeDefined();
  });

  it('scales prospective short-circuit fault current by the region supply voltage', () => {
    const build = (voltage: number, standard: 'uk' | 'us') => {
      const l = C('live-terminal');
      const n = C('neutral-terminal');
      const mcb = C('mcb');
      const bulb = C('bulb', { fault: 'short-circuit' });
      const wires = [
        W({ c: l, p: 0 }, { c: mcb, p: 0 }),
        W({ c: mcb, p: 1 }, { c: bulb, p: 0 }),
        W({ c: n, p: 0 }, { c: bulb, p: 1 }),
      ];
      return simulate(
        { components: [l, n, mcb, bulb], wires, globalVoltage: voltage },
        { standard, appMode: 'basic' },
      );
    };

    const uk230 = build(230, 'uk');
    const us120 = build(120, 'us');

    const ukTrip = (uk230.trippedComponents ?? []).find((t) => t.reason === 'short-circuit');
    const usTrip = (us120.trippedComponents ?? []).find((t) => t.reason === 'short-circuit');

    // Prospective = supply / 0.5 Ω fault loop → 460 A @ 230 V, 240 A @ 120 V.
    expect(ukTrip?.currentAmps).toBe(460);
    expect(usTrip?.currentAmps).toBe(240);
    expect(ukTrip!.currentAmps).toBeGreaterThan(usTrip!.currentAmps);
  });

  it('tags every fault-naming trip message so Diagnosis mode can withhold it (regression §14)', () => {
    // Regression: the fault-driven protection-trip messages ("TRIPPED: bolted
    // short circuit…") were pushed as plain errors, so the Diagnosis Lab could
    // not withhold them and the answer leaked into the console.
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const mcb = C('mcb');
    const bulb = C('bulb', { fault: 'short-circuit' });
    const wires = [
      W({ c: l, p: 0 }, { c: mcb, p: 0 }),
      W({ c: mcb, p: 1 }, { c: bulb, p: 0 }),
      W({ c: n, p: 0 }, { c: bulb, p: 1 }),
    ];
    const result = simulate(circuit([l, n, mcb, bulb], wires));

    const tagged = new Set(result.faultNarrationErrors ?? []);
    const namingErrors = result.errors
      .map((message, index) => ({ message, index }))
      .filter(({ message }) =>
        /bolted short circuit|residual leakage|arc-fault signature/i.test(message),
      );
    expect(namingErrors.length).toBeGreaterThan(0);
    for (const { index } of namingErrors) {
      expect(tagged.has(index), `error index ${index} must be tagged`).toBe(true);
    }
  });
});

describe('simulate — smooth DC residual blinding (RCD type selection)', () => {
  /** live → rcbo → bulb(+fault) with neutral → rcbo → bulb. */
  const dcCircuit = (rcdType: 'AC' | 'A' | 'F' | 'B') => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const rcbo = C('rcbo', { on: true, rcdType });
    const bulb = C('bulb', { fault: 'smooth-dc-residual' });
    const wires = [
      W({ c: l, p: 0 }, { c: rcbo, p: 0 }),
      W({ c: n, p: 0 }, { c: rcbo, p: 1 }),
      W({ c: rcbo, p: 2 }, { c: bulb, p: 0 }),
      W({ c: rcbo, p: 3 }, { c: bulb, p: 1 }),
    ];
    return { rcbo, result: simulate(circuit([l, n, rcbo, bulb], wires)) };
  };

  it.each(['AC', 'A', 'F'] as const)(
    'Type %s stays closed on smooth DC — with a blinded warning',
    (rcdType) => {
      const { rcbo, result } = dcCircuit(rcdType);

      expect((result.trippedComponents ?? []).map((t) => t.id)).not.toContain(rcbo.id);
      expect(
        result.errors.some((e) => e.includes(`Type ${rcdType}`) && e.includes('DID NOT TRIP')),
      ).toBe(true);
    },
  );

  it('Type B detects the smooth DC residual and trips (BS EN 62423)', () => {
    const { rcbo, result } = dcCircuit('B');

    const trips = result.trippedComponents ?? [];
    expect(trips.map((t) => t.id)).toContain(rcbo.id);
    expect(trips.find((t) => t.id === rcbo.id)?.reason).toBe('ground-fault');
    expect(result.errors.some((e) => e.includes('DID NOT TRIP'))).toBe(false);
  });

  it('smooth DC residual defaults to Type A when rcdType is unset', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const rcbo = C('rcbo', { on: true }); // no rcdType → legacy state
    const bulb = C('bulb', { fault: 'smooth-dc-residual' });
    const wires = [
      W({ c: l, p: 0 }, { c: rcbo, p: 0 }),
      W({ c: n, p: 0 }, { c: rcbo, p: 1 }),
      W({ c: rcbo, p: 2 }, { c: bulb, p: 0 }),
      W({ c: rcbo, p: 3 }, { c: bulb, p: 1 }),
    ];

    const result = simulate(circuit([l, n, rcbo, bulb], wires));

    expect((result.trippedComponents ?? []).map((t) => t.id)).not.toContain(rcbo.id);
    expect(result.errors.some((e) => e.includes('Type A') && e.includes('DID NOT TRIP'))).toBe(
      true,
    );
  });
});

describe('simulate — arc fault detection (BS EN 62606 / Reg 421.1.7)', () => {
  /** live → [protection] → bulb(+fault) with neutral return. */
  const arcCircuit = (protectionType: 'afdd' | 'mcb' | 'rcbo', rcdType?: 'A' | 'B') => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const prot = C(protectionType, { on: true, ...(rcdType ? { rcdType } : {}) });
    const bulb = C('bulb', { fault: 'arc-fault' });
    // Two-pole devices guard L and N; a 2-port MCB interrupts the live leg
    // only (wiring it as 4-pole would bridge live into neutral — a REAL
    // bolted short, which is exactly what the engine reported before).
    const wires =
      protectionType === 'mcb'
        ? [
            W({ c: l, p: 0 }, { c: prot, p: 0 }),
            W({ c: prot, p: 1 }, { c: bulb, p: 0 }),
            W({ c: n, p: 0 }, { c: bulb, p: 1 }),
          ]
        : [
            W({ c: l, p: 0 }, { c: prot, p: 0 }),
            W({ c: n, p: 0 }, { c: prot, p: 1 }),
            W({ c: prot, p: 2 }, { c: bulb, p: 0 }),
            W({ c: prot, p: 3 }, { c: bulb, p: 1 }),
          ];
    return { prot, result: simulate(circuit([l, n, prot, bulb], wires)) };
  };

  it('an AFDD trips on an arc fault in its network', () => {
    const { prot, result } = arcCircuit('afdd');

    const trips = result.trippedComponents ?? [];
    expect(trips.map((t) => t.id)).toContain(prot.id);
    expect(trips.find((t) => t.id === prot.id)?.reason).toBe('arc-fault');
    expect(result.errors.some((e) => e.includes('BS EN 62606'))).toBe(true);
  });

  it('an MCB-only network stays closed on an arc and reports the missing AFDD', () => {
    const { prot, result } = arcCircuit('mcb');

    expect((result.trippedComponents ?? []).map((t) => t.id)).not.toContain(prot.id);
    expect(result.errors.some((e) => e.includes('NO AFDD'))).toBe(true);
    expect(result.errors.some((e) => e.includes('check arc-fault protection requirements'))).toBe(
      true,
    );
  });

  it('an RCBO (no arc detection) also stays closed on an arc', () => {
    const { prot, result } = arcCircuit('rcbo');

    expect((result.trippedComponents ?? []).map((t) => t.id)).not.toContain(prot.id);
    expect(result.errors.some((e) => e.includes('NO AFDD'))).toBe(true);
  });

  it('an AFDD still trips on earth leakage, like any 30 mA residual device', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const afdd = C('afdd', { on: true });
    const bulb = C('bulb', { fault: 'earth-fault' });
    const wires = [
      W({ c: l, p: 0 }, { c: afdd, p: 0 }),
      W({ c: n, p: 0 }, { c: afdd, p: 1 }),
      W({ c: afdd, p: 2 }, { c: bulb, p: 0 }),
      W({ c: afdd, p: 3 }, { c: bulb, p: 1 }),
    ];

    const result = simulate(circuit([l, n, afdd, bulb], wires));

    const trips = result.trippedComponents ?? [];
    expect(trips.map((t) => t.id)).toContain(afdd.id);
    expect(trips.find((t) => t.id === afdd.id)?.reason).toBe('ground-fault');
  });

  it('an AFDD honours its RCD type — Type A blinded by smooth DC, Type B trips', () => {
    const blinded = arcCircuitRcdd('A');
    expect((blinded.result.trippedComponents ?? []).map((t) => t.id)).not.toContain(
      blinded.prot.id,
    );
    expect(
      blinded.result.errors.some((e) => e.includes('Type A') && e.includes('DID NOT TRIP')),
    ).toBe(true);

    const sensitive = arcCircuitRcdd('B');
    expect((sensitive.result.trippedComponents ?? []).map((t) => t.id)).toContain(
      sensitive.prot.id,
    );
  });

  function arcCircuitRcdd(rcdType: 'A' | 'B') {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const prot = C('afdd', { on: true, rcdType });
    const bulb = C('bulb', { fault: 'smooth-dc-residual' });
    const wires = [
      W({ c: l, p: 0 }, { c: prot, p: 0 }),
      W({ c: n, p: 0 }, { c: prot, p: 1 }),
      W({ c: prot, p: 2 }, { c: bulb, p: 0 }),
      W({ c: prot, p: 3 }, { c: bulb, p: 1 }),
    ];
    return { prot, result: simulate(circuit([l, n, prot, bulb], wires)) };
  }
});

// ─── IEC 60898-1 / 61008-1 trip curves in the engine ───────────────────────

describe('simulate — protection operates to its published curve', () => {
  /** Live → MCB → load → Neutral, with the MCB's rating overridden. */
  function overloadCircuit(loadWatts: number, breakerAmps: number, type = 'mcb') {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const cb = C(type, { on: true, customMaxAmps: breakerAmps, customCableMm2: 10 });
    // customMaxAmps keeps the *load* out of the picture: the point of these
    // tests is the breaker's curve, not the appliance's own rating.
    const load = C('space-heater', {
      on: true,
      customPowerWatts: loadWatts,
      customCableMm2: 10,
      customMaxAmps: 999,
    });
    const wires = [
      W({ c: l, p: 0 }, { c: cb, p: 0 }),
      W({ c: cb, p: 1 }, { c: load, p: 0 }),
      W({ c: n, p: 0 }, { c: load, p: 1 }),
    ];
    return {
      cb,
      result: simulate(circuit([l, n, cb, load], wires), { appMode: 'pro' }),
    };
  }

  it('does NOT trip below Inf = 1.13×In (IEC 60898-1 conventional non-tripping current)', () => {
    // 16 A device, ~17.4 A load ⇒ 1.09×In: must carry it indefinitely.
    const { cb, result } = overloadCircuit(4000, 16);
    expect((result.trippedComponents ?? []).map((t) => t.id)).not.toContain(cb.id);
    expect(result.blownComponents ?? []).toEqual([]);
  });

  it('trips above If = 1.45×In and reports the curve time', () => {
    // 16 A device, ~26 A load ⇒ 1.63×In: inside the thermal tripping zone.
    const { cb, result } = overloadCircuit(6000, 16);
    const trip = (result.trippedComponents ?? []).find((t) => t.id === cb.id);
    expect(trip).toBeDefined();
    expect(trip?.cause).toBe('overload');
    expect(trip?.mechanism).toBe('thermal');
    expect(trip?.currentMultiple).toBeGreaterThan(1.45);
    // Thermal clearing at ~1.6×In is minutes, not milliseconds.
    expect(trip?.clearingTimeSeconds).toBeGreaterThan(1);
  });

  it('clears a heavy overload magnetically, far faster than a marginal one', () => {
    const marginal = overloadCircuit(6000, 16);
    const heavy = overloadCircuit(30000, 16);
    const marginalTrip = (marginal.result.trippedComponents ?? []).find(
      (t) => t.id === marginal.cb.id,
    );
    const heavyTrip = (heavy.result.trippedComponents ?? []).find((t) => t.id === heavy.cb.id);
    expect(marginalTrip?.clearingTimeSeconds).toBeDefined();
    expect(heavyTrip?.mechanism).toBe('magnetic');
    expect(heavyTrip?.clearingTimeSeconds).toBeLessThan(
      marginalTrip?.clearingTimeSeconds ?? Number.POSITIVE_INFINITY,
    );
  });

  it('reports an IEC 61008-1 break time when an RCD operates on leakage', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const rcd = C('rcd', { on: true });
    const bulb = C('bulb', { fault: 'earth-fault' });
    const wires = [
      W({ c: l, p: 0 }, { c: rcd, p: 0 }),
      W({ c: n, p: 0 }, { c: rcd, p: 1 }),
      W({ c: rcd, p: 2 }, { c: bulb, p: 0 }),
      W({ c: rcd, p: 3 }, { c: bulb, p: 1 }),
    ];
    const result = simulate(circuit([l, n, rcd, bulb], wires));
    const trip = (result.trippedComponents ?? []).find((t) => t.id === rcd.id);
    expect(trip?.cause).toBe('ground-fault');
    expect(trip?.mechanism).toBe('residual');
    // General-type maximums: ≤300 ms at 1×IΔn, ≤40 ms at ≥5×IΔn.
    expect(trip?.clearingTimeSeconds).toBeLessThanOrEqual(0.3);
    expect(trip?.clearingTimeSeconds).toBeGreaterThan(0);
  });

  it('keeps `cause` a persistable enum even when `reason` is a full sentence', () => {
    const { cb, result } = overloadCircuit(6000, 16);
    const trip = (result.trippedComponents ?? []).find((t) => t.id === cb.id);
    expect(trip?.cause).toBe('overload');
    expect(trip?.reason.length).toBeGreaterThan('overload'.length);
  });
});

it('uses actual supply voltage in switched-neutral hazard messages', () => {
  const l = C('live-terminal');
  const n = C('neutral-terminal');
  const load = C('bulb', { fault: 'switched-neutral' });
  const c = {
    ...circuit(
      [l, n, load],
      [W({ c: l, p: 0 }, { c: load, p: 0 }), W({ c: n, p: 0 }, { c: load, p: 1 })],
    ),
    globalVoltage: 120,
  };
  const messages = simulate(c, { standard: 'us' }).errors;
  expect(
    messages.some((message) => message.includes('SWITCHED NEUTRAL') && message.includes('120 V')),
  ).toBe(true);
  expect(messages.some((message) => message.includes('230V'))).toBe(false);
});
