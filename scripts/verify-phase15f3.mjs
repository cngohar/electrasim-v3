import { runPhaseGate } from './phase-gate.mjs';

const steps = [
  ['run', 'verify'],
  ['run', 'benchmark:mna'],
  ['run', 'test:domain-local'],
  ['run', 'test:simulator'],
  ['run', 'stress:generator'],
  ['run', 'stress:diagnosis'],
  ['run', 'stress:ohmageddon'],
];
process.exitCode = runPhaseGate({
  label: 'Phase 1.5F.3',
  steps,
  successMessage:
    'Phase 1.5F.3 legacy retirement and all required local integration gates passed. No deployment was performed.',
});
