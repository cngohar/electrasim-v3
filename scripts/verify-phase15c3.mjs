import { runPhaseGate } from './phase-gate.mjs';

// Every service binds to localhost and uses local persistence. No deployment.
const steps = [
  ['run', 'check'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'benchmark:mna'],
  ['run', 'test:domain-local'],
  [
    'x',
    'playwright',
    'test',
    'e2e/wire-properties.spec.ts',
    'e2e/supply-profiles.spec.ts',
    '--project=chromium',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.5C.3',
  steps,
  successMessage:
    'Phase 1.5C.3 isolated-transformer and PE/reference gate passed locally. Full readiness/editing UI and MNA app runtime integration remain in 1.5C.4–5. No deployment was performed.',
});
