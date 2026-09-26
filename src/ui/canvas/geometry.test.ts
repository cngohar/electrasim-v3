import type { ComponentInstance, WireInstance } from '@electrasim/domain';
import { describe, expect, it } from 'vitest';
import { buildBezierPath, buildOrthogonalPath, pointsToLinePath, svgToWorld } from './geometry';

function wire(overrides: Partial<WireInstance> = {}): WireInstance {
  return {
    id: 'w1',
    fromComponentId: 'a',
    fromPortIndex: 0,
    toComponentId: 'b',
    toPortIndex: 0,
    controlPoints: [],
    ...overrides,
  };
}

describe('canvas geometry', () => {
  it('converts SVG coordinates into world coordinates', () => {
    expect(svgToWorld({ x: 130, y: 90 }, { x: 30, y: 10 }, 2)).toEqual({ x: 50, y: 40 });
  });

  it('serializes line paths and handles an empty point list', () => {
    expect(pointsToLinePath([])).toBe('');
    expect(
      pointsToLinePath([
        { x: 1, y: 2 },
        { x: 3, y: 4 },
        { x: 5, y: 6 },
      ]),
    ).toBe('M 1 2 L 3 4 L 5 6');
  });

  it('preserves user-authored orthogonal control points with rounded corners', () => {
    const components = new Map<string, ComponentInstance>();
    expect(
      buildOrthogonalPath(
        { x: 0, y: 0 },
        { x: 100, y: 80 },
        wire({
          controlPoints: [
            { x: 40, y: 0 },
            { x: 40, y: 80 },
          ],
        }),
        components,
      ),
    ).toBe('M 0 0 L 30 0 Q 40 0 40 10 L 40 70 Q 40 80 50 80 L 100 80');
  });

  it('builds direct and checkpoint bezier paths deterministically', () => {
    expect(
      buildBezierPath({ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 100, y: 50 }, { x: -20, y: 0 }, []),
    ).toBe('M 0 0 C 20 0, 80 50, 100 50');
    expect(
      buildBezierPath({ x: 0, y: 0 }, { x: 20, y: 0 }, { x: 100, y: 50 }, { x: -20, y: 0 }, [
        { x: 40, y: 20 },
      ]),
    ).toBe('M 0 0 C 20 0, 40 20, 40 20 C 40 20, 80 50, 100 50');
  });
});
