import { runPhaseGate } from './phase-gate.mjs';
process.env.PLAYWRIGHT_DEV_PORT ??= '3002';
const steps = [
  ['run', 'check'],
  ['run', 'test:graph'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'test:domain-local'],
  ['run', 'test:membership'],
  [
    'x',
    'playwright',
    'test',
    'e2e/fault-lab-redesign.spec.ts',
    'e2e/diagnosis-retirement.spec.ts',
    'e2e/damage-repair.spec.ts',
    'e2e/consumer-evidence.spec.ts',
    'e2e/workbench-ui.spec.ts',
    'e2e/open-drafting-table.spec.ts',
    'e2e/electrical-editing.spec.ts',
    'e2e/challenge-retirement.spec.ts',
    'e2e/matter-effects.spec.ts',
    '--workers=1',
  ],
  [
    'x',
    'playwright',
    'test',
    '--config=playwright.production.config.ts',
    'e2e/fault-lab-redesign.production.spec.ts',
    'e2e/open-drafting-table.production.spec.ts',
    '--workers=1',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.11',
  steps,
  successMessage:
    'Phase 1.11 local functional gate passed. Historical solver/generator/dense-render performance exceptions remain open. This does not authorize publication or remote operations.',
});
