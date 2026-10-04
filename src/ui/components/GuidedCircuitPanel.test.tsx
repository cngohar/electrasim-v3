import { simulate } from '@electrasim/domain/simulation';
import { cloneTemplateCircuit, getGuidedCircuitTemplate } from '@electrasim/domain/templates';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCircuitStore, useUiStore } from '../../store';
import { GuidedCircuitPanel } from './GuidedCircuitPanel';

function resetStores() {
  act(() => {
    useUiStore.setState({
      activeGuideId: null,
      guideHidden: false,
      simRunning: false,
      simResult: null,
      templatesOpen: false,
      inspectorCollapsed: true,
    });
    useCircuitStore.setState({ selectedComponentId: null });
  });
}

beforeEach(() => {
  window.localStorage.clear();
  resetStores();
});

afterEach(() => {
  window.localStorage.clear();
  resetStores();
});

describe('GuidedCircuitPanel', () => {
  it('presents a guide checklist, not a challenge', () => {
    act(() => {
      const template = getGuidedCircuitTemplate('simple-lamp')!;
      useCircuitStore.getState().setCircuit(cloneTemplateCircuit(template));
      useUiStore.getState().setActiveGuideId('simple-lamp');
    });
    render(<GuidedCircuitPanel isPhone={false} />);

    expect(screen.getByRole('heading', { name: 'Simple Protected Lamp' })).toBeVisible();
    expect(screen.getByText('Checklist')).toBeVisible();
    expect(screen.getByText(/steps/)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Next guide' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'End guide' })).toBeVisible();

    // No challenge framing remains.
    expect(screen.queryByText(/challenge/i)).not.toBeInTheDocument();
  });

  it('keeps unassessed operating checks open without challenge language', () => {
    act(() => {
      const template = getGuidedCircuitTemplate('simple-lamp')!;
      useCircuitStore.getState().setCircuit(cloneTemplateCircuit(template));
      useUiStore.getState().setActiveGuideId('simple-lamp');
      useUiStore.setState({ simResult: simulate(cloneTemplateCircuit(template)) });
    });
    render(<GuidedCircuitPanel isPhone={false} />);

    expect(screen.queryByText('Guide complete')).not.toBeInTheDocument();
    expect(screen.getByText(/Review the findings in the inspector/)).toBeVisible();
    expect(screen.queryByText(/challenge/i)).not.toBeInTheDocument();
  });

  it('ends the guide but keeps the circuit on the canvas', () => {
    act(() => {
      const template = getGuidedCircuitTemplate('simple-lamp')!;
      useCircuitStore.getState().setCircuit(cloneTemplateCircuit(template));
      useUiStore.getState().setActiveGuideId('simple-lamp');
    });
    render(<GuidedCircuitPanel isPhone={false} />);

    const componentCount = useCircuitStore.getState().components.length;
    fireEvent.click(screen.getByRole('button', { name: 'End guide' }));

    expect(useUiStore.getState().activeGuideId).toBeNull();
    expect(useCircuitStore.getState().components.length).toBe(componentCount);
  });

  it('opens the guide window from "Next guide"', () => {
    act(() => {
      const template = getGuidedCircuitTemplate('simple-lamp')!;
      useCircuitStore.getState().setCircuit(cloneTemplateCircuit(template));
      useUiStore.getState().setActiveGuideId('simple-lamp');
    });
    render(<GuidedCircuitPanel isPhone={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'Next guide' }));
    expect(useUiStore.getState().templatesOpen).toBe(true);
  });

  it('shows a floating pill when the guide is hidden', () => {
    act(() => {
      const template = getGuidedCircuitTemplate('simple-lamp')!;
      useCircuitStore.getState().setCircuit(cloneTemplateCircuit(template));
      useUiStore.getState().setActiveGuideId('simple-lamp');
      useUiStore.setState({ guideHidden: true });
    });
    render(<GuidedCircuitPanel isPhone={false} />);

    const pill = screen.getByRole('button', { name: 'Show guide steps' });
    expect(pill).toBeVisible();
    fireEvent.click(pill);
    expect(useUiStore.getState().guideHidden).toBe(false);
  });
});
