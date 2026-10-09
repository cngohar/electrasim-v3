import { runPhaseGate } from './phase-gate.mjs';

const steps = [
  ['run', 'check'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'benchmark:effects'],
  ['run', 'test:domain-local'],
  ['run', 'test:simulator'],
  [
    'x',
    'playwright',
    'test',
    'e2e/matter-effects.spec.ts',
    'e2e/damage-repair.spec.ts',
    'e2e/consumer-evidence.spec.ts',
    'e2e/diagnosis-assessment.spec.ts',
    'e2e/ohmageddon.spec.ts',
    '--project=chromium',
    '--workers=2',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.6',
  steps,
  successMessage:
    'Phase 1.6 effects gate passed locally. F.3 performance exceptions remain; this does not certify full Phase 1.9 acceptance. No deployment was performed.',
});
