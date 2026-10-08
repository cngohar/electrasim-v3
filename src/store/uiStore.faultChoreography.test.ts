/**
 * Fault Lab choreography tests (uiStore).
 *
 *  - `beginFaultInjection` arms the canvas pre-commit animation, then
 *    commits the fault after the kind's lead time;
 *  - rapid re-injections supersede — only the latest commits;
 *  - `clearPendingFaultFx` cancels a pending commit;
 *  - `prefers-reduced-motion` skips the animation lead time entirely;
 *  - Opening/closing fault mode snaps the Inspector onto the Fault Lab tab
 *    and back (the floating-window era is over).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCircuitStore } from './circuitStore';
import { FAULT_ARM_MS, useUiStore } from './uiStore';

function firstLoadId(): string {
  const bulb = useCircuitStore.getState().components.find((c) => c.type === 'bulb-incandescent');
  if (!bulb) throw new Error('seed circuit must contain a bulb');
  return bulb.id;
}

describe('uiStore — fault injection choreography', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUiStore.setState({
      faultLabOpen: false,
      pendingFaultFx: null,
      inspectorCollapsed: true,
      activeInspectorTab: 'properties',
    });
    useCircuitStore.getState().clearAllFaults();
  });

  afterEach(() => {
    useUiStore.getState().clearPendingFaultFx();
    useCircuitStore.getState().clearAllFaults();
    vi.useRealTimers();
  });

  it('arms the pending animation first, then commits after the lead time', () => {
    const id = firstLoadId();
    const arm = FAULT_ARM_MS['short-circuit'] ?? 0;
    expect(arm).toBeGreaterThan(0);

    useUiStore.getState().beginFaultInjection('short-circuit', { componentId: id });

    // Fault visible on canvas immediately as an arming effect …
    expect(useUiStore.getState().pendingFaultFx).toMatchObject({
      target: { componentId: id },
      type: 'short-circuit',
    });
    // … but the model is not faulted yet (sparks FIRST, then the short).
    expect(
      useCircuitStore.getState().components.find((c) => c.id === id)?.state.fault,
    ).toBeUndefined();

    vi.advanceTimersByTime(arm - 1);
    expect(
      useCircuitStore.getState().components.find((c) => c.id === id)?.state.fault,
    ).toBeUndefined();

    vi.advanceTimersByTime(1);
    expect(useCircuitStore.getState().components.find((c) => c.id === id)?.state.fault).toBe(
      'short-circuit',
    );
    expect(useUiStore.getState().pendingFaultFx).toBeNull();
  });

  it('supersedes a pending injection — only the latest fault lands', () => {
    const id = firstLoadId();
    useUiStore.getState().beginFaultInjection('open-circuit', { componentId: id });
    const firstNonce = useUiStore.getState().pendingFaultFx?.nonce;

    useUiStore.getState().beginFaultInjection('short-circuit', { componentId: id });
    const secondNonce = useUiStore.getState().pendingFaultFx?.nonce;
    expect(secondNonce).not.toBe(firstNonce);

    vi.advanceTimersByTime(10_000);
    expect(useCircuitStore.getState().components.find((c) => c.id === id)?.state.fault).toBe(
      'short-circuit',
    );
  });

  it('supports wire targets with the same choreography', () => {
    const wire = useCircuitStore.getState().wires[0];
    if (!wire) throw new Error('seed circuit must contain wires');

    useUiStore.getState().beginFaultInjection('short-circuit', { wireId: wire.id });
    expect(useUiStore.getState().pendingFaultFx).toMatchObject({
      target: { wireId: wire.id },
      type: 'short-circuit',
    });
    expect(useCircuitStore.getState().wires.find((w) => w.id === wire.id)?.fault).toBeUndefined();

    vi.advanceTimersByTime((FAULT_ARM_MS['short-circuit'] ?? 0) + 10);
    expect(useCircuitStore.getState().wires.find((w) => w.id === wire.id)?.fault).toBe(
      'short-circuit',
    );
  });

  it('rejects non-conductor fault kinds on wire targets', () => {
    const wire = useCircuitStore.getState().wires[0];
    if (!wire) throw new Error('seed circuit must contain wires');

    useUiStore.getState().beginFaultInjection('arc-fault', { wireId: wire.id });
    expect(useUiStore.getState().pendingFaultFx).toBeNull();
    vi.advanceTimersByTime(10_000);
    expect(useCircuitStore.getState().wires.find((w) => w.id === wire.id)?.fault).toBeUndefined();
  });

  it('clearPendingFaultFx cancels the commit', () => {
    const id = firstLoadId();
    useUiStore.getState().beginFaultInjection('earth-fault', { componentId: id });
    useUiStore.getState().clearPendingFaultFx();

    vi.advanceTimersByTime(10_000);
    expect(
      useCircuitStore.getState().components.find((c) => c.id === id)?.state.fault,
    ).toBeUndefined();
  });

  it('commits instantly under prefers-reduced-motion', () => {
    const original = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
    try {
      const id = firstLoadId();
      useUiStore.getState().beginFaultInjection('open-circuit', { componentId: id });

      // No arming window at all: committed synchronously, nothing pending.
      expect(useUiStore.getState().pendingFaultFx).toBeNull();
      expect(useCircuitStore.getState().components.find((c) => c.id === id)?.state.fault).toBe(
        'open-circuit',
      );
    } finally {
      window.matchMedia = original;
    }
  });
});

describe('uiStore — fault mode owns an Inspector tab', () => {
  beforeEach(() => {
    useUiStore.setState({
      faultLabOpen: false,
      pendingFaultFx: null,
      inspectorCollapsed: true,
      activeInspectorTab: 'properties',
    });
  });

  it('opening fault mode snaps the Inspector to the Fault Lab tab', () => {
    useUiStore.getState().setFaultLabOpen(true);
    const s = useUiStore.getState();
    expect(s.faultLabOpen).toBe(true);
    expect(s.inspectorCollapsed).toBe(false);
    expect(s.activeInspectorTab).toBe('faultlab');
  });

  it('closing fault mode returns from the Fault Lab tab to properties', () => {
    useUiStore.getState().setFaultLabOpen(true);
    expect(useUiStore.getState().activeInspectorTab).toBe('faultlab');
    useUiStore.getState().setFaultLabOpen(false);
    const s = useUiStore.getState();
    expect(s.faultLabOpen).toBe(false);
    expect(s.activeInspectorTab).toBe('properties');
  });

  it('closing fault mode on another tab keeps that tab', () => {
    useUiStore.getState().setFaultLabOpen(true);
    useUiStore.getState().setActiveInspectorTab('logs');
    useUiStore.getState().setFaultLabOpen(false);
    expect(useUiStore.getState().activeInspectorTab).toBe('logs');
  });

  it('toggleFaultLab delegates to the same snap behaviour', () => {
    useUiStore.getState().toggleFaultLab();
    expect(useUiStore.getState().activeInspectorTab).toBe('faultlab');
    useUiStore.getState().toggleFaultLab();
    expect(useUiStore.getState().activeInspectorTab).toBe('properties');
  });
});
