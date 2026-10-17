import { describe, expect, it } from 'vitest';
import { sampleRenderedPath } from './renderedPath';

describe('rendered fault route geometry', () => {
  it('uses distance along a bent route rather than its endpoint chord', () => {
    expect(sampleRenderedPath('M 0 0 L 0 100 L 300 100')).toMatchObject({
      mid: { x: 100, y: 100 },
      angle: 0,
    });
    expect(sampleRenderedPath('M 0 0 V 100 H 300', 'from')).toMatchObject({
      mid: { x: 0, y: 18 },
      angle: 90,
    });
    expect(sampleRenderedPath('M 0 0 V 100 H 300', 'to')).toMatchObject({
      mid: { x: 282, y: 100 },
      angle: 0,
    });
  });
  it('samples symmetric quadratic and cubic curves at independently known midpoints', () => {
    const quadratic = sampleRenderedPath('M 0 0 Q 50 100 100 0')!;
    expect(quadratic.mid.x).toBeCloseTo(50, 2);
    expect(quadratic.mid.y).toBeCloseTo(50, 2);
    expect(quadratic.angle).toBeCloseTo(0, 2);
    const cubic = sampleRenderedPath('M 0 0 C 0 100 100 100 100 0')!;
    expect(cubic.mid.x).toBeCloseTo(50, 2);
    expect(cubic.mid.y).toBeCloseTo(75, 2);
    expect(cubic.angle).toBeCloseTo(0, 2);
  });
  it('responds to moved/rerouted paths and clamps short or zero-length terminal insets', () => {
    expect(sampleRenderedPath('M 10 20 L 10 30', 'from')?.mid).toEqual({ x: 10, y: 25 });
    expect(sampleRenderedPath('M 20 20 L 20 20', 'to')).toMatchObject({
      mid: { x: 20, y: 20 },
      angle: 0,
    });
    expect(sampleRenderedPath('M 10 20 L 10 220')?.mid).toEqual({ x: 10, y: 120 });
    expect(sampleRenderedPath('M 10 20 L 210 20')?.mid).toEqual({ x: 110, y: 20 });
    expect(sampleRenderedPath('')).toBeNull();
  });
});
