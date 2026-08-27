import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GUIDED_CIRCUIT_TEMPLATES } from '../../domain/templates';
import { useCircuitStore, useSettingsStore, useUiStore } from '../../store';
import { TemplatesModal } from './TemplatesModal';

function cardFor(title: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: title });
  const card = heading.closest('article');
  if (!card) throw new Error(`Missing guide card: ${title}`);
  return card;
}

function loadGuide(title: string): void {
  fireEvent.click(within(cardFor(title)).getByRole('button', { name: 'Load guide' }));
}

beforeEach(() => {
  window.localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  act(() => {
    useUiStore.setState({ activeGuideId: null });
    useSettingsStore.setState({ appMode: 'basic' });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  act(() => {
    useUiStore.setState({ activeGuideId: null });
    useSettingsStore.setState({ appMode: 'basic' });
  });
});

describe('TemplatesModal', () => {
  it('renders a windowed picker with an explicit close button', () => {
    const onClose = vi.fn();
    render(<TemplatesModal open onClose={onClose} />);

    expect(screen.getByRole('dialog', { name: 'Guided Circuits' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close guided circuits' })).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Close' }).length).toBeGreaterThan(0);

    // Both sections are visible.
    expect(screen.getByText('Getting started', { selector: 'h3' })).toBeVisible();
    expect(screen.getByText('Pro toolbox', { selector: 'h3' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Close guided circuits' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('filters guides by search text and by tier', () => {
    render(<TemplatesModal open onClose={() => undefined} />);

    const search = screen.getByPlaceholderText(/Search guides/);
    fireEvent.change(search, { target: { value: 'solar' } });

    // Only the solar guide card remains.
    expect(screen.getAllByRole('article')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: 'Solar PV with Battery Storage' })).toBeVisible();

    fireEvent.change(search, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pro' }));
    expect(screen.getAllByRole('article')).toHaveLength(
      GUIDED_CIRCUIT_TEMPLATES.filter((template) => template.tier === 'pro').length,
    );
    expect(screen.getByRole('heading', { name: 'Three-Phase DOL Motor Starter' })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Simple Protected Lamp' }),
    ).not.toBeInTheDocument();
  });

  it('loads a basic guide onto the canvas and opens its checklist', () => {
    render(<TemplatesModal open onClose={() => undefined} />);

    loadGuide('Simple Protected Lamp');

    expect(useUiStore.getState().activeGuideId).toBe('simple-lamp');
    expect(useCircuitStore.getState().components.some((c) => c.id.startsWith('simple-lamp-'))).toBe(
      true,
    );
    expect(useSettingsStore.getState().appMode).toBe('basic');
  });

  it('switches to Pro mode when loading a Pro guide in Student mode', () => {
    render(<TemplatesModal open onClose={() => undefined} />);

    loadGuide('EV Charger Dedicated Circuit');

    expect(useUiStore.getState().activeGuideId).toBe('pro-ev-charger-circuit');
    expect(useSettingsStore.getState().appMode).toBe('pro');
  });
});
