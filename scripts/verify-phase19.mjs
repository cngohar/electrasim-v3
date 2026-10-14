import { readFileSync } from 'node:fs';
import { runPhaseGate } from './phase-gate.mjs';

// Preserve the authoritative verify chain and expose its stages for recovery.
// Refuse unfamiliar shell syntax rather than silently omitting a required check.
const { scripts } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const verification = scripts.verify.split(' && ').map((command) => {
  const match = /^bun run ([\w:.-]+)$/.exec(command);
  if (!match) throw new Error(`Unsupported verify command: ${command}`);
  return ['run', match[1]];
});
process.exitCode = runPhaseGate({
  label: 'Phase 1.9',
  steps: [
    ...verification,
    ['run', 'test:gates'],
    ['run', 'test:graph'],
    ['run', 'benchmark:mna'],
    ['run', 'test:domain-local'],
    ['run', 'test:simulator'],
    ['run', 'stress:generator'],
    ['run', 'stress:diagnosis'],
  ],
  successMessage:
    'Phase 1.9 full local verification passed. No remote operation or deployment is authorized.',
});
