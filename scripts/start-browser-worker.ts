/** Playwright-only Worker and database. Every Wrangler operation is explicitly local. */
import { spawn, spawnSync } from 'node:child_process';
const config = 'wrangler.membership-test.jsonc';
const persist = '.wrangler/playwright-local';
const migrate = spawnSync(
  'bun',
  [
    'x',
    'wrangler',
    'd1',
    'migrations',
    'apply',
    'DB',
    '--config',
    config,
    '--local',
    '--persist-to',
    persist,
  ],
  { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
);
if (migrate.status !== 0) process.exit(migrate.status ?? 1);
const worker = spawn(
  'bun',
  [
    'x',
    'wrangler',
    'dev',
    'scripts/browser-test-worker.ts',
    '--config',
    config,
    '--local',
    '--ip',
    '127.0.0.1',
    '--port',
    '8792',
    '--persist-to',
    persist,
  ],
  { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
);
process.on('SIGTERM', () => worker.kill('SIGTERM'));
process.on('SIGINT', () => worker.kill('SIGINT'));
worker.on('exit', (code) => process.exit(code ?? 0));
