import type { Point2D } from '@electrasim/domain';

type MeasuredPath = { points: Point2D[]; lengths: number[]; length: number };
const cache = new Map<string, MeasuredPath>();
const midpoint = (a: Point2D, b: Point2D): Point2D => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** Flatten the actual renderer's M/L/H/V/Q/C path, not the domain's electrical
 * wire samples. The 0.01 world-unit tolerance stays below one screen pixel even
 * at maximum editor zoom. Pure geometry also works in static renders and tests. */
function measurePath(d: string): MeasuredPath | null {
  const cached = cache.get(d);
  if (cached) return cached;
  const tokens = d.match(/[a-zA-Z]|[-+]?(?:\d*\.?\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  const points: Point2D[] = [];
  let i = 0;
  let current: Point2D = { x: 0, y: 0 };
  const point = () => ({ x: Number(tokens[i++]), y: Number(tokens[i++]) });
  const flatten = (controls: Point2D[], depth = 0) => {
    const a = controls[0]!;
    const b = controls.at(-1)!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const flat = controls.slice(1, -1).every((p) => {
      const t = lengthSquared
        ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSquared))
        : 0;
      return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy) <= 0.01;
    });
    if (flat || depth === 16) {
      points.push(b);
      return;
    }
    const left = [a];
    const right = [b];
    let row = controls;
    while (row.length > 1) {
      row = row.slice(1).map((p, index) => midpoint(row[index]!, p));
      left.push(row[0]!);
      right.unshift(row.at(-1)!);
    }
    flatten(left, depth + 1);
    flatten(right, depth + 1);
  };
  while (i < tokens.length) {
    const command = tokens[i++];
    if (command === 'M') {
      if (points.length) return null; // Wire paths are continuous single subpaths.
      current = point();
      points.push(current);
    } else if (command === 'L') {
      current = point();
      points.push(current);
    } else if (command === 'H') {
      current = { ...current, x: Number(tokens[i++]) };
      points.push(current);
    } else if (command === 'V') {
      current = { ...current, y: Number(tokens[i++]) };
      points.push(current);
    } else if (command === 'Q' || command === 'C') {
      const controls = [current, point(), point()];
      if (command === 'C') controls.push(point());
      flatten(controls);
      current = controls.at(-1)!;
    } else return null;
    if (!Number.isFinite(current.x) || !Number.isFinite(current.y)) return null;
  }
  if (!points.length) return null;
  let length = 0;
  const lengths = points.map((p, index) => {
    const prev = points[index - 1];
    if (prev) length += Math.hypot(p.x - prev.x, p.y - prev.y);
    return length;
  });
  const measured = { points, lengths, length };
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(d, measured);
  return measured;
}

export function sampleRenderedPath(d: string, terminalEnd?: 'from' | 'to') {
  const path = measurePath(d);
  if (!path) return null;
  const at = (distance: number): Point2D => {
    const bounded = Math.max(0, Math.min(path.length, distance));
    const index = path.lengths.findIndex((length) => length >= bounded);
    if (index <= 0) return path.points[0]!;
    const a = path.points[index - 1]!;
    const b = path.points[index]!;
    const start = path.lengths[index - 1]!;
    const span = path.lengths[index]! - start;
    const t = span ? (bounded - start) / span : 0;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
  };
  const inset = Math.min(18, path.length / 2);
  const distance =
    terminalEnd === 'from' ? inset : terminalEnd === 'to' ? path.length - inset : path.length / 2;
  const before = at(distance - 0.05);
  const after = at(distance + 0.05);
  return {
    mid: at(distance),
    angle: (Math.atan2(after.y - before.y, after.x - before.x) * 180) / Math.PI,
    d,
  };
}
