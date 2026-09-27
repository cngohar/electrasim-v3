/**
 * fitRegion — map a *screen* rectangle onto the canvas' SVG user-space, and
 * work out which part of it is still visible once floating panels cover it.
 *
 * Why this exists
 * ---------------
 * `CircuitCanvas` renders with a fixed `viewBox` of 1200x720 and
 * `preserveAspectRatio="xMidYMid meet"`, so there is a scale factor between
 * CSS pixels and the user units that `viewportStore.zoomToFit` works in. A
 * caller that hands `zoomToFit` a pixel size is silently applying that factor
 * twice: on a 390x844 phone the meet-scale is 0.325, so a "fit" computed in
 * pixels comes out roughly 3x too small and the circuit collapses into an
 * unreadable clump. Everything here is deliberately pure so the arithmetic can
 * be unit-tested without a DOM; `fitCircuitIntoVisibleRegion` is the only part
 * that touches elements.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewBox {
  width: number;
  height: number;
}

/** Scale + letterbox offsets produced by `preserveAspectRatio="xMidYMid meet"`. */
export interface MeetTransform {
  scale: number;
  offX: number;
  offY: number;
}

/**
 * Derive the pixel->user-unit mapping for a `meet`-fitted viewBox.
 * The shorter axis wins, and the leftover space is split evenly as letterbox
 * padding — which is why `offX`/`offY` are halved.
 */
export function meetTransform(canvas: Rect, viewBox: ViewBox): MeetTransform {
  const scale = Math.min(canvas.width / viewBox.width, canvas.height / viewBox.height);
  return {
    scale,
    offX: (canvas.width - viewBox.width * scale) / 2,
    offY: (canvas.height - viewBox.height * scale) / 2,
  };
}

/**
 * Convert a client-space (viewport pixel) rect into SVG user units.
 *
 * The result routinely falls outside the nominal 0..1200 / 0..720 viewBox: the
 * letterbox bands are real, drawable canvas, and on a tall phone they are most
 * of it. That is intended — we want to fit into everything the user can see,
 * not just the nominal viewBox.
 */
export function clientRectToUserRect(rect: Rect, canvas: Rect, viewBox: ViewBox): Rect {
  const { scale, offX, offY } = meetTransform(canvas, viewBox);
  if (!Number.isFinite(scale) || scale <= 0) return { x: 0, y: 0, width: 0, height: 0 };
  return {
    x: (rect.x - canvas.x - offX) / scale,
    y: (rect.y - canvas.y - offY) / scale,
    width: rect.width / scale,
    height: rect.height / scale,
  };
}

const intersects = (a: Rect, b: Rect): boolean =>
  b.x < a.x + a.width && b.x + b.width > a.x && b.y < a.y + a.height && b.y + b.height > a.y;

const area = (r: Rect): number => Math.max(0, r.width) * Math.max(0, r.height);

/**
 * Remove an occluding rect from a free region.
 *
 * A panel can only be subtracted from a rectangle if we accept losing a strip,
 * so we generate the four maximal remaining strips (left / right / above /
 * below) and keep the largest. For a right-hand dock that yields the strip to
 * its left; for a bottom sheet, the strip above it. Deriving it this way means
 * the panel can move — dock, sheet, or a future left rail — without anyone
 * having to update hard-coded offsets here.
 */
export function subtractOccluder(free: Rect, occluder: Rect): Rect {
  if (!intersects(free, occluder)) return free;
  const candidates: Rect[] = [
    { x: free.x, y: free.y, width: occluder.x - free.x, height: free.height },
    {
      x: occluder.x + occluder.width,
      y: free.y,
      width: free.x + free.width - (occluder.x + occluder.width),
      height: free.height,
    },
    { x: free.x, y: free.y, width: free.width, height: occluder.y - free.y },
    {
      x: free.x,
      y: occluder.y + occluder.height,
      width: free.width,
      height: free.y + free.height - (occluder.y + occluder.height),
    },
  ];
  let best = candidates[0];
  for (const c of candidates) if (area(c) > area(best)) best = c;
  return area(best) > 0 ? best : { x: free.x, y: free.y, width: 0, height: 0 };
}

/**
 * The visible working area, in user units, after every occluder is removed.
 * `minSide` stops a nearly-full-screen panel from producing a sliver that
 * would zoom the circuit into oblivion; in that case we fall back to the whole
 * canvas and accept some overlap, which is still far more usable.
 */
export function computeVisibleRegion(
  canvas: Rect,
  viewBox: ViewBox,
  occluders: readonly Rect[],
  minSide = 160,
): Rect {
  const full = clientRectToUserRect(
    { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height },
    canvas,
    viewBox,
  );
  let region = full;
  for (const occ of occluders) {
    region = subtractOccluder(region, clientRectToUserRect(occ, canvas, viewBox));
  }
  if (region.width < minSide || region.height < minSide) return full;
  return region;
}

/**
 * Pan/zoom that centres `components` inside an arbitrary user-space region.
 *
 * The canvas draws content as `translate(pan) scale(zoom)` in user units, so a
 * component at world (cx, cy) lands at `pan + world * zoom`. Unlike
 * `viewportStore.zoomToFit`, the target region here carries an origin, which
 * is what lets us aim at the strip beside a docked panel instead of always
 * centring on the canvas as a whole.
 */
export function fitComponentsIntoRegion(
  region: Rect,
  components: ReadonlyArray<{ x: number; y: number; rotation?: number }>,
  opts: { compW: number; compH: number; pad?: number; minZoom?: number; maxZoom?: number },
): { pan: { x: number; y: number }; zoom: number } | null {
  if (components.length === 0) return null;
  if (region.width <= 0 || region.height <= 0) return null;
  const pad = opts.pad ?? 60;
  const minZoom = opts.minZoom ?? 0.25;
  const maxZoom = opts.maxZoom ?? 4;
  const halfW = opts.compW / 2;
  const halfH = opts.compH / 2;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const c of components) {
    const angle = ((c.rotation ?? 0) * Math.PI) / 180;
    const extentX = Math.abs(Math.cos(angle)) * halfW + Math.abs(Math.sin(angle)) * halfH;
    const extentY = Math.abs(Math.sin(angle)) * halfW + Math.abs(Math.cos(angle)) * halfH;
    minX = Math.min(minX, c.x - extentX);
    minY = Math.min(minY, c.y - extentY);
    maxX = Math.max(maxX, c.x + extentX);
    maxY = Math.max(maxY, c.y + extentY);
  }
  const bw = maxX - minX + pad * 2;
  const bh = maxY - minY + pad * 2;
  const zoom = Math.min(
    maxZoom,
    Math.max(minZoom, Math.min(region.width / bw, region.height / bh)),
  );
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    zoom,
    pan: {
      x: region.x + region.width / 2 - cx * zoom,
      y: region.y + region.height / 2 - cy * zoom,
    },
  };
}

const toRect = (r: DOMRect): Rect => ({ x: r.x, y: r.y, width: r.width, height: r.height });

/**
 * Fit the current circuit into the part of the canvas that `occluderSelectors`
 * do not cover, and apply the result via `applyView`.
 *
 * Measuring the panels from the DOM (rather than assuming "the dock is 420px
 * wide") means the framing stays correct across the phone bottom-sheet, the
 * narrow `w-56` tablet dock and the `lg:w-[340px]` desktop dock, and it cannot
 * drift when those classes change. Returns false when there is nothing to fit
 * or the canvas is not mounted, so callers can leave the view untouched.
 */
export function fitCircuitIntoVisibleRegion(options: {
  components: ReadonlyArray<{ x: number; y: number; rotation?: number }>;
  compW: number;
  compH: number;
  occluderSelectors: readonly string[];
  applyView: (view: { pan: { x: number; y: number }; zoom: number }) => void;
  pad?: number;
  minZoom?: number;
  maxZoom?: number;
  doc?: Document;
}): boolean {
  const doc = options.doc ?? document;
  const svg = doc.querySelector('[data-circuit-canvas]') as SVGSVGElement | null;
  if (!svg || options.components.length === 0) return false;
  const canvas = toRect(svg.getBoundingClientRect());
  if (canvas.width <= 0 || canvas.height <= 0) return false;
  const vb = svg.viewBox?.baseVal;
  const viewBox = {
    width: vb && vb.width > 0 ? vb.width : canvas.width,
    height: vb && vb.height > 0 ? vb.height : canvas.height,
  };

  const occluders: Rect[] = [];
  for (const sel of options.occluderSelectors) {
    for (const el of Array.from(doc.querySelectorAll(sel))) {
      const r = toRect(el.getBoundingClientRect());
      if (r.width > 0 && r.height > 0) occluders.push(r);
    }
  }

  const region = computeVisibleRegion(canvas, viewBox, occluders);
  const view = fitComponentsIntoRegion(region, options.components, {
    compW: options.compW,
    compH: options.compH,
    pad: options.pad,
    minZoom: options.minZoom,
    maxZoom: options.maxZoom,
  });
  if (!view) return false;
  options.applyView(view);
  return true;
}
