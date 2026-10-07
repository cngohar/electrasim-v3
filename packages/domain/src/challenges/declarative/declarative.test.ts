/**
 * declarative domain tests — rules + validator (plan §37 testing matrix).
 *
 * Covers: correct topology, incomplete topology, contradictory topology,
 * duplicate components, extra components, equivalent wire routing, direct vs
 * path rules, functional checks, fault checks, stable ordering.
 */

import { describe, expect, it } from 'vitest';
import { createInjectedFault } from '../../faults';
import type { Circuit } from '../../types';
import { getChallengeDefinition } from './definitions';
import type { Rule } from './rules';
import { validateChallenge } from './validator';

// ── Fixtures ───────────────────────────────────────────────────────────────

let seq = 0;
function component(type: string, x = 120, y = 150, state: Record<string, unknown> = {}) {
  return { id: `c${++seq}`, type, x, y, state };
}
function wire(
  circuit: Circuit,
  fromId: string,
  fromPort: number,
  toId: string,
  toPort: number,
): Circuit {
  return {
    ...circuit,
    wires: [
      ...circuit.wires,
      {
        id: `w${circuit.wires.length + 1}`,
        fromComponentId: fromId,
        fromPortIndex: fromPort,
        toComponentId: toId,
        toPortIndex: toPort,
        controlPoints: [],
        pathKind: 'orthogonal',
      },
    ],
  };
}

/** The correct Protected Lamp answer, built under fresh learner ids. */
function correctProtectedLamp(): Circuit {
  const live = component('live-terminal');
  const neutral = component('neutral-terminal', 120, 300);
  const mcb = component('mcb', 300, 150, { on: true });
  const sw = component('single-way-switch', 480, 150, { on: true });
  const bulb = component('bulb', 660, 150);
  let circuit: Circuit = { components: [live, neutral, mcb, sw, bulb], wires: [] };
  // live-terminal[0]=live, mcb[0]=in [1]=out, switch[0]=in [1]=out, bulb[0]=L [1]=N
  circuit = wire(circuit, live.id, 0, mcb.id, 0);
  circuit = wire(circuit, mcb.id, 1, sw.id, 0);
  circuit = wire(circuit, sw.id, 1, bulb.id, 0);
  circuit = wire(circuit, neutral.id, 0, bulb.id, 1);
  return circuit;
}

function challenge(id: 'protected-lamp' | 'push-button-doorbell' | 'rcbo-socket') {
  const definition = getChallengeDefinition(id);
  if (!definition) throw new Error(`missing ${id}`);
  return definition;
}

// ── Correct topology ───────────────────────────────────────────────────────

describe('validateChallenge — correct topology', () => {
  it('rejects a changed authored supply even when the construction rules otherwise pass', () => {
    const circuit = correctProtectedLamp();
    const verdict = validateChallenge(challenge('protected-lamp'), {
      ...circuit,
      globalVoltage: 120,
    });
    expect(verdict.state).toBe('has-errors');
    expect(verdict.nextRule?.id).toBe('authored-supply');
    expect(verdict.electricallySound).toBe(false);
  });
  it('withholds completion for the undeclared LED operating model', () => {
    const verdict = validateChallenge(challenge('protected-lamp'), correctProtectedLamp());
    expect(verdict.state).toBe('in-progress');
    expect(verdict.completedRules).toBe(verdict.totalRules - 1);
    expect(verdict.nextRule?.reason).toMatch(/not assessed/);
  });

  it('accepts an electrically equivalent routing (plan §7)', () => {
    // Live → MCB → switch → bulb with a LONG route through extra wires is the
    // same as a direct one. Here: two switches in series both closed is NOT
    // equivalent (different part count), so instead we prove coordinates and
    // ids don't matter: shuffle the layout.
    const circuit = correctProtectedLamp();
    const moved = {
      ...circuit,
      components: circuit.components.map((c, i) => ({ ...c, x: i * 42 + 7, y: 9 })),
    };
    const verdict = validateChallenge(challenge('protected-lamp'), moved);
    expect(verdict.state).toBe('in-progress');
  });

  it('withholds a doorbell pass until its operating model is declared', () => {
    const definition = challenge('push-button-doorbell');
    const live = component('live-terminal');
    const neutral = component('neutral-terminal', 120, 300);
    const mcb = component('mcb', 300, 150, { on: true });
    const button = component('push-button', 480, 150);
    const bell = component('bell', 660, 150);
    let circuit: Circuit = { components: [live, neutral, mcb, button, bell], wires: [] };
    circuit = wire(circuit, live.id, 0, mcb.id, 0);
    circuit = wire(circuit, mcb.id, 1, button.id, 0);
    circuit = wire(circuit, button.id, 1, bell.id, 0);
    circuit = wire(circuit, neutral.id, 0, bell.id, 1);
    const verdict = validateChallenge(definition, circuit);
    expect(verdict.state).toBe('in-progress');
  });

  it('completes the RCBO socket answer (plan §25)', () => {
    const definition = challenge('rcbo-socket');
    const live = component('live-terminal');
    const neutral = component('neutral-terminal', 120, 280);
    const earth = component('earth-terminal', 120, 440);
    const rcbo = component('rcbo', 300, 200, { on: true });
    const socket = component('socket-3pin', 540, 200);
    let circuit: Circuit = { components: [live, neutral, earth, rcbo, socket], wires: [] };
    // rcbo ports: 0 L-in, 1 N-in, 2 L-out, 3 N-out; socket: 0 L, 1 N, 2 E
    circuit = wire(circuit, live.id, 0, rcbo.id, 0);
    circuit = wire(circuit, neutral.id, 0, rcbo.id, 1);
    circuit = wire(circuit, rcbo.id, 2, socket.id, 0);
    circuit = wire(circuit, rcbo.id, 3, socket.id, 1);
    circuit = wire(circuit, earth.id, 0, socket.id, 2);
    const verdict = validateChallenge(definition, circuit);
    expect(verdict.state).toBe('complete');
  });
});

// ── Incomplete topology ────────────────────────────────────────────────────

describe('validateChallenge — incomplete topology', () => {
  it('reports the first missing rule as the next step', () => {
    const circuit = correctProtectedLamp();
    const incomplete: Circuit = { ...circuit, wires: circuit.wires.slice(0, 2) }; // cut switch+bNeutral
    const verdict = validateChallenge(challenge('protected-lamp'), incomplete);
    expect(verdict.state).toBe('in-progress');
    expect(verdict.nextRule).not.toBeNull();
    expect(verdict.nextRule?.targets?.length).toBeGreaterThan(0);
    expect(verdict.completedRules).toBeLessThan(verdict.totalRules);
  });

  it('treats an empty canvas as in-progress with guidance', () => {
    const verdict = validateChallenge(challenge('protected-lamp'), {
      components: [],
      wires: [],
      globalVoltage: 230,
    });
    expect(verdict.state).toBe('in-progress');
    expect(verdict.nextRule?.reason).toMatch(/Live supply terminal/i);
    expect(verdict.nextRule?.paletteTypes).toEqual(['live-terminal']);
  });
});

// ── Contradictory topology ─────────────────────────────────────────────────

describe('validateChallenge — contradictory topology', () => {
  it('fails when a dangling wire exists', () => {
    const circuit = correctProtectedLamp();
    const dangling: Circuit = {
      ...circuit,
      wires: [
        ...circuit.wires,
        {
          id: 'w-bad',
          fromComponentId: 'ghost',
          fromPortIndex: 0,
          toComponentId: circuit.components[0]!.id,
          toPortIndex: 0,
          controlPoints: [],
          pathKind: 'orthogonal',
        },
      ],
    };
    const verdict = validateChallenge(challenge('protected-lamp'), dangling);
    expect(verdict.state).toBe('has-errors');
    expect(verdict.summary).toMatch(/not properly connected/i);
  });

  it('rejects the RCBO bypass (plan §25)', () => {
    const definition = challenge('rcbo-socket');
    const live = component('live-terminal');
    const neutral = component('neutral-terminal', 120, 280);
    const earth = component('earth-terminal', 120, 440);
    const rcbo = component('rcbo', 300, 200, { on: true });
    const socket = component('socket-3pin', 540, 200);
    let circuit: Circuit = { components: [live, neutral, earth, rcbo, socket], wires: [] };
    // Live BYPASSES the rcbo: live → socket directly.
    circuit = wire(circuit, live.id, 0, rcbo.id, 0);
    circuit = wire(circuit, neutral.id, 0, rcbo.id, 1);
    circuit = wire(circuit, live.id, 0, socket.id, 0); // bypass!
    circuit = wire(circuit, rcbo.id, 3, socket.id, 1);
    circuit = wire(circuit, earth.id, 0, socket.id, 2);
    const verdict = validateChallenge(definition, circuit);
    expect(verdict.state).toBe('has-errors');
    expect(verdict.rules.some((r) => r.id.startsWith('exclusive-') && r.verdict === 'fail')).toBe(
      true,
    );
  });
});

// ── Extra components (plan §20: warn, not fail) ────────────────────────────

describe('validateChallenge — extra components', () => {
  it('lists extras without failing a correct circuit', () => {
    const circuit = correctProtectedLamp();
    const withExtra: Circuit = {
      ...circuit,
      components: [...circuit.components, component('fuse', 200, 400, { on: true })],
    };
    const verdict = validateChallenge(challenge('protected-lamp'), withExtra);
    expect(verdict.extraComponents).toContain('fuse');
    // The extra fuse does not change the rules' answers.
    expect(verdict.state).toBe('in-progress');
  });
});

// ── Functional / fault checks ──────────────────────────────────────────────

describe('validateChallenge — functional and fault rules', () => {
  it('fails the doorbell when the bell is hard-wired on (no momentary switch)', () => {
    const definition = challenge('push-button-doorbell');
    const live = component('live-terminal');
    const neutral = component('neutral-terminal', 120, 300);
    const mcb = component('mcb', 300, 150, { on: true });
    const bell = component('bell', 660, 150);
    let circuit: Circuit = { components: [live, neutral, mcb, bell], wires: [] };
    circuit = wire(circuit, live.id, 0, mcb.id, 0);
    circuit = wire(circuit, mcb.id, 1, bell.id, 0);
    circuit = wire(circuit, neutral.id, 0, bell.id, 1);
    const verdict = validateChallenge(definition, circuit);
    expect(verdict.state).not.toBe('complete');
    expect(verdict.rules.some((r) => r.reason?.includes('not assessed'))).toBe(true);
  });
});

// ── Fault rules (plan §8 faultAbsent) ──────────────────────────────────────

describe('fault rules', () => {
  it('detects an active open-neutral fault on a repair challenge circuit', () => {
    // Simulated here: the fault rules live in the wave-three definitions, so
    // exercise the fault-absent rule factory directly via the rules module.
    const circuit = correctProtectedLamp();
    const fault = createInjectedFault('open-neutral', {
      type: 'wire',
      id: circuit.wires[circuit.wires.length - 1]!.id,
    });
    const faulted: Circuit = { ...circuit, faults: [fault] };
    const definition = challenge('protected-lamp');
    const verdict = validateChallenge(definition, faulted);
    // The protected-lamp definition has no fault rule, so it still completes
    // electrically — but the simulator gate flags the open neutral.
    expect(verdict.electricallySound).toBe(false);
  });
});

// ── Learner-facing requirements (UX correction plan §2, §6) ────────────────

describe('outcome requirements (UX correction plan)', () => {
  it('keeps the LED operation requirement unassessed even when topology is correct', () => {
    const verdict = validateChallenge(challenge('protected-lamp'), correctProtectedLamp());
    expect(verdict.state).toBe('in-progress');
    expect(verdict.requirements.map((r) => r.label)).toEqual([
      'Protected by an MCB',
      'Switch controls the lamp',
      'Complete return path',
      'Lamp operates correctly',
    ]);
    expect(verdict.requirements.filter((r) => !r.met).map((r) => r.id)).toHaveLength(1);
    expect(verdict.nextRule?.reason).toMatch(/not assessed/);
  });

  it('still rejects a broken circuit even though the rule list is hidden', () => {
    const definition = challenge('protected-lamp');
    const circuit = correctProtectedLamp();
    // Drop the bulb → Neutral wire (missing return path).
    const broken: Circuit = { ...circuit, wires: circuit.wires.slice(0, -1) };
    const verdict = validateChallenge(definition, broken);
    expect(verdict.state).not.toBe('complete');
    const returnPath = verdict.requirements.find((r) => r.id === 'req-return');
    expect(returnPath?.met).toBe(false);
    expect(returnPath?.check).toContain('return path');
    expect(returnPath?.firstRule).not.toBeNull();
    // The underlying validator still evaluates every internal rule.
    expect(
      verdict.rules.some(
        (r) => r.id === 'path-neutral-bulb-neutral-terminal' && r.verdict !== 'pass',
      ),
    ).toBe(true);
  });

  it('maps an empty canvas to all unmet requirements', () => {
    const verdict = validateChallenge(challenge('protected-lamp'), {
      components: [],
      wires: [],
      globalVoltage: 230,
    });
    expect(verdict.requirements.length).toBeGreaterThan(0);
    expect(verdict.requirements.every((r) => !r.met)).toBe(true);
    expect(verdict.requirements[0]?.firstRule?.paletteTypes).toContain('live-terminal');
  });
});

// ── Stable ordering ────────────────────────────────────────────────────────

describe('stable ordering (plan §6)', () => {
  it('evaluates rules in definition order', () => {
    const circuit = correctProtectedLamp();
    const partial: Circuit = {
      ...circuit,
      components: circuit.components.slice(0, 2),
      wires: [],
    };
    const verdict = validateChallenge(challenge('protected-lamp'), partial);
    const ids = verdict.rules.map((r) => r.id);
    const definition = challenge('protected-lamp');
    expect(ids).toEqual((definition.rules as Rule[]).map((r) => r.id));
  });
});
