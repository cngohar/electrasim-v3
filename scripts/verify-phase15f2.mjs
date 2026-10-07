import { runPhaseGate } from './phase-gate.mjs';

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
    'e2e/diagnosis-assessment.spec.ts',
    'e2e/diagnosis-lab.spec.ts',
    'e2e/ohmageddon.spec.ts',
    'e2e/consumer-evidence.spec.ts',
    'e2e/challenge-mode.spec.ts',
    '--project=chromium',
    '--workers=2',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.5F.2',
  steps,
  successMessage:
    'Phase 1.5F.2 diagnosis/Ohmageddon grading and replay passed locally. Legacy retirement and the full verify/stress suites remain F.3. No deployment was performed.',
});
