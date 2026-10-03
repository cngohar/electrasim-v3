/**
 * UI-store state & shape definitions.
 *
 * Split verbatim from the former monolithic `uiStore.ts`.
 */

import type {
  Circuit,
  FaultType,
  InteractionMode,
  LogEntry,
  LogLevel,
  Point2D,
  PortRef,
  SimulationResult,
} from '@electrasim/domain';
import type { RuleTarget } from '@electrasim/domain/challenges/declarative/rules';
import type {
  QuickFixAction,
  ValidationIssue,
  ValidationReport,
} from '@electrasim/domain/circuitValidation';

export interface RerouteState {
  wireId: string;
  end: 'from' | 'to';
  /** `'drag'` = pointer is held; `'armed'` = waiting for next port click. */
  source: 'drag' | 'armed';
}

/** Focus request created when a learner clicks a failing challenge rule. */
export interface ChallengeRuleFocus {
  ruleId: string;
  label: string;
  targets: RuleTarget[];
  paletteTypes: string[];
}

/**
 * Phase 6.1: unified pending-deletion request. The destination behaviour
 * depends on `useSettingsStore.confirmDelete`:
 *   - true  → render a ConfirmDialog that calls the matching remover
 *             when accepted;
 *   - false → the action runs immediately and `pendingDeletion` is never
 *             set (helpers in `canvas-actions.ts` handle the branching).
 */
export type PendingDeletion =
  | { kind: 'component'; id: string }
  | { kind: 'components'; ids: string[] }
  | { kind: 'wire'; id: string }
  | { kind: 'clear-wires' }
  | { kind: 'clear-all' }
  | { kind: 'reset' };

/**
 * Phase 7: in-flight custom-path wire being drawn.
 * `from` is the origin port; `checkpoints` are the user-placed corners
 * that will become the wire's stored `controlPoints` on commit.
 */
export interface PendingCustomPath {
  from: PortRef;
  checkpoints: Point2D[];
}

/**
 * Phase 6.5.2: Right-click context menu state.
 * `target` describes what was right-clicked so the menu can show
 * context-sensitive items.
 */
export interface ContextMenuState {
  /** Screen-space position for the popup. */
  x: number;
  y: number;
  target: { kind: 'canvas' } | { kind: 'component'; id: string } | { kind: 'wire'; id: string };
}

export interface ElectricalFaultAlert {
  title: string;
  kind: 'trip' | 'melt' | 'short' | 'blow';
  deviceName?: string;
  deviceId?: string;
  wireId?: string;
  reason: string;
  currentAmps: number;
  limitAmps: number;
  cableMm2?: number;
  resolutionHint: string;
  /**
   * How long the standard says the device took to clear, in seconds. Surfaced
   * next to the current/limit pair because "26 A on a 16 A breaker" is only half
   * the story — whether that clears in 40 ms or 21 minutes is the difference
   * between a nuisance trip and a cable fire.
   */
  clearingTimeSeconds?: number;
  /** Which element operated: thermal/magnetic (overcurrent), residual, or arc. */
  mechanism?: 'thermal' | 'magnetic' | 'residual' | 'arc';
  /** I/In for overcurrent trips; I/IΔn for residual trips. */
  currentMultiple?: number;
  /** Timestamp when the fault occurred */
  timestamp?: number;
}

/** Event history entry for tracking electrical events over time */
export interface EventHistoryEntry {
  id: string;
  timestamp: number;
  eventType:
    | 'fault_detected'
    | 'fault_injected'
    | 'component_tripped'
    | 'wire_overheated'
    | 'component_blown'
    | 'wire_melted'
    | 'fault_cleared'
    | 'component_repaired'
    | 'regulatory_violation'
    | 'manual_intervention';
  componentName?: string;
  componentType?: string;
  componentId?: string;
  wireId?: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  details?: {
    currentAmps?: number;
    voltage?: number;
    cableMm2?: number;
    reason?: string;
    faultType?: string;
    /** Validation issue id (regulatory violations in the audit history). */
    issueId?: string;
    /** Regulation standard under which a violation was detected. */
    standard?: string;
  };
}

export interface UiState {
  simRunning: boolean;
  diagnosticRun: boolean;
  startDiagnosticRun: () => void;
  simResult: SimulationResult | null;
  faultAlert: ElectricalFaultAlert | null;
  lastFaultAlert: ElectricalFaultAlert | null;
  whatHappenedOpen: boolean;
  logs: LogEntry[];
  /** Event history for tracking electrical events over time */
  eventHistory: EventHistoryEntry[];
  mode: InteractionMode;

  /**
   * When the user has clicked the first port of a new wire but not yet the
   * second, this holds the origin. The canvas reads it to render a
   * rubber-band preview from the origin port to the cursor.
   */
  pendingWireFrom: PortRef | null;

  /**
   * Component type the user picked from the palette but has not yet placed
   * on the canvas. While set, the canvas shows a ghost preview at the
   * cursor and a click drops the component there.
   */
  placingType: string | null;

  // Phase 6.1 — wire reroute in flight + dialogs ──────────────────────────
  reroute: RerouteState | null;
  pendingDeletion: PendingDeletion | null;
  settingsOpen: boolean;
  /** Which tab is active when the settings modal opens. */
  settingsTab: string | null;
  /** ID of the component currently hovered (drives tooltips). */
  hoveredComponentId: string | null;
  /** Phase 6.4: Import/Export modal open state. */
  importExportOpen: boolean;
  /** Phase 6.5: Centered menu overlay open state. */
  menuOpen: boolean;
  /** Phase 6.5.1: Documentation page open + optional scroll target. */
  docsOpen: boolean;
  docsScrollTo: string | null;
  /** Phase 6.6: Contact modal open state. */
  contactOpen: boolean;
  /** Guided circuit template chooser open state. */
  templatesOpen: boolean;
  /** Loaded guided circuit whose checklist is currently shown. */
  activeGuideId: string | null;
  /** Challenge Mode panel mounted (plan §32). Session state lives in challengeStore. */
  challengeOpen: boolean;
  /** Intro explainer shown the first time Challenge Mode is selected. */
  challengeIntroOpen: boolean;
  /** True while an active or completed Challenge Mode session should be visible. */
  challengeModeActive: boolean;
  /** True while Challenge Mode is paused and the editor is temporarily locked. */
  challengePaused: boolean;
  /** Allowed palette types for the active challenge; null when unrestricted/normal. */
  challengeAllowedComponents: string[] | null;
  /** Attempt id used by autosave to keep challenge edits out of the normal key. */
  challengeAttemptId: string | null;
  /** Selected failing rule and its concrete canvas targets. */
  challengeRuleFocus: ChallengeRuleFocus | null;
  /** Diagnosis Lab panel mounted (plan §32). Session state lives in diagnosisStore. */
  diagnosisOpen: boolean;
  /**
   * A Diagnosis Lab exercise is currently being solved (plan §14).
   *
   * Mirrored here, rather than read from `diagnosisStore`, purely so the
   * eagerly-loaded simulation hook can honour §14 ("never name the fault")
   * without importing the diagnosis store — that import dragged the entire
   * challenge generator into the first-paint bundle. `diagnosisStore` owns the
   * truth and pushes changes here; nothing else may write it.
   */
  diagnosisActive: boolean;
  /**
   * The active guide's checklist is temporarily hidden so the canvas it
   * overlays becomes reachable again. Distinct from `activeGuideId: null`
   * (which ENDS the guide): hidden guides keep tracking progress and offer a
   * floating "Show guide steps" pill to return.
   */
  guideHidden: boolean;
  /** First-visit welcome modal open state. */
  welcomeOpen: boolean;
  /** One-time phone advisory shown before the first-visit welcome. */
  mobileSuitabilityOpen: boolean;
  /** Phase 6.5.2: Right-click context menu. */
  contextMenu: ContextMenuState | null;
  /** Phase 6.2.3: rubber-band drag-rect for multi-select (world-space coords). */
  dragRect: { x1: number; y1: number; x2: number; y2: number } | null;
  /** Smart alignment guidelines active during component drag (world X and/or Y). */
  alignmentGuides: { x?: number; y?: number } | null;
  /** Spatial undo/redo indicator at canvas coordinates. */
  spatialIndicator: { x: number; y: number; kind: 'undo' | 'redo'; timestamp: number } | null;
  /** Phase 7: custom-path wire being drawn (null when idle). */
  pendingCustomPath: PendingCustomPath | null;

  /** Variant preview mode: hovered variant type to show ghosted on canvas. */
  previewVariantType: string | null;
  /** Component ID associated with the previewed variant. */
  previewComponentId: string | null;

  /** Active component technical specifications modal (type string or null). */
  activeComponentInfoType: string | null;

  /** Event history panel open state. */
  eventHistoryOpen: boolean;

  /** Circuit validation report. */
  validationReport: ValidationReport | null;

  /** True when the circuit changed after the current report was generated. */
  validationStale: boolean;

  /** Circuit validation loading spinner state. */
  isValidatingCircuit: boolean;

  /** Selected validation issue for the 'View Details' modal. */
  activeValidationIssueModal: ValidationIssue | null;

  /** Active tab in Inspector panel ('properties' | 'connections' | 'simulation' | 'analytics' | 'validation' | 'logs' | 'history' | 'faultlab'). */
  activeInspectorTab:
    | 'properties'
    | 'connections'
    | 'simulation'
    | 'analytics'
    | 'validation'
    | 'logs'
    | 'history'
    | 'faultlab';

  /** Visual feedback mode: when true and a wire/component is selected, dims all unselected parts and highlights the traced path. */
  tracePathMode: boolean;

  /** True after Pro Run was stopped by blocking regulation issues. */
  complianceGateBlocked: boolean;

  // Panel layout (Lab Glass · Light shell) ────────────────────────────────
  paletteOpen: boolean;
  logOpen: boolean;
  inspectorOpen: boolean;
  inspectorCollapsed: boolean;
  /** Workbench experiment: command palette (Ctrl+K) open flag. */
  commandPaletteOpen: boolean;
  /** Workbench experiment: dedicated Fault Lab panel open flag. */
  faultLabOpen: boolean;
  /**
   * Fault-injection choreography: while a manual injection animation is
   * playing on the canvas this holds the *pending* fault; the circuit store
   * commit happens when the animation's lead time expires. `nonce` makes
   * each injection distinguishable so stale timers never commit.
   */
  pendingFaultFx: {
    target: { componentId: string } | { wireId: string };
    type: FaultType;
    nonce: number;
  } | null;
  /** Keyboard shortcuts overlay (? key). */
  shortcutsOpen: boolean;
  /** Interactive tutorial: active tour id (null = no tour running). */
  tourId: 'student' | 'pro' | null;
  /** Interactive tutorial: zero-based index into the active tour's steps. */
  tourStep: number;
  /**
   * The circuit that was on the canvas when the active tour started, saved
   * so the finish prompt can offer to restore it. Null when the canvas was
   * empty (or held only the untouched demo seed) at tour start.
   */
  tourCircuitBackup: Circuit | null;
  /**
   * App mode captured when the active tour started. The tour switches the
   * workbench to the mode it teaches (Student → basic, Pro → pro) and this
   * is restored on `endTour` unless the user changed the mode themselves.
   */
  tourOriginalAppMode: 'basic' | 'pro' | null;
  /** A transient undo toast, e.g. after a delete. { message, id }. */
  undoToast: { message: string; id: number; showUndo?: boolean } | null;

  // Actions ───────────────────────────────────────────────────────────────
  setSimRunning: (v: boolean) => void;
  toggleSim: () => void;
  /** Pro teacher/demo escape hatch; physical damage remains non-bypassable. */
  runWithComplianceOverride: () => void;
  setSimResult: (r: SimulationResult | null) => void;
  setFaultAlert: (alert: ElectricalFaultAlert | null) => void;
  setWhatHappenedOpen: (open: boolean) => void;
  clearFaultAlert: () => void;
  addLog: (message: string, type: LogLevel) => void;
  clearLogs: () => void;
  /** Add an event to the event history */
  addEventHistory: (entry: Omit<EventHistoryEntry, 'id' | 'timestamp'>) => void;
  /** Clear the event history */
  clearEventHistory: () => void;
  setEventHistoryOpen: (open: boolean) => void;
  setValidationReport: (report: ValidationReport | null) => void;
  runCircuitValidation: () => void;
  setActiveValidationIssueModal: (issue: ValidationIssue | null) => void;
  setActiveInspectorTab: (
    tab:
      | 'properties'
      | 'connections'
      | 'simulation'
      | 'analytics'
      | 'validation'
      | 'logs'
      | 'history'
      | 'faultlab',
  ) => void;
  setTracePathMode: (active: boolean) => void;
  toggleTracePathMode: () => void;
  applyQuickFix: (action: QuickFixAction) => void;
  setMode: (m: InteractionMode) => void;
  togglePalette: () => void;
  toggleLog: () => void;
  toggleInspector: () => void;
  setPaletteOpen: (open: boolean) => void;
  setLogOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;
  toggleCommandPalette: () => void;
  setFaultLabOpen: (open: boolean) => void;
  toggleFaultLab: () => void;
  /**
   * Choreographed manual fault injection: arms the canvas pre-commit
   * animation (e.g. fire sparks before a short circuit lands), then commits
   * the fault to the circuit store once the lead time elapses. Under
   * `prefers-reduced-motion` the fault commits immediately. Works for both
   * component and wire targets.
   */
  beginFaultInjection: (
    type: FaultType,
    target: { componentId: string } | { wireId: string },
  ) => void;
  /** Abandon a pending (not yet committed) injection animation. */
  clearPendingFaultFx: () => void;
  setShortcutsOpen: (open: boolean) => void;
  toggleShortcuts: () => void;
  /** Interactive tutorial controls. */
  startTour: (id: 'student' | 'pro') => void;
  endTour: () => void;
  setTourStep: (step: number) => void;
  showUndoToast: (message: string) => void;
  /** Toast without an Undo button — informational notices. */
  showNoticeToast: (message: string) => void;
  clearUndoToast: () => void;
  setInspectorOpen: (open: boolean) => void;
  setInspectorCollapsed: (collapsed: boolean) => void;
  setPendingWireFrom: (p: PortRef | null) => void;
  setPlacingType: (type: string | null) => void;
  setReroute: (r: RerouteState | null) => void;
  setPendingDeletion: (d: PendingDeletion | null) => void;
  setSettingsOpen: (open: boolean, tab?: string | null) => void;
  setHoveredComponentId: (id: string | null) => void;
  setImportExportOpen: (open: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setDocsOpen: (open: boolean, scrollTo?: string | null) => void;
  setContactOpen: (open: boolean) => void;
  setTemplatesOpen: (open: boolean) => void;
  setChallengeOpen: (open: boolean) => void;
  /** Open Challenge Mode from the menu and show its explainer first. */
  openChallengeMode: () => void;
  setChallengeIntroOpen: (open: boolean) => void;
  /** Mirrored by declarativeChallengeStore so hidden sessions stay identifiable. */
  setChallengeModeActive: (active: boolean) => void;
  /** Mirrored by declarativeChallengeStore so the eager editor can lock itself. */
  setChallengePaused: (paused: boolean) => void;
  /** Mirrored by declarativeChallengeStore so the eager palette can stay lean. */
  setChallengeAllowedComponents: (types: readonly string[] | null) => void;
  setChallengeAttemptId: (attemptId: string | null) => void;
  setChallengeRuleFocus: (focus: ChallengeRuleFocus | null) => void;
  setDiagnosisOpen: (open: boolean) => void;
  /** Set by `diagnosisStore` only — see {@link UiState.diagnosisActive}. */
  setDiagnosisActive: (active: boolean) => void;
  setActiveGuideId: (id: string | null) => void;
  setGuideHidden: (hidden: boolean) => void;
  setWelcomeOpen: (open: boolean) => void;
  dismissMobileSuitability: () => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setDragRect: (rect: { x1: number; y1: number; x2: number; y2: number } | null) => void;
  setAlignmentGuides: (guides: { x?: number; y?: number } | null) => void;
  setSpatialIndicator: (
    indicator: { x: number; y: number; kind: 'undo' | 'redo'; timestamp: number } | null,
  ) => void;
  triggerSpatialIndicator: (x: number, y: number, kind: 'undo' | 'redo') => void;
  /** Phase 7: start a new custom path from the given port. */
  startCustomPath: (from: PortRef) => void;
  /** Phase 7: append a canvas-space checkpoint to the in-flight path. */
  addCustomPathCheckpoint: (pt: Point2D) => void;
  /** Phase 7: cancel (Esc) — discard the in-flight custom path. */
  cancelCustomPath: () => void;
  setPreviewVariant: (type: string | null, componentId?: string | null) => void;
  setActiveComponentInfoType: (type: string | null) => void;
}
