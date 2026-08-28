/**
 * stage-spec.ts — the shared contract for the toolbox' full-bleed visual stages.
 *
 * Every tool that renders a live scene (voltage drop's landscape, cable sizing's
 * cutaway, and later the max-Zs fault loop) uses the same three things, defined
 * here so they cannot drift apart:
 *
 * 1. an authored artwork canvas (a design size the SVG `viewBox` starts on),
 * 2. a fitting rule that keeps the whole composition visible *and* edge-to-edge
 *    on any aspect ratio (no flat page-colour bars on ultrawide screens, no
 *    squashed artwork on phones) — implemented at runtime by
 *    `public/js/scene-stage.js`, mirrored by `fitStageViewBox()` below so the
 *    server-rendered markup already ships the right viewBox for the common
 *    desktop ratios,
 * 3. a paint-from-result rule: the scene is driven only by the calculator's
 *    output (CSS custom properties + a couple of attributes), never by its own
 *    copy of the inputs, so the picture and the numbers cannot disagree.
 */

/** Shared numeric caps for stage fitting. */
export const STAGE_FIT = {
  /** How far scenery may widen past the artwork before the view starts cropping. */
  maxWiden: 2.6,
  /** How far scenery may heighten (portrait/tall stages) before cropping sides. */
  maxTaller: 1.9,
  /** Never crop tighter than this fraction of the artwork width. */
  minCropWidthRatio: 0.72,
} as const;

export interface StageViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Fit a `viewBox` to a stage rectangle so the authored composition
 * (`baseW` × `baseH`) is always fully honoured in one axis and the *spare*
 * area is filled with scenery instead of page background.
 *
 * The returned box keeps the stage's exact aspect ratio, which is what removes
 * letterboxing; slack is biased below the horizon so foregrounds stay grounded.
 */
export function fitStageViewBox(
  stage: { width: number; height: number },
  baseW: number,
  baseH: number,
): StageViewBox {
  const { maxWiden, maxTaller, minCropWidthRatio } = STAGE_FIT;
  if (!(stage.width > 0) || !(stage.height > 0)) {
    return { x: 0, y: 0, width: baseW, height: baseH };
  }

  const ratio = stage.width / stage.height;
  const baseRatio = baseW / baseH;
  let width: number;
  let height: number;

  if (ratio >= baseRatio) {
    // Wide / ultrawide: hold the full height and widen the landscape.
    width = Math.min(baseH * ratio, baseW * maxWiden);
    height = width / ratio;
  } else {
    // Tall / portrait: grow upwards and downwards, then ease the sides in.
    height = Math.min(baseW / ratio, baseH * maxTaller);
    width = Math.max(height * ratio, baseW * minCropWidthRatio);
    height = width / ratio;
  }

  const x = (baseW - width) / 2;
  // Extreme aspect ratios crop: give up sky, never the ground line.
  const y = height <= baseH ? baseH - height : -(height - baseH) * 0.35;

  return { x, y, width, height };
}

/** `viewBox` attribute string for the fitted box. */
export function stageViewBoxAttribute(
  stage: { width: number; height: number },
  baseW: number,
  baseH: number,
): string {
  const b = fitStageViewBox(stage, baseW, baseH);
  return `${b.x.toFixed(1)} ${b.y.toFixed(1)} ${b.width.toFixed(1)} ${b.height.toFixed(1)}`;
}

/**
 * Paint contract shared by the scenes: the runtime sets these custom properties
 * on the scene root and nothing else, so CSS owns every visual response.
 *
 *   --heat        0..1   conductor/insulation heat load
 *   --cool        0..1   how easily heat escapes (1 = free air, 0 = trapped)
 *   --gauge       0..1   derated capacity fill, relative to the gauge scale
 *   --load-mark   0..1   design current (Ib) marker position
 *   --rating-mark 0..1   protective device (In) marker position
 *   --core        1..N   conductor scale factor for the cut-face core group
 *   --insul       0..1   thermal-insulation layer thickness
 *   --flow        s      current-particle cycle time
 *
 * plus the attributes `data-method`, `data-status`, `data-constraint`,
 * `data-neighbours` and the shared `.scene-paused` class.
 */
export const STAGE_PAINT_VARS = [
  '--heat',
  '--cool',
  '--gauge',
  '--load-mark',
  '--rating-mark',
  '--core',
  '--insul',
  '--flow',
  // cable-sizing story: 0..1 conductor scale, spent volt-drop budget,
  // It/Iz utilisation, sag amount, delivered voltage, layer separation
  '--size',
  '--drop',
  '--util',
  '--sag',
  '--delivered',
  '--explode',
] as const;

/** Authored canvas for the voltage-drop landscape stage. */
export const VOLTAGE_DROP_STAGE = { width: 1440, height: 810 } as const;

/** Authored canvas for the cable-sizing cutaway stage. */
export const CABLE_CUTAWAY_STAGE = { width: 1280, height: 760 } as const;

/* ══════════════════════════════════════════════════════════════════════════
 * The cable run: source → cable → load.
 *
 * The composition tells the story the sizing rule is about: power leaves the
 * consumer unit on the left, travels along a cable whose thickness, route and
 * temperature are the calculator's answer, and arrives at an appliance on the
 * right which is starved by exactly the volt drop that was computed.
 *
 * Everything informative sits inside the band the floating panels leave free
 * (x 292..988 of 1280); wall, floor and sky are allowed to run underneath them.
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * The informative box of the run composition. The fit guarantees *this* region
 * lands in the band the floating panels leave free; wall, floor and sky may run
 * underneath them. `public/js/cable-size-tool.js` mirrors these numbers.
 */
export const CABLE_ROUTE = { x0: 292, x1: 1032, y0: 144, y1: 718 } as const;

/** Shared anchors, in canvas units. */
export const CABLE_RUN = {
  source: { x: 455, y: 452 },
  load: { x: 843, y: 470 },
  /** the strata a run crosses, top to bottom */
  loftY: 232,
  trayY: 300,
  wallY: 372,
  terminalY: 470,
  floorY: 556,
  trenchY: 618,
  /** how much a run sags between supports, in canvas units, at 200 m */
  maxSag: 46,
  /** how flexible each fixing method is about that sag */
  sagGive: { A: 0.34, B: 0.06, C: 1, D: 0.1, E: 0.72 } as Record<string, number>,
} as const;

/**
 * The length at which a freely hanging run has reached its full plotted sag.
 * The client's `routePoints()` mirrors this constant and the same clamped
 * fraction, so the server-rendered path and the live one are the same curve.
 */
export const CABLE_ROUTE_SAG_METRES = 140;

/** Points of the run for one installation method at a run length in metres. */
export function cableRoutePoints(
  method: keyof typeof CABLE_RUN.sagGive | string,
  lengthMeters: number,
): Array<{ x: number; y: number }> {
  const R = CABLE_RUN;
  const t = Math.max(0, Math.min(1, (lengthMeters - 1) / CABLE_ROUTE_SAG_METRES));
  const sag = (give: number) => R.maxSag * give * t;
  const mid = (R.source.x + R.load.x) / 2;
  switch (method) {
    case 'A': {
      // up into the loft, across under the insulation, down the far wall
      const s = sag(0.34);
      return [
        R.source,
        { x: R.source.x, y: R.loftY },
        { x: mid - 84, y: R.loftY + 8 + s },
        { x: mid + 96, y: R.loftY + 6 + s },
        { x: R.load.x, y: R.loftY },
        R.load,
      ];
    }
    case 'B':
      // in conduit: the conduit carries it, so the cable itself does not sag
      return [
        R.source,
        { x: R.source.x, y: R.wallY },
        { x: mid, y: R.wallY + sag(0.06) },
        { x: R.load.x, y: R.wallY },
        R.load,
      ];
    case 'D':
      // buried: laid in a trench, so it sits on the bottom in a straight line
      return [
        R.source,
        { x: R.source.x - 6, y: R.trenchY },
        { x: mid, y: R.trenchY + sag(0.1) },
        { x: R.load.x + 6, y: R.trenchY },
        R.load,
      ];
    case 'E': {
      // on tray between spacers: a dip between each pair of supports
      const s = sag(0.72);
      return [
        R.source,
        { x: R.source.x, y: R.trayY },
        { x: mid - 118, y: R.trayY + 10 + s },
        { x: mid + 118, y: R.trayY + 10 + s },
        { x: R.load.x, y: R.trayY },
        R.load,
      ];
    }
    default:
      // clipped direct: free between each clip pair, so this is the sagging case
      return [
        R.source,
        { x: mid - 96, y: (R.source.y + R.load.y) / 2 + sag(1) * 0.62 },
        { x: mid + 96, y: (R.source.y + R.load.y) / 2 + sag(1) },
        R.load,
      ];
  }
}

/**
 * Catmull-Rom → cubic Bézier: a smooth path through every point. A run of cable
 * has no corners, and a polyline of `L` commands read as a circuit diagram
 * rather than as something hanging between fixings.
 */
export function smoothPath(points: Array<{ x: number; y: number }>, tension = 0.5): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
  const f = (n: number) => Number(n.toFixed(1));
  const parts: string[] = [`M${f(points[0].x)} ${f(points[0].y)}`];
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;
    parts.push(`C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(p2.x)} ${f(p2.y)}`);
  }
  return parts.join(' ');
}

/** The `d` for the visible run: method decides where it goes, length how far it hangs. */
export function cableRoutePath(method: string, lengthMeters: number): string {
  return smoothPath(cableRoutePoints(method, lengthMeters));
}
