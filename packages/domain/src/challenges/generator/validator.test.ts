/**
 * validator.test.ts — baseline validation gates (plan §10).
 *
 * "Do not inject a fault into an already-invalid circuit." These tests prove
 * each gate actually rejects the circuit class it is responsible for, so a
 * broken candidate can never slip through to a learning mode.
 */

import { describe, expect, it } from 'vitest';
import type { Circuit, ComponentInstance, WireInstance } from '../../types';
import { generateChallenge } from './generator';
import { validateCandidate } from './validator';

function component(
  id: string,
  type: string,
  x: number,
  y: number,
  state: ComponentInstance['state'] = {},
): ComponentInstance {
  return { id, type, x, y, state: { customCableMm2: 1.5, ...state } };
}

function wire(
  id: string,
  from: string,
  fromPort: number,
  to: string,
  toPort: number,
): WireInstance {
  return {
    id,
    fromComponentId: from,
    fromPortIndex: fromPort,
    toComponentId: to,
    toPortIndex: toPort,
    controlPoints: [],
    pathKind: 'orthogonal',
    lengthMeters: 3,
    customCableMm2: 1.5,
    material: 'copper',
    installationMethod: 'C',
  };
}

/** A minimal, genuinely valid lamp circuit — the control for every gate test. */
function healthyCircuit(): Circuit {
  return {
    components: [
      component('live', 'live-terminal', 120, 150),
      component('neutral', 'neutral-terminal', 120, 270),
      component('mcb', 'mcb', 300, 150, { on: true, customMaxAmps: 6 }),
      component('lamp', 'bulb', 480, 150),
    ],
    wires: [
      wire('w1', 'live', 0, 'mcb', 0),
      wire('w2', 'mcb', 1, 'lamp', 0),
      wire('w3', 'neutral', 0, 'lamp', 1),
    ],
    globalVoltage: 230,
  };
}

function reasonsOf(result: ReturnType<typeof validateCandidate>): string {
  return result.rejections.flatMap((rejection) => rejection.reasons).join(' | ');
}

describe('validateCandidate — accepts a healthy circuit', () => {
  it('passes every gate', () => {
    const result = validateCandidate({
      circuit: healthyCircuit(),
      expectedEnergisedLoadIds: ['lamp'],
    });
    expect(result.ok, reasonsOf(result)).toBe(true);
    expect(result.rejections).toEqual([]);
    expect(result.basicResult).toBeDefined();
    expect(result.proResult).toBeDefined();
  });

  it('does not mutate the circuit it validates', () => {
    const circuit = healthyCircuit();
    const snapshot = JSON.stringify(circuit);
    validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] });
    expect(JSON.stringify(circuit)).toBe(snapshot);
  });
});

describe('validateCandidate — gate 1: structure', () => {
  it('rejects an empty circuit', () => {
    const result = validateCandidate({
      circuit: { components: [], wires: [] },
      expectedEnergisedLoadIds: [],
    });
    expect(result.ok).toBe(false);
    expect(reasonsOf(result)).toMatch(/no components/);
  });

  it('rejects a circuit with no wires', () => {
    const circuit = healthyCircuit();
    circuit.wires = [];
    const result = validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] });
    expect(result.ok).toBe(false);
    expect(reasonsOf(result)).toMatch(/no wires/);
  });

  it('rejects a dangling wire endpoint', () => {
    const circuit = healthyCircuit();
    circuit.wires.push(wire('w4', 'lamp', 0, 'ghost', 0));
    const result = validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] });
    expect(result.ok).toBe(false);
    expect(reasonsOf(result)).toMatch(/missing component/);
  });

  it('rejects an unwired component', () => {
    const circuit = healthyCircuit();
    circuit.components.push(component('orphan', 'bulb', 660, 390));
    const result = validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] });
    expect(result.ok).toBe(false);
    expect(reasonsOf(result)).toMatch(/orphan is unwired/);
  });

  it('rejects a rail mismatch on a wire', () => {
    const circuit = healthyCircuit();
    // Point the neutral feed at the lamp's LIVE terminal.
    circuit.wires[2] = wire('w3', 'neutral', 0, 'lamp', 0);
    const result = validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] });
    expect(result.ok).toBe(false);
    expect(reasonsOf(result)).toMatch(/joins neutral to live/);
  });

  it('rejects a missing supply rail', () => {
    const circuit = healthyCircuit();
    circuit.components = circuit.components.filter((c) => c.id !== 'neutral');
    circuit.wires = circuit.wires.filter((w) => w.fromComponentId !== 'neutral');
    const result = validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] });
    expect(result.ok).toBe(false);
    expect(reasonsOf(result)).toMatch(/no neutral supply source/);
  });

  it('rejects off-grid and stacked components', () => {
    const offGrid = healthyCircuit();
    offGrid.components[3] = component('lamp', 'bulb', 481, 150);
    expect(
      reasonsOf(validateCandidate({ circuit: offGrid, expectedEnergisedLoadIds: ['lamp'] })),
    ).toMatch(/not grid aligned/);

    const stacked = healthyCircuit();
    stacked.components[3] = component('lamp', 'bulb', 300, 150);
    expect(
      reasonsOf(validateCandidate({ circuit: stacked, expectedEnergisedLoadIds: ['lamp'] })),
    ).toMatch(/overlap/);
  });

  it('rejects wires missing cable metadata', () => {
    const circuit = healthyCircuit();
    circuit.wires[0] = { ...circuit.wires[0]!, lengthMeters: undefined };
    expect(reasonsOf(validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] }))).toMatch(
      /no run length/,
    );
  });

  it('enforces the component budget when one is supplied', () => {
    const circuit = healthyCircuit();
    const result = validateCandidate({
      circuit,
      expectedEnergisedLoadIds: ['lamp'],
      componentBudget: { min: 9, max: 16 },
    });
    expect(result.ok).toBe(false);
    expect(reasonsOf(result)).toMatch(/below budget minimum 9/);
  });
});

describe('validateCandidate — gate 3: simulation', () => {
  it('rejects a component short-circuiting live onto neutral', () => {
    // Port typing makes a *structural* rail crossing impossible, so the only
    // way to bridge the rails is an internal short — exactly the condition
    // `simulate()` detects by overlapping the live and neutral traversals.
    const circuit = healthyCircuit();
    circuit.components.push(
      component('shorted', 'single-way-switch', 480, 270, {
        on: true,
        fault: 'short-circuit',
      }),
    );
    circuit.wires.push(wire('w4', 'mcb', 1, 'shorted', 0));

    const result = validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] });
    expect(result.ok).toBe(false);
    expect(result.rejections.some((rejection) => rejection.stage === 'simulation')).toBe(true);
    expect(reasonsOf(result)).toMatch(/SHORT CIRCUIT/i);
  });

  it('rejects a wire-level open circuit present at baseline', () => {
    const circuit = healthyCircuit();
    circuit.wires[1] = { ...circuit.wires[1]!, fault: 'open-circuit' };
    const result = validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] });
    expect(result.ok).toBe(false);
  });

  it('rejects a protective device left tripped at baseline', () => {
    const circuit = healthyCircuit();
    circuit.components[2] = component('mcb', 'mcb', 300, 150, {
      on: true,
      isTripped: true,
      customMaxAmps: 6,
    });
    expect(validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] }).ok).toBe(false);
  });
});

describe('validateCandidate — gate 4: behaviour', () => {
  it('rejects a circuit whose promised load never energises', () => {
    const circuit = healthyCircuit();
    // Open the protective device so the lamp cannot be reached.
    circuit.components[2] = component('mcb', 'mcb', 300, 150, {
      on: false,
      customMaxAmps: 6,
    });
    const result = validateCandidate({ circuit, expectedEnergisedLoadIds: ['lamp'] });
    expect(result.ok).toBe(false);
    expect(reasonsOf(result)).toMatch(/expected load lamp is not energised/);
  });

  it('rejects a circuit whose load is missing entirely', () => {
    const result = validateCandidate({
      circuit: healthyCircuit(),
      expectedEnergisedLoadIds: ['not-a-component'],
    });
    expect(result.ok).toBe(false);
    expect(reasonsOf(result)).toMatch(/not-a-component is not energised/);
  });
});

describe('validateCandidate — agreement with the generator', () => {
  it('accepts every circuit the generator emits', () => {
    for (const difficulty of ['beginner', 'intermediate', 'advanced'] as const) {
      for (let seed = 1; seed <= 20; seed++) {
        const { circuit, metadata } = generateChallenge({ seed, difficulty });
        const result = validateCandidate({
          circuit,
          expectedEnergisedLoadIds: metadata.baseline.expectedEnergisedLoadIds,
        });
        expect(result.ok, `${difficulty} seed ${seed}: ${reasonsOf(result)}`).toBe(true);
      }
    }
  });
});
