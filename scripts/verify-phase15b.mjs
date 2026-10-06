import { runPhaseGate } from './phase-gate.mjs';

// All Worker state, browser targets and persistence remain on this machine.
const steps = [
  ['run', 'check'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'benchmark:simulation'],
  ['run', 'test:domain-local'],
  ['run', 'test:simulator'],
  ['run', 'e2e:production'],
  [
    'x',
    'playwright',
    'test',
    'e2e/audit-baseline.spec.ts',
    'e2e/relay-switching.spec.ts',
    '--project=chromium',
    '--workers=1',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.5B',
  steps,
  successMessage:
    'Phase 1.5B contracts/graph gate passed locally. Numerical solving and legacy retirement remain 1.5C–1.5F; no deployment is authorized.',
});
