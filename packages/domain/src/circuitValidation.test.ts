/**
 * Regression tests for validation check 10 — partially-wired devices and
 * conductor bypass.
 *
 * Reproduces the reported defect: Live → MCB → FCU (Live only) → Bulb →
 * Neutral, with the FCU's N-in / N-out deliberately left unwired. The
 * simulation legitimately runs (the loop is closed through the direct
 * neutral), so the validator must be the layer that catches the bypass —
 * previously it reported a perfect 100 score.
 */

import { describe, expect, it } from 'vitest';
import { validateCircuit } from './circuitValidation';
import { simulate } from './simulation';
import type { Circuit, ComponentInstance, WireInstance } from './types';

let n = 0;
const C = (type: string, x = 0, y = 0, state = {}): ComponentInstance => ({
  id: `t-${type}-${++n}`,
  type,
  x,
  y,
  state,
});
const W = (
  from: ComponentInstance,
  fromPort: number,
  to: ComponentInstance,
  toPort: number,
): WireInstance => ({
  id: `w-${++n}`,
  fromComponentId: from.id,
  fromPortIndex: fromPort,
  toComponentId: to.id,
  toPortIndex: toPort,
  controlPoints: [],
});

/** The exact reported circuit. FCU ports: 0=L-in, 1=N-in, 2=L-out, 3=N-out. */
function bypassedFcuCircuit(): Circuit {
  const live = C('live-terminal', 0, 100);
  const neutral = C('neutral-terminal', 0, 300);
  const mcb = C('mcb', 200, 100, { on: true });
  const fcu = C('fused-spur', 400, 100, { on: true });
  const bulb = C('bulb-incandescent', 600, 100);
  return {
    components: [live, neutral, mcb, fcu, bulb],
    wires: [
      W(live, 0, mcb, 0), // L → MCB L-in
      W(mcb, 1, fcu, 0), // MCB L-out → FCU L-in
      W(fcu, 2, bulb, 0), // FCU L-out → bulb L
      W(bulb, 1, neutral, 0), // bulb N → Neutral (bypasses the FCU!)
    ],
  };
}

/** Same circuit wired correctly: neutral routed through the FCU. */
function correctFcuCircuit(): Circuit {
  const live = C('live-terminal', 0, 100);
  const neutral = C('neutral-terminal', 0, 300);
  const mcb = C('mcb', 200, 100, { on: true });
  const fcu = C('fused-spur', 400, 100, { on: true });
  const bulb = C('bulb-incandescent', 600, 100);
  return {
    components: [live, neutral, mcb, fcu, bulb],
    wires: [
      W(live, 0, mcb, 0),
      W(mcb, 1, fcu, 0),
      W(fcu, 2, bulb, 0),
      W(bulb, 1, fcu, 3), // bulb N → FCU N-out
      W(fcu, 1, neutral, 0), // FCU N-in → Neutral
    ],
  };
}

describe('validation check 10 — conductor bypass', () => {
  it('flags the reported FCU neutral bypass instead of scoring 100', () => {
    const report = validateCircuit(bypassedFcuCircuit());

    const bypass = report.issues.find((i) => i.id.startsWith('device_conductor_bypass'));
    expect(bypass).toBeDefined();
    expect(bypass?.severity).toBe('warning');
    expect(bypass?.title).toMatch(/Neutral Bypasses/i);
    expect(bypass?.description).toContain('N-in / N-out');
    expect(report.score).toBeLessThan(100);
    expect(report.status).not.toBe('pass');
  });

  it('the simulation still runs the bypassed circuit — physics, not validation', () => {
    const circuit = bypassedFcuCircuit();
    const result = simulate(circuit);
    const bulb = circuit.components.find((c) => c.type === 'bulb-incandescent');
    // The loop is genuinely closed, so the bulb energises; the defect is a
    // wiring-practice problem that validation (not the solver) must own.
    expect(result.energizedComponents.has(bulb?.id ?? '')).toBe(true);
  });

  it('does not flag a correctly wired FCU, and records the passed check', () => {
    const report = validateCircuit(correctFcuCircuit());
    expect(report.issues.find((i) => i.id.startsWith('device_conductor_bypass'))).toBeUndefined();
    expect(report.passedChecks.some((p) => p.id === 'conductor_routing_ok')).toBe(true);
  });

  it('does not flag single-pole devices for having no neutral path', () => {
    // MCB has only Live ports — routing neutral through it is impossible
    // and must never be demanded.
    const report = validateCircuit(correctFcuCircuit());
    expect(report.issues.some((i) => i.id.includes('mcb') && i.id.includes('bypass'))).toBe(false);
  });

  it('flags components placed on canvas with no wires at all', () => {
    const circuit = correctFcuCircuit();
    circuit.components.push(C('rcd', 800, 400, { on: true }));
    const report = validateCircuit(circuit);

    const unwired = report.issues.find((i) => i.id === 'components_unwired');
    expect(unwired).toBeDefined();
    expect(unwired?.severity).toBe('warning');
    expect(unwired?.description).toMatch(/RCD/i);
  });

  it('gives residual devices (RCD/RCBO) imbalance-specific wording', () => {
    const live = C('live-terminal', 0, 100);
    const neutral = C('neutral-terminal', 0, 300);
    const rcd = C('rcd', 200, 100, { on: true });
    const bulb = C('bulb-incandescent', 400, 100);
    // Find RCD live in/out port indexes dynamically to stay schema-proof.
    const report = validateCircuit({
      components: [live, neutral, rcd, bulb],
      wires: [
        W(live, 0, rcd, 0),
        W(rcd, 2, bulb, 0),
        W(bulb, 1, neutral, 0), // neutral bypasses the RCD
      ],
    });
    const bypass = report.issues.find((i) => i.id.startsWith('device_conductor_bypass'));
    expect(bypass).toBeDefined();
    expect(bypass?.description).toMatch(/imbalance|trip/i);
  });
});
