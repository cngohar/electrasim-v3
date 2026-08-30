/**
 * validation.test.ts — guards for the Cable Size inputs (§8, §33).
 *
 * The engine must refuse nonsense rather than render a confident wrong answer,
 * and a hand-edited share link must never smuggle in a cable size the tables do
 * not contain.
 */

import { describe, expect, it } from 'vitest';
import { CABLE_SIZE_DEFAULTS, MAX_CANDIDATES, parseCandidateSizes } from './config';
import { clampToBounds, normaliseCandidateSizes, validateCableSizeInputs } from './validation';

const VALID = { ...CABLE_SIZE_DEFAULTS };

describe('validateCableSizeInputs', () => {
  it('accepts the defaults', () => {
    expect(validateCableSizeInputs(VALID).isValid).toBe(true);
  });

  it('lets the conductor temperature be zero or below, unlike every other field', () => {
    // 20 °C is cold, -25 °C is colder, and both are legitimate
    expect(
      validateCableSizeInputs({ ...VALID, temperatureC: 0 }).errors.temperatureC,
    ).toBeUndefined();
    expect(
      validateCableSizeInputs({ ...VALID, temperatureC: -25 }).errors.temperatureC,
    ).toBeUndefined();
    expect(
      validateCableSizeInputs({ ...VALID, temperatureC: 70 }).errors.temperatureC,
    ).toBeUndefined();
  });

  it('still rejects a temperature outside the bounds, or not a number', () => {
    expect(
      validateCableSizeInputs({ ...VALID, temperatureC: -200 }).errors.temperatureC,
    ).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, temperatureC: 900 }).errors.temperatureC,
    ).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, temperatureC: 'warm' }).errors.temperatureC,
    ).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, temperatureC: '' }).errors.temperatureC,
    ).toBeDefined();
  });

  it('rejects voltages, lengths and limits that are not physical', () => {
    expect(validateCableSizeInputs({ ...VALID, voltage: 0 }).errors.voltage).toBeDefined();
    expect(validateCableSizeInputs({ ...VALID, voltage: 5000 }).errors.voltage).toBeDefined();
    expect(validateCableSizeInputs({ ...VALID, voltage: 'abc' }).errors.voltage).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, lengthMeters: 0 }).errors.lengthMeters,
    ).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, lengthMeters: -5 }).errors.lengthMeters,
    ).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, dropLimitPercent: 0 }).errors.dropLimitPercent,
    ).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, dropLimitPercent: 90 }).errors.dropLimitPercent,
    ).toBeDefined();
  });

  it('rejects unknown enum values', () => {
    expect(
      validateCableSizeInputs({ ...VALID, systemType: 'three-phase' }).errors.systemType,
    ).toBeDefined();
    expect(validateCableSizeInputs({ ...VALID, material: 'silver' }).errors.material).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, loadType: 'toaster' }).errors.loadType,
    ).toBeDefined();
  });

  it('validates the custom load only when custom is selected', () => {
    expect(validateCableSizeInputs({ ...VALID, customPowerWatts: -1 }).isValid).toBe(true);
    expect(
      validateCableSizeInputs({ ...VALID, loadType: 'custom', customPowerWatts: -1 }).errors
        .customPowerWatts,
    ).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, loadType: 'custom', customPowerFactor: 1.4 }).errors
        .customPowerFactor,
    ).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, loadType: 'custom', customPowerFactor: 0.2 }).errors
        .customPowerFactor,
    ).toBeDefined();
    expect(validateCableSizeInputs({ ...VALID, loadType: 'custom' }).isValid).toBe(true);
  });

  it('requires at least one supported cable size', () => {
    expect(
      validateCableSizeInputs({ ...VALID, candidateSizes: [] }).errors.candidateSizes,
    ).toBeDefined();
    expect(
      validateCableSizeInputs({ ...VALID, candidateSizes: [3.7, 0, -2] }).errors.candidateSizes,
    ).toBeDefined();
  });

  it('rejects a selection that is not on the ladder', () => {
    expect(
      validateCableSizeInputs({ ...VALID, selectedSizeMm2: 50 }).errors.selectedSizeMm2,
    ).toBeDefined();
    expect(validateCableSizeInputs({ ...VALID, selectedSizeMm2: 4 }).isValid).toBe(true);
    expect(validateCableSizeInputs({ ...VALID, selectedSizeMm2: null }).isValid).toBe(true);
  });
});

describe('normaliseCandidateSizes', () => {
  it('sorts, dedupes and caps', () => {
    expect(normaliseCandidateSizes([10, 1.5, 4, 1.5])).toEqual([1.5, 4, 10]);
    expect(normaliseCandidateSizes(new Array(40).fill(2.5))).toHaveLength(1);
    expect(
      normaliseCandidateSizes([1, 1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120]).length,
    ).toBeLessThanOrEqual(MAX_CANDIDATES);
  });

  it('drops junk and unsupported sizes', () => {
    expect(normaliseCandidateSizes([2.5, '4', null, Number.NaN, 0, -6, 3.7])).toEqual([2.5, 4]);
    expect(normaliseCandidateSizes('nope')).toEqual([]);
    expect(normaliseCandidateSizes(undefined)).toEqual([]);
  });
});

describe('parseCandidateSizes (share links)', () => {
  it('parses a comma separated ladder', () => {
    expect(parseCandidateSizes('1.5,2.5,4,6')).toEqual([1.5, 2.5, 4, 6]);
  });

  it('sorts and dedupes whatever order the link used', () => {
    expect(parseCandidateSizes('10,1.5,10')).toEqual([1.5, 10]);
  });

  it('returns null when the link carries nothing usable', () => {
    expect(parseCandidateSizes('')).toBeNull();
    expect(parseCandidateSizes(null)).toBeNull();
    expect(parseCandidateSizes('3.7,9.9')).toBeNull();
  });
});

describe('clampToBounds', () => {
  it('clamps and replaces non-numbers with the minimum', () => {
    expect(clampToBounds(500, 10, 1000)).toBe(500);
    expect(clampToBounds(5, 10, 1000)).toBe(10);
    expect(clampToBounds(9999, 10, 1000)).toBe(1000);
    expect(clampToBounds(Number.NaN, 10, 1000)).toBe(10);
  });
});
