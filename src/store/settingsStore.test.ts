/**
 * settingsStore.test.ts — Phase 6.1.
 *
 * Mirrors the in-memory `idb-keyval` mock used by `persistence.test.ts`
 * so we can exercise hydrate + autosave without touching real IndexedDB.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mem = new Map<string, unknown>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mem.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (value === undefined) mem.delete(key);
    else mem.set(key, value);
  }),
}));

import {
  __SETTINGS_DEFAULTS,
  __SETTINGS_STORAGE_KEY,
  __parsePersistedSettings,
  clearPersistedSettings,
  getSettingsSnapshot,
  sanitizeSettingsPayload,
  startSettingsPersistence,
  useSettingsStore,
} from './settingsStore';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('settingsStore — Phase 6.1', () => {
  beforeEach(async () => {
    mem.clear();
    await clearPersistedSettings();
    // Reset internal `started` flag by re-importing? We can't, so the
    // first test sets up the subscription and subsequent tests reuse it
    // — that's fine because subscriptions are idempotent for our purpose.
    await startSettingsPersistence();
  });

  it('starts with documented defaults', () => {
    const s = useSettingsStore.getState();
    expect(s.confirmDelete).toBe(__SETTINGS_DEFAULTS.confirmDelete);
    expect(s.showTooltips).toBe(__SETTINGS_DEFAULTS.showTooltips);
    expect(s.currentFlowAnimation).toBe(__SETTINGS_DEFAULTS.currentFlowAnimation);
    expect(s.activeLoadEffects).toBe(__SETTINGS_DEFAULTS.activeLoadEffects);
  });

  it('hydrates only whitelisted settings with valid primitive and enum values', () => {
    const parsed = __parsePersistedSettings({
      version: 1,
      settings: {
        confirmDelete: false,
        showTooltips: false,
        currentFlowAnimation: false,
        activeLoadEffects: false,
        colorScheme: 'dark',
        routingStyle: 'bezier',
        reducedEffects: true,
        customWiringMode: true,
        showGrid: false,
        showMiniMap: false,
        canvasPreset: 'high-contrast',
        injected: 'must not survive',
      },
    });

    expect(parsed).toEqual({
      confirmDelete: false,
      showTooltips: false,
      currentFlowAnimation: false,
      activeLoadEffects: false,
      colorScheme: 'dark',
      routingStyle: 'bezier',
      reducedEffects: true,
      customWiringMode: true,
      showGrid: false,
      snapToGrid: true,
      smartAlignmentGuides: true,
      showMiniMap: false,
      showRecentComponents: true,
      appMode: 'basic',
      canvasPreset: 'high-contrast',
      wireColorStandard: 'uk_eu',
      automaticComponentLabels: true,
      diagnosticOverlayMode: 'off',
      regulationStandard: 'int',
      manualFaultInjection: true,
      autoWireJoints: false,
      plugSystem: 'bs1363',
      // A stored blob that predates Ohmageddon must hydrate it OFF (plan §23).
      ohmageddonMode: false,
      paletteOpen: true,
      inspectorCollapsed: true,
      logOpen: false,
      recentComponents: [],
    });

    expect(parsed).not.toHaveProperty('injected');
  });

  it('falls back field-by-field for missing or invalid stored settings', () => {
    const parsed = __parsePersistedSettings({
      version: 1,
      settings: {
        confirmDelete: 'no',
        colorScheme: 'sepia',
        routingStyle: 42,
        reducedEffects: null,
        showGrid: false,
        canvasPreset: 'unknown',
      },
    });

    expect(parsed).toEqual({ ...__SETTINGS_DEFAULTS, showGrid: false });
    // v1 blobs still hydrate (forward-compat onto v2 defaults); unknown
    // versions are rejected; malformed payloads are rejected.
    expect(__parsePersistedSettings({ version: 1, settings: {} })).toEqual(__SETTINGS_DEFAULTS);
    expect(__parsePersistedSettings({ version: 99, settings: {} })).toBeNull();
    expect(__parsePersistedSettings({ version: 2, settings: [] })).toBeNull();
  });

  it('migrates legacy overlay booleans and preserves a valid new mode', () => {
    expect(
      __parsePersistedSettings({
        version: 2,
        settings: { thermalOverlayEnabled: true },
      })?.diagnosticOverlayMode,
    ).toBe('heat');
    expect(
      __parsePersistedSettings({
        version: 2,
        settings: { thermalOverlayEnabled: true, stressZonesEnabled: true },
      })?.diagnosticOverlayMode,
    ).toBe('heat-vdrop');
    expect(
      __parsePersistedSettings({
        version: 2,
        settings: {
          diagnosticOverlayMode: 'off',
          thermalOverlayEnabled: true,
          stressZonesEnabled: true,
        },
      })?.diagnosticOverlayMode,
    ).toBe('off');
  });

  it('hydrates the International regulation standard', () => {
    const parsed = __parsePersistedSettings({
      version: 2,
      settings: { regulationStandard: 'int' },
    });
    expect(parsed?.regulationStandard).toBe('int');
  });

  it('keeps the physical plug system independent when the regulation standard changes', () => {
    useSettingsStore.setState({ regulationStandard: 'uk', plugSystem: 'schuko' });

    useSettingsStore.getState().setSetting('regulationStandard', 'us');

    expect(useSettingsStore.getState()).toMatchObject({
      regulationStandard: 'us',
      plugSystem: 'schuko',
    });
  });

  it('debounce-saves toggled values to IDB', async () => {
    useSettingsStore.getState().setSetting('confirmDelete', false);
    useSettingsStore.getState().setSetting('showTooltips', false);

    await wait(220);

    const saved = mem.get(__SETTINGS_STORAGE_KEY) as
      | { version: number; settings: Record<string, boolean> }
      | undefined;
    expect(saved).toBeDefined();
    expect(saved?.version).toBe(2);
    expect(saved?.settings.confirmDelete).toBe(false);
    expect(saved?.settings.showTooltips).toBe(false);
    expect(saved?.settings.currentFlowAnimation).toBe(true);
  });

  it('flushes pending settings on pagehide', async () => {
    useSettingsStore.getState().setSetting('showMiniMap', false);

    window.dispatchEvent(new Event('pagehide'));
    await wait(0);

    const saved = mem.get(__SETTINGS_STORAGE_KEY) as
      | { settings: Record<string, boolean> }
      | undefined;
    expect(saved?.settings.showMiniMap).toBe(false);
  });

  it('resetSettings restores defaults', () => {
    useSettingsStore.getState().setSetting('confirmDelete', false);
    useSettingsStore.getState().setSetting('activeLoadEffects', false);
    useSettingsStore.getState().resetSettings();
    expect(useSettingsStore.getState().confirmDelete).toBe(true);
    expect(useSettingsStore.getState().activeLoadEffects).toBe(true);
  });

  it('records recent components, de-duplicating and capping at 6', () => {
    useSettingsStore.getState().recordRecentComponent('bulb');
    useSettingsStore.getState().recordRecentComponent('mcb');
    useSettingsStore.getState().recordRecentComponent('bulb'); // move to front
    useSettingsStore.getState().recordRecentComponent('socket-3pin');
    useSettingsStore.getState().recordRecentComponent('motor');
    useSettingsStore.getState().recordRecentComponent('rcd');
    useSettingsStore.getState().recordRecentComponent('fan');
    useSettingsStore.getState().recordRecentComponent('fuse'); // 7th

    const recents = useSettingsStore.getState().recentComponents;
    expect(recents).toHaveLength(6);
    expect(recents[0]).toBe('fuse');
    expect(recents.filter((t) => t === 'bulb')).toHaveLength(1); // de-duped
  });
});

describe('settingsStore — backup support', () => {
  it('sanitizeSettingsPayload rebuilds untrusted data through the whitelist', () => {
    const sanitised = sanitizeSettingsPayload({
      colorScheme: 'dark',
      canvasPreset: 'neon-matrix', // invalid enum → default
      showGrid: false,
      injected: 'must not survive',
    });
    expect(sanitised).not.toBeNull();
    expect(sanitised?.colorScheme).toBe('dark');
    expect(sanitised?.canvasPreset).toBe(__SETTINGS_DEFAULTS.canvasPreset);
    expect(sanitised?.showGrid).toBe(false);
    expect('injected' in (sanitised ?? {})).toBe(false);
  });

  it('applySettings replaces every preference with the given snapshot', () => {
    const before = getSettingsSnapshot();
    useSettingsStore.getState().applySettings({
      ...before,
      colorScheme: 'dark',
      showGrid: false,
      appMode: 'pro',
    });

    const s = useSettingsStore.getState();
    expect(s.colorScheme).toBe('dark');
    expect(s.showGrid).toBe(false);
    expect(s.appMode).toBe('pro');
    // Unrelated fields keep the snapshot values.
    expect(s.confirmDelete).toBe(before.confirmDelete);
  });

  it('getSettingsSnapshot reflects live state', () => {
    useSettingsStore.getState().setSetting('showTooltips', false);
    expect(getSettingsSnapshot().showTooltips).toBe(false);
  });
});
