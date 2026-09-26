/**
 * Geometry helpers — pure functions for component & port positioning,
 * bezier wire routing, and bounding-box queries.
 *
 * Used by:
 *   - the SVG renderer for drawing
 *   - the spatial index for hit-testing
 *   - the simulation engine indirectly (none today, but reserved if we
 *     ever model wire length / signal propagation)
 *
 * All functions are pure and dependency-free, suitable for Web Workers.
 */

import { COMP_H, COMP_W } from './components';
import type { ComponentDef, ComponentInstance, Point2D, WireInstance } from './types';

/** Absolute (canvas-space) position of a port on a component instance. */
export function getPortPos(
  comp: ComponentInstance,
  portIndex: number,
  defs: Record<string, ComponentDef>,
): Point2D {
  const def = defs[comp.type];
  if (!def) {
    throw new Error(`getPortPos: unknown component type "${comp.type}"`);
  }
  const port = def.ports[portIndex];
  if (!port) {
    throw new Error(
      `getPortPos: component "${comp.type}" has no port at index ${portIndex} (has ${def.ports.length})`,
    );
  }

  const localX = port.relX * COMP_W - COMP_W / 2;
  const localY = port.relY * COMP_H - COMP_H / 2;
  const rotation = (comp.rotation ?? 0) % 360;

  if (rotation === 0) {
    return {
      x: comp.x + localX,
      y: comp.y + localY,
    };
  }

  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  return {
    x: comp.x + (localX * cos - localY * sin),
    y: comp.y + (localX * sin + localY * cos),
  };
}

/**
 * Component bounding box (centered geometry: `comp.x`/`comp.y` is the centre).
 * Used by viewport culling + hit-testing in Phase 4.
 */
export function getComponentBounds(comp: ComponentInstance): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  return {
    minX: comp.x - COMP_W / 2,
    minY: comp.y - COMP_H / 2,
    maxX: comp.x + COMP_W / 2,
    maxY: comp.y + COMP_H / 2,
  };
}

/**
 * Approximate bezier control offset based on which side of the component
 * the port sits on. Mirrors the heuristic in the legacy renderer so wires
 * exit the component perpendicular-ish to the closest edge.
 */
export function getPortControlOffset(port: { relX: number; relY: number }): Point2D {
  let dx = 0;
  let dy = 0;
  if (port.relX <= 0.25) dx = -40;
  else if (port.relX >= 0.75) dx = 40;
  else if (port.relY <= 0.25) dy = -40;
  else if (port.relY >= 0.75) dy = 40;
  else dy = 40;
  return { x: dx, y: dy };
}

/**
 * Sample a wire's path at N evenly-spaced points. Used for hit-testing
 * (closest-point queries) and animated dashes/particles in the renderer.
 *
 * Dispatches on `wire.pathKind`:
 *   - `'orthogonal'`  → corners returned verbatim (a polyline; the renderer
 *     and hit-tester both linearly interpolate between adjacent points
 *     anyway).
 *   - default/`bezier` → multi-segment cubic Bezier sampled at `segments`
 *     points per span (legacy behaviour).
 */
export function sampleWire(
  wire: WireInstance,
  components: Map<string, ComponentInstance>,
  defs: Record<string, ComponentDef>,
  segments = 16,
): Point2D[] {
  const a = components.get(wire.fromComponentId);
  const b = components.get(wire.toComponentId);
  if (!a || !b) return [];

  const def1 = defs[a.type];
  const def2 = defs[b.type];
  if (!def1 || !def2) return [];

  const port1 = def1.ports[wire.fromPortIndex];
  const port2 = def2.ports[wire.toPortIndex];
  if (!port1 || !port2) return [];

  const p1 = getPortPos(a, wire.fromPortIndex, defs);
  const p2 = getPortPos(b, wire.toPortIndex, defs);

  // Phase 6.2: orthogonal wires are sampled as a polyline. Hand-edited
  // control points (Phase 7) override the auto-route.
  if (wire.pathKind === 'orthogonal') {
    if (wire.controlPoints && wire.controlPoints.length > 0) {
      return [p1, ...wire.controlPoints, p2];
    }
    const obstacles = collectObstacles(components, defs, wire.fromComponentId, wire.toComponentId);
    return computeOrthogonalPath(p1, p2, obstacles);
  }

  // ── Legacy bezier path ──────────────────────────────────────────────
  const off1 = getPortControlOffset(port1);
  const off2 = getPortControlOffset(port2);

  const segmentCount = Math.max(1, Math.floor(segments));
  const pts: Point2D[] = [];
  pts.push(p1);

  // Multi-segment bezier through user-supplied control points, if any.
  let current = p1;
  let currentOff = off1;

  if (wire.controlPoints && wire.controlPoints.length > 0) {
    for (const cp of wire.controlPoints) {
      const c1 = { x: current.x + currentOff.x, y: current.y + currentOff.y };
      for (let i = 1; i <= segmentCount; i++) {
        pts.push(cubicBezier(i / segmentCount, current, c1, cp, cp));
      }
      current = cp;
      currentOff = { x: 0, y: 0 };
    }
    const c1 = { x: current.x + currentOff.x, y: current.y + currentOff.y };
    const c2 = { x: p2.x + off2.x, y: p2.y + off2.y };
    for (let i = 1; i <= segmentCount; i++) {
      pts.push(cubicBezier(i / segmentCount, current, c1, c2, p2));
    }
  } else {
    const c1 = { x: p1.x + off1.x, y: p1.y + off1.y };
    const c2 = { x: p2.x + off2.x, y: p2.y + off2.y };
    for (let i = 1; i <= segmentCount; i++) {
      pts.push(cubicBezier(i / segmentCount, p1, c1, c2, p2));
    }
  }

  return pts;
}

// ─── Smart routing (Phase 6.2 — PLAN.md §8.2) ──────────────────────────────

/** Axis-aligned bounding box used by the orthogonal router. */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Inflation applied to component AABBs so wires don't graze the box edge.
 * Half of `COMP_W / 2` works in practice — wide enough to leave a visible
 * gap, narrow enough that two adjacent components still leave a corridor
 * for an L-route between them.
 */
const OBSTACLE_INFLATE = 6;

/** Collect AABBs of every component except the wire's own endpoints. */
export function collectObstacles(
  components: Map<string, ComponentInstance>,
  _defs: Record<string, ComponentDef>,
  excludeFromId: string,
  excludeToId: string,
): AABB[] {
  const out: AABB[] = [];
  for (const c of components.values()) {
    if (c.id === excludeFromId || c.id === excludeToId) continue;
    const b = getComponentBounds(c);
    out.push({
      minX: b.minX - OBSTACLE_INFLATE,
      minY: b.minY - OBSTACLE_INFLATE,
      maxX: b.maxX + OBSTACLE_INFLATE,
      maxY: b.maxY + OBSTACLE_INFLATE,
    });
  }
  return out;
}

/** Strict point-in-rect test (open interval — touching the edge is OK). */
function pointInside(p: Point2D, r: AABB): boolean {
  return p.x > r.minX && p.x < r.maxX && p.y > r.minY && p.y < r.maxY;
}

/**
 * Does an axis-aligned segment between `a` and `b` cross the interior of
 * any obstacle? Endpoints touching an obstacle edge are tolerated so a wire
 * can legally exit/enter its own port.
 */
function segmentIntersects(a: Point2D, b: Point2D, obstacles: AABB[]): boolean {
  for (const r of obstacles) {
    // Quick AABB reject — if segment AABB doesn't overlap, skip.
    const sMinX = Math.min(a.x, b.x);
    const sMaxX = Math.max(a.x, b.x);
    const sMinY = Math.min(a.y, b.y);
    const sMaxY = Math.max(a.y, b.y);
    if (sMaxX < r.minX || sMinX > r.maxX) continue;
    if (sMaxY < r.minY || sMinY > r.maxY) continue;

    if (a.y === b.y) {
      // Horizontal segment.
      if (a.y <= r.minY || a.y >= r.maxY) continue;
      const segMinX = sMinX;
      const segMaxX = sMaxX;
      if (segMaxX > r.minX && segMinX < r.maxX) return true;
    } else if (a.x === b.x) {
      // Vertical segment.
      if (a.x <= r.minX || a.x >= r.maxX) continue;
      const segMinY = sMinY;
      const segMaxY = sMaxY;
      if (segMaxY > r.minY && segMinY < r.maxY) return true;
    } else {
      // Diagonal — treat as blocked if the AABBs even overlap. Diagonals
      // shouldn't appear in orthogonal routes; this is a safety net.
      return true;
    }
  }
  return false;
}

/**
 * Try a 2-bend L-route: H-then-V (corner at `(p2.x, p1.y)`) or V-then-H
 * (corner at `(p1.x, p2.y)`). Returns the polyline if either is clear,
 * otherwise null.
 *
 * SR2 fast path — hits ~95 % of paths in sub-millisecond time.
 */
export function tryLPath(p1: Point2D, p2: Point2D, obstacles: AABB[]): Point2D[] | null {
  if (p1.x === p2.x || p1.y === p2.y) {
    // Already aligned — straight segment.
    if (!segmentIntersects(p1, p2, obstacles)) return [p1, p2];
    return null;
  }
  const cornerHV = { x: p2.x, y: p1.y };
  if (!segmentIntersects(p1, cornerHV, obstacles) && !segmentIntersects(cornerHV, p2, obstacles)) {
    return [p1, cornerHV, p2];
  }
  const cornerVH = { x: p1.x, y: p2.y };
  if (!segmentIntersects(p1, cornerVH, obstacles) && !segmentIntersects(cornerVH, p2, obstacles)) {
    return [p1, cornerVH, p2];
  }
  return null;
}

/** A* grid resolution. Coarser = faster + lower-fidelity routes. */
const GRID = 16;

/**
 * A* search on a coarse grid for an orthogonal path from `p1` to `p2` that
 * avoids `obstacles`. Returns null if the path can't be found inside
 * `timeoutMs` (typical: 200 ms — keeps the UI responsive).
 *
 * Output is simplified: collinear points are removed so consumers see only
 * corner vertices. The endpoints are always exactly `p1` and `p2` even if
 * they don't sit on the grid.
 */
export function aStarOrthogonal(
  p1: Point2D,
  p2: Point2D,
  obstacles: AABB[],
  timeoutMs = 200,
): Point2D[] | null {
  const start = Date.now();

  // Snap to grid for the search; we'll splice the real endpoints back in.
  const sx = Math.round(p1.x / GRID) * GRID;
  const sy = Math.round(p1.y / GRID) * GRID;
  const gx = Math.round(p2.x / GRID) * GRID;
  const gy = Math.round(p2.y / GRID) * GRID;

  if (sx === gx && sy === gy) {
    // Trivial case — endpoints round to the same cell, but keep the adapter
    // orthogonal when both coordinates differ.
    return tryLPath(p1, p2, obstacles);
  }

  const key = (x: number, y: number) => `${x},${y}`;
  const blocked = (x: number, y: number) => {
    for (const r of obstacles) {
      if (x > r.minX && x < r.maxX && y > r.minY && y < r.maxY) return true;
    }
    return false;
  };

  type Node = { x: number; y: number; g: number; f: number; parent: Node | null };
  const open = new Map<string, Node>();
  const closed = new Set<string>();
  const startNode: Node = {
    x: sx,
    y: sy,
    g: 0,
    f: Math.abs(gx - sx) + Math.abs(gy - sy),
    parent: null,
  };
  open.set(key(sx, sy), startNode);

  const dirs = [
    [GRID, 0],
    [-GRID, 0],
    [0, GRID],
    [0, -GRID],
  ];

  // Bound the search aggressively. Without this, dense circuits can balloon
  // the open set when the goal is unreachable.
  const MAX_NODES = 4000;
  let visited = 0;

  while (open.size > 0) {
    if (visited++ > MAX_NODES) return null;
    if ((visited & 0x3f) === 0 && Date.now() - start > timeoutMs) return null;

    // Pull the open node with the smallest f. Linear scan is fine at this size.
    let current: Node | null = null;
    let currentKey = '';
    for (const [k, n] of open) {
      if (!current || n.f < current.f) {
        current = n;
        currentKey = k;
      }
    }
    if (!current) return null;

    if (current.x === gx && current.y === gy) {
      // Reconstruct path.
      const raw: Point2D[] = [];
      let cur: Node | null = current;
      while (cur) {
        raw.push({ x: cur.x, y: cur.y });
        cur = cur.parent;
      }
      raw.reverse();
      const gridStart = raw[0]!;
      const gridGoal = raw[raw.length - 1]!;
      const startAdapter =
        p1.x === gridStart.x && p1.y === gridStart.y ? [p1] : tryLPath(p1, gridStart, obstacles);
      const goalAdapter =
        gridGoal.x === p2.x && gridGoal.y === p2.y ? [gridGoal] : tryLPath(gridGoal, p2, obstacles);
      if (!startAdapter || !goalAdapter) return null;
      return simplifyCollinear([...startAdapter, ...raw.slice(1), ...goalAdapter.slice(1)]);
    }

    open.delete(currentKey);
    closed.add(currentKey);

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      if (blocked(nx, ny)) continue;
      // Check the segment between `current` and the neighbour for partial
      // obstacle clipping (the centre of the cell may be free even if the
      // cell overlaps an obstacle by less than one grid step).
      if (segmentIntersects({ x: current.x, y: current.y }, { x: nx, y: ny }, obstacles)) continue;

      const tentativeG = current.g + GRID;
      const existing = open.get(nk);
      if (existing && tentativeG >= existing.g) continue;

      const h = Math.abs(gx - nx) + Math.abs(gy - ny);
      const node: Node = { x: nx, y: ny, g: tentativeG, f: tentativeG + h, parent: current };
      open.set(nk, node);
    }
  }

  return null;
}

/** Drop intermediate points that lie on the same axis as their neighbours. */
function simplifyCollinear(pts: Point2D[]): Point2D[] {
  if (pts.length <= 2) return pts.slice();
  const out: Point2D[] = [pts[0]!];
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = out[out.length - 1]!;
    const cur = pts[i]!;
    const next = pts[i + 1]!;
    const collinearH = prev.y === cur.y && cur.y === next.y;
    const collinearV = prev.x === cur.x && cur.x === next.x;
    if (collinearH || collinearV) continue;
    out.push(cur);
  }
  out.push(pts[pts.length - 1]!);
  return out;
}

/**
 * Compute an orthogonal (Manhattan-style) path from `p1` to `p2` that
 * avoids `obstacles`. Hybrid algorithm per PLAN.md §8.2 SR2:
 *
 *   1. **L-route** — try H-then-V or V-then-H. Hits ~95 % of paths
 *      sub-millisecond.
 *   2. **A\* fallback** — coarse-grid A* with a `timeoutMs` cap. Handles
 *      dense layouts where no L-shape fits.
 *   3. **Diagonal fallback** — if both fail (no path within budget), return
 *      a simple `[p1, p2]` so the user always sees *something*. Visually
 *      this looks like the legacy straight-bezier; functionally the wire
 *      is still electrically valid.
 *
 * Always returns a non-empty polyline. First and last points are exactly
 * `p1` and `p2`; intermediates (if any) are corner vertices.
 */
export function computeOrthogonalPath(
  p1: Point2D,
  p2: Point2D,
  obstacles: AABB[] = [],
  options: { timeoutMs?: number } = {},
): Point2D[] {
  // Don't let an obstacle that contains an endpoint block its own wire.
  // (Each component's port sits inside the inflated AABB by construction.)
  const filtered = obstacles.filter((r) => !pointInside(p1, r) && !pointInside(p2, r));

  const lPath = tryLPath(p1, p2, filtered);
  if (lPath) return lPath;

  const aStar = aStarOrthogonal(p1, p2, filtered, options.timeoutMs ?? 200);
  if (aStar) return aStar;

  // Last resort: diagonal. Caller still gets a valid polyline.
  return [p1, p2];
}

/** Cubic bezier evaluator. `t` ∈ [0, 1]. */
export function cubicBezier(
  t: number,
  p0: Point2D,
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

/** Snap a coordinate to the nearest grid intersection. */
export function snapToGrid(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}
