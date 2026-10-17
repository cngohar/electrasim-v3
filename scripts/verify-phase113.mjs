import { runPhaseGate } from './phase-gate.mjs';

process.env.PLAYWRIGHT_DEV_PORT ??= '3003';
const steps = [
  ['run', 'check'],
  ['run', 'test:gates'],
  ['run', 'test:graph'],
  ['run', 'catalogue:inventory', '--check'],
  ['run', 'catalogue:reference', '--check'],
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
    'e2e/ui-fault-lab.spec.ts',
    'e2e/inspector-reference.spec.ts',
    'e2e/fault-marker-movement.spec.ts',
    'e2e/fault-lifecycle.spec.ts',
    'e2e/fault-lab-application-review.spec.ts',
    'e2e/fault-lab-redesign.spec.ts',
    'e2e/open-drafting-table.spec.ts',
    'e2e/electrical-editing.spec.ts',
    'e2e/three-phase-source.spec.ts',
    'e2e/damage-repair.spec.ts',
    'e2e/unsupported-load-feedback.spec.ts',
    'e2e/catalogue-profiles.spec.ts',
    '--workers=1',
  ],
  ['x', 'playwright', 'test', '--config=playwright.ui-fault-built.config.ts', '--workers=1'],
  [
    'x',
    'playwright',
    'test',
    '--config=playwright.production.config.ts',
    'e2e/fault-lab-redesign.production.spec.ts',
    'e2e/open-drafting-table.production.spec.ts',
    'e2e/unsupported-load-feedback.production.spec.ts',
    '--workers=1',
  ],
  ['run', 'benchmark:browser'],
];

process.exitCode = runPhaseGate({
  label: 'Phase 1.13',
  steps,
  successMessage:
    'Registered Phase 1.13 local checks passed. Milestone acceptance also requires the issue ledger, all-type lifecycle, catalogue reconciliation and visual review evidence. Preserve historical performance exceptions; no publication or deployment is authorized.',
});
