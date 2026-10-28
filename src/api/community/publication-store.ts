import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { type ProfileRow, profileSelect, publicProfile } from '../../community/profile-policy';
import {
  type Publication,
  publicationSelect,
  publicationSummary,
  visiblePublication,
} from '../../community/publication-policy';
import type { ApiEnv } from '../context';
import { actorGuard } from './store';

export async function ownerPublication(c: Context<ApiEnv>, id: string, mutation?: string) {
  c.set('db', c.env.DB.withSession('first-primary'));
  const actor = actorGuard(c, Date.now(), false);
  const row = await c
    .get('db')
    .prepare(
      `${publicationSelect} WHERE p.id=? AND p.owner_id=? AND (${actor.sql}) ${mutation ? 'AND p.mutation_id=?' : ''}`,
    )
    .bind(id, c.get('actor').id, ...actor.args, ...(mutation ? [mutation] : []))
    .first<Publication>();
  if (!row)
    throw new HTTPException(mutation ? 409 : 404, {
      message: 'Publication unavailable or changed; reload before retrying',
    });
  return row;
}
export async function publicPublication(c: Context<ApiEnv>, slug: string) {
  if (slug.length > 100 || !/^[a-z0-9-]+$/.test(slug))
    throw new HTTPException(404, { message: 'Publication unavailable' });
  return c
    .get('db')
    .prepare(`${publicationSelect} WHERE p.slug=? AND ${visiblePublication}`)
    .bind(slug)
    .first<Publication>();
}
export async function requirePublicPublication(c: Context<ApiEnv>, slug: string) {
  const row = await publicPublication(c, slug);
  if (!row) throw new HTTPException(404, { message: 'Publication unavailable' });
  return row;
}
export async function recheckPublication(c: Context<ApiEnv>, p: Publication) {
  c.set('db', c.env.DB.withSession('first-primary'));
  const current = await publicPublication(c, p.slug);
  if (!current || current.revision !== p.revision)
    throw new HTTPException(404, { message: 'Publication unavailable' });
}
export async function publicAttribution(c: Context<ApiEnv>, p: Publication) {
  // Identity privacy is independent of publication visibility. No fallback to auth name/email.
  c.set('db', c.env.DB.withSession('first-primary'));
  const author = await c
    .get('db')
    .prepare(
      `SELECT a.handle,COALESCE(a.display_name,'Community member') AS displayName FROM publications p LEFT JOIN profiles a ON a.user_id=p.owner_id AND a.profile_visibility='public' AND a.moderation='visible' AND a.handle IS NOT NULL WHERE p.id=? AND p.revision=? AND ${visiblePublication}`,
    )
    .bind(p.id, p.revision)
    .first<{ handle: string | null; displayName: string }>();
  if (!author) throw new HTTPException(404, { message: 'Publication unavailable' });
  return author;
}
export async function profilePublications(
  c: Context<ApiEnv>,
  ownerId: string,
  before?: number,
  beforeId = '',
  limit = 20,
) {
  c.set('db', c.env.DB.withSession('first-primary'));
  const db = c.get('db');
  const [identity, rows] = await db.batch<Record<string, unknown>>([
    db.prepare(`${profileSelect} WHERE user_id=?`).bind(ownerId),
    db
      .prepare(
        `${publicationSelect} WHERE p.owner_id=? AND ${visiblePublication} AND (? IS NULL OR p.published_at<? OR (p.published_at=? AND p.id<?)) ORDER BY p.published_at DESC,p.id DESC LIMIT ?`,
      )
      .bind(ownerId, before ?? null, before ?? null, before ?? null, beforeId, limit + 1),
  ]);
  const profile = identity.results[0] as ProfileRow | undefined;
  if (!publicProfile(profile ?? null))
    throw new HTTPException(404, { message: 'Profile unavailable' });
  const items = (rows.results as Publication[]).slice(0, limit);
  const last = items.at(-1);
  return {
    items: items.map((p) => publicationSummary(p)),
    nextCursor: rows.results.length > limit && last ? `${last.publishedAt}:${last.id}` : null,
    profileRevision: profile!.revision,
  };
}
