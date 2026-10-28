import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import {
  type Publication,
  publicationSelect,
  publicationSummary,
} from '../../community/publication-policy';
import type { AdminRegistry } from '../../platform/registry';
import { actorGuard } from '../community/store';
import type { ApiEnv } from '../context';
import { integer, invalid, keys, pagination, string } from '../membership-validation';
import { adminAccess, adminSnapshot } from './access';
import { adminInput } from './input';
import { commitAdminChange, mutationGuard } from './mutation';

export function registerPublications(api: Hono<ApiEnv>, registry: AdminRegistry) {
  api.get('/community/publications', async (c) => {
    const access = await adminAccess(c, 'community.publications.read', registry);
    const query = c.req.query();
    keys(query, ['q', 'moderation', 'limit', 'offset']);
    const { limit, offset } = pagination({ ...query, limit: query.limit ?? '20' });
    integer(offset, 'offset', 0, 10000);
    const q = string(query.q ?? '', 'q', 100, true).toLowerCase();
    const state = query.moderation ?? 'all';
    if (!['all', 'visible', 'hidden', 'removed'].includes(state))
      invalid('Invalid moderation filter');
    const where = "(?='all' OR p.moderation=?) AND (?='' OR lower(v.title) LIKE ? ESCAPE '\\')";
    const args = [state, state, q, `${q.replace(/[\\%_]/g, '\\$&')}%`];
    const [rows, total] = await adminSnapshot(c, access, [
      c
        .get('db')
        .prepare(
          `${publicationSelect} WHERE ${where} ORDER BY p.updated_at DESC,p.id DESC LIMIT ? OFFSET ?`,
        )
        .bind(...args, limit, offset),
      c
        .get('db')
        .prepare(
          `SELECT COUNT(*) AS total FROM publications p JOIN publication_versions v ON v.id=p.current_version_id WHERE ${where}`,
        )
        .bind(...args),
    ]);
    return c.json({
      version: access.version,
      items: (rows.results as Publication[]).map((p) => publicationSummary(p, true)),
      total: total.results[0].total,
      limit,
      offset,
    });
  });
  api.get('/community/publications/:id', async (c) => {
    const access = await adminAccess(c, 'community.publications.read', registry);
    const id = string(c.req.param('id'), 'publication ID', 200);
    const db = c.get('db');
    const [subject, reports, history, versions] = await adminSnapshot(c, access, [
      db.prepare(`${publicationSelect} WHERE p.id=?`).bind(id),
      db
        .prepare(
          'SELECT id,version_id AS versionId,reason,details,status,revision,resolution,created_at AS createdAt FROM publication_reports WHERE publication_id=? AND ? ORDER BY created_at DESC,id DESC LIMIT 30',
        )
        .bind(id, Number(access.permissions.includes('community.reports.read'))),
      db
        .prepare(
          "SELECT id,action,reason,created_at AS createdAt FROM admin_audit WHERE namespace='community' AND target_type='publication' AND target_id=? AND ? ORDER BY created_at DESC,id DESC LIMIT 30",
        )
        .bind(id, Number(access.permissions.includes('community.audit.read'))),
      db
        .prepare(
          'SELECT id,version_number AS versionNumber,title,fingerprint,created_at AS createdAt FROM publication_versions WHERE publication_id=? ORDER BY version_number DESC LIMIT 100',
        )
        .bind(id),
    ]);
    const p = subject.results[0] as Publication | undefined;
    if (!p) throw new HTTPException(404, { message: 'Publication unavailable' });
    return c.json({
      version: access.version,
      publication: publicationSummary(p, true),
      reports: reports.results,
      history: history.results,
      versions: versions.results,
    });
  });
  api.get('/community/publications/:id/versions/:versionId', async (c) => {
    const access = await adminAccess(c, 'community.publications.read', registry);
    const [versions] = await adminSnapshot(c, access, [
      c
        .get('db')
        .prepare(
          'SELECT id,version_number AS versionNumber,title,description,tags_json AS tagsJson,circuit_json AS circuitJson,fingerprint,requirements_json AS requirementsJson,verified_at AS verifiedAt FROM publication_versions WHERE publication_id=? AND id=?',
        )
        .bind(c.req.param('id'), c.req.param('versionId')),
    ]);
    const row = versions.results[0];
    if (!row) throw new HTTPException(404, { message: 'Snapshot unavailable' });
    const { circuitJson, tagsJson, requirementsJson, ...safe } = row;
    return c.json({
      version: access.version,
      snapshot: {
        ...safe,
        circuit: JSON.parse(String(circuitJson)),
        tags: JSON.parse(String(tagsJson)),
        requirements: JSON.parse(String(requirementsJson)),
      },
    });
  });
  api.post('/community/publications/:id/moderate', async (c) => {
    const access = await adminAccess(c, 'community.publications.moderate', registry);
    const input = await adminInput(c, ['action', 'publicationRevision']);
    const revision = integer(
      input.publicationRevision,
      'publicationRevision',
      1,
      Number.MAX_SAFE_INTEGER - 1,
    );
    const reason = string(input.reason, 'reason', 1000);
    if (reason.length < 8) invalid('A reason of at least 8 characters is required');
    const action = String(input.action);
    if (!['hide', 'restore', 'remove'].includes(action)) invalid('Invalid publication action');
    const p = await c
      .get('db')
      .prepare(`${publicationSelect} WHERE p.id=?`)
      .bind(c.req.param('id'))
      .first<Publication>();
    if (!p) throw new HTTPException(404, { message: 'Publication unavailable' });
    if (
      p.revision !== revision ||
      p.moderation === 'removed' ||
      (action === 'restore' && p.moderation !== 'hidden') ||
      (action === 'hide' && p.moderation !== 'visible')
    )
      throw new HTTPException(409, { message: 'Publication changed; reload and review again' });
    const moderation = action === 'restore' ? 'visible' : action === 'hide' ? 'hidden' : 'removed';
    const now = Date.now();
    const actor = actorGuard(c, now, false);
    return c.json(
      await commitAdminChange(
        c,
        access,
        {
          permission: 'community.publications.moderate',
          action: `community.publications.${action}`,
          targetType: 'publication',
          targetId: p.id,
          before: { moderation: p.moderation, revision },
          after: { moderation, revision: revision + 1 },
          input,
          guard: {
            sql: `EXISTS(SELECT 1 FROM publications WHERE id=? AND revision=? AND moderation=?) AND (${actor.sql})`,
            args: [p.id, revision, p.moderation, ...actor.args],
          },
          changes: (id) => [
            {
              sql: `UPDATE publications SET moderation=?,revision=revision+1,mutation_id=?,updated_at=? WHERE id=? AND ${mutationGuard}`,
              args: [moderation, id, now, p.id, id],
            },
          ],
        },
        registry,
      ),
    );
  });
  api.get('/community/publication-reports', async (c) => {
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
          "SELECT r.id,r.publication_id AS publicationId,r.reason,r.status,r.created_at AS createdAt,v.title FROM publication_reports r JOIN publication_versions v ON v.id=r.version_id WHERE (?='all' OR r.status=?) ORDER BY r.created_at DESC,r.id DESC LIMIT ? OFFSET ?",
        )
        .bind(state, state, limit, offset),
      c
        .get('db')
        .prepare("SELECT COUNT(*) AS total FROM publication_reports WHERE (?='all' OR status=?)")
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
  api.post('/community/publication-reports/:id/resolve', async (c) => {
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
    if (!['resolved', 'dismissed'].includes(String(input.outcome)))
      invalid('Invalid report outcome');
    const report = await c
      .get('db')
      .prepare(
        'SELECT id,publication_id AS publicationId,status,revision FROM publication_reports WHERE id=?',
      )
      .bind(c.req.param('id'))
      .first<{ id: string; publicationId: string; status: string; revision: number }>();
    if (!report) throw new HTTPException(404, { message: 'Report unavailable' });
    if (report.revision !== revision || report.status !== 'open')
      throw new HTTPException(409, { message: 'Report changed; reload and review again' });
    const actor = actorGuard(c, Date.now(), false);
    return c.json(
      await commitAdminChange(
        c,
        access,
        {
          permission: 'community.reports.review',
          action: 'community.reports.resolve',
          targetType: 'publication',
          targetId: report.publicationId,
          input,
          before: { reportId: report.id, status: report.status },
          after: { reportId: report.id, status: input.outcome },
          guard: {
            sql: `EXISTS(SELECT 1 FROM publication_reports WHERE id=? AND revision=? AND status='open') AND (${actor.sql})`,
            args: [report.id, revision, ...actor.args],
          },
          changes: (id) => [
            {
              sql: `UPDATE publication_reports SET status=?,resolution=?,resolved_by=?,revision=revision+1,updated_at=? WHERE id=? AND ${mutationGuard}`,
              args: [input.outcome, reason, access.actor.id, Date.now(), report.id, id],
            },
          ],
        },
        registry,
      ),
    );
  });
}
