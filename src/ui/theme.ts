/**
 * Lab Glass · Light theme tokens — the single source of visual truth for
 * the canvas + UI panels. Locked in Phase 0b (ADR 0001).
 */

import { getStandard } from '@electrasim/domain/standards';
import type { UserSettings } from '../store/settingsStore';
import type { CanvasTheme } from './CircuitCanvas';

export const labGlassLight: CanvasTheme = {
  bg: 'transparent',
  gridDot: '#e2e8f0',
  gridSize: 24,
  showGrid: true,
  isDark: false,
  wire: { live: '#ef4444', neutral: '#3b82f6', earth: '#10b981' },
  wireWidth: 2.25,
  wireGlow: false,
  wireDashIdle: true,
  component: {
    bg: 'rgba(255,255,255,0.92)',
    border: '#e2e8f0',
    text: '#0f172a',
    subtext: '#94a3b8',
    rounded: 10,
    shadow: false,
    accent: '#2563eb',
    selectedRing: '#2563eb',
  },
  port: { border: '#cbd5e1', bgIdle: '#ffffff' },
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
  monoFont: 'JetBrains Mono, ui-monospace, monospace',
};

export const labGlassDark: CanvasTheme = {
  bg: 'transparent',
  gridDot: '#334155',
  gridSize: 24,
  showGrid: true,
  isDark: true,
  wire: { live: '#f87171', neutral: '#60a5fa', earth: '#34d399' },
  wireWidth: 2.25,
  wireGlow: false,
  wireDashIdle: true,
  component: {
    bg: 'rgba(30,41,59,0.92)',
    border: '#334155',
    text: '#f1f5f9',
    subtext: '#64748b',
    rounded: 10,
    shadow: false,
    accent: '#3b82f6',
    selectedRing: '#3b82f6',
  },
  port: { border: '#475569', bgIdle: '#1e293b' },
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
  monoFont: 'JetBrains Mono, ui-monospace, monospace',
};

/**
 * Phase 6.3-slim: partial overrides applied on top of the base light/dark
 * theme when the user picks a canvas preset in Settings → Display.
 */
const HIGH_CONTRAST_OVERRIDES: Partial<CanvasTheme> = {
  gridDot: '#4b5563',
  wire: { live: '#ff6b00', neutral: '#ffffff', earth: '#00e5b8' },
  wireWidth: 3,
  component: {
    bg: '#000000',
    border: '#ffffff',
    text: '#ffffff',
    subtext: '#9ca3af',
    rounded: 6,
    shadow: false,
    accent: '#facc15',
    selectedRing: '#facc15',
  },
  port: { border: '#ffffff', bgIdle: '#1f2937' },
};

const DEUTERANOPIA_OVERRIDES: Partial<CanvasTheme> = {
  wire: { live: '#f97316', neutral: '#818cf8', earth: '#06b6d4' },
  component: {
    bg: 'rgba(255,255,255,0.92)',
    border: '#e2e8f0',
    text: '#0f172a',
    subtext: '#94a3b8',
    rounded: 10,
    shadow: false,
    accent: '#7c3aed',
    selectedRing: '#7c3aed',
  },
};

const DEUTERANOPIA_DARK_OVERRIDES: Partial<CanvasTheme> = {
  wire: { live: '#fb923c', neutral: '#a5b4fc', earth: '#22d3ee' },
  component: {
    bg: 'rgba(30,41,59,0.92)',
    border: '#334155',
    text: '#f1f5f9',
    subtext: '#64748b',
    rounded: 10,
    shadow: false,
    accent: '#a78bfa',
    selectedRing: '#a78bfa',
  },
};

/**
 * Build the final CanvasTheme from the base (light/dark) by applying
 * the user's `showGrid` flag and `canvasPreset` overrides.
 */
export function applyCanvasPreset(
  base: CanvasTheme,
  settings: Pick<
    UserSettings,
    'showGrid' | 'canvasPreset' | 'wireColorStandard' | 'regulationStandard'
  >,
  isDark: boolean,
): CanvasTheme {
  let preset: Partial<CanvasTheme> = {};
  if (settings.canvasPreset === 'high-contrast') {
    preset = HIGH_CONTRAST_OVERRIDES;
  } else if (settings.canvasPreset === 'deuteranopia') {
    const overrides = isDark ? DEUTERANOPIA_DARK_OVERRIDES : DEUTERANOPIA_OVERRIDES;
    preset = {
      ...overrides,
      component: { ...base.component, ...overrides.component },
    };
  }

  // Regional wire colours. The regulatory standard (UK/US/EU) is the primary
  // source; the legacy `wireColorStandard` toggle still applies as an override
  // for users who want US colours on a UK standard and vice-versa.
  let wireColors = preset.wire ?? base.wire;
  if (settings.canvasPreset === 'default') {
    const standardColors = isDark
      ? getStandard(settings.regulationStandard).wireColorsDark
      : getStandard(settings.regulationStandard).wireColors;
    let live = standardColors.live;
    let neutral = standardColors.neutral;
    const earth = standardColors.earth;
    // Legacy two-way regional toggle still overrides live/neutral if it
    // disagrees with the standard, preserving the pre-standards behaviour.
    if (settings.wireColorStandard === 'us' && settings.regulationStandard !== 'us') {
      live = isDark ? '#38bdf8' : '#1e293b';
      neutral = isDark ? '#f1f5f9' : '#64748b';
    } else if (settings.wireColorStandard === 'uk_eu' && settings.regulationStandard === 'us') {
      live = isDark ? '#f87171' : '#b45309';
      neutral = isDark ? '#60a5fa' : '#2563eb';
    }
    wireColors = { live, neutral, earth };
  }

  return {
    ...base,
    ...preset,
    wire: wireColors,
    component: preset.component ?? base.component,
    showGrid: settings.showGrid,
  };
}

export const editorBackground =
  'radial-gradient(circle at 18% 12%, #ffffff 0%, transparent 55%), ' +
  'radial-gradient(circle at 82% 18%, #f1f5f9 0%, transparent 50%), ' +
  'radial-gradient(circle at 60% 95%, #e2e8f0 0%, transparent 55%), ' +
  'linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%)';

export const editorBackgroundDark =
  'radial-gradient(circle at 18% 12%, #1e293b 0%, transparent 55%), ' +
  'radial-gradient(circle at 82% 18%, #0f172a 0%, transparent 50%), ' +
  'radial-gradient(circle at 60% 95%, #1e293b 0%, transparent 55%), ' +
  'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)';
