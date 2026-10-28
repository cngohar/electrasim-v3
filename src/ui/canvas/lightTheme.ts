/** Pure drawing tokens shared by editor and public rendering. */
import type { CanvasTheme } from './types';

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
    subtext: '#52667f',
    rounded: 10,
    shadow: false,
    accent: '#2563eb',
    selectedRing: '#2563eb',
  },
  port: { border: '#cbd5e1', bgIdle: '#ffffff' },
  font: 'Inter, ui-sans-serif, system-ui, sans-serif',
  monoFont: 'JetBrains Mono, ui-monospace, monospace',
};
