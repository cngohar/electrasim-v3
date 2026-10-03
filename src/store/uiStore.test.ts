import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateCircuitJSON } from '../lib/exportImport';
import { clearHistory, useCircuitStore } from './circuitStore';
import { useSettingsStore } from './settingsStore';
import { MOBILE_SUITABILITY_STORAGE_KEY, shouldShowMobileSuitability, useUiStore } from './uiStore';

const resetInteractionState = () => {
  useUiStore.setState({
    mode: 'idle',
    pendingWireFrom: null,
    pendingCustomPath: null,
    placingType: null,
    reroute: null,
    mobileSuitabilityOpen: false,
    welcomeOpen: false,
  });
};

beforeEach(() => {
  window.localStorage.clear();
  resetInteractionState();
});
afterEach(() => {
  window.localStorage.clear();
  resetInteractionState();
});

describe('uiStore interaction modes', () => {
  it('cancels transient wiring and placement state when returning to Select mode', () => {
    useUiStore.setState({
      mode: 'wiring',
      pendingWireFrom: { componentId: 'live', portIndex: 0 },
      pendingCustomPath: {
        from: { componentId: 'live', portIndex: 0 },
        checkpoints: [{ x: 10, y: 20 }],
      },
      placingType: 'bulb',
      reroute: { wireId: 'wire', end: 'to', source: 'armed' },
    });

    useUiStore.getState().setMode('idle');

    const state = useUiStore.getState();
    expect(state.pendingWireFrom).toBeNull();
    expect(state.pendingCustomPath).toBeNull();
    expect(state.placingType).toBeNull();
    expect(state.reroute).toBeNull();
  });
});

describe('simulation safety guards', () => {
  it('does not restart while a protection device remains tripped', () => {
    useCircuitStore.setState({
      components: [
        { id: 'breaker', type: 'mcb', x: 0, y: 0, state: { on: true, isTripped: true } },
      ],
      wires: [],
    });
    useUiStore.setState({ simRunning: false, faultAlert: null });

    useUiStore.getState().setSimRunning(true);

    expect(useUiStore.getState().simRunning).toBe(false);
    expect(useUiStore.getState().faultAlert?.title).toContain('UNRESOLVED');
  });

  it('keeps approximate protection advice non-blocking while physical faults still prevent a run', async () => {
    useSettingsStore.setState({ appMode: 'pro', regulationStandard: 'uk' });
    useCircuitStore.setState({
      components: [
        { id: 'supply', type: 'ac-mains-supply', x: 0, y: 0, state: {} },
        { id: 'socket', type: 'socket-3pin', x: 100, y: 0, state: {} },
      ],
      wires: [
        {
          id: 'live',
          fromComponentId: 'supply',
          fromPortIndex: 0,
          toComponentId: 'socket',
          toPortIndex: 0,
          controlPoints: [],
        },
        {
          id: 'neutral',
          fromComponentId: 'supply',
          fromPortIndex: 1,
          toComponentId: 'socket',
          toPortIndex: 1,
          controlPoints: [],
        },
        {
          id: 'earth',
          fromComponentId: 'supply',
          fromPortIndex: 2,
          toComponentId: 'socket',
          toPortIndex: 2,
          controlPoints: [],
        },
      ],
      globalVoltage: 230,
    });
    useUiStore.setState({
      simRunning: false,
      faultAlert: null,
      complianceGateBlocked: false,
      eventHistory: [],
    });

    useUiStore.getState().setSimRunning(true);
    expect(useUiStore.getState().simRunning).toBe(false); // Outlet-only drawing needs an explicit diagnostic.
    useUiStore.getState().startDiagnosticRun();
    expect(useUiStore.getState().simRunning).toBe(true);
    expect(useUiStore.getState().complianceGateBlocked).toBe(false);
    expect(useUiStore.getState().faultAlert).toBeNull();
    useUiStore.getState().runCircuitValidation();
    await vi.waitFor(() => expect(useUiStore.getState().isValidatingCircuit).toBe(false));
    expect(
      useUiStore
        .getState()
        .validationReport?.issues.some((issue) => issue.id === 'socket_rcd_socket'),
    ).toBe(true);

    useCircuitStore.setState((state) => ({
      components: state.components.map((component) =>
        component.id === 'socket'
          ? { ...component, state: { ...component.state, isBlown: true } }
          : component,
      ),
    }));
    useUiStore.setState({ simRunning: false, faultAlert: null, complianceGateBlocked: true });
    useUiStore.getState().runWithComplianceOverride();
    expect(useUiStore.getState().simRunning).toBe(false);
    expect(useUiStore.getState().faultAlert?.title).toContain('UNRESOLVED');

    useSettingsStore.setState({ appMode: 'basic' });
  });
});

describe('circuit validation quick fixes', () => {
  it('creates valid component instances through one graph edit per fix', () => {
    vi.useFakeTimers();
    try {
      useCircuitStore.setState({
        components: [],
        wires: [],
        globalVoltage: 230,
        selectedComponentId: null,
        selectedComponentIds: [],
        selectedWireIds: [],
      });
      useUiStore.setState({ simRunning: false, logs: [] });
      clearHistory();

      useUiStore.getState().applyQuickFix({ type: 'add_power_supply', label: 'Add supply' });
      useUiStore.getState().applyQuickFix({ type: 'add_rcd', label: 'Add RCD' });

      const circuit = useCircuitStore.getState();
      expect(circuit.components.map((component) => component.type)).toEqual([
        'ac-mains-supply',
        'rcd',
      ]);
      expect(circuit.components.every((component) => typeof component.id === 'string')).toBe(true);
      expect(
        validateCircuitJSON({
          version: 1,
          circuit: {
            components: circuit.components,
            wires: circuit.wires,
            globalVoltage: circuit.globalVoltage,
          },
        }),
      ).toBeNull();
      expect(useCircuitStore.temporal.getState().pastStates).toHaveLength(2);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});

describe('mobile suitability onboarding', () => {
  it('only opens for an unacknowledged phone-sized viewport', () => {
    expect(shouldShowMobileSuitability(390, false)).toBe(true);
    expect(shouldShowMobileSuitability(390, true)).toBe(false);
    expect(shouldShowMobileSuitability(640, false)).toBe(false);
    expect(shouldShowMobileSuitability(1024, false)).toBe(false);
  });

  it('persists acknowledgement and then opens Welcome for a new user', () => {
    useUiStore.setState({ mobileSuitabilityOpen: true, welcomeOpen: false });

    useUiStore.getState().dismissMobileSuitability();

    expect(useUiStore.getState().mobileSuitabilityOpen).toBe(false);
    expect(useUiStore.getState().welcomeOpen).toBe(true);
    expect(window.localStorage.getItem(MOBILE_SUITABILITY_STORAGE_KEY)).toBe('1');
  });

  it('does not reopen Welcome for a returning user', () => {
    window.localStorage.setItem('electrasim:welcomed', '1');
    useUiStore.setState({ mobileSuitabilityOpen: true, welcomeOpen: false });

    useUiStore.getState().dismissMobileSuitability();

    expect(useUiStore.getState().mobileSuitabilityOpen).toBe(false);
    expect(useUiStore.getState().welcomeOpen).toBe(false);
  });
});

describe('uiStore — panel layout & undo toast', () => {
  it('shows an undo toast and auto-dismisses it', () => {
    vi.useFakeTimers();
    useUiStore.getState().showUndoToast('Component deleted');
    expect(useUiStore.getState().undoToast?.message).toBe('Component deleted');
    expect(useUiStore.getState().undoToast?.id).toBeGreaterThan(0);

    vi.advanceTimersByTime(4500);
    expect(useUiStore.getState().undoToast).toBeNull();
    vi.useRealTimers();
  });

  it('clears the undo toast on demand', () => {
    useUiStore.getState().showUndoToast('Wire deleted');
    useUiStore.getState().clearUndoToast();
    expect(useUiStore.getState().undoToast).toBeNull();
  });

  it('toggles the shortcuts overlay', () => {
    useUiStore.getState().setShortcutsOpen(true);
    expect(useUiStore.getState().shortcutsOpen).toBe(true);
    useUiStore.getState().toggleShortcuts();
    expect(useUiStore.getState().shortcutsOpen).toBe(false);
  });
});

describe('validation report staleness (issue: ghost issues after deleting components)', () => {
  const comp = (id: string) => ({
    id,
    type: 'bulb',
    x: 0,
    y: 0,
    rotation: 0,
    state: {},
  });
  const fakeReport = {
    timestamp: Date.now(),
    score: 70,
    status: 'warning',
    summary: { errorsCount: 0, warningsCount: 1, infoCount: 0, passedCount: 2 },
    issues: [
      {
        id: 'x',
        severity: 'warning',
        title: 't',
        description: 'd',
        recommendation: 'r',
        category: 'continuity',
      },
    ],
    passedChecks: [],
  };

  it('flags the report stale when the circuit changes after it ran', () => {
    useCircuitStore.setState({ components: [comp('a')] as never, wires: [] });
    useUiStore.setState({ validationReport: fakeReport as never, validationStale: false });

    useCircuitStore.setState({ components: [comp('a'), comp('b')] as never });
    expect(useUiStore.getState().validationStale).toBe(true);
    expect(useUiStore.getState().validationReport).not.toBeNull();
  });

  it('drops the report entirely when the canvas is emptied', () => {
    useCircuitStore.setState({ components: [comp('a')] as never, wires: [] });
    useUiStore.setState({
      validationReport: fakeReport as never,
      validationStale: false,
      complianceGateBlocked: true,
    });

    useCircuitStore.setState({ components: [] as never, wires: [] });
    const s = useUiStore.getState();
    expect(s.validationReport).toBeNull();
    expect(s.validationStale).toBe(false);
    expect(s.complianceGateBlocked).toBe(false);
  });

  it('notice toasts render without an Undo affordance', () => {
    useUiStore.getState().showNoticeToast('3 Pro components stay active on the canvas');
    expect(useUiStore.getState().undoToast?.showUndo).toBe(false);
    useUiStore.getState().showUndoToast('Wire deleted');
    expect(useUiStore.getState().undoToast?.showUndo).toBe(true);
    useUiStore.getState().clearUndoToast();
  });
});
