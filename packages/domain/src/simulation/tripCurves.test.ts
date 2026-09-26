/**
 * Standards-locking regression tests for protection-device modelling.
 *
 * Every expected value below is a published objective figure, not a
 * "whatever the code returns today" snapshot:
 * - Ampacity: BS 7671:2018 Appendix 4, Table 4D5, Reference Method C
 *   (clipped direct), 70 °C PVC flat twin-and-earth, 30 °C ambient.
 * - MCB: IEC/EN 60898-1 time-current zones — Inf = 1.13×In (no trip in
 *   1 h), If = 1.45×In (trip < 1 h), 2.55×In (trip between 1 s and 60 s),
 *   instantaneous bands B 3–5 / C 5–10 / D 10–20×In.
 * - RCD: IEC/EN 61008-1 general-type maximum break times — 300 ms at
 *   1×IΔn, 150 ms at 2×IΔn, 40 ms at 5×IΔn, must-not-trip below 0.5×IΔn.
 */
import { describe, expect, it } from 'vitest';
import { calculateMCBTrip, calculateRCDTrip, getCableAmpacity } from './tripCurves';

describe('getCableAmpacity (BS 7671 Table 4D5, Method C)', () => {
  it.each([
    [1.0, 16],
    [1.5, 20],
    [2.5, 27],
    [4.0, 37],
    [6.0, 47],
    [10.0, 64],
    [16.0, 85],
  ] as const)('%i mm² → %i A', (mm2, amps) => {
    expect(getCableAmpacity(mm2)).toBe(amps);
  });

  it('rounds sub-standard sizes down to the next tabulated CSA', () => {
    expect(getCableAmpacity(0.75)).toBe(16);
    expect(getCableAmpacity(7)).toBe(64);
  });
});

describe('getCableAmpacity — installation Reference Methods B1 and A', () => {
  it.each([
    // Table 4D1 (B1, enclosed in conduit on a wall)
    [1.0, 'B1', 13.5],
    [1.5, 'B1', 17.5],
    [2.5, 'B1', 24],
    [4.0, 'B1', 32],
    [6.0, 'B1', 41],
    [10.0, 'B1', 57],
    [16.0, 'B1', 76],
    // Table 4D2A (A, enclosed in conduit in thermal insulation)
    [1.0, 'A', 11],
    [1.5, 'A', 14],
    [2.5, 'A', 18.5],
    [4.0, 'A', 25],
    [6.0, 'A', 32],
    [10.0, 'A', 43],
    [16.0, 'A', 57],
  ] as const)('%i mm² @ %s → %i A', (mm2, method, amps) => {
    expect(getCableAmpacity(mm2, method as 'B1' | 'A')).toBe(amps);
  });

  it('keeps Method C as the default for back-compat', () => {
    expect(getCableAmpacity(2.5)).toBe(getCableAmpacity(2.5, 'C'));
  });
});

describe('calculateMCBTrip (IEC 60898-1)', () => {
  it('never trips below Inf = 1.13×In, even after an hour', () => {
    const r = calculateMCBTrip(16 * 1.12, 16, 'B', 3600);
    expect(r.shouldTrip).toBe(false);
  });

  it('does not trip at exactly 1.13×In within the 1 h conventional time', () => {
    const r = calculateMCBTrip(16 * 1.13, 16, 'B');
    expect(r.shouldTrip).toBe(false);
    expect(r.timeToTrip).toBeGreaterThan(3600);
  });

  it('trips at If = 1.45×In within 1 hour (anchor: 3600 s)', () => {
    const { timeToTrip } = calculateMCBTrip(16 * 1.45, 16, 'B');
    expect(timeToTrip).toBeGreaterThan(1);
    expect(timeToTrip).toBeLessThanOrEqual(3600 + 1e-6);
    // power law is fitted exactly through the anchor
    expect(timeToTrip).toBeCloseTo(3600, 0);
  });

  it('trips at 2.55×In between 1 s and 60 s (IEC Table 7 calibration point)', () => {
    const { tripReason, timeToTrip } = calculateMCBTrip(16 * 2.55, 16, 'B');
    expect(tripReason).toBe('thermal');
    expect(timeToTrip).toBeGreaterThanOrEqual(1);
    expect(timeToTrip).toBeLessThanOrEqual(60 + 1e-9); // bound + float noise
    expect(timeToTrip).toBeCloseTo(60, 6);
  });

  it('Type B stays thermal (not instantaneous) inside the 3–5×In band', () => {
    const r = calculateMCBTrip(16 * 4.9, 16, 'B');
    expect(r.tripReason).toBe('thermal');
    // published Type B response band for In ≤ 32 A: 0.1–45 s at 3–5×In
    expect(r.timeToTrip).toBeGreaterThan(0.1);
    expect(r.timeToTrip).toBeLessThanOrEqual(45);
  });

  it.each([
    ['B', 5],
    ['C', 10],
    ['D', 20],
  ] as const)('Type %s trips magnetically (<0.1 s) at %i×In, the upper band edge', (type, mult) => {
    const r = calculateMCBTrip(16 * mult, 16, type);
    expect(r.shouldTrip).toBe(true);
    expect(r.tripReason).toBe('magnetic');
    expect(r.timeToTrip).toBeLessThanOrEqual(0.1);
  });

  it.each([
    ['B', 4.99],
    ['C', 9.99],
    ['D', 19.99],
  ] as const)(
    'Type %s does NOT trip instantaneously at %i×In (lower band region)',
    (type, mult) => {
      const r = calculateMCBTrip(16 * mult, 16, type);
      expect(r.tripReason).not.toBe('magnetic');
    },
  );

  it('guards non-positive ratings', () => {
    expect(calculateMCBTrip(100, 0).shouldTrip).toBe(false);
  });
});

describe('calculateRCDTrip (IEC 61008-1, general type)', () => {
  it('must not trip below 0.5×IΔn (15 mA on a 30 mA device)', () => {
    expect(calculateRCDTrip(14.9, 30, 10).shouldTrip).toBe(false);
  });

  it.each([
    [30, 0.3], // 1×IΔn → ≤ 300 ms
    [60, 0.15], // 2×IΔn → ≤ 150 ms
    [150, 0.04], // 5×IΔn → ≤ 40 ms
  ] as const)('%i mA leakage requires trip within %is', (mA, maxSeconds) => {
    const r = calculateRCDTrip(mA, 30);
    expect(r.timeToTrip).toBeLessThanOrEqual(maxSeconds);
    // and it must actually trip once that time elapses
    expect(calculateRCDTrip(mA, 30, maxSeconds).shouldTrip).toBe(true);
  });

  it('guards non-positive ratings', () => {
    expect(calculateRCDTrip(50, 0).shouldTrip).toBe(false);
  });
});
