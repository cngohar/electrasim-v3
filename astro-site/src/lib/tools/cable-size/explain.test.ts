/**
 * explain.test.ts — the words the calculator says about its own answer (§19, §22).
 *
 * The explanation is generated from the same numbers the panels print, so these
 * tests pin both the copy's shape and the promise that it cannot drift: when the
 * recommendation changes, the sentence changes with it.
 */

import { describe, expect, it } from 'vitest';
import { CABLE_SIZE_DEFAULTS, DEFAULT_CANDIDATE_SIZES } from './config';
import { evaluateCableRun } from './evaluate';
import { explainRecommendation, selectedCableLine, statusCopy } from './explain';
import type { CableSizeInputs } from './types';

const BASE: CableSizeInputs = {
  ...CABLE_SIZE_DEFAULTS,
  candidateSizes: [...DEFAULT_CANDIDATE_SIZES],
};

describe('why this size? (§19)', () => {
  it('names the recommended size', () => {
    const evaluation = evaluateCableRun({ ...BASE, loadType: 'heater', lengthMeters: 40 });
    const copy = explainRecommendation(evaluation);
    expect(copy.heading).toBe(`Why ${evaluation.recommendedCable?.sizeMm2} mm²?`);
    expect(copy.body).toContain('smallest candidate');
    expect(copy.body).toContain('3.0% limit');
    expect(copy.body).toContain('40 m');
  });

  it('explains what the size below would have done', () => {
    const evaluation = evaluateCableRun({ ...BASE, loadType: 'heater', lengthMeters: 40 });
    const recommended = evaluation.recommendedCable;
    const below = evaluation.candidates.filter((c) => c.sizeMm2 < (recommended?.sizeMm2 ?? 0));
    const copy = explainRecommendation(evaluation);
    if (below.length > 0) {
      expect(copy.body).toContain('One size down');
    } else {
      expect(copy.body).not.toContain('One size down');
    }
  });

  it('says so when nothing on the ladder passes', () => {
    const evaluation = evaluateCableRun({
      ...BASE,
      loadType: 'custom',
      customPowerWatts: 15000,
      lengthMeters: 400,
    });
    const copy = explainRecommendation(evaluation);
    expect(copy.heading).toBe('No candidate passes');
    expect(copy.body).toContain('largest candidate');
    expect(copy.body).toContain('Shorten the run');
  });

  it('asks for the inputs instead of guessing when they are invalid', () => {
    const evaluation = evaluateCableRun({ ...BASE, voltage: 0 });
    expect(explainRecommendation(evaluation).heading).toBe('Check the inputs');
  });

  it('changes its story when the load changes', () => {
    const lighting = explainRecommendation(evaluateCableRun({ ...BASE, loadType: 'lighting' }));
    const heater = explainRecommendation(evaluateCableRun({ ...BASE, loadType: 'heater' }));
    expect(lighting.heading).not.toBe(heater.heading);
    expect(heater.body).toContain('3.0% limit');
  });
});

describe('status copy (§21, §22)', () => {
  it('is words first — never colour alone', () => {
    expect(statusCopy('pass', { dropPercent: 1, dropVolts: 2, limitPercent: 3 }).label).toBe(
      'PASS',
    );
    expect(
      statusCopy('near-limit', { dropPercent: 2.8, dropVolts: 6, limitPercent: 3 }).label,
    ).toBe('NEAR LIMIT');
    expect(statusCopy('fail', { dropPercent: 6, dropVolts: 14, limitPercent: 3 }).label).toBe(
      'FAIL',
    );
  });

  it('teaches rather than dramatising a failure', () => {
    const fail = statusCopy('fail', { dropPercent: 6.3, dropVolts: 14.5, limitPercent: 3 });
    expect(fail.message).toContain('High voltage drop');
    expect(fail.detail ?? '').toContain('Cable too small');
    expect(`${fail.message} ${fail.detail ?? ''}`).not.toMatch(/fire|explod|burst|burn/i);
  });

  it('warns that a passing-but-tight cable has little headroom', () => {
    const near = statusCopy('near-limit', { dropPercent: 2.9, dropVolts: 6.7, limitPercent: 3 });
    expect(near.message).toContain('little headroom');
  });

  it('summarises the inspected cable in one line', () => {
    const evaluation = evaluateCableRun({ ...BASE, loadType: 'heater', selectedSizeMm2: 6 });
    expect(selectedCableLine(evaluation.selected)).toContain('6 mm²');
    expect(selectedCableLine(null)).toBe('No cable selected');
  });
});
