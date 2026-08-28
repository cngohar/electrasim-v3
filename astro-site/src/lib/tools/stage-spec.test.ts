import { describe, expect, it } from 'vitest';
import {
  CABLE_ROUTE,
  CABLE_RUN,
  STAGE_FIT,
  cableRoutePath,
  cableRoutePoints,
  fitStageViewBox,
  smoothPath,
} from './stage-spec';

/**
 * The scene geometry is shared by the server render (this file) and the client
 * (`paintRoute` in public/js/cable-size-tool.js, which mirrors it). The client is
 * the only writer after load, so what matters is that the authored path is a
 * plausible starting frame for the same curve — these pins catch a rewrite that
 * moves the composition without telling the other copy.
 */
describe('stage fit', () => {
  it('keeps the stage aspect ratio so there is no letterboxing', () => {
    for (const [w, h] of [
      [1440, 810],
      [2560, 1080],
      [390, 829],
      [900, 460],
    ]) {
      const box = fitStageViewBox({ width: w, height: h }, 1280, 760);
      expect(box.width / box.height).toBeCloseTo(w / h, 4);
    }
  });

  it('never widens past the scenery that was painted', () => {
    const wide = fitStageViewBox({ width: 8000, height: 1000 }, 1280, 760);
    expect(wide.width).toBeLessThanOrEqual(1280 * STAGE_FIT.maxWiden + 0.001);
  });

  it('crops sky, not the ground line, on a tall stage', () => {
    const tall = fitStageViewBox({ width: 400, height: 900 }, 1280, 760);
    expect(tall.y).toBeLessThan(0);
    expect(tall.y + tall.height).toBeGreaterThan(760);
  });

  it('degrades to the authored canvas for a zero box', () => {
    expect(fitStageViewBox({ width: 0, height: 0 }, 1280, 760)).toEqual({
      x: 0,
      y: 0,
      width: 1280,
      height: 760,
    });
  });

  it('exposes the cable stage band both copies read', () => {
    expect(CABLE_ROUTE).toEqual({ x0: 292, x1: 1032, y0: 144, y1: 718 });
  });
});

describe('cable route', () => {
  const methods = ['A', 'B', 'C', 'D', 'E'] as const;

  it('starts at the board and ends at the appliance for every method', () => {
    for (const method of methods) {
      for (const length of [1, 18, 95, 200]) {
        const points = cableRoutePoints(method, length);
        expect(points[0]).toEqual(CABLE_RUN.source);
        expect(points[points.length - 1]).toEqual(CABLE_RUN.load);
        // every waypoint stays inside the band the floating panels leave free
        for (const p of points) {
          expect(p.x).toBeGreaterThanOrEqual(CABLE_ROUTE.x0);
          expect(p.x).toBeLessThanOrEqual(CABLE_ROUTE.x1);
          expect(p.y).toBeGreaterThanOrEqual(CABLE_ROUTE.y0);
          expect(p.y).toBeLessThanOrEqual(CABLE_ROUTE.y1);
        }
      }
    }
  });

  it('draws the loft route up and the trench route down', () => {
    const loft = cableRoutePoints('A', 60).map((p) => p.y);
    const trench = cableRoutePoints('D', 60).map((p) => p.y);
    expect(Math.min(...loft)).toBeLessThan(CABLE_RUN.source.y);
    expect(Math.max(...trench)).toBeGreaterThan(CABLE_RUN.load.y);
  });

  it('only sags where a cable is actually unsupported', () => {
    // the middle waypoint, not the max: methods that route the run up to a tray
    // or a loft have their lowest point at the board itself
    const midY = (method: string, length: number) => {
      const points = cableRoutePoints(method, length);
      return points[Math.floor(points.length / 2)].y;
    };
    const sagOf = (method: string) => midY(method, 200) - midY(method, 1);
    // clipped direct hangs; conduit carries it; the trench floor holds it
    expect(sagOf('C')).toBeGreaterThan(30);
    expect(sagOf('B')).toBeLessThan(5);
    expect(sagOf('D')).toBeLessThan(5);
    expect(sagOf('E')).toBeGreaterThan(sagOf('B'));
  });

  it('emits a closed-form path string for the authored default', () => {
    // pinned shape, not a byte-for-byte snapshot of float formatting
    const d = cableRoutePath('C', 18);
    expect(d.startsWith('M455 452')).toBe(true);
    expect(d.endsWith('843 470')).toBe(true);
    expect(d.match(/C/g)).toHaveLength(3);
    expect(d).not.toContain('NaN');
  });

  it('handles degenerate point lists', () => {
    expect(smoothPath([])).toBe('');
    expect(smoothPath([{ x: 12, y: 34 }])).toBe('M12 34');
    expect(
      smoothPath([
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toBe('M0 0 C1.7 1.7 8.3 8.3 10 10');
  });
});
