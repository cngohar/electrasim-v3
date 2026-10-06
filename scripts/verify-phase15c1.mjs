import { runPhaseGate } from './phase-gate.mjs';

// Pure numerical slice only. The parity service binds exclusively to localhost.
// Consumer browser/Worker/D1 gates remain in 1.5C.0 and the later integration gate.
const steps = [
  ['run', 'check'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'benchmark:mna'],
  ['run', 'test:domain-local'],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.5C.1',
  steps,
  successMessage:
    'Phase 1.5C.1 linear MNA slice passed locally. Operating ranges, transformers, editing UI and full consumer integration remain pending. No deployment was performed.',
});
