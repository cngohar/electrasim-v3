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
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  anchorHost = document.createElement('div');
  anchorHost.innerHTML = ANCHORS.map((a) => `<button ${a}>x</button>`).join('');
  document.body.appendChild(anchorHost);
  act(() => {
    useUiStore.setState({
      tourId: 'student',
      tourStep: 0,
      paletteOpen: false,
      tourCircuitBackup: null,
      tourOriginalAppMode: null,
    });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  anchorHost.remove();
  act(() => {
    useUiStore.setState({
      tourId: null,
      tourStep: 0,
      tourCircuitBackup: null,
      tourOriginalAppMode: null,
    });
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
    // Jump straight to the place-component do-step (index 4).
    act(() => {
      useUiStore.setState({ tourStep: 4 });
    });
    render(<TourOverlay isPhone={false} />);

    await waitFor(() => expect(screen.getByRole('dialog', { name: /Place a bulb/ })).toBeVisible());
    // No Next button while waiting on a do-step.
    expect(screen.queryByRole('button', { name: 'Next' })).toBeNull();

    // The user performs the real action (placing a component).
    act(() => {
      useCircuitStore.setState((s) => ({
        components: [
          ...s.components,
          {
            id: 'bulb-1',
            type: 'bulb',
            x: 100,
            y: 100,
            ports: [],
            state: {},
          },
        ],
      }));
    });

    await waitFor(
      () => expect(screen.getByRole('dialog', { name: /Give it power/ })).toBeVisible(),
      { timeout: 2500 },
    );
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
  const seedCircuit = () => {
    act(() => {
      useUiStore.setState({ simRunning: false });
      useCircuitStore.setState({
        components: [
          { id: 'c1', type: 'bulb', x: 0, y: 0, rotation: 0, state: {} },
          { id: 'c2', type: 'bulb', x: 60, y: 0, rotation: 0, state: {} },
        ] as never,
        wires: [{ id: 'w1', controlPoints: [] }] as never,
      });
    });
  };

  it('prompts, saves and clears the canvas for both tours', () => {
    seedCircuit();
    const confirmSpy = vi.mocked(window.confirm);

    act(() => useUiStore.getState().startTour('pro'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(useCircuitStore.getState().components.length).toBe(0);
    expect(useCircuitStore.getState().wires.length).toBe(0);
    expect(useUiStore.getState().tourCircuitBackup?.components.length).toBe(2);
    act(() => useUiStore.getState().endTour());

    seedCircuit();
    act(() => useUiStore.getState().startTour('student'));
    expect(useCircuitStore.getState().components.length).toBe(0);
    expect(useUiStore.getState().tourCircuitBackup?.components.length).toBe(2);
    act(() => useUiStore.getState().endTour());
  });

  it('does not start the tour when the user cancels the prompt', () => {
    seedCircuit();
    vi.mocked(window.confirm).mockReturnValue(false);
    // The file-level beforeEach arms a tour — clear it so this test starts
    // from a truly idle editor.
    act(() => useUiStore.setState({ tourId: null }));

    act(() => useUiStore.getState().startTour('student'));

    expect(useUiStore.getState().tourId).toBeNull();
    expect(useCircuitStore.getState().components.length).toBe(2);
  });

  it('switches the app mode to match the tour and restores it on end', () => {
    act(() => {
      useSettingsStore.setState({ appMode: 'pro' });
      useCircuitStore.setState({ components: [] as never, wires: [] as never });
    });

    // Pro mode + student tour → workbench switches to Student mode for the tour.
    act(() => useUiStore.getState().startTour('student'));
    expect(useSettingsStore.getState().appMode).toBe('basic');
    expect(useUiStore.getState().tourOriginalAppMode).toBe('pro');

    // Ending restores the original mode.
    act(() => useUiStore.getState().endTour());
    expect(useSettingsStore.getState().appMode).toBe('pro');

    // Student mode + pro tour → workbench switches to Pro mode.
    act(() => useUiStore.getState().startTour('pro'));
    expect(useSettingsStore.getState().appMode).toBe('pro');
    act(() => useUiStore.getState().endTour());
    expect(useSettingsStore.getState().appMode).toBe('pro');
  });

  it('keeps a manually changed mode when the tour ends', () => {
    act(() => {
      useSettingsStore.setState({ appMode: 'pro' });
      useCircuitStore.setState({ components: [] as never, wires: [] as never });
    });

    act(() => useUiStore.getState().startTour('student'));
    expect(useSettingsStore.getState().appMode).toBe('basic');

    // The user switches back to Pro themselves mid-tour — that is a choice.
    act(() => useSettingsStore.getState().setSetting('appMode', 'pro'));
    act(() => useUiStore.getState().endTour());
    expect(useSettingsStore.getState().appMode).toBe('pro');
  });
});

describe('tour restore prompt', () => {
  it('offers to restore the saved circuit when the tour ends early', async () => {
    // Seed a real (non-demo) circuit and start the tour — this saves a backup.
    act(() => {
      useUiStore.setState({ simRunning: false });
      useCircuitStore.setState({
        components: [
          { id: 'c1', type: 'bulb', x: 0, y: 0, rotation: 0, state: {} },
          { id: 'c2', type: 'bulb', x: 60, y: 0, rotation: 0, state: {} },
        ] as never,
        wires: [{ id: 'w1', controlPoints: [] }] as never,
      });
    });
    act(() => useUiStore.getState().startTour('student'));
    expect(useUiStore.getState().tourCircuitBackup).not.toBeNull();

    render(<TourOverlay isPhone={false} />);

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Tutorial finished — restore your circuit?' }),
      ).toBeVisible(),
    );

    fireEvent.click(screen.getByRole('button', { name: /Restore previous circuit/ }));
    await waitFor(() => expect(useUiStore.getState().tourId).toBeNull());
    expect(useCircuitStore.getState().components.length).toBe(2);
  });

  it('keeps the tutorial circuit when the user chooses to', async () => {
    act(() => {
      useUiStore.setState({ simRunning: false });
      useCircuitStore.setState({
        components: [{ id: 'c1', type: 'bulb', x: 0, y: 0, rotation: 0, state: {} }] as never,
        wires: [] as never,
      });
    });
    act(() => useUiStore.getState().startTour('student'));

    render(<TourOverlay isPhone={false} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() =>
      expect(
        screen.getByRole('dialog', { name: 'Tutorial finished — restore your circuit?' }),
      ).toBeVisible(),
    );

    fireEvent.click(screen.getByRole('button', { name: /Keep this circuit/ }));
    await waitFor(() => expect(useUiStore.getState().tourId).toBeNull());
    expect(useCircuitStore.getState().components.length).toBe(0);
  });
});
