/**
 * eligibility.ts — tests (plan §11 "reuse the existing fault engine",
 * §12 observability, §13 "no second fault model").
 */

import { describe, expect, it } from 'vitest';
import { getAvailableFaultsForTarget } from '../../faults';
import { generateChallenge } from '../generator/generator';
import type { ChallengeDifficulty } from '../types';
import {
  DIAGNOSABLE_FAULTS,
  NON_DIAGNOSABLE_FAULTS,
  candidateKey,
  collectFaultCandidates,
  eligibleFaultTypes,
} from './eligibility';

const DIFFICULTIES: ChallengeDifficulty[] = ['beginner', 'intermediate', 'advanced'];

function build(seed: number, difficulty: ChallengeDifficulty = 'intermediate') {
  return generateChallenge({ seed, difficulty, mode: 'diagnosis' });
}

describe('DIAGNOSABLE_FAULTS', () => {
  it('lists only fault types the fault registry actually knows', () => {
    for (const { type } of DIAGNOSABLE_FAULTS) {
      expect(typeof type).toBe('string');
    }
    const types = DIAGNOSABLE_FAULTS.map((f) => f.type);
    expect(new Set(types).size).toBe(types.length);
  });

  it('excludes the behaviourally silent fault (plan §12)', () => {
    expect(NON_DIAGNOSABLE_FAULTS.has('open-earth')).toBe(true);
    expect(DIAGNOSABLE_FAULTS.some((f) => f.type === 'open-earth')).toBe(false);
  });
});

describe('candidateKey', () => {
  it('is stable and distinguishes the three target shapes', () => {
    const wire = candidateKey('open-circuit', { type: 'wire', id: 'w1' });
    const comp = candidateKey('open-circuit', { type: 'component', id: 'w1' });
    const port = candidateKey('open-circuit', { type: 'port', componentId: 'w1', portIndex: 0 });
    expect(new Set([wire, comp, port]).size).toBe(3);
    expect(candidateKey('open-circuit', { type: 'wire', id: 'w1' })).toBe(wire);
  });
});

describe('collectFaultCandidates', () => {
  it('returns candidates for every generated circuit', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 0; seed < 12; seed++) {
        const { circuit, scenario } = build(seed * 31 + 1, difficulty);
        const candidates = collectFaultCandidates(circuit, scenario);
        expect(candidates.length).toBeGreaterThan(0);
      }
    }
  });

  it('only proposes faults the existing engine allows on that target (§11)', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { circuit, scenario } = build(seed * 17 + 5);
      for (const candidate of collectFaultCandidates(circuit, scenario)) {
        const allowed = getAvailableFaultsForTarget(circuit, candidate.target).map((d) => d.id);
        expect(allowed).toContain(candidate.type);
      }
    }
  });

  it('never targets anything outside the recipe-declared pools', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { circuit, scenario } = build(seed * 23 + 9);
      const wires = new Set(scenario.faultCandidateWireIds);
      const loads = new Set(scenario.loadComponentIds);
      const protection = new Set(scenario.protectionComponentIds);
      for (const { target } of collectFaultCandidates(circuit, scenario)) {
        if (target.type === 'wire') expect(wires.has(target.id)).toBe(true);
        else if (target.type === 'port') expect(loads.has(target.componentId)).toBe(true);
        else expect(protection.has(target.id)).toBe(true);
      }
    }
  });

  it('never proposes a non-diagnosable fault type', () => {
    for (let seed = 0; seed < 20; seed++) {
      const { circuit, scenario } = build(seed * 41 + 3);
      for (const { type } of collectFaultCandidates(circuit, scenario)) {
        expect(NON_DIAGNOSABLE_FAULTS.has(type)).toBe(false);
      }
    }
  });

  it('produces no duplicate candidates and a deterministic order', () => {
    for (let seed = 0; seed < 15; seed++) {
      const { circuit, scenario } = build(seed * 53 + 7);
      const first = collectFaultCandidates(circuit, scenario);
      const second = collectFaultCandidates(circuit, scenario);
      expect(second.map((c) => c.key)).toEqual(first.map((c) => c.key));
      expect(new Set(first.map((c) => c.key)).size).toBe(first.length);
      const keys = first.map((c) => c.key);
      expect([...keys].sort()).toEqual(keys);
    }
  });

  it('returns nothing when the recipe declares no fault targets', () => {
    const { circuit, scenario } = build(101);
    const empty = collectFaultCandidates(circuit, {
      ...scenario,
      faultCandidateWireIds: [],
      loadComponentIds: [],
      protectionComponentIds: [],
    });
    expect(empty).toEqual([]);
  });
});

describe('eligibleFaultTypes', () => {
  it('deduplicates the candidate pool into distinct types', () => {
    const { circuit, scenario } = build(77);
    const candidates = collectFaultCandidates(circuit, scenario);
    const types = eligibleFaultTypes(candidates);
    expect(new Set(types).size).toBe(types.length);
    for (const type of types) {
      expect(candidates.some((c) => c.type === type)).toBe(true);
    }
  });

  it('gives an empty pool for no candidates', () => {
    expect(eligibleFaultTypes([])).toEqual([]);
  });
});
