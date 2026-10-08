import { describe, expect, it } from 'vitest';
import { reduceSeriesPaths } from './seriesReduction';

describe('series equation reduction', () => {
  it('recovers each divider voltage without changing authored resistors', () => {
    const resistors = [
      { from: 'p', to: 'a', resistance: 2 },
      { from: 'a', to: 'b', resistance: 4 },
      { from: 'b', to: 'n', resistance: 6 },
    ];
    const snapshot = structuredClone(resistors);
    const reduced = reduceSeriesPaths(resistors, new Set(['p', 'n']));
    expect(reduced.resistors).toHaveLength(1);
    expect(reduced.resistors[0]?.resistance).toBe(12);
    const potentials = new Map([
      ['p', 12],
      ['n', 0],
    ]);
    reduced.recover(potentials);
    expect(potentials.get('a')).toBe(10);
    expect(potentials.get('b')).toBe(6);
    expect(resistors).toEqual(snapshot);
  });

  it('retains source and winding constraint terminals even at degree two', () => {
    const reduced = reduceSeriesPaths(
      [
        { from: 'p', to: 'winding', resistance: 2 },
        { from: 'winding', to: 'n', resistance: 4 },
      ],
      new Set(['p', 'n', 'winding']),
    );
    expect(reduced.eliminatedNodes.size).toBe(0);
    expect(reduced.resistors).toHaveLength(2);
  });

  it('retains original equations when adding resistances would overflow', () => {
    const reduced = reduceSeriesPaths(
      [
        { from: 'p', to: 'a', resistance: 1e308 },
        { from: 'a', to: 'n', resistance: 1e308 },
      ],
      new Set(['p', 'n']),
    );
    expect(reduced.eliminatedNodes.size).toBe(0);
    expect(reduced.resistors).toHaveLength(2);
  });
});
