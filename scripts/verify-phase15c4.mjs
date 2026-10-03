import { spawnSync } from 'node:child_process';

// Every service binds to localhost and uses local persistence. No deployment.
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
  console.log(`Phase 1.5C.4 local gate: bun ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  'Phase 1.5C.4 editing and readiness gate passed locally. MNA app runtime integration remains in 1.5C.5. No deployment was performed.',
);
