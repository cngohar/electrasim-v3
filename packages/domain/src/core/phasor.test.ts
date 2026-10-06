import { describe, expect, it } from 'vitest';
import { component as C } from '../simulation/auditFixtures';
import { simulate } from '../simulation/simulate';
import type { Circuit } from '../types';
import { compileCircuit } from './compile';
import { terminalId } from './faultTopology';
import { solveCircuit } from './mna';
import { seriesFixture } from './mnaFixtures';
import { type Phasor, phasorMagnitude, phasorVoltageBetween, solvePhasorCircuit } from './phasor';
import {
  deltaPhasorFixture,
  phasorAcceptanceCircuits,
  phasorFixtureDefs,
  starPhasorFixture,
} from './phasorFixtures';
import { assessCircuitReadiness } from './readiness';
import { inspectVoltageConstraints } from './voltageConstraints';

const branch = (id: string, suffix = 'load') => JSON.stringify(['device', id, suffix]);
const wire = (id: string) => JSON.stringify(['wire', id]);
const sum = (a: Phasor, b: Phasor): Phasor => ({
  real: a.real + b.real,
  imaginary: a.imaginary + b.imaginary,
});
const scale = (a: Phasor, k: number): Phasor => ({ real: a.real * k, imaginary: a.imaginary * k });
const subtract = (a: Phasor, b: Phasor): Phasor => sum(a, scale(b, -1));
const phases: Phasor[] = [
  { real: 230, imaginary: 0 },
  { real: -115, imaginary: -115 * Math.sqrt(3) },
  { real: -115, imaginary: 115 * Math.sqrt(3) },
];
function close(actual: Phasor | undefined, expected: Phasor) {
  expect(actual).toBeDefined();
  expect(actual!.real).toBeCloseTo(expected.real, 7);
  expect(actual!.imaginary).toBeCloseTo(expected.imaginary, 7);
}
function solved(circuit = starPhasorFixture(), defs = phasorFixtureDefs()) {
  const result = solvePhasorCircuit(circuit, { defs });
  expect(result.status, JSON.stringify(result.diagnostics)).toBe('converged');
  expect(result.checks?.maximumResidualRatio).toBeLessThanOrEqual(1);
  expect(result.assessment).toBe('not-assessed');
  expect(result.operation).toBe('not-assessed');
  return result;
}

describe('1.5E.0 explicit three-phase source compilation', () => {
  it.each(['abc', 'acb'] as const)(
    'preserves source/phase identity and %s sequence',
    (sequence) => {
      const compiled = compileCircuit(starPhasorFixture(), { defs: phasorFixtureDefs(sequence) });
      expect(compiled.status).toBe('compiled');
      if (compiled.status !== 'compiled') throw new Error('fixture invalid');
      expect(compiled.graph.sources).toHaveLength(3);
      expect(new Set(compiled.graph.sources.map((s) => s.phaseSystemId)).size).toBe(1);
      expect(compiled.graph.sources.map((s) => s.phase)).toEqual(['l1', 'l2', 'l3']);
      expect(compiled.graph.sources.map((s) => s.phaseAngleDegrees)).toEqual(
        sequence === 'abc' ? [0, -120, 120] : [0, 120, -120],
      );
      expect(
        compiled.graph.terminals.filter((t) => t.port?.componentId === 's').map((t) => t.role),
      ).toEqual(['l1', 'l2', 'l3', 'neutral', 'pe']);
      expect(compiled.circuit.components[0].id).toBe('s');
    },
  );

  it.each(['duplicate', 'neutral-as-phase', 'wrong-primary', 'single-phase'] as const)(
    'rejects malformed declaration: %s',
    (change) => {
      const defs = phasorFixtureDefs();
      const model = defs['ac-mains-supply'].electricalModel!;
      if (model.kind !== 'source') throw new Error('fixture invalid');
      if (change === 'duplicate') model.phasePorts = [0, 1, 1];
      if (change === 'neutral-as-phase') model.phasePorts = [0, 1, 3];
      if (change === 'wrong-primary') model.ports = [1, 3];
      if (change === 'single-phase')
        model.supply = { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 };
      expect(compileCircuit(starPhasorFixture(), { defs }).status).toBe('invalid');
      expect(solvePhasorCircuit(starPhasorFixture(), { defs }).terminalVoltages).toEqual({});
    },
  );

  it('keeps two-terminal sources and scalar consumers guarded', () => {
    const legacy = seriesFixture([6], {
      kind: 'ac-three-phase',
      voltage: 230,
      frequencyHz: 50,
      sequence: 'abc',
    });
    expect(solvePhasorCircuit(legacy).status).toBe('unsupported');
    const circuit = starPhasorFixture();
    const result = solveCircuit(circuit, { defs: phasorFixtureDefs() });
    expect(result.status).toBe('unsupported');
    expect(result.terminalVoltages).toEqual({});
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'mna-phasor-entry-required' }),
    );
    const application = simulate(circuit, { defs: phasorFixtureDefs() });
    expect(application.phasor?.status).toBe('converged');
    expect(application.electrical).toBeUndefined();
    expect(application.faultsCleared).toBe(false);
  });

  it('recognizes an inter-phase ideal-source contradiction on the imaginary axis', () => {
    const constraints = [
      { id: 'b', positive: 'p', negative: 'n', voltage: 230, phaseAngleDegrees: -120 },
      { id: 'c', positive: 'p', negative: 'n', voltage: 230, phaseAngleDegrees: 120 },
    ];
    expect(inspectVoltageConstraints(constraints)).toEqual({ conflicting: ['c'], redundant: [] });
    expect(inspectVoltageConstraints([...constraints].reverse())).toEqual(
      inspectVoltageConstraints(constraints),
    );
  });
});

describe('1.5E.0 complex RMS resistive MNA', () => {
  it.each([
    [0, 0, 0],
    [3, 4, 5],
    [-3, -4, 5],
    [3e299, 4e299, 5e299],
    [3e-301, 4e-301, 5e-301],
  ])('computes a bounded complex norm for %s + j%s', (real, imaginary, expected) => {
    const magnitude = phasorMagnitude({ real, imaginary });
    if (expected === 0) expect(magnitude).toBe(0);
    else expect(magnitude / expected).toBeCloseTo(1, 14);
  });
  it.each(['abc', 'acb'] as const)('distinguishes RMS L-N and L-L for %s', (sequence) => {
    const result = solved(starPhasorFixture(), phasorFixtureDefs(sequence));
    for (let i = 0; i < 3; i++) {
      const v = phasorVoltageBetween(result, terminalId('s', i), terminalId('s', 3))!;
      close(
        v,
        sequence === 'abc' ? phases[i] : { real: phases[i].real, imaginary: -phases[i].imaginary },
      );
      expect(phasorMagnitude(v)).toBeCloseTo(230, 8);
      expect(
        phasorMagnitude(
          phasorVoltageBetween(result, terminalId('s', i), terminalId('s', (i + 1) % 3))!,
        ),
      ).toBeCloseTo(230 * Math.sqrt(3), 8);
    }
    expect(phasorVoltageBetween(result, terminalId('s', 0), terminalId('s', 4))).toBeUndefined();
    expect(result.references.find((r) => r.sourceIds.length)?.voltageConvention).toBe(
      'complex-rms',
    );
  });

  it('has balanced arm currents and zero neutral current, with actual wire losses', () => {
    const result = solved();
    const current = 230 / (23 + 0.14);
    for (let i = 0; i < 3; i++) {
      close(result.branchCurrents[branch(`r${i}`)], scale(phases[i], 1 / 23.14));
      expect(result.branchActivePowersWatts[branch(`r${i}`)]).toBeCloseTo(current ** 2 * 23, 7);
      expect(result.wireLossesWatts[`feed${i}`]).toBeCloseTo(current ** 2 * 0.07, 7);
    }
    expect(phasorMagnitude(result.branchCurrents[wire('neutral')])).toBeLessThan(1e-10);
    expect(result.checks?.maximumPowerResidualWatts).toBeLessThan(1e-8);
  });

  it.each([true, false])(
    'derives unbalanced star displacement and neutral current (neutral=%s)',
    (neutral) => {
      const resistances = [23, 46, 92];
      const conductances = resistances.map((r) => 1 / (r + 0.14));
      const numerator = phases.reduce((total, v, i) => sum(total, scale(v, conductances[i])), {
        real: 0,
        imaginary: 0,
      });
      const node = scale(
        numerator,
        1 / (conductances.reduce((a, b) => a + b, 0) + (neutral ? 1 / 0.07 : 0)),
      );
      const result = solved(starPhasorFixture(resistances, neutral));
      close(phasorVoltageBetween(result, terminalId('star', 0), terminalId('s', 3)), node);
      const expected = phases.map((v, i) => scale(subtract(v, node), conductances[i]));
      expected.forEach((i, index) => close(result.branchCurrents[branch(`r${index}`)], i));
      if (neutral) {
        close(result.branchCurrents[wire('neutral')], expected.reduce(sum));
        // Summing magnitudes would be >17 A, versus the actual ~6.5 A neutral.
        expect(phasorMagnitude(result.branchCurrents[wire('neutral')])).toBeLessThan(
          expected.map(phasorMagnitude).reduce((a, b) => a + b),
        );
      } else {
        expect(phasorMagnitude(expected.reduce(sum))).toBeLessThan(1e-10);
        expect(phasorMagnitude(node)).toBeGreaterThan(80);
      }
    },
  );

  it('solves balanced floating star without adding a neutral or PE bond', () => {
    const result = solved(starPhasorFixture([23, 23, 23], false));
    close(phasorVoltageBetween(result, terminalId('star', 0), terminalId('s', 3)), {
      real: 0,
      imaginary: 0,
    });
    expect(result.branchCurrents[wire('neutral')]).toBeUndefined();
    expect(result.terminalDomains[terminalId('s', 4)]).not.toBe(
      result.terminalDomains[terminalId('s', 3)],
    );
  });

  it('solves delta element and source line currents using L-L voltage', () => {
    const result = solved(deltaPhasorFixture());
    const elementCurrent = (230 * Math.sqrt(3)) / 40.14;
    for (let i = 0; i < 3; i++) {
      expect(phasorMagnitude(result.branchCurrents[branch(`r${i}`)])).toBeCloseTo(
        elementCurrent,
        7,
      );
      expect(phasorMagnitude(result.branchCurrents[branch('s', `source:l${i + 1}`)])).toBeCloseTo(
        Math.sqrt(3) * elementCurrent,
        7,
      );
    }
  });

  it('keeps phase loss separate from the remaining driven phases', () => {
    const { circuit, defs } = phasorAcceptanceCircuits()['open-phase'];
    const result = solved(circuit, defs);
    close(result.branchCurrents[branch('r0')], { real: 0, imaginary: 0 });
    close(result.branchCurrents[wire('feed0')], { real: 0, imaginary: 0 });
    expect(phasorMagnitude(result.branchCurrents[branch('r1')])).toBeGreaterThan(9);
    expect(phasorMagnitude(result.branchCurrents[branch('r2')])).toBeGreaterThan(9);
    expect(phasorMagnitude(result.branchVoltages[wire('feed0')])).toBeGreaterThan(229);
  });

  it('uses declared finite impedance for an inter-phase short without a fixed current', () => {
    const { circuit, defs } = phasorAcceptanceCircuits().interphase;
    const result = solved(circuit, defs);
    close(
      result.branchCurrents[wire('interphase')],
      scale(subtract(phases[0], phases[1]), 1 / 0.07),
    );
    expect(phasorMagnitude(result.branchCurrents[wire('interphase')])).toBeCloseTo(
      (230 * Math.sqrt(3)) / 0.07,
      7,
    );
    expect(result.assessment).toBe('not-assessed');
    expect(assessCircuitReadiness(circuit, { defs }).topology).toBe('short');
    expect(result.diagnostics).toContainEqual(expect.objectContaining({ code: 'readiness-short' }));
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'wire-capacity-exceeded', wireId: 'interphase' }),
    );
  });

  it('never compares different floating references or synchronizes independent systems', () => {
    const fixtures = phasorAcceptanceCircuits();
    const result = solved(fixtures.independent.circuit, fixtures.independent.defs);
    expect(
      phasorVoltageBetween(result, terminalId('s', 0), terminalId('other', 0)),
    ).toBeUndefined();
    const joined = solvePhasorCircuit(fixtures['unsynchronized-join'].circuit, {
      defs: fixtures['unsynchronized-join'].defs,
    });
    expect(joined.status).toBe('unsupported');
    expect(joined.branchCurrents).toEqual({});
  });

  it.each(['unknown-motor', 'dc', 'transformer', 'timer', 'invalid-port'])(
    'withholds unsupported/invalid %s measurements',
    (name) => {
      const circuit = starPhasorFixture();
      if (name === 'unknown-motor') circuit.components.push(C('motor', 'motor-3phase'));
      if (name === 'dc') circuit.components.push(C('dc', 'dc-battery-12v'));
      if (name === 'transformer') circuit.components.push(C('tx', 'transformer-12v'));
      if (name === 'timer') circuit.components.push(C('dimmer', 'dimmer'));
      if (name === 'invalid-port') circuit.wires[0].fromPortIndex = 99;
      const result = solvePhasorCircuit(circuit, { defs: phasorFixtureDefs() });
      expect(['invalid', 'unsupported']).toContain(result.status);
      expect(result.terminalVoltages).toEqual({});
      expect(result.checks).toBeNull();
    },
  );

  it('agrees with the scalar single-phase resistive solve', () => {
    const circuit = seriesFixture([6, 12], {
      kind: 'ac-single-phase',
      voltage: 12,
      frequencyHz: 50,
    });
    const scalar = solveCircuit(circuit);
    const complex = solvePhasorCircuit(circuit);
    expect(complex.status).toBe('converged');
    for (const [id, i] of Object.entries(scalar.branchCurrents))
      close(complex.branchCurrents[id], { real: i, imaginary: 0 });
  });

  it('rejects joined source frequencies before numerical projection', () => {
    const circuit = starPhasorFixture();
    circuit.components.push(
      C('other', 'diesel-generator', {
        sourceProfile: {
          version: 1,
          model: { kind: 'ac-single-phase', voltage: 230, frequencyHz: 60 },
          provenance: { voltage: 'explicit', frequency: 'explicit' },
        },
      }),
    );
    circuit.wires.push({
      ...circuit.wires[0],
      id: 'join',
      fromComponentId: 'other',
      fromPortIndex: 1,
      toComponentId: 's',
      toPortIndex: 3,
    });
    const result = solvePhasorCircuit(circuit, { defs: phasorFixtureDefs() });
    expect(result.status).toBe('unsupported');
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'phasor-frequency-mismatch' }),
    );
    expect(result.branchCurrents).toEqual({});
  });

  it('reports empty, off-source and no-load states without inventing operating success', () => {
    expect(solvePhasorCircuit({ components: [], wires: [] }).status).toBe('not-solved');
    const circuit = starPhasorFixture();
    circuit.components[0].state.isBlown = true;
    const off = solvePhasorCircuit(circuit, { defs: phasorFixtureDefs() });
    expect(off.status).toBe('not-solved');
    expect(off.terminalVoltages).toEqual({});
    const noLoad = solved({ components: [C('s', 'ac-mains-supply')], wires: [] });
    for (const current of Object.values(noLoad.branchCurrents))
      close(current, { real: 0, imaginary: 0 });
  });

  it('recovers signed complex currents through static contact poles', () => {
    const circuit = starPhasorFixture();
    circuit.components.push(C('pole', 'mcb', { on: true }));
    const feed = circuit.wires[0];
    circuit.wires[0] = { ...feed, toComponentId: 'pole', toPortIndex: 0 };
    circuit.wires.push({ ...feed, id: 'after-pole', fromComponentId: 'pole', fromPortIndex: 1 });
    const closed = solved(circuit);
    close(
      closed.branchCurrents[branch('pole', 'contact:0:no')],
      closed.branchCurrents[branch('r0')],
    );
    circuit.components.find((c) => c.id === 'pole')!.state.on = false;
    const open = solved(circuit);
    close(open.branchCurrents[branch('r0')], { real: 0, imaginary: 0 });
    expect(open.coverage).toContainEqual(
      expect.objectContaining({ subjectId: 'pole', aspect: 'protection', status: 'not-assessed' }),
    );
  });

  it('is deterministic under drawing order permutations and preserves the input', () => {
    const circuit = starPhasorFixture([23, 46, 92], false);
    const snapshot = JSON.stringify(circuit);
    const result = solved(circuit);
    const permuted: Circuit = {
      ...circuit,
      components: [...circuit.components].reverse(),
      wires: [...circuit.wires].reverse(),
    };
    expect(solved(permuted)).toEqual(result);
    expect(JSON.stringify(circuit)).toBe(snapshot);
  });
});
