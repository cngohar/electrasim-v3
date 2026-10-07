import { runPhaseGate } from './phase-gate.mjs';

// Consumer acceptance only. Hosted services and legacy retirement remain out of scope.
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
    'e2e/consumer-evidence.spec.ts',
    'e2e/damage-repair.spec.ts',
    'e2e/mna-runtime.spec.ts',
    'e2e/dol-guide.spec.ts',
    'e2e/three-phase-source.spec.ts',
    'e2e/three-phase-motor.spec.ts',
    'e2e/guided-circuits.spec.ts',
    'e2e/faults-and-editing.spec.ts',
    'e2e/challenge-mode.spec.ts',
    '--project=chromium',
    '--workers=2',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.5F.1',
  steps,
  successMessage:
    'Phase 1.5F.1 current consumer evidence passed locally. Diagnosis/Ohmageddon migration and legacy retirement remain F.2–3. No deployment was performed.',
});
