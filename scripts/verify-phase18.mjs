import { runPhaseGate } from './phase-gate.mjs';
process.exitCode = runPhaseGate({
  label: 'Phase 1.8',
  steps: [
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
      'e2e/admin-membership.spec.ts',
      '--project=chromium',
      '--project=mobile-chrome',
      '--workers=1',
    ],
  ],
  successMessage:
    'Phase 1.8 local membership administration gate passed. Phase 1.9 full acceptance and existing performance exceptions remain separate. No deployment is authorized.',
});
