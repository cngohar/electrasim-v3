import { spawnSync } from 'node:child_process';

// All Worker state, browser targets and persistence remain on this machine.
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
    'e2e/audit-baseline.spec.ts',
    'e2e/relay-switching.spec.ts',
    '--project=chromium',
    '--workers=1',
  ],
];
for (const args of steps) {
  console.log(`Phase 1.5B local gate: bun ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  'Phase 1.5B contracts/graph gate passed locally. Numerical solving and legacy retirement remain 1.5C–1.5F; no deployment is authorized.',
);
