import { describe, expect, it } from 'vitest';
import { LINEAR_SYSTEM_LIMITS, solveLinearSystem } from './linearSystem';
import { inspectVoltageConstraints } from './voltageConstraints';

const rows = (values: number[][]) => values.map((row) => Float64Array.from(row));

describe('bounded linear factorization', () => {
  it('solves the independently written ideal 12 V / two 6-ohm MNA reference', () => {
    const matrix = rows([
      [1 / 6, -1 / 6, 1],
      [-1 / 6, 2 / 6, 0],
      [1, 0, 0],
    ]);
    const snapshot = matrix.map((row) => [...row]);
    const rhs = Float64Array.from([0, 0, 12]);
    const result = solveLinearSystem(matrix, rhs);
    expect(result.status).toBe('solved');
    if (result.status !== 'solved') throw new Error(result.status);
    expect([...result.values]).toEqual([12, 6, -1]);
    expect(result.maximumResidualRatio).toBeLessThanOrEqual(1);
    expect(matrix.map((row) => [...row])).toEqual(snapshot);
    expect([...rhs]).toEqual([0, 0, 12]);
  });

  it.each([
    {
      matrix: [
        [0, 2],
        [1, 3],
      ],
      rhs: [4, 7],
      expected: [1, 2],
    },
    {
      matrix: [
        [1e-8, 1e-8],
        [1, 2],
      ],
      rhs: [3e-8, 5],
      expected: [1, 2],
    },
    {
      matrix: [
        [4, 2, 0],
        [2, 5, 1],
        [0, 1, 3],
      ],
      rhs: [8, 15, 11],
      expected: [1, 2, 3],
    },
  ])('pivots and scales without changing the equations: $matrix', ({ matrix, rhs, expected }) => {
    const result = solveLinearSystem(rows(matrix), Float64Array.from(rhs));
    expect(result.status).toBe('solved');
    if (result.status !== 'solved') throw new Error(result.status);
    expected.forEach((value, i) => expect(result.values[i]).toBeCloseTo(value, 9));
  });

  it('distinguishes singular, poorly conditioned and malformed systems', () => {
    expect(
      solveLinearSystem(
        rows([
          [1, 1],
          [2, 2],
        ]),
        Float64Array.from([2, 4]),
      ).status,
    ).toBe('singular');
    expect(
      solveLinearSystem(
        rows([
          [1, 1],
          [1, 1 + 1e-14],
        ]),
        Float64Array.from([2, 2 + 1e-14]),
      ).status,
    ).toBe('ill-conditioned');
    expect(solveLinearSystem(rows([[Number.NaN]]), Float64Array.from([1])).status).toBe('invalid');
    expect(solveLinearSystem(rows([[1, 2]]), Float64Array.from([1])).status).toBe('invalid');
    expect(solveLinearSystem([], Float64Array.from([1])).status).toBe('invalid');
  });

  it('rejects oversized dimensions before copying or allocating a dense system', () => {
    const size = LINEAR_SYSTEM_LIMITS.maxUnknowns + 1;
    expect(
      solveLinearSystem(
        Array.from({ length: size }, () => new Float64Array()),
        new Float64Array(size),
      ).status,
    ).toBe('too-large');
  });

  it('returns portable zero for a zero RHS with a negative pivot', () => {
    const result = solveLinearSystem(rows([[-2]]), Float64Array.from([0]));
    expect(result.status).toBe('solved');
    if (result.status !== 'solved') throw new Error(result.status);
    expect(Object.is(result.values[0], 0)).toBe(true);
    expect([...result.values]).toEqual(JSON.parse(JSON.stringify([...result.values])));
  });
});

describe('ideal voltage constraint dependence', () => {
  const first = { id: 'a', positive: 'p', negative: 'n', voltage: 12 };
  it('distinguishes a consistent redundant source from a contradictory voltage', () => {
    expect(inspectVoltageConstraints([first, { ...first, id: 'b' }])).toEqual({
      conflicting: [],
      redundant: ['b'],
    });
    expect(inspectVoltageConstraints([first, { ...first, id: 'b', voltage: 12.000001 }])).toEqual({
      conflicting: ['b'],
      redundant: [],
    });
    expect(inspectVoltageConstraints([{ ...first, positive: 'n' }])).toEqual({
      conflicting: ['a'],
      redundant: [],
    });
  });
  it('recognizes a source loop without selecting an arbitrary current split', () => {
    const constraints = [
      { id: 'a', positive: 'p', negative: 'mid', voltage: 12 },
      { id: 'b', positive: 'mid', negative: 'n', voltage: 6 },
      { id: 'c', positive: 'p', negative: 'n', voltage: 18 },
    ];
    expect(inspectVoltageConstraints(constraints)).toEqual({ conflicting: [], redundant: ['c'] });
    expect(inspectVoltageConstraints([...constraints].reverse())).toEqual(
      inspectVoltageConstraints(constraints),
    );
    constraints[2]!.voltage = 17;
    expect(inspectVoltageConstraints(constraints)).toEqual({ conflicting: ['c'], redundant: [] });
  });
});
