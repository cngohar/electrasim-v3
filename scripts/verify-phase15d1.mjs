import { runPhaseGate } from './phase-gate.mjs';

// Local services and isolated persistence only; no account or remote operations.
const steps = [
  ['run', 'check'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'benchmark:mna'],
  ['run', 'test:domain-local'],
  ['run', 'test:simulator'],
  [
    'x',
    'playwright',
    'test',
    'e2e/timer-dimming.spec.ts',
    'e2e/timed-controls.spec.ts',
    'e2e/mna-runtime.spec.ts',
    'e2e/electrical-editing.spec.ts',
    'e2e/wire-properties.spec.ts',
    'e2e/supply-profiles.spec.ts',
    'e2e/workbench-ui.spec.ts',
    'e2e/pro-features.spec.ts',
    'e2e/challenge-mode.spec.ts',
    'e2e/relay-switching.spec.ts',
    '--project=chromium',
    '--workers=2',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.5D.1',
  steps,
  successMessage:
    'Phase 1.5D.1 dimming/timer gate passed locally. Protection and damage remain 1.5D.2–3. No deployment was performed.',
});
