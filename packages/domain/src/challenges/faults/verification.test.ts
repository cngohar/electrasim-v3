/**
 * verification.ts — tests (plan §12 observability, §16 "the circuit must
 * actually recover", §14 vague symptom language).
 */

import { describe, expect, it } from 'vitest';
import type { Circuit, SimulationResult } from '../../types';
import {
  describeRecoveryGap,
  describeStructuralGap,
  describeSymptom,
  diffSymptom,
  isFullRecovery,
} from './verification';

function result(overrides: Partial<SimulationResult> = {}): SimulationResult {
  return {
    energizedComponents: new Set<string>(),
    energizedWires: new Set<string>(),
    errorComponents: new Set<string>(),
    errorWires: new Set<string>(),
    errors: [],
    ...overrides,
  } as unknown as SimulationResult;
}

describe('diffSymptom', () => {
  it('reports nothing observable when the two results match', () => {
    const baseline = result({ energizedComponents: new Set(['load']) });
    const symptom = diffSymptom(baseline, baseline, ['load']);
    expect(symptom.observable).toBe(false);
    expect(symptom.deEnergisedLoadIds).toEqual([]);
  });

  it('detects a load that went dead', () => {
    const baseline = result({ energizedComponents: new Set(['a', 'b']) });
    const faulted = result({ energizedComponents: new Set(['b']) });
    const symptom = diffSymptom(baseline, faulted, ['a', 'b']);
    expect(symptom.deEnergisedLoadIds).toEqual(['a']);
    expect(symptom.observable).toBe(true);
    expect(symptom.primary).toBe('load-dead');
  });

  it('ignores loads that were already dead at baseline', () => {
    const baseline = result();
    const faulted = result();
    expect(diffSymptom(baseline, faulted, ['a']).deEnergisedLoadIds).toEqual([]);
  });

  it('detects a newly tripped protective device', () => {
    const baseline = result();
    const faulted = result({
      trippedComponents: [{ id: 'mcb', label: 'MCB', reason: 'overload' }],
    } as Partial<SimulationResult>);
    const symptom = diffSymptom(baseline, faulted, []);
    expect(symptom.tripped).toBe(true);
    expect(symptom.observable).toBe(true);
  });

  it('detects new errors even when nothing goes dark', () => {
    const baseline = result();
    const faulted = result({ errorWires: new Set(['w1']) });
    const symptom = diffSymptom(baseline, faulted, []);
    expect(symptom.newErrorWires).toBe(true);
    expect(symptom.observable).toBe(true);
    expect(symptom.primary).toBe('error');
  });

  it('ranks a dead load above a mere error when both occur', () => {
    const baseline = result({ energizedComponents: new Set(['a']) });
    const faulted = result({ errorWires: new Set(['w1']) });
    expect(diffSymptom(baseline, faulted, ['a']).primary).toBe('load-dead');
  });
});

describe('describeRecoveryGap', () => {
  const healthy = result({
    energizedComponents: new Set(['a']),
    energizedWires: new Set(['w']),
  });

  it('returns null when behaviour is restored exactly', () => {
    expect(describeRecoveryGap(healthy, healthy)).toBeNull();
    expect(isFullRecovery(healthy, healthy)).toBe(true);
  });

  it('rejects a circuit with residual errors', () => {
    const repaired = result({
      energizedComponents: new Set(['a']),
      energizedWires: new Set(['w']),
      errorComponents: new Set(['a']),
    });
    expect(describeRecoveryGap(healthy, repaired)).toContain('still in error');
    expect(isFullRecovery(healthy, repaired)).toBe(false);
  });

  it('rejects a circuit where a load is still dead', () => {
    const repaired = result({ energizedWires: new Set(['w']) });
    expect(describeRecoveryGap(healthy, repaired)).toContain('energised components changed');
  });

  it('rejects a circuit with a device still open', () => {
    const repaired = result({
      energizedComponents: new Set(['a']),
      energizedWires: new Set(['w']),
      trippedComponents: [{ id: 'm', label: 'MCB', reason: 'overload' }],
    } as Partial<SimulationResult>);
    expect(describeRecoveryGap(healthy, repaired)).toContain('protective device');
  });
});

describe('describeStructuralGap', () => {
  const comp = (id: string, type: string) => ({ id, type, x: 0, y: 0, state: {} });
  const wire = (id: string, from: string, fp: number, to: string, tp: number) => ({
    id,
    fromComponentId: from,
    fromPortIndex: fp,
    toComponentId: to,
    toPortIndex: tp,
    controlPoints: [],
  });
  const healthy = {
    components: [comp('s', 'supply'), comp('l', 'lamp'), comp('e', 'earth-ground')],
    wires: [wire('w1', 's', 0, 'l', 0), wire('w2', 'e', 0, 'l', 2)],
  } as unknown as Circuit;

  it('accepts an identical installation', () => {
    expect(describeStructuralGap(healthy, healthy)).toBeNull();
  });

  it('accepts a cable replaced by a new one between the same terminals', () => {
    const replaced = {
      ...healthy,
      wires: [wire('fresh', 's', 0, 'l', 0), healthy.wires[1]],
    } as unknown as Circuit;
    expect(describeStructuralGap(healthy, replaced)).toBeNull();
  });

  it('rejects a severed CPC even though it carries no load current', () => {
    const noEarth = { ...healthy, wires: [healthy.wires[0]] } as unknown as Circuit;
    expect(describeStructuralGap(healthy, noEarth)).toContain('missing');
  });

  it('is direction-agnostic about how a wire is stored', () => {
    const flipped = {
      ...healthy,
      wires: [wire('w1', 'l', 0, 's', 0), healthy.wires[1]],
    } as unknown as Circuit;
    expect(describeStructuralGap(healthy, flipped)).toBeNull();
  });

  it('does not complain about an extra wire', () => {
    const extra = {
      ...healthy,
      wires: [...healthy.wires, wire('w3', 's', 1, 'l', 1)],
    } as unknown as Circuit;
    expect(describeStructuralGap(healthy, extra)).toBeNull();
  });
});

describe('describeSymptom', () => {
  const base = {
    deEnergisedLoadIds: [] as string[],
    tripped: false,
    blown: false,
    newErrorComponents: false,
    newErrorWires: false,
    newErrors: false,
    observable: true,
  };

  it('never names a fault type (plan §14)', () => {
    const forbidden = ['open', 'short', 'polarity', 'earth fault', 'disconnect'];
    for (const primary of ['load-dead', 'tripped', 'blown', 'error'] as const) {
      const text = describeSymptom({ ...base, primary }, ['Lamp']).toLowerCase();
      for (const word of forbidden) expect(text).not.toContain(word);
    }
  });

  it('names the dead load when there is exactly one', () => {
    const text = describeSymptom({ ...base, primary: 'load-dead', deEnergisedLoadIds: ['a'] }, [
      'Ceiling Lamp',
    ]);
    expect(text).toContain('Ceiling Lamp');
  });

  it('summarises multiple dead loads', () => {
    const text = describeSymptom(
      { ...base, primary: 'load-dead', deEnergisedLoadIds: ['a', 'b'] },
      ['Lamp', 'Socket'],
    );
    expect(text).toContain('2 loads');
  });

  it('copes with a dead load whose label is unknown', () => {
    expect(describeSymptom({ ...base, primary: 'load-dead' }, [])).toMatch(/dead/i);
  });
});
