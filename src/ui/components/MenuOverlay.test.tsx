import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore, useUiStore } from '../../store';
import { MenuOverlay } from './MenuOverlay';

function resetStores() {
  act(() => {
    useUiStore.setState({
      menuOpen: false,
      diagnosisOpen: false,
      templatesOpen: false,
      shortcutsOpen: false,
      commandPaletteOpen: false,
      importExportOpen: false,
      docsOpen: false,
      settingsOpen: false,
      contactOpen: false,
    });
    useSettingsStore.setState({ appMode: 'basic' });
  });
}

beforeEach(() => resetStores());
afterEach(() => resetStores());

describe('MenuOverlay', () => {
  it('presents the command hub: feature tiles, utility tiles and footer', () => {
    const onClose = vi.fn();
    render(<MenuOverlay open onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'ElectraSim menu' });
    expect(dialog).toBeVisible();

    // Learn & practice tiles.
    expect(screen.getByRole('button', { name: /^Guided Circuits/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Challenge Mode/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Diagnosis Lab/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Interactive Tutorial/ })).toBeVisible();

    // Tools & info tiles — accessible names match the legacy e2e selectors.
    expect(
      screen.getByRole('button', { name: 'Settings Preferences & display options' }),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: /^Documentation/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Contact/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^About ElectraSim/ })).toBeVisible();

    // Footer — version and command palette chip.
    expect(screen.getByText(/Local-first simulator/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Command palette/ })).toBeVisible();
  });

  it('contains no canvas/wiring actions — those live on the context menu', () => {
    render(<MenuOverlay open onClose={() => undefined} />);

    const text = screen.getByRole('dialog', { name: 'ElectraSim menu' }).textContent ?? '';
    expect(text).not.toMatch(/clear all wires/i);
    expect(text).not.toMatch(/clear all components/i);
    expect(text).not.toMatch(/reset to default circuit/i);
    expect(text).not.toMatch(/wire mode/i);
  });

  it('runs a tile action and closes the menu', () => {
    const onClose = vi.fn();
    render(<MenuOverlay open onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: /^Diagnosis Lab/ }));

    expect(useUiStore.getState().diagnosisOpen).toBe(true);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('opens the shortcuts overlay from the Keyboard Shortcuts tile', () => {
    render(<MenuOverlay open onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /^Keyboard Shortcuts/ }));

    expect(useUiStore.getState().shortcutsOpen).toBe(true);
  });

  it('opens the command palette from the footer chip', () => {
    render(<MenuOverlay open onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /Command palette/ }));

    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
  });

  it('opens Guided Circuits, Challenge Mode, docs and settings from their tiles', () => {
    render(<MenuOverlay open onClose={() => undefined} />);

    fireEvent.click(screen.getByRole('button', { name: /^Guided Circuits/ }));
    expect(useUiStore.getState().templatesOpen).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /^Challenge Mode/ }));
    expect(useUiStore.getState().challengeOpen).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /^Documentation/ }));
    expect(useUiStore.getState().docsOpen).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Settings Preferences & display options' }));
    expect(useUiStore.getState().settingsOpen).toBe(true);
  });
});
