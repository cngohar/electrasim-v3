/**
 * standards.ts — international electrical standard presets & compliance helpers.
 *
 * Centralises the regulatory differences between the electrical rule sets the
 * app exposes:
 *
 *   - `uk` — BS 7671 (IET Wiring Regulations, 18th Edition Amendment 3/4):
 *            230 V / 50 Hz, brown/blue/green-yellow conductors, Type B/C/D
 *            MCBs, 30 mA RCD on sockets, 3 % (lighting) / 5 % (power) drop.
 *   - `us` — NFPA 70 (National Electrical Code, NEC):
 *            120 V / 60 Hz, black/white/green conductors, 15/20 A branch
 *            circuits, GFCI on wet/outdoor receptacles, 3 % / 5 % drop.
 *   - `eu` — IEC 60364:
 *            230 V / 50 Hz, brown/blue/green-yellow (harmonised HD 308 S2),
 *            C-curve breakers on motor circuits, same drop limits as UK.
 *   - `int` — International 230 V / 50 Hz (IEC-style). This single standard
 *            covers every other 230 V / 50 Hz country (Australia/NZ, India,
 *            South Africa, most of Asia/Africa/the Gulf, etc.) because their
 *            electrical rules are identical — only the plug/socket differs,
 *            which is handled separately by the plug-type selector.
 *
 * The plug/socket system is a SEPARATE concept from the electrical standard
 * (see `PLUG_SYSTEMS` below): a user picks their electrical rules once and
 * then their regional plug type, rather than duplicating near-identical
 * standards for every country.
 *
 * Keep this module pure & dependency-free so the simulator worker and the
 * validation engine can both import it without dragging React in.
 */

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

/** Maximum permissible voltage drop at the furthest point of a final circuit. */
export interface VoltageDropLimits {
  /** Lighting final circuits (BS 7671 Appendix 4 / NEC 210.19(A) FPN 4). */
  lightingPercent: number;
  /** Power / socket-outlet final circuits. */
  powerPercent: number;
}

/** One quick-switchable regulatory preset. */
export interface StandardPreset {
  id: StandardId;
  label: string;
  shortLabel: string;
  /** Short citation shown under the selector, e.g. "BS 7671 18th Ed. Amd 3/4". */
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
  /** Regulatory voltage-drop ceilings (%). */
  voltageDrop: VoltageDropLimits;
  /** Default MCB trip curve for generic circuits. */
  defaultMcbCurve: 'B' | 'C' | 'D';
  /** Required MCB curve for motor / high-inrush inductive loads. */
  motorMcbCurve: 'B' | 'C' | 'D';
  /** Residual-current device threshold in milliamps for socket circuits. */
  rcdThresholdMa: number;
  /** Whether RCD/GFCI protection is mandatory on socket outlets. */
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
    label: 'United Kingdom',
    shortLabel: 'UK',
    citation: 'BS 7671 18th Ed. (Amd 3/4)',
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
    label: 'United States',
    shortLabel: 'US',
    citation: 'NFPA 70 (NEC)',
    flag: 'flag-us',
    nominalVoltage: 120,
    frequencyHz: 60,
    // NEC: black/red "hot", white/gray "grounded conductor", green/bare equipment ground.
    wireColors: { live: '#1e293b', neutral: '#64748b', earth: '#15803d' },
    wireColorsDark: { live: '#38bdf8', neutral: '#f1f5f9', earth: '#4ade80' },
    voltageDrop: { lightingPercent: 3, powerPercent: 5 },
    defaultMcbCurve: 'C',
    motorMcbCurve: 'D',
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
    label: 'European Union',
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

  // ─── International 230 V / 50 Hz (IEC-style) ───────────────────────────
  // Covers Australia/NZ, India, South Africa, and every other 230 V / 50 Hz
  // country. Their electrical rules are identical; only the plug type differs,
  // which is handled by the separate plug-type selector.
  int: {
    id: 'int',
    label: 'International',
    shortLabel: 'Intl',
    citation: 'IEC 60364 · 230 V / 50 Hz',
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
  return STANDARDS[id ?? 'uk'];
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

/**
 * Recommend a standard MCB rating (Amps) for a load given its power draw and
 * the selected standard. Rounds UP to the next common domestic rating.
 *
 *   Ib = P / V   (design current)
 *   In ≥ Ib, chosen from a prefered-size list so the breaker is the smallest
 *   standard rating that comfortably carries the load.
 */
export function recommendMcbrating(
  powerWatts: number,
  voltage: number,
  standard: StandardPreset,
): { ratingAmps: number; curve: 'B' | 'C' | 'D'; designCurrentAmps: number } {
  const safeV = voltage > 0 ? voltage : standard.nominalVoltage;
  const designCurrentAmps = powerWatts > 0 && safeV > 0 ? powerWatts / safeV : 0;

  // Preferred ratings to IEC 60898 / NEC 240.6(A) common sizes.
  const preferredSizes = [6, 10, 15, 16, 20, 25, 32, 40, 50, 63];
  let ratingAmps = preferredSizes[preferredSizes.length - 1];
  for (const size of preferredSizes) {
    if (size >= designCurrentAmps * 1.25) {
      // 1.25 = continuous-load margin (NEC 210.20 / BS 7671 Ib ≤ In guidance).
      ratingAmps = size;
      break;
    }
  }
  return {
    ratingAmps,
    curve: standard.defaultMcbCurve,
    designCurrentAmps,
  };
}

/**
 * Choose the correct MCB trip curve for a load. Inductive / motor loads
 * (compressors, fans, EVSE) require C or D curves to ride through inrush;
 * resistive/electronic loads use B.
 */
export function recommendCurveForLoad(
  componentType: string,
  standard: StandardPreset,
): 'B' | 'C' | 'D' {
  const t = componentType.toLowerCase();
  const isMotor =
    t.includes('motor') ||
    t.includes('compressor') ||
    t.includes('pump') ||
    t.includes('transformer') ||
    t.includes('ev-charger') ||
    t.includes('air-conditioner') ||
    t.includes('induction-hob');
  if (isMotor) return standard.motorMcbCurve;
  return standard.defaultMcbCurve;
}

/**
 * Classify a component as "lighting" vs "power" so the correct voltage-drop
 * ceiling applies (3 % lighting, 5 % power under all three standards).
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
export function voltageDropCeiling(componentType: string, standard: StandardPreset): number {
  return isLightingLoad(componentType)
    ? standard.voltageDrop.lightingPercent
    : standard.voltageDrop.powerPercent;
}
