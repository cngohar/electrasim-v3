/** Real local Worker/D1 discovery, feed, FTS and moderation checks. Isolated persistence. */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { Profile } from '../src/community/profile-policy';
import { previewCircuit } from './fixtures/preview-circuit';

const config = 'wrangler.profiles-test.jsonc';
mkdirSync('.wrangler', { recursive: true });
const persist = mkdtempSync(resolve('.wrangler/discovery-api-'));
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
  { env, encoding: 'utf8', timeout: 90000 },
);
writeFileSync(`${persist}/migration.log`, `${migrate.stdout}\n${migrate.stderr}`);
assert.equal(migrate.status, 0, `Local migration failed: ${persist}/migration.log`);
const port = await new Promise<number>((done) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    assert(address && typeof address !== 'string');
    server.close(() => done(address.port));
  });
});
const origin = `http://127.0.0.1:${port}`;
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
const log = createWriteStream(`${persist}/worker.log`);
worker.stdout.pipe(log);
worker.stderr.pipe(log);
const stopped = new Promise<void>((done) => worker.on('exit', () => done()));
type Account = { id: string; cookie: string };
type Sql = { sql: string; args?: unknown[] };
type Pub = {
  id: string;
  slug: string;
  revision: number;
  currentVersionId: string;
  zone: string;
  standard: string;
};
type Item = {
  id: string;
  slug: string;
  title: string;
  author: { handle: string | null; displayName: string };
  zone: string;
  standard: string;
};
type List = { items: Item[]; nextCursor: string | null };
const passed: string[] = [];
async function check(name: string, run: () => Promise<void>) {
  await run();
  passed.push(name);
  console.log(`PASS ${name}`);
}
async function api<T = Record<string, unknown>>(
  path: string,
  account?: Account,
  method = 'GET',
  data?: unknown,
  expected = 200,
) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(account ? { Cookie: account.cookie } : {}),
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    redirect: 'manual',
  });
  const raw = await response.text();
  assert.equal(response.status, expected, `${method} ${path}: ${raw.slice(0, 500)}`);
  let body: T;
  try {
    body = JSON.parse(raw) as T;
  } catch {
    body = { error: raw } as T;
  }
  return { response, raw, body };
}
async function sql(...statements: Sql[]) {
  return (
    await api<{ results: Record<string, unknown>[] }[]>('/api/__profiles/sql', undefined, 'POST', {
      statements,
    })
  ).body.map((r) => r.results);
}
async function signup(label: string, role = 'individual'): Promise<Account> {
  const { response, body } = await api<{ user: { id: string } }>(
    '/api/auth/sign-up/email',
    undefined,
    'POST',
    {
      name: label,
      email: `${label}@discovery.test`,
      password: 'Local-password-123!',
      globalRole: 'super_admin',
    },
  );
  const account = {
    id: body.user.id,
    cookie: response.headers
      .getSetCookie()
      .map((v) => v.split(';')[0])
      .join('; '),
  };
  if (role !== 'individual') await api('/api/__test/role', account, 'POST', { role });
  return account;
}
async function profile(account: Account) {
  return (await api<{ profile: Profile }>('/api/me/profile', account)).body.profile;
}
async function edit(account: Account, patch: Partial<Profile>) {
  const p = await profile(account);
  return (
    await api<{ profile: Profile }>('/api/me/profile', account, 'PATCH', {
      revision: p.revision,
      displayName: p.displayName,
      handle: p.handle,
      bio: p.bio,
      institution: p.institution,
      level: p.level,
      visibility: p.visibility,
      showInstitution: p.showInstitution,
      showLevel: p.showLevel,
      allowForks: p.allowForks,
      ...patch,
    })
  ).body.profile;
}
async function publish(
  account: Account,
  title: string,
  zone: string,
  standard: string,
  tags: string[] = ['learning'],
) {
  const source = (
    await api<{ id: string; version: number }>(
      '/api/circuits',
      account,
      'POST',
      { name: `Private source for ${title}`, circuit: previewCircuit() },
      201,
    )
  ).body;
  const result = await api<{ publication: Pub }>(
    '/api/community/publications',
    account,
    'POST',
    {
      sourceCircuitId: source.id,
      sourceVersion: source.version,
      title,
      description: `${title} public description`,
      tags,
      zone,
      standard,
    },
    201,
  );
  return { publication: result.body.publication, source };
}
async function moderate(staff: Account, id: string, action: 'hide' | 'restore' | 'remove') {
  const detail = (
    await api<{ version: number; publication: { revision: number } }>(
      `/api/admin/community/publications/${id}`,
      staff,
    )
  ).body;
  await api(`/api/admin/community/publications/${id}/moderate`, staff, 'POST', {
    version: detail.version,
    publicationRevision: detail.publication.revision,
    action,
    reason: 'Reviewed the published circuit and its context.',
  });
}
const list = async (path: string, account?: Account) => (await api<List>(path, account)).body;
let complete = false;
try {
  const deadline = Date.now() + 60000;
  while (true) {
    try {
      if ((await fetch(`${origin}/api/health`)).ok) break;
    } catch {}
    if (Date.now() > deadline) throw new Error(`Worker startup timed out: ${persist}`);
    await delay(200);
  }
  const maya = await signup('maya');
  const lewis = await signup('lewis');
  const viewer = await signup('viewer');
  const staff = await signup('staff', 'super_admin');
  await edit(maya, { handle: 'maya', visibility: 'public', displayName: 'Maya R.' });
  await edit(lewis, { handle: 'lewis', visibility: 'public', displayName: 'Lewis T.' });
  await edit(viewer, { handle: 'viewer', visibility: 'public', displayName: 'Viewer V.' });
  const rcd = await publish(maya, 'RCD protected lighting', 'protection', 'uk', [
    'fault-finding',
    'beginner',
  ]);
  const relay = await publish(maya, 'Relay latch and reset', 'control', 'uk', ['switching']);
  const lamp = await publish(lewis, 'Lamp and manual switch', 'lighting', 'eu', ['beginner']);
  const mine = await publish(viewer, 'My supply circuit', 'power', 'int', ['learning']);
  await sql({
    sql: 'INSERT INTO follows(follower_id,followed_id,created_at) VALUES(?,?,?)',
    args: [viewer.id, maya.id, Date.now()],
  });
  await check(
    'public Explore SSR and JSON use immutable current snapshots and no editor bundle',
    async () => {
      const html = await api('/c/explore');
      assert.match(html.raw, /Ideas you can trace/);
      assert.match(html.raw, /RCD protected lighting/);
      assert.match(html.raw, /rel="canonical" href="http:\/\/127\.0\.0\.1:\d+\/c\/explore"/);
      assert.match(html.raw, /name="q"/);
      assert.match(html.response.headers.get('content-security-policy') ?? '', /script-src 'none'/);
      assert.match(html.response.headers.get('cache-control') ?? '', /no-store/);
      assert(!html.raw.includes(rcd.source.id));
      assert(!html.raw.includes('Private source for'));
      assert(!html.raw.includes('/app/assets/'));
      const data = await list('/api/community/explore');
      assert.equal(data.items.length, 4);
      assert(data.items.some((item) => item.slug === rcd.publication.slug));
      await api('/c/explore/', undefined, 'GET', undefined, 308);
    },
  );
  await check('FTS case, author, tag, zone and standard filters compose safely', async () => {
    assert.deepEqual(
      (await list('/api/community/search?q=rcd')).items.map((p) => p.id),
      [rcd.publication.id],
    );
    assert.deepEqual(
      (await list('/api/community/search?q=MAYA&zone=control&standard=uk&tag=switching')).items.map(
        (p) => p.id,
      ),
      [relay.publication.id],
    );
    assert.equal(
      (await list('/api/community/explore?zone=lighting&standard=eu&tag=beginner')).items[0]?.id,
      lamp.publication.id,
    );
    assert.equal((await list('/api/community/explore?q=maya&standard=us')).items.length, 0);
    await api('/api/community/search?q=%22%20%2A', undefined, 'GET', undefined, 400);
    await api('/api/community/explore?zone=invalid', undefined, 'GET', undefined, 400);
    await api('/api/community/explore?tag=%25', undefined, 'GET', undefined, 400);
    const plans = await sql(
      {
        sql: "EXPLAIN QUERY PLAN SELECT rowid FROM publication_fts WHERE publication_fts MATCH 'relay'",
      },
      {
        sql: 'EXPLAIN QUERY PLAN SELECT publication_id FROM publication_discovery ORDER BY published_at DESC,publication_id DESC LIMIT 12',
      },
    );
    assert(plans[0].some((row) => String(row.detail).includes('VIRTUAL TABLE INDEX')));
    assert(plans[1].some((row) => String(row.detail).includes('publication_discovery_recent')));
  });
  await check('keyset pagination and all three sorts keep stable boundaries', async () => {
    for (const sort of ['newest', 'oldest', 'title']) {
      const first = await list(`/api/community/explore?sort=${sort}&limit=2`);
      assert.equal(first.items.length, 2);
      assert(first.nextCursor);
      const second = await list(
        `/api/community/explore?sort=${sort}&limit=2&cursor=${encodeURIComponent(first.nextCursor!)}`,
      );
      assert.equal(second.items.length, 2);
      assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 4);
      await api(
        `/api/community/explore?sort=${sort}&limit=2&zone=power&cursor=${encodeURIComponent(first.nextCursor!)}`,
        undefined,
        'GET',
        undefined,
        400,
      );
    }
    const html = await api('/c/explore?limit=2');
    assert.match(html.raw, /rel="next"/);
    assert.match(html.raw, /Clear filters/);
  });
  await check(
    'following and own feed require a live session and exclude unrelated authors',
    async () => {
      await api('/api/community/feed', undefined, 'GET', undefined, 401);
      await api('/c/feed', undefined, 'GET', undefined, 401);
      const following = await list('/api/community/feed', viewer);
      assert.deepEqual(
        new Set(following.items.map((item) => item.id)),
        new Set([rcd.publication.id, relay.publication.id]),
      );
      const own = await list('/api/community/feed?view=mine', viewer);
      assert.deepEqual(
        own.items.map((item) => item.id),
        [mine.publication.id],
      );
      const html = await api('/c/feed', viewer);
      assert.match(html.raw, /Your feed/);
      assert.match(html.raw, /RCD protected lighting/);
      assert(!html.raw.includes('Lamp and manual switch'));
      assert.match(html.response.headers.get('cache-control') ?? '', /no-store/);
      assert.match(html.response.headers.get('content-security-policy') ?? '', /script-src 'none'/);
    },
  );
  await check(
    'private profile identity leaves visible circuits anonymous and clears author search',
    async () => {
      await edit(maya, { visibility: 'private' });
      assert.equal((await list('/api/community/search?q=maya')).items.length, 0);
      const still = await list('/api/community/search?q=rcd');
      assert.equal(still.items[0].author.handle, null);
      assert.equal(still.items[0].author.displayName, 'Community member');
      const html = await api('/c/explore?q=rcd');
      assert(!html.raw.includes('Maya R.'));
      await edit(maya, { visibility: 'public' });
      assert.equal((await list('/api/community/search?q=maya')).items.length, 2);
    },
  );
  await check(
    'publication, profile and follow changes during reads suppress stale responses',
    async () => {
      const hidden = await api(
        '/api/__profiles/race',
        undefined,
        'POST',
        {
          path: '/api/community/explore?q=relay',
          method: 'GET',
          point: 'discovery',
          statements: [
            {
              sql: "UPDATE publications SET moderation='hidden',revision=revision+1 WHERE id=?",
              args: [relay.publication.id],
            },
          ],
        },
        503,
      );
      assert.equal(hidden.response.headers.get('X-Test-Race-Fired'), 'true');
      assert(!hidden.raw.includes('Relay latch and reset'));
      await sql({
        sql: "UPDATE publications SET moderation='visible',revision=revision+1 WHERE id=?",
        args: [relay.publication.id],
      });
      const privateAuthor = await api(
        '/api/__profiles/race',
        undefined,
        'POST',
        {
          path: '/c/explore?q=relay',
          method: 'GET',
          point: 'discovery',
          statements: [
            {
              sql: "UPDATE profiles SET profile_visibility='private',revision=revision+1 WHERE user_id=?",
              args: [maya.id],
            },
          ],
        },
        503,
      );
      assert.equal(privateAuthor.response.headers.get('X-Test-Race-Fired'), 'true');
      assert(!privateAuthor.raw.includes('Maya R.'));
      await sql({
        sql: "UPDATE profiles SET profile_visibility='public',revision=revision+1 WHERE user_id=?",
        args: [maya.id],
      });
      const unfollowed = await api(
        '/api/__profiles/race',
        viewer,
        'POST',
        {
          path: '/api/community/feed',
          method: 'GET',
          point: 'discovery',
          statements: [
            {
              sql: 'DELETE FROM follows WHERE follower_id=? AND followed_id=?',
              args: [viewer.id, maya.id],
            },
          ],
        },
        503,
      );
      assert.equal(unfollowed.response.headers.get('X-Test-Race-Fired'), 'true');
      assert(!unfollowed.raw.includes('Relay latch and reset'));
      await sql({
        sql: 'INSERT INTO follows(follower_id,followed_id,created_at) VALUES(?,?,?)',
        args: [viewer.id, maya.id, Date.now()],
      });
    },
  );
  await check(
    'staff hide, restore and remove immediately change Explore, search and feed',
    async () => {
      await moderate(staff, rcd.publication.id, 'hide');
      assert.equal((await list('/api/community/search?q=rcd')).items.length, 0);
      assert.equal(
        (await list('/api/community/feed', viewer)).items.some(
          (item) => item.id === rcd.publication.id,
        ),
        false,
      );
      assert(!(await api('/c/explore')).raw.includes('RCD protected lighting'));
      await moderate(staff, rcd.publication.id, 'restore');
      assert.equal((await list('/api/community/search?q=rcd')).items.length, 1);
      await moderate(staff, rcd.publication.id, 'remove');
      assert.equal((await list('/api/community/search?q=rcd')).items.length, 0);
      assert.equal(
        (await list('/api/community/feed', viewer)).items.some(
          (item) => item.id === rcd.publication.id,
        ),
        false,
      );
    },
  );
  await check(
    'owner withdrawal removes listings without changing private source or immutable versions',
    async () => {
      await api(`/api/community/publications/${lamp.publication.id}/unpublish`, lewis, 'POST', {
        revision: lamp.publication.revision,
      });
      assert.equal((await list('/api/community/explore?zone=lighting')).items.length, 0);
      const rows = await sql({
        sql: 'SELECT COUNT(*) AS n FROM publication_versions WHERE publication_id=?',
        args: [lamp.publication.id],
      });
      assert.equal(rows[0][0].n, 1);
    },
  );
  complete = true;
  console.log(`Discovery HTTP groups: ${passed.length}; evidence: ${persist}`);
} finally {
  worker.kill('SIGTERM');
  await Promise.race([stopped, delay(10000)]);
  log.end();
  if (!complete) console.error(`Discovery test failed; inspect ${persist}`);
}
