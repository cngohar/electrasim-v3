import { runPhaseGate } from './phase-gate.mjs';

// Contract/persistence foundation only. Every service and browser target is local.
const steps = [
  ['run', 'check'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'benchmark:simulation'],
  ['run', 'test:domain-local'],
  ['run', 'test:simulator'],
  ['run', 'e2e:production'],
  [
    'x',
    'playwright',
    'test',
    'e2e/supply-profiles.spec.ts',
    'e2e/audit-baseline.spec.ts',
    'e2e/relay-switching.spec.ts',
    '--project=chromium',
    '--workers=1',
  ],
  [
    'x',
    'playwright',
    'test',
    'e2e/workbench-ui.spec.ts',
    '--project=chromium',
    '--workers=1',
    '--grep=global supply voltage preset',
  ],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.5C.0',
  steps,
  successMessage:
    'Phase 1.5C.0 supply/capability/readiness foundation passed locally. MNA, confirmed supply editing and full consumer integration remain pending; no deployment is authorized.',
});
