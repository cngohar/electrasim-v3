/**
 * settingsStore — user preferences (Phase 6.1).
 *
 * Persisted to IndexedDB so settings survive reloads and offline use, the
 * same way the circuit graph does. Until auth lands (Phase 9), this is the
 * single source of truth for per-device user preferences.
 *
 * Keep this slice **small and additive**. Every flag here has to be:
 *   - Boolean or a primitive enum (so the UI is a simple checkbox/select).
 *   - Forward-compatible — new flags get a default; old saved blobs without
 *     them just inherit the default on load.
 *   - Independently testable.
 *
 * Storage:
 *   key   = `electrasim:settings:v1`
 *   value = { version: 1, settings: { ... } }
 *
 * Hydration is fire-and-forget at module load; reads of `useSettingsStore`
 * before the IDB round-trip resolves return defaults — that's intentional
 * (defaults are sane). The first user mutation flushes the merged state.
 */

import type { PlugSystemId, StandardId } from '@electrasim/domain/standards';
import { get, set } from 'idb-keyval';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const SCHEMA_VERSION = 2 as const;
const STORAGE_KEY = `electrasim:settings:v${SCHEMA_VERSION}`;
const DEBOUNCE_MS = 150;

export type ColorScheme = 'light' | 'dark' | 'system';
export type RoutingStyle = 'orthogonal' | 'bezier';
export type WireColorStandard = 'uk_eu' | 'us';
/** Unified canvas diagnostics: thermal load alone, or thermal load plus voltage drop. */
export type DiagnosticOverlayMode = 'off' | 'heat' | 'heat-vdrop';

export interface UserSettings {
  /** Show a confirmation dialog before deleting components or wires. */
  confirmDelete: boolean;
  /** Render tooltips on component hover. */
  showTooltips: boolean;
  /** Animate dashes along energised wires to suggest current direction. */
  currentFlowAnimation: boolean;
  /** Visually emphasise active loads (bulb glow, fan spin, motor pulse). */
  activeLoadEffects: boolean;
  /** Illustrative sag, snap and overload accents; never changes electrical results. */
  physicsEffects: boolean;
  /** Phase 6.8: Color scheme preference. */
  colorScheme: ColorScheme;
  /**
   * Phase 6.2: default style for *new* wires. Existing wires keep their
   * own `pathKind` (PLAN.md §8.2 SR1 — additive coexistence).
   *   - `'orthogonal'` (default) — Manhattan path with obstacle avoidance.
   *   - `'bezier'`                — legacy smooth curve.
   */
  routingStyle: RoutingStyle;
  /**
   * Phase 6.2.2: low-end / battery-saver mode. Suppresses the SVG-filter
   * driven glow halos and the wire-flow stroke-dashoffset animation, both
   * of which trigger per-frame software rasterisation of `feGaussianBlur`
   * on Chromium and dominate CPU on weak hardware. The renderer also
   * auto-enables this when component count exceeds the stress threshold,
   * so users on dense circuits get the perf protection without flipping a
   * setting. Color/opacity/width energised cues stay on regardless.
   */
  reducedEffects: boolean;
  /**
   * Phase 7: opt-in paint-style multi-step wire placement.
   * When true, clicking a port starts a polyline; each subsequent canvas
   * click adds a corner; clicking the destination port commits the whole
   * path as one atomic undo entry. Default off.
   */
  customWiringMode: boolean;
  /**
   * Phase 6.3-slim: hide the dot grid on the canvas.
   * Default true. Toggled in Settings → Display.
   */
  showGrid: boolean;
  /**
   * Snap components to the grid on placement and drag-commit.
   * Default true. Toggled from the Snap/Grid cluster in the status bar.
   */
  snapToGrid: boolean;
  /**
   * Smart alignment guidelines: show magnetic alignment rays when dragging components
   * that line up with other components on the canvas.
   * Default true.
   */
  smartAlignmentGuides: boolean;
  /**
   * Phase 6.3-slim: show the mini-map thumbnail overlay.
   * Default true.
   */
  showMiniMap: boolean;
  /**
   * Application mode:
   *   - 'basic' — Student Mode: simplified domestic circuit building with guidance.
   *   - 'pro'   — Pro Electrician Mode: full household & commercial components, cable sizing, voltage drop, BS 7671 notes.
   */
  appMode: 'basic' | 'pro';
  /**
   * Phase 6.3-slim: high-contrast / colour-blind canvas preset.
   *   - 'default'      — standard Lab Glass palette
   *   - 'high-contrast' — black background, bold wires, larger port dots
   *   - 'deuteranopia' — red/blue replaced by orange/purple (no green reliance)
   */
  canvasPreset: 'default' | 'high-contrast' | 'deuteranopia';
  /**
   * Regional wire color standard:
   *   - 'uk_eu' — Live = Brown, Neutral = Blue, Earth = Green/Yellow (BS 7671 / IEC)
   *   - 'us'    — Live = Black/Red, Neutral = White/Gray, Earth = Green/Bare (NEC)
   */
  wireColorStandard: WireColorStandard;
  /**
   * Show automatic component labels prefixed with type (e.g., 'Bulb 1', 'MCB1').
   * Default true. Labels refresh when components are moved or deleted.
   */
  automaticComponentLabels: boolean;
  /**
   * Unified Pro diagnostics overlay. `heat` shows thermal loading while
   * `heat-vdrop` also factors in the active standard's voltage-drop limits.
   */
  diagnosticOverlayMode: DiagnosticOverlayMode;
  /**
   * Active international regulatory template (UK BS 7671, US NEC, EU IEC 60364).
   * Drives nominal voltage, wire colours, voltage-drop limits and MCB-curve
   * recommendations in the Pro compliance engine.
   */
  regulationStandard: StandardId;
  /**
   * Pro-mode only. When true the Inspector exposes manual fault-injection
   * buttons (open circuit, short, reverse polarity, earth fault, etc.).
   * Student mode always hides these regardless of this flag; pro users can
   * flip it off to keep the canvas clean while designing.
   */
  manualFaultInjection: boolean;
  /**
   * Automatically place a connection joint (dot) wherever two bezier wires
   * cross each other. This visually marks the crossing as an intentional
   * junction (a common schematic convention). Default off. Toggled in
   * Settings → Editing.
   */
  autoWireJoints: boolean;
  /**
   * Regional plug / socket system. Independent of the electrical standard —
   * controls which socket tiles show in the palette. One of 'bs1363' |
   * 'nema5' | 'schuko' | 'as3112' | 'bs546' | 'all'. Persisted.
   */
  plugSystem: PlugSystemId;
  /**
   * Ohmageddon Mode (plan §23, §24).
   *
   * OFF by default and never enabled implicitly. When off the Diagnosis Lab
   * offers ordinary educational exercises only — no red herrings, no remote
   * faults, no rationed hints. When on, the rage tiers become *eligible*, and
   * the UI is required to say so (§24: "Do not hide the fact that the mode is
   * active").
   *
   * The flag gates nothing electrical. Ohmageddon changes which scenario is
   * built, never how the simulator behaves (§26).
   */
  ohmageddonMode: boolean;
  /** Panel layout persistence — remembered across reloads. */
  paletteOpen: boolean;
  inspectorCollapsed: boolean;
  logOpen: boolean;
  /** Recently placed component types (max ~6) — shown at the top of the palette. */
  recentComponents: string[];
  /** Show the "Recent" quick-access row at the top of the palette. */
  showRecentComponents: boolean;
}

const DEFAULTS: UserSettings = {
  confirmDelete: true,
  showTooltips: true,
  currentFlowAnimation: true,
  activeLoadEffects: true,
  physicsEffects: true,
  colorScheme: 'light',
  routingStyle: 'orthogonal',
  reducedEffects: false,
  customWiringMode: false,
  showGrid: true,
  snapToGrid: true,
  smartAlignmentGuides: true,
  showMiniMap: true,
  appMode: 'basic',
  canvasPreset: 'default',
  wireColorStandard: 'uk_eu',
  automaticComponentLabels: true,
  diagnosticOverlayMode: 'off',
  // Generic IEC teaching profile; no national-equivalence claim. An explicit region choice made in Pro mode is
  // user data and persists across mode switches — Student mode locks the
  // selector but never resets a chosen region.
  regulationStandard: 'int',
  manualFaultInjection: true,
  autoWireJoints: false,
  plugSystem: 'bs1363',
  // §23: "It is NOT enabled by default."
  ohmageddonMode: false,
  paletteOpen: true,
  inspectorCollapsed: true,
  logOpen: false,
  recentComponents: [],
  showRecentComponents: true,
};

interface SettingsState extends UserSettings {
  /** True once the IDB hydrate round-trip has completed. */
  hydrated: boolean;
  setSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  resetSettings: () => void;
  /** Replace every preference with a validated (whitelisted) settings object. */
  applySettings: (settings: UserSettings) => void;
  /** Record a placed component type in the recents (dedup, cap at 6). */
  recordRecentComponent: (type: string) => void;
}

interface PersistedSettings {
  version: typeof SCHEMA_VERSION;
  settings: UserSettings;
}

const COLOR_SCHEMES = ['light', 'dark', 'system'] as const;
const ROUTING_STYLES = ['orthogonal', 'bezier'] as const;
const CANVAS_PRESETS = ['default', 'high-contrast', 'deuteranopia'] as const;
const WIRE_COLOR_STANDARDS = ['uk_eu', 'us'] as const;
const REGULATION_STANDARDS = ['uk', 'us', 'eu', 'int'] as const;
const DIAGNOSTIC_OVERLAY_MODES = ['off', 'heat', 'heat-vdrop'] as const;

const APP_MODES = ['basic', 'pro'] as const;

function booleanOrDefault(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function enumOrDefault<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;
}

/** Rebuild untrusted IndexedDB data from the current whitelist and defaults. */
function parsePersistedSettings(value: unknown): UserSettings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const payload = value as Record<string, unknown>;
  // v1 blobs (pre-standards feature) hydrate onto the v2 defaults so existing
  // users aren't logged out of their saved preferences when we ship new flags.
  if (payload.version !== 1 && payload.version !== SCHEMA_VERSION) return null;
  if (
    !payload.settings ||
    typeof payload.settings !== 'object' ||
    Array.isArray(payload.settings)
  ) {
    return null;
  }
  const stored = payload.settings as Record<string, unknown>;

  return {
    confirmDelete: booleanOrDefault(stored.confirmDelete, DEFAULTS.confirmDelete),
    showTooltips: booleanOrDefault(stored.showTooltips, DEFAULTS.showTooltips),
    currentFlowAnimation: booleanOrDefault(
      stored.currentFlowAnimation,
      DEFAULTS.currentFlowAnimation,
    ),
    activeLoadEffects: booleanOrDefault(stored.activeLoadEffects, DEFAULTS.activeLoadEffects),
    physicsEffects: booleanOrDefault(stored.physicsEffects, DEFAULTS.physicsEffects),
    colorScheme: enumOrDefault(stored.colorScheme, COLOR_SCHEMES, DEFAULTS.colorScheme),
    routingStyle: enumOrDefault(stored.routingStyle, ROUTING_STYLES, DEFAULTS.routingStyle),
    reducedEffects: booleanOrDefault(stored.reducedEffects, DEFAULTS.reducedEffects),
    customWiringMode: booleanOrDefault(stored.customWiringMode, DEFAULTS.customWiringMode),
    showGrid: booleanOrDefault(stored.showGrid, DEFAULTS.showGrid),
    snapToGrid: booleanOrDefault(stored.snapToGrid, DEFAULTS.snapToGrid),
    smartAlignmentGuides: booleanOrDefault(
      stored.smartAlignmentGuides,
      DEFAULTS.smartAlignmentGuides,
    ),
    showMiniMap: booleanOrDefault(stored.showMiniMap, DEFAULTS.showMiniMap),
    appMode: enumOrDefault(stored.appMode, APP_MODES, DEFAULTS.appMode),
    canvasPreset: enumOrDefault(stored.canvasPreset, CANVAS_PRESETS, DEFAULTS.canvasPreset),
    wireColorStandard: enumOrDefault(
      stored.wireColorStandard,
      WIRE_COLOR_STANDARDS,
      DEFAULTS.wireColorStandard,
    ),
    automaticComponentLabels: booleanOrDefault(
      stored.automaticComponentLabels,
      DEFAULTS.automaticComponentLabels,
    ),
    diagnosticOverlayMode: enumOrDefault(
      stored.diagnosticOverlayMode,
      DIAGNOSTIC_OVERLAY_MODES,
      // Migrate the two legacy booleans into one persisted three-state setting.
      stored.stressZonesEnabled === true
        ? 'heat-vdrop'
        : stored.thermalOverlayEnabled === true
          ? 'heat'
          : DEFAULTS.diagnosticOverlayMode,
    ),
    regulationStandard: enumOrDefault(
      stored.regulationStandard,
      REGULATION_STANDARDS,
      DEFAULTS.regulationStandard,
    ),
    manualFaultInjection: booleanOrDefault(
      stored.manualFaultInjection,
      DEFAULTS.manualFaultInjection,
    ),
    autoWireJoints: booleanOrDefault(stored.autoWireJoints, DEFAULTS.autoWireJoints),
    plugSystem: (
      ['bs1363', 'nema5', 'schuko', 'as3112', 'bs546', 'all'] as PlugSystemId[]
    ).includes(stored.plugSystem as PlugSystemId)
      ? (stored.plugSystem as PlugSystemId)
      : DEFAULTS.plugSystem,
    ohmageddonMode: booleanOrDefault(stored.ohmageddonMode, DEFAULTS.ohmageddonMode),
    paletteOpen: booleanOrDefault(stored.paletteOpen, DEFAULTS.paletteOpen),
    inspectorCollapsed: booleanOrDefault(stored.inspectorCollapsed, DEFAULTS.inspectorCollapsed),
    logOpen: booleanOrDefault(stored.logOpen, DEFAULTS.logOpen),
    recentComponents: Array.isArray(stored.recentComponents)
      ? stored.recentComponents.filter((t) => typeof t === 'string').slice(0, 6)
      : DEFAULTS.recentComponents,
    showRecentComponents: booleanOrDefault(
      stored.showRecentComponents,
      DEFAULTS.showRecentComponents,
    ),
  };
}

export const useSettingsStore = create<SettingsState>()(
  immer<SettingsState>((set) => ({
    ...DEFAULTS,
    hydrated: false,

    setSetting: (key, value) =>
      set((s) => {
        // immer-typed dynamic-key write; safe because K extends keyof UserSettings.
        (s as unknown as UserSettings)[key] = value;
      }),

    resetSettings: () =>
      set((s) => {
        Object.assign(s, DEFAULTS);
      }),
    applySettings: (settings) =>
      set((s) => {
        // `settings` must already be whitelist-sanitised (see
        // `sanitizeSettingsPayload` / the backup importer); every key it
        // carries exists on UserSettings with a validated value.
        Object.assign(s, settings);
      }),
    recordRecentComponent: (type) =>
      set((s) => {
        s.recentComponents = [type, ...s.recentComponents.filter((t) => t !== type)].slice(0, 6);
      }),
  })),
);

// ─── Persistence ───────────────────────────────────────────────────────────

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSaveError = '';
let pendingSnapshot: UserSettings | null = null;

async function persistSettings(snapshot: UserSettings): Promise<void> {
  const payload: PersistedSettings = { version: SCHEMA_VERSION, settings: snapshot };
  try {
    await set(STORAGE_KEY, payload);
    lastSaveError = '';
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message !== lastSaveError) {
      console.warn('[settings] save failed:', message);
      lastSaveError = message;
    }
  }
}

function flushPendingSettings() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  if (!pendingSnapshot) return;
  const value = pendingSnapshot;
  pendingSnapshot = null;
  void persistSettings(value);
}

function snapshot(state: SettingsState): UserSettings {
  return {
    confirmDelete: state.confirmDelete,
    showTooltips: state.showTooltips,
    currentFlowAnimation: state.currentFlowAnimation,
    activeLoadEffects: state.activeLoadEffects,
    physicsEffects: state.physicsEffects,
    colorScheme: state.colorScheme,
    routingStyle: state.routingStyle,
    reducedEffects: state.reducedEffects,
    customWiringMode: state.customWiringMode,
    showGrid: state.showGrid,
    snapToGrid: state.snapToGrid,
    smartAlignmentGuides: state.smartAlignmentGuides,
    showMiniMap: state.showMiniMap,
    appMode: state.appMode,
    canvasPreset: state.canvasPreset,
    wireColorStandard: state.wireColorStandard,
    automaticComponentLabels: state.automaticComponentLabels,
    diagnosticOverlayMode: state.diagnosticOverlayMode,
    regulationStandard: state.regulationStandard,
    manualFaultInjection: state.manualFaultInjection,
    autoWireJoints: state.autoWireJoints,
    plugSystem: state.plugSystem,
    ohmageddonMode: state.ohmageddonMode,
    paletteOpen: state.paletteOpen,
    inspectorCollapsed: state.inspectorCollapsed,
    logOpen: state.logOpen,
    recentComponents: state.recentComponents,
    showRecentComponents: state.showRecentComponents,
  };
}

/**
 * Hydrate settings from IDB and start the autosave subscription.
 * Idempotent — calling twice is a no-op for the second call.
 */
let started = false;
export async function startSettingsPersistence(): Promise<void> {
  if (started) return;
  started = true;

  try {
    const raw = await get(STORAGE_KEY);
    const stored = parsePersistedSettings(raw);
    useSettingsStore.setState({ ...(stored ?? DEFAULTS), hydrated: true });
  } catch (err) {
    console.warn('[settings] hydrate failed, using defaults:', err);
    useSettingsStore.setState({ ...DEFAULTS, hydrated: true });
  }

  useSettingsStore.subscribe((state, prev) => {
    // Skip writes triggered purely by the hydrated flag flipping.
    if (
      state.confirmDelete === prev.confirmDelete &&
      state.showTooltips === prev.showTooltips &&
      state.currentFlowAnimation === prev.currentFlowAnimation &&
      state.activeLoadEffects === prev.activeLoadEffects &&
      state.physicsEffects === prev.physicsEffects &&
      state.colorScheme === prev.colorScheme &&
      state.routingStyle === prev.routingStyle &&
      state.reducedEffects === prev.reducedEffects &&
      state.customWiringMode === prev.customWiringMode &&
      state.showGrid === prev.showGrid &&
      state.snapToGrid === prev.snapToGrid &&
      state.smartAlignmentGuides === prev.smartAlignmentGuides &&
      state.showMiniMap === prev.showMiniMap &&
      state.appMode === prev.appMode &&
      state.canvasPreset === prev.canvasPreset &&
      state.wireColorStandard === prev.wireColorStandard &&
      state.automaticComponentLabels === prev.automaticComponentLabels &&
      state.diagnosticOverlayMode === prev.diagnosticOverlayMode &&
      state.regulationStandard === prev.regulationStandard &&
      state.manualFaultInjection === prev.manualFaultInjection &&
      state.autoWireJoints === prev.autoWireJoints &&
      state.plugSystem === prev.plugSystem &&
      state.ohmageddonMode === prev.ohmageddonMode &&
      state.paletteOpen === prev.paletteOpen &&
      state.inspectorCollapsed === prev.inspectorCollapsed &&
      state.logOpen === prev.logOpen &&
      state.showRecentComponents === prev.showRecentComponents &&
      state.recentComponents.length === prev.recentComponents.length &&
      state.recentComponents.every((t, i) => t === prev.recentComponents[i])
    ) {
      return;
    }
    if (saveTimer) clearTimeout(saveTimer);
    pendingSnapshot = snapshot(state);
    saveTimer = setTimeout(flushPendingSettings, DEBOUNCE_MS);
  });
  window.addEventListener('pagehide', flushPendingSettings);
}

/** Clear the persisted settings (tests + a "Reset to defaults" affordance). */
export async function clearPersistedSettings(): Promise<void> {
  useSettingsStore.setState({ ...DEFAULTS, hydrated: true });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  pendingSnapshot = null;
  try {
    await set(STORAGE_KEY, undefined);
  } catch (err) {
    console.warn('[settings] clear failed:', err);
  }
}

/**
 * Sanitise an untrusted settings payload against the same whitelist the
 * IndexedDB hydrate path uses. Returns a fresh, fully-typed UserSettings
 * object (unknown keys dropped, wrong types replaced by defaults) or null
 * when the payload is not an object at all. The backup importer feeds every
 * file through this — a malicious settings file can therefore never inject
 * values, types, or keys the app does not already support.
 */
export function sanitizeSettingsPayload(settings: unknown): UserSettings | null {
  return parsePersistedSettings({ version: SCHEMA_VERSION, settings });
}

/** Snapshot of the live preferences — used by the backup exporter. */
export function getSettingsSnapshot(): UserSettings {
  return snapshot(useSettingsStore.getState());
}

export const __SETTINGS_STORAGE_KEY = STORAGE_KEY;
export const __SETTINGS_DEFAULTS = DEFAULTS;
export const __parsePersistedSettings = parsePersistedSettings;
