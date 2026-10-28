/** Real local Worker/D1/R2/cookie tests; each run owns fresh persistence. */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { deflateSync } from 'node:zlib';
import type { Profile } from '../src/community/profile-policy';
import images from './fixtures/profiles/avatar-images.json';
const config = 'wrangler.profiles-test.jsonc';
mkdirSync('.wrangler', { recursive: true });
const persist = mkdtempSync(resolve('.wrangler/profiles-api-'));
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
function crc(bytes: Buffer) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let i = 0; i < 8; i++) value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(tag: string, data: Buffer) {
  const value = Buffer.concat([Buffer.from(tag), data]);
  const size = Buffer.alloc(4);
  const sum = Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  sum.writeUInt32BE(crc(value));
  return Buffer.concat([size, value, sum]);
}
const header = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', header),
  chunk('tEXt', Buffer.from('private-metadata\0sample-location')),
  chunk('IDAT', deflateSync(Buffer.from([0, 20, 100, 150, 255]))),
  chunk('IEND', Buffer.alloc(0)),
]);
async function upload(account: Account, bytes = png, type = 'image/png', expected = 200) {
  const p = await get(account);
  const response = await fetch(`${origin}/api/me/avatar`, {
    method: 'POST',
    headers: {
      Origin: origin,
      Cookie: account.cookie,
      'Content-Type': type,
      'X-Profile-Revision': String(p.revision),
    },
    body: bytes,
  });
  const text = await response.text();
  assert.equal(response.status, expected, text);
  return JSON.parse(text) as { profile: Profile };
}
let complete = false;
try {
  const deadline = Date.now() + 60000;
  while (true) {
    try {
      if ((await fetch(`${origin}/api/health`)).ok) break;
    } catch {}
    if (Date.now() > deadline) throw new Error(`Worker startup timed out: ${persist}/worker.log`);
    await delay(200);
  }
  const owner = await signup('owner');
  const other = await signup('other');
  const staff = await signup('moderator', 'moderator');
  const root = await signup('root', 'super_admin');
  await check('session, origin, content type and protected field boundaries', async () => {
    await api('/api/me/profile', undefined, 'GET', undefined, 401);
    const p = await get(owner);
    assert.equal(p.handle, null);
    assert.equal(p.visibility, 'private');
    assert.equal(p.showInstitution, false);
    await api('/api/me/profile', owner, 'PATCH', { ...fields(p), globalRole: 'super_admin' }, 400);
    await api('/api/me/profile', owner, 'PATCH', fields(p), 403, {
      Origin: 'http://untrusted.invalid',
    });
    await api('/api/me/profile', owner, 'PATCH', fields(p), 415, { 'Content-Type': 'text/plain' });
    assert.equal((await get(owner)).revision, p.revision);
  });
  await check('reserved, malformed, taken, concurrent and immutable handle claims', async () => {
    for (const handle of ['admin', 'ABCD', 'too-short!', '1builder'])
      await edit(owner, { handle }, 400);
    await claim(owner, 'owner_builder', 'private');
    await edit(owner, { handle: 'renamed_owner' }, 409);
    const a = await signup('claim-a');
    const b = await signup('claim-b');
    const results = await Promise.all(
      [a, b].map(async (account) => {
        const p = await get(account);
        const response = await fetch(`${origin}/api/me/profile`, {
          method: 'PATCH',
          headers: { Origin: origin, Cookie: account.cookie, 'Content-Type': 'application/json' },
          body: JSON.stringify(fields(p, { handle: 'one_claim' })),
        });
        const body = await response.json();
        if (response.status !== 200) assert.match(body.error, /already claimed/);
        return response.status;
      }),
    );
    assert.deepEqual(results.sort(), [200, 409]);
    await claim(other, 'other_builder');
  });
  await check(
    'private API/SSR/metadata are neutral; public projection independently opts fields in',
    async () => {
      await api('/api/community/users/owner_builder', undefined, 'GET', undefined, 404);
      const neutral = await api('/u/owner_builder', undefined, 'GET', undefined, 404);
      assert.doesNotMatch(neutral.raw, /owner_builder display|Person|rel="canonical"/);
      await edit(owner, {
        visibility: 'public',
        institution: 'Private school',
        level: 'Educator',
        showInstitution: false,
        showLevel: false,
        bio: 'Plain <script>alert(1)</script> text',
      });
      const result = await api<{ profile: Record<string, unknown> }>(
        '/api/community/users/owner_builder',
      );
      assert.equal(result.body.profile.institution, null);
      assert.equal(result.body.profile.level, null);
      assert.doesNotMatch(
        result.raw,
        /Private school|@profiles.test|userId|avatarKey|mutationId|allowForks/,
      );
      await edit(owner, { showInstitution: true });
      const visible = await api('/u/owner_builder');
      assert.match(visible.raw, /Private school/);
      assert.match(visible.raw, /application\/ld\+json/);
      assert.match(visible.raw, /&lt;script&gt;/);
      assert.doesNotMatch(
        visible.raw,
        /<script>alert\(1\)<\/script>|\/app\/assets\/|useSimulation/,
      );
      assert.match(visible.response.headers.get('content-security-policy') ?? '', /sha256-/);
      assert.match(visible.response.headers.get('cache-control') ?? '', /no-store/);
      await api('/u/OWNER_BUILDER', undefined, 'GET', undefined, 308);
    },
  );
  await check(
    'stale owner changes and unique claims cannot overwrite a newer profile',
    async () => {
      const p = await get(owner);
      await edit(owner, { bio: 'Newer profile text' });
      await api('/api/me/profile', owner, 'PATCH', fields(p, { bio: 'Stale text' }), 409);
      assert.equal((await get(owner)).bio, 'Newer profile text');
    },
  );
  await check(
    'a competing edit after commit cannot transfer its revision onto the earlier response',
    async () => {
      const before = await get(owner);
      await race(
        owner,
        {
          path: '/api/me/profile',
          method: 'PATCH',
          body: fields(before, { bio: 'First response under review' }),
          point: 'response',
          statements: [
            {
              sql: 'UPDATE profiles SET bio=?,revision=revision+1,mutation_id=? WHERE user_id=?',
              args: ['Newer edit must be reloaded', 'competing-owner-mutation', owner.id],
            },
          ],
        },
        409,
      );
      const latest = await get(owner);
      assert.equal(latest.bio, 'Newer edit must be reloaded');
      assert.equal(latest.revision, before.revision + 2);
    },
  );
  await check(
    'local R2 avatar validates bytes/MIME/limits, strips metadata and replaces/deletes safely',
    async () => {
      await upload(owner, Buffer.from('<svg/>'), 'image/png', 400);
      await upload(owner, png, 'image/jpeg', 400);
      await upload(owner, png.subarray(0, png.length - 4), 'image/png', 400);
      await upload(owner, Buffer.alloc(2 * 1024 * 1024 + 1), 'image/png', 413);
      await upload(owner, Buffer.from(images.jpeg, 'base64'), 'image/jpeg');
      await upload(owner, Buffer.from(images.webp, 'base64'), 'image/webp');
      await upload(owner);
      const p = await get(owner);
      assert(p.avatarUrl);
      const response = await fetch(`${origin}/api/community/users/owner_builder/avatar`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-type'), 'image/png');
      assert.match(response.headers.get('cache-control') ?? '', /no-store/);
      assert(!Buffer.from(await response.arrayBuffer()).includes(Buffer.from('private-metadata')));
      await upload(owner);
      const objects = (
        await api<{ objects: unknown[] }>('/api/__profiles/objects', undefined, 'POST', {})
      ).body;
      assert.equal(objects.objects.length, 1);
      const garbage = await sql({ sql: 'SELECT * FROM profile_avatar_garbage' });
      assert.equal(garbage[0].length, 0);
      await api('/api/community/avatar/profile-avatars/fake', undefined, 'GET', undefined, 404);
    },
  );
  await check(
    'private and staff-hidden avatar URLs deny anonymous access while retaining authorized owner/staff access',
    async () => {
      await edit(owner, { visibility: 'private' });
      await api('/api/community/users/owner_builder/avatar', undefined, 'GET', undefined, 404);
      const privateImage = await fetch(`${origin}/api/me/avatar`, {
        headers: { Cookie: owner.cookie },
      });
      assert.equal(privateImage.status, 200);
      await moderate(staff, owner, 'hide');
      const staffImage = await fetch(`${origin}/api/admin/community/profiles/${owner.id}/avatar`, {
        headers: { Cookie: staff.cookie },
      });
      assert.equal(staffImage.status, 200);
      await edit(owner, { visibility: 'public', bio: 'Owner edit cannot restore hidden identity' });
      assert.equal((await get(owner)).moderation, 'hidden');
      await api('/u/owner_builder', undefined, 'GET', undefined, 404);
      await moderate(staff, owner, 'restore');
      await edit(owner, { visibility: 'private' });
      await moderate(staff, owner, 'hide');
      await moderate(staff, owner, 'restore');
      await api('/u/owner_builder', undefined, 'GET', undefined, 404);
      await edit(owner, { visibility: 'public' });
    },
  );
  await check(
    'moderation permission, read-only custom role and protected membership boundaries',
    async () => {
      await api('/api/admin/community/profiles', other, 'GET', undefined, 403);
      await api('/api/admin/ping', staff, 'GET', undefined, 403);
      const reader = await signup('reader');
      await sql(
        {
          sql: "INSERT INTO admin_roles(id,name,version,updated_at) VALUES('profile-reader','Profile reader',1,1)",
        },
        {
          sql: "INSERT INTO admin_role_permissions VALUES('profile-reader','community.profiles.read')",
        },
        {
          sql: "INSERT INTO admin_role_permissions VALUES('profile-reader','community.reports.read')",
        },
        { sql: "INSERT INTO admin_user_roles VALUES(?,'profile-reader')", args: [reader.id] },
      );
      const d = await detail(reader, owner);
      assert.equal(d.history.length, 0);
      assert.doesNotMatch(JSON.stringify(d), /@profiles.test|avatarKey|private-metadata/);
      await api(
        `/api/admin/community/profiles/${owner.id}/moderate`,
        reader,
        'POST',
        {
          version: d.version,
          profileRevision: d.profile.revision,
          action: 'hide',
          reason: 'Cannot write as reader.',
        },
        403,
      );
    },
  );
  await check(
    'revisioned staff actions reject concurrent owner edits without audit changes',
    async () => {
      const d = await detail(staff, owner);
      const before = await sql({ sql: 'SELECT COUNT(*) AS n FROM admin_audit' });
      await race(
        staff,
        {
          path: `/api/admin/community/profiles/${owner.id}/moderate`,
          method: 'POST',
          body: {
            version: d.version,
            profileRevision: d.profile.revision,
            action: 'hide',
            reason: 'Review current identity.',
          },
          point: 'admin',
          statements: [
            {
              sql: 'UPDATE profiles SET bio=?,revision=revision+1 WHERE user_id=?',
              args: ['Competing owner edit', owner.id],
            },
          ],
        },
        409,
      );
      assert.equal((await get(owner)).moderation, 'visible');
      assert.deepEqual((await sql({ sql: 'SELECT COUNT(*) AS n FROM admin_audit' }))[0], before[0]);
    },
  );
  await check('revoked and suspended owner races cannot save or consume quota', async () => {
    for (const action of ['revoke', 'suspend']) {
      const a = await signup(`race-${action}`);
      await claim(a, `race_${action}`);
      const p = await get(a);
      await race(
        a,
        {
          path: '/api/me/profile',
          method: 'PATCH',
          body: fields(p, { bio: 'Should not be saved' }),
          point: 'write',
          statements:
            action === 'revoke'
              ? [{ sql: 'DELETE FROM session WHERE user_id=?', args: [a.id] }]
              : [
                  {
                    sql: 'INSERT INTO account_controls(user_id,suspended,version,updated_at) VALUES(?,1,1,1)',
                    args: [a.id],
                  },
                ],
        },
        409,
      );
      const rows = await sql({ sql: 'SELECT bio FROM profiles WHERE user_id=?', args: [a.id] });
      assert.equal(rows[0][0].bio, p.bio);
    }
  });
  await check(
    'owner writes recheck current admin settings/restriction policy inside the batch',
    async () => {
      const p = await get(owner);
      await race(
        owner,
        {
          path: '/api/me/profile',
          method: 'PATCH',
          body: fields(p, { bio: 'Old policy decision' }),
          point: 'write',
          statements: [{ sql: 'UPDATE admin_revision SET version=version+1 WHERE id=1' }],
        },
        409,
      );
      await sql({
        sql: 'INSERT INTO community_restrictions(id,user_id,starts_at,reason,actor_id,version) VALUES(?,?,0,?,?,1)',
        args: ['restricted-owner', owner.id, 'Local restriction', root.id],
      });
      await edit(owner, { bio: 'Restricted edit' }, 403);
      await sql({
        sql: 'UPDATE community_restrictions SET revoked_at=1 WHERE id=?',
        args: ['restricted-owner'],
      });
    },
  );
  await check(
    'staff role, revocation and suspension races cannot write profile or audit',
    async () => {
      for (const action of ['role', 'revoke', 'suspend']) {
        const moderator = await signup(`staff-${action}`, 'moderator');
        const d = await detail(moderator, owner);
        await race(
          moderator,
          {
            path: `/api/admin/community/profiles/${owner.id}/moderate`,
            method: 'POST',
            body: {
              version: d.version,
              profileRevision: d.profile.revision,
              action: 'hide',
              reason: 'Stale staff decision blocked.',
            },
            point: 'admin',
            statements:
              action === 'role'
                ? [
                    {
                      sql: "UPDATE user SET global_role='individual' WHERE id=?",
                      args: [moderator.id],
                    },
                  ]
                : action === 'revoke'
                  ? [{ sql: 'DELETE FROM session WHERE user_id=?', args: [moderator.id] }]
                  : [
                      {
                        sql: 'INSERT INTO account_controls(user_id,suspended,version,updated_at) VALUES(?,1,1,1)',
                        args: [moderator.id],
                      },
                    ],
          },
          409,
        );
        assert.equal((await get(owner)).moderation, 'visible');
      }
    },
  );
  await check(
    'public avatar/API/SSR reads recheck privacy changes across awaited work',
    async () => {
      await upload(owner);
      await race(
        other,
        {
          path: '/api/community/users/owner_builder/avatar',
          method: 'GET',
          point: 'avatar',
          statements: [
            {
              sql: "UPDATE profiles SET profile_visibility='private',revision=revision+1 WHERE user_id=?",
              args: [owner.id],
            },
          ],
        },
        404,
      );
      await edit(owner, { visibility: 'public' });
      for (const path of ['/api/community/users/owner_builder', '/u/owner_builder']) {
        await race(
          other,
          {
            path,
            method: 'GET',
            point: 'read',
            statements: [
              {
                sql: "UPDATE profiles SET moderation='hidden',revision=revision+1 WHERE user_id=?",
                args: [owner.id],
              },
            ],
          },
          404,
        );
        await moderate(staff, owner, 'restore');
      }
    },
  );
  await check('owner and staff avatar reads deny sessions revoked during R2 I/O', async () => {
    for (const [account, path] of [
      [owner, '/api/me/avatar'],
      [staff, `/api/admin/community/profiles/${owner.id}/avatar`],
    ] as const) {
      await race(
        account,
        {
          path,
          method: 'GET',
          point: 'avatar',
          statements: [{ sql: 'DELETE FROM session WHERE user_id=?', args: [account.id] }],
        },
        401,
      );
      const login = await api('/api/auth/sign-in/email', undefined, 'POST', {
        email: account.email,
        password: 'Local-password-123!',
      });
      account.cookie = login.response.headers
        .getSetCookie()
        .map((value) => value.split(';')[0])
        .join('; ');
      assert.match(account.cookie, /session_token/);
    }
  });
  await check(
    'distinct eligible reports deduplicate, hide at threshold and create a system audit',
    async () => {
      await settings(root, { autoHideThreshold: 2 });
      const target = await signup('reported');
      await claim(target, 'reported_builder');
      const a = await signup('reporter-a');
      const b = await signup('reporter-b');
      const c = await signup('reporter-c');
      const report = { reason: 'Spam', details: 'Local report context for review.' };
      await api('/api/community/users/reported_builder/reports', target, 'POST', report, 403);
      await api('/api/community/users/reported_builder/reports', a, 'POST', report, 201);
      const duplicate = await api(
        '/api/community/users/reported_builder/reports',
        a,
        'POST',
        report,
      );
      assert.equal(duplicate.body.duplicate, true);
      await sql({
        sql: 'INSERT INTO account_controls(user_id,suspended,version,updated_at) VALUES(?,1,1,1)',
        args: [a.id],
      });
      await api('/api/community/users/reported_builder/reports', b, 'POST', report, 201);
      assert.equal((await get(target)).moderation, 'visible');
      await api('/api/community/users/reported_builder/reports', c, 'POST', report, 201);
      assert.equal((await get(target)).moderation, 'hidden');
      const rows = await sql({
        sql: "SELECT actor_id FROM admin_audit WHERE target_id=? AND action='community.profiles.auto-hide'",
        args: [target.id],
      });
      assert.deepEqual(rows[0], [{ actor_id: 'system:profile-policy' }]);
    },
  );
  await check(
    'report outcomes are reasoned, revisioned and separate from profile visibility',
    async () => {
      const target = (
        await sql({ sql: "SELECT user_id FROM profiles WHERE handle='reported_builder'" })
      )[0][0].user_id as string;
      const d = (
        await api<{ version: number; reports: { id: string; revision: number }[] }>(
          `/api/admin/community/profiles/${target}`,
          staff,
        )
      ).body;
      const report = d.reports[0];
      await api(`/api/admin/community/reports/${report.id}/resolve`, staff, 'POST', {
        version: d.version,
        reportRevision: report.revision,
        outcome: 'dismissed',
        reason: 'Insufficient evidence in this specific report.',
      });
      const row = (
        await sql({ sql: 'SELECT moderation FROM profiles WHERE user_id=?', args: [target] })
      )[0][0];
      assert.equal(row.moderation, 'hidden');
      const latest = (await api<{ version: number }>('/api/admin/access', staff)).body;
      await api(
        `/api/admin/community/reports/${report.id}/resolve`,
        staff,
        'POST',
        {
          version: latest.version,
          reportRevision: report.revision,
          outcome: 'resolved',
          reason: 'Old report revision cannot be reused.',
        },
        409,
      );
    },
  );
  await check(
    'banned-text policy hides persistently and audits atomically; failed audit rolls back edits',
    async () => {
      await settings(root, { bannedWords: ['blocked_sample'] });
      await edit(owner, { bio: 'blocked_sample text' });
      assert.equal((await get(owner)).moderation, 'hidden');
      await edit(owner, { bio: 'Clean owner text' });
      assert.equal((await get(owner)).moderation, 'hidden');
      await moderate(staff, owner, 'restore');
      await sql({
        sql: "CREATE TRIGGER fail_profile_audit BEFORE INSERT ON admin_audit WHEN NEW.action='community.profiles.auto-hide' BEGIN SELECT RAISE(ABORT,'Local atomic rollback fixture'); END",
      });
      const p = await get(owner);
      await edit(owner, { bio: 'blocked_sample again' }, 503);
      assert.equal((await get(owner)).revision, p.revision);
      assert.equal((await get(owner)).bio, p.bio);
      await sql({ sql: 'DROP TRIGGER fail_profile_audit' });
      await settings(root, { bannedWords: [] });
    },
  );
  await check(
    'report auto-hide and report insertion roll back together on audit failure',
    async () => {
      const target = await signup('rollback-target');
      await claim(target, 'rollback_target');
      const a = await signup('rollback-a');
      const b = await signup('rollback-b');
      const report = { reason: 'Spam', details: 'Review rollback fixture.' };
      await api('/api/community/users/rollback_target/reports', a, 'POST', report, 201);
      await sql({
        sql: "CREATE TRIGGER fail_report_audit BEFORE INSERT ON admin_audit WHEN NEW.action='community.profiles.auto-hide' BEGIN SELECT RAISE(ABORT,'Local audit rollback'); END",
      });
      await api('/api/community/users/rollback_target/reports', b, 'POST', report, 503);
      const rows = await sql({
        sql: 'SELECT COUNT(*) AS n FROM profile_reports WHERE target_user_id=?',
        args: [target.id],
      });
      assert.equal(rows[0][0].n, 1);
      assert.equal((await get(target)).moderation, 'visible');
      await sql({ sql: 'DROP TRIGGER fail_report_audit' });
    },
  );
  await check('profile and report rate limits are enforced without duplicate charges', async () => {
    await settings(root, { writesPerMinute: 1, reportsPerDay: 1 });
    const a = await signup('rate-owner');
    await claim(a, 'rate_owner');
    await edit(a, { bio: 'Second write in same minute' }, 429);
    const reporter = await signup('rate-reporter');
    const report = { reason: 'Other', details: 'Sample review request.' };
    await api('/api/community/users/other_builder/reports', reporter, 'POST', report, 201);
    await api('/api/community/users/other_builder/reports', reporter, 'POST', report);
    await api('/api/community/users/owner_builder/reports', reporter, 'POST', report, 429);
    await settings(root, { writesPerMinute: 20, reportsPerDay: 10 });
  });
  await check(
    'removal retains a permanent handle tombstone and owner edits cannot restore it',
    async () => {
      await moderate(staff, owner, 'remove');
      assert.equal((await get(owner)).moderation, 'removed');
      await edit(owner, { bio: 'New owner text', visibility: 'public' });
      assert.equal((await get(owner)).moderation, 'removed');
      await moderate(staff, owner, 'restore', 409);
      await api('/api/community/users/owner_builder', undefined, 'GET', undefined, 404);
      await api('/api/community/users/owner_builder/avatar', undefined, 'GET', undefined, 404);
      const objects = (
        await api<{ objects: unknown[] }>('/api/__profiles/objects', undefined, 'POST', {})
      ).body;
      assert.equal(objects.objects.length, 0);
    },
  );
  await check('product entry has no test controls or remote asset routes', async () => {
    const result = await api<{ statuses: number[] }>('/api/__platform/application-boundary');
    assert(result.body.statuses.every((s) => s === 404));
    await api('/api/community/profiles/fake', undefined, 'GET', undefined, 404);
  });
  complete = true;
  console.log(`Profile API: ${passed.length} groups passed. Evidence ${persist}`);
} finally {
  writeFileSync(`${persist}/result.json`, JSON.stringify({ complete, passed }, null, 2));
  worker.kill('SIGTERM');
  await stopped;
  log.end();
}
