import { describe, expect, it } from 'vitest';
import { exportJSON, importJSON } from '../circuitFormat';
import { validateCircuit } from '../circuitValidation';
import { COMPONENT_DEFS } from '../components';
import { component as C } from '../simulation/auditFixtures';
import { simulate } from '../simulation/simulate';
import { compileCircuit } from './compile';
import { terminalId } from './faultTopology';
import { normalizeCircuitDocument } from './normalize';
import { phasorMagnitude, phasorVoltageBetween } from './phasor';
import { assessPlacement } from './placement';
import { explicitSupplyProfile } from './supplies';
import { previewSupplyChange } from './supplyEditing';
import { threePhaseAcceptanceCircuits, threePhaseStarFixture } from './threePhaseFixtures';

describe('E.1 portable three-phase source', () => {
  it('declares separate canonical phase/neutral/PE ports and freezes its independent defaults', () => {
    expect(COMPONENT_DEFS['ac-three-phase-supply']!.ports.map((p) => p.label)).toEqual([
      'L1',
      'L2',
      'L3',
      'N',
      'PE',
    ]);
    const circuit = normalizeCircuitDocument({
      ...threePhaseStarFixture(),
      supply: explicitSupplyProfile({ kind: 'dc', voltage: 48 }),
    });
    const model = circuit.components[0]!.state.sourceProfile?.model;
    expect(model).toEqual({
      kind: 'ac-three-phase',
      voltage: 230,
      frequencyHz: 50,
      sequence: 'abc',
    });
    const restored = importJSON(exportJSON(circuit));
    expect(restored).toEqual(circuit);
    const compiled = compileCircuit(restored);
    expect(compiled.status).toBe('compiled');
    if (compiled.status !== 'compiled') throw new Error('Invalid fixture');
    expect(
      compiled.graph.terminals.filter((t) => t.port?.componentId === 's').map((t) => t.role),
    ).toEqual(['l1', 'l2', 'l3', 'neutral', 'pe']);
    expect(compiled.graph.sources.map((s) => s.phaseAngleDegrees)).toEqual([0, -120, 120]);
    expect(
      assessPlacement('ac-three-phase-supply', circuit, circuit.supply!.model).independent,
    ).toBe(true);
    const placement = assessPlacement('space-heater', circuit, model!);
    expect(placement.status).not.toBe('incompatible');
    expect(placement.reasons.some((r) => r.code === 'phase-mismatch')).toBe(false);
  });

  it('edits voltage, frequency and sequence without changing any terminal, wire, fault or other source', () => {
    const circuit = threePhaseAcceptanceCircuits().independent!;
    circuit.wires[0]!.fault = 'open-circuit';
    const original = structuredClone(circuit);
    const profile = explicitSupplyProfile({
      kind: 'ac-three-phase',
      voltage: 400 / Math.sqrt(3),
      frequencyHz: 60,
      sequence: 'acb',
    });
    const preview = previewSupplyChange(circuit, { kind: 'component', componentId: 's' }, profile);
    expect(preview.status).toBe('ready');
    expect(circuit).toEqual(original);
    expect(preview.circuit.wires).toBe(circuit.wires);
    expect(preview.circuit.components.slice(1)).toEqual(circuit.components.slice(1));
    expect(preview.independentSourceIds).toEqual(['other']);
    expect(preview.affectedComponentIds).not.toContain('other-load');
    expect(importJSON(exportJSON(preview.circuit)).components[0]!.state.sourceProfile).toEqual(
      profile,
    );
    expect(previewSupplyChange(preview.circuit, preview.target, profile).status).toBe('unchanged');
    expect(previewSupplyChange(circuit, { kind: 'document' }, profile).status).toBe('blocked');
    expect(
      previewSupplyChange(circuit, { kind: 'component', componentId: 'other' }, profile).status,
    ).toBe('blocked');
    expect(
      previewSupplyChange(
        circuit,
        { kind: 'component', componentId: 's' },
        explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 }),
      ).status,
    ).toBe('blocked');
  });

  it('uses complex app results for a balanced star and never fabricates scalar/timed/repair measurements', () => {
    const result = simulate(threePhaseStarFixture());
    expect(result.phasor?.status).toBe('converged');
    expect(result.electrical).toBeUndefined();
    expect(result.componentCalculations).toBeUndefined();
    expect(result.simulationState).toBeUndefined();
    expect(result.trippedComponents).toBeUndefined();
    expect(result.thermalData).toBeUndefined();
    expect(result.faultsCleared).toBe(false);
    const validation = validateCircuit(threePhaseStarFixture(), result);
    expect(validation.status).not.toBe('pass');
    expect(validation.issues.some((i) => i.id === 'phasor_assessment_unassessed')).toBe(true);
    expect(result.energizedComponents.size).toBe(3);
    const point = result.phasorComponents!.s!;
    for (const b of point.branches) {
      expect(phasorMagnitude(b.voltage!)).toBeCloseTo(230, 8);
      expect(phasorMagnitude(b.current!)).toBeCloseTo(230 / 23.14, 8);
      expect(b.activePowerWatts).toBeCloseTo(-(230 ** 2) / 23.14, 7);
    }
    for (const v of point.voltagePairs)
      expect(phasorMagnitude(v.voltage!)).toBeCloseTo(230 * Math.sqrt(3), 8);
    expect(phasorMagnitude(point.neutralCurrent!)).toBeLessThan(1e-10);
    expect(result.phasorComponents!.r1!.compatibility?.status).toBe('compatible');
    expect(result.phasor!.wireLossesWatts.feed1).toBeCloseTo((230 / 23.14) ** 2 * 0.07, 8);
  });

  it('returns zero phase current after a break and vector neutral current rather than magnitude addition', () => {
    const result = simulate(threePhaseAcceptanceCircuits()['open-phase']!);
    expect(result.phasor?.status).toBe('converged');
    const phases = result.phasorComponents!.s!.branches;
    expect(phasorMagnitude(phases[0]!.current!)).toBeLessThan(1e-10);
    expect(result.energizedComponents.has('r0')).toBe(false);
    const neutral = result.phasorComponents!.s!.neutralCurrent!;
    const currents = phases.map((p) => p.current!);
    expect(neutral.real).toBeCloseTo(
      currents.reduce((s, i) => s + i.real, 0),
      9,
    );
    expect(neutral.imaginary).toBeCloseTo(
      currents.reduce((s, i) => s + i.imaginary, 0),
      9,
    );
    expect(phasorMagnitude(neutral)).toBeLessThan(
      currents.reduce((s, i) => s + phasorMagnitude(i), 0),
    );
    expect(result.activeInjectedFaults).toHaveLength(1);
  });

  it('preserves independent AC domains and withholds cross-reference voltage', () => {
    const result = simulate(threePhaseAcceptanceCircuits().independent!);
    expect(result.phasor?.status).toBe('converged');
    expect(
      phasorVoltageBetween(result.phasor!, terminalId('s', 0), terminalId('other', 0)),
    ).toBeUndefined();
    expect(
      phasorMagnitude(result.phasorComponents!['other-load']!.branches[0]!.current!),
    ).toBeCloseTo(120 / 12.14, 8);
  });

  it.each(['joined-frequency', 'single-live-motor'] as const)(
    'withholds operating results for %s',
    (name) => {
      const result = simulate(threePhaseAcceptanceCircuits()[name]!);
      expect(result.phasor?.status).toBe('unsupported');
      expect(result.phasorComponents).toBeUndefined();
      expect(result.energizedComponents.size).toBe(0);
      expect(result.faultsCleared).toBe(false);
    },
  );

  it('rejects a forged waveform on the real source without changing old two-terminal source geometry', () => {
    const circuit = threePhaseStarFixture();
    circuit.components[0]!.state.sourceProfile = explicitSupplyProfile({
      kind: 'dc',
      voltage: 230,
    });
    expect(compileCircuit(circuit).status).toBe('invalid');
    expect(COMPONENT_DEFS['ac-mains-supply']!.ports.map((p) => p.label)).toEqual(['L', 'N', 'PE']);
    const legacy = {
      components: [
        C('s', 'ac-mains-supply', {
          sourceProfile: explicitSupplyProfile({
            kind: 'ac-three-phase',
            voltage: 230,
            frequencyHz: 50,
            sequence: 'abc',
          }),
        }),
      ],
      wires: [],
    };
    expect(simulate(legacy).electricalContract?.status).toBe('unsupported');
  });
});
