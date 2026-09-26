import type { PortType } from '@electrasim/domain';

export interface CanvasTheme {
  bg: string;
  gridDot: string;
  gridSize?: number;
  showGrid?: boolean;
  /** Whether this theme is the dark variant (drives overlay element colours). */
  isDark: boolean;
  wire: Record<PortType, string>;
  wireWidth?: number;
  wireGlow?: boolean;
  wireDashIdle?: boolean;
  component: {
    bg: string;
    border: string;
    text: string;
    subtext: string;
    rounded: number;
    shadow?: boolean;
    accent: string;
    selectedRing: string;
  };
  port: { border: string; bgIdle: string };
  font: string;
  monoFont?: string;
}

export interface PortLoc {
  componentId: string;
  portIndex: number;
}
