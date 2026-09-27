import { COMP_H, COMP_W } from '@electrasim/domain';
import { useCircuitStore, useViewportStore } from '../../store';
import { MAX_ZOOM, MIN_ZOOM } from '../../store/viewportStore';
import { fitCircuitIntoVisibleRegion } from './fitRegion';

/** One fit action for keyboard, command palette, desktop and phone controls. */
export function fitCanvasView(): void {
  fitCircuitIntoVisibleRegion({
    components: useCircuitStore.getState().components,
    compW: COMP_W,
    compH: COMP_H,
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    occluderSelectors: [
      '[data-canvas-occluder]',
      '[data-tour="palette"]',
      '[data-tour="inspector"]',
    ],
    applyView: (view) => useViewportStore.setState(view),
  });
}
