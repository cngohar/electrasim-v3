/** Loopback-only fixtures and request-local race interception. Never a product entry. */
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { type ApiEnv, freshContext, sameOriginMutation } from '../src/api/context';
import app from '../src/worker';
import platform from './platform-admin-test.worker';
type Statement = { sql: string; args?: unknown[] };
const tests = new Hono<ApiEnv>();
tests.use('*', async (c, next) => {
  if (c.env.ENV !== 'local' || !['localhost', '127.0.0.1'].includes(new URL(c.req.url).hostname))
    return c.notFound();
  await next();
});
tests.post('/api/__profiles/sql', freshContext, sameOriginMutation, async (c) => {
  const { statements } = await c.req.json<{ statements: Statement[] }>();
  return c.json(
    await c.get('db').batch(
      statements.map((s) =>
        c
          .get('db')
          .prepare(s.sql)
          .bind(...(s.args ?? [])),
      ),
    ),
  );
});
tests.post('/api/__profiles/objects', freshContext, sameOriginMutation, async (c) =>
  c.json(await c.env.R2.list({ prefix: 'profile-avatars/' })),
);
tests.post('/api/__profiles/race', sameOriginMutation, async (c) => {
  const input = await c.req.json<{
    path: string;
    method: string;
    body?: unknown;
    point:
      | 'write'
      | 'read'
      | 'avatar'
      | 'admin'
      | 'report'
      | 'response'
      | 'preview-attribution'
      | 'preview-result'
      | 'preview-policy'
      | 'preview-membership';
    statements: Statement[];
  }>();
  if (
    !/^\/(?:api\/(?:me\/(?:profile|avatar|publications)|community\/(?:users|publications)(?:\/|$)|admin\/community\/)|u\/|c\/)/.test(
      input.path,
    )
  )
    return c.notFound();
  const original = c.env.DB;
  const queries = new WeakMap<D1PreparedStatement, string>();
  let fired = false;
  let previewPolicyReads = 0;
  const compete = async () => {
    if (fired) return;
    fired = true;
    const db = original.withSession('first-primary');
    await db.batch(input.statements.map((s) => db.prepare(s.sql).bind(...(s.args ?? []))));
  };
  const db: D1Database = new Proxy(original, {
    get(target, prop) {
      if (prop === 'withSession')
        return (...args: Parameters<D1Database['withSession']>) => {
          const session = target.withSession(...args);
          return new Proxy(session, {
            get(current, key) {
              if (key === 'prepare')
                return (sql: string) => {
                  function wrap(stmt: D1PreparedStatement): D1PreparedStatement {
                    const wrapped = new Proxy(stmt, {
                      get(statement, name) {
                        if (name === 'bind')
                          return (...values: unknown[]) => wrap(statement.bind(...values));
                        if (name === 'first')
                          return async (...params: Parameters<D1PreparedStatement['first']>) => {
                            if (
                              input.point === 'preview-result' &&
                              sql.startsWith('SELECT id FROM publications')
                            )
                              await compete();
                            const value = await statement.first(...params);
                            if (
                              ((input.point === 'preview-attribution' &&
                                sql.includes('COALESCE(a.display_name')) ||
                                input.point === 'read') &&
                              (sql.includes('FROM profiles') ||
                                sql.includes('FROM publications')) &&
                              !fired
                            )
                              await compete();
                            return value;
                          };
                        const value = Reflect.get(statement, name);
                        return typeof value === 'function' ? value.bind(statement) : value;
                      },
                    });
                    queries.set(wrapped, sql);
                    return wrapped;
                  }
                  return wrap(current.prepare(sql));
                };
              if (key === 'batch')
                return async (batch: D1PreparedStatement[]) => {
                  const sql = batch.map((s) => queries.get(s) ?? '').join('\n');
                  if (sql.includes('SELECT revision FROM component_access_revision'))
                    previewPolicyReads++;
                  if (
                    (input.point === 'preview-policy' && previewPolicyReads === 3) ||
                    (input.point === 'preview-membership' &&
                      previewPolicyReads >= 3 &&
                      sql.includes('SELECT e.id, e.status'))
                  )
                    await compete();
                  if (
                    (input.point === 'write' && sql.startsWith('UPDATE profiles SET')) ||
                    (input.point === 'write' &&
                      (sql.startsWith('INSERT INTO publications') ||
                        sql.startsWith('UPDATE publications SET'))) ||
                    (input.point === 'admin' && sql.startsWith('UPDATE admin_revision')) ||
                    (input.point === 'report' &&
                      (sql.startsWith('INSERT INTO profile_reports') ||
                        sql.startsWith('INSERT INTO publication_reports')))
                  )
                    await compete();
                  const result = await current.batch(batch);
                  if (
                    input.point === 'response' &&
                    (sql.startsWith('UPDATE profiles SET') ||
                      sql.startsWith('INSERT INTO publications') ||
                      sql.startsWith('UPDATE publications SET'))
                  )
                    await compete();
                  return result;
                };
              const value = Reflect.get(current, key);
              return typeof value === 'function' ? value.bind(current) : value;
            },
          });
        };
      const value = Reflect.get(target, prop);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const r2 = new Proxy(c.env.R2, {
    get(target, key) {
      if (key === 'get')
        return async (...args: Parameters<typeof target.get>) => {
          const result = await target.get(...args);
          if (input.point === 'avatar') await compete();
          return result;
        };
      const value = Reflect.get(target, key);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  const response = await app.fetch(
    new Request(new URL(input.path, c.req.url), {
      method: input.method,
      headers: {
        Origin: new URL(c.req.url).origin,
        'Content-Type': 'application/json',
        Cookie: c.req.header('Cookie') ?? '',
      },
      body: ['GET', 'HEAD'].includes(input.method) ? undefined : JSON.stringify(input.body),
    }),
    { ...c.env, DB: db, R2: r2 },
    c.executionCtx,
  );
  response.headers.set('X-Test-Race-Fired', String(fired));
  return response;
});
tests.all('*', (c) => platform.fetch(c.req.raw, c.env, c.executionCtx));
export default tests;
