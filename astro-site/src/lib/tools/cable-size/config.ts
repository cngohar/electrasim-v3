/**
 * config.ts — configuration for the Cable Size Calculator v2.
 *
 * Candidate sizes, drop-limit choices and defaults live here as data so the UI
 * renders *from* configuration instead of hard-coding a ladder inside a
 * component (§7, §31).
 */

import type { CableSizeInputs, ConductorMaterial, LoadType, SystemType } from './types';

// The components that read the defaults from here need the input shape too.
export type { CableSizeInputs, ConductorMaterial, LoadType, SystemType };

/**
 * Default candidate ladder (§7). Ascending, deduplicated and data-driven —
 * `sizes=1.5,2.5,4` in the query string replaces it wholesale.
 */
export const DEFAULT_CANDIDATE_SIZES: readonly number[] = [1.5, 2.5, 4, 6, 10, 16, 25, 35];

/**
 * Pool a custom ladder is validated against. Anything outside it is dropped
 * rather than trusted: the engine is a teaching tool, not a cable catalogue.
 */
export const SUPPORTED_CABLE_SIZES: readonly number[] = [
  1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95,
];

/** Never render more candidates than this, whatever the URL asks for. */
export const MAX_CANDIDATES = 12;

/**
 * Nominal voltages offered per system (§30).
 *
 * AC and DC do not live at the same voltages: an AC run is a 230 V circuit off
 * a distribution board, a DC run is a 12 V vehicle harness, a 24 V control
 * loop, a 48 V battery bank or a 220 V DC link. Offering the same numbers for
 * both is how the AC/DC toggle ends up feeling like it does nothing, so each
 * system carries its own ladder and its own default.
 *
 * These are shortcuts, not restrictions — the voltage input stays free-form and
 * anything inside the bounds is accepted.
 */
export interface VoltagePreset {
  /** Nominal voltage in volts. */
  volts: number;
  /** Chip label, e.g. "48 V". */
  label: string;
  /** What this nominal is, for the chip's tooltip. */
  note: string;
}

export const SYSTEM_VOLTAGE_PRESETS: Record<SystemType, readonly VoltagePreset[]> = {
  ac: [
    { volts: 120, label: '120 V', note: 'US / NEC single-phase nominal' },
    { volts: 230, label: '230 V', note: 'UK / IEC single-phase nominal' },
    {
      volts: 400,
      label: '400 V',
      note: 'Three-phase line voltage — sized here as one 2-wire run',
    },
  ],
  dc: [
    { volts: 12, label: '12 V', note: 'Vehicle, caravan or a small off-grid battery' },
    { volts: 24, label: '24 V', note: 'Control panels and small off-grid systems' },
    {
      volts: 48,
      label: '48 V',
      note: 'Telecom plant and battery banks — the usual ELV DC workhorse',
    },
    {
      volts: 220,
      label: '220 V',
      note: 'DC distribution, traction and EV charger DC links',
    },
  ],
};

/**
 * Where a run lands when the AC/DC toggle is flipped (§30) — the two nomina
 * that read as "the ordinary case" for their system.
 */
export const SYSTEM_DEFAULT_VOLTS: Record<SystemType, number> = { ac: 230, dc: 48 };

/** Drop-limit choices offered in the UI (§6). */
export const DROP_LIMIT_OPTIONS: ReadonlyArray<{
  id: string;
  percent: number;
  label: string;
  note: string;
}> = [
  {
    id: '3',
    percent: 3,
    label: '3%',
    note: 'The tighter budget — commonly quoted for lighting circuits',
  },
  {
    id: '5',
    percent: 5,
    label: '5%',
    note: 'The usual ceiling quoted for other uses on a public LV supply',
  },
  {
    id: 'custom',
    percent: 3,
    label: 'Custom',
    note: 'Your own design limit — the tool treats it as a design choice',
  },
];

/**
 * A user-selected design parameter, not a universal regulatory requirement:
 * the limits above are the figures most often quoted (BS 7671 Reg 525.1 and
 * IEC 60364-5-52 Annex G both band a public LV supply at 3% / 5%), but the
 * calculator never claims to enforce a regulation (§6).
 */
export const DROP_LIMIT_DISCLAIMER =
  'Treat the limit as a design choice. 3% / 5% are the figures most standards quote for a public LV supply, but local rules differ.';

/**
 * Conductor temperature the resistance is corrected to, in °C.
 *
 * 20 °C is the temperature resistance is *tabulated* at, but it is not the
 * temperature a loaded cable runs at. BS 7671's Appendix 4 voltage-drop figures
 * (mV/A/m) are given at the conductor's maximum operating temperature — 70 °C
 * for thermoplastic (PVC) insulation — precisely so that the result reflects a
 * cable under load. Sizing at 20 °C understates the drop by roughly 20%
 * (1 + 0.00393 × 50 for copper), which is the wrong direction for a tool whose
 * whole job is not to undersize.
 *
 * It is a live input, not a constant: a lightly loaded circuit runs cooler and
 * drops less, and the reader is allowed to say so.
 */
export const CONDUCTOR_TEMPERATURE_C = 70;

/** What the temperature field offers, and the sentences that explain it. */
export const TEMPERATURE_PRESETS: ReadonlyArray<{ celsius: number; label: string; note: string }> =
  [
    { celsius: 20, label: '20 °C', note: 'Cold / unloaded — resistance as tabulated' },
    { celsius: 70, label: '70 °C', note: 'Thermoplastic (PVC) under load — the BS 7671 basis' },
    { celsius: 90, label: '90 °C', note: 'Thermosetting (XLPE) insulation under load' },
  ];

/** Shared-link / input bounds. Also the guard rails for URL restore. */
export const CABLE_SIZE_BOUNDS = {
  voltage: { min: 10, max: 1000 },
  length: { min: 0.5, max: 1000 },
  temperature: { min: -25, max: 200 },
  power: { min: 1, max: 100_000 },
  powerFactor: { min: 0.5, max: 1 },
  dropLimit: { min: 0.5, max: 15 },
  current: { min: 0.01, max: 5_000 },
} as const;

/**
 * A candidate is "near the limit" once it has used all but this fraction of
 * the selected budget (§21). 0.15 → amber from 85% of the limit upwards.
 */
export const NEAR_LIMIT_HEADROOM = 0.15;

/** Rounded, human defaults (§5, §6). */
export const CABLE_SIZE_DEFAULTS: CableSizeInputs = {
  systemType: 'ac',
  voltage: 230,
  loadType: 'lighting',
  customPowerWatts: 500,
  customPowerFactor: 1,
  material: 'copper',
  lengthMeters: 25,
  temperatureC: CONDUCTOR_TEMPERATURE_C,
  dropLimitPercent: 3,
  candidateSizes: [...DEFAULT_CANDIDATE_SIZES],
  selectedSizeMm2: null,
};

/** Query-string keys, kept in one place so the engine and the tests agree. */
export const CABLE_SIZE_PARAM_KEYS = {
  system: 'system',
  voltage: 'voltage',
  load: 'load',
  power: 'power',
  pf: 'pf',
  material: 'material',
  length: 'length',
  temp: 'temp',
  limit: 'limit',
  size: 'size',
  sizes: 'sizes',
} as const;

export function isSystemType(value: unknown): value is SystemType {
  return value === 'ac' || value === 'dc';
}

export function isLoadType(value: unknown): value is LoadType {
  return (
    value === 'lighting' ||
    value === 'fan' ||
    value === 'motor' ||
    value === 'heater' ||
    value === 'appliance' ||
    value === 'custom'
  );
}

export function isMaterial(value: unknown): value is ConductorMaterial {
  return value === 'copper' || value === 'aluminium';
}

/**
 * Parse a `sizes=1.5,2.5,4` style list: keep supported sizes, drop duplicates,
 * sort ascending and cap the count. Returns `null` when nothing usable is left
 * so callers can fall back to the defaults.
 */
export function parseCandidateSizes(raw: string | null | undefined): number[] | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  const parsed = raw
    .split(',')
    .map((part) => Number.parseFloat(part.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
    .filter((n) => SUPPORTED_CABLE_SIZES.includes(n));
  if (parsed.length === 0) return null;
  const unique = Array.from(new Set(parsed)).sort((a, b) => a - b);
  return unique.slice(0, MAX_CANDIDATES);
}
