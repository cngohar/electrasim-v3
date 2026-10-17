import type { CircuitReadiness } from './readiness';

export function readinessLabel(readiness: CircuitReadiness): string {
  const labels = {
    invalid: 'Invalid circuit',
    empty: 'Empty circuit',
    'no-source': 'Missing supply',
    'no-load': 'No load path',
    open: 'Open circuit',
    partial: 'Partial circuit',
    short: 'Supply short',
    connected: 'Connected',
  };
  const label = labels[readiness.topology];
  if (readiness.topology !== 'connected' && readiness.topology !== 'partial') return label;
  return `${label}${readiness.compatibility === 'incompatible' ? ' · incompatible' : readiness.compatibility === 'unassessed' ? ' · assessment incomplete' : ' · ready to assess'}`;
}

export function ordinaryRunBlocked(readiness: CircuitReadiness): boolean {
  return (
    readiness.topology === 'empty' ||
    readiness.topology === 'invalid' ||
    readiness.topology === 'no-source'
  );
}

export function needsDiagnosticRun(readiness: CircuitReadiness): boolean {
  return readiness.topology === 'open' || readiness.topology === 'no-load';
}

/** Presentation only: preserves assessment status and explains what can resolve it. */
export function assessmentPresentation(result: import('./compatibility').CompatibilityResult) {
  const codes = new Set(result.reasons.map((reason) => reason.code));
  const label =
    result.status === 'incompatible'
      ? 'Supply mismatch'
      : codes.has('unsupported-model')
        ? 'Model unavailable'
        : codes.has('multiple-sources')
          ? 'Multiple supplies'
          : codes.has('missing-supply')
            ? 'Supply unknown'
            : codes.has('unknown-rating')
              ? 'Ratings unknown'
              : result.status === 'unassessed'
                ? 'Not assessed'
                : 'Nominally compatible';
  const action =
    result.status === 'incompatible'
      ? 'Review the supply and declared device ratings in the Inspector.'
      : codes.has('unsupported-model')
        ? 'Review the supported model limits; this effect cannot be calculated.'
        : codes.has('multiple-sources')
          ? 'Review the connected sources and terminal groups.'
          : codes.has('missing-supply')
            ? 'Connect and review a source for this terminal group.'
            : codes.has('unknown-rating')
              ? 'Review missing declarations and supported settings in the Inspector.'
              : 'Review the circuit and its declared teaching model before running.';
  return {
    label,
    action,
    detail: [...new Set(result.reasons.map((reason) => reason.message))].join(' '),
  };
}
