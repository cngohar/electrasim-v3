import { runPhaseGate } from './phase-gate.mjs';

// Specification scope only. Numerical/runtime/source+built application checks
// must be added in a separate Phase 1.12 gate as the models are implemented.
const steps = [
  ['run', 'catalogue:inventory', '--check'],
  ['run', 'test:lamp-reference'],
  ['run', 'test:lamp-preview'],
  ['run', 'typecheck'],
  ['run', 'lint'],
  ['run', 'test:graph'],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.12.0 specification',
  steps,
  successMessage:
    'Phase 1.12.0 specification checks passed. This is a reviewable model/profile design and standalone reference preview, not implemented lamp behaviour or the Phase 1.12 functional gate. Historical performance exceptions remain open. Local only.',
});
