/** Isolated 2.0 fixtures. Never imported by the application Worker. */
import type { MessageBatch } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { html } from 'hono/html';
import { HTTPException } from 'hono/http-exception';
import {
  type ApiEnv,
  freshContext,
  requireSession,
  requireSuperAdmin,
  sameOriginMutation,
} from '../src/api/context';
import app from '../src/worker';
import type { Phase20Bindings } from './fixtures/phase20/env';
export { PresenceRoom } from '../src/worker';

type SpikeEnv = Omit<ApiEnv, 'Bindings'> & { Bindings: Phase20Bindings };
const spike = new Hono<SpikeEnv>();
spike.use('*', async (c, next) => {
  if (c.env.ENV !== 'local' || !['127.0.0.1', 'localhost'].includes(new URL(c.req.url).hostname))
    return c.notFound();
  await next();
});
// Mount FIRST: fixtures must prove that membership middleware does not capture
// later platform modules, rather than merely bypassing it by registration order.
spike.route('/', app);
spike.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error('Phase 2.0 fixture failed', error);
  return c.json({ error: 'Spike unavailable' }, 503);
});

const staff = new Hono<SpikeEnv>();
staff.use('*', freshContext, requireSession);
staff.get('/access', (c) => {
  const role = c.get('actor').globalRole;
  if (!['moderator', 'admin', 'super_admin'].includes(role))
    throw new HTTPException(403, { message: 'Staff required' });
  return c.json({ fixture: true, role });
});
staff.post('/security-fixture', requireSuperAdmin, sameOriginMutation, (c) =>
  c.json({ fixture: true }),
);
spike.route('/api/admin', staff);

spike.post(
  '/api/__phase20/role',
  freshContext,
  requireSession,
  sameOriginMutation,
  bodyLimit({ maxSize: 1024 }),
  async (c) => {
    const { role } = await c.req.json<{ role: string }>();
    if (!['individual', 'moderator', 'admin', 'super_admin'].includes(role))
      return c.json({ error: 'Invalid fixture role' }, 400);
    await c
      .get('db')
      .prepare('UPDATE user SET global_role = ? WHERE id = ?')
      .bind(role, c.get('actor').id)
      .run();
    return c.json({ fixture: true });
  },
);

// Hono's html tag encodes interpolated strings. No editor import, inline script,
// cookie-dependent markup or production canonical URL belongs in spike HTML.
for (const route of [
  '/explore',
  '/explore/',
  '/feed',
  '/feed/',
  '/__phase20/c/:slug',
  '/__phase20/u/:handle',
  '/collections/:slug',
]) {
  spike.get(route, (c) => {
    c.header(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'none'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    );
    c.header('Cache-Control', 'private, no-store');
    c.header('X-Robots-Tag', 'noindex, nofollow');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    return c.html(
      html`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Community routing fixture</title></head><body><main><h1>Phase 2.0 fixture</h1><p>${c.req.param('slug') ?? c.req.param('handle') ?? 'Discovery'}</p></main></body></html>`,
    );
  });
}

spike.post('/api/__phase20/infrastructure', sameOriginMutation, async (c) => {
  const db = c.env.DB.withSession('first-primary');
  await db
    .prepare('CREATE VIRTUAL TABLE IF NOT EXISTS phase20_fts USING fts5(id UNINDEXED, title)')
    .run();
  await db.batch([
    db.prepare('DELETE FROM phase20_fts'),
    db.prepare('INSERT INTO phase20_fts (id, title) VALUES (?, ?)').bind('fixture', 'Relay safety'),
  ]);
  const matches = await db
    .prepare('SELECT id FROM phase20_fts WHERE phase20_fts MATCH ?')
    .bind('relay')
    .all();
  const plan = await db
    .prepare('EXPLAIN QUERY PLAN SELECT id FROM phase20_fts WHERE phase20_fts MATCH ?')
    .bind('relay')
    .all();
  const key = `phase20/${crypto.randomUUID()}`;
  await c.env.R2.put(key, 'local R2 fixture', { httpMetadata: { contentType: 'text/plain' } });
  const object = await c.env.R2.get(key);
  const r2 = await object?.text();
  await c.env.R2.delete(key);
  await c.env.KV.put(key, 'local KV fixture');
  const kv = await c.env.KV.get(key);
  await c.env.KV.delete(key);
  await c.env.QUEUE.send({ key });
  return c.json({ matches: matches.results, plan: plan.results, r2, kv, key });
});
spike.get('/api/__phase20/queue', async (c) => {
  const key = c.req.query('key') ?? '';
  if (!/^phase20\/[0-9a-f-]{36}$/.test(key)) return c.json({ error: 'Invalid key' }, 400);
  return c.json({ delivered: await c.env.KV.get(`delivered/${key}`) });
});

// Preserve the app's normal 404: never fall through to a static marketing shell
// for a Worker-owned API or community route.
export default {
  fetch: spike.fetch,
  async queue(batch: MessageBatch<{ key: string }>, env: Phase20Bindings) {
    for (const message of batch.messages) {
      await env.KV.put(`delivered/${message.body.key}`, 'consumed');
      message.ack();
    }
  },
};
