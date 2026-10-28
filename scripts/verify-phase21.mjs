import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { planPhaseGate, runPhaseGate } from './phase-gate.mjs';

import { componentAccessSteps } from './verify-phase20a.mjs';
export const profileSteps = [
  ...componentAccessSteps.slice(0, -2),
  ['run', 'test:profile-storage'],
  ['run', 'test:profiles-api'],
  ...componentAccessSteps.slice(-2),
  [
    'x',
    'playwright',
    'test',
    '--config=playwright.profiles.config.ts',
    '--workers=1',
    '--retries=0',
    '--forbid-only',
  ],
  [
    'x',
    'playwright',
    'test',
    '--config=playwright.profiles-built.config.ts',
    '--workers=1',
    '--retries=0',
    '--forbid-only',
  ],
];

// Hash implementation/harness inputs, including untracked work, without storing content.
// Documentation is reviewed separately; generated outputs and local credentials are excluded.
function sourceHashes() {
  const listing = spawnSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      encoding: 'utf8',
    },
  );
  if (listing.status !== 0) throw new Error('Cannot enumerate acceptance source inputs');
  const files = [...new Set(listing.stdout.split('\0'))]
    .filter(
      (file) =>
        /^(src\/|packages\/|scripts\/|e2e\/|admin\/|settings\/|astro-site\/(src|public)\/|public\/|migrations\/|(?:playwright\.|wrangler\.|tsconfig\.|vite\.|vitest\.|biome\.)[^/]+$|package\.json$|bun\.lock$|AGENTS\.md$|docs\/specs\/component-access-baseline\.json$)/.test(
          file,
        ) && existsSync(file),
    )
    .sort();
  return Object.fromEntries(
    files.map((file) => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]),
  );
}

if (import.meta.main) {
  process.env.PLAYWRIGHT_DEV_PORT ??= '3032';
  const argv = process.argv.slice(2);
  const plan = planPhaseGate(profileSteps, argv);
  const inspection = plan.list || plan.dryRun || plan.help;
  const root =
    process.env.PHASE21_EVIDENCE_DIR ??
    `.wrangler/phase21/run-${new Date().toISOString().replaceAll(':', '-')}`;
  const startedAt = new Date().toISOString();
  const hashes = inspection ? null : sourceHashes();
  if (!inspection) {
    mkdirSync(root, { recursive: true });
    // Never overwrite prior acceptance evidence during a resume or rerun.
    writeFileSync(`${root}/source-hashes.json`, JSON.stringify(hashes, null, 2), { flag: 'wx' });
  }
  const results = [];
  const run = (command, args, options) => {
    const id = plan.stages.find((stage) => JSON.stringify(stage.args) === JSON.stringify(args)).id;
    const log = `${root}/${id.replaceAll(':', '-')}.log`;
    const executedArgs = args.includes('playwright')
      ? [...args, `--output=${root}/${id.replaceAll(':', '-')}-results`]
      : args;
    const file = openSync(log, 'wx');
    const stageStartedAt = new Date().toISOString();
    const env = Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => !key.startsWith('CLOUDFLARE_') && !key.startsWith('CF_'),
      ),
    );
    const result = spawnSync(command, executedArgs, {
      ...options,
      stdio: ['ignore', file, file],
      timeout: args.includes('playwright') ? 2400000 : 900000,
      env: {
        ...env,
        WRANGLER_SEND_METRICS: 'false',
        PLAYWRIGHT_HTML_OUTPUT_DIR: `${root}/${id.replaceAll(':', '-')}-report`,
      },
    });
    closeSync(file);
    console.log(`Evidence: ${log}`);
    results.push({
      id,
      args: executedArgs,
      startedAt: stageStartedAt,
      finishedAt: new Date().toISOString(),
      status: result.status,
      signal: result.signal,
      error: result.error?.message ?? null,
      log,
    });
    writeFileSync(`${root}/results.json`, JSON.stringify(results, null, 2));
    return result;
  };
  let status = runPhaseGate(
    {
      label: 'Phase 2.1',
      steps: profileSteps,
      successMessage: 'Phase 2.1 local checks passed; source stability and evidence review follow.',
    },
    { argv, run },
  );
  if (!inspection) {
    const finalHashes = sourceHashes();
    const changed = [...new Set([...Object.keys(hashes), ...Object.keys(finalHashes)])].filter(
      (file) => hashes[file] !== finalHashes[file],
    );
    if (changed.length) {
      status = status || 1;
      console.log(`Source inputs changed during acceptance: ${changed.join(', ')}`);
    }
    writeFileSync(
      `${root}/manifest.json`,
      JSON.stringify(
        {
          scope: 'Phase 2.1 profiles/privacy, including existing admin/component/editor regression',
          selection: plan.full ? 'full' : 'partial',
          startedAt,
          finishedAt: new Date().toISOString(),
          status,
          sourceHashes: `${root}/source-hashes.json`,
          sourceCount: Object.keys(hashes).length,
          changedSources: changed,
          results,
        },
        null,
        2,
      ),
    );
  }
  process.exitCode = status;
}
