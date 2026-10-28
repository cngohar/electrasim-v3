import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { profileSelect, type ProfileRow } from '../../community/profile-policy';
import { adminRegistry, validateCommunitySettings } from '../../platform/registry';
import type { ApiEnv } from '../context';

export async function profileRow(c: Context<ApiEnv>, id: string, byHandle = false) {
  return c
    .get('db')
    .prepare(`${profileSelect} WHERE ${byHandle ? 'handle' : 'user_id'}=?`)
    .bind(id)
    .first<ProfileRow>();
}
export async function communityPolicy(c: Context<ApiEnv>) {
  const [revision, settings] = await c
    .get('db')
    .batch<Record<string, unknown>>([
      c.get('db').prepare('SELECT version FROM admin_revision WHERE id=1'),
      c.get('db').prepare("SELECT values_json FROM admin_settings WHERE namespace='community'"),
    ]);
  const defaults = adminRegistry.byId.get('community')!.settings!.defaults;
  const values = validateCommunitySettings(
    settings.results[0] ? JSON.parse(String(settings.results[0].values_json)) : defaults,
  );
  return {
    version: Number(revision.results[0].version),
    values: values as {
      bannedWords: string[];
      autoHideThreshold: number;
      writesPerMinute: number;
      reportsPerDay: number;
      preModeration: boolean;
    },
  };
}
/** Rechecked inside the SQL mutation, after auth and all awaited validation/I/O. */
export function actorGuard(c: Context<ApiEnv>, now: number, community = true) {
  return {
    sql: `EXISTS(SELECT 1 FROM session WHERE id=? AND user_id=? AND expires_at>?)
      AND NOT EXISTS(SELECT 1 FROM account_controls WHERE user_id=? AND suspended=1 AND (ends_at IS NULL OR ends_at>?))
      ${community ? 'AND NOT EXISTS(SELECT 1 FROM community_restrictions WHERE user_id=? AND revoked_at IS NULL AND starts_at<=? AND (ends_at IS NULL OR ends_at>?))' : ''}`,
    args: [
      c.get('sessionId'),
      c.get('actor').id,
      now,
      c.get('actor').id,
      now,
      ...(community ? [c.get('actor').id, now, now] : []),
    ],
  };
}
export async function requireRow(c: Context<ApiEnv>, id = c.get('actor').id) {
  const row = await profileRow(c, id);
  if (!row) throw new HTTPException(404, { message: 'Profile unavailable' });
  return row;
}
/** A primary read after external I/O closes privacy/identity changes during it. */
export async function currentRow(c: Context<ApiEnv>, previous: ProfileRow) {
  c.set('db', c.env.DB.withSession('first-primary'));
  const row = await profileRow(c, previous.userId);
  if (!row || row.revision !== previous.revision || row.avatarKey !== previous.avatarKey)
    throw new HTTPException(404, { message: 'Profile unavailable' });
  return row;
}
export async function cleanAvatarGarbage(c: Context<ApiEnv>, userId: string) {
  const db = c.env.DB.withSession('first-primary');
  const rows = await db
    .prepare(`SELECT key FROM profile_avatar_garbage g WHERE user_id=? AND eligible_at<=?
    AND NOT EXISTS(SELECT 1 FROM profiles p WHERE p.avatar_key=g.key) ORDER BY eligible_at,key LIMIT 10`)
    .bind(userId, Date.now())
    .all<{ key: string }>();
  for (const { key } of rows.results) {
    try {
      // Keys are random and never reused. A committed/still-staged reference is checked before deletion.
      await c.env.R2.delete(key);
      await db
        .prepare(
          'DELETE FROM profile_avatar_garbage WHERE key=? AND NOT EXISTS(SELECT 1 FROM profiles WHERE avatar_key=?)',
        )
        .bind(key, key)
        .run();
    } catch {
      console.error(
        JSON.stringify({ event: 'profile_avatar_cleanup_pending', requestId: c.get('requestId') }),
      );
    }
  }
}
export function collectOldAvatar(
  c: Context<ApiEnv>,
  key: string | null,
  userId: string,
  mutation: string,
) {
  return c
    .get('db')
    .prepare(
      'INSERT INTO profile_avatar_garbage(key,user_id,eligible_at) SELECT ?,?,? WHERE ? IS NOT NULL AND EXISTS(SELECT 1 FROM profiles WHERE user_id=? AND mutation_id=?) ON CONFLICT(key) DO NOTHING',
    )
    .bind(key ?? '', userId, Date.now(), key, userId, mutation);
}
export const mutationProfileGuard =
  'EXISTS(SELECT 1 FROM profiles WHERE user_id=? AND mutation_id=?)';
