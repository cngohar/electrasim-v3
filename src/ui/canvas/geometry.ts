import {
  COMPONENT_DEFS,
  type ComponentInstance,
  type Point2D,
  type WireInstance,
  collectObstacles,
  computeOrthogonalPath,
  getPortControlOffset,
  getPortPos,
} from '@electrasim/domain';

export function screenToSvg(svg: SVGSVGElement, clientX: number, clientY: number): Point2D {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: clientX, y: clientY };
  const transformed = point.matrixTransform(ctm.inverse());
  return { x: transformed.x, y: transformed.y };
}

export function svgToWorld(point: Point2D, pan: Point2D, zoom: number): Point2D {
  return { x: (point.x - pan.x) / zoom, y: (point.y - pan.y) / zoom };
}

export function pointsToRoundedPath(points: readonly Point2D[], radius = 10): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0]!.x} ${points[0]!.y}`;
  if (points.length === 2)
    return `M ${points[0]!.x} ${points[0]!.y} L ${points[1]!.x} ${points[1]!.y}`;

  let path = `M ${points[0]!.x} ${points[0]!.y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]!;
    const curr = points[i]!;
    const next = points[i + 1]!;

    const dPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    const dNext = Math.hypot(next.x - curr.x, next.y - curr.y);
    const r = Math.min(radius, dPrev / 2, dNext / 2);

    if (r < 1) {
      path += ` L ${curr.x} ${curr.y}`;
      continue;
    }

    const pBefore = {
      x: curr.x - ((curr.x - prev.x) / dPrev) * r,
      y: curr.y - ((curr.y - prev.y) / dPrev) * r,
    };
    const pAfter = {
      x: curr.x + ((next.x - curr.x) / dNext) * r,
      y: curr.y + ((next.y - curr.y) / dNext) * r,
    };

    path += ` L ${pBefore.x} ${pBefore.y} Q ${curr.x} ${curr.y} ${pAfter.x} ${pAfter.y}`;
  }

  const last = points[points.length - 1]!;
  path += ` L ${last.x} ${last.y}`;
  return path;
}

export function pointsToLinePath(points: readonly Point2D[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

/** Stored control points are user-authored corners and must win over auto-routing. */
export function buildOrthogonalPath(
  start: Point2D,
  end: Point2D,
  wire: WireInstance,
  componentsById: Map<string, ComponentInstance>,
): string {
  const points =
    wire.controlPoints && wire.controlPoints.length > 0
      ? [start, ...wire.controlPoints, end]
      : computeOrthogonalPath(
          start,
          end,
          collectObstacles(
            componentsById,
            COMPONENT_DEFS,
            wire.fromComponentId,
            wire.toComponentId,
          ),
        );
  return pointsToRoundedPath(points);
}

export function buildBezierPath(
  start: Point2D,
  startOffset: Point2D,
  end: Point2D,
  endOffset: Point2D,
  controlPoints: readonly Point2D[],
): string {
  if (controlPoints.length === 0) {
    return `M ${start.x} ${start.y} C ${start.x + startOffset.x} ${start.y + startOffset.y}, ${end.x + endOffset.x} ${end.y + endOffset.y}, ${end.x} ${end.y}`;
  }

  let path = `M ${start.x} ${start.y}`;
  let current = start;
  let currentOffset = startOffset;
  for (const controlPoint of controlPoints) {
    path += ` C ${current.x + currentOffset.x} ${current.y + currentOffset.y}, ${controlPoint.x} ${controlPoint.y}, ${controlPoint.x} ${controlPoint.y}`;
    current = controlPoint;
    currentOffset = { x: 0, y: 0 };
  }
  path += ` C ${current.x + currentOffset.x} ${current.y + currentOffset.y}, ${end.x + endOffset.x} ${end.y + endOffset.y}, ${end.x} ${end.y}`;
  return path;
}

/** Build the rendered path for either supported wire style. */
export function buildWirePath(
  wire: WireInstance,
  componentsById: Map<string, ComponentInstance>,
): string | null {
  const from = componentsById.get(wire.fromComponentId);
  const to = componentsById.get(wire.toComponentId);
  if (!from || !to) return null;
  const fromPort = COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex];
  const toPort = COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex];
  if (!fromPort || !toPort) return null;

  const start = getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS);
  const end = getPortPos(to, wire.toPortIndex, COMPONENT_DEFS);
  return wire.pathKind === 'orthogonal'
    ? buildOrthogonalPath(start, end, wire, componentsById)
    : buildBezierPath(
        start,
        getPortControlOffset(fromPort),
        end,
        getPortControlOffset(toPort),
        wire.controlPoints,
      );
}

/** Lightweight drag preview; the authoritative obstacle route is rebuilt on commit. */
export function buildWirePreviewPath(
  wire: WireInstance,
  componentsById: Map<string, ComponentInstance>,
): string | null {
  const from = componentsById.get(wire.fromComponentId);
  const to = componentsById.get(wire.toComponentId);
  if (!from || !to) return null;
  const fromPort = COMPONENT_DEFS[from.type]?.ports[wire.fromPortIndex];
  const toPort = COMPONENT_DEFS[to.type]?.ports[wire.toPortIndex];
  if (!fromPort || !toPort) return null;

  const start = getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS);
  const end = getPortPos(to, wire.toPortIndex, COMPONENT_DEFS);
  if (wire.pathKind === 'orthogonal') {
    const points =
      wire.controlPoints.length > 0
        ? [start, ...wire.controlPoints, end]
        : [
            start,
            { x: (start.x + end.x) / 2, y: start.y },
            { x: (start.x + end.x) / 2, y: end.y },
            end,
          ];
    return pointsToLinePath(points);
  }
  return buildBezierPath(
    start,
    getPortControlOffset(fromPort),
    end,
    getPortControlOffset(toPort),
    wire.controlPoints,
  );
}
