/** Real local Worker/D1/R2/cookie tests; each run owns fresh persistence. */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import type { Profile } from '../src/community/profile-policy';
const config = 'wrangler.profiles-test.jsonc';
mkdirSync('.wrangler', { recursive: true });
const persist = mkdtempSync(resolve('.wrangler/publications-api-'));
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
async function detail(staff: Account, target: Account) {
  return (
    await api<{
      version: number;
      profile: Profile;
      reports: { id: string; revision: number; status: string }[];
      history: { action: string }[];
    }>(`/api/admin/community/profiles/${target.id}`, staff)
  ).body;
}
async function moderate(staff: Account, target: Account, action: string, expected = 200) {
  const d = await detail(staff, target);
  return api(
    `/api/admin/community/profiles/${target.id}/moderate`,
    staff,
    'POST',
    {
      version: d.version,
      profileRevision: d.profile.revision,
      action,
      reason: 'Reviewed local profile fixture.',
    },
    expected,
  );
}
async function settings(staff: Account, patch: Record<string, unknown>) {
  const d = (
    await api<{ version: number; values: Record<string, unknown> }>(
      '/api/admin/settings/community',
      staff,
    )
  ).body;
  return api('/api/admin/settings/community', staff, 'PATCH', {
    version: d.version,
    values: { ...d.values, ...patch },
    reason: 'Local profile policy fixture',
  });
}
async function race(
  account: Account,
  input: { path: string; method: string; body?: unknown; point: string; statements: Sql[] },
  status: number,
) {
  const result = await api('/api/__profiles/race', account, 'POST', input, status);
  assert.equal(result.response.headers.get('X-Test-Race-Fired'), 'true');
  return result;
}
type Pub = {
  id: string;
  slug: string;
  sourceCircuitId: string;
  revision: number;
  currentVersionId: string;
  versionNumber: number;
  title: string;
  status: string;
  moderation: string;
};
const basic = {
  components: [{ id: 'light', type: 'bulb', x: 100, y: 100, rotation: 0, state: {} }],
  wires: [],
};
async function save(a: Account, circuit: unknown = basic) {
  return (
    await api<{ id: string; version: number }>(
      '/api/circuits',
      a,
      'POST',
      { name: 'Private draft', circuit },
      201,
    )
  ).body;
}
async function owned(a: Account, id: string) {
  return (await api<{ publication: Pub }>(`/api/me/publications/${id}`, a)).body.publication;
}
async function publishing(
  a: Account,
  source: { id: string; version: number },
  patch: Record<string, unknown> = {},
  p?: Pub,
  expected = p ? 200 : 201,
) {
  return api<{ publication: Pub }>(
    `/api/community/publications${p ? `/${p.id}` : ''}`,
    a,
    p ? 'PATCH' : 'POST',
    {
      sourceCircuitId: source.id,
      sourceVersion: source.version,
      title: 'Learning circuit',
      description: 'A fixed snapshot.',
      tags: ['learning'],
      ...(p ? { revision: p.revision } : {}),
      ...patch,
    },
    expected,
  );
}
async function staffDetail(a: Account, id: string) {
  return (
    await api<{
      version: number;
      publication: Pub;
      reports: { id: string; revision: number; status: string; versionId: string }[];
      history: { action: string }[];
    }>(`/api/admin/community/publications/${id}`, a)
  ).body;
}
async function staffModerate(a: Account, id: string, action: string, expected = 200) {
  const d = await staffDetail(a, id);
  return api(
    `/api/admin/community/publications/${id}/moderate`,
    a,
    'POST',
    {
      version: d.version,
      publicationRevision: d.publication.revision,
      action,
      reason: 'Reviewed the immutable local snapshot.',
    },
    expected,
  );
}
async function unavailable(p: Pub) {
  for (const path of [
    `/api/community/publications/${p.slug}`,
    `/api/community/publications/${p.slug}/versions`,
    `/api/community/publications/${p.slug}/versions/${p.currentVersionId}`,
  ])
    await api(path, undefined, 'GET', undefined, 404);
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
  const owner = await signup('owner');
  const other = await signup('other');
  const staff = await signup('staff', 'moderator');
  const root = await signup('root', 'super_admin');
  await claim(other, 'other_builder');
  const source = await save(owner);
  let p: Pub;
  await check(
    'sessions, saved ownership, handle onboarding, origin, JSON and field validation',
    async () => {
      await api('/api/community/publications', undefined, 'POST', {}, 401);
      await publishing(owner, source, {}, undefined, 409);
      await claim(owner, 'owner_builder');
      await publishing(other, source, {}, undefined, 404);
      await publishing(owner, source, { sourceVersion: 99 }, undefined, 409);
      await publishing(owner, source, { tags: ['aa', 'AA'] }, undefined, 400);
      await publishing(owner, source, { tags: ['a'] }, undefined, 400);
      await publishing(owner, source, { certified: true }, undefined, 400);
      await api('/api/community/publications', owner, 'POST', {}, 403, {
        Origin: 'http://untrusted.invalid',
      });
      await api('/api/community/publications', owner, 'POST', {}, 415, {
        'Content-Type': 'text/plain',
      });
      p = (await publishing(owner, source)).body.publication;
      assert.equal(p.versionNumber, 1);
      assert.equal(p.revision, 1);
    },
  );
  await check(
    'public snapshot excludes private identifiers and records requirements and honest provenance',
    async () => {
      const d = await api(`/api/community/publications/${p.slug}`);
      assert.doesNotMatch(d.raw, /sourceCircuitId|ownerId|userId|@profiles.test|mutationId/);
      const v = await api<{
        version: {
          circuit: typeof basic;
          fingerprint: string;
          verifiedAt: null;
          requirements: string[];
          circuitSchemaVersion: number;
        };
      }>(`/api/community/publications/${p.slug}/versions/${p.currentVersionId}`);
      assert.deepEqual(
        v.body.version.circuit,
        (await api<{ circuit: unknown }>(`/api/circuits/${source.id}`, owner)).body.circuit,
      );
      assert.match(v.body.version.fingerprint, /^[0-9a-f]{64}$/);
      assert.equal(v.body.version.verifiedAt, null);
      assert.deepEqual(v.body.version.requirements, []);
      assert.equal(v.body.version.circuitSchemaVersion, 3);
      assert.match(v.response.headers.get('cache-control') ?? '', /no-store/);
    },
  );
  const firstId = () => p.currentVersionId;
  let originalVersion = '';
  await check(
    'private edits never leak; republish creates a fixed new version and stable slug',
    async () => {
      originalVersion = firstId();
      const slug = p.slug;
      const changed = structuredClone(basic);
      changed.components[0].x = 210;
      await api(`/api/circuits/${source.id}`, owner, 'PATCH', {
        version: 1,
        name: 'Still private',
        circuit: changed,
      });
      const v = await api<{ version: { circuit: typeof basic } }>(
        `/api/community/publications/${p.slug}/versions/${originalVersion}`,
      );
      assert.equal(v.body.version.circuit.components[0].x, 100);
      source.version = 2;
      p = (
        await publishing(
          owner,
          source,
          { title: 'New public title', tags: ['motors', 'learning'] },
          p,
        )
      ).body.publication;
      assert.equal(p.slug, slug);
      assert.equal(p.versionNumber, 2);
      assert.notEqual(p.currentVersionId, originalVersion);
      const old = await api<{ version: { title: string } }>(
        `/api/community/publications/${p.slug}/versions/${originalVersion}`,
      );
      assert.equal(old.body.version.title, 'Learning circuit');
      const history = await api<{ items: { versionNumber: number }[]; nextCursor: number }>(
        `/api/community/publications/${p.slug}/versions?limit=1`,
      );
      assert.equal(history.body.items[0].versionNumber, 2);
      assert.equal(history.body.nextCursor, 2);
      const page = await api<{ items: { versionNumber: number }[] }>(
        `/api/community/publications/${p.slug}/versions?before=2`,
      );
      assert.equal(page.body.items[0].versionNumber, 1);
    },
  );
  await check(
    'profile listing and server HTML contain only visible publication metadata',
    async () => {
      const result = await api<{ items: Pub[] }>('/api/community/users/owner_builder/publications');
      assert.equal(result.body.items.length, 1);
      const html = await api('/u/owner_builder');
      assert.match(html.raw, /New public title/);
      assert.match(html.raw, /View snapshot/);
      assert.doesNotMatch(html.raw, /Still private|sourceCircuitId|circuitJson/);
    },
  );
  await check(
    'profile privacy and moderation use neutral attribution without hiding snapshots',
    async () => {
      await edit(owner, { visibility: 'private' });
      let d = await api<{ author: { displayName: string; handle: null } }>(
        `/api/community/publications/${p.slug}`,
      );
      assert.equal(d.body.author.handle, null);
      assert.equal(d.body.author.displayName, 'Community member');
      await edit(owner, { visibility: 'public' });
      await moderate(staff, owner, 'hide');
      d = await api(`/api/community/publications/${p.slug}`);
      assert.equal((d.body.author as { handle: null }).handle, null);
      await moderate(staff, owner, 'restore');
    },
  );
  await check(
    'owner boundaries and stale revisions reject writes without new snapshots',
    async () => {
      await api(`/api/me/publications/${p.id}`, other, 'GET', undefined, 404);
      await publishing(other, source, {}, p, 404);
      await publishing(owner, source, { revision: 1 }, p, 409);
      await api(
        `/api/community/publications/${p.id}/unpublish`,
        other,
        'POST',
        { revision: p.revision },
        404,
      );
      await publishing(owner, source, {}, undefined, 409);
    },
  );
  await check(
    'unpublish gates all historical reads; republish advances version instead of rewriting',
    async () => {
      await api(`/api/community/publications/${p.id}/unpublish`, owner, 'POST', {
        revision: p.revision,
      });
      p = await owned(owner, p.id);
      await unavailable(p);
      const profile = await api<{ items: unknown[] }>(
        '/api/community/users/owner_builder/publications',
      );
      assert.equal(profile.body.items.length, 0);
      p = (await publishing(owner, source, {}, p)).body.publication;
      assert.equal(p.versionNumber, 3);
    },
  );
  await check(
    'staff hide survives owner republish; restore preserves owner withdrawal',
    async () => {
      await staffModerate(staff, p.id, 'hide');
      p = await owned(owner, p.id);
      await unavailable(p);
      p = (await publishing(owner, source, { description: 'Owner cannot clear moderation' }, p))
        .body.publication;
      assert.equal(p.moderation, 'hidden');
      await unavailable(p);
      await api(`/api/community/publications/${p.id}/unpublish`, owner, 'POST', {
        revision: p.revision,
      });
      await staffModerate(staff, p.id, 'restore');
      p = await owned(owner, p.id);
      assert.equal(p.status, 'unpublished');
      await unavailable(p);
      p = (await publishing(owner, source, {}, p)).body.publication;
    },
  );
  await check(
    'saved circuit, profile default and component policy races cannot create versions or quota',
    async () => {
      const current = await owned(owner, p.id);
      const body = {
        sourceCircuitId: source.id,
        sourceVersion: source.version,
        revision: current.revision,
        title: 'Racing snapshot',
        description: '',
        tags: [],
      };
      for (const statements of [
        [{ sql: 'UPDATE circuits SET version=version+1 WHERE id=?', args: [source.id] }],
        [{ sql: 'UPDATE profiles SET revision=revision+1 WHERE user_id=?', args: [owner.id] }],
        [{ sql: 'UPDATE admin_revision SET version=version+1 WHERE id=1' }],
        [{ sql: 'UPDATE component_access_revision SET revision=revision+1 WHERE id=1' }],
      ]) {
        const count = (await sql({ sql: 'SELECT COUNT(*) AS n FROM publication_versions' }))[0];
        await race(
          owner,
          {
            path: `/api/community/publications/${p.id}`,
            method: 'PATCH',
            body: { ...body, sourceVersion: source.version },
            point: 'write',
            statements,
          },
          409,
        );
        assert.deepEqual(
          (await sql({ sql: 'SELECT COUNT(*) AS n FROM publication_versions' }))[0],
          count,
        );
        const row = (
          await sql({ sql: 'SELECT version FROM circuits WHERE id=?', args: [source.id] })
        )[0][0];
        source.version = Number(row.version);
      }
    },
  );
  await check(
    'owner revoked-session, suspension and restriction races cannot publish',
    async () => {
      for (const action of ['revoke', 'suspend', 'restrict']) {
        const a = await signup(`race_${action}`);
        await claim(a, `race_${action}`);
        const s = await save(a);
        const statements: Sql[] =
          action === 'revoke'
            ? [{ sql: 'DELETE FROM session WHERE user_id=?', args: [a.id] }]
            : action === 'suspend'
              ? [
                  {
                    sql: 'INSERT INTO account_controls(user_id,suspended,version,updated_at) VALUES(?,1,1,1)',
                    args: [a.id],
                  },
                ]
              : [
                  {
                    sql: 'INSERT INTO community_restrictions(id,user_id,starts_at,reason,actor_id,version) VALUES(?,?,0,?,?,1)',
                    args: [`restriction-${a.id}`, a.id, 'Local restriction', root.id],
                  },
                ];
        await race(
          a,
          {
            path: '/api/community/publications',
            method: 'POST',
            body: { sourceCircuitId: s.id, sourceVersion: s.version, title: 'Forbidden snapshot' },
            point: 'write',
            statements,
          },
          409,
        );
        assert.equal(
          (
            await sql({
              sql: 'SELECT COUNT(*) AS n FROM publications WHERE owner_id=?',
              args: [a.id],
            })
          )[0][0].n,
          0,
        );
      }
    },
  );
  await check(
    'response race rejects a competing revision instead of attaching it to an earlier save',
    async () => {
      p = await owned(owner, p.id);
      await race(
        owner,
        {
          path: `/api/community/publications/${p.id}`,
          method: 'PATCH',
          body: { sourceVersion: source.version, revision: p.revision, title: 'First decision' },
          point: 'response',
          statements: [
            {
              sql: "UPDATE publications SET status='unpublished',revision=revision+1,mutation_id='competing' WHERE id=?",
              args: [p.id],
            },
          ],
        },
        409,
      );
      p = await owned(owner, p.id);
      assert.equal(p.status, 'unpublished');
      p = (await publishing(owner, source, {}, p)).body.publication;
    },
  );
  await check('public detail and snapshot reads recheck concurrent withdrawal', async () => {
    for (const path of [
      `/api/community/publications/${p.slug}`,
      `/api/community/publications/${p.slug}/versions`,
      `/api/community/publications/${p.slug}/versions/${p.currentVersionId}`,
    ]) {
      await race(
        other,
        {
          path,
          method: 'GET',
          point: 'read',
          statements: [
            {
              sql: "UPDATE publications SET status='unpublished',revision=revision+1 WHERE id=?",
              args: [p.id],
            },
          ],
        },
        404,
      );
      p = await owned(owner, p.id);
      p = (await publishing(owner, source, {}, p)).body.publication;
    }
  });
  await check(
    'publication reporting deduplicates, auto-hides at distinct eligible threshold and records audit',
    async () => {
      await settings(root, { autoHideThreshold: 2 });
      const report = {
        reason: 'Unsafe or misleading',
        details: 'Inspect the published wiring and labels.',
      };
      await api(`/api/community/publications/${p.slug}/reports`, owner, 'POST', report, 403);
      await api(`/api/community/publications/${p.slug}/reports`, other, 'POST', report, 201);
      const duplicate = await api(
        `/api/community/publications/${p.slug}/reports`,
        other,
        'POST',
        report,
      );
      assert.equal(duplicate.body.duplicate, true);
      const reporter = await signup('reporter');
      await api(`/api/community/publications/${p.slug}/reports`, reporter, 'POST', report, 201);
      p = await owned(owner, p.id);
      assert.equal(p.moderation, 'hidden');
      await unavailable(p);
      const d = await staffDetail(staff, p.id);
      assert.equal(d.reports.length, 2);
      assert(d.history.some((h) => h.action === 'community.publications.auto-hide'));
    },
  );
  await check(
    'report resolution requires current revision/reason and never restores subject visibility',
    async () => {
      const d = await staffDetail(staff, p.id);
      const report = d.reports[0];
      await api(
        `/api/admin/community/publication-reports/${report.id}/resolve`,
        staff,
        'POST',
        {
          version: d.version,
          reportRevision: report.revision,
          outcome: 'dismissed',
          reason: 'Short',
        },
        400,
      );
      await api(`/api/admin/community/publication-reports/${report.id}/resolve`, staff, 'POST', {
        version: d.version,
        reportRevision: report.revision,
        outcome: 'dismissed',
        reason: 'Insufficient evidence in this individual report.',
      });
      p = await owned(owner, p.id);
      assert.equal(p.moderation, 'hidden');
      const access = (await api<{ version: number }>('/api/admin/access', staff)).body;
      await api(
        `/api/admin/community/publication-reports/${report.id}/resolve`,
        staff,
        'POST',
        {
          version: access.version,
          reportRevision: report.revision,
          outcome: 'resolved',
          reason: 'Stale report review rejected.',
        },
        409,
      );
      await staffModerate(staff, p.id, 'restore');
      p = await owned(owner, p.id);
    },
  );
  await check(
    'staff reads cannot expose private circuit edits and role/session races cannot moderate',
    async () => {
      await api('/api/admin/community/publications', other, 'GET', undefined, 403);
      await api('/api/admin/ping', staff, 'GET', undefined, 403);
      const snapshot = await api(
        `/api/admin/community/publications/${p.id}/versions/${originalVersion}`,
        staff,
      );
      assert.doesNotMatch(snapshot.raw, /Still private|sourceCircuitId|ownerId|@profiles.test/);
      for (const action of ['role', 'revoke']) {
        const a = await signup(`staff_${action}`, 'moderator');
        const d = await staffDetail(a, p.id);
        await race(
          a,
          {
            path: `/api/admin/community/publications/${p.id}/moderate`,
            method: 'POST',
            body: {
              version: d.version,
              publicationRevision: d.publication.revision,
              action: 'hide',
              reason: 'Stale staff request is rejected.',
            },
            point: 'admin',
            statements:
              action === 'role'
                ? [{ sql: "UPDATE user SET global_role='individual' WHERE id=?", args: [a.id] }]
                : [{ sql: 'DELETE FROM session WHERE user_id=?', args: [a.id] }],
          },
          409,
        );
        assert.equal((await owned(owner, p.id)).moderation, 'visible');
      }
    },
  );
  await check(
    'banned text and pre-moderation persist through owner edits; failed audit rolls back snapshot',
    async () => {
      await settings(root, { bannedWords: ['blocked_sample'] });
      p = await owned(owner, p.id);
      await sql({
        sql: "CREATE TRIGGER fail_publication_audit BEFORE INSERT ON admin_audit WHEN NEW.action='community.publications.auto-hide' BEGIN SELECT RAISE(ABORT,'Local rollback'); END",
      });
      const before = p;
      await publishing(owner, source, { description: 'blocked_sample' }, p, 503);
      assert.equal((await owned(owner, p.id)).revision, before.revision);
      await sql({ sql: 'DROP TRIGGER fail_publication_audit' });
      p = (await publishing(owner, source, { description: 'blocked_sample' }, p)).body.publication;
      assert.equal(p.moderation, 'hidden');
      p = (await publishing(owner, source, { description: 'Clean text' }, p)).body.publication;
      assert.equal(p.moderation, 'hidden');
      await staffModerate(staff, p.id, 'restore');
      await settings(root, { bannedWords: [], preModeration: true });
      const held = (await publishing(owner, await save(owner))).body.publication;
      assert.equal(held.moderation, 'hidden');
      await unavailable(held);
      await settings(root, { preModeration: false });
      p = await owned(owner, p.id);
    },
  );
  await check(
    'identical titles allocate distinct stable slugs; deleted source still allows owner withdrawal',
    async () => {
      const s = await save(owner);
      const a = (await publishing(owner, s)).body.publication;
      assert.notEqual(a.slug, p.slug);
      await api(`/api/circuits/${s.id}`, owner, 'DELETE', { version: s.version });
      await api(`/api/community/publications/${a.slug}`);
      await api(`/api/community/publications/${a.id}/unpublish`, owner, 'POST', {
        revision: a.revision,
      });
      await unavailable(a);
    },
  );
  await check(
    'staff removal and owner deletion retain terminal tombstones across every version read',
    async () => {
      await staffModerate(staff, p.id, 'remove');
      p = await owned(owner, p.id);
      await unavailable(p);
      await publishing(owner, source, {}, p, 409);
      await staffModerate(staff, p.id, 'restore', 409);
      const s = await save(owner);
      const a = (await publishing(owner, s)).body.publication;
      await api(`/api/community/publications/${a.id}`, owner, 'DELETE', { revision: a.revision });
      const deleted = await owned(owner, a.id);
      assert.equal(deleted.status, 'deleted');
      await unavailable(deleted);
      await publishing(owner, s, {}, deleted, 409);
      await publishing(owner, s, {}, undefined, 409);
    },
  );
  await check(
    'publication write and cross-subject report limits deny excess without charging duplicates',
    async () => {
      await settings(root, { writesPerMinute: 1, reportsPerDay: 1 });
      const a = await signup('limited');
      await claim(a, 'limited_builder');
      const s = await save(a);
      const pub = (await publishing(a, s)).body.publication;
      await publishing(a, s, {}, pub, 429);
      const reporter = await signup('limited_reporter');
      const report = { reason: 'Other', details: 'Local review sample' };
      await api(`/api/community/publications/${pub.slug}/reports`, reporter, 'POST', report, 201);
      await api(`/api/community/publications/${pub.slug}/reports`, reporter, 'POST', report);
      const s2 = await save(other);
      const pub2 = (await publishing(other, s2)).body.publication;
      await api(`/api/community/publications/${pub2.slug}/reports`, reporter, 'POST', report, 429);
      await api('/api/community/users/other_builder/reports', reporter, 'POST', report, 429);
      const profileReporter = await signup('profile_first_reporter');
      await api('/api/community/users/other_builder/reports', profileReporter, 'POST', report, 201);
      await api(
        `/api/community/publications/${pub2.slug}/reports`,
        profileReporter,
        'POST',
        report,
        429,
      );
      await settings(root, { writesPerMinute: 20, reportsPerDay: 10 });
    },
  );
  await check(
    'premium snapshots capture actual requirements and block membership revocation races',
    async () => {
      const paid = await signup('paid');
      await claim(paid, 'paid_builder');
      const plan = (
        await api<{ id: string }>(
          '/api/admin/pro/plans',
          root,
          'POST',
          {
            slug: 'publication-pro',
            name: 'Publication pro',
            description: 'Local fixture',
            noExpiry: false,
            durationDays: 30,
            status: 'active',
            features: [{ featureKey: 'pro_components', enabled: true, config: {} }],
            reason: 'Local publication acceptance',
          },
          201,
        )
      ).body;
      const grant = (
        await api<{ id: string }>(
          '/api/admin/pro/memberships',
          root,
          'POST',
          {
            userId: paid.id,
            planId: plan.id,
            status: 'active',
            startsAt: Date.now() - 1000,
            endsAt: Date.now() + 86400000,
            noExpiry: false,
            reason: 'Local publication membership',
          },
          201,
        )
      ).body;
      const premium = structuredClone(basic);
      premium.components.push({
        id: 'premium',
        type: 'afdd',
        x: 300,
        y: 100,
        rotation: 0,
        state: {},
      });
      const source = await save(paid, premium);
      const publication = (await publishing(paid, source)).body.publication;
      const snapshot = await api<{ version: { requirements: string[] } }>(
        `/api/community/publications/${publication.slug}/versions/${publication.currentVersionId}`,
      );
      assert(snapshot.body.version.requirements.includes('pro_components'));
      await race(
        paid,
        {
          path: `/api/community/publications/${publication.id}`,
          method: 'PATCH',
          point: 'write',
          body: {
            sourceVersion: 1,
            revision: publication.revision,
            title: 'Revoked membership snapshot',
          },
          statements: [
            { sql: "UPDATE entitlements SET status='suspended' WHERE id=?", args: [grant.id] },
          ],
        },
        409,
      );
      await publishing(paid, source, {}, publication, 403);
      await api(
        `/api/community/publications/${publication.slug}/versions/${publication.currentVersionId}`,
      );
      await api(`/api/community/publications/${publication.id}/unpublish`, paid, 'POST', {
        revision: publication.revision,
      });
    },
  );
  await check(
    'report auto-hide and insertion roll back together when its audit cannot commit',
    async () => {
      const a = await signup('report_rollback_a');
      const b = await signup('report_rollback_b');
      const target = (await publishing(owner, await save(owner))).body.publication;
      const report = { reason: 'Spam', details: 'Local rollback review fixture' };
      await api(`/api/community/publications/${target.slug}/reports`, a, 'POST', report, 201);
      await sql({
        sql: "CREATE TRIGGER fail_publication_report_audit BEFORE INSERT ON admin_audit WHEN NEW.action='community.publications.auto-hide' BEGIN SELECT RAISE(ABORT,'Local report rollback'); END",
      });
      await api(`/api/community/publications/${target.slug}/reports`, b, 'POST', report, 503);
      assert.equal((await owned(owner, target.id)).moderation, 'visible');
      assert.equal(
        (
          await sql({
            sql: 'SELECT COUNT(*) AS n FROM publication_reports WHERE publication_id=?',
            args: [target.id],
          })
        )[0][0].n,
        1,
      );
      await sql({ sql: 'DROP TRIGGER fail_publication_report_audit' });
    },
  );
  await check(
    'restricted reporting remains bounded but ineligible reporters cannot force automatic hiding',
    async () => {
      const a = await signup('ineligible_reporter_a');
      const b = await signup('eligible_reporter_b');
      const c = await signup('eligible_reporter_c');
      const target = (await publishing(owner, await save(owner))).body.publication;
      await sql({
        sql: 'INSERT INTO community_restrictions(id,user_id,starts_at,reason,actor_id,version) VALUES(?,?,0,?,?,1)',
        args: [`report-restriction-${a.id}`, a.id, 'Local community restriction', root.id],
      });
      const report = { reason: 'Other', details: 'A bounded report for staff review.' };
      await api(`/api/community/publications/${target.slug}/reports`, a, 'POST', report, 201);
      await api(`/api/community/publications/${target.slug}/reports`, b, 'POST', report, 201);
      assert.equal((await owned(owner, target.id)).moderation, 'visible');
      await api(`/api/community/publications/${target.slug}/reports`, c, 'POST', report, 201);
      assert.equal((await owned(owner, target.id)).moderation, 'hidden');
    },
  );
  complete = true;
  console.log(`Publication API: ${passed.length} groups passed. Evidence ${persist}`);
} finally {
  writeFileSync(`${persist}/result.json`, JSON.stringify({ complete, passed }, null, 2));
  worker.kill('SIGTERM');
  await stopped;
  log.end();
}
