import { spawnSync } from 'node:child_process';

// Local services and isolated persistence only; no account or remote operations.
const steps = [
  ['run', 'check'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'benchmark:mna'],
  ['run', 'test:domain-local'],
  ['run', 'test:simulator'],
  [
    'x',
    'playwright',
    'test',
    'e2e/protection.spec.ts',
    'e2e/timer-dimming.spec.ts',
    'e2e/timed-controls.spec.ts',
    'e2e/mna-runtime.spec.ts',
    'e2e/electrical-editing.spec.ts',
    'e2e/wire-properties.spec.ts',
    'e2e/supply-profiles.spec.ts',
    'e2e/workbench-ui.spec.ts',
    'e2e/pro-features.spec.ts',
    'e2e/challenge-mode.spec.ts',
    'e2e/relay-switching.spec.ts',
    '--project=chromium',
    '--workers=2',
  ],
];
for (const args of steps) {
  console.log(`Phase 1.5D.2 local gate: bun ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  'Phase 1.5D.2 protection gate passed locally. Damage and Fault Lab repair remain 1.5D.3. No deployment was performed.',
);
