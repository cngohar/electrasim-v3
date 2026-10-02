/**
 * Protection-device trip modelling — cable ampacity table (BS 7671 Table
 * 4D5) and IEC 60898-1 / IEC 61008-1 trip-curve calculators.
 *
 * Split verbatim from the former monolithic `simulation.ts`. Pure module:
 * no React / DOM imports so it can ship into `simulation.worker.ts`.
 *
 * Accuracy baseline (2026-08 audit against published references):
 * - Ampacity: BS 7671:2018 Appendix 4, 70 °C PVC copper, 30 °C ambient —
 *   Table 4D5 (Method C), Table 4D1 (Method B1), Table 4D2A (Method A).
 * - MCB: IEC/EN 60898-1 time-current zones (Inf = 1.13×In, If = 1.45×In,
 *   2.55×In calibration point, instantaneous bands B 3–5 / C 5–10 / D 10–20×In).
 * - RCD: IEC/EN 61008-1 maximum break times, general (non-delayed) type.
 */

import type { InstallationMethod } from '../types';

/**
 * Clearing time in the units the standards quote it in.
 *
 * BS 7671 Table 41.1 talks in seconds ("0.4 s"), an RCD's break time in
 * milliseconds ("40 ms"), and a marginal thermal overload in minutes or hours.
 * Printing all of them as raw seconds makes the interesting distinction —
 * milliseconds versus minutes — invisible.
 */
export function formatClearingTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0 ms';
  if (seconds < 1) return `${Math.round(seconds * 1000)} ms`;
  if (seconds < 90) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} s`;
  if (seconds < 5400) return `${Math.round(seconds / 60)} min`;
  return `${(seconds / 3600).toFixed(1)} h`;
}

/**
 * Cable current-carrying capacity in Amps per BS 7671:2018 Appendix 4,
 * 70 °C thermoplastic (PVC) two-core copper cable, 30 °C ambient — the
 * table the twin-and-earth values of Table 4D5 come from.
 *
 * Reference Methods (single circuit, so no Cg grouping factor):
 * - **C** (clipped direct): Table 4D5 — 16/20/27/37/47/64/85 A
 * - **B1** (enclosed in conduit on a wall): Table 4D1 — 13.5/17.5/24/32/41/57/76 A
 * - **A** (enclosed in conduit in thermal insulation): Table 4D2A —
 *   11/14/18.5/25/32/43/57 A
 *
 * Grouping, ambient temperature and long runs through insulation apply
 * FURTHER correction factors (Tables 4B1–4C5); callers multiply those on
 * top via the wire's Cg derating factor.
 */
const AMPACITY_SIZES = [1.0, 1.5, 2.5, 4.0, 6.0, 10.0] as const;
const AMPACITY_BY_METHOD: Record<InstallationMethod, readonly number[]> = {
  C: [16, 20, 27, 37, 47, 64, 85],
  B1: [13.5, 17.5, 24, 32, 41, 57, 76],
  A: [11, 14, 18.5, 25, 32, 43, 57],
};

export function getCableAmpacity(mm2: number, method: InstallationMethod = 'C'): number {
  const table = AMPACITY_BY_METHOD[method] ?? AMPACITY_BY_METHOD.C;
  for (let i = 0; i < AMPACITY_SIZES.length; i++) {
    if (mm2 <= AMPACITY_SIZES[i]!) return table[i]!;
  }
  return table[table.length - 1]!;
}

/**
 * MCB/RCBO Trip Curve Simulation - IEC 60898-1 Standard
 *
 * Calibrated to the standard's type-test anchors (IEC 60898-1 Table 7):
 * - Inf = 1.13×In: conventional NON-tripping current (no trip within 1 h)
 * - If  = 1.45×In: conventional tripping current (must trip < 1 h)
 * - 2.55×In: must trip between 1 s and 60 s (In ≤ 63 A)
 * - Instantaneous: must NOT trip within 0.1 s at the lower band edge
 *   (3/5/10×In for B/C/D), MUST trip within 0.1 s at the upper edge
 *   (5/10/20×In). Between the edges the outcome is unspecified, so the
 *   thermal curve governs — which reproduces the published "0.1–45 s"
 *   response band for Type B at 3–5×In.
 *
 * The thermal model is a power law, t = K / (m² − 1)^α with m = I/In,
 * fitted exactly through the two IEC anchors (1.45×In → 3600 s,
 * 2.55×In → 60 s). It represents the slowest permissible trip (upper
 * envelope); real devices trip faster. α ≈ 2.546833, K ≈ 4615.659.
 * Spot checks: 1.13×In → ~33.7 h (no trip in the 1 h conventional
 * time ✓), 2.0×In → ~281 s, 3×In → ~23 s.
 *
 * @param currentAmps - Actual current flowing through the breaker
 * @param ratedAmps - Breaker rated current (In)
 * @param mcbType - 'B', 'C', or 'D' curve type
 * @param elapsedSeconds - Time current has been flowing at this level
 * @returns Object with trip decision and timing information
 */
export interface TripCurveResult {
  /** Whether the breaker should trip */
  shouldTrip: boolean;
  /** Reason for trip: 'thermal' (overload) or 'magnetic' (short-circuit) */
  tripReason?: 'thermal' | 'magnetic';
  /** Minimum time to trip at this current level (seconds), undefined if no trip */
  timeToTrip?: number;
  /** Multiple of rated current */
  currentMultiple: number;
}

/** IEC 60898-1 power-law calibration constants (see header derivation). */
const THERMAL_K = 4615.65876415;
const THERMAL_ALPHA = 2.5468325498;

export function calculateMCBTrip(
  currentAmps: number,
  ratedAmps: number,
  mcbType: 'B' | 'C' | 'D' = 'B',
  elapsedSeconds = 0,
): TripCurveResult {
  if (ratedAmps <= 0) {
    return { shouldTrip: false, currentMultiple: 0 };
  }

  const currentMultiple = currentAmps / ratedAmps;

  // No trip below 1.13×In per IEC 60898-1 (conventional non-tripping current)
  if (currentMultiple < 1.13) {
    return { shouldTrip: false, currentMultiple };
  }

  // Instantaneous trip bands per IEC 60898-1: Type B 3–5×In, C 5–10×In,
  // D 10–20×In. Devices MUST trip within 0.1 s at the UPPER band edge
  // (5/10/20×In) but must NOT trip within 0.1 s at the lower edge — so
  // guaranteed instantaneous magnetic trip is modelled at ≥ the upper
  // edge; below it the thermal curve decides.
  let magneticUpper: number;
  switch (mcbType) {
    case 'B':
      magneticUpper = 5;
      break;
    case 'C':
      magneticUpper = 10;
      break;
    case 'D':
      magneticUpper = 20;
      break;
    default:
      magneticUpper = 5;
  }

  if (currentMultiple >= magneticUpper) {
    // Instantaneous magnetic trip (typically < 100ms)
    // For simplicity, we consider it immediate in simulation ticks
    return {
      shouldTrip: true,
      tripReason: 'magnetic',
      timeToTrip: 0.1, // 100ms typical magnetic trip time
      currentMultiple,
    };
  }

  // Thermal trip (inverse time characteristic) for overloads in the
  // 1.13×In → upper-instantaneous-edge range, fitted to the two IEC
  // 60898-1 calibration anchors: 3600 s at 1.45×In, 60 s at 2.55×In
  // (upper envelope; real devices trip faster).
  const thermalMultiplier = Math.max(0.01, currentMultiple * currentMultiple - 1);
  const timeToTripSeconds = THERMAL_K / thermalMultiplier ** THERMAL_ALPHA;

  // Clamp: magnetic is modelled at ≥0.1 s; overloads just above Inf can
  // legitimately hold for many hours, capped at 24 h for the sim tick loop
  const clampedTimeToTrip = Math.max(0.1, Math.min(86400, timeToTripSeconds));

  // Trip if elapsed time exceeds the required trip time
  const shouldTrip = elapsedSeconds >= clampedTimeToTrip;

  return {
    shouldTrip,
    tripReason: 'thermal',
    timeToTrip: clampedTimeToTrip,
    currentMultiple,
  };
}

/**
 * Calculate RCD/RCBO earth leakage trip based on residual current.
 * Per IEC 61008-1 maximum break times for general (non-delayed) devices
 * (mirrored in BS 7671 Table 3A / Regulation 415.1.1 for 30 mA
 * additional protection):
 * - < 0.5×IΔn: must NOT trip
 * - 1.0×IΔn:   ≤ 300 ms
 * - 2.0×IΔn:   ≤ 150 ms
 * - 5.0×IΔn:   ≤ 40 ms  (150 mA for a 30 mA device)
 * Between 0.5× and 1.0× the device MAY trip — modelled as a slow trip
 * (600 ms). S-type (selective) devices use a slower band (130–500 ms at
 * 1×, 60–200 ms at 2×, 50–150 ms at 5×) and are not modelled here.
 *
 * @param leakageCurrent_mA - Earth leakage current in milliamps
 * @param ratedLeakage_mA - RCD rated residual current (e.g., 30mA)
 * @param elapsedSeconds - Time leakage has been present
 * @returns Whether the RCD should trip
 */
export interface RCDTripResult {
  shouldTrip: boolean;
  leakageMultiple: number;
  timeToTrip?: number;
}

export function calculateRCDTrip(
  leakageCurrent_mA: number,
  ratedLeakage_mA = 30,
  elapsedSeconds = 0,
): RCDTripResult {
  if (ratedLeakage_mA <= 0) {
    return { shouldTrip: false, leakageMultiple: 0 };
  }

  const leakageMultiple = leakageCurrent_mA / ratedLeakage_mA;

  // No trip below 50% of rated leakage (per IEC 61008)
  if (leakageMultiple < 0.5) {
    return { shouldTrip: false, leakageMultiple };
  }

  // Stepped maximum break times per IEC 61008-1 (general type)
  let timeToTripSeconds: number;
  if (leakageMultiple >= 5) {
    timeToTripSeconds = 0.04; // 40 ms at ≥ 5×IΔn
  } else if (leakageMultiple >= 2) {
    timeToTripSeconds = 0.15; // 150 ms at ≥ 2×IΔn
  } else if (leakageMultiple >= 1) {
    timeToTripSeconds = 0.3; // 300 ms at ≥ 1×IΔn
  } else {
    // 0.5× – 1×: device MAY trip — modelled as a delayed trip
    timeToTripSeconds = 0.6;
  }

  const shouldTrip = elapsedSeconds >= timeToTripSeconds;

  return {
    shouldTrip,
    leakageMultiple,
    timeToTrip: timeToTripSeconds,
  };
}
