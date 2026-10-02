import { spawnSync } from 'node:child_process';

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
for (const args of steps) {
  console.log(`Phase 1.5C.1 local gate: bun ${args.join(' ')}`);
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log(
  'Phase 1.5C.1 linear MNA slice passed locally. Operating ranges, transformers, editing UI and full consumer integration remain pending. No deployment was performed.',
);
