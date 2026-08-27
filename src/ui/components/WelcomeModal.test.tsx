import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUiStore } from '../../store/uiStore';
import { WelcomeModal } from './WelcomeModal';

function resetWelcomeState() {
  act(() => {
    useUiStore.setState({ mobileSuitabilityOpen: false, welcomeOpen: false });
  });
}

beforeEach(() => {
  window.localStorage.clear();
  resetWelcomeState();
});

afterEach(() => {
  window.localStorage.clear();
  resetWelcomeState();
  vi.useRealTimers();
});

describe('WelcomeModal', () => {
  it('presents an accessible learning-first path into the editor', () => {
    useUiStore.setState({ welcomeOpen: true });
    render(<WelcomeModal />);

    expect(screen.getByRole('dialog', { name: 'Welcome to ElectraSim' })).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('heading', { name: /Start with a Guided Circuit/ })).toBeVisible();
    expect(screen.getByText(/learning model, not a substitute/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Open Guided Circuits' })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Continue to canvas' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('electrasim:welcomed')).toBe('1');
  });

  it('surfaces every workbench feature built to date', () => {
    useUiStore.setState({ welcomeOpen: true });
    render(<WelcomeModal />);

    // Quick-start steps
    expect(screen.getByRole('heading', { name: /Place and connect/ })).toBeVisible();
    expect(screen.getByRole('heading', { name: /Run and test/ })).toBeVisible();

    // Feature grid — one entry per major surface (name starts with the label).
    expect(screen.getByRole('button', { name: /^Guided Circuits/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Component Library/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Challenge Mode/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Diagnosis Lab/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Fault Lab/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /^Validation & Diagnostics/ })).toBeVisible();

    // Power-user strip: command palette + keyboard shortcuts
    expect(screen.getByRole('button', { name: /Command palette/ })).toBeVisible();
    expect(screen.getByRole('button', { name: /Keyboard shortcuts/ })).toBeVisible();
  });

  it('closes and opens Guided Circuits from the feature grid', () => {
    vi.useFakeTimers();
    useUiStore.setState({ welcomeOpen: true });
    render(<WelcomeModal />);

    fireEvent.click(screen.getByRole('button', { name: /^Guided Circuits/ }));
    expect(screen.queryByRole('dialog', { name: 'Welcome to ElectraSim' })).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(200));
    expect(useUiStore.getState().templatesOpen).toBe(true);
  });
});
