import { spawnSync } from 'node:child_process';

// Local-only acceptance. No install, account command, hosted CI or deployment.
// Audit advisory freshness is recorded separately; an unreachable registry is
// never treated as a clean dependency audit.
const steps = [
  ['run', 'check'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'check:csp'],
  ['run', 'benchmark:simulation'],
  ['run', 'e2e:production'],
  [
    'x',
    'playwright',
    'test',
    'e2e/audit-baseline.spec.ts',
    'e2e/relay-switching.spec.ts',
    '--project=chromium',
    '--workers=1',
  ],
];
for (const args of steps) {
  console.log(`Phase 1.5A local gate: bun ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  'Phase 1.5A local gates passed. Expected-failure core fixtures and dependency advisory verification remain separately tracked; this is not a full Phase 1 or deployment gate.',
);
