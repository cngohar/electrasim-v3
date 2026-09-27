import { describe, expect, it } from 'vitest';
import {
  clientRectToUserRect,
  computeVisibleRegion,
  fitComponentsIntoRegion,
  meetTransform,
  subtractOccluder,
} from './fitRegion';

/** The canvas' real viewBox — see `CircuitCanvas` VIEW_W / VIEW_H. */
const VIEW = { width: 1200, height: 720 };
const DESKTOP = { x: 0, y: 0, width: 1440, height: 900 };
const PHONE = { x: 0, y: 0, width: 390, height: 844 };

describe('meetTransform', () => {
  it('letterboxes on the axis with slack (desktop: vertical bands)', () => {
    const t = meetTransform(DESKTOP, VIEW);
    // 1440/1200 = 1.2, 900/720 = 1.25 -> width is the binding axis.
    expect(t.scale).toBeCloseTo(1.2, 5);
    expect(t.offX).toBeCloseTo(0, 5);
    expect(t.offY).toBeCloseTo(18, 5); // (900 - 720*1.2) / 2
  });

  it('produces the deep top/bottom bands seen on a tall phone', () => {
    const t = meetTransform(PHONE, VIEW);
    expect(t.scale).toBeCloseTo(0.325, 5);
    expect(t.offY).toBeCloseTo(305, 5);
  });
});

describe('clientRectToUserRect', () => {
  it('is the exact inverse of the meet transform', () => {
    const user = clientRectToUserRect(DESKTOP, DESKTOP, VIEW);
    expect(user.x).toBeCloseTo(0, 5);
    expect(user.y).toBeCloseTo(-15, 5); // -18px / 1.2
    expect(user.width).toBeCloseTo(1200, 5);
    expect(user.height).toBeCloseTo(750, 5);
  });

  it('maps the letterbox band to user space outside the nominal viewBox', () => {
    // This is the whole point: on a phone most of the visible canvas lies
    // outside 0..720, and it is still drawable.
    const user = clientRectToUserRect(PHONE, PHONE, VIEW);
    expect(user.y).toBeLessThan(0);
    expect(user.height).toBeGreaterThan(VIEW.height);
  });

  it('degrades safely on a zero-sized canvas rather than emitting NaN', () => {
    const r = clientRectToUserRect(DESKTOP, { x: 0, y: 0, width: 0, height: 0 }, VIEW);
    expect(r).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});

describe('subtractOccluder', () => {
  const free = { x: 0, y: 0, width: 1000, height: 1000 };

  it('returns the region untouched when nothing overlaps', () => {
    const away = { x: 2000, y: 2000, width: 100, height: 100 };
    expect(subtractOccluder(free, away)).toEqual(free);
  });

  it('keeps the strip left of a right-hand dock', () => {
    const dock = { x: 700, y: 0, width: 300, height: 1000 };
    expect(subtractOccluder(free, dock)).toEqual({ x: 0, y: 0, width: 700, height: 1000 });
  });

  it('keeps the strip above a bottom sheet', () => {
    const sheet = { x: 0, y: 600, width: 1000, height: 400 };
    expect(subtractOccluder(free, sheet)).toEqual({ x: 0, y: 0, width: 1000, height: 600 });
  });

  it('collapses to zero area when fully covered', () => {
    const all = { x: -10, y: -10, width: 2000, height: 2000 };
    const out = subtractOccluder(free, all);
    expect(out.width * out.height).toBe(0);
  });
});

describe('computeVisibleRegion', () => {
  it('excludes a desktop right dock', () => {
    const dock = { x: 1044, y: 96, width: 340, height: 772 };
    const region = computeVisibleRegion(DESKTOP, VIEW, [dock]);
    const dockUser = clientRectToUserRect(dock, DESKTOP, VIEW);
    expect(region.x + region.width).toBeLessThanOrEqual(dockUser.x + 0.001);
  });

  it('excludes a phone bottom sheet', () => {
    const sheet = { x: 10, y: 325, width: 366, height: 439 };
    const region = computeVisibleRegion(PHONE, VIEW, [sheet]);
    const sheetUser = clientRectToUserRect(sheet, PHONE, VIEW);
    expect(region.y + region.height).toBeLessThanOrEqual(sheetUser.y + 0.001);
  });

  it('falls back to the full canvas when a panel would leave only a sliver', () => {
    const huge = { x: 0, y: 0, width: 1430, height: 890 };
    const region = computeVisibleRegion(DESKTOP, VIEW, [huge]);
    expect(region).toEqual(clientRectToUserRect(DESKTOP, DESKTOP, VIEW));
  });

  it('handles several occluders at once', () => {
    const region = computeVisibleRegion(DESKTOP, VIEW, [
      { x: 1044, y: 96, width: 340, height: 772 },
      { x: 0, y: 840, width: 1440, height: 60 },
    ]);
    expect(region.width).toBeGreaterThan(0);
    expect(region.height).toBeGreaterThan(0);
  });
});

describe('fitComponentsIntoRegion', () => {
  const opts = { compW: 100, compH: 70, pad: 60 };

  it('returns null when there is nothing to frame', () => {
    expect(fitComponentsIntoRegion({ x: 0, y: 0, width: 800, height: 600 }, [], opts)).toBeNull();
  });

  it('centres the component bounds inside an off-origin region', () => {
    const region = { x: 200, y: 100, width: 600, height: 400 };
    const comps = [
      { x: 0, y: 0 },
      { x: 400, y: 200 },
    ];
    const view = fitComponentsIntoRegion(region, comps, opts);
    if (!view) throw new Error('expected a view');
    // Centre of the bounds must land at the centre of the *region*, not the canvas.
    const cx = 200 * view.zoom + view.pan.x;
    const cy = 100 * view.zoom + view.pan.y;
    expect(cx).toBeCloseTo(region.x + region.width / 2, 5);
    expect(cy).toBeCloseTo(region.y + region.height / 2, 5);
  });

  it('keeps every component inside the region', () => {
    const region = { x: 0, y: -15, width: 870, height: 750 };
    const comps = [
      { x: 110, y: 90 },
      { x: 1030, y: 1130 },
      { x: 500, y: 400 },
    ];
    const view = fitComponentsIntoRegion(region, comps, opts);
    if (!view) throw new Error('expected a view');
    for (const c of comps) {
      const left = (c.x - 50) * view.zoom + view.pan.x;
      const right = (c.x + 50) * view.zoom + view.pan.x;
      const top = (c.y - 35) * view.zoom + view.pan.y;
      const bottom = (c.y + 35) * view.zoom + view.pan.y;
      expect(left).toBeGreaterThanOrEqual(region.x - 0.001);
      expect(right).toBeLessThanOrEqual(region.x + region.width + 0.001);
      expect(top).toBeGreaterThanOrEqual(region.y - 0.001);
      expect(bottom).toBeLessThanOrEqual(region.y + region.height + 0.001);
    }
  });

  it('respects the zoom clamp', () => {
    const tiny = fitComponentsIntoRegion(
      { x: 0, y: 0, width: 10, height: 10 },
      [
        { x: 0, y: 0 },
        { x: 100000, y: 100000 },
      ],
      { ...opts, minZoom: 0.25, maxZoom: 4 },
    );
    expect(tiny?.zoom).toBe(0.25);

    const single = fitComponentsIntoRegion(
      { x: 0, y: 0, width: 4000, height: 4000 },
      [{ x: 0, y: 0 }],
      {
        ...opts,
        minZoom: 0.25,
        maxZoom: 4,
      },
    );
    expect(single?.zoom).toBe(4);
  });

  it('does not double-apply the meet scale (the phone regression)', () => {
    // Reproduces the original bug: a 6-component circuit on a 390x844 phone.
    // Passing CSS pixels to a user-unit fitter yielded zoom ~0.12; fitting in
    // user space must stay legible.
    const region = computeVisibleRegion(PHONE, VIEW, [{ x: 10, y: 325, width: 366, height: 439 }]);
    const comps = [
      { x: 110, y: 300 },
      { x: 340, y: 300 },
      { x: 570, y: 300 },
      { x: 800, y: 300 },
      { x: 1030, y: 300 },
      { x: 110, y: 500 },
    ];
    const view = fitComponentsIntoRegion(region, comps, opts);
    if (!view) throw new Error('expected a view');
    expect(view.zoom).toBeGreaterThan(0.25);
  });
  it('includes the rotated footprint at both quarter turns and arbitrary angles', () => {
    const region = { x: 90, y: 40, width: 100, height: 140 };
    for (const rotation of [45, 90, 135, 270]) {
      const view = fitComponentsIntoRegion(region, [{ x: 400, y: 200, rotation }], {
        compW: 100,
        compH: 70,
        pad: 0,
      });
      if (!view) throw new Error('expected fit');
      const angle = (rotation * Math.PI) / 180;
      for (const x of [-50, 50])
        for (const y of [-35, 35]) {
          const px = view.pan.x + (400 + x * Math.cos(angle) - y * Math.sin(angle)) * view.zoom;
          const py = view.pan.y + (200 + x * Math.sin(angle) + y * Math.cos(angle)) * view.zoom;
          expect(px).toBeGreaterThanOrEqual(region.x - 0.001);
          expect(px).toBeLessThanOrEqual(region.x + region.width + 0.001);
          expect(py).toBeGreaterThanOrEqual(region.y - 0.001);
          expect(py).toBeLessThanOrEqual(region.y + region.height + 0.001);
        }
    }
  });
});
