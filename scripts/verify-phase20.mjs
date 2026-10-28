import { spawnSync } from 'node:child_process';
import { closeSync, mkdirSync, openSync, writeFileSync } from 'node:fs';
import { planPhaseGate, runPhaseGate } from './phase-gate.mjs';

process.env.PLAYWRIGHT_DEV_PORT ??= '3021';
const steps = [
  ['run', 'check'],
  ['run', 'test:gates'],
  ['run', 'test:graph'],
  ['run', 'build'],
  ['run', 'check:perf'],
  ['run', 'check:csp'],
  ['run', 'check:links'],
  ['run', 'check:seo'],
  ['run', 'test:phase-2.0-spike'],
  ['run', 'test:platform-admin'],
  ['run', 'test:membership'],
  ['run', 'test:domain-local'],
  [
    'x',
    'playwright',
    'test',
    'e2e/platform-admin.spec.ts',
    'e2e/admin-membership.spec.ts',
    '--workers=1',
  ],
  ['x', 'playwright', 'test', '--config=playwright.platform-admin-built.config.ts', '--workers=1'],
];
const argv = process.argv.slice(2);
const root =
  process.env.PHASE20_EVIDENCE_DIR ??
  `.wrangler/phase20/run-${new Date().toISOString().replaceAll(':', '-')}`;
const results = [];
const stageMap = new Map(
  planPhaseGate(steps, argv).stages.map((stage) => [JSON.stringify(stage.args), stage.id]),
);
const run = (command, args, options) => {
  mkdirSync(root, { recursive: true });
  const id = stageMap.get(JSON.stringify(args));
  const log = `${root}/${id.replaceAll(':', '-')}.log`;
  const file = openSync(log, 'w');
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([key]) => !key.startsWith('CLOUDFLARE_') && !key.startsWith('CF_'),
    ),
  );
  const result = spawnSync(command, args, {
    ...options,
    stdio: ['ignore', file, file],
    timeout: args.includes('playwright') ? 1800000 : 900000,
    env: { ...env, WRANGLER_SEND_METRICS: 'false' },
  });
  closeSync(file);
  console.log(`Evidence: ${log}`);
  results.push({
    id,
    args,
    status: result.status,
    signal: result.signal,
    error: result.error?.message ?? null,
    log,
  });
  writeFileSync(`${root}/results.json`, JSON.stringify(results, null, 2));
  return result;
};
const status = runPhaseGate(
  {
    label: 'Phase 2.0',
    steps,
    successMessage:
      'Phase 2.0 shared admin foundation local gate passed. Phase 2.1 and remote operations are separate.',
  },
  { argv, run },
);
if (!argv.some((arg) => ['--list', '--dry-run', '--help'].includes(arg))) {
  mkdirSync(root, { recursive: true });
  writeFileSync(
    `${root}/manifest.json`,
    JSON.stringify(
      {
        scope: 'Phase 2.0 shared admin foundation only',
        selection: planPhaseGate(steps, argv).full ? 'full' : 'partial',
        status,
        results,
      },
      null,
      2,
    ),
  );
}
process.exitCode = status;
