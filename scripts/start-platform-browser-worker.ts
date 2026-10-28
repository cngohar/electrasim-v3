/** Built browser entry with actual local Assets and API in one workerd process. */
import { spawn, spawnSync } from 'node:child_process';
import { seedBrowserStandards } from './seed-browser-standards';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
const config = 'wrangler.platform-browser-test.jsonc';
mkdirSync('.wrangler', { recursive: true });
const persist = mkdtempSync(resolve('.wrangler/platform-browser-'));
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !key.startsWith('CLOUDFLARE_') && !key.startsWith('CF_'),
  ),
);
env.WRANGLER_SEND_METRICS = 'false';
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
  { env, stdio: 'inherit' },
);
if (migrate.status !== 0) process.exit(migrate.status ?? 1);
seedBrowserStandards(config, persist, env);
const worker = spawn(
  'bun',
  [
    'x',
    'wrangler',
    'dev',
    '--config',
    config,
    '--local',
    '--ip',
    '127.0.0.1',
    '--port',
    '8793',
    '--persist-to',
    persist,
  ],
  { env, stdio: 'inherit' },
);
process.on('SIGTERM', () => worker.kill('SIGTERM'));
process.on('SIGINT', () => worker.kill('SIGINT'));
worker.on('exit', (code) => process.exit(code ?? 0));
