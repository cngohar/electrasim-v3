/**
 * uiStore — ephemeral UI state: simulation on/off, latest sim result, log
 * stream, interaction mode, panel open/close flags.
 *
 * Not undoable. Not persisted (yet — Phase 6 will persist the parts the user
 * cares about, like panel layout, into IndexedDB).
 *
 * NOTE: this file was slimmed from the former 906-line monolith. Types live
 * in `./uiStore.types.ts` and entity/onboarding helpers in
 * `./uiStore.helpers.ts`; both are re-exported below so existing imports
 * keep working.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import {
  COMPONENT_DEFS,
  type Circuit,
  type ComponentInstance,
  type FaultType,
  type WireInstance,
  getPortPos,
  isWireFaultType,
} from '../domain';
import { validateCircuit } from '../domain/circuitValidation';
import { prefersReducedMotionNow } from '../lib/reducedMotion';
import { isDemoSeedCircuit, useCircuitStore } from './circuitStore';
import { useSettingsStore } from './settingsStore';
import {
  createComponent,
  createWire,
  hasWelcomed,
  markMobileSuitabilityAcknowledged,
  markWelcomed,
  mobileSuitabilityInitiallyOpen,
} from './uiStore.helpers';
import type { EventHistoryEntry, UiState } from './uiStore.types';
import { useViewportStore } from './viewportStore';

// Re-export the moved public surface so existing imports keep working.
export type {
  ChallengeRuleFocus,
  ContextMenuState,
  PendingCustomPath,
  PendingDeletion,
  RerouteState,
} from './uiStore.types';
export type { ElectricalFaultAlert } from './uiStore.types';
export {
  MOBILE_SUITABILITY_STORAGE_KEY,
  shouldShowMobileSuitability,
} from './uiStore.helpers';

const MAX_LOGS = 100;
let nextLogId = 0;
let nextToastId = 0;
let toastTimer: ReturnType<typeof setTimeout> | null = null;
let validationTimer: ReturnType<typeof setTimeout> | null = null;
let validationRevision = 0;
let faultInjectionTimer: ReturnType<typeof setTimeout> | null = null;
let faultInjectionNonce = 0;

/**
 * Pre-commit animation lead time (ms) per fault kind — the "sparks fly
 * first, then the fault lands" choreography played by the canvas
 * FaultFxLayer for *manual* Fault Lab injections. Each fault kind has its
 * own distinct animation and its own beat. Kept in sync with the CSS
 * keyframes in `index.css` (`electrasim-fx-*` classes).
 */
export const FAULT_ARM_MS: Partial<Record<FaultType, number>> = {
  'short-circuit': 1100,
  'open-circuit': 550,
  'open-neutral': 550,
  'reverse-polarity': 700,
  'switched-neutral': 850,
  'earth-fault': 750,
  'smooth-dc-residual': 650,
  'arc-fault': 950,
  'protection-bypass': 750,
  'protection-forced-open': 700,
};
const FAULT_ARM_DEFAULT_MS = 600;

/**
 * Canvas viewBox centre (matches CircuitCanvas VIEW_W/VIEW_H) — used to
 * re-centre the viewport on a fault target so the injection animation is
 * never played off-screen.
 */
const VIEW_CENTER = { x: 600, y: 360 };

/**
 * If the fault target sits outside the visible world rect, snap the viewport
 * so the injection animation is actually seen. Deliberately only used for
 * manual Fault Lab injections — auto-injected faults (Diagnosis Lab,
 * challenges) must never yank the learner's view.
 */
/**
 * Centre the viewport on a world point, keeping the current zoom. Used by
 * the Fault Lab (auto-reveal on injection; the per-fault Focus buttons).
 */
function centreOnWorldPoint(x: number, y: number): void {
  const { zoom, setPan } = useViewportStore.getState();
  setPan({ x: VIEW_CENTER.x - x * zoom, y: VIEW_CENTER.y - y * zoom });
}

/** Anchor point of a fault target in world coordinates (null if it vanished). */
function faultTargetPoint(
  target: { componentId: string } | { wireId: string },
): { x: number; y: number } | null {
  const circuit = useCircuitStore.getState();
  if ('componentId' in target) {
    const comp = circuit.components.find((c) => c.id === target.componentId);
    return comp ? { x: comp.x, y: comp.y } : null;
  }
  const wire = circuit.wires.find((w) => w.id === target.wireId);
  if (!wire) return null;
  const from = circuit.components.find((c) => c.id === wire.fromComponentId);
  const to = circuit.components.find((c) => c.id === wire.toComponentId);
  if (!from || !to) return null;
  const start = getPortPos(from, wire.fromPortIndex, COMPONENT_DEFS);
  const end = getPortPos(to, wire.toPortIndex, COMPONENT_DEFS);
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

/**
 * If the fault target sits outside the visible world rect, snap the viewport
 * so the injection animation is actually seen. Deliberately only used for
 * manual Fault Lab injections — auto-injected faults (Diagnosis Lab,
 * challenges) must never yank the learner's view.
 */
function ensureTargetOnCanvas(target: { componentId: string } | { wireId: string }): void {
  const point = faultTargetPoint(target);
  if (!point) return;
  const { pan, zoom } = useViewportStore.getState();
  const margin = 90;
  const minX = -pan.x / zoom;
  const maxX = (VIEW_CENTER.x * 2 - pan.x) / zoom;
  const minY = -pan.y / zoom;
  const maxY = (VIEW_CENTER.y * 2 - pan.y) / zoom;
  const offScreen =
    point.x < minX + margin ||
    point.x > maxX - margin ||
    point.y < minY + margin ||
    point.y > maxY - margin;
  if (offScreen) centreOnWorldPoint(point.x, point.y);
}

/**
 * Fault Lab "Focus" action: centre the canvas on a fault target (always —
 * an explicit user click, unlike the injection-time auto-reveal).
 */
export function focusFaultTarget(target: { componentId: string } | { wireId: string }): void {
  const point = faultTargetPoint(target);
  if (point) centreOnWorldPoint(point.x, point.y);
}

/**
 * Apply the non-bypassable physical-safety check and the Pro compliance gate
 * shared by every ordinary simulation-start path.
 */
function canStartSimulation(state: UiState): boolean {
  const circuit = useCircuitStore.getState();
  const hasDamagedOrTripped = circuit.components.some(
    (component) => component.state?.isBlown || component.state?.isTripped,
  );
  const hasBustedWire = circuit.wires.some((wire) => wire.isBusted);

  if (hasDamagedOrTripped || hasBustedWire) {
    state.simRunning = false;
    state.faultAlert = {
      title: 'UNRESOLVED ELECTRICAL FAULT',
      kind: 'trip',
      reason:
        'Cannot run simulation while components are tripped/blown or wires are melted. Please fix circuit parameter overload or click Repair.',
      currentAmps: 0,
      limitAmps: 0,
      resolutionHint:
        'Adjust power (W) or current (A) in the Inspector panel or increase cable gauge, then click "Repair & Reset Circuit" to resume.',
    };
    return false;
  }

  // Student mode treats compliance as guidance. Pro mode blocks Run and
  // sends the user directly to the report without presenting a fake trip.
  if (useSettingsStore.getState().appMode === 'pro') {
    const report = validateCircuit(
      {
        components: circuit.components,
        wires: circuit.wires,
        globalVoltage: circuit.globalVoltage,
      },
      state.simResult,
      useSettingsStore.getState().regulationStandard,
    );
    if ((report.blockingErrorsCount ?? 0) > 0) {
      state.simRunning = false;
      state.faultAlert = null;
      state.validationReport = report;
      state.validationStale = false;
      state.complianceGateBlocked = true;
      state.inspectorOpen = true;
      state.inspectorCollapsed = false;
      state.activeInspectorTab = 'validation';
      return false;
    }
  }

  state.complianceGateBlocked = false;
  return true;
}

export const useUiStore = create<UiState>()(
  immer<UiState>((set, get) => ({
    simRunning: false,
    simResult: null,
    faultAlert: null,
    lastFaultAlert: null,
    whatHappenedOpen: false,
    logs: [],
    eventHistory: [],
    eventHistoryOpen: false,
    mode: 'idle',
    pendingWireFrom: null,
    placingType: null,
    reroute: null,
    pendingDeletion: null,
    settingsOpen: false,
    settingsTab: null,
    hoveredComponentId: null,
    importExportOpen: false,
    menuOpen: false,
    docsOpen: false,
    docsScrollTo: null,
    contactOpen: false,
    templatesOpen: false,
    activeGuideId: null,
    challengeOpen: false,
    challengeIntroOpen: false,
    challengeModeActive: false,
    challengePaused: false,
    challengeAllowedComponents: null,
    challengeAttemptId: null,
    challengeRuleFocus: null,
    diagnosisOpen: false,
    diagnosisActive: false,
    guideHidden: false,
    welcomeOpen: !hasWelcomed() && !mobileSuitabilityInitiallyOpen,
    mobileSuitabilityOpen: mobileSuitabilityInitiallyOpen,
    contextMenu: null,
    dragRect: null,
    alignmentGuides: null,
    spatialIndicator: null,
    pendingCustomPath: null,
    previewVariantType: null,
    previewComponentId: null,
    activeComponentInfoType: null,
    validationReport: null,
    validationStale: false,
    isValidatingCircuit: false,
    activeValidationIssueModal: null,
    activeInspectorTab: 'properties',
    tracePathMode: true,
    complianceGateBlocked: false,

    paletteOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true,
    logOpen: false,
    inspectorOpen: true,
    inspectorCollapsed: true,
    commandPaletteOpen: false,
    faultLabOpen: false,
    pendingFaultFx: null,
    shortcutsOpen: false,
    tourId: null,
    tourStep: 0,
    tourCircuitBackup: null,
    tourOriginalAppMode: null,
    undoToast: null,

    setSimRunning: (running) =>
      set((state) => {
        if (running && !canStartSimulation(state)) return;
        state.simRunning = running;
      }),
    toggleSim: () =>
      set((state) => {
        const nextState = !state.simRunning;
        if (nextState && !canStartSimulation(state)) return;
        state.simRunning = nextState;
      }),
    runWithComplianceOverride: () =>
      set((s) => {
        // This action is intentionally inert outside Pro, even if called
        // directly rather than through the Pro-only Validation control.
        if (useSettingsStore.getState().appMode !== 'pro') return;

        const cs = useCircuitStore.getState();
        const hasDamagedOrTripped = cs.components.some(
          (component) => component.state?.isBlown || component.state?.isTripped,
        );
        const hasBusted = cs.wires.some((wire) => wire.isBusted);

        // A regulatory teaching override must never bypass an actual simulated
        // electrical failure. The ordinary repair flow remains mandatory.
        if (hasDamagedOrTripped || hasBusted) {
          s.simRunning = false;
          s.faultAlert = {
            title: 'UNRESOLVED ELECTRICAL FAULT',
            kind: 'trip',
            reason:
              'Cannot run simulation while components are tripped/blown or wires are melted. Compliance overrides do not bypass physical faults.',
            currentAmps: 0,
            limitAmps: 0,
            resolutionHint:
              'Repair or reset the damaged component or wire before restarting the simulation.',
          };
          return;
        }

        const standard = useSettingsStore.getState().regulationStandard;
        const report = validateCircuit(
          { components: cs.components, wires: cs.wires, globalVoltage: cs.globalVoltage },
          s.simResult,
          standard,
        );
        const blockingCount = report.blockingErrorsCount ?? 0;
        if (blockingCount === 0) {
          s.validationReport = report;
          s.validationStale = false;
          s.complianceGateBlocked = false;
          s.simRunning = true;
          return;
        }

        const blockingReasons = report.issues
          .filter((issue) => issue.blocking && issue.severity === 'error')
          .map((issue) => issue.title)
          .join('; ');
        const now = Date.now();
        s.eventHistory.unshift({
          id: `event-${now}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: now,
          eventType: 'manual_intervention',
          description: `Teacher/demo override: simulation started with ${blockingCount} blocking compliance issue${blockingCount === 1 ? '' : 's'}.`,
          severity: 'warning',
          details: {
            reason: blockingReasons || 'Teacher/demo compliance override',
            standard: report.standard,
          },
        });
        if (s.eventHistory.length > 100) s.eventHistory.length = 100;
        s.logs.unshift({
          id: `log-${++nextLogId}`,
          type: 'warning',
          message: `Compliance override recorded: simulation started with ${blockingCount} blocking issue${blockingCount === 1 ? '' : 's'}.`,
        });
        if (s.logs.length > MAX_LOGS) s.logs.length = MAX_LOGS;
        s.validationReport = report;
        s.validationStale = false;
        s.complianceGateBlocked = false;
        s.simRunning = true;
      }),
    setSimResult: (r) =>
      set((s) => {
        s.simResult = r;
      }),
    setFaultAlert: (alert) =>
      set((s) => {
        s.faultAlert = alert;
        if (alert) s.lastFaultAlert = alert;
      }),
    setWhatHappenedOpen: (open) =>
      set((s) => {
        s.whatHappenedOpen = open;
      }),
    clearFaultAlert: () =>
      set((s) => {
        s.faultAlert = null;
      }),

    addLog: (message, type) =>
      set((s) => {
        s.logs.unshift({ id: `log-${++nextLogId}`, message, type });
        if (s.logs.length > MAX_LOGS) s.logs.length = MAX_LOGS;
      }),
    clearLogs: () =>
      set((s) => {
        s.logs = [];
      }),
    addEventHistory: (entry) =>
      set((s) => {
        const newEntry: EventHistoryEntry = {
          ...entry,
          id: `event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
        };
        s.eventHistory.unshift(newEntry);
        // Keep last 100 events
        if (s.eventHistory.length > 100) s.eventHistory.length = 100;
      }),
    clearEventHistory: () =>
      set((s) => {
        s.eventHistory = [];
      }),
    setEventHistoryOpen: (open) =>
      set((s) => {
        s.eventHistoryOpen = open;
      }),

    setValidationReport: (report) =>
      set((s) => {
        s.validationReport = report;
        if (!report || (report.blockingErrorsCount ?? 0) === 0) {
          s.complianceGateBlocked = false;
        }
      }),

    setActiveValidationIssueModal: (issue) =>
      set((s) => {
        s.activeValidationIssueModal = issue;
      }),

    setActiveInspectorTab: (tab) =>
      set((s) => {
        s.activeInspectorTab = tab;
      }),

    setTracePathMode: (active) =>
      set((s) => {
        s.tracePathMode = active;
      }),

    toggleTracePathMode: () =>
      set((s) => {
        s.tracePathMode = !s.tracePathMode;
      }),

    runCircuitValidation: () => {
      const revision = ++validationRevision;
      if (validationTimer) clearTimeout(validationTimer);

      useUiStore.setState((s) => {
        s.isValidatingCircuit = true;
        s.inspectorOpen = true;
        s.inspectorCollapsed = false;
        s.activeInspectorTab = 'validation';
      });

      validationTimer = setTimeout(() => {
        validationTimer = null;
        if (revision !== validationRevision) return;

        const cs = useCircuitStore.getState();
        const currentUi = useUiStore.getState();
        // Read the active regulation standard lazily so a template switch
        // immediately re-validates against the new rule set.
        const standard = useSettingsStore.getState().regulationStandard;
        const report = validateCircuit(
          { components: cs.components, wires: cs.wires, globalVoltage: cs.globalVoltage },
          currentUi.simResult,
          standard,
        );
        const summaryText = `Circuit Validation: ${report.summary.errorsCount} error(s), ${report.summary.warningsCount} warning(s), ${report.summary.passedCount} check(s) passed.`;

        useUiStore.setState((s) => {
          if (revision !== validationRevision) return;
          s.validationReport = report;
          s.validationStale = false;
          s.isValidatingCircuit = false;
          if ((report.blockingErrorsCount ?? 0) === 0) s.complianceGateBlocked = false;
          s.logs.unshift({
            id: `log-${++nextLogId}`,
            type:
              report.status === 'fail'
                ? 'error'
                : report.status === 'warning'
                  ? 'warning'
                  : 'success',
            message: summaryText,
          });
          if (s.logs.length > MAX_LOGS) s.logs.length = MAX_LOGS;
          // Audit trail: record every blocking compliance violation in the
          // Pro Simulation History log. We only record errors so the log
          // doesn't fill with duplicate warnings on each edit.
          if (report.issues) {
            const blocking = report.issues.filter((i) => i.blocking && i.severity === 'error');
            const now = Date.now();
            for (const issue of blocking) {
              // Avoid duplicate entries for the same issue within 5 s.
              const recent = s.eventHistory.find(
                (e) =>
                  e.eventType === 'regulatory_violation' &&
                  e.details?.issueId === issue.id &&
                  now - e.timestamp < 5000,
              );
              if (!recent) {
                s.eventHistory.unshift({
                  id: `event-${now}-${Math.random().toString(36).slice(2, 7)}`,
                  timestamp: now,
                  eventType: 'regulatory_violation',
                  description: issue.title,
                  severity: 'critical',
                  componentId: issue.componentId,
                  wireId: issue.wireId,
                  details: {
                    issueId: issue.id,
                    reason: issue.description,
                    standard: report.standard,
                  },
                });
              }
            }
            if (s.eventHistory.length > 100) s.eventHistory.length = 100;
          }
        });
      }, 350);
    },

    applyQuickFix: (action) => {
      const cs = useCircuitStore.getState();
      const ui = useUiStore.getState();

      if (action.type === 'add_earth_wire') {
        const component = action.componentId
          ? cs.components.find((item) => item.id === action.componentId)
          : null;
        const definition = component ? COMPONENT_DEFS[component.type] : undefined;
        const earthPortIndex = definition?.ports.findIndex((port) => port.type === 'earth') ?? -1;

        if (!component || earthPortIndex < 0) {
          ui.addLog('Quick Fix skipped: selected component has no Earth terminal.', 'warning');
        } else {
          const earthSource = cs.components.find((candidate) => {
            if (candidate.id === component.id || !COMPONENT_DEFS[candidate.type]?.isSource) {
              return false;
            }
            return COMPONENT_DEFS[candidate.type]?.ports.some((port) => port.type === 'earth');
          });
          const sourceEarthPortIndex = earthSource
            ? (COMPONENT_DEFS[earthSource.type]?.ports.findIndex((port) => port.type === 'earth') ??
              -1)
            : -1;

          if (earthSource && sourceEarthPortIndex >= 0) {
            const wire = createWire(
              {
                fromComponentId: component.id,
                fromPortIndex: earthPortIndex,
                toComponentId: earthSource.id,
                toPortIndex: sourceEarthPortIndex,
              },
              cs.wires.map((item) => item.id),
            );
            cs.applyGraphChanges({ addWires: [wire] });
            ui.addLog(
              `Quick Fix Applied: Connected Earth CPC conductor to ${definition?.label ?? component.type}.`,
              'info',
            );
          } else {
            const earthTerminal = createComponent(
              'earth-terminal',
              component.x + 130,
              component.y + 70,
              cs.components.map((item) => item.id),
            );
            if (earthTerminal) {
              const wire = createWire(
                {
                  fromComponentId: component.id,
                  fromPortIndex: earthPortIndex,
                  toComponentId: earthTerminal.id,
                  toPortIndex: 0,
                },
                cs.wires.map((item) => item.id),
              );
              cs.applyGraphChanges({ addComponents: [earthTerminal], addWires: [wire] });
              ui.addLog(
                'Quick Fix Applied: Created Earth Terminal and connected protective conductor.',
                'info',
              );
            }
          }
        }
      } else if (action.type === 'increase_cable_gauge' || action.type === 'upgrade_mcb') {
        if (action.componentId) {
          const component = cs.components.find((item) => item.id === action.componentId);
          if (component) {
            if (action.targetCableMm2) {
              cs.updateComponentState(component.id, { customCableMm2: action.targetCableMm2 });
              ui.addLog(
                `Quick Fix Applied: Upgraded cable section to ${action.targetCableMm2}mm².`,
                'info',
              );
            }
            if (action.targetMaxAmps) {
              cs.updateComponentState(component.id, { customMaxAmps: action.targetMaxAmps });
              ui.addLog(
                `Quick Fix Applied: Adjusted protection breaker rating to ${action.targetMaxAmps}A.`,
                'info',
              );
            }
          }
        }
      } else if (action.type === 'rewire_switch_live') {
        const switchComponent = action.componentId
          ? cs.components.find((item) => item.id === action.componentId)
          : null;
        const liveSource = cs.components.find((candidate) => {
          const candidateDefinition = COMPONENT_DEFS[candidate.type];
          return (
            candidateDefinition?.isSource === true &&
            candidateDefinition.ports.some((port) => port.type === 'live')
          );
        });
        const liveSourcePort = liveSource
          ? (COMPONENT_DEFS[liveSource.type]?.ports.findIndex((port) => port.type === 'live') ?? -1)
          : -1;
        const switchLivePort = switchComponent
          ? (COMPONENT_DEFS[switchComponent.type]?.ports.findIndex(
              (port) => port.type === 'live',
            ) ?? -1)
          : -1;

        if (switchComponent && liveSource && liveSourcePort >= 0 && switchLivePort >= 0) {
          const connectedWireIds = cs.wires
            .filter(
              (wire) =>
                wire.fromComponentId === switchComponent.id ||
                wire.toComponentId === switchComponent.id,
            )
            .map((wire) => wire.id);
          const replacement = createWire(
            {
              fromComponentId: liveSource.id,
              fromPortIndex: liveSourcePort,
              toComponentId: switchComponent.id,
              toPortIndex: switchLivePort,
            },
            cs.wires.map((item) => item.id),
          );
          cs.applyGraphChanges({ removeWireIds: connectedWireIds, addWires: [replacement] });
          ui.addLog(
            'Quick Fix Applied: Removed Neutral-side conductors and connected the switch input to Live. Reconnect the switched output to the intended load.',
            'warning',
          );
        } else {
          ui.addLog(
            'Quick Fix skipped: no compatible Live source or switch terminal found.',
            'warning',
          );
        }
      } else if (action.type === 'add_rcd') {
        const mainSupply = cs.components.find(
          (component) =>
            component.type.includes('mains') ||
            component.type.includes('supply') ||
            component.type.includes('board'),
        );
        const component = createComponent(
          'rcd',
          mainSupply ? mainSupply.x + 140 : 250,
          mainSupply ? mainSupply.y : 200,
          cs.components.map((item) => item.id),
        );
        if (component) {
          cs.applyGraphChanges({ addComponents: [component] });
          ui.addLog('Quick Fix Applied: Added 30mA RCD protection breaker to canvas.', 'info');
        }
      } else if (action.type === 'add_power_supply') {
        const component = createComponent(
          'ac-mains-supply',
          180,
          200,
          cs.components.map((item) => item.id),
        );
        if (component) {
          cs.applyGraphChanges({ addComponents: [component] });
          ui.addLog('Quick Fix Applied: Placed AC Mains Power Supply module on canvas.', 'info');
        }
      }

      useUiStore.getState().runCircuitValidation();
    },

    setMode: (m) =>
      set((s) => {
        s.mode = m;
        if (m === 'idle') {
          s.pendingWireFrom = null;
          s.pendingCustomPath = null;
          s.reroute = null;
          s.placingType = null;
        } else if (m === 'wiring') {
          s.placingType = null;
          s.reroute = null;
        }
      }),

    togglePalette: () =>
      set((s) => {
        s.paletteOpen = !s.paletteOpen;
      }),
    setPaletteOpen: (open) =>
      set((s) => {
        s.paletteOpen = open;
      }),
    toggleLog: () =>
      set((s) => {
        s.logOpen = !s.logOpen;
      }),
    setLogOpen: (open) =>
      set((s) => {
        s.logOpen = open;
      }),
    toggleInspector: () =>
      set((s) => {
        s.inspectorOpen = !s.inspectorOpen;
      }),
    setCommandPaletteOpen: (open) =>
      set((s) => {
        s.commandPaletteOpen = open;
      }),
    toggleCommandPalette: () =>
      set((s) => {
        s.commandPaletteOpen = !s.commandPaletteOpen;
      }),
    setFaultLabOpen: (open) => {
      if (open) {
        // Opening fault mode arms the manual fault-injection master switch
        // (context menus etc. gate on it) — single arm point.
        useSettingsStore.getState().setSetting('manualFaultInjection', true);
      }
      set((s) => {
        s.faultLabOpen = open;
        if (open) {
          // Fault mode now owns a dedicated Inspector tab (the old floating
          // window is gone): snap the Inspector open straight onto it.
          s.inspectorCollapsed = false;
          s.activeInspectorTab = 'faultlab';
        } else if (s.activeInspectorTab === 'faultlab') {
          // Leaving fault mode while the tab is focused falls back to the
          // component properties view so the drawer never shows a dead tab.
          s.activeInspectorTab = 'properties';
        }
        if (!open && s.pendingFaultFx) {
          s.pendingFaultFx = null;
          if (faultInjectionTimer) {
            clearTimeout(faultInjectionTimer);
            faultInjectionTimer = null;
          }
        }
      });
    },
    toggleFaultLab: () => get().setFaultLabOpen(!get().faultLabOpen),
    beginFaultInjection: (type, target) => {
      // Wire targets accept only conductor-level fault kinds.
      if ('wireId' in target && !isWireFaultType(type)) return;
      const nonce = ++faultInjectionNonce;
      if (faultInjectionTimer) {
        clearTimeout(faultInjectionTimer);
        faultInjectionTimer = null;
      }

      const commit = () => {
        if (nonce !== faultInjectionNonce) return; // superseded mid-animation
        faultInjectionTimer = null;
        if ('componentId' in target) {
          useCircuitStore.getState().setComponentFault(target.componentId, type);
        } else if (isWireFaultType(type)) {
          useCircuitStore.getState().setWireFault(target.wireId, type);
        }
        ensureTargetOnCanvas(target);
        set((s) => {
          if (s.pendingFaultFx?.nonce === nonce) s.pendingFaultFx = null;
        });
      };

      // Reduced-motion users get the fault instantly with static indicators —
      // no pre-commit animation, no artificial delay.
      const armMs = prefersReducedMotionNow() ? 0 : (FAULT_ARM_MS[type] ?? FAULT_ARM_DEFAULT_MS);
      if (armMs <= 0) {
        set((s) => {
          s.pendingFaultFx = null;
        });
        commit();
        return;
      }
      set((s) => {
        s.pendingFaultFx = { target, type, nonce };
      });
      // Re-centre immediately so the *arming* animation is visible too.
      ensureTargetOnCanvas(target);
      faultInjectionTimer = setTimeout(commit, armMs);
    },
    clearPendingFaultFx: () => {
      faultInjectionNonce += 1;
      if (faultInjectionTimer) {
        clearTimeout(faultInjectionTimer);
        faultInjectionTimer = null;
      }
      set((s) => {
        s.pendingFaultFx = null;
      });
    },
    setShortcutsOpen: (open) =>
      set((s) => {
        s.shortcutsOpen = open;
      }),
    toggleShortcuts: () =>
      set((s) => {
        s.shortcutsOpen = !s.shortcutsOpen;
      }),
    startTour: (id) => {
      const settings = useSettingsStore.getState();
      const circuit = useCircuitStore.getState();
      const hadCircuit = circuit.components.length > 0 || circuit.wires.length > 0;
      // The untouched demo seed is not user work — no need to prompt for it
      // (a Reset can always bring it back).
      const isDemo = isDemoSeedCircuit(circuit);
      if (hadCircuit && !isDemo) {
        const ok = window.confirm(
          'Start the tutorial?\n\nYour current circuit will be saved and can be restored later, after completing the tutorial — or you can keep the tutorial circuit instead.',
        );
        if (!ok) return;
      }
      const backup: Circuit | null =
        hadCircuit && !isDemo
          ? {
              components: circuit.components.map((component) => ({
                ...component,
                state: { ...component.state },
              })),
              wires: circuit.wires.map((wire) => ({
                ...wire,
                controlPoints: wire.controlPoints ? [...wire.controlPoints] : [],
              })),
              ...(circuit.globalVoltage !== undefined
                ? { globalVoltage: circuit.globalVoltage }
                : {}),
            }
          : null;

      set((s) => {
        // A tour needs the canvas: close all blocking dialogs, pickers and guides.
        if (s.welcomeOpen) markWelcomed();
        s.welcomeOpen = false;
        s.commandPaletteOpen = false;
        s.templatesOpen = false;
        s.activeGuideId = null;
        s.settingsOpen = false;
        s.docsOpen = false;
        s.faultLabOpen = false;
        s.challengeOpen = false;
        s.diagnosisOpen = false;
        s.importExportOpen = false;
        s.menuOpen = false;
        s.contactOpen = false;
        s.whatHappenedOpen = false;
        s.shortcutsOpen = false;
        s.mobileSuitabilityOpen = false;
        s.simRunning = false;
        s.tourId = id;
        s.tourStep = 0;
        s.tourCircuitBackup = backup;
        s.tourOriginalAppMode = settings.appMode;
      });

      // The tutorial must match the mode it teaches: the Student tour runs
      // in Basic Student mode and the Pro tour in Pro Electrician mode. The
      // original mode is restored when the tour ends unless the user changes
      // it themselves during the tour.
      const targetMode = id === 'student' ? 'basic' : 'pro';
      if (settings.appMode !== targetMode) {
        settings.setSetting('appMode', targetMode);
        get().addLog(
          `Switched to ${targetMode === 'pro' ? 'Pro Electrician' : 'Basic Student'} mode for the tutorial.`,
          'info',
        );
      }

      // Every tutorial starts on an empty canvas. The Student tour builds
      // from scratch; the Pro tour asks you to load a practice circuit in
      // its second step. Clearing goes through the normal (undoable) store
      // action, and a saved circuit is offered back when the tour ends.
      if (hadCircuit) {
        useCircuitStore.getState().clearAllComponents();
        get().addLog(
          backup
            ? 'Canvas saved and cleared for the tutorial — restore it when you finish.'
            : 'Demo bench cleared for the tutorial.',
          'info',
        );
      }
    },
    endTour: () => {
      const tourId = get().tourId;
      const originalMode = get().tourOriginalAppMode;
      const expectedMode = tourId === 'student' ? 'basic' : 'pro';
      set((s) => {
        s.tourId = null;
        s.tourStep = 0;
        s.tourCircuitBackup = null;
        s.tourOriginalAppMode = null;
      });
      // Hand the pre-tour mode back — unless the user switched modes
      // themselves while the tour was running, which we treat as a choice.
      if (
        originalMode &&
        originalMode !== expectedMode &&
        useSettingsStore.getState().appMode === expectedMode
      ) {
        useSettingsStore.getState().setSetting('appMode', originalMode);
        get().addLog(
          `Tutorial ended — back to ${originalMode === 'pro' ? 'Pro Electrician' : 'Basic Student'} mode.`,
          'info',
        );
      }
    },
    setTourStep: (step) =>
      set((s) => {
        s.tourStep = step;
      }),
    showUndoToast: (message) =>
      set((s) => {
        s.undoToast = { message, id: ++nextToastId, showUndo: true };
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          useUiStore.setState((st) => {
            st.undoToast = null;
          });
        }, 4000);
      }),
    showNoticeToast: (message) =>
      set((s) => {
        s.undoToast = { message, id: ++nextToastId, showUndo: false };
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
          useUiStore.setState((st) => {
            st.undoToast = null;
          });
        }, 5000);
      }),
    clearUndoToast: () =>
      set((s) => {
        s.undoToast = null;
        if (toastTimer) clearTimeout(toastTimer);
      }),
    setInspectorOpen: (open) =>
      set((s) => {
        s.inspectorOpen = open;
      }),
    setInspectorCollapsed: (collapsed) =>
      set((s) => {
        s.inspectorCollapsed = collapsed;
      }),
    setPendingWireFrom: (p) =>
      set((s) => {
        s.pendingWireFrom = p;
        // Phase 6.1.1 — mutual exclusion: entering wire mode cancels
        // any active palette placement.
        if (p) {
          s.placingType = null;
        }
      }),
    setPlacingType: (type) =>
      set((s) => {
        s.placingType = type;
        s.mode = type ? 'placing' : 'idle';
        // Phase 6.1.1 — mutual exclusion: clear pending wire origin when
        // the user picks a palette component, and vice-versa.
        if (type) {
          s.pendingWireFrom = null;
          s.reroute = null;
          // Auto-close palette on mobile so the canvas is fully visible
          // for the tap-to-place interaction.
          if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            s.paletteOpen = false;
          }
        }
      }),
    setReroute: (r) =>
      set((s) => {
        s.reroute = r;
      }),
    setPendingDeletion: (d) =>
      set((s) => {
        s.pendingDeletion = d;
      }),
    setSettingsOpen: (open, tab) =>
      set((s) => {
        s.settingsOpen = open;
        s.settingsTab = tab ?? null;
      }),
    setHoveredComponentId: (id) =>
      set((s) => {
        s.hoveredComponentId = id;
      }),
    setImportExportOpen: (open) =>
      set((s) => {
        s.importExportOpen = open;
      }),
    setMenuOpen: (open) =>
      set((s) => {
        s.menuOpen = open;
      }),
    setDocsOpen: (open, scrollTo) =>
      set((s) => {
        s.docsOpen = open;
        s.docsScrollTo = scrollTo ?? null;
      }),
    setContactOpen: (open) =>
      set((s) => {
        s.contactOpen = open;
      }),
    setChallengeOpen: (open) =>
      set((s) => {
        s.challengeOpen = open;
        if (!open) s.challengeIntroOpen = false;
        // Challenge Mode and the Diagnosis Lab both drive the editor's circuit,
        // so only one may be live at a time.
        if (open) s.diagnosisOpen = false;
      }),
    openChallengeMode: () =>
      set((s) => {
        s.challengeOpen = true;
        s.challengeIntroOpen = true;
        s.diagnosisOpen = false;
      }),
    setChallengeIntroOpen: (open) =>
      set((s) => {
        s.challengeIntroOpen = open;
        if (open) {
          s.challengeOpen = true;
          s.diagnosisOpen = false;
        }
      }),
    setChallengeModeActive: (active) =>
      set((s) => {
        s.challengeModeActive = active;
        if (!active) {
          s.challengePaused = false;
          s.challengeAllowedComponents = null;
          s.challengeAttemptId = null;
          s.challengeRuleFocus = null;
        }
      }),
    setChallengePaused: (paused) =>
      set((s) => {
        s.challengePaused = paused;
        if (paused) s.challengeRuleFocus = null;
      }),
    setChallengeAllowedComponents: (types) =>
      set((s) => {
        s.challengeAllowedComponents = types ? [...types] : null;
      }),
    setChallengeAttemptId: (attemptId) =>
      set((s) => {
        s.challengeAttemptId = attemptId;
      }),
    setChallengeRuleFocus: (focus) =>
      set((s) => {
        s.challengeRuleFocus = focus;
      }),
    setDiagnosisOpen: (open) =>
      set((s) => {
        s.diagnosisOpen = open;
        if (open) {
          s.challengeOpen = false;
          s.challengeIntroOpen = false;
        }
      }),
    setDiagnosisActive: (active) =>
      set((s) => {
        s.diagnosisActive = active;
      }),
    setTemplatesOpen: (open) =>
      set((s) => {
        s.templatesOpen = open;
      }),
    setActiveGuideId: (id) =>
      set((s) => {
        s.activeGuideId = id;
        // Switching or loading a guide always reveals its checklist.
        s.guideHidden = false;
      }),
    setGuideHidden: (hidden) =>
      set((s) => {
        s.guideHidden = hidden;
      }),
    setWelcomeOpen: (open) =>
      set((s) => {
        s.welcomeOpen = open && !s.mobileSuitabilityOpen;
        if (!open) markWelcomed();
      }),
    dismissMobileSuitability: () =>
      set((s) => {
        markMobileSuitabilityAcknowledged();
        s.mobileSuitabilityOpen = false;
        if (!hasWelcomed()) s.welcomeOpen = true;
      }),
    setContextMenu: (menu) =>
      set((s) => {
        s.contextMenu = menu;
      }),
    setDragRect: (rect) =>
      set((s) => {
        s.dragRect = rect;
      }),
    setAlignmentGuides: (guides) =>
      set((s) => {
        s.alignmentGuides = guides;
      }),
    setSpatialIndicator: (indicator) =>
      set((s) => {
        s.spatialIndicator = indicator;
      }),
    triggerSpatialIndicator: (x, y, kind) => {
      const timestamp = Date.now();
      set((s) => {
        s.spatialIndicator = { x, y, kind, timestamp };
      });
      window.setTimeout(() => {
        const current = get().spatialIndicator;
        if (current && current.timestamp === timestamp) {
          set((s) => {
            s.spatialIndicator = null;
          });
        }
      }, 1100);
    },
    //phase 7 custom wiring function start here
    startCustomPath: (from) =>
      set((s) => {
        s.pendingCustomPath = { from, checkpoints: [] };
        s.mode = 'wiring';
        s.pendingWireFrom = null;
      }),
    addCustomPathCheckpoint: (pt) =>
      set((s) => {
        if (s.pendingCustomPath) s.pendingCustomPath.checkpoints.push(pt);
      }),
    cancelCustomPath: () =>
      set((s) => {
        s.pendingCustomPath = null;
        s.mode = 'idle';
      }),
    setPreviewVariant: (type, componentId = null) =>
      set((s) => {
        s.previewVariantType = type;
        s.previewComponentId = type ? componentId : null;
      }),
    setActiveComponentInfoType: (type) =>
      set((s) => {
        s.activeComponentInfoType = type;
      }),
  })),
);

/* ── Stale-report invalidation ────────────────────────────────────────────
 * A validation report describes the circuit AT THE MOMENT it ran. When the
 * graph changes afterwards the report is flagged stale (banner + guarded
 * issue clicks in the report view), and when the canvas is emptied the
 * report is dropped entirely — issues must never outlive the components
 * they point at.
 * Registration is retried across event-loop turns: uiStore and circuitStore
 * import each other, so either binding may still be in its temporal dead
 * zone while this module body (or an early microtask) runs. */
const registerValidationStaleWatcher = () => {
  try {
    useCircuitStore.subscribe((state, prev) => {
      if (state.components === prev.components && state.wires === prev.wires) return;
      const ui = useUiStore.getState();
      if (!ui.validationReport) return;
      if (state.components.length === 0) {
        useUiStore.setState((s) => {
          s.validationReport = null;
          s.validationStale = false;
          s.activeValidationIssueModal = null;
          s.complianceGateBlocked = false;
        });
      } else if (!ui.validationStale) {
        useUiStore.setState((s) => {
          s.validationStale = true;
        });
      }
    });
  } catch {
    // Cyclic-import race: the other store has not finished initialising.
    setTimeout(registerValidationStaleWatcher, 0);
  }
};
registerValidationStaleWatcher();
