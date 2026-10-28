import { COMPONENT_DEFS } from '@electrasim/domain/components';
import { describe, expect, it } from 'vitest';
import recordedBaseline from '../../../docs/specs/component-access-baseline.json';
import { circuitRequirements } from './circuit';
import {
  COMPONENT_ACCESS_BASELINE,
  ORIGINAL_PRO_COMPONENT_IDS,
  PROTECTED_BASIC_COMPONENT_IDS,
  type ValidatedComponentPolicy,
  componentAccess,
  hasOriginallyProComponents,
  requirementsForContent,
  resolveMembership,
  validateComponentPolicy,
} from './index';

function snapshot(revision = 1) {
  return {
    schemaVersion: 1,
    classificationVersion: 1,
    revision,
    components: COMPONENT_ACCESS_BASELINE.map(({ id, originalTier }) => ({
      id: id as string,
      access: originalTier === 'basic' ? 'free' : 'pro',
    })),
  };
}

describe('component classification foundation', () => {
  it('pins every canonical ID to its reviewed original tier independently of policy', () => {
    expect(PROTECTED_BASIC_COMPONENT_IDS).toEqual(recordedBaseline.protectedBasicIds);
    expect(ORIGINAL_PRO_COMPONENT_IDS).toEqual(recordedBaseline.originalProIds);
    expect(PROTECTED_BASIC_COMPONENT_IDS).toHaveLength(75);
    expect(ORIGINAL_PRO_COMPONENT_IDS).toHaveLength(41);
    expect(COMPONENT_ACCESS_BASELINE.map(({ id }) => id).sort()).toEqual(
      Object.keys(COMPONENT_DEFS).sort(),
    );
    for (const { id, originalTier } of COMPONENT_ACCESS_BASELINE) {
      expect(originalTier).toBe(COMPONENT_DEFS[id].tier ?? 'basic');
      expect(componentAccess(id)).toBe(originalTier === 'basic' ? 'free' : 'pro');
      expect(componentAccess(id, null)).toBe(componentAccess(id));
    }
  });

  it.each([0, 1, Number.MAX_SAFE_INTEGER])(
    'accepts safe nonnegative snapshot revision %s',
    (rev) => {
      const input = snapshot(rev);
      input.components.reverse();
      const policy = validateComponentPolicy(input);
      expect(policy.revision).toBe(rev);
      expect(policy.components.map(({ id }) => id)).toEqual(
        COMPONENT_ACCESS_BASELINE.map(({ id }) => id),
      );
      expect(Reflect.ownKeys(policy).sort()).toEqual([
        'classificationVersion',
        'components',
        'revision',
        'schemaVersion',
      ]);
    },
  );

  const malformed: [string, (value: ReturnType<typeof snapshot>) => unknown][] = [
    ['null', () => null],
    ['array', () => []],
    ['missing fields', () => ({ revision: 1 })],
    ['unknown schema', (v) => ({ ...v, schemaVersion: 2 })],
    ['unknown classification', (v) => ({ ...v, classificationVersion: 2 })],
    ['negative revision', (v) => ({ ...v, revision: -1 })],
    ['fractional revision', (v) => ({ ...v, revision: 1.5 })],
    ['unsafe revision', (v) => ({ ...v, revision: Number.MAX_SAFE_INTEGER + 1 })],
    ['NaN revision', (v) => ({ ...v, revision: Number.NaN })],
    ['infinite revision', (v) => ({ ...v, revision: Number.POSITIVE_INFINITY })],
    ['string revision', (v) => ({ ...v, revision: '1' })],
    ['staff field', (v) => ({ ...v, actorId: 'forged' })],
    ['symbol field', (v) => ({ ...v, [Symbol('extra')]: true })],
    ['inherited field', (v) => Object.assign(Object.create({ extra: true }), v)],
    ['non-array components', (v) => ({ ...v, components: {} })],
    ['missing component', (v) => ({ ...v, components: v.components.slice(1) })],
    ['extra component', (v) => ({ ...v, components: [...v.components, v.components[0]] })],
    ['sparse components', (v) => ({ ...v, components: new Array(v.components.length) })],
    [
      'duplicate ID',
      (v) => {
        v.components[1] = v.components[0];
        return v;
      },
    ],
    [
      'unknown ID',
      (v) => {
        v.components[0].id = 'invented';
        return v;
      },
    ],
    [
      'prototype ID',
      (v) => {
        v.components[0].id = '__proto__';
        return v;
      },
    ],
    ['non-string ID', (v) => ({ ...v, components: [null, ...v.components.slice(1)] })],
    [
      'invalid access',
      (v) => {
        v.components[0].access = 'basic';
        return v;
      },
    ],
    [
      'entry metadata',
      (v) => ({
        ...v,
        components: [{ ...v.components[0], reason: 'private' }, ...v.components.slice(1)],
      }),
    ],
    [
      'Basic paywall',
      (v) => {
        v.components.find(({ id }) => id === 'bulb')!.access = 'pro';
        return v;
      },
    ],
  ];
  it.each(malformed)('rejects %s', (_name, change) => {
    expect(() => validateComponentPolicy(change(snapshot()))).toThrow(
      'Invalid component access policy',
    );
  });

  it('copies and deeply freezes snapshots and rejects unvalidated casts/roundtrips', () => {
    const input = snapshot();
    const policy = validateComponentPolicy(input);
    input.components.find(({ id }) => id === 'afdd')!.access = 'free';
    expect(componentAccess('afdd', policy)).toBe('pro');
    expect(Object.isFrozen(policy)).toBe(true);
    expect(Object.isFrozen(policy.components)).toBe(true);
    expect(policy.components.every(Object.isFrozen)).toBe(true);
    expect(() =>
      componentAccess('afdd', snapshot() as unknown as ValidatedComponentPolicy),
    ).toThrow();
    expect(() => componentAccess('afdd', JSON.parse(JSON.stringify(policy)))).toThrow();
  });

  it('keeps fault and membership semantics independent while toggling originally Pro access', () => {
    const input = snapshot(2);
    for (const item of input.components) item.access = 'free';
    const freePolicy = validateComponentPolicy(input);
    const baselinePolicy = validateComponentPolicy(snapshot(3));
    for (const id of ORIGINAL_PRO_COMPONENT_IDS) {
      expect(
        requirementsForContent({ componentTypes: [id], injectedFaultTypes: [] }, freePolicy),
      ).toEqual([]);
      expect(
        requirementsForContent({ componentTypes: [id], injectedFaultTypes: [] }, baselinePolicy),
      ).toEqual(['pro_components']);
      expect(hasOriginallyProComponents([id])).toBe(true);
    }
    expect(hasOriginallyProComponents(['bulb'])).toBe(false);
    expect(
      requirementsForContent(
        { componentTypes: ['afdd'], injectedFaultTypes: ['arc-fault'] },
        freePolicy,
      ),
    ).toEqual(['advanced_faults']);
    expect(
      requirementsForContent(
        { componentTypes: ['afdd'], injectedFaultTypes: ['open-live', 'open-neutral'] },
        freePolicy,
      ),
    ).toEqual(['advanced_faults']);
    expect(resolveMembership([], 1000).capabilities).toEqual([]);
    const circuit = { components: [{ id: 'a', type: 'afdd', x: 0, y: 0, state: {} }], wires: [] };
    const before = JSON.stringify(circuit);
    expect(circuitRequirements(circuit, freePolicy)).toEqual([]);
    expect(circuitRequirements(circuit, baselinePolicy)).toEqual(['pro_components']);
    expect(circuitRequirements(circuit)).toEqual(['pro_components']);
    expect(JSON.stringify(circuit)).toBe(before);
  });

  it.each(['unknown', '__proto__', 'constructor'])(
    'rejects all unknown IDs, including after Pro: %s',
    (id) => {
      expect(() => componentAccess(id)).toThrow('Unknown component');
      expect(() => hasOriginallyProComponents(['afdd', id])).toThrow('Unknown component');
    },
  );
});
