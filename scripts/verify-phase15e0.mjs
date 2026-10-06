import { spawnSync } from 'node:child_process';

// E.0 is a domain foundation. All runtime services bind only to localhost.
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
    'e2e/mna-runtime.spec.ts',
    'e2e/damage-repair.spec.ts',
    'e2e/supply-profiles.spec.ts',
    'e2e/electrical-editing.spec.ts',
    'e2e/relay-switching.spec.ts',
    '--project=chromium',
    '--workers=2',
  ],
];
for (const args of steps) {
  console.log(`Phase 1.5E.0 local gate: bun ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  'Phase 1.5E.0 phasor foundation passed locally. Source catalogue/UI, motor models and phasor application integration remain open in 1.5E. No deployment was performed.',
);
