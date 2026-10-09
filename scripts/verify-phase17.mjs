import { runPhaseGate } from './phase-gate.mjs';
const steps = [
  ['run', 'check'],
  ['run', 'test:graph'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'test:membership'],
  [
    'x',
    'playwright',
    'test',
    'e2e/workspace-design.spec.ts',
    'e2e/matter-effects.spec.ts',
    'e2e/electrical-editing.spec.ts',
    'e2e/damage-repair.spec.ts',
    'e2e/consumer-evidence.spec.ts',
    'e2e/diagnosis-assessment.spec.ts',
    'e2e/ohmageddon.spec.ts',
    '--project=chromium',
    '--workers=2',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.7',
  steps,
  successMessage:
    'Phase 1.7 local UI gate passed. Existing dense interaction and F.3 solver/generator performance exceptions remain. No deployment or full Phase 1.9 acceptance is claimed.',
});
