/** Real local sessions + Worker/D1 acceptance. Never accepts a remote target. */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { seriesFixture } from '../packages/domain/src/core/mnaFixtures';
import type { Access, Policy, RolePage } from '../src/admin/platform/types';
import { localTestUrl } from './local-test-url';

const config = 'wrangler.platform-admin-test.jsonc';
mkdirSync('.wrangler', { recursive: true });
const persist = mkdtempSync(resolve('.wrangler/platform-admin-'));
const env = Object.fromEntries(
  Object.entries(process.env).filter(
    ([key]) => !key.startsWith('CLOUDFLARE_') && !key.startsWith('CF_'),
  ),
);
env.WRANGLER_SEND_METRICS = 'false';
const migration = spawnSync(
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
assert.equal(migration.status, 0, `${migration.stdout}\n${migration.stderr}`);
const port = await new Promise<number>((done) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    assert(address && typeof address !== 'string');
    server.close(() => done(address.port));
  });
});
const origin = localTestUrl(`http://127.0.0.1:${port}`, '', 'Platform administration test');
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
type Account = { id: string; cookie: string; email: string };
type State = {
  version: number;
  audits: number;
  sessions: number;
  role: string;
  controls: { suspended: number; endsAt: number | null } | null;
  circuits: number;
  grants: number;
  matchingAudits: number;
  activeSuperAdmins: number;
};
const passed: string[] = [];
let complete = false;
async function check(name: string, work: () => Promise<void>) {
  await work();
  passed.push(name);
  console.log(`PASS ${name}`);
}
async function api<T = Record<string, unknown>>(
  path: string,
  account?: Account,
  method = 'GET',
  data?: unknown,
  expected = 200,
  extraHeaders: Record<string, string> = {},
) {
  const res = await fetch(`${origin}${path}`, {
    method,
    headers: {
      Origin: origin,
      ...(account ? { Cookie: account.cookie } : {}),
      ...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...extraHeaders,
    },
    body: data === undefined ? undefined : JSON.stringify(data),
    redirect: 'manual',
  });
  const raw = await res.text();
  let body: T;
  try {
    body = JSON.parse(raw) as T;
  } catch {
    body = { error: raw } as T;
  }
  assert.equal(res.status, expected, `${method} ${path}: ${raw.slice(0, 500)}`);
  return { res, body };
}
async function fixture<T = Record<string, unknown>>(path: string, data: unknown) {
  return (await api<T>(`/api/__platform/${path}`, undefined, 'POST', data)).body;
}
async function state(account?: Account, reason = '') {
  return fixture<State>('state', { userId: account?.id, reason });
}
async function signup(label: string, role = 'individual'): Promise<Account> {
  const email = `${label}@platform.test`;
  const { res, body } = await api<{ user: { id: string; globalRole: string } }>(
    '/api/auth/sign-up/email',
    undefined,
    'POST',
    {
      name: label,
      email,
      password: 'Local-password-123!',
      globalRole: 'super_admin',
      roleIds: ['forged'],
    },
  );
  assert.equal(body.user.globalRole, 'individual');
  const account = {
    id: body.user.id,
    email,
    cookie: res.headers
      .getSetCookie()
      .map((v) => v.split(';')[0])
      .join('; '),
  };
  assert.match(account.cookie, /session_token/);
  if (role !== 'individual') await api('/api/__test/role', account, 'POST', { role });
  return account;
}
async function signin(account: Account, expected = 200) {
  const { res } = await api(
    '/api/auth/sign-in/email',
    undefined,
    'POST',
    { email: account.email, password: 'Local-password-123!' },
    expected,
  );
  if (expected === 200)
    account.cookie = res.headers
      .getSetCookie()
      .map((v) => v.split(';')[0])
      .join('; ');
}
let operator: Account;
async function change<T = Record<string, unknown>>(
  path: string,
  data: Record<string, unknown>,
  account = operator,
  method = 'POST',
  expected = 200,
) {
  const base = path.startsWith('/api/__extension') ? '/api/__extension' : '/api/admin';
  const access = (await api<Access>(`${base}/access`, account)).body;
  return api<T>(
    path,
    account,
    method,
    { version: access.version, reason: 'Local foundation acceptance', ...data },
    expected,
  );
}
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));
try {
  const deadline = Date.now() + 45000;
  while (true) {
    try {
      if ((await fetch(`${origin}/api/health`)).ok) break;
    } catch {
      /* boot */
    }
    assert(
      Date.now() < deadline && worker.exitCode === null,
      `Worker startup failed: ${persist}/worker.log`,
    );
    await pause(150);
  }
  const ordinary = await signup('ordinary');
  const moderator = await signup('moderator', 'moderator');
  const admin = await signup('admin', 'admin');
  const first = await signup('operator-a', 'super_admin');
  const second = await signup('operator-b', 'super_admin');
  operator = first;
  const custom = await signup('custom');
  const paid = await signup('paid');
  const org = await signup('org-owner', 'org_owner');
  await api('/api/__test/paid-membership', paid, 'POST', {}, 201);
  await check('server-owned signup fields and module-filtered system-role access', async () => {
    await api('/api/admin/access', undefined, 'GET', undefined, 401);
    for (const account of [ordinary, paid, org, custom])
      await api('/api/admin/access', account, 'GET', undefined, 403);
    const mod = (await api<Access>('/api/admin/access', moderator)).body;
    assert(mod.navigation.some((n) => n.href === '/admin/settings/'));
    assert(!mod.navigation.some((n) => n.href === '/admin/users/' || n.href === '/admin/pro/'));
    for (const account of [moderator, admin]) {
      await api('/api/admin/roles', account, 'GET', undefined, 403);
      await api(
        `/api/admin/users/${ordinary.id}/roles`,
        account,
        'POST',
        { globalRole: 'super_admin', roleIds: [], version: 1, reason: 'Denied' },
        403,
      );
      await api(
        `/api/admin/users/${ordinary.id}/suspend`,
        account,
        'POST',
        { endsAt: null, version: 1, reason: 'Denied' },
        403,
      );
    }
    const allowed = await api<Access>('/api/admin/access', operator);
    assert.equal(allowed.res.headers.get('cache-control'), 'private, no-store');
    assert(allowed.res.headers.has('x-request-id'));
    assert(allowed.body.navigation.some((n) => n.href === '/admin/pro/'));
    assert(!allowed.body.navigation.some((n) => /reports|content|fixture/.test(n.href)));
  });
  await check(
    'indexed bounded user directory and minimal account detail never expose private records',
    async () => {
      await api('/api/admin/users', moderator, 'GET', undefined, 403);
      const users = (
        await api<{ items: Record<string, unknown>[]; total: number }>(
          '/api/admin/users?limit=1&offset=1',
          admin,
        )
      ).body;
      assert.equal(users.items.length, 1);
      assert.equal(users.total, 8);
      for (const user of users.items)
        assert.deepEqual(
          Object.keys(user).sort(),
          [
            'createdAt',
            'email',
            'emailVerified',
            'globalRole',
            'id',
            'name',
            'restricted',
            'suspended',
          ].sort(),
        );
      const found = (
        await api<{ items: { id: string }[] }>(
          `/api/admin/users?q=${encodeURIComponent(ordinary.email)}`,
          admin,
        )
      ).body;
      assert.equal(found.items[0].id, ordinary.id);
      const detail = (await api<Record<string, unknown>>(`/api/admin/users/${ordinary.id}`, admin))
        .body;
      const forbidden = new Set([
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'session',
        'content',
        'circuit',
      ]);
      const visit = (value: unknown) => {
        if (value && typeof value === 'object') {
          for (const [key, child] of Object.entries(value)) {
            assert(!forbidden.has(key), key);
            visit(child);
          }
        }
      };
      visit(detail);
      await api('/api/admin/users?limit=101', admin, 'GET', undefined, 400);
      for (const filter of ['role=unknown', 'status=unknown'])
        await api(`/api/admin/users?${filter}`, admin, 'GET', undefined, 400);
      const moderators = (
        await api<{ items: { globalRole: string }[] }>('/api/admin/users?role=moderator', admin)
      ).body;
      assert(moderators.items.length > 0);
      assert(moderators.items.every((row) => row.globalRole === 'moderator'));
      const overview = (
        await api<{ recentUsers: unknown[]; recentActivity: { namespace: string }[] }>(
          '/api/admin/overview',
          moderator,
        )
      ).body;
      assert.deepEqual(overview.recentUsers, []);
      assert(overview.recentActivity.every((row) => row.namespace === 'community'));
      const ownAccess = (await api<Access>('/api/admin/access', operator)).body;
      assert.equal(typeof ownAccess.actor.name, 'string');
      assert(ownAccess.actor.name.length > 0);

      const plan = (await api<{ detail: string }[]>('/api/__platform/search-plan')).body;
      assert(plan.some((r) => r.detail.includes('user_admin_name')));
      assert(plan.some((r) => r.detail.includes('user_admin_email')));
    },
  );
  await check(
    'staff, organizations and custom roles never grant paid capability or membership administration',
    async () => {
      const plans = (
        await api<{
          items: { benefits: { key: string; enabled: boolean }[]; activeMemberCount: number }[];
        }>('/api/admin/pro/plans', operator)
      ).body.items;
      assert(
        plans.some(
          (plan) =>
            plan.activeMemberCount === 1 &&
            plan.benefits.some((benefit) => benefit.key === 'pro_components' && benefit.enabled),
        ),
      );
      for (const account of [ordinary, paid, org, moderator, admin, custom])
        for (const path of ['/api/admin/ping', '/api/admin/pro/plans', '/api/admin/pro/audit'])
          await api(path, account, 'GET', undefined, 403);
      for (const account of [moderator, admin, operator])
        assert.deepEqual(
          (await api<{ capabilities: string[] }>('/api/me/membership', account)).body.capabilities,
          [],
        );
      assert(
        (
          await api<{ capabilities: string[] }>('/api/me/membership', paid)
        ).body.capabilities.includes('pro_components'),
      );
    },
  );
  let roleId = '';
  await check(
    'custom role creation, explicit assignments and protected-power exclusions',
    async () => {
      for (const permissions of [
        ['platform.roles.manage'],
        ['memberships.manage'],
        ['platform.accounts.suspend'],
        ['unknown.action'],
        ['community.audit.read', 'community.audit.read'],
      ])
        await change(
          '/api/admin/roles',
          { name: 'Invalid role', permissions },
          operator,
          'POST',
          400,
        );
      const created = await change(
        '/api/admin/roles',
        {
          name: 'Community reviewer',
          permissions: ['community.settings.read', 'community.audit.read'],
        },
        operator,
        'POST',
        201,
      );
      roleId = String(created.body.id);
      await change(`/api/admin/users/${custom.id}/roles`, {
        globalRole: 'individual',
        roleIds: [roleId],
      });
      const access = (await api<Access>('/api/admin/access', custom)).body;
      assert.deepEqual(access.permissions, ['community.audit.read', 'community.settings.read']);
      await api('/api/admin/users', custom, 'GET', undefined, 403);
      await api(
        `/api/admin/users/${custom.id}/community-restrictions`,
        admin,
        'POST',
        { endsAt: null, version: 1, reason: 'Denied staff targeting' },
        403,
      );
      await change(
        `/api/admin/users/${operator.id}/roles`,
        { globalRole: 'individual', roleIds: [] },
        operator,
        'POST',
        403,
      );
      await change(
        `/api/admin/users/${ordinary.id}/roles`,
        { globalRole: 'individual', roleIds: [roleId, roleId] },
        operator,
        'POST',
        400,
      );
    },
  );
  await check(
    'role edits, archive, assignment removal and system policy revoke on the next cookie request',
    async () => {
      await change(
        `/api/admin/roles/${roleId}`,
        { name: 'Community reviewer', permissions: [], archived: false },
        operator,
        'PATCH',
      );
      await api('/api/admin/access', custom, 'GET', undefined, 403);
      await change(
        `/api/admin/roles/${roleId}`,
        { name: 'Community reviewer', permissions: ['community.settings.read'], archived: false },
        operator,
        'PATCH',
      );
      await api('/api/admin/access', custom);
      await change(
        `/api/admin/roles/${roleId}`,
        { name: 'Community reviewer', permissions: ['community.settings.read'], archived: true },
        operator,
        'PATCH',
      );
      await api('/api/admin/access', custom, 'GET', undefined, 403);
      await change(
        `/api/admin/roles/${roleId}`,
        { name: 'Community reviewer', permissions: ['community.settings.read'], archived: false },
        operator,
        'PATCH',
      );
      await change(`/api/admin/users/${custom.id}/roles`, {
        globalRole: 'individual',
        roleIds: [],
      });
      await api('/api/admin/access', custom, 'GET', undefined, 403);
      const policy = (await api<Policy>('/api/admin/permissions', operator)).body.policy;
      await change(
        '/api/admin/permissions',
        { policy: { ...policy, moderator: [...policy.moderator, 'platform.users.read'] } },
        operator,
        'PATCH',
      );
      await api('/api/admin/users', moderator);
      await change('/api/admin/permissions', { policy }, operator, 'PATCH');
      await api('/api/admin/users', moderator, 'GET', undefined, 403);
      await change(
        '/api/admin/permissions',
        { policy: { ...policy, moderator: ['platform.roles.manage'] } },
        operator,
        'PATCH',
        400,
      );
    },
  );
  await check(
    'mutation origin, JSON limits, reasons, unknown fields and typed settings fail safely',
    async () => {
      const values = {
        bannedWords: [],
        autoHideThreshold: 5,
        writesPerMinute: 20,
        reportsPerDay: 10,
        preModeration: false,
      };
      const version = (await state()).version;
      await api(
        '/api/admin/settings/community',
        operator,
        'PATCH',
        { version, reason: 'Origin', values },
        403,
        { Origin: 'https://cross-origin.invalid' },
      );
      await api(
        '/api/admin/settings/community',
        operator,
        'PATCH',
        { version, reason: 'Type', values },
        415,
        { 'Content-Type': 'text/plain' },
      );
      await api(
        '/api/admin/settings/community',
        operator,
        'PATCH',
        { version, reason: 'x'.repeat(40000), values },
        413,
      );
      for (const data of [
        { reason: ' ' },
        { extra: true },
        { values: { ...values, secret: 'not allowed' } },
        { values: { ...values, autoHideThreshold: 1 } },
        { values: { ...values, bannedWords: ['duplicate', 'DUPLICATE'] } },
      ])
        await change('/api/admin/settings/community', { values, ...data }, operator, 'PATCH', 400);
      const malformed = await fetch(`${origin}/api/admin/settings/community`, {
        method: 'PATCH',
        headers: { Origin: origin, Cookie: operator.cookie, 'Content-Type': 'application/json' },
        body: '{',
      });
      assert.equal(malformed.status, 400);
      await api('/api/admin/settings/unknown', operator, 'GET', undefined, 404);
      await change('/api/admin/roles', { name: 'admin', permissions: [] }, operator, 'POST', 400);
      await api(
        '/api/admin/settings/community',
        moderator,
        'PATCH',
        { version, reason: 'Denied', values },
        403,
      );
      assert.equal((await state()).version, version);
    },
  );
  await check(
    'settings normalize values; concurrent stale writes create exactly one value and audit',
    async () => {
      const original = (
        await api<{ version: number; values: Record<string, unknown> }>(
          '/api/admin/settings/community',
          operator,
        )
      ).body;
      const baseline = await state();
      const reason = 'Concurrent settings';
      const statuses = await Promise.all(
        [11, 12].map(async (n) => {
          const response = await fetch(`${origin}/api/admin/settings/community`, {
            method: 'PATCH',
            headers: {
              Origin: origin,
              Cookie: operator.cookie,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              version: original.version,
              reason,
              values: { ...original.values, writesPerMinute: n },
            }),
          });
          return response.status;
        }),
      );
      assert.deepEqual(statuses.sort(), [200, 409]);
      const final = await state(undefined, reason);
      assert.equal(final.version, baseline.version + 1);
      assert.equal(final.matchingAudits, 1);
      const normalized = await change(
        '/api/admin/settings/community',
        { values: { ...original.values, bannedWords: ['  Word  '] } },
        operator,
        'PATCH',
      );
      assert.equal(normalized.res.status, 200);
      assert.deepEqual(
        (
          await api<{ values: { bannedWords: string[] } }>(
            '/api/admin/settings/community',
            operator,
          )
        ).body.values.bannedWords,
        ['word'],
      );
    },
  );
  await check(
    'audit failure rolls back revision, settings, role changes and session revocation atomically',
    async () => {
      await fixture('audit-failure', { enabled: true });
      try {
        const before = await state(ordinary);
        const values = (
          await api<{ values: Record<string, unknown> }>('/api/admin/settings/community', operator)
        ).body.values;
        await change(
          '/api/admin/settings/community',
          { values: { ...values, reportsPerDay: 17 }, reason: 'Reject this audit' },
          operator,
          'PATCH',
          503,
        );
        await change(
          `/api/admin/users/${ordinary.id}/roles`,
          { globalRole: 'admin', roleIds: [], reason: 'Reject this audit' },
          operator,
          'POST',
          503,
        );
        await change(
          `/api/admin/users/${ordinary.id}/suspend`,
          { endsAt: null, reason: 'Reject this audit' },
          operator,
          'POST',
          503,
        );
        const after = await state(ordinary);
        assert.deepEqual(after, before);
        assert.deepEqual(
          (
            await api<{ values: Record<string, unknown> }>(
              '/api/admin/settings/community',
              operator,
            )
          ).body.values,
          values,
        );
      } finally {
        await fixture('audit-failure', { enabled: false });
      }
    },
  );
  await check(
    'community restrictions preserve private circuit work and paid grants; revocation works',
    async () => {
      await api(
        '/api/circuits',
        paid,
        'POST',
        { name: 'Private acceptance circuit', circuit: seriesFixture() },
        201,
      );
      const before = await state(paid);
      const applied = await change(
        `/api/admin/users/${paid.id}/community-restrictions`,
        { endsAt: null, reason: 'Community test restriction' },
        admin,
      );
      assert(
        (await api<{ restriction: { reason: string } }>('/api/me/community-status', paid)).body
          .restriction.reason === 'Community test restriction',
      );
      await api('/api/__platform/community-write', paid, 'POST', {}, 403);
      await api('/api/circuits', paid);
      await api(
        '/api/circuits',
        paid,
        'POST',
        { name: 'Still private', circuit: seriesFixture() },
        201,
      );
      assert(
        (
          await api<{ capabilities: string[] }>('/api/me/membership', paid)
        ).body.capabilities.includes('pro_components'),
      );
      await api('/api/plans');
      await change(
        `/api/admin/users/${paid.id}/community-restrictions/${applied.body.restrictionId}/revoke`,
        {},
        admin,
      );
      await api('/api/__platform/community-write', paid, 'POST', {});
      const after = await state(paid);
      assert.equal(after.grants, before.grants);
      assert.equal(after.circuits, before.circuits + 1);
      await change(
        `/api/admin/users/${admin.id}/community-restrictions`,
        { endsAt: null },
        admin,
        'POST',
        403,
      );
    },
  );
  await check('timed community restrictions expire without changing private access', async () => {
    await change(
      `/api/admin/users/${ordinary.id}/community-restrictions`,
      { endsAt: Date.now() + 700 },
      admin,
    );
    await api('/api/__platform/community-write', ordinary, 'POST', {}, 403);
    await pause(800);
    assert.equal(
      (await api<{ restriction: unknown }>('/api/me/community-status', ordinary)).body.restriction,
      null,
    );
    await api('/api/__platform/community-write', ordinary, 'POST', {});
  });
  await check(
    'platform suspension revokes sessions, denies sign-in and session-insert races, preserves data',
    async () => {
      const before = await state(paid);
      assert(before.sessions > 0);
      await change(`/api/admin/users/${paid.id}/suspend`, { endsAt: null });
      const suspended = await state(paid);
      assert.equal(suspended.sessions, 0);
      assert.equal(suspended.circuits, before.circuits);
      assert.equal(suspended.grants, before.grants);
      for (const path of ['/api/circuits', '/api/me/membership', '/api/admin/access'])
        await api(path, paid, 'GET', undefined, 401);
      await signin(paid, 403);
      assert.equal((await fixture('session-race', { userId: paid.id })).inserted, false);
      await change(`/api/admin/users/${paid.id}/restore`, {});
      assert.equal((await state(paid)).sessions, 0);
      await api('/api/circuits', paid, 'GET', undefined, 401);
      await signin(paid);
      await api('/api/circuits', paid);
    },
  );
  await check(
    'shared primary guards deny a suspended account even if an earlier session remains',
    async () => {
      await fixture('guard-fixture', { userId: ordinary.id, suspended: true });
      try {
        await api('/api/circuits', ordinary, 'GET', undefined, 403);
        await api('/api/me/membership', ordinary, 'GET', undefined, 403);
        await signin(ordinary, 403);
      } finally {
        await fixture('guard-fixture', { userId: ordinary.id, suspended: false });
      }
      await api('/api/circuits', ordinary);
    },
  );
  await check(
    'timed platform expiry permits fresh sign-in and never revives deleted sessions',
    async () => {
      const temporary = await signup('timed');
      await change(`/api/admin/users/${temporary.id}/suspend`, { endsAt: Date.now() + 700 });
      await api('/api/circuits', temporary, 'GET', undefined, 401);
      await pause(800);
      await api('/api/circuits', temporary, 'GET', undefined, 401);
      assert.equal((await state(temporary)).sessions, 0);
      await signin(temporary);
      await api('/api/circuits', temporary);
    },
  );
  await check(
    'concurrent sign-in versus suspension cannot leave an authorized session',
    async () => {
      const target = await signup('signin-race');
      const version = (await state()).version;
      const [suspension, login] = await Promise.all([
        fetch(`${origin}/api/admin/users/${target.id}/suspend`, {
          method: 'POST',
          headers: { Origin: origin, Cookie: operator.cookie, 'Content-Type': 'application/json' },
          body: JSON.stringify({ endsAt: null, version, reason: 'Sign-in race' }),
        }),
        fetch(`${origin}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: { Origin: origin, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: target.email, password: 'Local-password-123!' }),
        }),
      ]);
      assert.equal(suspension.status, 200);
      assert([200, 401, 403, 500].includes(login.status));
      assert.equal((await state(target)).sessions, 0);
      await api('/api/circuits', target, 'GET', undefined, 401);
    },
  );
  await check(
    'concurrent super-admin demotions retain one active operator and reject self-demotion',
    async () => {
      const version = (await state()).version;
      const attempts = await Promise.all(
        [
          [first, second],
          [second, first],
        ].map(async ([actor, target]) => {
          const res = await fetch(`${origin}/api/admin/users/${target.id}/roles`, {
            method: 'POST',
            headers: { Origin: origin, Cookie: actor.cookie, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              version,
              reason: 'Concurrent super-admin demotion',
              globalRole: 'individual',
              roleIds: [],
            }),
          });
          return res.status;
        }),
      );
      assert.equal(attempts.filter((s) => s === 200).length, 1);
      assert(attempts.every((s) => [200, 403, 409].includes(s)));
      assert.equal((await state()).activeSuperAdmins, 1);
      operator = attempts[0] === 200 ? first : second;
      const other = operator === first ? second : first;
      await change(
        `/api/admin/users/${operator.id}/roles`,
        { globalRole: 'individual', roleIds: [] },
        operator,
        'POST',
        403,
      );
      await change(`/api/admin/users/${other.id}/roles`, {
        globalRole: 'super_admin',
        roleIds: [],
      });
    },
  );
  await check(
    'concurrent super-admin suspensions retain an active operator and restoration requires a new session',
    async () => {
      const version = (await state()).version;
      const attempts = await Promise.all(
        [
          [first, second],
          [second, first],
        ].map(async ([actor, target]) => {
          const res = await fetch(`${origin}/api/admin/users/${target.id}/suspend`, {
            method: 'POST',
            headers: { Origin: origin, Cookie: actor.cookie, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              version,
              reason: 'Concurrent super-admin suspension',
              endsAt: null,
            }),
          });
          return res.status;
        }),
      );
      assert.equal(attempts.filter((s) => s === 200).length, 1);
      assert(attempts.every((s) => [200, 401, 403, 409].includes(s)));
      assert.equal((await state()).activeSuperAdmins, 1);
      operator = attempts[0] === 200 ? first : second;
      const other = operator === first ? second : first;
      await change(
        `/api/admin/users/${operator.id}/suspend`,
        { endsAt: null },
        operator,
        'POST',
        403,
      );
      await change(`/api/admin/users/${other.id}/restore`, {});
      await api('/api/admin/access', other, 'GET', undefined, 401);
      await signin(other);
    },
  );
  await check(
    'test-only module registration proves permission, settings and audit namespace isolation',
    async () => {
      const created = await change(
        '/api/__extension/roles',
        { name: 'Fixture operator', permissions: ['fixture.read', 'fixture.write'] },
        operator,
        'POST',
        201,
      );
      await change(`/api/__extension/users/${custom.id}/roles`, {
        globalRole: 'individual',
        roleIds: [created.body.id],
      });
      const access = (await api<Access>('/api/__extension/access', custom)).body;
      assert.deepEqual(access.auditNamespaces, ['fixture']);
      assert(access.navigation.some((n) => n.href === '/admin/fixture/'));
      await api('/api/admin/access', custom, 'GET', undefined, 403);
      await api('/api/__extension/audit?namespace=platform', custom, 'GET', undefined, 403);
      const before = await state();
      await change('/api/__extension/record', { foreign: true }, custom, 'POST', 403);
      assert.equal((await state()).audits, before.audits);
      await change('/api/__extension/record', {}, custom);
      await change(
        '/api/__extension/settings/fixture',
        { values: { enabled: true } },
        custom,
        'PATCH',
      );
      assert.equal(
        (await api<{ values: { enabled: boolean } }>('/api/__extension/settings/fixture', custom))
          .body.values.enabled,
        true,
      );
      const audit = (
        await api<{ items: { namespace: string; action: string }[] }>(
          '/api/__extension/audit',
          custom,
        )
      ).body;
      assert(audit.items.some((r) => r.action === 'fixture.record'));
      assert(audit.items.every((r) => r.namespace === 'fixture'));
      await api('/api/__extension/settings/community', custom, 'GET', undefined, 403);
      await api('/api/admin/settings/fixture', operator, 'GET', undefined, 404);
    },
  );
  await check(
    'community audit scopes omit platform and membership history with safe filters',
    async () => {
      const rows = (
        await api<{ items: { namespace: string }[]; total: number }>('/api/admin/audit', moderator)
      ).body;
      assert(rows.items.every((r) => r.namespace === 'community'));
      await api('/api/admin/audit?namespace=platform', moderator, 'GET', undefined, 403);
      await api('/api/admin/audit?namespace=memberships', operator, 'GET', undefined, 403);
      const filtered = (
        await api<{ items: { action: string; targetId: string }[] }>(
          `/api/admin/audit?namespace=community&targetId=${paid.id}&action=community.restrictions.apply&from=0&to=${Date.now()}`,
          operator,
        )
      ).body;
      assert.equal(filtered.items.length, 1);
      assert.equal(filtered.items[0].targetId, paid.id);
      await api('/api/admin/audit?from=-1', operator, 'GET', undefined, 400);
      const roles = (await api<RolePage>('/api/admin/roles', operator)).body;
      assert(roles.items.length >= 2);
    },
  );
  await check('append-only administrative audit refuses direct rewrite and deletion', async () => {
    const before = await state();
    assert.deepEqual((await fixture('audit-immutability', {})).blocked, [true, true]);
    assert.equal((await state()).audits, before.audits);
  });
  await check(
    'application Worker exposes none of the role, extension or infrastructure test fixtures',
    async () => {
      const boundary = (await api<{ statuses: number[] }>('/api/__platform/application-boundary'))
        .body;
      assert.deepEqual(boundary.statuses, [404, 404, 404, 404]);
    },
  );
  complete = true;
  console.log(
    `Platform administration passed: ${passed.length} groups. Local evidence: ${persist}`,
  );
} finally {
  writeFileSync(
    `${persist}/results.json`,
    JSON.stringify(
      {
        status: complete ? 'passed' : 'failed',
        passed,
        scope:
          'Phase 2.0 platform foundation API/session/D1 acceptance; browser/build gates are separate',
      },
      null,
      2,
    ),
  );
  worker.kill('SIGTERM');
  await stopped;
  log.end();
}
