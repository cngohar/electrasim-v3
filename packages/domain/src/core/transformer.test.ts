import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { COMPONENT_DEFS } from '../components';
import { component as C } from '../simulation/auditFixtures';
import type { Circuit } from '../types';
import { compileCircuit } from './compile';
import { terminalId } from './faultTopology';
import { solveCircuit, voltageBetween } from './mna';
import { sourceFixture } from './mnaFixtures';
import { transformerAcceptanceCircuits, transformerFixture } from './transformerFixtures';

const value = (actual: number | undefined, expected: number) => {
  expect(Number.isFinite(actual)).toBe(true);
  expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(1e-9 + Math.abs(expected) * 1e-6);
};
const loadId = JSON.stringify(['device', 'r', 'load']);
const wireId = (id: string) => JSON.stringify(['wire', id]);
function solved(circuit: Circuit) {
  const result = solveCircuit(circuit);
  expect(result.status, JSON.stringify(result.diagnostics)).toBe('converged');
  expect(result.checks?.maximumResidualRatio).toBeLessThanOrEqual(1);
  expect(result.assessment).toBe('not-assessed');
  return result;
}

describe('1.5C.3 ideal isolated AC transformer equations', () => {
  it.each([8, 12, 24] as const)(
    'solves the %s V winding using reflected impedance and both lead pairs',
    (output) => {
      const result = solved(transformerFixture(output));
      const n = 230 / output;
      const ip = 230 / (0.14 + n * n * 6.14);
      const vp = 230 - ip * 0.14;
      const vs = vp / n;
      const tx = result.transformers[0]!;
      value(tx.primaryCurrentAmps, ip);
      value(tx.secondaryCurrentAmps, -n * ip);
      value(tx.primaryVoltageVolts, vp);
      value(tx.secondaryVoltageVolts, vs);
      value(tx.primaryPowerWatts, vp * ip);
      value(tx.secondaryPowerWatts, -vp * ip);
      value(result.branchCurrents[loadId], n * ip);
      value(result.branchVoltages[loadId], n * ip * 6);
      value(result.wireLosses['primary-feed'], ip * ip * 0.07);
      value(result.wireLosses['secondary-feed'], n * n * ip * ip * 0.07);
      expect(tx.connection).toBe('galvanically-isolated');
      expect(tx.primaryDomainId).not.toBe(tx.secondaryDomainId);
      expect(result.references.filter((ref) => ref.sourceIds.length)).toHaveLength(2);
      expect(voltageBetween(result, terminalId('tx', 0), terminalId('tx', 2))).toBeUndefined();
      expect(voltageBetween(result, terminalId('tx', 3), terminalId('s', 2))).toBeUndefined();
      for (const domain of result.checks!.domains) value(domain.powerResidualWatts, 0);
      value(result.checks!.maximumTransformerPowerResidualWatts, 0);
      expect(result.loads[0]!.sourceIds).toEqual([JSON.stringify(['source', 's'])]);
      expect(
        result.loads[0]!.compatibility.reasons.some((reason) => reason.code === 'missing-supply'),
      ).toBe(false);
    },
  );

  it.each(['no-load', 'open-return'])(
    '%s preserves secondary AC voltage with zero excitation/load current',
    (name) => {
      const result = solved(transformerAcceptanceCircuits()[name]!);
      value(result.transformers[0]!.secondaryVoltageVolts, 12);
      for (const current of Object.values(result.branchCurrents)) value(current, 0);
      expect(result.transformers[0]!.frequencyHz).toBe(50);
      if (name === 'open-return') value(result.branchVoltages[wireId('secondary-return')], 12);
    },
  );

  it('supports reverse power transfer without treating a transformer as a rectifier', () => {
    const result = solved(transformerAcceptanceCircuits().backfeed!);
    const n = 230 / 12;
    const secondaryInput = 12 / (0.14 + 100.14 / (n * n));
    const tx = result.transformers[0]!;
    value(tx.secondaryCurrentAmps, secondaryInput);
    value(tx.primaryCurrentAmps, -secondaryInput / n);
    value(tx.primaryVoltageVolts, (12 - secondaryInput * 0.14) * n);
    expect(tx.primaryPowerWatts).toBeLessThan(0);
    expect(tx.secondaryPowerWatts).toBeGreaterThan(0);
    expect(tx.frequencyHz).toBe(60);
    expect(
      result.references
        .filter((ref) => ref.sourceIds.length)
        .every((ref) => ref.voltageConvention === 'signed-rms'),
    ).toBe(true);
  });

  it('preserves winding polarity and reverses load current with reversed secondary leads', () => {
    const original = solved(transformerFixture());
    const result = solved(transformerAcceptanceCircuits().reversed!);
    value(result.branchCurrents[loadId], -original.branchCurrents[loadId]!);
    value(result.branchVoltages[loadId], -original.branchVoltages[loadId]!);
    value(result.branchPowers[loadId], original.branchPowers[loadId]!);
    value(
      result.transformers[0]!.secondaryVoltageVolts,
      original.transformers[0]!.secondaryVoltageVolts,
    );
  });

  it('solves cascaded windings together with a gauge for each galvanic domain', () => {
    const result = solved(transformerAcceptanceCircuits().cascade!);
    const n1 = 230 / 24;
    const n2 = 230 / 12;
    const input = 230 / (0.14 + n1 * n1 * (0.14 + n2 * n2 * 6.14));
    value(result.branchCurrents[loadId], n1 * n2 * input);
    value(result.transformers[0]!.primaryCurrentAmps, input);
    value(result.transformers[1]!.primaryCurrentAmps, n1 * input);
    expect(
      result.checks!.couplingGroups.find((group) => group.transformerIds.length)?.domainIds,
    ).toHaveLength(3);
    expect(
      new Set(
        result.references.filter((ref) => ref.sourceIds.length).map((ref) => ref.couplingGroupId),
      ).size,
    ).toBe(1);
  });

  it('recognizes an explicit external winding bond without creating another implicit bond', () => {
    const result = solved(transformerAcceptanceCircuits()['externally-bonded']!);
    expect(result.transformers[0]!.connection).toBe('externally-connected');
    value(result.branchCurrents[wireId('external-bond')], 0);
    value(voltageBetween(result, terminalId('tx', 1), terminalId('tx', 3)), 0);
    expect(voltageBetween(result, terminalId('tx', 3), terminalId('s', 2))).toBeUndefined();
  });

  it('calculates only the declared-network short estimate, including reflected primary lead resistance', () => {
    const result = solved(transformerAcceptanceCircuits()['secondary-short']!);
    const n = 230 / 12;
    const current = 12 / (0.07 + 0.14 / (n * n));
    value(result.branchCurrents[wireId('secondary-short')], current);
    value(result.transformers[0]!.primaryCurrentAmps, current / n);
    expect(result.transformers[0]!.lossesAndSaturation).toBe('not-assessed');
    expect(
      result.coverage.some((coverage) => coverage.reason.includes('prospective fault current')),
    ).toBe(true);
  });

  it('keeps separate transformer/source frequencies and measurements independent', () => {
    const first = transformerFixture();
    const other = transformerFixture(24, 12, {
      kind: 'ac-single-phase',
      voltage: 120,
      frequencyHz: 60,
    });
    other.components.forEach((component) => {
      component.id = `other-${component.id}`;
    });
    other.wires.forEach((wire) => {
      wire.id = `other-${wire.id}`;
      wire.fromComponentId = `other-${wire.fromComponentId}`;
      wire.toComponentId = `other-${wire.toComponentId}`;
    });
    const result = solved({
      components: [...first.components, ...other.components],
      wires: [...first.wires, ...other.wires],
    });
    value(result.branchCurrents[loadId], solved(first).branchCurrents[loadId]!);
    expect(result.transformers.map((tx) => tx.frequencyHz)).toEqual([60, 50]);
    expect(voltageBetween(result, terminalId('tx', 2), terminalId('other-tx', 2))).toBeUndefined();
  });

  it.each(Object.entries(transformerAcceptanceCircuits()))(
    '%s is deterministic and preserves the saved document',
    (_name, circuit) => {
      const before = JSON.stringify(circuit);
      const result = solveCircuit(circuit);
      expect(
        solveCircuit({
          ...circuit,
          components: [...circuit.components].reverse(),
          wires: [...circuit.wires].reverse(),
        }),
      ).toEqual(result);
      expect(solveCircuit(importJSON(exportJSON(circuit)))).toEqual(result);
      expect(JSON.stringify(circuit)).toBe(before);
    },
  );
});

describe('1.5C.3 explicit transformer limits', () => {
  it.each([
    ['dc', 'mna-transformer-dc-unsupported'],
    ['mixed-frequency', 'mna-source-frequency-mismatch'],
    ['broken-winding', 'mna-transformer-broken-winding'],
  ])('%s remains unavailable without invented measurements', (fixture, code) => {
    const result = solveCircuit(transformerAcceptanceCircuits()[fixture]);
    expect(result.status).toBe('unsupported');
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === code)).toBe(true);
    expect(result.branchCurrents).toEqual({});
    expect(result.transformers).toEqual([]);
    expect(result.checks).toBeNull();
  });

  it('does not assume synchronization for sources connected through isolated windings', () => {
    const circuit = transformerAcceptanceCircuits()['mixed-frequency']!;
    circuit.components[circuit.components.length - 1] = sourceFixture('other', {
      kind: 'ac-single-phase',
      voltage: 12,
      frequencyHz: 50,
    });
    const result = solveCircuit(circuit);
    expect(result.status).toBe('unsupported');
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'mna-ac-source-phase-unassessed'),
    ).toBe(true);
  });

  it('does not regularize an entirely floating ideal transformer with fictitious magnetizing resistance', () => {
    const result = solveCircuit({
      components: [sourceFixture('s', { kind: 'dc', voltage: 12 }), C('tx', 'transformer-12v')],
      wires: [],
    });
    expect(result.status).toBe('nonconverged');
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'mna-linear-singular')).toBe(
      true,
    );
    expect(result.branchCurrents).toEqual({});
  });

  it.each([Number.POSITIVE_INFINITY, Number.NaN, 0, -1])(
    'rejects invalid winding ratings %s before stamping',
    (voltage) => {
      const def = COMPONENT_DEFS['transformer-12v']!;
      const result = compileCircuit(transformerFixture(), {
        defs: {
          ...COMPONENT_DEFS,
          'transformer-12v': {
            ...def,
            electricalModel: {
              kind: 'transformer',
              primary: [0, 1],
              secondary: [2, 3],
              primaryVoltage: 230,
              secondaryVoltage: voltage,
              isolation: 'isolated',
              approximation: 'Fixture',
            },
          },
        },
      });
      expect(result.status).toBe('invalid');
    },
  );
});
