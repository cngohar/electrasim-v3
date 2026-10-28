/** Real local Worker/D1/R2/cookie tests; each run owns fresh persistence. */
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
const persist = mkdtempSync(resolve('.wrangler/preview-api-'));
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
  { env, encoding: 'utf8', timeout: 60000 },
);
writeFileSync(`${persist}/migration.log`, `${migrate.stdout}\n${migrate.stderr}`);
assert.equal(migrate.status, 0, `${migrate.stdout}\n${migrate.stderr}`);
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
type Account = { id: string; cookie: string; email: string };
type Sql = { sql: string; args?: unknown[] };
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
  extra: Record<string, string> = {},
) {
  const response = await fetch(`${origin}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(account ? { Cookie: account.cookie } : {}),
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...extra,
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
  return { response, body, raw };
}
async function sql(...statements: Sql[]) {
  return (
    await api<{ results: Record<string, unknown>[] }[]>('/api/__profiles/sql', undefined, 'POST', {
      statements,
    })
  ).body.map((r) => r.results);
}
async function signup(label: string, role = 'individual'): Promise<Account> {
  const email = `${label}@profiles.test`;
  const { response, body } = await api<{ user: { id: string; globalRole: string } }>(
    '/api/auth/sign-up/email',
    undefined,
    'POST',
    { name: label, email, password: 'Local-password-123!', globalRole: 'super_admin' },
  );
  assert.equal(body.user.globalRole, 'individual');
  const account = {
    id: body.user.id,
    email,
    cookie: response.headers
      .getSetCookie()
      .map((v) => v.split(';')[0])
      .join('; '),
  };
  if (role !== 'individual') await api('/api/__test/role', account, 'POST', { role });
  return account;
}
async function get(account: Account) {
  return (await api<{ profile: Profile }>('/api/me/profile', account)).body.profile;
}
function fields(p: Profile, patch: Partial<Profile> = {}) {
  return {
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
  };
}
async function edit(account: Account, patch: Partial<Profile> = {}, expected = 200) {
  return api<{ profile: Profile }>(
    '/api/me/profile',
    account,
    'PATCH',
    fields(await get(account), patch),
    expected,
  );
}
async function claim(
  account: Account,
  handle: string,
  visibility: 'public' | 'private' = 'public',
) {
  return (
    await edit(account, {
      handle,
      visibility,
      displayName: `${handle} display`,
      bio: 'A practical circuit learner.',
    })
  ).body.profile;
}
type Pub = {
  id: string;
  slug: string;
  revision: number;
  currentVersionId: string;
  versionNumber: number;
};
const basic = previewCircuit();
async function publish(owner: Account, circuit: unknown = basic, title = 'Published preview') {
  const source = (
    await api<{ id: string; version: number }>(
      '/api/circuits',
      owner,
      'POST',
      { name: 'Private draft name', circuit },
      201,
    )
  ).body;
  const publication = (
    await api<{ publication: Pub }>(
      '/api/community/publications',
      owner,
      'POST',
      {
        sourceCircuitId: source.id,
        sourceVersion: source.version,
        title,
        description: 'A fixed public schematic.',
        tags: ['learning'],
      },
      201,
    )
  ).body.publication;
  return { publication, source };
}
const path = (p: Pub) => `/api/community/publications/${p.slug}/preview/simulate`;
const body = (p: Pub) => ({ versionId: p.currentVersionId, switches: {} });
async function race(
  account: Account,
  input: { path: string; method: string; body?: unknown; point: string; statements: Sql[] },
  expected: number,
) {
  const result = await api('/api/__profiles/race', account, 'POST', input, expected);
  assert.equal(result.response.headers.get('X-Test-Race-Fired'), 'true');
  return result;
}
async function grant(root: Account, account: Account) {
  const plan = (
    await api<{ id: string }>(
      '/api/admin/pro/plans',
      root,
      'POST',
      {
        slug: `preview-pro-${account.id.toLowerCase()}`,
        name: 'Preview pro',
        description: 'Local fixture',
        noExpiry: false,
        durationDays: 30,
        status: 'active',
        features: [{ featureKey: 'pro_components', enabled: true, config: {} }],
        reason: 'Local preview acceptance',
      },
      201,
    )
  ).body;
  return (
    await api<{ id: string }>(
      '/api/admin/pro/memberships',
      root,
      'POST',
      {
        userId: account.id,
        planId: plan.id,
        status: 'active',
        startsAt: Date.now() - 1000,
        endsAt: Date.now() + 86400000,
        noExpiry: false,
        reason: 'Local preview membership',
      },
      201,
    )
  ).body;
}
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
  const owner = await signup('preview_owner');
  const root = await signup('preview_root', 'super_admin');
  const free = await signup('preview_free');
  await claim(owner, 'preview_owner');
  const { publication: p, source } = await publish(owner);
  await check(
    'anonymous no-JS detail and standalone thumbnail contain the immutable schematic and strict headers',
    async () => {
      const page = await api(`/c/${p.slug}`);
      assert.match(page.raw, /<h1>Published preview<\/h1>/);
      assert.match(page.raw, /data-preview-svg/);
      assert.match(page.raw, /<script type="application\/ld\+json">/);
      assert.match(page.raw, /rel="canonical"/);
      assert.match(page.raw, /No fresh electrical assessment/);
      assert(!page.raw.includes('Private draft name'));
      assert(!page.raw.includes(source.id));
      assert(!page.raw.includes(owner.id));
      assert(!page.raw.includes(owner.email));
      assert.match(page.response.headers.get('cache-control')!, /no-store/);
      assert.match(page.response.headers.get('content-security-policy')!, /sha256-/);
      assert(!page.raw.includes(' style='));
      assert(!page.raw.includes('/app/assets/'));
      const image = await api(`/c/${p.slug}/thumbnail.svg`);
      assert.match(image.response.headers.get('content-type')!, /image\/svg\+xml/);
      assert.match(image.raw, /data-component-id="light"/);
      assert.match(image.response.headers.get('content-security-policy')!, /sandbox/);
      const again = await api(`/c/${p.slug}/thumbnail.svg`);
      assert.equal(image.raw, again.raw);
      await api(`/c/${p.slug}/`, undefined, 'GET', undefined, 308);
      await api('/c/unavailable', undefined, 'GET', undefined, 404);
      await api(`/c/${p.slug}?version=missing`, undefined, 'GET', undefined, 404);
      await api(`/c/${p.slug}/thumbnail.svg?version=missing`, undefined, 'GET', undefined, 404);
    },
  );
  await check(
    'anonymous Basic simulation is bounded, read-only and temporary; arbitrary circuits and automatic controls are rejected',
    async () => {
      const before = await sql(
        { sql: 'SELECT content,version FROM circuits WHERE id=?', args: [source.id] },
        {
          sql: 'SELECT COUNT(*) AS n FROM publication_versions WHERE publication_id=?',
          args: [p.id],
        },
      );
      const result = await api<{
        svg: string;
        versionId: string;
        simulationState: unknown;
        elapsedSeconds: number;
        energizedComponents: number;
      }>(path(p), undefined, 'POST', { ...body(p), switches: { switch: true } });
      assert.equal(result.body.versionId, p.currentVersionId);
      assert.match(result.body.svg, /data-preview-svg/);
      assert(result.body.simulationState);
      assert.equal(result.body.energizedComponents, 1);
      const off = await api<{ energizedComponents: number }>(path(p), undefined, 'POST', body(p));
      assert.equal(off.body.energizedComponents, 0);
      const stepped = await api<{ elapsedSeconds: number }>(path(p), undefined, 'POST', {
        ...body(p),
        switches: { switch: true },
        simulationState: result.body.simulationState,
        deltaSeconds: 0.25,
      });
      assert.equal(stepped.body.elapsedSeconds, 0.25);
      const switched = await api<{ elapsedSeconds: number; energizedComponents: number }>(
        path(p),
        undefined,
        'POST',
        {
          ...body(p),
          switches: { switch: false },
          simulationState: result.body.simulationState,
          deltaSeconds: 0,
        },
      );
      assert.equal(switched.body.elapsedSeconds, 0);
      assert.equal(switched.body.energizedComponents, 0);
      assert.match(result.response.headers.get('cache-control')!, /no-store/);
      await api(path(p), undefined, 'POST', { ...body(p), circuit: basic }, 400);
      await api(path(p), undefined, 'POST', { ...body(p), switches: { light: true } }, 400);
      await api(path(p), undefined, 'POST', { ...body(p), switches: { switch: 'yes' } }, 400);
      await api(
        path(p),
        undefined,
        'POST',
        { ...body(p), simulationState: {}, deltaSeconds: -1 },
        400,
      );
      await api(path(p), undefined, 'POST', body(p), 403, { Origin: 'https://invalid.test' });
      await api(path(p), undefined, 'POST', body(p), 415, { 'Content-Type': 'text/plain' });
      const after = await sql(
        { sql: 'SELECT content,version FROM circuits WHERE id=?', args: [source.id] },
        {
          sql: 'SELECT COUNT(*) AS n FROM publication_versions WHERE publication_id=?',
          args: [p.id],
        },
      );
      assert.deepEqual(before, after);
    },
  );
  await check(
    'private edits and republication cannot mutate old preview versions or cross publication identities',
    async () => {
      await api(`/api/circuits/${source.id}`, owner, 'PATCH', {
        name: 'Changed private',
        version: 1,
        circuit: {
          ...basic,
          components: [{ ...basic.components[0], id: 'secret-private-component' }],
          wires: [],
        },
      });
      const old = await api(`/c/${p.slug}`);
      assert(!old.raw.includes('secret-private-component'));
      const second = (
        await api<{ publication: Pub }>(`/api/community/publications/${p.id}`, owner, 'PATCH', {
          revision: p.revision,
          sourceVersion: 2,
          title: 'Second public version',
        })
      ).body.publication;
      assert.equal(second.versionNumber, 2);
      const latest = await api(`/c/${p.slug}`);
      assert.match(latest.raw, /secret-private-component/);
      const earlier = await api(`/c/${p.slug}?version=${p.currentVersionId}`);
      assert.match(earlier.raw, /Viewing an earlier published version/);
      assert(!earlier.raw.includes('data-component-id="secret-private-component"'));
      const other = (await publish(owner)).publication;
      await api(path(other), undefined, 'POST', { versionId: p.currentVersionId }, 404);
      await api(`/c/${other.slug}?version=${p.currentVersionId}`, undefined, 'GET', undefined, 404);
    },
  );
  await check(
    'private/moderated author identity becomes neutral in metadata and HTML without hiding a visible schematic',
    async () => {
      await edit(owner, { visibility: 'private' });
      const page = await api(`/c/${p.slug}`);
      assert.match(page.raw, /Community member/);
      assert(!page.raw.includes('preview_owner display'));
      assert(!page.raw.includes('/u/preview_owner'));
      await edit(owner, { visibility: 'public' });
      const result = await race(
        owner,
        {
          path: `/c/${p.slug}`,
          method: 'GET',
          point: 'preview-attribution',
          statements: [
            {
              sql: "UPDATE profiles SET profile_visibility='private',revision=revision+1 WHERE user_id=?",
              args: [owner.id],
            },
          ],
        },
        404,
      );
      assert(!result.raw.includes('preview_owner display'));
      await edit(owner, { visibility: 'public' });
    },
  );
  const paid = await signup('preview_paid');
  await claim(paid, 'preview_paid');
  const entitlement = await grant(root, paid);
  const premium = {
    ...basic,
    components: [
      ...basic.components,
      { id: 'premium', type: 'afdd', x: 600, y: 130, rotation: 0, state: {} },
    ],
  };
  const pro = (await publish(paid, premium)).publication;
  await check(
    'Pro schematics remain public while anonymous, Free and staff without benefits cannot simulate',
    async () => {
      assert.match((await api(`/c/${pro.slug}`)).raw, /data-component-id="premium"/);
      await api(`/c/${pro.slug}/thumbnail.svg`);
      await api(path(pro), undefined, 'POST', body(pro), 401);
      await api(path(pro), free, 'POST', body(pro), 403);
      await api(path(pro), root, 'POST', body(pro), 403);
      await api(path(pro), paid, 'POST', body(pro));
      await api(path(pro), paid, 'POST', { ...body(pro), switches: { premium: true } }, 400);
    },
  );
  await check(
    'preview simulation reclassifies the live policy rather than trusting captured requirements',
    async () => {
      await sql(
        {
          sql: "INSERT INTO component_access_overrides(component_id,access,version,actor_id,created_at,updated_at) VALUES('afdd','free',1,?,0,?)",
          args: [root.id, Date.now()],
        },
        { sql: 'UPDATE component_access_revision SET revision=revision+1 WHERE id=1' },
      );
      await api(path(pro), undefined, 'POST', body(pro));
      await sql(
        {
          sql: "UPDATE component_access_overrides SET access='pro',version=version+1 WHERE component_id='afdd'",
        },
        { sql: 'UPDATE component_access_revision SET revision=revision+1 WHERE id=1' },
      );
      await api(path(pro), free, 'POST', body(pro), 403);
      const result = await race(
        paid,
        {
          path: path(pro),
          method: 'POST',
          body: body(pro),
          point: 'preview-policy',
          statements: [
            { sql: 'UPDATE component_access_revision SET revision=revision+1 WHERE id=1' },
          ],
        },
        409,
      );
      assert(!result.raw.includes('data-preview-svg'));
    },
  );
  await check(
    'post-computation membership suspension, expiry, session revocation and account suspension never return results',
    async () => {
      for (const point of ['preview-membership', 'preview-result']) {
        await race(
          paid,
          {
            path: path(pro),
            method: 'POST',
            body: body(pro),
            point,
            statements: [
              {
                sql: "UPDATE entitlements SET status='suspended' WHERE id=?",
                args: [entitlement.id],
              },
            ],
          },
          point === 'preview-result' ? 409 : 403,
        );
        await sql({
          sql: "UPDATE entitlements SET status='active' WHERE id=?",
          args: [entitlement.id],
        });
      }
      await race(
        paid,
        {
          path: path(pro),
          method: 'POST',
          body: body(pro),
          point: 'preview-result',
          statements: [
            {
              sql: 'UPDATE entitlements SET ends_at=? WHERE id=?',
              args: [Date.now() - 1, entitlement.id],
            },
          ],
        },
        409,
      );
      await sql({
        sql: 'UPDATE entitlements SET ends_at=? WHERE id=?',
        args: [Date.now() + 86400000, entitlement.id],
      });
      await race(
        paid,
        {
          path: path(pro),
          method: 'POST',
          body: body(pro),
          point: 'preview-result',
          statements: [{ sql: 'DELETE FROM session WHERE user_id=?', args: [paid.id] }],
        },
        409,
      );
      await api(path(pro), paid, 'POST', body(pro), 401);
      await race(
        free,
        {
          path: path(p),
          method: 'POST',
          body: body(p),
          point: 'preview-result',
          statements: [
            {
              sql: 'INSERT INTO account_controls(user_id,suspended,version,updated_at) VALUES(?,1,1,0)',
              args: [free.id],
            },
          ],
        },
        409,
      );
    },
  );
  await check(
    'moderation and withdrawal hide detail, old versions, thumbnails and simulation; read races do not leak',
    async () => {
      const current = (await publish(owner)).publication;
      for (const point of ['read', 'preview-result']) {
        const target = point === 'read' ? `/c/${current.slug}` : path(current);
        await race(
          owner,
          {
            path: target,
            method: point === 'read' ? 'GET' : 'POST',
            ...(point === 'read' ? {} : { body: body(current) }),
            point,
            statements: [
              {
                sql: "UPDATE publications SET moderation='hidden',revision=revision+1 WHERE id=?",
                args: [current.id],
              },
            ],
          },
          point === 'read' ? 404 : 409,
        );
        await sql({
          sql: "UPDATE publications SET moderation='visible',revision=revision+1 WHERE id=?",
          args: [current.id],
        });
      }
      await race(
        owner,
        {
          path: `/c/${current.slug}/thumbnail.svg`,
          method: 'GET',
          point: 'read',
          statements: [
            {
              sql: "UPDATE publications SET status='unpublished',revision=revision+1 WHERE id=?",
              args: [current.id],
            },
          ],
        },
        404,
      );
      for (const state of ['hidden', 'removed', 'unpublished', 'deleted']) {
        await sql({
          sql: `UPDATE publications SET ${['hidden', 'removed'].includes(state) ? 'moderation' : 'status'}=?,revision=revision+1 WHERE id=?`,
          args: [state, current.id],
        });
        await api(`/c/${current.slug}`, undefined, 'GET', undefined, 404);
        await api(
          `/c/${current.slug}?version=${current.currentVersionId}`,
          undefined,
          'GET',
          undefined,
          404,
        );
        await api(
          `/c/${current.slug}/thumbnail.svg?version=${current.currentVersionId}`,
          undefined,
          'GET',
          undefined,
          404,
        );
        await api(path(current), undefined, 'POST', body(current), 404);
        if (state === 'hidden')
          await sql({
            sql: "UPDATE publications SET status='published',moderation='visible',revision=revision+1 WHERE id=?",
            args: [current.id],
          });
      }
    },
  );
  await check(
    'simulation and body limits reject oversized inputs without publishing or saving a result',
    async () => {
      const large = previewCircuit();
      for (let i = 0; i < 499; i++)
        large.components.push({
          id: `extra-${i}`,
          type: 'bulb',
          x: i,
          y: 400,
          rotation: 0,
          state: {},
        });
      const oversized = (await publish(owner, large)).publication;
      await api(path(oversized), undefined, 'POST', body(oversized), 413);
      await api(path(p), undefined, 'POST', { ...body(p), padding: 'x'.repeat(1024 * 1024) }, 413);
      await api(path(p), undefined, 'POST', { ...body(p), deltaSeconds: 1e6 }, 400);
    },
  );
  complete = true;
  console.log(`Preview API: ${passed.length} groups passed. Evidence ${persist}`);
} finally {
  writeFileSync(`${persist}/result.json`, JSON.stringify({ complete, passed }, null, 2));
  worker.kill('SIGTERM');
  await stopped;
  log.end();
}
