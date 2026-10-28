/** Real local sessions + Worker/D1 acceptance. Never accepts a remote target. */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { COMPONENT_ACCESS_BASELINE, type EffectiveComponentPolicy } from '@electrasim/access';
import { normalizeCircuit } from '@electrasim/domain/circuitFormat';
import { COMPONENT_DEFS } from '@electrasim/domain/components';
import { createInjectedFault } from '@electrasim/domain/faults';
import type { Circuit } from '@electrasim/domain/types';
import type { Access } from '../src/admin/platform/types';
import { localTestUrl } from './local-test-url';

const config = 'wrangler.component-access-test.jsonc';
mkdirSync('.wrangler', { recursive: true });
const persist = mkdtempSync(resolve('.wrangler/component-api-'));
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
const origin = localTestUrl(`http://127.0.0.1:${port}`, '', 'Component access test');
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
type Component = {
  id: string;
  label: string;
  description: string;
  category: string;
  originalTier: string;
  protectedBasic: boolean;
  access: 'free' | 'pro';
  overrideVersion: number | null;
};
type Detail = {
  version: number;
  policyRevision: number;
  component: Component;
  impact: { savedCircuits: null; publicContent: null };
  history: Record<string, unknown>[];
};
type Page = {
  version: number;
  policyRevision: number;
  categories: string[];
  inventory: { total: number; protectedBasic: number };
  items: Component[];
  total: number;
  limit: number;
  offset: number;
};
type Sql = { sql: string; args?: (string | number | null)[] };
async function sql(...statements: Sql[]) {
  return (
    await api<{ results: Record<string, unknown>[] }[]>('/api/__component/sql', undefined, 'POST', {
      statements,
    })
  ).body.map((row) => row.results);
}
const proId = COMPONENT_ACCESS_BASELINE.find((item) => item.originalTier === 'pro')!.id;
const basic: Circuit = {
  components: [{ id: 'light', type: 'bulb', x: 100, y: 100, rotation: 0, state: {} }],
  wires: [],
};
const pro = structuredClone(basic);
pro.components.push({ id: 'catalog-pro', type: proId, x: 400, y: 400, rotation: 0, state: {} });
let owner: Account;
async function detail(id = proId) {
  return (await api<Detail>(`/api/admin/components/${id}`, owner)).body;
}
async function update(access: 'free' | 'pro', reason = 'Local component review') {
  const current = await detail();
  return (
    await api<Detail>(`/api/admin/components/${proId}/access`, owner, 'PATCH', {
      access,
      version: current.version,
      policyRevision: current.policyRevision,
      reason,
    })
  ).body;
}
const bump: Sql[] = [
  { sql: 'UPDATE component_access_revision SET revision=revision+1 WHERE id=1' },
];
async function race(
  path: string,
  method: string,
  body: unknown,
  point: string,
  statements: Sql[],
  account?: Account,
  expected = 409,
) {
  const response = await api(
    '/api/__component/race',
    account,
    'POST',
    { path, method, body, point, statements },
    expected,
  );
  assert.equal(
    response.res.headers.get('x-test-race-fired'),
    'true',
    'Fixture must interrupt actual production query',
  );
  assert.deepEqual(Object.keys(response.body), ['error']);
  return response.body;
}
const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));
try {
  const deadline = Date.now() + 45000;
  while (true) {
    try {
      if ((await fetch(`${origin}/api/health`)).ok) break;
    } catch {
      /* startup */
    }
    assert(
      Date.now() < deadline && worker.exitCode === null,
      `Worker startup failed: ${persist}/worker.log`,
    );
    await pause(150);
  }
  owner = await signup('catalog-owner', 'super_admin');
  const otherOwner = await signup('catalog-second-owner', 'super_admin');
  const ordinary = await signup('catalog-ordinary');
  const paid = await signup('catalog-paid');
  const admin = await signup('catalog-admin', 'admin');
  const moderator = await signup('catalog-moderator', 'moderator');
  const custom = await signup('catalog-custom');
  const org = await signup('catalog-organization', 'org_owner');
  await api('/api/__test/paid-membership', paid, 'POST', {}, 201);

  await check(
    'public complete policy is sorted metadata only, no-store and fail-closed',
    async () => {
      const { body, res } = await api<EffectiveComponentPolicy>('/api/catalog/component-access');
      assert.deepEqual(Object.keys(body).sort(), [
        'classificationVersion',
        'components',
        'revision',
        'schemaVersion',
      ]);
      assert.equal(body.revision, 1);
      assert.equal(body.components.length, 116);
      assert.equal(body.components.filter((item) => item.access === 'free').length, 75);
      assert.deepEqual(
        body.components.map((item) => item.id),
        body.components.map((item) => item.id).sort(),
      );
      body.components.forEach((item) =>
        assert.deepEqual(Object.keys(item).sort(), ['access', 'id']),
      );
      assert.equal(res.headers.get('cache-control'), 'private, no-store');
      assert(res.headers.has('x-request-id'));
      assert.equal(res.headers.get('access-control-allow-origin'), null);
      await api('/api/simulator/authorize', undefined, 'POST', { circuit: basic }, 200, {
        Cookie: 'theme=dark',
      });
      await sql({ sql: 'DELETE FROM component_access_revision WHERE id=1' });
      await api('/api/catalog/component-access', undefined, 'GET', undefined, 503);
      await api('/api/simulator/authorize', undefined, 'POST', { circuit: basic }, 503);
      await sql({ sql: 'INSERT INTO component_access_revision (id,revision) VALUES (1,1)' });
    },
  );
  await check(
    'protected catalogue reads/writes/history exclude staff, paid, organization and custom roles',
    async () => {
      await api('/api/admin/components', undefined, 'GET', undefined, 401);
      for (const account of [ordinary, paid, admin, moderator, custom, org]) {
        for (const path of [
          '/api/admin/components',
          `/api/admin/components/${proId}`,
          '/api/admin/audit?namespace=catalog',
        ])
          await api(path, account, 'GET', undefined, 403);
        await api(
          `/api/admin/components/${proId}/access`,
          account,
          'PATCH',
          { access: 'free', version: 1, policyRevision: 1, reason: 'Denied' },
          403,
        );
      }
      const access = (await api<Access>('/api/admin/access', owner)).body;
      for (const permission of ['catalog.components.manage', 'catalog.audit.read']) {
        assert(access.permissions.includes(permission));
        await api(
          '/api/admin/roles',
          owner,
          'POST',
          {
            name: 'Forbidden catalog role',
            permissions: [permission],
            version: access.version,
            reason: 'Denied delegation',
          },
          400,
        );
        await api(
          '/api/admin/permissions',
          owner,
          'PATCH',
          {
            version: access.version,
            reason: 'Denied system delegation',
            policy: { moderator: [], admin: [permission] },
          },
          400,
        );
      }
      // Even stored forged assignments do not turn protected permissions into custom powers.
      await sql(
        {
          sql: "INSERT INTO admin_roles (id,name,archived,version,updated_at) VALUES ('catalog-forged','Forged',0,1,1)",
        },
        {
          sql: "INSERT INTO admin_role_permissions (role_id,permission) VALUES ('catalog-forged','catalog.components.manage'),('catalog-forged','catalog.audit.read'),('catalog-forged','platform.users.read')",
        },
        {
          sql: "INSERT INTO admin_user_roles (user_id,role_id) VALUES (?,'catalog-forged')",
          args: [custom.id],
        },
      );
      const customAccess = (await api<Access>('/api/admin/access', custom)).body;
      assert(!customAccess.permissions.some((permission) => permission.startsWith('catalog.')));
      await api('/api/admin/components', custom, 'GET', undefined, 403);
      await api('/api/admin/audit?namespace=catalog', custom, 'GET', undefined, 403);
    },
  );
  await check(
    'catalogue filters, stable paging, bounded queries and safe detail match canonical definitions',
    async () => {
      const page = (await api<Page>('/api/admin/components?limit=100', owner)).body;
      assert.equal(page.total, 116);
      assert.deepEqual(
        page.categories,
        [...new Set(Object.values(COMPONENT_DEFS).map((def) => def.category))].sort(),
      );
      assert.deepEqual(page.inventory, {
        total: 116,
        protectedBasic: 75,
      });
      assert.equal(page.items.length, 100);
      assert.deepEqual(
        page.items,
        [...page.items].sort(
          (a, b) => a.label.localeCompare(b.label, 'en') || a.id.localeCompare(b.id, 'en'),
        ),
      );
      const protectedPage = (
        await api<Page>('/api/admin/components?access=protected&limit=100', owner)
      ).body;
      assert.equal(protectedPage.total, 75);
      assert(protectedPage.items.every((item) => item.protectedBasic && item.access === 'free'));
      const found = (
        await api<Page>(`/api/admin/components?q=${encodeURIComponent(proId.toUpperCase())}`, owner)
      ).body;
      assert(found.items.some((item) => item.id === proId));
      const category = COMPONENT_DEFS[proId]!.category;
      const filtered = (
        await api<Page>(
          `/api/admin/components?category=${encodeURIComponent(category)}&access=pro`,
          owner,
        )
      ).body;
      assert(filtered.items.every((item) => item.category === category && item.access === 'pro'));
      assert.equal(
        (await api<Page>('/api/admin/components?offset=10000', owner)).body.items.length,
        0,
      );
      const record = await detail();
      assert.deepEqual(record.impact, { savedCircuits: null, publicContent: null });
      assert.equal(record.component.label, COMPONENT_DEFS[proId]!.label);
      assert.equal(record.component.description, COMPONENT_DEFS[proId]!.description);
      assert.equal(record.component.overrideVersion, null);
      assert.equal(record.history.length, 0);
      await api('/api/admin/components/unknown', owner, 'GET', undefined, 404);
      for (const query of [
        'unknown=1',
        'category=unknown',
        'access=basic',
        'limit=0',
        'limit=101',
        'offset=10001',
        'offset=-1',
        'offset=1.1',
        `q=${'x'.repeat(201)}`,
        'access=free&access=pro',
      ])
        await api(`/api/admin/components?${query}`, owner, 'GET', undefined, 400);
      assert.equal((await api<Page>('/api/admin/components', owner)).body.limit, 25);
    },
  );
  await check(
    'every protected Basic ID denies either mutation and malformed/no-op inputs leave revisions/audit unchanged',
    async () => {
      const start = await state();
      const record = await detail();
      const valid = {
        access: 'free',
        version: record.version,
        policyRevision: record.policyRevision,
        reason: 'Review',
      };
      for (const item of COMPONENT_ACCESS_BASELINE.filter(
        (entry) => entry.originalTier === 'basic',
      ))
        for (const access of ['free', 'pro'])
          await api(
            `/api/admin/components/${item.id}/access`,
            owner,
            'PATCH',
            { ...valid, access },
            403,
          );
      for (const invalid of [
        { ...valid, access: 'basic' },
        { ...valid, access: 'pro' },
        { ...valid, version: 0 },
        { ...valid, policyRevision: 0 },
        { ...valid, policyRevision: 1.5 },
        { ...valid, reason: '' },
        { ...valid, reason: '  ' },
        { ...valid, reason: 'x'.repeat(1001) },
        { ...valid, forged: true },
        { access: 'free', version: record.version, reason: 'Missing revision' },
      ])
        await api(`/api/admin/components/${proId}/access`, owner, 'PATCH', invalid, 400);
      await api('/api/admin/components/unknown/access', owner, 'PATCH', valid, 404);
      await api(`/api/admin/components/${proId}/access`, owner, 'PATCH', valid, 403, {
        Origin: 'https://foreign.invalid',
      });
      await api(
        `/api/admin/components/${proId}/access`,
        owner,
        'PATCH',
        { ...valid, reason: 'x'.repeat(33000) },
        413,
      );
      const malformed = await fetch(`${origin}/api/admin/components/${proId}/access`, {
        method: 'PATCH',
        headers: { Origin: origin, Cookie: owner.cookie, 'Content-Type': 'application/json' },
        body: '{',
      });
      assert.equal(malformed.status, 400);
      assert.deepEqual(await state(), start);
    },
  );
  await check(
    'Pro to Free to Pro changes commit override/revisions/scoped audit atomically without leaking staff metadata',
    async () => {
      const before = await detail();
      const previous = await state();
      const changed = await update('free', '  Reviewed free access  ');
      assert.equal(changed.policyRevision, before.policyRevision + 1);
      assert.equal(changed.version, before.version + 1);
      const record = await detail();
      assert.equal(record.component.access, 'free');
      assert.equal(record.history.length, 1);
      assert.deepEqual(record.history[0]!.before, {
        id: proId,
        access: 'pro',
        policyRevision: before.policyRevision,
      });
      assert.deepEqual(record.history[0]!.after, {
        id: proId,
        access: 'free',
        policyRevision: changed.policyRevision,
      });
      assert.equal(record.history[0]!.reason, 'Reviewed free access');
      assert.equal((await state()).audits, previous.audits + 1);
      const publicPolicy = (await api<EffectiveComponentPolicy>('/api/catalog/component-access'))
        .body;
      assert.equal(publicPolicy.components.find((item) => item.id === proId)!.access, 'free');
      assert(!JSON.stringify(publicPolicy).includes(owner.id));
      const audit = (
        await api<{ items: Record<string, unknown>[] }>(
          `/api/admin/audit?namespace=catalog&targetId=${proId}`,
          owner,
        )
      ).body;
      assert.equal(audit.items.length, 1);
      assert.equal(audit.items[0]!.targetType, 'component');
      for (const account of [admin, moderator, custom]) {
        const overview = (
          await api<{ recent: Record<string, unknown>[] }>('/api/admin/overview', account)
        ).body;
        assert(!JSON.stringify(overview).includes('Reviewed free access'));
        const user = (
          await api(
            `/api/admin/users/${ordinary.id}`,
            account,
            'GET',
            undefined,
            account === moderator ? 403 : 200,
          )
        ).body;
        assert(!JSON.stringify(user).includes('catalog.components.access.update'));
        const scopes = (
          await api<{ namespaces: string[]; items: { namespace: string }[] }>(
            '/api/admin/audit',
            account,
            'GET',
            undefined,
            account === custom ? 403 : 200,
          )
        ).body;
        if (account === custom) continue;
        assert(!scopes.namespaces.includes('catalog'));
        assert(scopes.items.every((row) => row.namespace !== 'catalog'));
      }
      await update('pro');
      assert.equal((await detail()).component.access, 'pro');
    },
  );
  await check(
    'concurrent edits and stale admin/policy review conflict without replay or extra audit',
    async () => {
      const record = await detail();
      const before = await state();
      const body = {
        access: 'free',
        version: record.version,
        policyRevision: record.policyRevision,
        reason: 'Concurrent review',
      };
      const attempts = await Promise.all(
        [owner, otherOwner].map(async (account) => {
          const res = await fetch(`${origin}/api/admin/components/${proId}/access`, {
            method: 'PATCH',
            headers: { Origin: origin, Cookie: account.cookie, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          await res.arrayBuffer();
          return res.status;
        }),
      );
      assert.deepEqual(attempts.sort(), [200, 409]);
      assert.equal((await state()).audits, before.audits + 1);
      await api(`/api/admin/components/${proId}/access`, owner, 'PATCH', body, 409);
      const fresh = await detail();
      await api(
        `/api/admin/components/${proId}/access`,
        owner,
        'PATCH',
        { ...body, access: 'pro', version: fresh.version },
        409,
      );
      await update('pro', 'Fresh review after conflict');
    },
  );
  await check('audit insertion failure rolls back override and both revisions', async () => {
    const before = await detail();
    const previous = await state();
    await fixture('audit-failure', { enabled: true });
    await api(
      `/api/admin/components/${proId}/access`,
      owner,
      'PATCH',
      {
        access: 'free',
        version: before.version,
        policyRevision: before.policyRevision,
        reason: 'Reject this audit',
      },
      503,
    );
    assert.deepEqual(await detail(), before);
    assert.deepEqual(await state(), previous);
    await fixture('audit-failure', { enabled: false });
  });
  await check(
    'fresh role/suspension checks and transaction rechecks block stale staff authority',
    async () => {
      for (const kind of ['role', 'suspension', 'policy'] as const) {
        const before = await detail();
        const previous = await state();
        const statements: Sql[] =
          kind === 'role'
            ? [{ sql: "UPDATE user SET global_role='admin' WHERE id=?", args: [owner.id] }]
            : kind === 'suspension'
              ? [
                  {
                    sql: 'INSERT INTO account_controls(user_id,suspended,ends_at,version,updated_at) VALUES (?,1,NULL,1,1)',
                    args: [owner.id],
                  },
                ]
              : bump;
        await race(
          `/api/admin/components/${proId}/access`,
          'PATCH',
          {
            access: 'free',
            version: before.version,
            policyRevision: before.policyRevision,
            reason: 'Racing authority',
          },
          'admin',
          statements,
          owner,
        );
        if (kind === 'role') {
          await api('/api/admin/components', owner, 'GET', undefined, 403);
          await sql({
            sql: "UPDATE user SET global_role='super_admin' WHERE id=?",
            args: [owner.id],
          });
        }
        if (kind === 'suspension') {
          await api('/api/admin/components', owner, 'GET', undefined, 403);
          await sql({ sql: 'DELETE FROM account_controls WHERE user_id=?', args: [owner.id] });
          const signed = await api('/api/auth/sign-in/email', undefined, 'POST', {
            email: owner.email,
            password: 'Local-password-123!',
          });
          owner.cookie = signed.res.headers
            .getSetCookie()
            .map((v) => v.split(';')[0])
            .join('; ');
        }
        assert.equal((await detail()).component.access, 'pro');
        assert.equal((await state()).audits, previous.audits);
        assert.equal((await state()).version, previous.version);
      }
    },
  );
  await check(
    'guest/free/paid action requirements follow policy while injected faults stay independent',
    async () => {
      await api('/api/simulator/authorize', undefined, 'POST', { circuit: pro }, 401);
      await api('/api/simulator/authorize', ordinary, 'POST', { circuit: pro }, 403);
      const paidPro = (
        await api<{ required: string[]; policy: EffectiveComponentPolicy }>(
          '/api/simulator/authorize',
          paid,
          'POST',
          { circuit: pro },
        )
      ).body;
      assert(paidPro.required.includes('pro_components'));
      await update('free');
      for (const account of [undefined, ordinary, paid]) {
        const result = (
          await api<{ required: string[]; userId?: string; policy: EffectiveComponentPolicy }>(
            '/api/simulator/authorize',
            account,
            'POST',
            { circuit: pro },
          )
        ).body;
        assert.deepEqual(result.required, []);
        assert.equal(result.userId, account?.id);
        assert.equal(result.policy.revision, (await detail()).policyRevision);
      }
      const faulted = structuredClone(pro);
      faulted.faults = [
        createInjectedFault('arc-fault', { type: 'component', id: pro.components[0]!.id }),
      ];
      await api('/api/simulator/authorize', ordinary, 'POST', { circuit: faulted }, 403);
      await api(
        '/api/simulator/authorize',
        undefined,
        'POST',
        { circuit: pro, policy: paidPro.policy },
        400,
      );
      await api(
        '/api/circuits',
        ordinary,
        'POST',
        { name: 'Forged policy', circuit: pro, policy: paidPro.policy },
        400,
      );
    },
  );
  let saved: { id: string; version: number };
  await check(
    'policy downgrade preserves original document/read-only status, blocks stripping, permits explicit Basic copy/deletion',
    async () => {
      saved = (
        await api<{ id: string; version: number }>(
          '/api/circuits',
          ordinary,
          'POST',
          { name: 'Original pro content', circuit: pro },
          201,
        )
      ).body;
      await update('pro');
      const loaded = (
        await api<{ readOnly: boolean; circuit: Circuit; policy: EffectiveComponentPolicy }>(
          `/api/circuits/${saved.id}`,
          ordinary,
        )
      ).body;
      assert.equal(loaded.readOnly, true);
      assert.deepEqual(loaded.circuit, normalizeCircuit(pro));
      await api(
        `/api/circuits/${saved.id}`,
        ordinary,
        'PATCH',
        { name: 'Strip locked', circuit: basic, version: saved.version },
        403,
      );
      await api(`/api/circuits/${saved.id}`, paid, 'GET', undefined, 404);
      const copy = (
        await api<{ id: string; version: number }>(
          '/api/circuits',
          ordinary,
          'POST',
          { name: 'Explicit Basic copy', circuit: basic },
          201,
        )
      ).body;
      await api(`/api/circuits/${copy.id}`, ordinary, 'DELETE', { version: copy.version });
      await update('free');
      assert.equal(
        (await api<{ readOnly: boolean }>(`/api/circuits/${saved.id}`, ordinary)).body.readOnly,
        false,
      );
    },
  );
  await check(
    'every save checks policy revision, including Basic and previously Free content and Pro-Free-Pro cycles',
    async () => {
      for (const circuit of [basic, pro]) {
        const before = await sql({
          sql: 'SELECT COUNT(*) AS count FROM circuits WHERE user_id=?',
          args: [ordinary.id],
        });
        await race(
          '/api/circuits',
          'POST',
          { name: 'Racing create', circuit },
          'write',
          bump,
          ordinary,
        );
        assert.deepEqual(
          await sql({
            sql: 'SELECT COUNT(*) AS count FROM circuits WHERE user_id=?',
            args: [ordinary.id],
          }),
          before,
        );
        const existing = (
          await api<{ id: string; version: number }>(
            '/api/circuits',
            ordinary,
            'POST',
            { name: 'Before race', circuit },
            201,
          )
        ).body;
        await race(
          `/api/circuits/${existing.id}`,
          'PATCH',
          { name: 'Racing replacement', circuit: basic, version: existing.version },
          'write',
          bump,
          ordinary,
        );
        const after = (
          await api<{ version: number; circuit: Circuit; name: string }>(
            `/api/circuits/${existing.id}`,
            ordinary,
          )
        ).body;
        assert.equal(after.version, existing.version);
        assert.equal(after.name, 'Before race');
        assert.deepEqual(after.circuit, normalizeCircuit(circuit));
      }
      // Same access before/after still conflicts when a complete policy cycle intervenes.
      await race(
        '/api/circuits',
        'POST',
        { name: 'Cycle', circuit: pro },
        'write',
        [
          {
            sql: "UPDATE component_access_overrides SET access='pro' WHERE component_id=?",
            args: [proId],
          },
          ...bump,
          {
            sql: "UPDATE component_access_overrides SET access='free' WHERE component_id=?",
            args: [proId],
          },
          ...bump,
        ],
        ordinary,
      );
    },
  );
  await check(
    'membership and policy races deny writes and discard computed/authorized responses',
    async () => {
      for (const path of ['/api/simulator/authorize', '/api/simulator/simulate']) {
        await race(path, 'POST', { circuit: pro }, 'response', bump, ordinary);
        await race(path, 'POST', { circuit: pro }, 'membership', bump, ordinary);
      }
      await update('pro');
      for (const [path, point] of [
        ['/api/circuits', 'write'],
        ['/api/simulator/authorize', 'response'],
        ['/api/simulator/simulate', 'response'],
      ] as const) {
        await sql({
          sql: "UPDATE entitlements SET status='active' WHERE user_id=?",
          args: [paid.id],
        });
        await race(
          path,
          'POST',
          path === '/api/circuits' ? { name: 'Revoked', circuit: pro } : { circuit: pro },
          point,
          [{ sql: "UPDATE entitlements SET status='revoked' WHERE user_id=?", args: [paid.id] }],
          paid,
          403,
        );
      }
      await sql({
        sql: "UPDATE entitlements SET status='active' WHERE user_id=?",
        args: [paid.id],
      });
    },
  );
  await check(
    'policy changes preserve identical electrical results and original owner may delete a locked document',
    async () => {
      const resultPro = (
        await api<Record<string, unknown>>('/api/simulator/simulate', paid, 'POST', {
          circuit: pro,
        })
      ).body;
      assert(resultPro.access);
      resultPro.access = undefined;
      await update('free');
      const resultFree = (
        await api<Record<string, unknown>>('/api/simulator/simulate', undefined, 'POST', {
          circuit: pro,
        })
      ).body;
      assert(resultFree.access);
      resultFree.access = undefined;
      assert.deepEqual(resultFree, resultPro);
      await update('pro');
      await api(`/api/circuits/${saved.id}`, ordinary, 'DELETE', { version: saved.version });
      const basicResult = await api('/api/simulator/simulate', undefined, 'POST', {
        circuit: basic,
      });
      assert(basicResult.body.access);
    },
  );
  await check(
    'catalogue history is bounded, scoped and append-only; test controls absent from application Worker',
    async () => {
      for (let i = 0; i < 22; i++)
        await update(i % 2 === 0 ? 'free' : 'pro', `Bounded history ${i}`);
      assert.equal((await detail()).history.length, 20);
      assert.deepEqual((await fixture('audit-immutability', {})).blocked, [true, true]);
      assert.deepEqual(
        (await api<{ statuses: number[] }>('/api/__component/boundary')).body.statuses,
        [404, 404],
      );
    },
  );
  complete = true;
  console.log(
    `Component access Gate C passed: ${passed.length} groups. Local evidence: ${persist}`,
  );
} finally {
  writeFileSync(
    `${persist}/results.json`,
    JSON.stringify(
      {
        status: complete ? 'passed' : 'failed',
        passed,
        scope:
          'Phase 2.0A Gate C server boundary only; client recovery, Components UI and full acceptance remain pending',
      },
      null,
      2,
    ),
  );
  worker.kill('SIGTERM');
  await stopped;
  log.end();
}
