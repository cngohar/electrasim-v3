/** Real, isolated local workerd/Assets/D1/R2/KV/Queue spike; no remote target option. */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { localTestUrl } from './local-test-url';

const config = 'wrangler.phase20-test.jsonc';
assert(existsSync('dist/app/index.html'), 'Run bun run build before the Assets spike');
mkdirSync('.wrangler', { recursive: true });
const persist = mkdtempSync(resolve('.wrangler/phase20-spike-'));
// Local commands never need account authentication. Do not pass inherited account
// selectors or credentials into this isolated test process.
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
  { env, encoding: 'utf8', timeout: 60_000 },
);
assert.equal(migrate.status, 0, `${migrate.stdout}\n${migrate.stderr}`);
const port = await new Promise<number>((done) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    assert(address && typeof address !== 'string');
    server.close(() => done(address.port));
  });
});
const origin = localTestUrl(`http://127.0.0.1:${port}`, '', 'Phase 2.0 spike');
const log = createWriteStream(`${persist}/worker.log`);
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
    String(port),
    '--persist-to',
    persist,
  ],
  { env, stdio: ['ignore', 'pipe', 'pipe'] },
);
worker.stdout.pipe(log);
worker.stderr.pipe(log);
const stopped = new Promise<void>((done) => worker.on('exit', () => done()));
type Account = { cookie: string };
const passed: string[] = [];
async function check(name: string, work: () => Promise<void>) {
  await work();
  passed.push(name);
  console.log(`PASS ${name}`);
}
async function request(path: string, account?: Account, data?: unknown, requestOrigin = origin) {
  return fetch(`${origin}${path}`, {
    method: data === undefined ? 'GET' : 'POST',
    headers: {
      Origin: requestOrigin,
      ...(account ? { Cookie: account.cookie } : {}),
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    redirect: 'manual',
  });
}
async function role(account: Account, value: string) {
  assert.equal((await request('/api/__phase20/role', account, { role: value })).status, 200);
}

try {
  const deadline = Date.now() + 45_000;
  while (true) {
    try {
      if ((await request('/api/health')).ok) break;
    } catch {
      /* local boot */
    }
    if (Date.now() > deadline || worker.exitCode !== null)
      throw new Error(`Worker startup failed; see ${persist}/worker.log`);
    await new Promise((done) => setTimeout(done, 150));
  }
  await check(
    'SSR wins over built explore asset, encodes input and sends its own CSP/no-store',
    async () => {
      for (const path of [
        '/explore',
        '/explore/',
        '/feed',
        '/feed/',
        '/__phase20/c/relay',
        '/__phase20/u/owner',
        '/collections/test',
        '/__phase20/c/%3Cscript%3E',
      ]) {
        const response = await request(path);
        assert.equal(response.status, 200, path);
        assert.equal(response.headers.get('cache-control'), 'private, no-store');
        assert.match(response.headers.get('content-security-policy') ?? '', /script-src 'none'/);
        assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow');
        assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
        const markup = await response.text();
        assert.match(markup, /<h1>Phase 2.0 fixture<\/h1>/);
        assert.doesNotMatch(markup, /<script|\/app\/assets\/|<div id="root"/);
        if (path.includes('%3C')) assert.match(markup, /&lt;script&gt;/);
      }
      // Profiles now have a real product route. Keep the historical stub isolated,
      // and verify that a missing real profile cannot fall through to that stub.
      const unavailable = await request('/u/owner');
      assert.equal(unavailable.status, 404);
      assert.equal(unavailable.headers.get('cache-control'), 'private, no-store');
      assert.equal(unavailable.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.match(unavailable.headers.get('content-security-policy') ?? '', /script-src 'self'/);
      const page = await unavailable.text();
      assert.match(page, /Profile unavailable/);
      assert.doesNotMatch(page, /Phase 2.0 fixture|<div id="root"|\/app\/assets\//);
      // Production detail ownership must also win over the isolated old stub.
      const missingCircuit = await request('/c/relay');
      assert.equal(missingCircuit.status, 404);
      assert.equal(missingCircuit.headers.get('cache-control'), 'private, no-store');
      assert.equal(missingCircuit.headers.get('x-robots-tag'), 'noindex, nofollow');
      assert.match(
        missingCircuit.headers.get('content-security-policy') ?? '',
        /script-src 'self'/,
      );
      const circuitPage = await missingCircuit.text();
      assert.match(circuitPage, /Circuit unavailable/);
      assert.doesNotMatch(circuitPage, /Phase 2.0 fixture|<div id="root"|\/app\/assets\//);
    },
  );
  await check(
    'API and community misses stay 404; static marketing/editor/admin assets still resolve',
    async () => {
      for (const path of [
        '/api/missing',
        '/c/relay/missing',
        '/__phase20/c/relay/missing',
        '/u/owner/missing',
        '/feed/missing',
        '/explore/missing',
        '/collections/test/missing',
      ]) {
        const response = await request(path);
        assert.equal(response.status, 404, path);
        assert.doesNotMatch(await response.text(), /<div id="root"|<title>ElectraSim/);
      }
      for (const path of ['/', '/app/', '/admin/pro/']) {
        const response = await request(path);
        assert.equal(response.status, 200, path);
        assert.match(await response.text(), /<html/i);
        assert(response.headers.has('content-security-policy'), `${path} static CSP`);
      }
      assert.equal((await request('/this-route-does-not-exist')).status, 404);
    },
  );

  const accounts: Record<string, Account> = {};
  await check('real Better Auth cookies cannot claim staff roles during signup', async () => {
    for (const label of ['individual', 'moderator', 'admin', 'super_admin']) {
      const response = await request('/api/auth/sign-up/email', undefined, {
        name: label,
        email: `${label}@phase20.test`,
        password: 'Local-test-password-123!',
        globalRole: 'super_admin',
      });
      assert.equal(response.status, 200, await response.clone().text());
      const body = (await response.json()) as { user: { globalRole: string } };
      assert.equal(body.user.globalRole, 'individual');
      const cookie = response.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ');
      assert.match(cookie, /session_token/);
      accounts[label] = { cookie };
      await role(accounts[label], label);
    }
  });
  await check(
    'later-mounted staff module works while membership and security remain super-admin-only',
    async () => {
      assert.equal((await request('/api/admin/access')).status, 401);
      for (const [name, account] of Object.entries(accounts)) {
        const access = await request('/api/admin/access', account);
        assert.equal(access.status, name === 'individual' ? 403 : 200, name);
        assert.equal(access.headers.get('cache-control'), 'private, no-store');
        for (const path of [
          '/api/admin/ping',
          '/api/admin/pro/plans',
          '/api/admin/pro/features',
          '/api/admin/pro/memberships',
          '/api/admin/pro/users',
          '/api/admin/pro/audit',
        ]) {
          assert.equal(
            (await request(path, account)).status,
            name === 'super_admin' ? 200 : 403,
            `${name}: ${path}`,
          );
        }
        assert.equal(
          (await request('/api/admin/security-fixture', account, {})).status,
          name === 'super_admin' ? 200 : 403,
        );
        assert.equal((await request('/api/me/membership', account)).status, 200);
        assert.equal((await request('/api/circuits', account)).status, 200);
      }
      assert.equal(
        (
          await request(
            '/api/admin/security-fixture',
            accounts.super_admin,
            {},
            'https://cross-origin.invalid',
          )
        ).status,
        403,
      );
      assert.equal(
        (
          await request(
            '/api/admin/pro/plans',
            accounts.super_admin,
            {},
            'https://cross-origin.invalid',
          )
        ).status,
        403,
      );
    },
  );
  await check(
    'primary role reads revoke staff access on the next request with the same cookie',
    async () => {
      for (const name of ['moderator', 'admin', 'super_admin']) {
        await role(accounts[name], 'individual');
        assert.equal((await request('/api/admin/access', accounts[name])).status, 403);
        assert.equal((await request('/api/admin/ping', accounts[name])).status, 403);
      }
    },
  );
  await check(
    'local D1 FTS5 uses its virtual index; R2/KV roundtrip and actual Queue consumption work',
    async () => {
      const response = await request('/api/__phase20/infrastructure', undefined, {});
      assert.equal(response.status, 200, await response.clone().text());
      const body = (await response.json()) as {
        matches: { id: string }[];
        plan: { detail: string }[];
        r2: string;
        kv: string;
        key: string;
      };
      assert.deepEqual(body.matches, [{ id: 'fixture' }]);
      assert(body.plan.some((row) => /VIRTUAL TABLE INDEX/i.test(row.detail)));
      assert.equal(body.r2, 'local R2 fixture');
      assert.equal(body.kv, 'local KV fixture');
      const deadline = Date.now() + 15_000;
      while (true) {
        const delivered = (await (
          await request(`/api/__phase20/queue?key=${encodeURIComponent(body.key)}`)
        ).json()) as { delivered: string | null };
        if (delivered.delivered === 'consumed') break;
        assert(Date.now() < deadline, 'Queue must actually invoke its consumer');
        await new Promise((done) => setTimeout(done, 100));
      }
      writeFileSync(`${persist}/query-plan.json`, JSON.stringify(body.plan, null, 2));
    },
  );
  console.log(`Phase 2.0 spike passed: ${passed.length} groups. Local evidence: ${persist}`);
} finally {
  writeFileSync(
    `${persist}/results.json`,
    JSON.stringify(
      { passed, scope: '2.0 spike only; admin foundation and Phase 2 remain open' },
      null,
      2,
    ),
  );
  worker.kill('SIGTERM');
  await stopped;
  log.end();
}
