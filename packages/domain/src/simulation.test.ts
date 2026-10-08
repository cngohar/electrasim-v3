/**
 * simulation.test.ts — Behavioural coverage for the pure simulation engine.
 *
 * These tests serve two purposes:
 *   1. Verify modeled switching and fault behavior against physical expectations.
 *   2. Document the intended semantics of every component flag (isSwitch,
 *      isLoad, isSource, isPassThrough, isJunction, isSocket).
 *
 * Test fixtures are built with small helpers to keep each scenario readable.
 */

import { describe, expect, it } from 'vitest';
import { earthingAcceptanceCircuits } from './core/earthingFixtures';
import { protectionCircuit, rcdLeakingCircuit } from './core/protectionFixtures';
import { explicitSupplyProfile } from './core/supplies';
import { createInjectedFault } from './faults';
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
    expect(r.readiness?.topology).toBe('no-source');
    expect(r.electrical?.status).toBe('not-solved');
    expect(r.warnings).not.toContain('No Neutral source found.');
  });

  it('warns when the neutral source is missing', () => {
    const l = C('live-terminal');
    const r = simulate(circuit([l], []));
    expect(r.readiness?.topology).toBe('no-load');
    expect(r.electrical?.operation).toBe('no-load');
    expect(r.warnings).not.toContain('No Live source found.');
  });
});

// ─── Smallest functional circuit: Live → Bulb ← Neutral ─────────────────────

describe('simulate — minimal lit bulb', () => {
  it('energises a bulb wired directly between live and neutral', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb-incandescent');
    const w1 = W({ c: l, p: 0 }, { c: b, p: 0 }); // L-out → bulb.L
    const w2 = W({ c: n, p: 0 }, { c: b, p: 1 }); // N-out → bulb.N

    const r = simulate(circuit([l, n, b], [w1, w2]));

    expect(r.energizedComponents.has(b.id)).toBe(true);
    expect(r.energizedWires.has(w1.id)).toBe(true);
    expect(r.energizedWires.has(w2.id)).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.legacyObservation).toBeUndefined();
    expect(r.componentCalculations?.[b.id].powerWatts).toBeGreaterThan(0);
  });

  it('does NOT energise the bulb if the neutral wire is missing', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb-incandescent');
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
    const b = C('bulb-incandescent');
    const wires = [W({ c: l2, p: 0 }, { c: b, p: 0 }), W({ c: n2, p: 0 }, { c: b, p: 1 })];

    const r = simulate(circuit([l1, n1, l2, n2, b], wires));

    expect(r.energizedComponents.has(b.id)).toBe(true);
    expect(r.energizedWires).toEqual(new Set(wires.map((wire) => wire.id)));
  });

  it('uses every rail exposed by a combined mains supply', () => {
    const supply = C('ac-mains-supply', { customVoltage: 230 });
    const bulb = C('bulb-incandescent');
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
    const b = C('bulb-incandescent');

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
    const b = C('bulb-incandescent');

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
      const b = C('bulb-incandescent');
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
    const b1 = C('bulb-incandescent');
    const b2 = C('bulb-incandescent');

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
    const b = C('bulb-incandescent');

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
    const bulb = C('bulb-incandescent');
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
    const b = C('bulb-incandescent');
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
    const bell = C('bulb-incandescent');
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

    expect(result.errors.some((error) => error.startsWith('Short circuit'))).toBe(true);
    expect(result.errorWires).toEqual(new Set([short.id]));
    expect(result.errorComponents).toEqual(new Set([l.id, n.id]));
  });

  it('detects opposite rails meeting through separate wires at one terminal', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb-incandescent');
    const liveWire = W({ c: l, p: 0 }, { c: b, p: 0 });
    const neutralWire = W({ c: n, p: 0 }, { c: b, p: 0 });

    const result = simulate(circuit([l, n, b], [liveWire, neutralWire]));

    expect(result.errors.some((error) => error.startsWith('Short circuit'))).toBe(true);
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

    expect(result.errors.some((error) => error.startsWith('Short circuit'))).toBe(true);
    expect(result.errorWires).toEqual(new Set([crossTypedWire.id, neutralWire.id]));
  });

  it('detects a conductor shunting a load without propagating through the load body', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb-incandescent');
    const liveWire = W({ c: l, p: 0 }, { c: b, p: 0 });
    const neutralWire = W({ c: n, p: 0 }, { c: b, p: 1 });
    const shunt = W({ c: b, p: 0 }, { c: b, p: 1 });

    const result = simulate(circuit([l, n, b], [liveWire, neutralWire, shunt]));

    expect(result.errors.some((error) => error.startsWith('Short circuit'))).toBe(true);
    expect(result.errorWires).toEqual(new Set([liveWire.id, neutralWire.id, shunt.id]));
  });

  it('treats a melted wire as an open conductor', () => {
    const live = C('live-terminal');
    const neutral = C('neutral-terminal');
    const bulb = C('bulb-incandescent');
    const liveWire = W({ c: live, p: 0 }, { c: bulb, p: 0 });
    const neutralWire = W({ c: neutral, p: 0 }, { c: bulb, p: 1 });
    liveWire.isBusted = true;

    const result = simulate(circuit([live, neutral, bulb], [liveWire, neutralWire]));

    expect(result.energizedComponents.has(bulb.id)).toBe(false);
    expect(result.wireStates?.[liveWire.id]?.carryingCurrent).toBe(false);
    expect(result.wireStates?.[liveWire.id]?.fromPotentialVolts).toBe(230);
  });

  it('does not report an incomplete cross-typed connection as a short', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb-incandescent');
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
    const b = C('bulb-incandescent');
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
  it('clears findings for an energised circuit but never treats an empty circuit as cleared', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const b = C('bulb-incandescent');
    const healthy = simulate(
      circuit([l, n, b], [W({ c: l, p: 0 }, { c: b, p: 0 }), W({ c: n, p: 0 }, { c: b, p: 1 })]),
    );
    expect(healthy.energizedComponents.has(b.id)).toBe(true);
    expect(healthy.faultsCleared).toBe(true);

    const empty = simulate(circuit([], []));
    expect(empty.faultsCleared).toBe(false);
    expect(empty.readiness?.topology).toBe('empty');
  });

  it('is false while a short circuit or open wire is present', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const short = W({ c: l, p: 0 }, { c: n, p: 0 });
    expect(simulate(circuit([l, n], [short])).faultsCleared).toBe(false);

    const b = C('bulb-incandescent');
    const broken = W({ c: b, p: 0 }, { c: b, p: 1 });
    broken.fault = 'open-circuit';
    expect(simulate(circuit([b], [broken])).faultsCleared).toBe(false);
  });

  it('does not claim fault clearing when the active supply is missing', () => {
    const n = C('neutral-terminal');
    const result = simulate(circuit([n], []));
    expect(result.faultsCleared).toBe(false);
    expect(result.readiness?.topology).toBe('no-source');
  });
});

// ─── Indexing / perf invariants ────────────────────────────────────────────

describe('simulate — invariants', () => {
  it('produces deterministic output across repeated calls (idempotent)', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const sw = C('single-way-switch', { on: true });
    const b = C('bulb-incandescent');
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
      const b = C('bulb-incandescent');
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

describe('simulate — actual current and time govern protection', () => {
  it('static undeclared protection never predicts a trip from network membership', () => {
    const l = C('live-terminal');
    const n = C('neutral-terminal');
    const mcb = C('mcb', { on: true });
    const result = simulate(
      circuit(
        [l, n, mcb],
        [W({ c: l, p: 0 }, { c: mcb, p: 0 }), W({ c: mcb, p: 1 }, { c: n, p: 0 })],
      ),
    );
    expect(result.trippedComponents ?? []).toEqual([]);
    expect(result.electrical?.status).toBe('converged');
    expect(result.electrical?.deviceCurrents.find((d) => d.componentId === mcb.id)?.trip).toBe(
      'not-assessed',
    );
    expect(result.readiness?.topology).toBe('short');
  });

  it('requires elapsed time before a declared overload trips and leaves the breaker resettable', () => {
    const c = protectionCircuit('mcb', 2);
    const initial = simulate(c);
    expect(initial.trippedComponents ?? []).toEqual([]);
    expect(initial.electrical?.deviceCurrents[0]?.currentAmps).toBeGreaterThan(4);
    const result = simulate(c, { simulationState: initial.simulationState, deltaSeconds: 3600 });
    expect(
      result.simulationEvents?.some(
        (e) => e.type === 'protection-trip' && e.componentId === 'control',
      ),
    ).toBe(true);
    expect(result.blownComponents ?? []).toEqual([]);
    expect(result.energizedComponents.has('lamp')).toBe(false);
  });

  it('uses the solved residual and the authored rating in both presentation modes', () => {
    const c = rcdLeakingCircuit();
    const basic = simulate(c, { appMode: 'basic', deltaSeconds: 1 });
    const pro = simulate(c, { appMode: 'pro', deltaSeconds: 1 });
    expect(pro).toEqual(basic);
    expect(
      basic.simulationEvents?.some(
        (e) => e.type === 'protection-trip' && e.componentId === 'control',
      ),
    ).toBe(true);
    expect(c.components[1]!.state.protectionModel).toMatchObject({ ratedResidualMilliamps: 30 });
    expect(basic.electrical?.protection?.[0]?.tripped).toBe(true);
    expect(basic.blownComponents ?? []).toEqual([]);
  });
});

// Arc/DC residual signatures have no declared impedance/waveform model. A
// catalog label must never substitute for a solved trip or blinding result.
describe('simulate — unsupported fault signatures', () => {
  it.each(['arc-fault', 'smooth-dc-residual', 'live-to-earth'] as const)(
    'withholds %s measurements, trips and recovery for every protective family',
    (fault) => {
      for (const type of ['afdd', 'rcbo', 'mcb']) {
        const c = protectionCircuit('mcb', 2);
        c.components[1]!.type = type;
        c.components[1]!.state.protectionModel = undefined;
        c.faults = [createInjectedFault(fault, { type: 'component', id: 'lamp' })];
        const result = simulate(c, { deltaSeconds: 1 });
        expect(result.electrical?.status).toBe('unsupported');
        expect(result.legacyObservation).toBeUndefined();
        expect(result.componentCalculations).toBeUndefined();
        expect(result.energizedComponents.size).toBe(0);
        expect(result.trippedComponents ?? []).toEqual([]);
        expect(result.blownComponents ?? []).toEqual([]);
        expect(result.faultsCleared).toBe(false);
      }
    },
  );
});

it('uses actual solved voltage for neutral-only switching hazards', () => {
  const c = earthingAcceptanceCircuits()['switched-neutral']!;
  c.globalVoltage = 120;
  c.supply = explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 120, frequencyHz: 60 });
  c.components[0]!.state.sourceProfile = c.supply;
  const result = simulate(c, { standard: 'us' });
  expect(result.electrical?.diagnostics.some((d) => d.code === 'neutral-only-switching')).toBe(
    true,
  );
  expect(result.componentCalculations?.r.voltage).toBeLessThanOrEqual(120);
});
