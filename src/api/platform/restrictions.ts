import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ApiEnv } from '../context';

export async function currentCommunityRestriction(c: Parameters<MiddlewareHandler<ApiEnv>>[0]) {
  return c
    .get('db')
    .prepare(`SELECT id, reason, starts_at AS startsAt, ends_at AS endsAt FROM community_restrictions
    WHERE user_id = ? AND revoked_at IS NULL AND starts_at <= ? AND (ends_at IS NULL OR ends_at > ?) ORDER BY starts_at DESC, id DESC LIMIT 1`)
    .bind(c.get('actor').id, Date.now(), Date.now())
    .first();
}
/** Public community writes opt into this guard; owner-private circuit work does not. */
export const requireCommunityWrite: MiddlewareHandler<ApiEnv> = async (c, next) => {
  if (await currentCommunityRestriction(c))
    throw new HTTPException(403, { message: 'Community writes restricted' });
  await next();
};
