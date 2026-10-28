/** Test entry only; never imported by the application Worker. Local fixtures use
 * the serving Worker's own D1 binding so no second process opens its SQLite file.
 */
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { type ApiEnv, freshContext, requireSession, sameOriginMutation } from '../src/api/context';
import { createAdminApi } from '../src/api/platform';
import { adminAccess } from '../src/api/platform/access';
import { adminInput } from '../src/api/platform/input';
import { commitAdminChange } from '../src/api/platform/mutation';
import { requireCommunityWrite } from '../src/api/platform/restrictions';
import { coreModules, createAdminRegistry } from '../src/platform/registry';
import app from '../src/worker';
import browserTests from './browser-test-worker';

const fixtureRegistry = createAdminRegistry([
  ...coreModules,
  {
    id: 'fixture',
    label: 'Extension fixture',
    navigation: [
      { label: 'Extension fixture', href: '/admin/fixture/', permissions: ['fixture.read'] },
    ],
    permissions: [
      { key: 'fixture.read', label: 'Read extension fixture', defaults: [] },
      { key: 'fixture.write', label: 'Write extension fixture', defaults: [] },
    ],
    auditActions: ['fixture.record', 'fixture.settings.update'],
    settings: {
      read: 'fixture.read',
      write: 'fixture.write',
      defaults: { enabled: false },
      validate: (value) => {
        if (
          !value ||
          typeof value !== 'object' ||
          Array.isArray(value) ||
          Object.keys(value).length !== 1 ||
          typeof (value as Record<string, unknown>).enabled !== 'boolean'
        )
          throw new Error('Invalid fixture setting');
        return { enabled: (value as { enabled: boolean }).enabled };
      },
    },
    auditPermission: 'fixture.read',
    checks: ['test:platform-admin'],
  },
]);
const tests = new Hono<ApiEnv>();
tests.use('*', async (c, next) => {
  if (c.env.ENV !== 'local' || !['127.0.0.1', 'localhost'].includes(new URL(c.req.url).hostname))
    return c.notFound();
  await next();
});
tests.onError((error, c) =>
  error instanceof HTTPException
    ? c.json({ error: error.message }, error.status)
    : c.json({ error: 'Local fixture failure' }, 503),
);
// Real application routes are mounted before the extension; it cannot override
// production authorization by being registered first.
tests.route('/', browserTests);
tests.route('/api/__extension', createAdminApi(fixtureRegistry));
tests.post(
  '/api/__extension/record',
  freshContext,
  requireSession,
  sameOriginMutation,
  async (c) => {
    const access = await adminAccess(c, 'fixture.write', fixtureRegistry);
    const input = await adminInput(c, ['foreign']);
    return c.json(
      await commitAdminChange(
        c,
        access,
        {
          permission: 'fixture.write',
          action: input.foreign ? 'platform.accounts.restore' : 'fixture.record',
          targetType: 'fixture',
          targetId: 'fixture',
          before: null,
          after: { recorded: true },
          input,
          changes: () => [],
        },
        fixtureRegistry,
      ),
    );
  },
);
tests.post(
  '/api/__platform/community-write',
  freshContext,
  requireSession,
  sameOriginMutation,
  requireCommunityWrite,
  (c) => c.json({ ok: true }),
);
tests.post('/api/__platform/state', freshContext, sameOriginMutation, async (c) => {
  const { userId = '', reason = '' } = await c.req.json<{ userId?: string; reason?: string }>();
  const db = c.get('db');
  const rows = await db.batch<Record<string, unknown>>([
    db.prepare('SELECT version FROM admin_revision WHERE id=1'),
    db.prepare('SELECT COUNT(*) AS count FROM admin_audit'),
    db.prepare('SELECT COUNT(*) AS count FROM session WHERE user_id=?').bind(userId),
    db.prepare('SELECT global_role AS role FROM user WHERE id=?').bind(userId),
    db
      .prepare('SELECT suspended,ends_at AS endsAt FROM account_controls WHERE user_id=?')
      .bind(userId),
    db.prepare('SELECT COUNT(*) AS count FROM circuits WHERE user_id=?').bind(userId),
    db.prepare('SELECT COUNT(*) AS count FROM entitlements WHERE user_id=?').bind(userId),
    db.prepare('SELECT COUNT(*) AS count FROM admin_audit WHERE reason=?').bind(reason),
    db
      .prepare(
        "SELECT COUNT(*) AS count FROM user u WHERE global_role='super_admin' AND NOT EXISTS (SELECT 1 FROM account_controls a WHERE a.user_id=u.id AND a.suspended=1 AND (a.ends_at IS NULL OR a.ends_at>?))",
      )
      .bind(Date.now()),
  ]);
  return c.json({
    version: rows[0].results[0].version,
    audits: rows[1].results[0].count,
    sessions: rows[2].results[0].count,
    role: rows[3].results[0]?.role,
    controls: rows[4].results[0] ?? null,
    circuits: rows[5].results[0].count,
    grants: rows[6].results[0].count,
    matchingAudits: rows[7].results[0].count,
    activeSuperAdmins: rows[8].results[0].count,
  });
});
tests.post('/api/__platform/audit-failure', freshContext, sameOriginMutation, async (c) => {
  const { enabled } = await c.req.json<{ enabled: boolean }>();
  await c
    .get('db')
    .prepare(
      enabled
        ? "CREATE TRIGGER IF NOT EXISTS platform_test_audit_failure BEFORE INSERT ON admin_audit WHEN NEW.reason='Reject this audit' BEGIN SELECT RAISE(ABORT,'Test audit failure'); END"
        : 'DROP TRIGGER IF EXISTS platform_test_audit_failure',
    )
    .run();
  return c.json({ ok: true });
});
tests.post('/api/__platform/session-race', freshContext, sameOriginMutation, async (c) => {
  const { userId } = await c.req.json<{ userId: string }>();
  const id = crypto.randomUUID();
  const now = Date.now();
  let inserted = false;
  try {
    await c
      .get('db')
      .prepare(
        'INSERT INTO session (id,token,user_id,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?)',
      )
      .bind(id, crypto.randomUUID(), userId, now + 60000, now, now)
      .run();
    inserted = true;
  } catch {
    /* The actual suspension trigger must refuse this insert. */
  }
  if (inserted) await c.get('db').prepare('DELETE FROM session WHERE id=?').bind(id).run();
  return c.json({ inserted });
});
tests.post('/api/__platform/guard-fixture', freshContext, sameOriginMutation, async (c) => {
  const { userId, suspended } = await c.req.json<{ userId: string; suspended: boolean }>();
  await c
    .get('db')
    .prepare(
      'INSERT INTO account_controls (user_id,suspended,ends_at,version,updated_at) VALUES (?,?,NULL,1,?) ON CONFLICT(user_id) DO UPDATE SET suspended=excluded.suspended,ends_at=NULL',
    )
    .bind(userId, Number(suspended), Date.now())
    .run();
  return c.json({ ok: true });
});
tests.get('/api/__platform/search-plan', freshContext, async (c) => {
  const rows = await c
    .get('db')
    .prepare(
      'EXPLAIN QUERY PLAN SELECT id FROM user WHERE id=? UNION SELECT id FROM user WHERE lower(name)>=? AND lower(name)<? UNION SELECT id FROM user WHERE lower(email)>=? AND lower(email)<?',
    )
    .bind('x', 'test', 'test\uffff', 'test', 'test\uffff')
    .all();
  return c.json(rows.results);
});
tests.post('/api/__platform/audit-immutability', freshContext, sameOriginMutation, async (c) => {
  const blocked: boolean[] = [];
  for (const sql of [
    "UPDATE admin_audit SET reason='Attempted rewrite'",
    'DELETE FROM admin_audit',
  ]) {
    try {
      await c.get('db').prepare(sql).run();
      blocked.push(false);
    } catch {
      blocked.push(true);
    }
  }
  return c.json({ blocked });
});
tests.get('/api/__platform/application-boundary', async (c) => {
  const statuses: number[] = [];
  for (const path of [
    '/api/__test/role',
    '/api/__platform/state',
    '/api/__extension/access',
    '/api/__phase20/role',
  ]) {
    const response = await app.fetch(new Request(new URL(path, c.req.url)), c.env, c.executionCtx);
    statuses.push(response.status);
  }
  return c.json({ statuses });
});
export default tests;
