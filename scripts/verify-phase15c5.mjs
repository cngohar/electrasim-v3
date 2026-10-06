import { runPhaseGate } from './phase-gate.mjs';

// Every service binds to localhost and uses isolated local persistence.
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
  label: 'Phase 1.5C.5',
  steps,
  successMessage:
    'Phase 1.5C.5 application MNA gate passed locally. Timed devices, three-phase and full lab migration remain 1.5D–F. No deployment was performed.',
});
