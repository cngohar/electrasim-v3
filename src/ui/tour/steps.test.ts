/**
 * Interactive tutorial — unit tests for step scripts, predicates, placement
 * geometry, persistence helpers, and the uiStore tour actions.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '../../store/uiStore';
import { placeCard } from './placement';
import { TOURS, type TourSnapshot, getTourSteps } from './steps';
import {
  TOUR_DONE_KEY,
  dismissTourOffer,
  isTourDone,
  isTourOfferDismissed,
  markTourDone,
} from './storage';

function snap(overrides: Partial<TourSnapshot> = {}): TourSnapshot {
  return {
    appMode: 'basic',
    regulationStandard: 'uk',
    plugSystem: 'bs1363',
    diagnosticOverlayMode: 'off',
    paletteOpen: false,
    faultLabOpen: false,
    templatesOpen: false,
    simRunning: false,
    componentCount: 4,
    wireCount: 3,
    validationReport: null,
    standardPopoverOpen: false,
    placingType: null,
    ...overrides,
  };
}

const byId = (tour: 'student' | 'pro', id: string) => {
  const step = getTourSteps(tour).find((s) => s.id === id);
  if (!step) throw new Error(`missing step ${tour}/${id}`);
  return step;
};

describe('tour step scripts', () => {
  it('both tours are well-formed', () => {
    for (const [tourId, tour] of Object.entries(TOURS)) {
      const ids = tour.steps.map((s) => s.id);
      expect(new Set(ids).size, `${tourId} ids unique`).toBe(ids.length);
      expect(tour.steps.length).toBeGreaterThanOrEqual(8);
      // Every do-step must know how to advance; look-steps must not.
      for (const step of tour.steps) {
        if (step.kind === 'do') {
          expect(step.advanceWhen, `${tourId}/${step.id} advanceWhen`).toBeTypeOf('function');
          expect(step.action, `${tourId}/${step.id} action hint`).toBeTruthy();
        } else {
          expect(step.advanceWhen).toBeUndefined();
        }
        if (step.target !== null) expect(step.target.length).toBeGreaterThan(0);
      }
      // Every tour closes with a centred recap card. (The Student tour also
      // opens with one; the Pro tour deliberately opens with an action.)
      expect(tour.steps[tour.steps.length - 1].kind).toBe('look');
      expect(tour.steps[tour.steps.length - 1].target).toBeNull();
    }
  });

  it('student: palette step introduces the component palette without skipping', () => {
    const step = byId('student', 'open-palette');
    expect(step.kind).toBe('look');
    expect(step.skipIf).toBeUndefined();
    expect(step.targetWhen?.(snap({ paletteOpen: true }))).toBe('[data-tour="palette"]');
    expect(step.targetWhen?.(snap({ paletteOpen: false }))).toBe('[data-tour="open-palette"]');
  });

  it('student: placement/wiring/run steps advance on real state changes only', () => {
    const entry = snap();
    expect(
      byId('student', 'place-component').advanceWhen?.(snap({ componentCount: 5 }), entry),
    ).toBe(true);
    expect(byId('student', 'place-component').advanceWhen?.(snap(), entry)).toBe(false);
    // Wiring step needs BOTH the feed and the return wire (entry + 2).
    expect(byId('student', 'wire-ports').advanceWhen?.(snap({ wireCount: 5 }), entry)).toBe(true);
    expect(byId('student', 'wire-ports').advanceWhen?.(snap({ wireCount: 4 }), entry)).toBe(false);
    // Supply step needs both terminals placed.
    expect(byId('student', 'add-supply').advanceWhen?.(snap({ componentCount: 6 }), entry)).toBe(
      true,
    );
    expect(byId('student', 'add-supply').advanceWhen?.(snap({ componentCount: 5 }), entry)).toBe(
      false,
    );
    expect(byId('student', 'run-sim').advanceWhen?.(snap({ simRunning: true }), entry)).toBe(true);
  });

  it('pro: opens in Pro mode and waits for a practice circuit to be loaded', () => {
    // The tour now switches to Pro mode itself; the opening step explains it.
    const modeStep = byId('pro', 'pro-mode-active');
    expect(modeStep.kind).toBe('look');
    expect(modeStep.advanceWhen).toBeUndefined();

    // The canvas starts empty, so the second step asks for a practice circuit.
    const loadStep = byId('pro', 'load-practice-circuit');
    expect(loadStep.kind).toBe('do');
    const entry = snap();
    expect(loadStep.advanceWhen?.(snap({ componentCount: 8 }), entry)).toBe(true);
    expect(loadStep.advanceWhen?.(snap({ componentCount: 7 }), entry)).toBe(false);
  });

  it('student: the spotlight moves to the canvas once a palette tile is selected', () => {
    // Fixes the "canvas stays dark after selecting the Live terminal" bug —
    // once a tile is armed for placement the spotlight follows to the canvas.
    expect(byId('student', 'place-component').targetWhen?.(snap({ placingType: 'bulb' }))).toBe(
      '[data-circuit-canvas]',
    );
    expect(byId('student', 'place-component').targetWhen?.(snap())).toBeNull();

    expect(byId('student', 'add-supply').targetWhen?.(snap({ placingType: 'live-terminal' }))).toBe(
      '[data-circuit-canvas]',
    );
    expect(
      byId('student', 'add-supply').targetWhen?.(snap({ placingType: 'neutral-terminal' })),
    ).toBe('[data-circuit-canvas]');
    expect(byId('student', 'add-supply').targetWhen?.(snap({ placingType: 'bulb' }))).toBeNull();
  });

  it('pro: regional step advances on standard change, plug change, or popover close', () => {
    const step = byId('pro', 'pick-standard');
    const entry = snap({ standardPopoverOpen: true });
    expect(
      step.advanceWhen?.(snap({ regulationStandard: 'us', standardPopoverOpen: true }), entry),
    ).toBe(true);
    expect(
      step.advanceWhen?.(snap({ plugSystem: 'schuko', standardPopoverOpen: true }), entry),
    ).toBe(true);
    // Re-selecting the current standard closes the popover — still counts.
    expect(step.advanceWhen?.(snap({ standardPopoverOpen: false }), entry)).toBe(true);
    expect(step.advanceWhen?.(snap({ standardPopoverOpen: true }), entry)).toBe(false);
  });

  it('pro: validation and diagnostics steps track their stores', () => {
    const entry = snap({ validationReport: null });
    const report = { issues: [] };
    expect(byId('pro', 'validate').advanceWhen?.(snap({ validationReport: report }), entry)).toBe(
      true,
    );
    expect(byId('pro', 'validate').advanceWhen?.(snap({ validationReport: null }), entry)).toBe(
      false,
    );
    expect(
      byId('pro', 'diagnostics').advanceWhen?.(snap({ diagnosticOverlayMode: 'heat' }), snap()),
    ).toBe(true);
    expect(byId('pro', 'fault-lab').advanceWhen?.(snap({ faultLabOpen: true }), snap())).toBe(true);
  });
});

describe('card placement', () => {
  const viewport = { width: 1280, height: 800 };
  const card = { width: 320, height: 180 };

  it('prefers below the target when there is room', () => {
    const p = placeCard({ top: 60, left: 500, width: 120, height: 32 }, card, viewport);
    expect(p.side).toBe('bottom');
    expect(p.top).toBeGreaterThan(92);
  });

  it('flips above when the target hugs the bottom edge', () => {
    const p = placeCard({ top: 740, left: 500, width: 120, height: 40 }, card, viewport);
    expect(p.side).toBe('top');
    expect(p.top + card.height).toBeLessThanOrEqual(740);
  });

  it('always stays fully inside the viewport', () => {
    for (const rect of [
      { top: 0, left: 0, width: 40, height: 40 },
      { top: 760, left: 1240, width: 40, height: 40 },
      { top: 400, left: 640, width: 10, height: 10 },
    ]) {
      const p = placeCard(rect, card, viewport);
      expect(p.left).toBeGreaterThanOrEqual(0);
      expect(p.top).toBeGreaterThanOrEqual(0);
      expect(p.left + card.width).toBeLessThanOrEqual(viewport.width);
      expect(p.top + card.height).toBeLessThanOrEqual(viewport.height);
    }
  });
});

describe('tour persistence', () => {
  beforeEach(() => window.localStorage.clear());

  it('round-trips completion and offer dismissal', () => {
    expect(isTourDone('student')).toBe(false);
    markTourDone('student');
    expect(isTourDone('student')).toBe(true);
    expect(window.localStorage.getItem(TOUR_DONE_KEY('student'))).toBe('1');
    expect(isTourDone('pro')).toBe(false);

    expect(isTourOfferDismissed()).toBe(false);
    dismissTourOffer();
    expect(isTourOfferDismissed()).toBe(true);
  });
});

describe('uiStore tour actions', () => {
  it('startTour closes first-run dialogs and endTour resets', () => {
    useUiStore.setState({ welcomeOpen: true, commandPaletteOpen: true });
    useUiStore.getState().startTour('pro');
    const s = useUiStore.getState();
    expect(s.tourId).toBe('pro');
    expect(s.tourStep).toBe(0);
    expect(s.welcomeOpen).toBe(false);
    expect(s.commandPaletteOpen).toBe(false);

    useUiStore.getState().setTourStep(3);
    expect(useUiStore.getState().tourStep).toBe(3);

    useUiStore.getState().endTour();
    expect(useUiStore.getState().tourId).toBeNull();
    expect(useUiStore.getState().tourStep).toBe(0);
  });
});
