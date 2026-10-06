/** Self-contained Bun/workerd contract parity; starts only an isolated localhost Worker. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { domainParityFixture } from './domain-parity-fixture';

const port = await new Promise<number>((resolve, reject) => {
  const server = createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    if (!address || typeof address === 'string')
      return reject(new Error('No local port available.'));
    server.close(() => resolve(address.port));
  });
});
mkdirSync('.wrangler', { recursive: true });
const directory = mkdtempSync('.wrangler/domain-tests-');
const worker = spawn(
  process.execPath,
  [
    'x',
    'wrangler',
    'dev',
    '--config',
    'wrangler.domain-test.jsonc',
    '--local',
    '--ip',
    '127.0.0.1',
    '--port',
    String(port),
    '--persist-to',
    `${directory}/state`,
  ],
  {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, CLOUDFLARE_SEND_METRICS: 'false' },
  },
);
worker.stdout.on('data', (data) => appendFileSync(`${directory}/worker.log`, data));
worker.stderr.on('data', (data) => appendFileSync(`${directory}/worker.log`, data));
let startupError: Error | undefined;
worker.on('error', (error) => {
  startupError = error;
});
try {
  const origin = `http://127.0.0.1:${port}`;
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (startupError) throw startupError;
    if (worker.exitCode !== null)
      throw new Error(`Local Worker exited; inspect ${directory}/worker.log`);
    try {
      const response = await fetch(`${origin}/healthz`, { signal: AbortSignal.timeout(1000) });
      if (response.ok && (await response.text()) === 'local-domain-ready') {
        ready = true;
        break;
      }
    } catch {
      /* Worker is still starting. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert(ready, `Local Worker did not become ready; inspect ${directory}/worker.log`);
  const response = await fetch(origin, { signal: AbortSignal.timeout(30_000) });
  assert.equal(response.status, 200);
  const actual = await response.text();
  const expected = domainParityFixture();
  if (actual !== expected) {
    // Preserve strict equality and the full evidence without dumping tens of
    // megabytes into the terminal when a single measurement differs.
    writeFileSync(`${directory}/actual.json`, actual);
    writeFileSync(`${directory}/expected.json`, expected);
    let offset = 0;
    while (offset < Math.min(actual.length, expected.length) && actual[offset] === expected[offset])
      offset++;
    throw new Error(
      `Bun/workerd parity differs at character ${offset}. Compare ${directory}/{actual,expected}.json.`,
    );
  }
  console.log(
    `Local domain parity passed: ${JSON.parse(actual).length} simulation/compiler/preflight/MNA cases. Evidence: ${directory}`,
  );
} finally {
  if (worker.pid) {
    try {
      process.kill(-worker.pid, 'SIGTERM');
    } catch {
      /* already exited */
    }
  }
}
