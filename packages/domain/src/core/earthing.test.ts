import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { COMPONENT_DEFS } from '../components';
import type { Circuit } from '../types';
import { earthFaultFixture, earthingAcceptanceCircuits, peReturnFixture } from './earthingFixtures';
import { terminalId } from './faultTopology';
import { solveCircuit, voltageBetween } from './mna';
import { leadFixture } from './mnaFixtures';
import { assessCircuitReadiness } from './readiness';
import { transformerAcceptanceCircuits } from './transformerFixtures';

const value = (actual: number | null | undefined, expected: number) => {
  expect(typeof actual).toBe('number');
  expect(Math.abs(actual! - expected)).toBeLessThanOrEqual(1e-9 + Math.abs(expected) * 1e-6);
};
const wire = (id: string) => JSON.stringify(['wire', id]);
const load = JSON.stringify(['device', 'r', 'load']);
function solved(circuit: Circuit) {
  const result = solveCircuit(circuit);
  expect(result.status, JSON.stringify(result.diagnostics)).toBe('converged');
  expect(result.checks?.maximumResidualRatio).toBeLessThanOrEqual(1);
  expect(result.assessment).toBe('not-assessed');
  return result;
}

describe('1.5C.3 physical PE/reference relationships', () => {
  it('does not create a neutral/PE bond or a power source from a reference', () => {
    const floating = solved(earthFaultFixture(false));
    expect(floating.readiness.earthing.bonds).toEqual([]);
    value(floating.faultCurrents[0]!.currentAmps, 0);
    // The fault pulls the entire unbonded PE to line potential despite zero current.
    value(voltageBetween(floating, terminalId('socket', 2), terminalId('s', 1)), 230);
    expect(
      floating.diagnostics.some(
        (diagnostic) =>
          diagnostic.code === 'fault-current-limited' &&
          diagnostic.message.includes('zero current'),
      ),
    ).toBe(true);
    const result = solveCircuit(earthingAcceptanceCircuits()['pe-only']);
    expect(result.status).toBe('not-solved');
    expect(result.sourceBranches).toEqual({});
    expect(result.readiness.topology).toBe('no-source');
    expect(result.branchCurrents).toEqual({});
  });

  it('uses the explicitly bonded L-PE return and keeps normal neutral current zero', () => {
    const result = solved(earthFaultFixture());
    const current = 230 / (3 * 0.07);
    value(result.faultCurrents[0]!.currentAmps, current);
    value(result.branchCurrents[wire('feed')], current);
    value(result.branchCurrents[wire('cpc')], current);
    value(result.branchCurrents[wire('bond')], current);
    value(result.branchCurrents[wire('return')], 0);
    expect(result.readiness.earthing.bonds).toHaveLength(1);
    expect(result.readiness.earthing.bonds[0]!.returns).toContainEqual({
      terminalId: terminalId('s', 1),
      kind: 'neutral',
    });
    expect(result.readiness.earthing.bonds[0]!.branchIds).not.toContain(
      JSON.stringify(['fault', 'fault']),
    );
    expect(result.readiness.earthing.continuity[0]).toMatchObject({
      status: 'connected-to-reference',
      returnBond: 'present',
      loopImpedanceAndClearing: 'not-assessed',
    });
    expect(result.faultCurrents[0]).toMatchObject({
      basis: 'declared-network-estimate',
      installationProspectiveCurrent: 'not-assessed',
      clearing: 'not-assessed',
    });
  });

  it('keeps a broken CPC distinct from an earth short and does not treat the fault as a bond', () => {
    const result = solved(earthingAcceptanceCircuits()['broken-cpc']!);
    value(result.faultCurrents[0]!.currentAmps, 0);
    value(result.branchCurrents[wire('cpc')], 0);
    expect(result.readiness.earthing.continuity[0]).toMatchObject({
      status: 'open',
      returnBond: 'absent',
    });
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === 'pe-continuity-open')).toBe(
      true,
    );
    value(voltageBetween(result, terminalId('socket', 2), terminalId('s', 1)), 230);
  });

  it('does not invent a common soil node or earth-electrode resistance', () => {
    const result = solved(earthingAcceptanceCircuits()['independent-electrodes']!);
    value(result.faultCurrents[0]!.currentAmps, 0);
    expect(result.readiness.earthing.bonds).toHaveLength(1);
    // Only the explicitly drawn neutral-to-rod-b connection is a bond.
    expect(result.readiness.earthing.bonds[0]!.electrodeTerminals).toEqual([
      terminalId('rod-b', 0),
    ]);
    value(voltageBetween(result, terminalId('rod-a', 0), terminalId('rod-b', 0)), 230);
  });

  it('does not treat normal neutral current with an intact CPC and source bond as a PE return', () => {
    const result = solved(earthingAcceptanceCircuits()['normal-pe-connection']!);
    value(result.branchCurrents[load], 230 / (6 + 4 * 0.07));
    value(result.branchCurrents[wire('cpc')], 0);
    value(result.branchCurrents[wire('bond')], 0);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'pe-used-as-normal-return'),
    ).toBe(false);
    expect(result.readiness.earthing.diagnostics).toEqual([]);
  });

  it.each([true, false])(
    'reports a PE load return with an explicit bond=%s, using real current',
    (bonded) => {
      const result = solved(peReturnFixture(bonded));
      value(result.branchCurrents[load], bonded ? 230 / (6 + 5 * 0.07) : 0);
      expect(
        result.diagnostics.some((diagnostic) => diagnostic.code === 'pe-used-as-normal-return'),
      ).toBe(true);
      expect(result.operation).not.toBe('operating');
      expect(result.loads[0]!.currentAmps).not.toBeNull();
    },
  );

  it('distinguishes swapped polarity from PE misuse while preserving resistive power', () => {
    const correct = solved(earthingAcceptanceCircuits()['normal-pe-connection']!);
    const reversed = solved(earthingAcceptanceCircuits()['reversed-polarity']!);
    value(reversed.branchCurrents[load], -correct.branchCurrents[load]!);
    value(reversed.branchPowers[load], correct.branchPowers[load]!);
    expect(reversed.diagnostics.some((diagnostic) => diagnostic.code === 'polarity-reversed')).toBe(
      true,
    );
    expect(
      reversed.diagnostics.some((diagnostic) => diagnostic.code === 'pe-used-as-normal-return'),
    ).toBe(false);
  });

  it('finds neutral-only switching in its open and closed states, preserving the live potential', () => {
    const circuit = earthingAcceptanceCircuits()['switched-neutral']!;
    for (const on of [false, true]) {
      circuit.components[circuit.components.length - 1]!.state.on = on;
      const result = solved(circuit);
      expect(
        result.diagnostics.some((diagnostic) => diagnostic.code === 'neutral-only-switching'),
      ).toBe(true);
      if (!on) {
        value(result.branchCurrents[load], 0);
        value(voltageBetween(result, terminalId('r', 0), terminalId('s', 1)), 230);
      }
    }
  });

  it('does not pretend a floating secondary earth fault has a primary return', () => {
    const circuit = earthingAcceptanceCircuits()['isolated-secondary-earth-fault']!;
    const result = solved(circuit);
    value(result.faultCurrents[0]!.currentAmps, 0);
    value(result.branchCurrents[wire('secondary-cpc')], 0);
    expect(voltageBetween(result, terminalId('socket', 2), terminalId('s', 1))).toBeUndefined();
    expect(result.transformers[0]!.connection).toBe('galvanically-isolated');
    circuit.wires.push(leadFixture('secondary-bond', 'tx', 3, 's', 2));
    const bonded = solved(circuit);
    expect(bonded.faultCurrents[0]!.currentAmps).toBeGreaterThan(0);
    expect(
      bonded.readiness.earthing.bonds.some((bond) =>
        bond.returns.some((reference) => reference.kind === 'winding-terminal'),
      ),
    ).toBe(true);
    // Source PE still has no bond to source N, so winding isolation is retained.
    expect(bonded.transformers[0]!.connection).toBe('galvanically-isolated');
    expect(voltageBetween(bonded, terminalId('socket', 2), terminalId('s', 1))).toBeUndefined();
  });

  it('distinguishes an L-N short from L-PE fault current', () => {
    const result = solved(earthingAcceptanceCircuits()['line-neutral-short']!);
    value(result.faultCurrents[0]!.currentAmps, 230 / 0.14);
    value(result.branchCurrents[wire('cpc')], 0);
    value(result.branchCurrents[wire('bond')], 0);
  });

  it('does not substitute leakage impedance or choose an ambiguous transformer conductor pair', () => {
    for (const name of ['unknown-leakage', 'ambiguous-winding-short']) {
      const result = solveCircuit(earthingAcceptanceCircuits()[name]);
      expect(result.status).toBe('unsupported');
      expect(result.faultCurrents[0]!.currentAmps).toBeNull();
      expect(result.faultCurrents[0]!.basis).toBe('not-assessed');
      expect(result.branchCurrents).toEqual({});
    }
  });

  it('labels a secondary short as a winding fault rather than a mains L-N short', () => {
    const result = solved(transformerAcceptanceCircuits()['secondary-short']!);
    expect(result.readiness.topology).toBe('short');
    expect(result.readiness.shortedSourceIds).toEqual([]);
    expect(result.readiness.shortedWindings).toEqual([
      expect.objectContaining({ componentId: 'tx', winding: 'secondary' }),
    ]);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === 'transformer-winding-short'),
    ).toBe(true);
  });

  it('makes safety findings independent of catalogue access tier', () => {
    const circuit = peReturnFixture();
    const normal = solveCircuit(circuit);
    const defs = Object.fromEntries(
      Object.entries(COMPONENT_DEFS).map(([key, def]) => [key, { ...def, tier: 'pro' as const }]),
    );
    expect(solveCircuit(circuit, { defs })).toEqual(normal);
  });

  it.each(Object.entries(earthingAcceptanceCircuits()))(
    '%s survives ordering and schema-2 round trips',
    (_name, circuit) => {
      const before = JSON.stringify(circuit);
      const result = solveCircuit(circuit);
      expect(
        solveCircuit({
          ...circuit,
          components: [...circuit.components].reverse(),
          wires: [...circuit.wires].reverse(),
          ...(circuit.faults ? { faults: [...circuit.faults].reverse() } : {}),
        }),
      ).toEqual(result);
      expect(solveCircuit(importJSON(exportJSON(circuit)))).toEqual(result);
      expect(assessCircuitReadiness(circuit).earthing).toEqual(result.readiness.earthing);
      expect(JSON.stringify(circuit)).toBe(before);
    },
  );
});
