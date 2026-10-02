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
  [
    'x',
    'playwright',
    'test',
    'e2e/wire-properties.spec.ts',
    'e2e/supply-profiles.spec.ts',
    '--project=chromium',
  ],
];
for (const args of steps) {
  console.log(`Phase 1.5C.3 local gate: bun ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  'Phase 1.5C.3 isolated-transformer and PE/reference gate passed locally. Full readiness/editing UI and MNA app runtime integration remain in 1.5C.4–5. No deployment was performed.',
);
