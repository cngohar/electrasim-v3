/** Test entrypoint only: production src/worker.ts never imports this module.
 * All browser fixtures share the serving Worker's D1 instance, avoiding locks
 * from multiple workerd processes opening the same local SQLite database.
 */
import { Hono } from 'hono';
import { type ApiEnv, freshContext, requireSession, sameOriginMutation } from '../src/api/context';
import app from '../src/worker';

const browserTests = new Hono<ApiEnv>();
browserTests.post(
  '/api/__test/paid-membership',
  async (c, next) => {
    if (c.env.ENV !== 'local' || !['127.0.0.1', 'localhost'].includes(new URL(c.req.url).hostname))
      return c.notFound();
    await next();
  },
  freshContext,
  sameOriginMutation,
  requireSession,
  async (c) => {
    const id = crypto.randomUUID();
    const userId = c.get('actor').id;
    const now = Date.now();
    const db = c.get('db');
    await db.batch([
      db
        .prepare(
          "INSERT INTO plans (id,slug,name,description,no_expiry,status,mutation_id,created_at,updated_at,created_by,updated_by) VALUES (?,?,?, '',1,'active',?,?,?,?,?)",
        )
        .bind(id, id, 'Local browser fixture', id, now, now, userId, userId),
      ...['pro_components', 'advanced_faults', 'advanced_diagnostics'].map((key) =>
        db
          .prepare(
            "INSERT INTO plan_features (plan_id,feature_key,enabled,config) VALUES (?,?,1,'{}')",
          )
          .bind(id, key),
      ),
      db
        .prepare(
          "INSERT INTO entitlements (id,user_id,plan_id,status,starts_at,no_expiry,reason,mutation_id,created_at,updated_at,created_by,updated_by) VALUES (?,?,?,'active',?,1,'Local browser fixture',?,?,?,?,?)",
        )
        .bind(id, userId, id, now - 1000, id, now, now, userId, userId),
    ]);
    return c.json({ id }, 201);
  },
);
browserTests.route('/', app);
export default browserTests;
