import { runPhaseGate } from './phase-gate.mjs';
process.env.PLAYWRIGHT_DEV_PORT ??= '3003';
const steps = [
  ['run', 'catalogue:inventory', '--check'],
  ['run', 'test:lamp-reference'],
  ['run', 'check'],
  ['run', 'test:gates'],
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
    'e2e/catalogue-profiles.spec.ts',
    'e2e/unsupported-load-feedback.spec.ts',
    'e2e/mna-runtime.spec.ts',
    'e2e/three-phase-motor.spec.ts',
    'e2e/three-phase-source.spec.ts',
    'e2e/electrical-editing.spec.ts',
    'e2e/damage-repair.spec.ts',
    'e2e/consumer-evidence.spec.ts',
    'e2e/fault-lab-redesign.spec.ts',
    'e2e/workbench-ui.spec.ts',
    'e2e/guided-circuits.spec.ts',
    'e2e/guide-schematics.spec.ts',
    'e2e/dol-guide.spec.ts',
    'e2e/timer-dimming.spec.ts',
    '--workers=1',
  ],
  [
    'x',
    'playwright',
    'test',
    '--config=playwright.production.config.ts',
    'e2e/unsupported-load-feedback.production.spec.ts',
    'e2e/fault-lab-redesign.production.spec.ts',
    '--workers=1',
  ],
];
steps.push([
  'x',
  'playwright',
  'test',
  '--config=playwright.catalogue-built.config.ts',
  '--workers=1',
]);
process.exitCode = runPhaseGate({
  label: 'Phase 1.12 functional',
  steps,
  successMessage:
    'Phase 1.12 full local functional/static gate passed. Numerical/rendering performance is measured separately against unchanged budgets; this gate does not close historical performance exceptions or authorize publication/deployment.',
});
