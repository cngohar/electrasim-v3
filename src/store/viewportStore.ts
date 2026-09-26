/**
 * viewportStore — pan, zoom, and live mouse position in canvas-space.
 *
 * Kept in its own slice so that high-frequency mouse-move events (60+ Hz on
 * a desktop) don't trigger re-renders in the toolbar/inspector/console.
 * Only the canvas subscribes to the mouse position.
 */

import { COMP_H, COMP_W, type Point2D } from '@electrasim/domain';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface ViewportState {
  pan: Point2D;
  zoom: number;
  mouse: Point2D;

  setPan: (p: Point2D) => void;
  panBy: (dx: number, dy: number) => void;
  setZoom: (z: number) => void;
  zoomBy: (factor: number, centre?: Point2D) => void;
  setMouse: (p: Point2D) => void;
  resetView: () => void;
  /**
   * Phase 6.8: Fit all components into view with padding.
   * `viewportSize` is the pixel size of the canvas container.
   * `components` is the array of component instances.
   */
  zoomToFit: (
    viewportSize: { width: number; height: number },
    components: ReadonlyArray<{ x: number; y: number }>,
  ) => void;
}

// Exported so callers that compute their own fit (see ui/canvas/fitRegion)
// clamp to exactly the same range as the store's own helpers.
export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 4;

export const useViewportStore = create<ViewportState>()(
  immer<ViewportState>((set) => ({
    pan: { x: 0, y: 0 },
    zoom: 1,
    mouse: { x: 0, y: 0 },

    setPan: (p) =>
      set((s) => {
        s.pan = p;
      }),
    panBy: (dx, dy) =>
      set((s) => {
        s.pan.x += dx;
        s.pan.y += dy;
      }),
    setZoom: (z) =>
      set((s) => {
        s.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
      }),
    zoomBy: (factor, centre) =>
      set((s) => {
        const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s.zoom * factor));
        if (centre) {
          // Keep `centre` stable in canvas-space when zooming.
          s.pan.x = centre.x - ((centre.x - s.pan.x) * next) / s.zoom;
          s.pan.y = centre.y - ((centre.y - s.pan.y) * next) / s.zoom;
        }
        s.zoom = next;
      }),
    setMouse: (p) =>
      set((s) => {
        s.mouse = p;
      }),
    resetView: () =>
      set((s) => {
        s.pan = { x: 0, y: 0 };
        s.zoom = 1;
      }),
    zoomToFit: (viewportSize, components) =>
      set((s) => {
        if (components.length === 0) {
          s.pan = { x: 0, y: 0 };
          s.zoom = 1;
          return;
        }
        const PAD = 60;
        const halfW = COMP_W / 2;
        const halfH = COMP_H / 2;
        let minX = Number.POSITIVE_INFINITY;
        let minY = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        for (const c of components) {
          minX = Math.min(minX, c.x - halfW);
          minY = Math.min(minY, c.y - halfH);
          maxX = Math.max(maxX, c.x + halfW);
          maxY = Math.max(maxY, c.y + halfH);
        }
        const bw = maxX - minX + PAD * 2;
        const bh = maxY - minY + PAD * 2;
        const zx = viewportSize.width / bw;
        const zy = viewportSize.height / bh;
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min(zx, zy)));
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        s.zoom = zoom;
        s.pan = {
          x: viewportSize.width / 2 - cx * zoom,
          y: viewportSize.height / 2 - cy * zoom,
        };
      }),
  })),
);
