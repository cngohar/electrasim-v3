import { runPhaseGate } from './phase-gate.mjs';

// Motor/coil/pole acceptance: runtime services bind only localhost.
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
    'e2e/three-phase-motor.spec.ts',
    'e2e/three-phase-source.spec.ts',
    'e2e/mna-runtime.spec.ts',
    'e2e/damage-repair.spec.ts',
    'e2e/supply-profiles.spec.ts',
    'e2e/electrical-editing.spec.ts',
    'e2e/relay-switching.spec.ts',
    '--project=chromium',
    '--workers=2',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.5E.2',
  steps,
  successMessage:
    'Phase 1.5E.2 motor/coil/pole acceptance passed locally. E.3 DOL migration and full three-phase acceptance remain open. No deployment was performed.',
});
