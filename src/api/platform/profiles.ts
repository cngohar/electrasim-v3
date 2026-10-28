import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ProfileRow } from '../../community/profile-policy';
import type { AdminRegistry } from '../../platform/registry';
import { avatarResponse } from '../community/profiles';
import { actorGuard, cleanAvatarGarbage, requireRow } from '../community/store';
import type { ApiEnv } from '../context';
import { integer, invalid, keys, pagination, string } from '../membership-validation';
import { adminAccess, adminSnapshot } from './access';
import { adminInput } from './input';
import { commitAdminChange, mutationGuard } from './mutation';
function staffProfile(row: ProfileRow) {
  return {
    userId: row.userId,
    handle: row.handle,
    displayName: row.displayName,
    bio: row.bio,
    visibility: row.visibility,
    moderation: row.moderation,
    revision: row.revision,
    updatedAt: row.updatedAt,
    avatarUrl: row.avatarKey
      ? `/api/admin/community/profiles/${encodeURIComponent(row.userId)}/avatar?revision=${row.revision}`
      : null,
  };
}
export function registerProfiles(api: Hono<ApiEnv>, registry: AdminRegistry) {
  api.get('/community/profiles', async (c) => {
    const access = await adminAccess(c, 'community.profiles.read', registry);
    const query = c.req.query();
    keys(query, ['q', 'moderation', 'limit', 'offset']);
    const { limit, offset } = pagination({ ...query, limit: query.limit ?? '20' });
    integer(offset, 'offset', 0, 10000);
    const q = string(query.q ?? '', 'q', 100, true).toLowerCase();
    const state = query.moderation ?? 'all';
    if (!['all', 'visible', 'hidden', 'removed'].includes(state))
      invalid('Invalid profile moderation filter');
    const conditions = ['1=1'];
    const args: unknown[] = [];
    if (q) {
      conditions.push(
        '(handle>=? AND handle<? OR lower(display_name)>=? AND lower(display_name)<?)',
      );
      args.push(q, `${q}\uffff`, q, `${q}\uffff`);
    }
    if (state !== 'all') {
      conditions.push('moderation=?');
      args.push(state);
    }
    const where = conditions.join(' AND ');
    const db = c.get('db');
    const [rows, total] = await adminSnapshot(c, access, [
      db
        .prepare(
          `SELECT user_id AS userId,handle,display_name AS displayName,profile_visibility AS visibility,moderation,revision,updated_at AS updatedAt FROM profiles WHERE ${where} ORDER BY updated_at DESC,user_id LIMIT ? OFFSET ?`,
        )
        .bind(...args, limit, offset),
      db.prepare(`SELECT COUNT(*) AS total FROM profiles WHERE ${where}`).bind(...args),
    ]);
    return c.json({
      version: access.version,
      items: rows.results,
      total: total.results[0].total,
      limit,
      offset,
    });
  });
  api.get('/community/profiles/:id', async (c) => {
    const access = await adminAccess(c, 'community.profiles.read', registry);
    const row = await requireRow(c, string(c.req.param('id'), 'profile ID', 200));
    const canReports = access.permissions.includes('community.reports.read');
    const canAudit = access.permissions.includes('community.audit.read');
    const [reports, history] = await adminSnapshot(c, access, [
      c
        .get('db')
        .prepare(
          'SELECT id,reason,details,status,revision,resolution,created_at AS createdAt FROM profile_reports WHERE target_user_id=? AND ? ORDER BY created_at DESC,id DESC LIMIT 30',
        )
        .bind(row.userId, Number(canReports)),
      c
        .get('db')
        .prepare(
          `SELECT id,action,reason,created_at AS createdAt FROM admin_audit WHERE namespace='community' AND target_type='profile' AND target_id=? AND ? ORDER BY created_at DESC,id DESC LIMIT 20`,
        )
        .bind(row.userId, Number(canAudit)),
    ]);
    return c.json({
      version: access.version,
      profile: staffProfile(row),
      reports: reports.results,
      history: history.results,
    });
  });
  api.get('/community/reports', async (c) => {
    const access = await adminAccess(c, 'community.reports.read', registry);
    const query = c.req.query();
    keys(query, ['status', 'limit', 'offset']);
    const state = query.status ?? 'open';
    if (!['open', 'resolved', 'dismissed', 'all'].includes(state)) invalid('Invalid report status');
    const { limit, offset } = pagination({ ...query, limit: query.limit ?? '20' });
    integer(offset, 'offset', 0, 10000);
    const [rows, total] = await adminSnapshot(c, access, [
      c
        .get('db')
        .prepare(
          `SELECT r.id,r.target_user_id AS targetUserId,r.reason,r.status,r.created_at AS createdAt,p.handle,p.display_name AS displayName FROM profile_reports r JOIN profiles p ON p.user_id=r.target_user_id WHERE (?='all' OR r.status=?) ORDER BY r.created_at DESC,r.id DESC LIMIT ? OFFSET ?`,
        )
        .bind(state, state, limit, offset),
      c
        .get('db')
        .prepare("SELECT COUNT(*) AS total FROM profile_reports WHERE (?='all' OR status=?)")
        .bind(state, state),
    ]);
    return c.json({
      version: access.version,
      items: rows.results,
      total: total.results[0].total,
      limit,
      offset,
    });
  });
  api.get('/community/profiles/:id/avatar', async (c) => {
    await adminAccess(c, 'community.profiles.read', registry);
    const row = await requireRow(c, c.req.param('id'));
    return avatarResponse(c, row, 'staff', async () => {
      await adminAccess(c, 'community.profiles.read', registry);
      const guard = actorGuard(c, Date.now(), false);
      c.set('db', c.env.DB.withSession('first-primary'));
      if (
        !(await c
          .get('db')
          .prepare(`SELECT 1 WHERE ${guard.sql}`)
          .bind(...guard.args)
          .first())
      )
        throw new HTTPException(401, { message: 'Session expired' });
    });
  });
  api.post('/community/profiles/:id/moderate', async (c) => {
    const access = await adminAccess(c, 'community.profiles.moderate', registry);
    const input = await adminInput(c, ['action', 'profileRevision']);
    const revision = integer(
      input.profileRevision,
      'profileRevision',
      1,
      Number.MAX_SAFE_INTEGER - 1,
    );
    const reason = string(input.reason, 'reason', 1000);
    if (reason.length < 8) invalid('A reason of at least 8 characters is required');
    const action = String(input.action);
    if (!['hide', 'restore', 'remove', 'avatar'].includes(action))
      invalid('Invalid profile action');
    const before = await requireRow(c, c.req.param('id'));
    if (before.revision !== revision)
      throw new HTTPException(409, { message: 'Profile changed; reload and review again' });
    if (
      (action === 'restore' && before.moderation !== 'hidden') ||
      (action === 'hide' && before.moderation !== 'visible') ||
      (action === 'remove' && before.moderation === 'removed') ||
      (action === 'avatar' && !before.avatarKey)
    )
      throw new HTTPException(409, {
        message: 'Action is no longer available; reload and review again',
      });
    const moderation =
      action === 'avatar'
        ? before.moderation
        : action === 'hide'
          ? 'hidden'
          : action === 'restore'
            ? 'visible'
            : 'removed';
    const clearAvatar = action === 'avatar' || action === 'remove';
    const now = Date.now();
    const actor = actorGuard(c, now, false);
    const result = await commitAdminChange(
      c,
      access,
      {
        permission: 'community.profiles.moderate',
        action: `community.profiles.${action}`,
        targetType: 'profile',
        targetId: before.userId,
        before: {
          moderation: before.moderation,
          revision: before.revision,
          hasAvatar: Boolean(before.avatarKey),
        },
        after: {
          moderation,
          revision: revision + 1,
          hasAvatar: clearAvatar ? false : Boolean(before.avatarKey),
        },
        input,
        guard: {
          sql: `EXISTS(SELECT 1 FROM profiles WHERE user_id=? AND revision=? AND moderation=?) AND (${actor.sql})`,
          args: [before.userId, revision, before.moderation, ...actor.args],
        },
        changes: (id) => [
          {
            sql: `UPDATE profiles SET moderation=?,avatar_key=?,revision=revision+1,mutation_id=?,updated_at=? WHERE user_id=? AND ${mutationGuard}`,
            args: [moderation, clearAvatar ? null : before.avatarKey, id, now, before.userId, id],
          },
          ...(clearAvatar && before.avatarKey
            ? [
                {
                  sql: `INSERT INTO profile_avatar_garbage(key,user_id,eligible_at) SELECT ?,?,? WHERE ${mutationGuard} ON CONFLICT(key) DO NOTHING`,
                  args: [before.avatarKey, before.userId, now, id],
                },
              ]
            : []),
        ],
      },
      registry,
    );
    if (clearAvatar) await cleanAvatarGarbage(c, before.userId);
    return c.json(result);
  });
  api.post('/community/reports/:id/resolve', async (c) => {
    const access = await adminAccess(c, 'community.reports.review', registry);
    const input = await adminInput(c, ['reportRevision', 'outcome']);
    const revision = integer(
      input.reportRevision,
      'reportRevision',
      1,
      Number.MAX_SAFE_INTEGER - 1,
    );
    const reason = string(input.reason, 'reason', 1000);
    if (reason.length < 8) invalid('A reason of at least 8 characters is required');
    if (input.outcome !== 'resolved' && input.outcome !== 'dismissed')
      invalid('Invalid report outcome');
    const report = await c
      .get('db')
      .prepare(
        'SELECT id,target_user_id AS targetId,revision,status FROM profile_reports WHERE id=?',
      )
      .bind(c.req.param('id'))
      .first<{ id: string; targetId: string; revision: number; status: string }>();
    if (!report) throw new HTTPException(404, { message: 'Report unavailable' });
    if (report.status !== 'open' || report.revision !== revision)
      throw new HTTPException(409, { message: 'Report changed; reload and review again' });
    const actor = actorGuard(c, Date.now(), false);
    return c.json(
      await commitAdminChange(
        c,
        access,
        {
          permission: 'community.reports.review',
          action: 'community.reports.resolve',
          targetType: 'profile',
          targetId: report.targetId,
          before: { reportId: report.id, status: report.status },
          after: { reportId: report.id, status: input.outcome },
          input,
          guard: {
            sql: `EXISTS(SELECT 1 FROM profile_reports WHERE id=? AND revision=? AND status='open') AND (${actor.sql})`,
            args: [report.id, revision, ...actor.args],
          },
          changes: (id) => [
            {
              sql: `UPDATE profile_reports SET status=?,resolution=?,resolved_by=?,revision=revision+1,updated_at=? WHERE id=? AND ${mutationGuard}`,
              args: [input.outcome, reason, access.actor.id, Date.now(), report.id, id],
            },
          ],
        },
        registry,
      ),
    );
  });
}
