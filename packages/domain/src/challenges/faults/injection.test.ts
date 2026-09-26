/**
 * injection.ts — tests (plan §5 determinism, §13 single fault model).
 */

import { describe, expect, it } from 'vitest';
import { normalizeCircuitFaults } from '../../faults';
import type { Circuit, InjectedFault } from '../../types';
import { generateChallenge } from '../generator/generator';
import { createRng } from '../generator/seed';
import { type FaultCandidate, collectFaultCandidates } from './eligibility';
import {
  SCENARIO_FAULT_CREATED_AT,
  createScenarioFault,
  describeFaultTarget,
  scenarioFaultId,
  selectFaultCandidate,
  withScenarioFaults,
  withoutFault,
} from './injection';

function build(seed: number) {
  const generated = generateChallenge({ seed, difficulty: 'intermediate', mode: 'diagnosis' });
  const candidates = collectFaultCandidates(generated.circuit, generated.scenario);
  return { ...generated, candidates };
}

describe('scenarioFaultId', () => {
  it('is deterministic for the same challenge and candidate', () => {
    const { candidates } = build(11);
    const candidate = candidates[0] as FaultCandidate;
    expect(scenarioFaultId('ES-DIAG-000001', candidate)).toBe(
      scenarioFaultId('ES-DIAG-000001', candidate),
    );
  });

  it('differs across challenges and across candidates', () => {
    const { candidates } = build(13);
    const [a, b] = candidates;
    expect(scenarioFaultId('ES-DIAG-000001', a)).not.toBe(scenarioFaultId('ES-DIAG-000002', a));
    if (b)
      expect(scenarioFaultId('ES-DIAG-000001', a)).not.toBe(scenarioFaultId('ES-DIAG-000001', b));
  });
});

describe('createScenarioFault', () => {
  it('pins the two non-deterministic fields of the registry fault', () => {
    const { candidates } = build(17);
    const candidate = candidates[0] as FaultCandidate;
    const first = createScenarioFault('ES-DIAG-123456', candidate);
    const second = createScenarioFault('ES-DIAG-123456', candidate);
    expect(first).toEqual(second);
    expect(first.createdAt).toBe(SCENARIO_FAULT_CREATED_AT);
    expect(first.id).toBe(scenarioFaultId('ES-DIAG-123456', candidate));
  });

  it('keeps the registry-derived type, target and category', () => {
    const { candidates } = build(19);
    const candidate = candidates[0] as FaultCandidate;
    const fault = createScenarioFault('ES-DIAG-123456', candidate);
    expect(fault.type).toBe(candidate.type);
    expect(fault.target).toEqual(candidate.target);
    expect(typeof fault.category).toBe('string');
  });
});

describe('withScenarioFaults / withoutFault', () => {
  it('writes only the modern faults array, never the legacy mirrors (§13)', () => {
    const { circuit, candidates, metadata } = build(23);
    const fault = createScenarioFault(metadata.identity.displayId, candidates[0] as FaultCandidate);
    const faulted = withScenarioFaults(circuit, [fault]);

    expect(faulted.faults).toEqual([fault]);
    for (const wire of faulted.wires) expect(wire.fault).toBeUndefined();
    for (const component of faulted.components) expect(component.state.fault).toBeUndefined();
  });

  it('does not mutate the input circuit', () => {
    const { circuit, candidates, metadata } = build(29);
    const before = JSON.stringify(circuit);
    withScenarioFaults(circuit, [
      createScenarioFault(metadata.identity.displayId, candidates[0] as FaultCandidate),
    ]);
    expect(JSON.stringify(circuit)).toBe(before);
  });

  it('survives normalizeCircuitFaults without duplicating the fault', () => {
    const { circuit, candidates, metadata } = build(31);
    const fault = createScenarioFault(metadata.identity.displayId, candidates[0] as FaultCandidate);
    // `normalizeCircuitFaults` folds the modern array and both legacy mirrors
    // into one list. Writing only `Circuit.faults` must therefore yield exactly
    // one entry — a second copy would mean the learner could clear one and
    // leave the other live (§13).
    const normalised: InjectedFault[] = normalizeCircuitFaults(
      withScenarioFaults(circuit, [fault]),
    );
    expect(normalised.filter((f) => f.type === fault.type && f.id === fault.id)).toHaveLength(1);
    expect(normalised).toHaveLength(1);
  });

  it('removes exactly the named fault', () => {
    const { circuit, candidates, metadata } = build(37);
    const [a, b] = candidates;
    const faults = [
      createScenarioFault(metadata.identity.displayId, a),
      ...(b ? [createScenarioFault(`${metadata.identity.displayId}x`, b)] : []),
    ];
    const faulted = withScenarioFaults(circuit, faults);
    const repaired = withoutFault(faulted, faults[0].id);
    expect(repaired.faults?.some((f) => f.id === faults[0].id)).toBe(false);
    expect(repaired.faults ?? []).toHaveLength(faults.length - 1);
  });

  it('is a no-op for an unknown fault id', () => {
    const { circuit, candidates, metadata } = build(41);
    const fault = createScenarioFault(metadata.identity.displayId, candidates[0] as FaultCandidate);
    const faulted = withScenarioFaults(circuit, [fault]);
    expect(withoutFault(faulted, 'nope').faults).toEqual([fault]);
  });
});

describe('selectFaultCandidate', () => {
  it('returns null for an empty pool', () => {
    expect(selectFaultCandidate([], createRng(1))).toBeNull();
  });

  it('is deterministic for a given rng seed', () => {
    const { candidates } = build(43);
    const a = selectFaultCandidate(candidates, createRng(99));
    const b = selectFaultCandidate(candidates, createRng(99));
    expect(a?.key).toBe(b?.key);
  });

  it('always picks a candidate from the supplied pool', () => {
    const { candidates } = build(47);
    const keys = new Set(candidates.map((c) => c.key));
    for (let seed = 0; seed < 50; seed++) {
      const picked = selectFaultCandidate(candidates, createRng(seed));
      expect(picked).not.toBeNull();
      expect(keys.has((picked as FaultCandidate).key)).toBe(true);
    }
  });

  it('reaches every placement class present in the pool', () => {
    const { candidates } = build(53);
    const available = new Set(candidates.map((c) => c.placement));
    const seen = new Set<string>();
    for (let seed = 0; seed < 400; seed++) {
      const picked = selectFaultCandidate(candidates, createRng(seed));
      if (picked) seen.add(picked.placement);
    }
    expect(seen).toEqual(available);
  });
});

describe('describeFaultTarget', () => {
  it('describes each target shape in learner-facing language', () => {
    const { circuit } = build(59);
    const wire = circuit.wires[0];
    expect(describeFaultTarget(circuit, { type: 'wire', id: wire.id })).toContain('wire between');
    expect(
      describeFaultTarget(circuit, { type: 'component', id: circuit.components[0].id }),
    ).toMatch(/^the /);
    expect(
      describeFaultTarget(circuit, {
        type: 'port',
        componentId: circuit.components[0].id,
        portIndex: 0,
      }),
    ).toContain('terminal 1');
  });

  it('degrades gracefully for ids that no longer exist', () => {
    const empty: Circuit = { components: [], wires: [] } as unknown as Circuit;
    expect(describeFaultTarget(empty, { type: 'wire', id: 'gone' })).toBe('an unknown wire');
    expect(describeFaultTarget(empty, { type: 'component', id: 'gone' })).toContain('unknown');
  });
});
