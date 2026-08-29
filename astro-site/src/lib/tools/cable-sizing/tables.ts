/**
 * tables.ts — shared conductor data tables for the cable-sizing engine.
 *
 * Single source of truth for the BS 7671 Appendix 4 / IEC 60364-5-52 data the
 * server engine (`calculation.ts`), the server-rendered panels
 * (`CableSizingPanels.astro`) and the browser engine (`public/js/cable-tables.js`)
 * all walk. Keeping one authoritative copy here (mirrored by the browser file)
 * means the answer, the ladder and the chart can never disagree.
 */

import type { InstallationMethod } from './types';

/** Standard protective device ratings (BS 7671 Table 41 / IEC 60898-1 range). */
export const STANDARD_RATINGS_IN = [6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125] as const;

/** Standard metric conductor cross-sections (IEC 60228). */
export const STANDARD_METRIC_SIZES = [1.0, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95] as const;

/** Minimum CPC size paired with each live conductor (BS 7671 Table 54.7). */
export const STANDARD_CPC_SIZES: Record<number, number> = {
  1.0: 1.0,
  1.5: 1.0,
  2.5: 1.5,
  4: 1.5,
  6: 2.5,
  10: 4.0,
  16: 6.0,
  25: 10.0,
  35: 16.0,
  50: 25.0,
  70: 35.0,
  95: 50.0,
};

/**
 * BS 7671 Appendix 4 (Table 4D5 family): 70 °C thermoplastic copper ampacity per
 * reference method. Exported because the cable-sizing scene draws its size
 * ladder from the same table the selector walks.
 */
export const BASE_AMPACITY_TABLE: Record<InstallationMethod, Record<number, number>> = {
  A: {
    1.0: 11.5,
    1.5: 14.5,
    2.5: 20,
    4: 26,
    6: 34,
    10: 46,
    16: 61,
    25: 80,
    35: 99,
    50: 119,
    70: 151,
    95: 182,
  },
  B: {
    1.0: 13.5,
    1.5: 17.5,
    2.5: 24,
    4: 32,
    6: 41,
    10: 57,
    16: 76,
    25: 101,
    35: 125,
    50: 151,
    70: 192,
    95: 232,
  },
  C: {
    1.0: 16,
    1.5: 20,
    2.5: 27,
    4: 37,
    6: 47,
    10: 65,
    16: 87,
    25: 114,
    35: 141,
    50: 182,
    70: 234,
    95: 284,
  },
  D: {
    1.0: 18,
    1.5: 22,
    2.5: 29,
    4: 38,
    6: 47,
    10: 63,
    16: 83,
    25: 110,
    35: 135,
    50: 165,
    70: 210,
    95: 255,
  },
  E: {
    1.0: 17,
    1.5: 22,
    2.5: 30,
    4: 40,
    6: 52,
    10: 71,
    16: 96,
    25: 128,
    35: 157,
    50: 196,
    70: 249,
    95: 302,
  },
};

/** BS 7671 Table 4D5: Voltage Drop (mV/A/m) for single-phase circuits. */
export const VOLTAGE_DROP_MV_PER_A_M: Record<number, number> = {
  1.0: 44,
  1.5: 29,
  2.5: 18,
  4: 11,
  6: 7.3,
  10: 4.4,
  16: 2.8,
  25: 1.75,
  35: 1.25,
  50: 0.93,
  70: 0.65,
  95: 0.49,
};

/**
 * Table 4B1: Ambient temperature correction factor Ca (70°C thermoplastic).
 * Factorised so the browser engine and the panels share the same curve.
 */
export function getCa(tempC: number): number {
  if (tempC <= 25) return 1.03;
  if (tempC <= 30) return 1.0;
  if (tempC <= 35) return 0.94;
  if (tempC <= 40) return 0.87;
  if (tempC <= 45) return 0.79;
  if (tempC <= 50) return 0.71;
  if (tempC <= 55) return 0.61;
  if (tempC <= 60) return 0.5;
  return 0.35;
}

/** Table 4C1: Grouping factor Cg. */
export function getCg(count: number): number {
  if (count <= 1) return 1.0;
  if (count === 2) return 0.8;
  if (count === 3) return 0.7;
  if (count === 4) return 0.65;
  if (count === 5) return 0.6;
  if (count === 6) return 0.57;
  if (count === 7) return 0.54;
  if (count === 8) return 0.52;
  if (count >= 9) return 0.5;
  return 1.0;
}

/** Thermal insulation factor Ci (BS 7671 Reg 523.9). */
export function getCi(mm: 0 | 50 | 100 | 200): number {
  if (mm === 50) return 0.89;
  if (mm === 100) return 0.81;
  if (mm === 200) return 0.5;
  return 1.0;
}

/** BS 3036 semi-enclosed fuse derating factor (BS 7671 Table 4C1 note / Reg 433.1.202). */
export const BS3036_FACTOR = 0.725;

/** Aluminium conductors carry ~78% of the tabulated copper ampacity (IEC 60364-5-52). */
export const ALUMINIUM_AMPACITY_FACTOR = 0.78;

/** Aluminium resistivity ratio vs copper (≈1.64×) for the mV/A/m tables. */
export const ALUMINIUM_MV_RATIO = 1.64;
