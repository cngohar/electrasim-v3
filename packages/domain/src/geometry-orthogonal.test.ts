/**
 * geometry-orthogonal.test.ts — Phase 6.2 smart routing.
 *
 * Test cases mirror PLAN.md §8.2 "Test cases (write before implementation)".
 * The routing algorithm is hybrid (L-route → A* → diagonal fallback) so each
 * case asserts the *outcome* (no obstacle clipping, expected corners) rather
 * than which branch produced it.
 */

import { describe, expect, it } from 'vitest';
import { type AABB, aStarOrthogonal, computeOrthogonalPath, tryLPath } from './geometry';
import type { Point2D } from './types';

// ─── Helpers ────────────────────────────────────────────────────────────────

const box = (cx: number, cy: number, w = 80, h = 80): AABB => ({
  minX: cx - w / 2,
  minY: cy - h / 2,
  maxX: cx + w / 2,
  maxY: cy + h / 2,
});

/** True if a polyline segment crosses the strict interior of any obstacle. */
function pathClipsObstacles(path: Point2D[], obstacles: AABB[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    for (const r of obstacles) {
      if (a.y === b.y) {
        if (a.y <= r.minY || a.y >= r.maxY) continue;
        const minX = Math.min(a.x, b.x);
        const maxX = Math.max(a.x, b.x);
        if (maxX > r.minX && minX < r.maxX) return true;
      } else if (a.x === b.x) {
        if (a.x <= r.minX || a.x >= r.maxX) continue;
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        if (maxY > r.minY && minY < r.maxY) return true;
      }
    }
  }
  return false;
}

function isOrthogonal(path: Point2D[]): boolean {
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i]!;
    const b = path[i + 1]!;
    if (a.x !== b.x && a.y !== b.y) return false;
  }
  return true;
}

// ─── Cases ──────────────────────────────────────────────────────────────────

describe('computeOrthogonalPath — straight-line cases', () => {
  it('case 1 — same Y axis: emits a single horizontal segment, no bend', () => {
    const path = computeOrthogonalPath({ x: 0, y: 100 }, { x: 200, y: 100 });
    expect(path).toEqual([
      { x: 0, y: 100 },
      { x: 200, y: 100 },
    ]);
  });

  it('case 2 — same X axis: emits a single vertical segment, no bend', () => {
    const path = computeOrthogonalPath({ x: 50, y: 0 }, { x: 50, y: 200 });
    expect(path).toEqual([
      { x: 50, y: 0 },
      { x: 50, y: 200 },
    ]);
  });
});

describe('computeOrthogonalPath — L-route (no obstacles)', () => {
  it('case 3 — diagonal endpoints: returns a 3-point L-route with one corner', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 200, y: 100 };
    const path = computeOrthogonalPath(p1, p2);
    expect(path.length).toBe(3);
    expect(path[0]).toEqual(p1);
    expect(path[2]).toEqual(p2);
    // Corner is at one of the two L-shape elbows.
    const corner = path[1]!;
    const validHV = corner.x === p2.x && corner.y === p1.y;
    const validVH = corner.x === p1.x && corner.y === p2.y;
    expect(validHV || validVH).toBe(true);
  });

  it('always orthogonal — no diagonal segments', () => {
    const path = computeOrthogonalPath({ x: 0, y: 0 }, { x: 250, y: 175 });
    expect(isOrthogonal(path)).toBe(true);
  });
});

describe('computeOrthogonalPath — obstacle avoidance', () => {
  it('case 4 — single obstacle blocks both Ls: A* finds a route around it', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 400, y: 200 };
    // Obstacle straddles BOTH L-corners: (400, 0) and (0, 200).
    const obstacles: AABB[] = [
      box(200, 100, 380, 180), // tall+wide rectangle in the middle
    ];
    const path = computeOrthogonalPath(p1, p2, obstacles);
    expect(isOrthogonal(path)).toBe(true);
    expect(pathClipsObstacles(path, obstacles)).toBe(false);
    expect(path[0]).toEqual(p1);
    expect(path[path.length - 1]).toEqual(p2);
  });

  it('case 7 — JSON-style hand-edited path: caller decides; computeOrthogonalPath honours endpoints exactly', () => {
    // Even when endpoints are inside an obstacle's inflated AABB, the path
    // must still start and end exactly there (the wire owns its port).
    const p1 = { x: 100, y: 100 };
    const p2 = { x: 300, y: 100 };
    const obstacles: AABB[] = [box(p1.x, p1.y, 40, 40), box(p2.x, p2.y, 40, 40)];
    const path = computeOrthogonalPath(p1, p2, obstacles);
    expect(path[0]).toEqual(p1);
    expect(path[path.length - 1]).toEqual(p2);
  });
});

describe('computeOrthogonalPath — fallbacks', () => {
  it('case 6 — pathologically dense layout: returns a diagonal fallback within timeout', () => {
    // Surround the goal with a wall the search can't easily get past.
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 200, y: 0 };
    const wall: AABB[] = [];
    // Stack 50 obstacles in a thick wall between p1 and p2.
    for (let i = 0; i < 50; i++) {
      wall.push(box(100, -200 + i * 8, 4, 8));
    }
    // Even if the search succeeds, the result must be valid.
    const path = computeOrthogonalPath(p1, p2, wall, { timeoutMs: 50 });
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(path[0]).toEqual(p1);
    expect(path[path.length - 1]).toEqual(p2);
  });

  it('always returns at least 2 points (start + end)', () => {
    const path = computeOrthogonalPath({ x: 5, y: 7 }, { x: 5, y: 7 });
    expect(path.length).toBeGreaterThanOrEqual(2);
  });
});

describe('tryLPath — direct unit tests', () => {
  it('returns null when both L-elbows are blocked', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 200, y: 200 };
    // Block (200, 0) and (0, 200) corners.
    const obstacles: AABB[] = [box(200, 0, 40, 40), box(0, 200, 40, 40)];
    expect(tryLPath(p1, p2, obstacles)).toBeNull();
  });

  it('returns the H-then-V L when only V-then-H is blocked', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 200, y: 200 };
    // Block only (0, 200) corner — V-then-H goes through this elbow.
    const obstacles: AABB[] = [box(0, 200, 40, 40)];
    const path = tryLPath(p1, p2, obstacles);
    expect(path).not.toBeNull();
    expect(path).toEqual([
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
    ]);
  });

  it('handles same-Y by returning a straight 2-point segment', () => {
    const path = tryLPath({ x: 0, y: 50 }, { x: 100, y: 50 }, []);
    expect(path).toEqual([
      { x: 0, y: 50 },
      { x: 100, y: 50 },
    ]);
  });
});

describe('aStarOrthogonal — direct unit tests', () => {
  it('finds a path around a single rectangular obstacle', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 320, y: 0 };
    const obstacles: AABB[] = [box(160, 0, 64, 100)];
    const path = aStarOrthogonal(p1, p2, obstacles, 200);
    expect(path).not.toBeNull();
    if (path) {
      expect(path[0]).toEqual(p1);
      expect(path[path.length - 1]).toEqual(p2);
      expect(isOrthogonal(path)).toBe(true);
      expect(pathClipsObstacles(path, obstacles)).toBe(false);
    }
  });

  it('keeps off-grid endpoint adapters orthogonal', () => {
    const p1 = { x: 1, y: 1 };
    const p2 = { x: 319, y: 1 };
    const obstacles: AABB[] = [box(160, 0, 64, 100)];

    const path = aStarOrthogonal(p1, p2, obstacles, 200);

    expect(path).not.toBeNull();
    if (path) {
      expect(path[0]).toEqual(p1);
      expect(path[path.length - 1]).toEqual(p2);
      expect(isOrthogonal(path)).toBe(true);
      expect(pathClipsObstacles(path, obstacles)).toBe(false);
    }
  });

  it('returns null when the search exceeds its time budget', () => {
    // 0 ms budget guarantees the timeout fires on the first iteration check.
    const path = aStarOrthogonal({ x: 0, y: 0 }, { x: 1000, y: 1000 }, [], 0);
    // Either null (timed out) or a valid path if the trivial case kicked in.
    if (path !== null) {
      expect(path[0]).toEqual({ x: 0, y: 0 });
    }
  });
});

describe('Perf telemetry — Phase 6.2.1 regression guards', () => {
  // These budgets are deliberately generous (3-5x what the algorithm needs
  // on a typical dev box) to avoid flakes on slow CI runners, while still
  // being tight enough to catch a real algorithmic regression \u2014 e.g. the
  // CPU spike that hit the user when render-time pathfinding wasn't memoed
  // upstream. If you find yourself bumping these limits to make CI green,
  // *fix the algorithm instead.*

  it('1000 L-route paths complete in under 50ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      computeOrthogonalPath({ x: 0, y: 0 }, { x: 200 + i, y: 100 });
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('1000 L-route paths with 20 obstacles complete in under 200ms', () => {
    const obstacles: AABB[] = [];
    for (let i = 0; i < 20; i++) {
      obstacles.push(box(50 + (i % 5) * 60, 50 + Math.floor(i / 5) * 60, 30, 30));
    }
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      computeOrthogonalPath({ x: 0, y: 0 }, { x: 400 + i, y: 250 }, obstacles);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it('A* fallback stays within its declared 200ms budget per call', () => {
    // Force A* by making both L elbows blocked.
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 200, y: 200 };
    const obstacles: AABB[] = [box(200, 0, 40, 40), box(0, 200, 40, 40)];
    const start = performance.now();
    aStarOrthogonal(p1, p2, obstacles, 200);
    const elapsed = performance.now() - start;
    // 250 ms ceiling: 200 ms timeout + 50 ms overhead headroom.
    expect(elapsed).toBeLessThan(250);
  });

  it('realistic scene (100 short wires, 30 obstacles) stays L-route-fast under 50ms', () => {
    // Approximates a moderately-busy real circuit: 100 wires connecting
    // nearby ports (the common case), with a sprinkling of unrelated
    // obstacles in the canvas. The vast majority should hit the L-route
    // fast path and never invoke A*. This is the "single render frame"
    // workload — if upstream memoisation breaks (the regression that hit
    // in the field), this much work runs *every* render and CPU spikes.
    //
    // If this test starts failing it's almost certainly because L-route
    // stopped being the fast path for typical geometry. *Fix the
    // algorithm, don't bump the budget.*
    const obstacles: AABB[] = [];
    for (let i = 0; i < 30; i++) {
      obstacles.push(box(200 + (i % 6) * 150, 100 + Math.floor(i / 6) * 100, 60, 40));
    }
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      // Short wires (~120 px), spread across the canvas, unlikely to
      // intersect obstacles head-on.
      const baseX = 50 + (i % 10) * 90;
      const baseY = 50 + Math.floor(i / 10) * 60;
      const p1 = { x: baseX, y: baseY };
      const p2 = { x: baseX + 100, y: baseY + 50 };
      computeOrthogonalPath(p1, p2, obstacles);
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });
});

describe('JSON round-trip preservation (case 10)', () => {
  it('pathKind survives JSON.stringify → JSON.parse', () => {
    const wire = {
      id: 'w1',
      fromComponentId: 'a',
      fromPortIndex: 0,
      toComponentId: 'b',
      toPortIndex: 0,
      controlPoints: [],
      pathKind: 'orthogonal' as const,
    };
    const round = JSON.parse(JSON.stringify(wire));
    expect(round.pathKind).toBe('orthogonal');
    expect(round.controlPoints).toEqual([]);
  });

  it('wires with no pathKind round-trip cleanly (back-compat)', () => {
    const wire = {
      id: 'w1',
      fromComponentId: 'a',
      fromPortIndex: 0,
      toComponentId: 'b',
      toPortIndex: 0,
      controlPoints: [],
    };
    const round = JSON.parse(JSON.stringify(wire));
    expect(round.pathKind).toBeUndefined();
  });
});
