import type { Context } from 'hono';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import {
  LEARNING_LEVELS,
  type ProfileRow,
  REPORT_REASONS,
  handleProblem,
  ownerProfile,
  profileSelect,
  publicProfile,
} from '../../community/profile-policy';
import { type ApiEnv, freshContext, requireSession, sameOriginMutation } from '../context';
import { boolean, integer, invalid, keys, object, string } from '../membership-validation';
import { requireCommunityWrite } from '../platform/restrictions';
import { MAX_AVATAR_BYTES, validateAvatar } from './avatar';
import { profilePublications } from './publication-store';
import {
  actorGuard,
  cleanAvatarGarbage,
  collectOldAvatar,
  communityPolicy,
  currentRow,
  mutationProfileGuard,
  profileRow,
  requireRow,
} from './store';

export const profilesApi = new Hono<ApiEnv>();
for (const path of ['/me/profile', '/me/avatar', '/community/users/*'])
  profilesApi.use(path, freshContext);
profilesApi.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error(JSON.stringify({ event: 'profile_request_failed', requestId: c.get('requestId') }));
  return c.json({ error: 'Profiles unavailable; try again' }, 503);
});
for (const path of ['/me/profile', '/me/avatar']) profilesApi.use(path, requireSession);
profilesApi.use('/community/users/:handle/reports', requireSession);
const originOnly = async (c: Context<ApiEnv>, next: () => Promise<void>) => {
  if (
    !['GET', 'HEAD'].includes(c.req.method) &&
    (c.req.header('Origin') !== new URL(c.env.BETTER_AUTH_URL ?? c.req.url).origin ||
      c.req.header('Sec-Fetch-Site') === 'cross-site')
  )
    throw new HTTPException(403, { message: 'Same-origin request required' });
  await next();
};
profilesApi.use('/me/profile', sameOriginMutation, bodyLimit({ maxSize: 8192 }));
profilesApi.use('/me/avatar', originOnly, bodyLimit({ maxSize: MAX_AVATAR_BYTES }));
profilesApi.use(
  '/community/users/:handle/reports',
  sameOriginMutation,
  bodyLimit({ maxSize: 4096 }),
);
async function json(c: Context<ApiEnv>, fields: string[]) {
  let value: unknown;
  try {
    value = await c.req.json();
  } catch {
    invalid('Invalid JSON');
  }
  const input = object(value);
  keys(input, fields);
  return input;
}
export async function visibleProfile(c: Context<ApiEnv>, handle: string) {
  if (handleProblem(handle)) throw new HTTPException(404, { message: 'Profile unavailable' });
  const row = await profileRow(c, handle, true);
  if (!publicProfile(row)) throw new HTTPException(404, { message: 'Profile unavailable' });
  const current = await currentRow(c, row!);
  if (!publicProfile(current)) throw new HTTPException(404, { message: 'Profile unavailable' });
  return current;
}
async function privateRow(c: Context<ApiEnv>) {
  // A single primary statement binds the returned row to the current live session,
  // including reads after an avatar binding operation or a committed mutation.
  c.set('db', c.env.DB.withSession('first-primary'));
  const guard = actorGuard(c, Date.now(), false);
  const row = await c
    .get('db')
    .prepare(`${profileSelect} WHERE user_id=? AND (${guard.sql})`)
    .bind(c.get('actor').id, ...guard.args)
    .first<ProfileRow>();
  if (!row) throw new HTTPException(401, { message: 'Your session expired; sign in again' });
  return row;
}
profilesApi.get('/me/profile', async (c) => c.json({ profile: ownerProfile(await privateRow(c)) }));
profilesApi.get('/community/users/:handle', async (c) =>
  c.json({ profile: publicProfile(await visibleProfile(c, c.req.param('handle'))) }),
);
profilesApi.get('/community/users/:handle/publications', async (c) => {
  const profile = await visibleProfile(c, c.req.param('handle'));
  const query = c.req.query();
  keys(query, ['cursor', 'limit']);
  const limit = integer(Number(query.limit ?? 20), 'limit', 1, 100);
  const match = query.cursor ? /^(\d+):([a-zA-Z0-9-]{1,200})$/.exec(query.cursor) : null;
  if (query.cursor && !match) invalid('Invalid cursor');
  const before = match ? integer(Number(match[1]), 'cursor', 0) : undefined;
  const result = await profilePublications(c, profile.userId, before, match?.[2], limit);
  return c.json({ items: result.items, nextCursor: result.nextCursor });
});

/** Claim both the profile revision and current policy/session/limits in the write.
 * Follow-up quota/cleanup/audit statements belong only to this unique mutation.
 */
async function ownerChange(
  c: Context<ApiEnv>,
  before: ProfileRow,
  revision: number,
  values: {
    displayName?: string;
    handle?: string;
    bio?: string;
    institution?: string;
    level?: string;
    visibility?: string;
    showInstitution?: boolean;
    showLevel?: boolean;
    allowForks?: boolean;
    avatarKey?: string | null;
  },
) {
  if (revision !== before.revision)
    throw new HTTPException(409, { message: 'Profile changed; reload before reviewing again' });
  const policy = await communityPolicy(c);
  const next = { ...ownerProfile(before), ...values };
  const banned =
    next.visibility === 'public' &&
    policy.values.bannedWords.some((word) =>
      [
        next.displayName,
        next.bio,
        next.showInstitution ? next.institution : '',
        next.showLevel ? next.level : '',
      ]
        .join('\n')
        .toLowerCase()
        .includes(word),
    );
  const moderation = before.moderation === 'visible' && banned ? 'hidden' : before.moderation;
  const now = Date.now();
  const window = Math.floor(now / 60000) * 60000;
  const actor = actorGuard(c, now);
  const mutation = crypto.randomUUID();
  const db = c.get('db');
  const setters: Record<string, unknown> = {
    display_name: next.displayName,
    handle: next.handle,
    bio: next.bio,
    institution: next.institution,
    level: next.level,
    profile_visibility: next.visibility,
    show_institution: Number(next.showInstitution),
    show_level: Number(next.showLevel),
    allow_forks: Number(next.allowForks),
    moderation,
    avatar_key: values.avatarKey === undefined ? before.avatarKey : values.avatarKey,
    updated_at: now,
    mutation_id: mutation,
  };
  const statements = [
    db
      .prepare(`UPDATE profiles SET ${Object.keys(setters)
        .map((key) => `${key}=?`)
        .join(',')},revision=revision+1 WHERE user_id=? AND revision=? AND revision<9007199254740991
    AND (SELECT version FROM admin_revision WHERE id=1)=? AND (${actor.sql})
    AND NOT EXISTS(SELECT 1 FROM profile_write_windows WHERE user_id=? AND window_start=? AND writes>=?)`)
      .bind(
        ...Object.values(setters),
        before.userId,
        revision,
        policy.version,
        ...actor.args,
        before.userId,
        window,
        policy.values.writesPerMinute,
      ),
    db
      .prepare(`INSERT INTO profile_write_windows(user_id,window_start,writes) SELECT ?,?,1 WHERE ${mutationProfileGuard}
    ON CONFLICT(user_id) DO UPDATE SET window_start=excluded.window_start,writes=CASE WHEN window_start=excluded.window_start THEN writes+1 ELSE 1 END`)
      .bind(before.userId, window, before.userId, mutation),
  ];
  if (values.avatarKey !== undefined) {
    statements.push(collectOldAvatar(c, before.avatarKey, before.userId, mutation));
    if (values.avatarKey)
      statements.push(
        db
          .prepare(`DELETE FROM profile_avatar_garbage WHERE key=? AND ${mutationProfileGuard}`)
          .bind(values.avatarKey, before.userId, mutation),
      );
  }
  if (moderation !== before.moderation)
    statements.push(
      db
        .prepare(`INSERT INTO admin_audit(id,namespace,actor_id,action,target_type,target_id,before_json,after_json,reason,request_id,created_at,version)
    SELECT ?,'community','system:profile-policy','community.profiles.auto-hide','profile',?, ?,?,'Configured profile text policy',?,?,? WHERE ${mutationProfileGuard}`)
        .bind(
          mutation,
          before.userId,
          JSON.stringify({ moderation: before.moderation, revision }),
          JSON.stringify({ moderation, revision: revision + 1 }),
          c.get('requestId'),
          now,
          policy.version,
          before.userId,
          mutation,
        ),
    );
  let results: Awaited<ReturnType<typeof db.batch>>;
  try {
    results = await db.batch(statements);
  } catch (error) {
    if (String(error).includes('UNIQUE constraint failed: profiles.handle'))
      throw new HTTPException(409, { message: 'This handle is already claimed. Choose another.' });
    throw error;
  }
  if (results[0].meta.changes !== 1) {
    const rate = await db
      .prepare('SELECT writes FROM profile_write_windows WHERE user_id=? AND window_start=?')
      .bind(before.userId, window)
      .first<{ writes: number }>();
    if (rate && rate.writes >= policy.values.writesPerMinute)
      throw new HTTPException(429, { message: 'Too many profile changes. Try again in a minute.' });
    throw new HTTPException(409, {
      message: 'Profile, access or policy changed; reload before reviewing again',
    });
  }
  const committed = await privateRow(c);
  if (committed.revision !== revision + 1 || committed.mutationId !== mutation) {
    throw new HTTPException(409, {
      message: 'Profile changed after this save. Reload the current profile before editing again.',
    });
  }
  return ownerProfile(committed);
}
profilesApi.patch('/me/profile', requireCommunityWrite, async (c) => {
  const input = await json(c, [
    'revision',
    'displayName',
    'handle',
    'bio',
    'institution',
    'level',
    'visibility',
    'showInstitution',
    'showLevel',
    'allowForks',
  ]);
  const revision = integer(input.revision, 'revision', 1, Number.MAX_SAFE_INTEGER - 1);
  const before = await requireRow(c);
  const handle = string(input.handle, 'handle', 24);
  const problem = handleProblem(handle);
  if (problem) invalid(problem);
  if (before.handle && before.handle !== handle)
    throw new HTTPException(409, {
      message: 'Your handle is already claimed and cannot be changed.',
    });
  if (input.visibility !== 'public' && input.visibility !== 'private')
    invalid('Invalid profile visibility');
  const level = string(input.level, 'level', 80, true);
  if (!(LEARNING_LEVELS as readonly string[]).includes(level)) invalid('Invalid learning level');
  return c.json({
    profile: await ownerChange(c, before, revision, {
      displayName: string(input.displayName, 'displayName', 60),
      handle,
      bio: string(input.bio, 'bio', 280, true),
      institution: string(input.institution, 'institution', 100, true),
      level,
      visibility: input.visibility,
      showInstitution: boolean(input.showInstitution, 'showInstitution'),
      showLevel: boolean(input.showLevel, 'showLevel'),
      allowForks: boolean(input.allowForks, 'allowForks'),
    }),
  });
});
profilesApi.post('/me/avatar', requireCommunityWrite, async (c) => {
  const type = c.req.header('Content-Type')?.split(';')[0].trim();
  if (!type || !['image/png', 'image/jpeg', 'image/webp'].includes(type))
    throw new HTTPException(415, { message: 'JPG, PNG or WebP image required' });
  const raw = c.req.header('X-Profile-Revision');
  if (!raw || !/^[1-9]\d*$/.test(raw)) invalid('Profile revision required');
  const revision = integer(Number(raw), 'revision', 1, Number.MAX_SAFE_INTEGER - 1);
  const before = await requireRow(c);
  if (revision !== before.revision)
    throw new HTTPException(409, { message: 'Profile changed; reload before uploading' });
  const uploadPolicy = await communityPolicy(c);
  const windowStart = Math.floor(Date.now() / 60000) * 60000;
  const quota = await c
    .get('db')
    .prepare('SELECT writes FROM profile_write_windows WHERE user_id=? AND window_start=?')
    .bind(before.userId, windowStart)
    .first<{ writes: number }>();
  if (quota && quota.writes >= uploadPolicy.values.writesPerMinute)
    throw new HTTPException(429, { message: 'Too many profile changes. Try again in a minute.' });
  const image = await validateAvatar(await c.req.arrayBuffer(), type);
  await cleanAvatarGarbage(c, before.userId);
  const key = `profile-avatars/${crypto.randomUUID()}`;
  const guard = actorGuard(c, Date.now());
  const stage = await c
    .get('db')
    .prepare(
      `INSERT INTO profile_avatar_garbage(key,user_id,eligible_at) SELECT ?,?,? WHERE (${guard.sql})`,
    )
    .bind(key, before.userId, Date.now() + 3600000, ...guard.args)
    .run();
  if (stage.meta.changes !== 1)
    throw new HTTPException(401, { message: 'Your session or access changed; sign in again' });
  try {
    await c.env.R2.put(key, image.bytes, {
      httpMetadata: { contentType: image.type, cacheControl: 'private, no-store' },
    });
    const profile = await ownerChange(c, before, revision, { avatarKey: key });
    await cleanAvatarGarbage(c, before.userId);
    return c.json({ profile });
  } catch (error) {
    await c
      .get('db')
      .prepare('UPDATE profile_avatar_garbage SET eligible_at=0 WHERE key=?')
      .bind(key)
      .run();
    await cleanAvatarGarbage(c, before.userId);
    throw error;
  }
});
profilesApi.delete('/me/avatar', sameOriginMutation, requireCommunityWrite, async (c) => {
  const input = await json(c, ['revision']);
  const before = await requireRow(c);
  const profile = await ownerChange(
    c,
    before,
    integer(input.revision, 'revision', 1, Number.MAX_SAFE_INTEGER - 1),
    { avatarKey: null },
  );
  await cleanAvatarGarbage(c, before.userId);
  return c.json({ profile });
});
export async function avatarResponse(
  c: Context<ApiEnv>,
  before: ProfileRow,
  scope: 'public' | 'owner' | 'staff',
  authorize?: () => Promise<void>,
) {
  if (!before.avatarKey) throw new HTTPException(404, { message: 'Avatar unavailable' });
  const object = await c.env.R2.get(before.avatarKey);
  if (!object) throw new HTTPException(404, { message: 'Avatar unavailable' });
  let current: ProfileRow;
  try {
    if (authorize) await authorize();
    current = await currentRow(c, before);
    if (scope === 'owner') await privateRow(c);
  } catch (error) {
    await object.body.cancel();
    throw error;
  }
  if (scope === 'public' && !publicProfile(current)) {
    await object.body.cancel();
    throw new HTTPException(404, { message: 'Avatar unavailable' });
  }
  // Do not honor conditional/range reads: every request rechecks primary visibility.
  const reader = object.body.getReader();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const chunk = await reader.read();
      if (chunk.done) controller.close();
      else controller.enqueue(chunk.value);
    },
    cancel(reason) {
      return reader.cancel(reason);
    },
  });
  return new Response(stream, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    },
  });
}
profilesApi.get('/community/users/:handle/avatar', async (c) =>
  avatarResponse(c, await visibleProfile(c, c.req.param('handle')), 'public'),
);
profilesApi.get('/me/avatar', async (c) => avatarResponse(c, await privateRow(c), 'owner'));
profilesApi.post('/community/users/:handle/reports', requireCommunityWrite, async (c) => {
  const input = await json(c, ['reason', 'details']);
  const reason = string(input.reason, 'reason', 80);
  const details = string(input.details, 'details', 500);
  if (!(REPORT_REASONS as readonly string[]).includes(reason)) invalid('Invalid report reason');
  const target = await visibleProfile(c, c.req.param('handle'));
  const actor = c.get('actor').id;
  if (target.userId === actor)
    throw new HTTPException(403, { message: 'You cannot report your own profile' });
  const duplicate = await c
    .get('db')
    .prepare('SELECT id FROM profile_reports WHERE reporter_id=? AND target_user_id=?')
    .bind(actor, target.userId)
    .first();
  if (duplicate) return c.json({ ok: true, duplicate: true });
  const policy = await communityPolicy(c);
  const now = Date.now();
  const id = crypto.randomUUID();
  const guard = actorGuard(c, now);
  const db = c.get('db');
  const result = await db.batch([
    db
      .prepare(`INSERT INTO profile_reports(id,reporter_id,target_user_id,reason,details,created_at,updated_at)
      SELECT ?,?,?,?,?,?,? WHERE (SELECT version FROM admin_revision WHERE id=1)=? AND (${guard.sql})
      AND EXISTS(SELECT 1 FROM profiles WHERE user_id=? AND revision=? AND profile_visibility='public' AND moderation='visible')
      AND (SELECT COUNT(*) FROM profile_reports WHERE reporter_id=? AND created_at>?)+(SELECT COUNT(*) FROM publication_reports WHERE reporter_id=? AND created_at>?)<?
      ON CONFLICT(reporter_id,target_user_id) DO NOTHING`)
      .bind(
        id,
        actor,
        target.userId,
        reason,
        details,
        now,
        now,
        policy.version,
        ...guard.args,
        target.userId,
        target.revision,
        actor,
        now - 86400000,
        actor,
        now - 86400000,
        policy.values.reportsPerDay,
      ),
    db
      .prepare(`UPDATE profiles SET moderation='hidden',revision=revision+1,mutation_id=?,updated_at=? WHERE user_id=? AND revision=? AND moderation='visible'
      AND EXISTS(SELECT 1 FROM profile_reports WHERE id=?) AND (SELECT COUNT(DISTINCT r.reporter_id) FROM profile_reports r
      WHERE r.target_user_id=? AND r.status='open' AND NOT EXISTS(SELECT 1 FROM account_controls a WHERE a.user_id=r.reporter_id AND a.suspended=1 AND (a.ends_at IS NULL OR a.ends_at>?))
      AND NOT EXISTS(SELECT 1 FROM community_restrictions x WHERE x.user_id=r.reporter_id AND x.revoked_at IS NULL AND x.starts_at<=? AND (x.ends_at IS NULL OR x.ends_at>?)))>=?`)
      .bind(
        id,
        now,
        target.userId,
        target.revision,
        id,
        target.userId,
        now,
        now,
        now,
        policy.values.autoHideThreshold,
      ),
    db
      .prepare(`INSERT INTO admin_audit(id,namespace,actor_id,action,target_type,target_id,before_json,after_json,reason,request_id,created_at,version)
      SELECT ?,'community','system:profile-policy','community.profiles.auto-hide','profile',?,?,?,'Distinct eligible profile reports reached the configured threshold',?,?,? WHERE ${mutationProfileGuard}`)
      .bind(
        id,
        target.userId,
        JSON.stringify({ moderation: 'visible', revision: target.revision }),
        JSON.stringify({ moderation: 'hidden', revision: target.revision + 1 }),
        c.get('requestId'),
        now,
        policy.version,
        target.userId,
        id,
      ),
  ]);
  if (result[0].meta.changes !== 1) {
    const [existing, count] = await db.batch<Record<string, unknown>>([
      db
        .prepare('SELECT id FROM profile_reports WHERE reporter_id=? AND target_user_id=?')
        .bind(actor, target.userId),
      db
        .prepare(
          'SELECT (SELECT COUNT(*) FROM profile_reports WHERE reporter_id=? AND created_at>?)+(SELECT COUNT(*) FROM publication_reports WHERE reporter_id=? AND created_at>?) AS total',
        )
        .bind(actor, now - 86400000, actor, now - 86400000),
    ]);
    if (existing.results.length) return c.json({ ok: true, duplicate: true });
    if (Number(count.results[0].total) >= policy.values.reportsPerDay)
      throw new HTTPException(429, { message: 'Report limit reached. Try again later.' });
    throw new HTTPException(409, { message: 'Profile or access changed; reload before reporting' });
  }
  return c.json({ ok: true, duplicate: false }, 201);
});
