import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { component as C } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import type { ElectricalSimulationResult } from './contracts';
import { terminalId } from './faultTopology';
import { MNA_LIMITS, solveCircuit, voltageBetween } from './mna';
import {
  balancedBridgeFixture,
  leadFixture,
  mnaAcceptanceCircuits,
  opposedSourceFixture,
  parallelFixture,
  resistorFixture,
  seriesFixture,
  sourceFixture,
  unbalancedBridgeFixture,
} from './mnaFixtures';

const wire = (id: string) => JSON.stringify(['wire', id]);
const load = (id: string) => JSON.stringify(['device', id, 'load']);
const sourceId = (id: string) => JSON.stringify(['source', id]);
const value = (actual: number | undefined, expected: number) => {
  expect(actual).toBeTypeOf('number');
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(1e-9 + Math.abs(expected) * 1e-6);
};
function solved(circuit: Circuit): ElectricalSimulationResult {
  const result = solveCircuit(circuit);
  expect(result.status, JSON.stringify(result.diagnostics)).toBe('converged');
  expect(result.checks?.maximumResidualRatio).toBeLessThanOrEqual(1);
  expect(result.operation).toBe('not-assessed');
  expect(result.assessment).toBe('not-assessed');
  return result;
}

describe('1.5C.1 independent linear electrical acceptance', () => {
  it('solves two fixed 6-ohm elements in series at 12 V including all three 0.07-ohm leads', () => {
    const circuit = seriesFixture();
    const snapshot = JSON.stringify(circuit);
    const result = solved(circuit);
    const current = 12 / (6 + 6 + 3 * 0.07);
    value(result.branchCurrents[wire('feed')], current);
    value(result.branchCurrents[wire('join0')], current);
    value(result.branchCurrents[wire('return')], current);
    value(result.branchCurrents[load('r0')], current);
    value(result.branchVoltages[load('r0')], current * 6);
    value(result.branchVoltages[load('r1')], current * 6);
    value(result.branchPowers[load('r0')], current * current * 6);
    value(result.branchCurrents[result.sourceBranches[sourceId('s')]!], -current);
    value(result.branchPowers[result.sourceBranches[sourceId('s')]!], -12 * current);
    value(result.wireLosses.feed, current * current * 0.07);
    value(
      Object.values(result.branchPowers).reduce((sum, power) => sum + power, 0),
      0,
    );
    expect(result.checks?.maximumKclResidualAmps).toBeLessThan(1e-9);
    expect(result.checks?.maximumSourceResidualVolts).toBeLessThan(1e-9);
    expect(result.checks?.maximumPowerResidualWatts).toBeLessThan(1e-9);
    expect(JSON.stringify(circuit)).toBe(snapshot);
    expect(solved(importJSON(exportJSON(circuit)))).toEqual(result);
  });

  it('gives unequal parallel branches their own current and the source their sum', () => {
    const result = solved(parallelFixture());
    const a = 12 / (6 + 2 * 0.07);
    const b = 12 / (12 + 2 * 0.07);
    value(result.branchCurrents[wire('feed0')], a);
    value(result.branchCurrents[wire('return0')], a);
    value(result.branchCurrents[wire('feed1')], b);
    value(result.branchVoltages[load('r1')], 12 * b);
    value(result.branchCurrents[result.sourceBranches[sourceId('s')]!], -(a + b));
  });

  it('solves a shared feeder and recovers the internal junction current by KCL', () => {
    const result = solved(parallelFixture(true));
    const parallel = 1 / (1 / 6.14 + 1 / 12.14);
    const total = 12 / (0.07 + parallel);
    const bus = 12 - total * 0.07;
    const a = bus / 6.14;
    const b = bus / 12.14;
    value(result.branchCurrents[wire('feeder')], total);
    value(result.branchCurrents[wire('feed0')], a);
    value(result.branchCurrents[wire('feed1')], b);
    value(result.branchCurrents[JSON.stringify(['device', 'joint', 'link:0:2'])], a + b);
    value(result.wireLosses.feeder, total * total * 0.07);
    value(voltageBetween(result, terminalId('joint', 2), terminalId('s', 1)), bus);
  });

  it('has no bridge current at the independently balanced operating point', () => {
    const result = solved(balancedBridgeFixture());
    value(result.branchCurrents[load('bridge')], 0);
    value(result.branchCurrents[wire('bridge-a')], 0);
    value(result.branchVoltages[load('bridge')], 0);
    value(result.branchCurrents[wire('a-feed')], 12 / 12.21);
    value(result.branchCurrents[wire('b-feed')], 12 / 12.21);
  });

  it('matches an independent Thevenin calculation for an unbalanced bridge', () => {
    const result = solved(unbalancedBridgeFixture());
    // Open-bridge divider voltages and parallel source resistances. The upper
    // legs include one lead; each lower leg and the bridge include two leads.
    const openA = (12 * 6.14) / (6.07 + 6.14);
    const openB = (12 * 12.14) / (6.07 + 12.14);
    const resistanceA = (6.07 * 6.14) / (6.07 + 6.14);
    const resistanceB = (6.07 * 12.14) / (6.07 + 12.14);
    const bridgeCurrent = (openA - openB) / (resistanceA + 6.14 + resistanceB);
    const a = openA - bridgeCurrent * resistanceA;
    const b = openB + bridgeCurrent * resistanceB;
    expect(bridgeCurrent).toBeLessThan(0);
    value(result.branchCurrents[load('bridge')], bridgeCurrent);
    value(result.branchVoltages[load('bridge')], bridgeCurrent * 6);
    value(result.branchCurrents[wire('bridge-a')], bridgeCurrent);
    value(result.branchCurrents[wire('a-feed')], (12 - a) / 6.07);
    value(result.branchCurrents[wire('a-return')], a / 6.14);
    value(result.branchCurrents[wire('b-feed')], (12 - b) / 6.07);
    value(result.branchCurrents[wire('b-return')], b / 12.14);
  });

  it('retains a live dangling voltage and zero current across an open return', () => {
    const circuit = mnaAcceptanceCircuits()['open-return']!;
    const result = solved(circuit);
    for (const current of Object.values(result.branchCurrents)) value(current, 0);
    value(result.terminalVoltages[terminalId('r1', 1)], 12);
    value(result.branchVoltages[wire('return')], 12);
    value(result.branchPowers[wire('return')], 0);
    value(result.branchPowers[load('r1')], 0);
  });

  it('does not compare isolated references or silently bond PE and DC negative', () => {
    const result = solved(mnaAcceptanceCircuits().independent!);
    value(result.branchCurrents[wire('dc-feed')], 12 / 6.14);
    value(result.branchCurrents[wire('ac-feed')], 230 / 100.14);
    expect(voltageBetween(result, terminalId('dc', 0), terminalId('ac', 0))).toBeUndefined();
    expect(voltageBetween(result, terminalId('ac', 1), terminalId('ac', 2))).toBeUndefined();
    expect(voltageBetween(result, 'toString', 'toString')).toBeUndefined();
    expect(voltageBetween(result, 'constructor', 'constructor')).toBeUndefined();
    expect(result.references.filter((reference) => reference.sourceIds.length)).toEqual([
      expect.objectContaining({
        kind: 'mathematical-gauge',
        sourceIds: [sourceId('ac')],
        voltageConvention: 'signed-rms',
        frequencyHz: 60,
      }),
      expect.objectContaining({
        kind: 'mathematical-gauge',
        sourceIds: [sourceId('dc')],
        voltageConvention: 'dc',
      }),
    ]);
  });

  it('omits voltage across an open gap between two independent domains', () => {
    const circuit: Circuit = {
      components: [sourceFixture('s', { kind: 'dc', voltage: 12 }), resistorFixture('floating', 6)],
      wires: [{ ...leadFixture('gap', 's', 0, 'floating', 0), fault: 'open-circuit' }],
    };
    const result = solved(circuit);
    value(result.branchCurrents[wire('gap')], 0);
    value(result.branchPowers[wire('gap')], 0);
    value(result.branchVoltages[load('floating')], 0);
    expect(result.branchVoltages[wire('gap')]).toBeUndefined();
    expect(result.unavailableBranchVoltages[wire('gap')]).toBe('independent-references');
    expect(voltageBetween(result, terminalId('s', 0), terminalId('floating', 0))).toBeUndefined();
  });

  it('uses independent DC constraints with signed delivery and absorption', () => {
    const result = solved(opposedSourceFixture());
    const current = (12 - 6) / (2 * 0.07);
    value(result.branchCurrents[wire('positive')], current);
    value(result.branchCurrents[result.sourceBranches[sourceId('a')]!], -current);
    value(result.branchCurrents[result.sourceBranches[sourceId('b')]!], current);
    value(result.branchPowers[result.sourceBranches[sourceId('b')]!], 6 * current);
    value(result.terminalVoltages[terminalId('b', 1)], 3);
    value(result.terminalVoltages[terminalId('b', 0)], 9);
    value(result.wireLosses.positive! + result.wireLosses.return!, (12 - 6) * current);
  });

  it('keeps equal sources determinate when actual finite lead impedances are present', () => {
    const result = solved(
      opposedSourceFixture({ kind: 'dc', voltage: 12 }, { kind: 'dc', voltage: 12 }),
    );
    for (const current of Object.values(result.branchCurrents)) value(current, 0);
    value(voltageBetween(result, terminalId('a', 0), terminalId('a', 1)), 12);
  });

  it('reverses wire current and voltage signs while preserving its loss', () => {
    const circuit = seriesFixture();
    const original = solved(circuit);
    const lead = circuit.wires[0]!;
    [lead.fromComponentId, lead.toComponentId] = [lead.toComponentId, lead.fromComponentId];
    [lead.fromPortIndex, lead.toPortIndex] = [lead.toPortIndex, lead.fromPortIndex];
    const reversed = solved(circuit);
    value(reversed.branchCurrents[wire('feed')], -original.branchCurrents[wire('feed')]!);
    value(reversed.branchVoltages[wire('feed')], -original.branchVoltages[wire('feed')]!);
    value(reversed.wireLosses.feed, original.wireLosses.feed!);
  });

  it('uses supplied static contact state without latching or advancing devices', () => {
    const circuit = seriesFixture();
    circuit.components.push(C('switch', 'single-way-switch', { on: false }));
    circuit.wires[0] = leadFixture('feed', 's', 0, 'switch', 0);
    circuit.wires.push(leadFixture('switched', 'switch', 1, 'r0', 0));
    value(solved(circuit).branchCurrents[wire('feed')], 0);
    const on = solveCircuit(circuit, { contactStates: new Map([['switch', true]]) });
    expect(on.status).toBe('converged');
    value(on.branchCurrents[wire('feed')], 12 / (12 + 4 * 0.07));
    expect(circuit.components.at(-1)?.state.on).toBe(false);
  });

  it.each([12, 120, 230])(
    'solves single-source AC RMS at %s V with its saved frequency',
    (voltage) => {
      const result = solved(
        seriesFixture([6, 6], { kind: 'ac-single-phase', voltage, frequencyHz: 60 }),
      );
      value(result.branchCurrents[wire('feed')], voltage / 12.21);
      expect(result.references.find((reference) => reference.sourceIds.length)?.frequencyHz).toBe(
        60,
      );
    },
  );

  it.each([
    [0.001, [6, 12, 18]],
    [12, [0.01, 6, 24]],
    [48, [120, 240]],
    [240, [2000, 3000, 5000]],
    [100_000, [10_000, 100_000]],
  ] as const)(
    'matches independent series arithmetic across scales: %s V, %s ohms',
    (voltage, resistances) => {
      const result = solved(seriesFixture([...resistances], { kind: 'dc', voltage }));
      const current =
        voltage /
        (resistances.reduce((sum, resistance) => sum + resistance, 0) +
          (resistances.length + 1) * 0.07);
      value(result.branchCurrents[wire('feed')], current);
      resistances.forEach((resistance, index) =>
        value(result.branchVoltages[load(`r${index}`)], current * resistance),
      );
    },
  );
});

describe('1.5C.1 unavailable results stay distinct from measurements', () => {
  it.each([
    ['source-short', 'invalid', 'mna-conflicting-source'],
    ['numerical-range', 'nonconverged', 'mna-conservation-failed'],
    ['unknown-load', 'unsupported', 'mna-model-unsupported'],
    ['mixed-kinds', 'unsupported', 'mna-mixed-source-kinds'],
    ['mixed-frequency', 'unsupported', 'mna-source-frequency-mismatch'],
    ['undeclared-phase', 'unsupported', 'mna-ac-source-phase-unassessed'],
    ['empty', 'not-solved', 'mna-empty'],
    ['no-source', 'not-solved', 'mna-no-source'],
  ])('%s returns %s without telemetry', (fixture, status, code) => {
    const result = solveCircuit(mnaAcceptanceCircuits()[fixture]);
    expect(result.status).toBe(status);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === code)).toBe(true);
    expect(result.terminalVoltages).toEqual({});
    expect(result.terminalDomains).toEqual({});
    expect(result.branchCurrents).toEqual({});
    expect(result.branchVoltages).toEqual({});
    expect(result.branchPowers).toEqual({});
    expect(result.wireLosses).toEqual({});
    expect(result.sourceBranches).toEqual({});
    expect(result.unavailableBranchVoltages).toEqual({});
    expect(result.references).toEqual([]);
    expect(result.checks).toBeNull();
    expect(result.operation).toBe('not-assessed');
    expect(voltageBetween(result, 'missing', 'missing')).toBeUndefined();
  });

  it.each(['relay-spst', 'transformer-12v', 'solar-pv-panel', 'motor-3phase'])(
    'never drops an unknown %s branch or substitutes resistance',
    (type) => {
      const circuit = seriesFixture();
      circuit.components.push(C('unknown', type));
      const result = solveCircuit(circuit);
      expect(result.status).toBe('unsupported');
      expect(result.branchCurrents).toEqual({});
    },
  );

  it('rejects indeterminate ideal link currents instead of dividing them equally', () => {
    const circuit = seriesFixture();
    circuit.components.push(C('breaker', 'mcb', { on: true }));
    circuit.faults = [
      {
        id: 'bypass',
        type: 'protection-bypass',
        category: 'protection',
        target: { type: 'component', id: 'breaker' },
        createdAt: 0,
      },
    ];
    const result = solveCircuit(circuit);
    expect(result.status).toBe('not-solved');
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'mna-indeterminate-link-current'),
    ).toBe(true);
    expect(result.branchCurrents).toEqual({});
  });

  it('rejects a too-large driven matrix without weakening the document input limit', () => {
    const circuit = seriesFixture(Array(MNA_LIMITS.maxUnknownsPerDomain).fill(6));
    const result = solveCircuit(circuit);
    expect(result.status).toBe('not-solved');
    expect(result.diagnostics[0]?.code).toBe('mna-size-limit');
    expect(result.terminalVoltages).toEqual({});
  });

  it('bounds total active unknowns even across small independent domains', () => {
    const circuit: Circuit = {
      components: Array.from({ length: MNA_LIMITS.maxTotalUnknowns / 2 + 1 }, (_, index) =>
        sourceFixture(`s${index}`, { kind: 'dc', voltage: 12 }),
      ),
      wires: [],
    };
    const result = solveCircuit(circuit);
    expect(result.status).toBe('not-solved');
    expect(result.diagnostics[0]?.code).toBe('mna-size-limit');
    expect(result.checks).toBeNull();
  });

  it('bounds cumulative factorization work below the total unknown limit', () => {
    const circuits = [0, 1, 2].map((index) => {
      const circuit = seriesFixture(Array(255).fill(6));
      return {
        components: circuit.components.map((component) => ({
          ...component,
          id: `${index}:${component.id}`,
        })),
        wires: circuit.wires.map((lead) => ({
          ...lead,
          id: `${index}:${lead.id}`,
          fromComponentId: `${index}:${lead.fromComponentId}`,
          toComponentId: `${index}:${lead.toComponentId}`,
        })),
      };
    });
    const result = solveCircuit({
      components: circuits.flatMap((circuit) => circuit.components),
      wires: circuits.flatMap((circuit) => circuit.wires),
    });
    expect(result.status).toBe('not-solved');
    expect(result.diagnostics[0]?.code).toBe('mna-size-limit');
    expect(result.checks).toBeNull();
  });

  it('discards already solved domains when a later measurement check fails', () => {
    const circuit = mnaAcceptanceCircuits()['numerical-range']!;
    circuit.components.push(sourceFixture('a-first', { kind: 'dc', voltage: 5 }));
    const result = solveCircuit(circuit);
    expect(result.status).toBe('nonconverged');
    expect(result.terminalVoltages).toEqual({});
    expect(result.branchCurrents).toEqual({});
    expect(result.references).toEqual([]);
    expect(result.checks).toBeNull();
  });

  it('validates direct hostile input before any electrical solve', () => {
    for (const input of [null, {}, { components: [], wires: [{ id: 'orphan' }] }]) {
      const result = solveCircuit(input);
      expect(result.status).toBe('invalid');
      expect(result.branchCurrents).toEqual({});
    }
    const circuit = seriesFixture();
    circuit.wires[0]!.fromPortIndex = 99;
    expect(solveCircuit(circuit).status).toBe('invalid');
  });

  it.each(Object.entries(mnaAcceptanceCircuits()))(
    '%s has stable output under input-order changes',
    (_name, circuit) => {
      const snapshot = JSON.stringify(circuit);
      const result = solveCircuit(circuit);
      expect(
        solveCircuit({
          ...circuit,
          components: [...circuit.components].reverse(),
          wires: [...circuit.wires].reverse(),
        }),
      ).toEqual(result);
      expect(JSON.stringify(circuit)).toBe(snapshot);
    },
  );
});
