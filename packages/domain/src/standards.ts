/** Code-owned teaching profiles. Edition, model coverage and local adoption are
 * separate facts. Matching voltage or plug family does not establish compliance.
 * Source register: docs/audits/electrical-standards-gap.md (2026-09-26).
 */

import { STANDARD_METADATA, type StandardMetadata } from './standardsReferences';
import type { PortType } from './types';

// ─── Types ────────────────────────────────────────────────────────────────

export type StandardId = 'uk' | 'us' | 'eu' | 'int';

/** Regional plug / socket system. This is independent of the electrical
 *  standard — it only drives which socket tiles appear in the palette. */
export type PlugSystemId =
  | 'bs1363' // UK 3-pin
  | 'nema5' // US / Canada / parts of South America
  | 'schuko' // Continental Europe
  | 'as3112' // Australia / New Zealand
  | 'bs546' // India / South Africa / Pakistan / Gulf
  | 'all'; // Show every socket type

/** Simplified public-LV teaching thresholds, not a national compliance decision. */
export interface VoltageDropLimits {
  /** Lighting; null when this metric model is not applicable. */
  lightingPercent: number | null;
  /** Power / socket-outlet final circuits. */
  powerPercent: number | null;
}

/** One quick-switchable regulatory preset. */
export interface StandardPreset {
  id: StandardId;
  metadata: StandardMetadata;
  label: string;
  shortLabel: string;
  /** Short citation shown under the selector, separate from implemented coverage. */
  citation: string;
  /** Flag emoji used as a light-weight visual cue. */
  flag: string;
  /** Nominal supply voltage (Volts). */
  nominalVoltage: number;
  /** Supply frequency (Hertz); 0 for DC systems. */
  frequencyHz: number;
  /** Terminal/conductor colour convention for canvas rendering. */
  wireColors: Record<PortType, string>;
  /** Dark-mode conductor colours. */
  wireColorsDark: Record<PortType, string>;
  /** Teaching thresholds (%); no generic US metric-cable assessment. */
  voltageDrop: VoltageDropLimits;
  /** Default MCB trip curve for generic circuits. */
  defaultMcbCurve: 'B' | 'C' | 'D' | null;
  /** Illustrative IEC curve to investigate for inrush; never a requirement. */
  motorMcbCurve: 'B' | 'C' | 'D' | null;
  /** Residual-current device threshold in milliamps for socket circuits. */
  rcdThresholdMa: number;
  /** Whether the teaching profile flags sockets without a residual device. */
  rcdRequiredOnSockets: boolean;
  /** Nominal domestic socket branch rating (Amps). */
  socketCircuitAmps: number;
  /** Nominal lighting circuit rating (Amps). */
  lightingCircuitAmps: number;
  /** Human-readable wire-colour legend for tooltips/help text. */
  conductorLegend: { live: string; neutral: string; earth: string };
}

// ─── Presets ──────────────────────────────────────────────────────────────

export const STANDARDS: Record<StandardId, StandardPreset> = {
  uk: {
    id: 'uk',
    metadata: STANDARD_METADATA.uk,
    label: 'United Kingdom',
    shortLabel: 'UK',
    citation: 'BS 7671:2018+A4:2026',
    flag: 'flag-gb',
    nominalVoltage: 230,
    frequencyHz: 50,
    wireColors: { live: '#b45309', neutral: '#2563eb', earth: '#16a34a' },
    wireColorsDark: { live: '#f87171', neutral: '#60a5fa', earth: '#34d399' },
    voltageDrop: { lightingPercent: 3, powerPercent: 5 },
    defaultMcbCurve: 'B',
    motorMcbCurve: 'C',
    rcdThresholdMa: 30,
    rcdRequiredOnSockets: true,
    socketCircuitAmps: 32,
    lightingCircuitAmps: 6,
    conductorLegend: {
      live: 'Brown (Line)',
      neutral: 'Blue (Neutral)',
      earth: 'Green/Yellow (CPC)',
    },
  },
  us: {
    id: 'us',
    metadata: STANDARD_METADATA.us,
    label: 'United States',
    shortLabel: 'US',
    citation: 'NFPA 70-2026 (NEC)',
    flag: 'flag-us',
    nominalVoltage: 120,
    frequencyHz: 60,
    // NEC: black/red "hot", white/gray "grounded conductor", green/bare equipment ground.
    wireColors: { live: '#1e293b', neutral: '#64748b', earth: '#15803d' },
    wireColorsDark: { live: '#38bdf8', neutral: '#f1f5f9', earth: '#4ade80' },
    voltageDrop: { lightingPercent: null, powerPercent: null },
    defaultMcbCurve: null,
    motorMcbCurve: null,
    rcdThresholdMa: 6, // Class A GFCI trips at 4–6 mA
    rcdRequiredOnSockets: true,
    socketCircuitAmps: 20,
    lightingCircuitAmps: 15,
    conductorLegend: {
      live: 'Black / Red (Hot)',
      neutral: 'White / Gray (Grounded)',
      earth: 'Green / Bare (EGC)',
    },
  },
  eu: {
    id: 'eu',
    metadata: STANDARD_METADATA.eu,
    label: 'European IEC teaching profile',
    shortLabel: 'EU',
    citation: 'IEC 60364 / HD 60364',
    flag: 'flag-eu',
    nominalVoltage: 230,
    frequencyHz: 50,
    wireColors: { live: '#b45309', neutral: '#2563eb', earth: '#16a34a' },
    wireColorsDark: { live: '#f87171', neutral: '#60a5fa', earth: '#34d399' },
    voltageDrop: { lightingPercent: 3, powerPercent: 5 },
    defaultMcbCurve: 'B',
    motorMcbCurve: 'C',
    rcdThresholdMa: 30,
    rcdRequiredOnSockets: true,
    socketCircuitAmps: 16,
    lightingCircuitAmps: 10,
    conductorLegend: {
      live: 'Brown (Phase)',
      neutral: 'Blue (Neutral)',
      earth: 'Green/Yellow (PE)',
    },
  },

  int: {
    id: 'int',
    metadata: STANDARD_METADATA.int,
    label: 'IEC teaching profile',
    shortLabel: 'Intl',
    citation: 'IEC 60364 series · teaching model',
    flag: 'earth',
    nominalVoltage: 230,
    frequencyHz: 50,
    wireColors: { live: '#b45309', neutral: '#2563eb', earth: '#16a34a' },
    wireColorsDark: { live: '#f87171', neutral: '#60a5fa', earth: '#34d399' },
    voltageDrop: { lightingPercent: 3, powerPercent: 5 },
    defaultMcbCurve: 'C',
    motorMcbCurve: 'C',
    rcdThresholdMa: 30,
    rcdRequiredOnSockets: true,
    socketCircuitAmps: 16,
    lightingCircuitAmps: 10,
    conductorLegend: {
      live: 'Brown / Red (Phase)',
      neutral: 'Blue / Black (Neutral)',
      earth: 'Green/Yellow (Earth)',
    },
  },
};

export const STANDARD_LIST: StandardPreset[] = [
  STANDARDS.uk,
  STANDARDS.us,
  STANDARDS.eu,
  STANDARDS.int,
];

export function getStandard(id: StandardId | undefined | null): StandardPreset {
  return STANDARDS[id ?? 'int'] ?? STANDARDS.int;
}

// ─── Plug / socket systems ────────────────────────────────────────────────
// Independent of the electrical standard. A user picks their electrical rules
// once, then their regional plug type; this drives which socket tiles the
// palette shows. 'all' reveals every socket type.

export interface PlugSystemInfo {
  id: PlugSystemId;
  label: string;
  shortLabel: string;
  flag: string;
  /** Socket component type ids shown when this plug system is active. */
  sockets: string[];
}

export const PLUG_SYSTEMS: Record<PlugSystemId, PlugSystemInfo> = {
  bs1363: {
    id: 'bs1363',
    label: 'UK / BS 1363 (3-pin)',
    shortLabel: 'UK 3-pin',
    flag: 'flag-gb',
    sockets: ['socket-3pin', 'double-socket', 'socket-usb'],
  },
  nema5: {
    id: 'nema5',
    label: 'US / NEMA 5-15',
    shortLabel: 'NEMA',
    flag: 'flag-us',
    sockets: ['socket-2pin', 'socket-us', 'double-socket-us', 'socket-gfci'],
  },
  schuko: {
    id: 'schuko',
    label: 'Europe / Schuko (CEE 7/3)',
    shortLabel: 'Schuko',
    flag: 'flag-eu',
    sockets: ['socket-schuko', 'socket-schuko-double'],
  },
  as3112: {
    id: 'as3112',
    label: 'Australia / NZ (AS/NZS 3112)',
    shortLabel: 'AU/NZ',
    flag: 'flag-au',
    sockets: ['socket-as3112', 'socket-as3112-double'],
  },
  bs546: {
    id: 'bs546',
    label: 'India / South Africa (BS 546)',
    shortLabel: 'BS 546',
    flag: 'flag-in',
    sockets: ['socket-bs546', 'socket-bs546-double'],
  },
  all: {
    id: 'all',
    label: 'All plug types',
    shortLabel: 'All',
    flag: 'globe',
    sockets: [
      'socket-3pin',
      'double-socket',
      'socket-usb',
      'socket-2pin',
      'socket-us',
      'double-socket-us',
      'socket-gfci',
      'socket-schuko',
      'socket-schuko-double',
      'socket-as3112',
      'socket-as3112-double',
      'socket-bs546',
      'socket-bs546-double',
    ],
  },
};

export const PLUG_SYSTEM_LIST: PlugSystemInfo[] = [
  PLUG_SYSTEMS.bs1363,
  PLUG_SYSTEMS.nema5,
  PLUG_SYSTEMS.schuko,
  PLUG_SYSTEMS.as3112,
  PLUG_SYSTEMS.bs546,
  PLUG_SYSTEMS.all,
];

/** The single-socket type to use in a region-aware demo circuit. Picks the
 *  first single (non-double) socket in the plug system, defaulting to the UK
 *  3-pin socket for the "all" system. */
export function primarySocketForPlug(plug: PlugSystemId): string {
  const sockets = PLUG_SYSTEMS[plug]?.sockets ?? [];
  const single =
    sockets.find((s) => !s.includes('double') && s !== 'socket-gfci' && s !== 'socket-2pin') ??
    'socket-3pin';
  return single;
}

// ─── Compliance helpers ───────────────────────────────────────────────────

/** P/V load estimate only. Cable capacity, diversity, continuous loads,
 * inrush and manufacturer's instructions still need a separate design check. */
export function recommendMcbrating(
  powerWatts: number,
  voltage: number,
  standard: StandardPreset,
): {
  ratingAmps: number | null;
  curve: 'B' | 'C' | 'D' | null;
  designCurrentAmps: number;
  note: string;
} {
  const valid =
    Number.isFinite(powerWatts) && powerWatts > 0 && Number.isFinite(voltage) && voltage > 0;
  const designCurrentAmps = valid ? powerWatts / voltage : 0;
  const preferredSizes = [6, 10, 16, 20, 25, 32, 40, 50, 63];
  const ratingAmps =
    valid && standard.id !== 'us'
      ? (preferredSizes.find((size) => size >= designCurrentAmps) ?? null)
      : null;
  return {
    ratingAmps,
    curve: standard.defaultMcbCurve,
    designCurrentAmps,
    note: !valid
      ? 'Not assessed: enter finite positive load power and supply voltage.'
      : standard.id === 'us'
        ? 'Not assessed: NEC load sizing and listed US breaker models are not implemented.'
        : ratingAmps === null
          ? 'Not assessed: load exceeds the available teaching ratings.'
          : 'Illustrative rating at or above P/V, without a blanket 125% factor. Verify cable capacity, load duty and equipment instructions.',
  };
}

export function isInrushLoad(componentType: string): boolean {
  return /motor|compressor|pump|transformer|air-conditioner/.test(componentType.toLowerCase());
}

/** Illustrative IEC curve only; EVSE/electronic loads need equipment data.
 * MCB curves B/C/D are distinct from RCD waveform types AC/A/F/B. */
export function recommendCurveForLoad(
  componentType: string,
  standard: StandardPreset,
): 'B' | 'C' | 'D' | null {
  if (standard.id === 'us' || /ev-charger|induction-hob/.test(componentType)) return null;
  return isInrushLoad(componentType) ? standard.motorMcbCurve : standard.defaultMcbCurve;
}

/**
 * Classify a component as "lighting" vs "power" so the correct voltage-drop
 * teaching threshold applies where this cable model is supported.
 */
export function isLightingLoad(componentType: string): boolean {
  const t = componentType.toLowerCase();
  return (
    t.includes('bulb') ||
    t.includes('lamp') ||
    t.includes('light') ||
    t.includes('tube-light') ||
    t.includes('downlight') ||
    t.includes('chandelier')
  );
}

/** Voltage-drop ceiling (percent) for a load under the given standard. */
export function voltageDropCeiling(componentType: string, standard: StandardPreset): number | null {
  return isLightingLoad(componentType)
    ? standard.voltageDrop.lightingPercent
    : standard.voltageDrop.powerPercent;
}
