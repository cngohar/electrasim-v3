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
  return `${label}${readiness.compatibility === 'incompatible' ? ' · incompatible' : readiness.compatibility === 'unassessed' ? ' · unassessed ratings' : ' · ready to assess'}`;
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
