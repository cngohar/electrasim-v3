import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const path = 'scripts/fixtures/phase20/env.d.ts';
const result = spawnSync(
  'bun',
  [
    'x',
    'wrangler',
    'types',
    path,
    '--config',
    'wrangler.phase20-test.jsonc',
    '--env-interface',
    'Phase20Bindings',
    '--include-runtime',
    'false',
  ],
  { stdio: 'inherit', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
);
if (result.status !== 0) process.exit(result.status ?? 1);
// A module wrapper keeps generated binding names out of Node/browser globals.
// The bindings themselves remain generated from the installed Wrangler schema.
const generated = readFileSync(path, 'utf8');
writeFileSync(
  path,
  `// Regenerate with bun run types:phase-2.0-spike (includes this module wrapper).\nimport type { D1Database, KVNamespace, R2Bucket, Queue, Fetcher, DurableObjectNamespace } from '@cloudflare/workers-types';\n${generated}\nexport type { Phase20Bindings };\n`,
);
