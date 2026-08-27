import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getGuidedCircuitTemplate } from '../domain/templates';
import { useCircuitStore, useSettingsStore, useUiStore } from '../store';
import { loadGuidedCircuitIntoEditor } from './guidedCircuitLoader';

function resetStores() {
  act(() => {
    useUiStore.setState({
      activeGuideId: null,
      simRunning: true,
      simResult: { errors: [], warnings: [] } as never,
      placingType: 'bulb',
    });
    useSettingsStore.setState({ appMode: 'basic' });
  });
}

beforeEach(() => {
  resetStores();
  // The editor starts with the seeded demo circuit, so every load asks for
  // confirmation — accept by default; individual tests override.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadGuidedCircuitIntoEditor', () => {
  it('installs the guide circuit and resets transient editor state', () => {
    const template = getGuidedCircuitTemplate('simple-lamp')!;
    loadGuidedCircuitIntoEditor(template);

    const circuit = useCircuitStore.getState();
    expect(circuit.components.some((c) => c.id.startsWith('simple-lamp-'))).toBe(true);
    expect(useUiStore.getState().activeGuideId).toBe('simple-lamp');
    expect(useUiStore.getState().simRunning).toBe(false);
    expect(useUiStore.getState().simResult).toBeNull();
    expect(useUiStore.getState().placingType).toBeNull();
  });

  it('asks for confirmation before replacing a non-empty canvas and aborts on cancel', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const template = getGuidedCircuitTemplate('simple-lamp')!;

    const before = useCircuitStore.getState().components;
    loadGuidedCircuitIntoEditor(template);

    expect(confirm).toHaveBeenCalledOnce();
    expect(useCircuitStore.getState().components).toBe(before);
    expect(useUiStore.getState().activeGuideId).toBeNull();
  });

  it('replaces the canvas when the user confirms', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const template = getGuidedCircuitTemplate('simple-lamp')!;

    loadGuidedCircuitIntoEditor(template);

    expect(useCircuitStore.getState().components.some((c) => c.id.startsWith('simple-lamp-'))).toBe(
      true,
    );
  });

  it('promotes the workbench to Pro mode when loading a Pro guide', () => {
    const template = getGuidedCircuitTemplate('pro-ev-charger-circuit')!;
    loadGuidedCircuitIntoEditor(template);

    expect(useUiStore.getState().activeGuideId).toBe('pro-ev-charger-circuit');
    expect(useSettingsStore.getState().appMode).toBe('pro');
  });
});
