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
  label: 'Phase 1.5C.2',
  steps,
  successMessage:
    'Phase 1.5C.2 load response and wire-property gate passed locally. Transformer/PE equations, full readiness/editing UI and MNA runtime integration remain in 1.5C.3–5. No deployment was performed.',
});
