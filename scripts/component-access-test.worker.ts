/** Local test entry only. Request-local interception executes competing changes
 * on the serving Worker's D1 before resuming actual application statements.
 * No application source imports this module or accepts its fixture controls.
 */
import type { D1Database, D1PreparedStatement } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { type ApiEnv, freshContext, sameOriginMutation } from '../src/api/context';
import app from '../src/worker';
import platformTests from './platform-admin-test.worker';

type Statement = { sql: string; args?: (string | number | null)[] };
const tests = new Hono<ApiEnv>();
tests.use('*', async (c, next) => {
  if (c.env.ENV !== 'local' || !['127.0.0.1', 'localhost'].includes(new URL(c.req.url).hostname))
    return c.notFound();
  await next();
});
tests.post('/api/__component/sql', freshContext, sameOriginMutation, async (c) => {
  const { statements } = await c.req.json<{ statements: Statement[] }>();
  return c.json(
    await c.get('db').batch(
      statements.map(({ sql, args = [] }) =>
        c
          .get('db')
          .prepare(sql)
          .bind(...args),
      ),
    ),
  );
});
tests.post('/api/__component/race', sameOriginMutation, async (c) => {
  const { path, method, body, point, statements } = await c.req.json<{
    path: string;
    method: string;
    body: unknown;
    point: 'write' | 'response' | 'membership' | 'admin';
    statements: Statement[];
  }>();
  if (!/^\/api\/(circuits|simulator|admin\/components)(\/|$)/.test(path)) return c.notFound();
  const queries = new WeakMap<D1PreparedStatement, string>();
  let policyReads = 0;
  let fired = false;
  const original = c.env.DB;
  async function compete() {
    if (fired) return;
    fired = true;
    const db = original.withSession('first-primary');
    await db.batch(statements.map(({ sql, args = [] }) => db.prepare(sql).bind(...args)));
  }
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
                        if (name === 'run')
                          return async () => {
                            if (point === 'write' && /^(INSERT INTO|UPDATE) circuits/.test(sql))
                              await compete();
                            return statement.run();
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
                  const sql = batch.map((stmt) => queries.get(stmt) ?? '').join('\n');
                  if (sql.includes('SELECT revision FROM component_access_revision')) policyReads++;
                  if (
                    (point === 'response' && policyReads === 3) ||
                    (point === 'membership' && sql.includes('SELECT e.id, e.status')) ||
                    (point === 'admin' && sql.startsWith('UPDATE admin_revision'))
                  )
                    await compete();
                  return current.batch(batch);
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
  const response = await app.fetch(
    new Request(new URL(path, c.req.url), {
      method,
      headers: {
        Origin: new URL(c.req.url).origin,
        'Content-Type': 'application/json',
        Cookie: c.req.header('Cookie') ?? '',
      },
      body: JSON.stringify(body),
    }),
    { ...c.env, DB: db },
    c.executionCtx,
  );
  response.headers.set('X-Test-Race-Fired', String(fired));
  return response;
});
tests.get('/api/__component/boundary', async (c) => {
  const statuses = await Promise.all(
    ['/api/__component/sql', '/api/__component/race'].map(
      async (path) =>
        (
          await app.fetch(
            new Request(new URL(path, c.req.url), {
              method: 'POST',
              headers: { Origin: new URL(c.req.url).origin, 'Content-Type': 'application/json' },
              body: '{}',
            }),
            c.env,
            c.executionCtx,
          )
        ).status,
    ),
  );
  return c.json({ statuses });
});
tests.route('/', platformTests);
export default tests;
