import type { D1Database, D1DatabaseSession } from '@cloudflare/workers-types';
import type { GlobalRole } from '@electrasim/access';
import type { Context, MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { createAuth } from '../../packages/db/auth';

export type WorkerEnv = {
  DB: D1Database;
  KV: unknown;
  R2: unknown;
  QUEUE: unknown;
  PRESENCE: unknown;
  ENV: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
};
export type ApiEnv = {
  Bindings: WorkerEnv;
  Variables: {
    db: D1DatabaseSession;
    actor: { id: string; globalRole: GlobalRole };
    requestId: string;
  };
};
export function requestAuth(c: Context<ApiEnv>) {
  if (c.env.ENV !== 'local' && (!c.env.BETTER_AUTH_SECRET || !c.env.BETTER_AUTH_URL)) {
    throw new HTTPException(503, { message: 'Authentication is not configured' });
  }
  return createAuth(c.env.DB, {
    baseURL: c.env.BETTER_AUTH_URL ?? new URL(c.req.url).origin,
    secret:
      c.env.BETTER_AUTH_SECRET ?? 'local-dev-secret-please-set-BETTER_AUTH_SECRET-in-wrangler',
  });
}
export const freshContext: MiddlewareHandler<ApiEnv> = async (c, next) => {
  c.set('db', c.env.DB.withSession('first-primary'));
  c.set('requestId', crypto.randomUUID());
  c.header('Cache-Control', 'private, no-store');
  c.header('X-Request-Id', c.get('requestId'));
  await next();
};
export const requireSession: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const session = await requestAuth(c).api.getSession({
    headers: c.req.raw.headers,
    query: { disableCookieCache: true },
  });
  if (!session) throw new HTTPException(401, { message: 'Authentication required' });
  // Roles are read from primary D1, never trusted from cookies or request input.
  const actor = await c
    .get('db')
    .prepare('SELECT id, global_role AS globalRole FROM user WHERE id = ?')
    .bind(session.user.id)
    .first<{ id: string; globalRole: GlobalRole }>();
  if (!actor) throw new HTTPException(401, { message: 'Authentication required' });
  c.set('actor', actor);
  await next();
};
export const requireSuperAdmin: MiddlewareHandler<ApiEnv> = async (c, next) => {
  if (c.get('actor').globalRole !== 'super_admin')
    throw new HTTPException(403, { message: 'Super admin required' });
  await next();
};
export const sameOriginMutation: MiddlewareHandler<ApiEnv> = async (c, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
    const origin = new URL(c.env.BETTER_AUTH_URL ?? c.req.url).origin;
    if (c.req.header('Origin') !== origin || c.req.header('Sec-Fetch-Site') === 'cross-site') {
      throw new HTTPException(403, { message: 'Same-origin request required' });
    }
    if (c.req.header('Content-Type')?.split(';')[0].trim() !== 'application/json') {
      throw new HTTPException(415, { message: 'JSON body required' });
    }
  }
  await next();
};
