import { CIRCUIT_SCHEMA_VERSION } from '@electrasim/domain/circuitFormat';
import { ELECTRICAL_MODEL_VERSION } from '@electrasim/domain/core/contracts';
import { CONTROL_ENGINE_VERSION } from '@electrasim/domain/core/controlStep';
import { MNA_ENGINE_VERSION } from '@electrasim/domain/core/mna';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import {
  DISCOVERY_STANDARDS,
  DISCOVERY_ZONES,
  PUBLICATION_REPORT_REASONS,
  type Publication,
  normalizedTags,
  publicationSelect,
  publicationSlug,
  publicationSummary,
  visiblePublication,
} from '../../community/publication-policy';
import { policyGuard } from '../component-access-store';
import { type ApiEnv, freshContext, requireSession, sameOriginMutation } from '../context';
import { boolean, integer, invalid, keys, object, string } from '../membership-validation';
import { requireCommunityWrite } from '../platform/restrictions';
import { capabilityGuard, circuitAccess, readCircuit } from '../simulator-access';
import {
  ownerPublication,
  publicAttribution,
  recheckPublication,
  requirePublicPublication,
} from './publication-store';
import { actorGuard, communityPolicy, requireRow } from './store';

export const publicationsApi = new Hono<ApiEnv>();
for (const path of [
  '/community/publications',
  '/community/publications/*',
  '/me/publications',
  '/me/publications/*',
]) {
  publicationsApi.use(path, freshContext, sameOriginMutation, bodyLimit({ maxSize: 8192 }));
}
publicationsApi.onError((error, c) => {
  if (error instanceof HTTPException) return c.json({ error: error.message }, error.status);
  console.error(
    JSON.stringify({ event: 'publication_request_failed', requestId: c.get('requestId') }),
  );
  return c.json({ error: 'Publications unavailable; try again' }, 503);
});
for (const path of ['/me/publications', '/me/publications/*'])
  publicationsApi.use(path, requireSession);
async function input(c: Context<ApiEnv>, fields: string[]) {
  let value: unknown;
  try {
    value = await c.req.json();
  } catch {
    invalid('Invalid JSON');
  }
  const data = object(value);
  keys(data, fields);
  return data;
}
const mutationGuard = 'EXISTS(SELECT 1 FROM publications WHERE id=? AND mutation_id=?)';
const revisionInput = (value: unknown) =>
  integer(value, 'revision', 1, Number.MAX_SAFE_INTEGER - 1);

publicationsApi.get('/me/publications', async (c) => {
  const query = c.req.query();
  keys(query, ['sourceCircuitId', 'cursor', 'limit']);
  const limit = integer(Number(query.limit ?? 20), 'limit', 1, 100);
  const cursor = query.cursor ?? '';
  let before: number | null = null;
  let beforeId = '';
  if (cursor) {
    const match = /^(\d+):([a-zA-Z0-9-]{1,200})$/.exec(cursor);
    if (!match) invalid('Invalid cursor');
    before = integer(Number(match[1]), 'cursor', 0);
    beforeId = match[2];
  }
  const source = string(query.sourceCircuitId ?? '', 'sourceCircuitId', 200, true);
  const actor = actorGuard(c, Date.now(), false);
  const rows = await c
    .get('db')
    .prepare(
      `${publicationSelect} WHERE p.owner_id=? AND (?='' OR p.source_circuit_id=?) AND (? IS NULL OR p.updated_at<? OR (p.updated_at=? AND p.id<?)) AND (${actor.sql}) ORDER BY p.updated_at DESC,p.id DESC LIMIT ?`,
    )
    .bind(
      c.get('actor').id,
      source,
      source,
      before,
      before,
      before,
      beforeId,
      ...actor.args,
      limit + 1,
    )
    .all<Publication>();
  const items = rows.results.slice(0, limit);
  const last = items.at(-1);
  return c.json({
    items: items.map((p) => publicationSummary(p, true)),
    nextCursor: rows.results.length > limit && last ? `${last.updatedAt}:${last.id}` : null,
  });
});
publicationsApi.get('/me/publications/:id', async (c) => {
  const p = await ownerPublication(c, c.req.param('id')!);
  const versions = await c
    .get('db')
    .prepare(
      'SELECT id,version_number AS versionNumber,title,created_at AS createdAt,fingerprint,verified_at AS verifiedAt FROM publication_versions WHERE publication_id=? ORDER BY version_number DESC LIMIT 100',
    )
    .bind(p.id)
    .all();
  await ownerPublication(c, p.id, p.mutationId);
  return c.json({ publication: publicationSummary(p, true), versions: versions.results });
});

async function publish(c: Context<ApiEnv>, existing?: Publication) {
  const data = await input(c, [
    'sourceCircuitId',
    'sourceVersion',
    'revision',
    'title',
    'description',
    'tags',
    'allowForks',
    'zone',
    'standard',
  ]);
  const owner = c.get('actor').id;
  const sourceId =
    existing?.sourceCircuitId ?? string(data.sourceCircuitId, 'sourceCircuitId', 200);
  if (existing && data.sourceCircuitId !== undefined && data.sourceCircuitId !== sourceId)
    invalid('A publication cannot change its source circuit');
  const sourceVersion = integer(
    data.sourceVersion,
    'sourceVersion',
    1,
    Number.MAX_SAFE_INTEGER - 1,
  );
  const revision = existing ? revisionInput(data.revision) : 1;
  if (!existing && data.revision !== undefined) invalid('A first publication has no revision');
  if (
    existing &&
    (existing.revision !== revision ||
      existing.status === 'deleted' ||
      existing.moderation === 'removed')
  )
    throw new HTTPException(409, {
      message: 'Publication changed or removed; reload before retrying',
    });
  const title = string(data.title, 'title', 160);
  const description = string(data.description ?? '', 'description', 2000, true);
  const tags = normalizedTags(data.tags ?? []);
  if (!tags) invalid('Use up to eight distinct tags of 2–24 lowercase letters, numbers or hyphens');
  const zone = data.zone ?? existing?.zone ?? 'general';
  const standard = data.standard ?? existing?.standard ?? 'int';
  if (!DISCOVERY_ZONES.includes(zone as (typeof DISCOVERY_ZONES)[number]))
    invalid('Invalid discovery zone');
  if (!DISCOVERY_STANDARDS.includes(standard as (typeof DISCOVERY_STANDARDS)[number]))
    invalid('Invalid study standard');
  const profile = await requireRow(c);
  if (!profile.handle)
    throw new HTTPException(409, {
      message: 'Claim your community handle in Profile & privacy before publishing',
    });
  const allowForks =
    data.allowForks === undefined
      ? profile.allowForks === 1
      : boolean(data.allowForks, 'allowForks');
  const source = await c
    .get('db')
    .prepare('SELECT content,version FROM circuits WHERE id=? AND user_id=?')
    .bind(sourceId, owner)
    .first<{ content: string; version: number }>();
  if (!source) throw new HTTPException(404, { message: 'Saved circuit unavailable' });
  if (source.version !== sourceVersion)
    throw new HTTPException(409, { message: 'Saved circuit changed; reload before publishing' });
  const circuit = readCircuit(JSON.parse(source.content));
  const access = await circuitAccess(c, [circuit]);
  const settings = await communityPolicy(c);
  const json = JSON.stringify(circuit);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(json));
  const fingerprint = Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  const now = Date.now();
  const window = Math.floor(now / 60000) * 60000;
  const id = existing?.id ?? crypto.randomUUID();
  const mutation = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const versionNumber = (existing?.versionNumber ?? 0) + 1;
  const banned = settings.values.bannedWords.some((w) =>
    [title, description, ...tags].join('\n').toLowerCase().includes(w),
  );
  const moderation =
    existing?.moderation === 'hidden' || banned || (!existing && settings.values.preModeration)
      ? 'hidden'
      : 'visible';
  const actor = actorGuard(c, now);
  const cap = capabilityGuard(owner, access.required, now);
  const policy = policyGuard(access.policy.revision);
  const where = `AND (${actor.sql}) ${cap.sql}${policy.sql}
    AND (SELECT version FROM admin_revision WHERE id=1)=?
    AND EXISTS(SELECT 1 FROM profiles WHERE user_id=? AND revision=? AND handle IS NOT NULL)
    AND EXISTS(SELECT 1 FROM circuits WHERE id=? AND user_id=? AND version=? AND content=?)
    AND NOT EXISTS(SELECT 1 FROM publication_write_windows WHERE user_id=? AND window_start=? AND writes>=?)`;
  const args = [
    ...actor.args,
    ...cap.args,
    ...policy.args,
    settings.version,
    owner,
    profile.revision,
    sourceId,
    owner,
    sourceVersion,
    source.content,
    owner,
    window,
    settings.values.writesPerMinute,
  ];
  const db = c.get('db');
  const claim = existing
    ? db
        .prepare(
          `UPDATE publications SET status='published',moderation=?,zone=?,standard=?,revision=revision+1,mutation_id=?,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND status!='deleted' AND moderation!='removed' ${where}`,
        )
        .bind(moderation, zone, standard, mutation, now, id, owner, revision, ...args)
    : db
        .prepare(
          `INSERT INTO publications(id,owner_id,source_circuit_id,slug,status,moderation,zone,standard,revision,mutation_id,published_at,updated_at) SELECT ?,?,?,?,'published',?,?,?,1,?,?,? WHERE NOT EXISTS(SELECT 1 FROM publications WHERE owner_id=? AND source_circuit_id=?) ${where}`,
        )
        .bind(
          id,
          owner,
          sourceId,
          publicationSlug(title, id),
          moderation,
          zone,
          standard,
          mutation,
          now,
          now,
          owner,
          sourceId,
          ...args,
        );
  const statements = [
    claim,
    db
      .prepare(
        `INSERT INTO publication_versions(id,publication_id,version_number,title,description,tags_json,allow_forks,circuit_json,circuit_schema_version,requirements_json,component_policy_revision,model_version,engine_version,control_engine_version,fingerprint,validated_at,verified_at,source_version,created_by,created_at) SELECT ?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,?,?,? WHERE ${mutationGuard}`,
      )
      .bind(
        versionId,
        id,
        versionNumber,
        title,
        description,
        JSON.stringify(tags),
        Number(allowForks),
        json,
        CIRCUIT_SCHEMA_VERSION,
        JSON.stringify(access.required),
        access.policy.revision,
        ELECTRICAL_MODEL_VERSION,
        MNA_ENGINE_VERSION,
        CONTROL_ENGINE_VERSION,
        fingerprint,
        now,
        sourceVersion,
        owner,
        now,
        id,
        mutation,
      ),
    db
      .prepare(`UPDATE publications SET current_version_id=? WHERE id=? AND ${mutationGuard}`)
      .bind(versionId, id, id, mutation),
    db
      .prepare(`DELETE FROM publication_tags WHERE publication_id=? AND ${mutationGuard}`)
      .bind(id, id, mutation),
    ...tags.map((tag) =>
      db
        .prepare(
          `INSERT INTO publication_tags(publication_id,tag) SELECT ?,? WHERE ${mutationGuard}`,
        )
        .bind(id, tag, id, mutation),
    ),
    db
      .prepare(
        `INSERT INTO publication_write_windows(user_id,window_start,writes) SELECT ?,?,1 WHERE ${mutationGuard} ON CONFLICT(user_id) DO UPDATE SET window_start=excluded.window_start,writes=CASE WHEN window_start=excluded.window_start THEN writes+1 ELSE 1 END`,
      )
      .bind(owner, window, id, mutation),
  ];
  if (moderation === 'hidden' && existing?.moderation !== 'hidden')
    statements.push(
      db
        .prepare(
          `INSERT INTO admin_audit(id,namespace,actor_id,action,target_type,target_id,before_json,after_json,reason,request_id,created_at,version) SELECT ?,'community','system:publication-policy','community.publications.auto-hide','publication',?,?,?,?,?,?,? WHERE ${mutationGuard}`,
        )
        .bind(
          mutation,
          id,
          JSON.stringify({ moderation: existing?.moderation ?? null }),
          JSON.stringify({ moderation, revision: existing ? revision + 1 : 1 }),
          banned ? 'Configured publication text policy' : 'First publication requires staff review',
          c.get('requestId'),
          now,
          settings.version,
          id,
          mutation,
        ),
    );
  const result = await db.batch(statements);
  // Discovery/FTS triggers may add changes; the guarded claim targets one publication.
  if (result[0].meta.changes < 1) {
    const rate = await db
      .prepare('SELECT writes FROM publication_write_windows WHERE user_id=? AND window_start=?')
      .bind(owner, window)
      .first<{ writes: number }>();
    if (rate && rate.writes >= settings.values.writesPerMinute)
      throw new HTTPException(429, {
        message: 'Too many publication changes; try again in a minute',
      });
    throw new HTTPException(409, {
      message: 'Circuit, publication, session or policy changed; reload before publishing',
    });
  }
  const committed = await ownerPublication(c, id, mutation);
  return c.json({ publication: publicationSummary(committed, true) }, existing ? 200 : 201);
}
publicationsApi.post('/community/publications', requireSession, requireCommunityWrite, (c) =>
  publish(c),
);
publicationsApi.patch(
  '/community/publications/:id',
  requireSession,
  requireCommunityWrite,
  async (c) => publish(c, await ownerPublication(c, c.req.param('id'))),
);
async function withdraw(c: Context<ApiEnv>, status: 'unpublished' | 'deleted') {
  const data = await input(c, ['revision']);
  const revision = revisionInput(data.revision);
  const p = await ownerPublication(c, c.req.param('id')!);
  const actor = actorGuard(c, Date.now(), false);
  const mutation = crypto.randomUUID();
  const result = await c
    .get('db')
    .prepare(
      `UPDATE publications SET status=?,revision=revision+1,mutation_id=?,updated_at=? WHERE id=? AND owner_id=? AND revision=? AND status!='deleted' AND (${actor.sql})`,
    )
    .bind(status, mutation, Date.now(), p.id, c.get('actor').id, revision, ...actor.args)
    .run();
  if (result.meta.changes < 1)
    throw new HTTPException(409, { message: 'Publication changed; reload before retrying' });
  return c.json({
    publication: publicationSummary(await ownerPublication(c, p.id, mutation), true),
  });
}
publicationsApi.post('/community/publications/:id/unpublish', requireSession, (c) =>
  withdraw(c, 'unpublished'),
);
publicationsApi.delete('/community/publications/:id', requireSession, (c) =>
  withdraw(c, 'deleted'),
);

// Public projections intentionally exclude owner IDs, source IDs, auth fields and private edits.
publicationsApi.get('/community/publications/:slug', async (c) => {
  const p = await requirePublicPublication(c, c.req.param('slug'));
  // Attribution and publication visibility share the final primary statement.
  return c.json({ publication: publicationSummary(p), author: await publicAttribution(c, p) });
});
publicationsApi.get('/community/publications/:slug/versions', async (c) => {
  const p = await requirePublicPublication(c, c.req.param('slug'));
  const query = c.req.query();
  keys(query, ['before', 'limit']);
  const before = integer(Number(query.before ?? Number.MAX_SAFE_INTEGER), 'before', 1);
  const limit = integer(Number(query.limit ?? 20), 'limit', 1, 100);
  const result = await c
    .get('db')
    .prepare(
      'SELECT id,version_number AS versionNumber,title,created_at AS createdAt,fingerprint,model_version AS modelVersion,engine_version AS engineVersion,control_engine_version AS controlEngineVersion,validated_at AS validatedAt,verified_at AS verifiedAt FROM publication_versions WHERE publication_id=? AND version_number<? ORDER BY version_number DESC LIMIT ?',
    )
    .bind(p.id, before, limit + 1)
    .all<{ versionNumber: number }>();
  await recheckPublication(c, p);
  return c.json({
    items: result.results.slice(0, limit),
    nextCursor: result.results.length > limit ? result.results[limit - 1].versionNumber : null,
  });
});
publicationsApi.get('/community/publications/:slug/versions/:versionId', async (c) => {
  const p = await requirePublicPublication(c, c.req.param('slug'));
  const row = await c
    .get('db')
    .prepare(
      'SELECT id,version_number AS versionNumber,title,description,tags_json AS tagsJson,allow_forks AS allowForks,circuit_json AS circuitJson,circuit_schema_version AS circuitSchemaVersion,requirements_json AS requirementsJson,component_policy_revision AS componentPolicyRevision,model_version AS modelVersion,engine_version AS engineVersion,control_engine_version AS controlEngineVersion,fingerprint,validated_at AS validatedAt,verified_at AS verifiedAt,created_at AS createdAt FROM publication_versions WHERE publication_id=? AND id=?',
    )
    .bind(p.id, c.req.param('versionId'))
    .first<Record<string, unknown>>();
  if (!row) throw new HTTPException(404, { message: 'Publication version unavailable' });
  await recheckPublication(c, p);
  const { circuitJson, tagsJson, requirementsJson, allowForks, ...safe } = row;
  return c.json({
    version: {
      ...safe,
      circuit: JSON.parse(String(circuitJson)),
      tags: JSON.parse(String(tagsJson)),
      requirements: JSON.parse(String(requirementsJson)),
      allowForks: allowForks === 1,
    },
  });
});

publicationsApi.post('/community/publications/:slug/reports', requireSession, async (c) => {
  const data = await input(c, ['reason', 'details']);
  const reason = string(data.reason, 'reason', 80);
  const details = string(data.details, 'details', 500);
  if (!PUBLICATION_REPORT_REASONS.includes(reason as (typeof PUBLICATION_REPORT_REASONS)[number]))
    invalid('Invalid publication report reason');
  const p = await requirePublicPublication(c, c.req.param('slug'));
  const reporter = c.get('actor').id;
  if (p.ownerId === reporter)
    throw new HTTPException(403, { message: 'You cannot report your own publication' });
  const settings = await communityPolicy(c);
  const now = Date.now();
  const id = crypto.randomUUID();
  const actor = actorGuard(c, now, false);
  const db = c.get('db');
  const result = await db.batch([
    db
      .prepare(`INSERT INTO publication_reports(id,reporter_id,publication_id,version_id,reason,details,created_at,updated_at)
      SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM publications p WHERE p.id=? AND p.revision=? AND ${visiblePublication}) AND (${actor.sql})
      AND (SELECT version FROM admin_revision WHERE id=1)=?
      AND (SELECT COUNT(*) FROM publication_reports WHERE reporter_id=? AND created_at>?)+(SELECT COUNT(*) FROM profile_reports WHERE reporter_id=? AND created_at>?)<?
      AND NOT EXISTS(SELECT 1 FROM publication_reports WHERE reporter_id=? AND publication_id=?)`)
      .bind(
        id,
        reporter,
        p.id,
        p.currentVersionId,
        reason,
        details,
        now,
        now,
        p.id,
        p.revision,
        ...actor.args,
        settings.version,
        reporter,
        now - 86400000,
        reporter,
        now - 86400000,
        settings.values.reportsPerDay,
        reporter,
        p.id,
      ),
    db
      .prepare(`UPDATE publications SET moderation='hidden',revision=revision+1,mutation_id=?,updated_at=? WHERE id=? AND moderation='visible' AND EXISTS(SELECT 1 FROM publication_reports WHERE id=?) AND
      (SELECT COUNT(*) FROM publication_reports r WHERE r.publication_id=? AND r.status='open' AND NOT EXISTS(SELECT 1 FROM account_controls a WHERE a.user_id=r.reporter_id AND a.suspended=1 AND (a.ends_at IS NULL OR a.ends_at>?))
      AND NOT EXISTS(SELECT 1 FROM community_restrictions x WHERE x.user_id=r.reporter_id AND x.revoked_at IS NULL AND x.starts_at<=? AND (x.ends_at IS NULL OR x.ends_at>?)))>=?`)
      .bind(id, now, p.id, id, p.id, now, now, now, settings.values.autoHideThreshold),
    db
      .prepare(
        `INSERT INTO admin_audit(id,namespace,actor_id,action,target_type,target_id,before_json,after_json,reason,request_id,created_at,version) SELECT ?,'community','system:publication-policy','community.publications.auto-hide','publication',?,?,?,'Distinct eligible publication reports reached the configured threshold',?,?,? WHERE ${mutationGuard}`,
      )
      .bind(
        id,
        p.id,
        JSON.stringify({ moderation: 'visible', revision: p.revision }),
        JSON.stringify({ moderation: 'hidden', revision: p.revision + 1 }),
        c.get('requestId'),
        now,
        settings.version,
        p.id,
        id,
      ),
  ]);
  if (result[0].meta.changes !== 1) {
    // A duplicate is acknowledged only while the reporter still has a live session.
    const existing = await db
      .prepare(
        `SELECT id FROM publication_reports WHERE reporter_id=? AND publication_id=? AND (${actor.sql})`,
      )
      .bind(reporter, p.id, ...actor.args)
      .first();
    if (existing) return c.json({ ok: true, duplicate: true });
    const rate = await db
      .prepare(
        'SELECT (SELECT COUNT(*) FROM publication_reports WHERE reporter_id=? AND created_at>?)+(SELECT COUNT(*) FROM profile_reports WHERE reporter_id=? AND created_at>?) AS n',
      )
      .bind(reporter, now - 86400000, reporter, now - 86400000)
      .first<{ n: number }>();
    if (rate && rate.n >= settings.values.reportsPerDay)
      throw new HTTPException(429, { message: 'Report limit reached; try again later' });
    throw new HTTPException(409, {
      message: 'Publication or access changed; reload before reporting',
    });
  }
  return c.json({ ok: true, duplicate: false }, 201);
});
