/** Isolated real Hono/workerd + D1 + Better Auth acceptance gate. Never targets a remote URL. */
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, mkdirSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import type { D1Database } from '@cloudflare/workers-types';
import { getPlatformProxy } from 'wrangler';
import { localTestUrl } from './local-test-url';

const config = 'wrangler.membership-test.jsonc';
mkdirSync('.wrangler', { recursive: true });
const persist = mkdtempSync(resolve('.wrangler/membership-tests-'));
function command(args: string[], success = true) {
  const result = spawnSync('bun', args, {
    encoding: 'utf8',
    timeout: 60_000,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  if (success && result.status !== 0)
    throw new Error(`${args[0]} failed: ${result.stdout}\n${result.stderr}`);
  if (!success) assert.notEqual(result.status, 0);
  return result;
}
command([
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
]);
const port = await new Promise<number>((resolvePort) => {
  const server = createServer();
  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    assert(address && typeof address !== 'string');
    server.close(() => resolvePort(address.port));
  });
});
const origin = localTestUrl(`http://127.0.0.1:${port}`, '', 'membership test');
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
  {
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  },
);
worker.stdout.pipe(log);
worker.stderr.pipe(log);
const stopped = new Promise<void>((done) => worker.on('exit', () => done()));
let proxy: Awaited<ReturnType<typeof getPlatformProxy<{ DB: D1Database }>>> | undefined;
interface Payload {
  id: string;
  version: number;
  name: string;
  status: string;
  state: string;
  affectedMemberCount: number;
  archivedAt: number | null;
  deleted: boolean;
  total: number;
  error: string;
  startsAt: number;
  endsAt: number | null;
  user: { id: string; globalRole: string };
  capabilities: string[];
  items: Payload[];
  grants: Payload[];
  features: { key?: string; featureKey: string; enabled: boolean; config: object }[];
  before: Payload | null;
  after: Payload | null;
  action: string;
}
type Account = { id: string; cookie: string; email: string };
let checks = 0;
async function check(name: string, work: () => Promise<void>) {
  await work();
  checks++;
  console.log(`PASS ${name}`);
}
async function api(
  path: string,
  options: {
    user?: Account;
    method?: string;
    data?: unknown;
    origin?: string | null;
    headers?: Record<string, string>;
    expected?: number;
  } = {},
) {
  const headers: Record<string, string> = {
    ...(options.user ? { Cookie: options.user.cookie } : {}),
    ...options.headers,
  };
  if (options.data !== undefined) headers['Content-Type'] = 'application/json';
  if (options.origin !== null) headers.Origin = options.origin ?? origin;
  const res = await fetch(`${origin}/api${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.data === undefined ? undefined : JSON.stringify(options.data),
    redirect: 'manual',
  });
  const body = (await res.json()) as Payload;
  if (options.expected !== undefined)
    assert.equal(
      res.status,
      options.expected,
      `${options.method ?? 'GET'} ${path}: ${body.error ?? 'unexpected status'}`,
    );
  return { res, body };
}
async function signup(label: string, extra: Record<string, unknown> = {}): Promise<Account> {
  const email = `${label}@membership.test`;
  const { res, body } = await api('/auth/sign-up/email', {
    method: 'POST',
    data: { name: label, email, password: 'Local-test-password-123!', ...extra },
    expected: 200,
  });
  const cookie = res.headers
    .getSetCookie()
    .map((value) => value.split(';')[0])
    .join('; ');
  assert(cookie.includes('session_token'), 'Better Auth must issue a real session cookie');
  return { id: body.user.id, cookie, email };
}
const reason = 'Local acceptance test';
const planData = (slug: string, features = ['pro_components']) => ({
  slug,
  name: slug,
  description: 'Local fixture',
  noExpiry: false,
  durationDays: 30,
  status: 'active',
  features: features.map((featureKey) => ({ featureKey, enabled: true, config: {} })),
  reason,
});
try {
  const deadline = Date.now() + 45_000;
  while (true) {
    try {
      if ((await fetch(`${origin}/api/health`)).ok) break;
    } catch {
      /* wait for local worker */
    }
    if (Date.now() > deadline || worker.exitCode !== null)
      throw new Error(`Worker did not start; see ${persist}/worker.log`);
    await new Promise((done) => setTimeout(done, 150));
  }
  proxy = await getPlatformProxy<{ DB: D1Database }>({
    configPath: config,
    persist: { path: `${persist}/v3` },
    remoteBindings: false,
    envFiles: [],
  });
  const db = proxy.env.DB;
  const ordinary = await signup('ordinary');
  const admin = await signup('staff-admin');
  const moderator = await signup('staff-moderator');
  const owner = await signup('org-owner');
  const instructor = await signup('instructor');
  const paid = await signup('paid');
  const superAdmin = await signup('operator');
  await check('signup cannot claim roles, capabilities or access', async () => {
    assert.equal(
      (await api('/auth/get-session', { user: ordinary, expected: 200 })).body.user.globalRole,
      'individual',
    );
    const forged = await api('/auth/sign-up/email', {
      method: 'POST',
      data: {
        name: 'forged',
        email: 'forged@membership.test',
        password: 'Local-test-password-123!',
        globalRole: 'super_admin',
        isPro: true,
        capabilities: ['pro_components'],
      },
    });
    assert([200, 400].includes(forged.res.status));
    const row = await db
      .prepare('SELECT global_role FROM user WHERE email = ?')
      .bind('forged@membership.test')
      .first<{ global_role: string }>();
    assert(!row || row.global_role === 'individual');
    assert.deepEqual(
      (await api('/me/membership', { user: ordinary, expected: 200 })).body.capabilities,
      [],
    );
  });
  await check('only explicit known-user bootstrap establishes first super admin', async () => {
    const args = [
      'scripts/bootstrap-super-admin.ts',
      '--local',
      '--config',
      config,
      '--persist-to',
      persist,
      '--email',
    ];
    command([...args, 'missing@membership.test'], false);
    command([...args, superAdmin.email]);
    command([...args, superAdmin.email]);
    command([...args, ordinary.email], false);
    const count = await db
      .prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'user.bootstrap'")
      .first<{ n: number }>();
    assert.equal(count?.n, 1);
  });
  await db.batch([
    db.prepare("UPDATE user SET global_role = 'admin' WHERE id = ?").bind(admin.id),
    db.prepare("UPDATE user SET global_role = 'moderator' WHERE id = ?").bind(moderator.id),
    db
      .prepare(
        "INSERT INTO organization (id, name, slug, created_at) VALUES ('local-org','Local org','local-org',?)",
      )
      .bind(Date.now()),
    db
      .prepare(
        "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES ('owner-member','local-org',?,'owner',?)",
      )
      .bind(owner.id, Date.now()),
    db
      .prepare(
        "INSERT INTO member (id, organization_id, user_id, role, created_at) VALUES ('instructor-member','local-org',?,'instructor',?)",
      )
      .bind(instructor.id, Date.now()),
  ]);
  await check('profile updates cannot escalate global roles', async () => {
    const res = await api('/auth/update-user', {
      user: ordinary,
      method: 'POST',
      data: {
        name: 'still-free',
        globalRole: 'super_admin',
        global_role: 'super_admin',
        isPro: true,
      },
    });
    assert([200, 400].includes(res.res.status));
    assert.equal(
      (
        await db
          .prepare('SELECT global_role FROM user WHERE id = ?')
          .bind(ordinary.id)
          .first<{ global_role: string }>()
      )?.global_role,
      'individual',
    );
  });
  const createPlan = async (slug: string, features?: string[]) =>
    (
      await api('/admin/pro/plans', {
        user: superAdmin,
        method: 'POST',
        data: planData(slug, features),
        expected: 201,
      })
    ).body;
  const assign = async (planId: string, user = paid, dates: Record<string, unknown> = {}) =>
    (
      await api('/admin/pro/memberships', {
        user: superAdmin,
        method: 'POST',
        data: {
          userId: user.id,
          planId,
          status: 'active',
          startsAt: Date.now() - 1000,
          endsAt: Date.now() + 86400000,
          noExpiry: false,
          reason,
          ...dates,
        },
        expected: 201,
      })
    ).body;
  let plan = await createPlan('pro');
  let grant = await assign(plan.id);
  await check(
    'guest/free/paid/admin/moderator/org-owner/instructor cannot administer memberships',
    async () => {
      for (const user of [undefined, ordinary, paid, admin, moderator, owner, instructor]) {
        const expected = user ? 403 : 401;
        for (const resource of ['plans', 'features', 'memberships']) {
          await api(`/admin/pro/${resource}`, { user, expected });
          await api(`/admin/pro/${resource}`, { user, method: 'POST', data: {}, expected });
          await api(`/admin/pro/${resource}/some-id`, {
            user,
            method: 'PATCH',
            data: {},
            expected,
          });
          await api(`/admin/pro/${resource}/some-id`, {
            user,
            method: 'DELETE',
            data: {},
            expected,
          });
        }
        await api('/admin/ping', { user, expected });
        await api('/admin/pro/audit', { user, expected });
        await api('/admin/pro/users', { user, expected });
      }
      await api('/admin/ping', { user: superAdmin, expected: 200 });
      assert.deepEqual(
        (await api('/me/membership', { user: superAdmin, expected: 200 })).body.capabilities,
        [],
      );
    },
  );
  await check('same-origin JSON mutations and strict validation required', async () => {
    for (const badOrigin of [null, 'https://evil.example'])
      await api('/admin/pro/plans', {
        user: superAdmin,
        origin: badOrigin,
        method: 'POST',
        data: planData('csrf'),
        expected: 403,
      });
    await api('/admin/pro/plans', {
      user: superAdmin,
      method: 'POST',
      data: planData('csrf'),
      headers: { 'Sec-Fetch-Site': 'cross-site' },
      expected: 403,
    });
    await api('/admin/pro/plans', { user: superAdmin, method: 'POST', expected: 415 });
    for (const extra of [
      { priceMinor: 100 },
      { durationDays: null },
      { status: 'unknown' },
      { features: [{ featureKey: 'not-implemented', enabled: true }] },
      { globalRole: 'super_admin' },
      { features: [{ featureKey: 'pro_components', enabled: true, config: { quota: 10 } }] },
    ]) {
      await api('/admin/pro/plans', {
        user: superAdmin,
        method: 'POST',
        data: { ...planData('invalid'), ...extra },
        expected: 400,
      });
    }
    await api('/admin/pro/memberships', {
      user: superAdmin,
      method: 'POST',
      data: {
        userId: paid.id,
        planId: plan.id,
        status: 'active',
        startsAt: 5000,
        endsAt: null,
        noExpiry: false,
        reason,
      },
      expected: 400,
    });
    await api('/admin/pro/plans?limit=101', { user: superAdmin, expected: 400 });
  });
  await check('private own membership resolves grants without exposing another user', async () => {
    await api('/me/membership', { expected: 401 });
    const result = await api('/me/membership', { user: paid, expected: 200 });
    assert.match(result.res.headers.get('Cache-Control')!, /private.*no-store/);
    assert.deepEqual(result.body.capabilities, ['pro_components']);
    assert.deepEqual(
      (await api(`/me/membership?userId=${paid.id}`, { user: ordinary, expected: 200 })).body
        .capabilities,
      [],
    );
    await api('/admin/pro/users?q=paid', { user: superAdmin, expected: 200 });
  });
  await check(
    'price and duration edits preserve assigned dates and expose impact counts',
    async () => {
      const before = (
        await api(`/admin/pro/memberships/${grant.id}`, { user: superAdmin, expected: 200 })
      ).body;
      const impact = (await api(`/admin/pro/plans/${plan.id}`, { user: superAdmin, expected: 200 }))
        .body;
      assert.equal(impact.affectedMemberCount, 1);
      plan = (
        await api(`/admin/pro/plans/${plan.id}`, {
          user: superAdmin,
          method: 'PATCH',
          data: {
            version: plan.version,
            reason,
            durationDays: 60,
            priceMinor: 1250,
            currency: 'USD',
          },
          expected: 200,
        })
      ).body;
      const after = (
        await api(`/admin/pro/memberships/${grant.id}`, { user: superAdmin, expected: 200 })
      ).body;
      assert.equal(after.startsAt, before.startsAt);
      assert.equal(after.endsAt, before.endsAt);
      assert.equal(after.version, before.version);
    },
  );
  await check(
    'concurrent stale edits commit exactly one plan change and matching audit',
    async () => {
      const results = await Promise.all(
        Array.from({ length: 8 }, (_, index) =>
          api(`/admin/pro/plans/${plan.id}`, {
            user: superAdmin,
            method: 'PATCH',
            data: {
              version: plan.version,
              reason,
              name: `winner-${index}`,
              features: [
                {
                  featureKey: index % 2 ? 'advanced_faults' : 'pro_components',
                  enabled: true,
                  config: {},
                },
              ],
            },
          }),
        ),
      );
      assert.equal(results.filter((r) => r.res.status === 200).length, 1);
      assert.equal(results.filter((r) => r.res.status === 409).length, 7);
      const winner = results.find((r) => r.res.status === 200)!.body;
      plan = (await api(`/admin/pro/plans/${plan.id}`, { user: superAdmin, expected: 200 })).body;
      assert.equal(plan.name, winner.name);
      assert.deepEqual(plan.features, winner.features);
      const audit = (
        await api(`/admin/pro/audit?targetId=${plan.id}`, { user: superAdmin, expected: 200 })
      ).body;
      assert.equal(audit.total, 3);
      assert.equal(audit.items[0].after?.name, winner.name);
      assert.deepEqual(
        (await api('/me/membership', { user: paid, expected: 200 })).body.capabilities,
        [plan.features[0].featureKey],
      );
      plan = (
        await api(`/admin/pro/plans/${plan.id}`, {
          user: superAdmin,
          method: 'PATCH',
          data: {
            version: plan.version,
            reason,
            features: [{ featureKey: 'pro_components', enabled: true, config: {} }],
          },
          expected: 200,
        })
      ).body;
    },
  );
  await check(
    'overlap, suspension, extension and revocation refresh within the same session',
    async () => {
      const advanced = await createPlan('advanced', ['advanced_faults', 'advanced_diagnostics']);
      let second = await assign(advanced.id);
      assert.deepEqual(
        (await api('/me/membership', { user: paid, expected: 200 })).body.capabilities,
        ['pro_components', 'advanced_faults', 'advanced_diagnostics'],
      );
      grant = (
        await api(`/admin/pro/memberships/${grant.id}`, {
          user: superAdmin,
          method: 'PATCH',
          data: { version: grant.version, reason, status: 'suspended' },
          expected: 200,
        })
      ).body;
      assert.deepEqual(
        (await api('/me/membership', { user: paid, expected: 200 })).body.capabilities,
        ['advanced_faults', 'advanced_diagnostics'],
      );
      grant = (
        await api(`/admin/pro/memberships/${grant.id}`, {
          user: superAdmin,
          method: 'PATCH',
          data: {
            version: grant.version,
            reason,
            status: 'active',
            endsAt: Date.now() + 172800000,
          },
          expected: 200,
        })
      ).body;
      second = (
        await api(`/admin/pro/memberships/${second.id}`, {
          user: superAdmin,
          method: 'DELETE',
          data: { version: second.version, reason },
          expected: 200,
        })
      ).body;
      assert.equal(second.status, 'revoked');
      assert.deepEqual(
        (await api('/me/membership', { user: paid, expected: 200 })).body.capabilities,
        ['pro_components'],
      );
      await api(`/admin/pro/memberships/${second.id}`, {
        user: superAdmin,
        method: 'PATCH',
        data: { version: second.version, reason, status: 'active' },
        expected: 400,
      });
    },
  );
  await check('scheduled/expired grants deny access; explicit no-expiry authorizes', async () => {
    const timed = await signup('timed');
    const now = Date.now();
    await assign(plan.id, timed, { startsAt: now + 100000, endsAt: now + 200000 });
    await assign(plan.id, timed, { startsAt: now - 2000, endsAt: now - 1000 });
    assert.deepEqual(
      (await api('/me/membership', { user: timed, expected: 200 })).body.capabilities,
      [],
    );
    const history = (await api('/me/membership', { user: timed, expected: 200 })).body;
    assert.deepEqual(history.grants.map((g) => g.state).sort(), ['expired', 'scheduled']);
    await assign(plan.id, timed, { startsAt: now, endsAt: null, noExpiry: true });
    assert.deepEqual(
      (await api('/me/membership', { user: timed, expected: 200 })).body.capabilities,
      ['pro_components'],
    );
  });
  await check('membership and feature version conflicts cannot append success audits', async () => {
    const memberAudit = (
      await api(`/admin/pro/audit?targetId=${grant.id}`, { user: superAdmin, expected: 200 })
    ).body.total;
    const races = await Promise.all(
      [0, 1, 2, 3].map((index) =>
        api(`/admin/pro/memberships/${grant.id}`, {
          user: superAdmin,
          method: 'PATCH',
          data: { version: grant.version, reason, endsAt: Date.now() + 86400000 + index * 10000 },
        }),
      ),
    );
    assert.equal(races.filter((r) => r.res.status === 200).length, 1);
    assert.equal(races.filter((r) => r.res.status === 409).length, 3);
    grant = races.find((r) => r.res.status === 200)!.body;
    assert.equal(
      (await api(`/admin/pro/audit?targetId=${grant.id}`, { user: superAdmin, expected: 200 })).body
        .total,
      memberAudit + 1,
    );
    const feature = (
      await api('/admin/pro/features/advanced_diagnostics', { user: superAdmin, expected: 200 })
    ).body;
    const edits = await Promise.all(
      [0, 1, 2, 3].map((index) =>
        api('/admin/pro/features/advanced_diagnostics', {
          user: superAdmin,
          method: 'PATCH',
          data: { version: feature.version, reason, name: { en: `Advanced diagnosis ${index}` } },
        }),
      ),
    );
    assert.equal(edits.filter((r) => r.res.status === 200).length, 1);
    assert.equal(edits.filter((r) => r.res.status === 409).length, 3);
    const winner = edits.find((r) => r.res.status === 200)!.body;
    await api('/admin/pro/features/advanced_diagnostics', {
      user: superAdmin,
      method: 'PATCH',
      data: { version: winner.version, reason, handler: 'pro_components' },
      expected: 400,
    });
    assert.equal(
      (
        await api('/admin/pro/audit?targetId=advanced_diagnostics', {
          user: superAdmin,
          expected: 200,
        })
      ).body.total,
      1,
    );
  });
  await check(
    'pagination stays bounded and basic staff accounts have no automatic capabilities',
    async () => {
      const first = (
        await api('/admin/pro/audit?limit=2&offset=0', { user: superAdmin, expected: 200 })
      ).body;
      const second = (
        await api('/admin/pro/audit?limit=2&offset=2', { user: superAdmin, expected: 200 })
      ).body;
      assert.equal(first.items.length, 2);
      assert.equal(second.items.length, 2);
      assert(!first.items.some((entry) => second.items.some((other) => other.id === entry.id)));
      for (const user of [ordinary, admin, moderator, owner, instructor])
        assert.deepEqual(
          (await api('/me/membership', { user, expected: 200 })).body.capabilities,
          [],
        );
    },
  );
  await check('public plans omit unsupported features and all membership data', async () => {
    const publicPlans = (await api('/plans', { expected: 200 })).body;
    assert(publicPlans.items.some((p) => p.id === plan.id));
    assert(!JSON.stringify(publicPlans).includes(paid.id));
    await api('/admin/pro/features', {
      user: superAdmin,
      method: 'POST',
      data: { key: 'fake', handler: 'cloud_quota', name: { en: 'Fake' }, enabled: true, reason },
      expected: 400,
    });
    await db
      .prepare(
        "INSERT INTO pro_features (key, handler, name, description, enabled, version, mutation_id, created_at, updated_at) VALUES ('future', 'cloud_quota', '{}', '{}', 1, 1, 'test', ?, ?)",
      )
      .bind(Date.now(), Date.now())
      .run();
    await db
      .prepare(
        "INSERT INTO plan_features (plan_id, feature_key, enabled, config) VALUES (?, 'future', 1, '{}')",
      )
      .bind(plan.id)
      .run();
    assert(
      !(await api('/plans', { expected: 200 })).body.items
        .flatMap((p) => p.features)
        .some((f) => f.key === 'future'),
    );
    assert.deepEqual(
      (await api('/me/membership', { user: paid, expected: 200 })).body.capabilities,
      ['pro_components'],
    );
    await db.prepare("DELETE FROM plan_features WHERE feature_key = 'future'").run();
  });
  await check(
    'feature archive preserves grants; disabling explicitly removes capability',
    async () => {
      let benefit = (
        await api('/admin/pro/features/pro_components', { user: superAdmin, expected: 200 })
      ).body;
      benefit = (
        await api('/admin/pro/features/pro_components', {
          user: superAdmin,
          method: 'DELETE',
          data: { version: benefit.version, reason },
          expected: 200,
        })
      ).body;
      assert(benefit.archivedAt);
      assert.deepEqual(
        (await api('/me/membership', { user: paid, expected: 200 })).body.capabilities,
        ['pro_components'],
      );
      benefit = (
        await api('/admin/pro/features/pro_components', {
          user: superAdmin,
          method: 'PATCH',
          data: { version: benefit.version, reason, enabled: false },
          expected: 200,
        })
      ).body;
      assert.deepEqual(
        (await api('/me/membership', { user: paid, expected: 200 })).body.capabilities,
        [],
      );
      await api('/admin/pro/features/pro_components', {
        user: superAdmin,
        method: 'PATCH',
        data: { version: benefit.version, reason, enabled: true, archived: false },
        expected: 200,
      });
    },
  );
  await check(
    'referenced plan deletion archives without revoking or accepting new assignments',
    async () => {
      plan = (await api(`/admin/pro/plans/${plan.id}`, { user: superAdmin, expected: 200 })).body;
      plan = (
        await api(`/admin/pro/plans/${plan.id}`, {
          user: superAdmin,
          method: 'DELETE',
          data: { version: plan.version, reason },
          expected: 200,
        })
      ).body;
      assert.equal(plan.status, 'archived');
      assert.deepEqual(
        (await api('/me/membership', { user: paid, expected: 200 })).body.capabilities,
        ['pro_components'],
      );
      assert(!(await api('/plans', { expected: 200 })).body.items.some((p) => p.id === plan.id));
      await api('/admin/pro/memberships', {
        user: superAdmin,
        method: 'POST',
        data: {
          userId: ordinary.id,
          planId: plan.id,
          status: 'active',
          startsAt: 1000,
          endsAt: null,
          noExpiry: true,
          reason,
        },
        expected: 400,
      });
    },
  );
  await check('unused drafts and unreferenced benefits delete while audit survives', async () => {
    const draft = (
      await api('/admin/pro/plans', {
        user: superAdmin,
        method: 'POST',
        data: { ...planData('unused', []), status: 'draft' },
        expected: 201,
      })
    ).body;
    assert(
      (
        await api(`/admin/pro/plans/${draft.id}`, {
          user: superAdmin,
          method: 'DELETE',
          data: { version: draft.version, reason },
          expected: 200,
        })
      ).body.deleted,
    );
    await api(`/admin/pro/plans/${draft.id}`, { user: superAdmin, expected: 404 });
    assert.equal(
      (await api(`/admin/pro/audit?targetId=${draft.id}`, { user: superAdmin, expected: 200 })).body
        .total,
      2,
    );
    const feature = (
      await api('/admin/pro/features', {
        user: superAdmin,
        method: 'POST',
        data: {
          key: 'unused',
          handler: 'advanced_faults',
          name: { en: 'Unused' },
          enabled: true,
          reason,
        },
        expected: 201,
      })
    ).body;
    await api('/admin/pro/features/unused', {
      user: superAdmin,
      method: 'DELETE',
      data: { version: feature.version, reason },
      expected: 200,
    });
    await api('/admin/pro/features/unused', { user: superAdmin, expected: 404 });
  });
  await check('failed audit insertion rolls back the associated data mutation', async () => {
    const before = (await api('/admin/pro/plans', { user: superAdmin, expected: 200 })).body
      .items[0];
    await db
      .prepare(
        "CREATE TRIGGER fail_audit BEFORE INSERT ON audit_logs BEGIN SELECT RAISE(ABORT, 'forced audit failure'); END",
      )
      .run();
    try {
      await api(`/admin/pro/plans/${before.id}`, {
        user: superAdmin,
        method: 'PATCH',
        data: { version: before.version, reason, name: 'must roll back' },
        expected: 503,
      });
      const after = (
        await api(`/admin/pro/plans/${before.id}`, { user: superAdmin, expected: 200 })
      ).body;
      assert.equal(after.version, before.version);
      assert.equal(after.name, before.name);
    } finally {
      await db.prepare('DROP TRIGGER fail_audit').run();
    }
  });
  await check('a D1 read failure returns unavailable without cached capabilities', async () => {
    await db.prepare('ALTER TABLE entitlements RENAME TO entitlements_unavailable').run();
    try {
      const failed = await api('/me/membership', { user: paid, expected: 503 });
      assert.equal(failed.body.capabilities, undefined);
      assert.match(failed.res.headers.get('Cache-Control')!, /private.*no-store/);
    } finally {
      await db.prepare('ALTER TABLE entitlements_unavailable RENAME TO entitlements').run();
    }
    assert.deepEqual(
      (await api('/me/membership', { user: paid, expected: 200 })).body.capabilities,
      ['pro_components'],
    );
  });
  await check('fresh role read denies a demoted super admin with the existing cookie', async () => {
    await db
      .prepare("UPDATE user SET global_role = 'individual' WHERE id = ?")
      .bind(superAdmin.id)
      .run();
    await api('/admin/pro/plans', {
      user: superAdmin,
      method: 'POST',
      data: planData('denied'),
      expected: 403,
    });
  });
  console.log(
    `Membership acceptance passed: ${checks} groups against real local D1 and cookie sessions. Evidence: ${persist}`,
  );
} finally {
  if (proxy) await proxy.dispose();
  worker.kill('SIGTERM');
  await stopped;
  log.end();
}
