/**
 * explain.ts — the "Why this size?" copy (§19, §22).
 *
 * The calculator's job is to be understood, not obeyed: every verdict ships with
 * the sentence that produced it, generated from the same numbers the panels
 * show so the explanation can never drift from the answer.
 *
 * Note the tone rule from §22 — the tool teaches, it does not pretend to predict
 * a fire. A failing cable is "too small for this calculated condition", never a
 * simulated explosion.
 */

import type { CableSizeEvaluation, CableStatus, CandidateEvaluation } from './types';

/** Round for prose: 2.1 V, 0.91%, 227.9 V. */
function volts(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(1)} V`;
}
function percent(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(decimals)}%`;
}
function size(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return `${n} mm²`;
}

export interface StatusCopy {
  /** Short badge text — always words, never colour alone (§27). */
  label: string;
  /** One sentence explaining the verdict. */
  message: string;
  /** Optional teaching aside shown under the badge. */
  detail?: string;
}

export function statusCopy(
  status: CableStatus,
  ctx: { dropPercent: number; dropVolts: number; limitPercent: number },
): StatusCopy {
  switch (status) {
    case 'pass':
      return {
        label: 'PASS',
        message: `Voltage drop is ${percent(ctx.dropPercent)} — inside your ${percent(ctx.limitPercent, 1)} limit.`,
      };
    case 'near-limit':
      return {
        label: 'NEAR LIMIT',
        message: `Voltage drop is ${percent(ctx.dropPercent)} — inside your ${percent(ctx.limitPercent, 1)} limit, but with little headroom left.`,
        detail: 'A longer run, a heavier load or a warmer cable would push this over.',
      };
    default:
      return {
        label: 'FAIL',
        message: `High voltage drop: ${percent(ctx.dropPercent)} is over your ${percent(ctx.limitPercent, 1)} limit.`,
        detail:
          'Cable too small for this calculated condition — upsize, shorten the run, or raise the limit.',
      };
  }
}

export interface Explanation {
  heading: string;
  body: string;
}

/**
 * Why the recommended size is what it is (§19).
 *
 * Three stories, chosen by what the ladder actually did:
 *  - a size was found,
 *  - no candidate on the ladder passes,
 *  - the inputs are invalid.
 */
export function explainRecommendation(evaluation: CableSizeEvaluation): Explanation {
  if (!evaluation.valid) {
    return {
      heading: 'Check the inputs',
      body: 'Some values are outside the range this calculator can evaluate, so no cable can be recommended yet.',
    };
  }

  const recommended = evaluation.recommendedCable;
  const limit = evaluation.dropLimitPercent;

  if (!recommended) {
    const largest = evaluation.candidates[evaluation.candidates.length - 1];
    return {
      heading: 'No candidate passes',
      body: `Even the largest candidate (${size(largest?.sizeMm2 ?? 0)}) drops ${percent(
        largest?.voltageDropPercent ?? 0,
      )} on this run, over your ${percent(limit, 1)} limit. Shorten the run, lower the load, raise the source voltage, or add larger sizes to the ladder to see what would work.`,
    };
  }

  const smaller = evaluation.candidates.filter((c) => c.sizeMm2 < recommended.sizeMm2);
  const nearestFailing = smaller[smaller.length - 1];

  const why = `This is the smallest candidate that keeps the calculated voltage drop within your ${percent(
    limit,
    1,
  )} limit for this load and ${evaluation.lengthMeters} m run — ${volts(
    recommended.voltageDropVolts,
  )} lost, ${percent(recommended.voltageDropPercent)} of the supply.`;

  const contrast = nearestFailing
    ? ` One size down (${size(nearestFailing.sizeMm2)}) drops ${percent(
        nearestFailing.voltageDropPercent,
      )}, which is over the limit — more resistance in less copper.`
    : '';

  return {
    heading: `Why ${size(recommended.sizeMm2)}?`,
    body: `${why}${contrast}`,
  };
}

/** One line for the cable being inspected, whatever the verdict. */
export function selectedCableLine(candidate: CandidateEvaluation | null): string {
  if (!candidate) return 'No cable selected';
  return `${size(candidate.sizeMm2)} — ${percent(candidate.voltageDropPercent)} drop (${volts(
    candidate.voltageDropVolts,
  )})`;
}
