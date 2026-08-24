/**
 * TourOverlay integration tests (jsdom) — mounts the real overlay against
 * synthetic DOM anchors and drives it through look-steps, a do-step that
 * advances from genuine store changes, auto-skip of satisfied steps, and
 * Esc dismissal.
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCircuitStore } from '../../store/circuitStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useUiStore } from '../../store/uiStore';
import { TourOverlay } from './TourOverlay';

const ANCHORS = [
  'data-tour="mode-toggle"',
  'data-standard-selector',
  'data-tour="open-palette"',
  'data-palette-type="bulb"',
  'data-palette-type="live-terminal"',
  'data-circuit-canvas',
  'data-tour="run"',
  'data-tour="guided-circuits"',
];

let anchorHost: HTMLDivElement;

beforeEach(() => {
  window.localStorage.clear();
  anchorHost = document.createElement('div');
  anchorHost.innerHTML = ANCHORS.map((a) => `<button ${a}>x</button>`).join('');
  document.body.appendChild(anchorHost);
  act(() => {
    useUiStore.setState({ tourId: 'student', tourStep: 0, paletteOpen: false });
  });
});

afterEach(() => {
  anchorHost.remove();
  act(() => {
    useUiStore.setState({ tourId: null, tourStep: 0 });
  });
});

describe('TourOverlay', () => {
  it('renders the first step and walks look-steps with Next', async () => {
    render(<TourOverlay isPhone={false} />);

    expect(
      screen.getByRole('dialog', { name: /step 1 of .*Welcome to the interactive tour/i }),
    ).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() => expect(screen.getByRole('dialog', { name: /Student mode/ })).toBeVisible());

    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /region’s electrical rules/ })).toBeVisible(),
    );
  });

  it('advances a do-step only when the real store state changes', async () => {
    // Jump straight to the open-palette do-step.
    act(() => {
      useUiStore.setState({ tourStep: 3, paletteOpen: false });
    });
    render(<TourOverlay isPhone={false} />);

    await waitFor(() =>
      expect(screen.getByRole('dialog', { name: /Open the component palette/ })).toBeVisible(),
    );
    // No Next button while waiting on a do-step.
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

    // The user performs the real action.
    act(() => {
      useUiStore.setState({ paletteOpen: true });
    });

    await waitFor(
      () => expect(screen.getByRole('dialog', { name: /Place a bulb/ })).toBeVisible(),
      { timeout: 2500 },
    );
  });

  it('skips an already-satisfied do-step immediately', async () => {
    act(() => {
      useUiStore.setState({ tourStep: 3, paletteOpen: true });
    });
    render(<TourOverlay isPhone={false} />);

    await waitFor(() => expect(screen.getByRole('dialog', { name: /Place a bulb/ })).toBeVisible());
  });

  it('ends without marking done on Esc', async () => {
    render(<TourOverlay isPhone={false} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(useUiStore.getState().tourId).toBeNull());
    expect(window.localStorage.getItem('electrasim:tour:student:v1:done')).toBeNull();
  });

  it('celebrates and marks done after the final step', async () => {
    const { getTourSteps } = await import('./steps');
    const lastIndex = getTourSteps('student').length - 1; // student-finish
    act(() => {
      useUiStore.setState({ tourStep: lastIndex });
    });
    render(<TourOverlay isPhone={false} />);

    await waitFor(() => expect(screen.getByRole('dialog', { name: /core loop/ })).toBeVisible());
    fireEvent.click(screen.getByRole('button', { name: /Finish/ }));

    // Celebration screen appears, completion is persisted, tour still mounted.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Tour complete/i })).toBeVisible(),
    );
    expect(window.localStorage.getItem('electrasim:tour:student:v1:done')).toBe('1');
    expect(useUiStore.getState().tourId).toBe('student');

    fireEvent.click(screen.getByRole('button', { name: /Back to the bench/ }));
    await waitFor(() => expect(useUiStore.getState().tourId).toBeNull());
  });
});

describe('startTour canvas behaviour', () => {
  it('clears the canvas for the student tour (undoably) but not for pro', () => {
    // Seed some circuit content.
    act(() => {
      useUiStore.setState({ simRunning: false });
      useCircuitStore.setState({
        components: [
          { id: 'c1', type: 'bulb', x: 0, y: 0, rotation: 0, state: {} },
          { id: 'c2', type: 'bulb', x: 60, y: 0, rotation: 0, state: {} },
        ] as never,
        wires: [{ id: 'w1' }] as never,
      });
    });

    // Pro tour keeps an existing circuit untouched.
    act(() => useUiStore.getState().startTour('pro'));
    expect(useCircuitStore.getState().components.length).toBe(2);
    act(() => useUiStore.getState().endTour());

    // Student tour starts from an empty canvas.
    act(() => useUiStore.getState().startTour('student'));
    expect(useCircuitStore.getState().components.length).toBe(0);
    expect(useCircuitStore.getState().wires.length).toBe(0);
    expect(useSettingsStore.getState().appMode).toBeDefined(); // stores intact
    act(() => useUiStore.getState().endTour());
  });

  it('seeds the demo circuit for the pro tour when the canvas is empty', () => {
    act(() => {
      useUiStore.setState({ simRunning: false });
      useCircuitStore.setState({ components: [] as never, wires: [] as never });
    });

    act(() => useUiStore.getState().startTour('pro'));
    // Validate / diagnostics / Fault Lab need a real circuit to work on.
    expect(useCircuitStore.getState().components.length).toBeGreaterThan(3);
    expect(useCircuitStore.getState().wires.length).toBeGreaterThan(3);
    act(() => useUiStore.getState().endTour());
  });
});
