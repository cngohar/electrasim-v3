import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { DISCOVERY_STANDARDS, DISCOVERY_ZONES } from '../../community/publication-policy';
import type { ApiEnv } from '../context';
import { integer, invalid, keys } from '../membership-validation';
import { actorGuard } from './store';

export type DiscoveryScope = 'explore' | 'following' | 'mine';
export type DiscoverySort = 'newest' | 'oldest' | 'title';
export type DiscoveryQuery = {
  q: string;
  zone: string;
  standard: string;
  tag: string;
  sort: DiscoverySort;
  limit: number;
  cursor: string;
};
type Cursor = { scope: DiscoveryScope; filters: string; value: number | string; id: string };
export type DiscoveryItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  zone: string;
  standard: string;
  componentCount: number;
  versionId: string;
  publishedAt: number;
  author: { handle: string | null; displayName: string };
};
type Row = Omit<DiscoveryItem, 'tags' | 'author'> & {
  ownerId: string;
  tagsJson: string;
  authorHandle: string | null;
  authorName: string;
  publicationRevision: number;
  profileRevision: number | null;
};

const invalidQuery = (message: string): never => invalid(message);
const validTag = /^[a-z0-9][a-z0-9-]{0,22}[a-z0-9]$/;
const orderSql: Record<DiscoverySort, string> = {
  newest: 'd.published_at DESC,d.publication_id DESC',
  oldest: 'd.published_at ASC,d.publication_id ASC',
  title: 'd.title COLLATE NOCASE ASC,d.publication_id ASC',
};
function encoded(value: Cursor) {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
function decoded(value: string): Cursor {
  if (value.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(value)) invalidQuery('Invalid cursor');
  try {
    const bytes = Uint8Array.from(atob(value.replaceAll('-', '+').replaceAll('_', '/')), (c) =>
      c.charCodeAt(0),
    );
    const parsed: unknown = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !('id' in parsed) ||
      typeof parsed.id !== 'string' ||
      !/^[a-zA-Z0-9-]{1,200}$/.test(parsed.id) ||
      !('filters' in parsed) ||
      typeof parsed.filters !== 'string' ||
      !('value' in parsed) ||
      !['number', 'string'].includes(typeof parsed.value) ||
      !('scope' in parsed) ||
      !['explore', 'following', 'mine'].includes(String(parsed.scope))
    )
      invalidQuery('Invalid cursor');
    return parsed as Cursor;
  } catch {
    return invalidQuery('Invalid cursor');
  }
}
function matchQuery(q: string) {
  const words = q.normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [];
  if (!words.length || words.length > 8 || words.some((word) => word.length > 40))
    invalidQuery('Search needs one to eight words of at most 40 characters');
  return words.map((word) => `"${word}"*`).join(' AND ');
}
export function parseDiscoveryQuery(query: Record<string, string>, scope: DiscoveryScope) {
  keys(query, ['q', 'zone', 'standard', 'tag', 'sort', 'limit', 'cursor']);
  const q = (query.q ?? '').trim();
  if (q.length > 80) invalidQuery('Search is limited to 80 characters');
  if (q) matchQuery(q);
  const zone = query.zone ?? 'all';
  const standard = query.standard ?? 'all';
  const tag = query.tag ?? '';
  const sort = query.sort ?? 'newest';
  if (zone !== 'all' && !DISCOVERY_ZONES.includes(zone as (typeof DISCOVERY_ZONES)[number]))
    invalidQuery('Invalid zone');
  if (
    standard !== 'all' &&
    !DISCOVERY_STANDARDS.includes(standard as (typeof DISCOVERY_STANDARDS)[number])
  )
    invalidQuery('Invalid study standard');
  if (tag && !validTag.test(tag)) invalidQuery('Invalid tag');
  if (!['newest', 'oldest', 'title'].includes(sort)) invalidQuery('Invalid sort');
  const limit = integer(Number(query.limit ?? 12), 'limit', 1, 50);
  const filters = JSON.stringify([q, zone, standard, tag, sort]);
  const cursor = query.cursor ?? '';
  const after = cursor ? decoded(cursor) : null;
  if (after && (after.scope !== scope || after.filters !== filters))
    invalidQuery('Cursor does not match these filters');
  if (
    after &&
    (sort === 'title' ? typeof after.value !== 'string' : typeof after.value !== 'number')
  )
    invalidQuery('Invalid cursor');
  if (after && typeof after.value === 'string' && after.value.length > 160)
    invalidQuery('Invalid cursor');
  if (
    after &&
    typeof after.value === 'number' &&
    (!Number.isSafeInteger(after.value) || after.value < 0)
  )
    invalidQuery('Invalid cursor');
  return {
    params: { q, zone, standard, tag, sort: sort as DiscoverySort, limit, cursor },
    filters,
    after,
  };
}
function projection(row: Row): DiscoveryItem {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    tags: JSON.parse(row.tagsJson) as string[],
    zone: row.zone,
    standard: row.standard,
    componentCount: row.componentCount,
    versionId: row.versionId,
    publishedAt: row.publishedAt,
    author: { handle: row.authorHandle, displayName: row.authorName },
  };
}

export async function discoveryPage(
  c: Context<ApiEnv>,
  scope: DiscoveryScope,
  input: Record<string, string>,
) {
  const { params, filters, after } = parseDiscoveryQuery(input, scope);
  c.set('db', c.env.DB.withSession('first-primary'));
  const where = [
    "p.status='published'",
    "p.moderation='visible'",
    'p.current_version_id=d.version_id',
  ];
  const args: unknown[] = [];
  if (params.q) {
    where.push('d.id IN (SELECT rowid FROM publication_fts WHERE publication_fts MATCH ?)');
    args.push(matchQuery(params.q));
  }
  if (params.zone !== 'all') {
    where.push('d.zone=?');
    args.push(params.zone);
  }
  if (params.standard !== 'all') {
    where.push('d.standard=?');
    args.push(params.standard);
  }
  if (params.tag) {
    where.push(
      'EXISTS(SELECT 1 FROM publication_tags t WHERE t.publication_id=d.publication_id AND t.tag=?)',
    );
    args.push(params.tag);
  }
  if (scope !== 'explore') {
    const guard = actorGuard(c, Date.now(), false);
    where.push(`(${guard.sql})`);
    args.push(...guard.args);
    if (scope === 'mine') {
      where.push('d.owner_id=?');
      args.push(c.get('actor').id);
    } else {
      where.push(
        'EXISTS(SELECT 1 FROM follows f WHERE f.follower_id=? AND f.followed_id=d.owner_id)',
      );
      args.push(c.get('actor').id);
    }
  }
  if (after) {
    if (params.sort === 'title') {
      where.push('(d.title COLLATE NOCASE>? OR (d.title COLLATE NOCASE=? AND d.publication_id>?))');
      args.push(after.value, after.value, after.id);
    } else {
      const comparator = params.sort === 'newest' ? '<' : '>';
      where.push(
        `(d.published_at${comparator}? OR (d.published_at=? AND d.publication_id${comparator}?))`,
      );
      args.push(after.value, after.value, after.id);
    }
  }
  const sql = `SELECT d.publication_id AS id,d.owner_id AS ownerId,d.slug,d.title,d.description,d.tags AS tagsJson,d.zone,d.standard,d.component_count AS componentCount,d.version_id AS versionId,d.published_at AS publishedAt,
    p.revision AS publicationRevision,a.revision AS profileRevision,
    CASE WHEN a.profile_visibility='public' AND a.moderation='visible' THEN a.handle ELSE NULL END AS authorHandle,
    CASE WHEN a.profile_visibility='public' AND a.moderation='visible' THEN COALESCE(a.display_name,'Community member') ELSE 'Community member' END AS authorName
    FROM publication_discovery d JOIN publications p ON p.id=d.publication_id
    LEFT JOIN profiles a ON a.user_id=d.owner_id
    WHERE ${where.join(' AND ')} ORDER BY ${orderSql[params.sort]} LIMIT ?`;
  const found = await c
    .get('db')
    .prepare(sql)
    .bind(...args, params.limit + 1)
    .all<Row>();
  const rows = found.results.slice(0, params.limit);
  const last = rows.at(-1);
  const nextCursor =
    found.results.length > params.limit && last
      ? encoded({
          scope,
          filters,
          value: params.sort === 'title' ? last.title : last.publishedAt,
          id: last.id,
        })
      : null;
  return { items: rows.map(projection), nextCursor, params, rows };
}

export async function recheckDiscovery(c: Context<ApiEnv>, rows: Row[], scope: DiscoveryScope) {
  c.set('db', c.env.DB.withSession('first-primary'));
  if (scope !== 'explore') {
    const guard = actorGuard(c, Date.now(), false);
    const alive = await c
      .get('db')
      .prepare(`SELECT 1 AS alive WHERE ${guard.sql}`)
      .bind(...guard.args)
      .first();
    if (!alive) throw new HTTPException(401, { message: 'Feed session changed; reload' });
  }
  if (!rows.length) return;
  const placeholders = rows.map(() => '?').join(',');
  const current = await c
    .get('db')
    .prepare(`SELECT d.publication_id AS id,d.version_id AS versionId,p.revision AS publicationRevision,a.revision AS profileRevision,
      CASE WHEN a.profile_visibility='public' AND a.moderation='visible' THEN a.handle ELSE NULL END AS authorHandle,
      CASE WHEN a.profile_visibility='public' AND a.moderation='visible' THEN COALESCE(a.display_name,'Community member') ELSE 'Community member' END AS authorName
      FROM publication_discovery d JOIN publications p ON p.id=d.publication_id
      LEFT JOIN profiles a ON a.user_id=d.owner_id
      WHERE d.publication_id IN (${placeholders}) AND p.status='published' AND p.moderation='visible' AND p.current_version_id=d.version_id`)
    .bind(...rows.map((row) => row.id))
    .all<
      Pick<
        Row,
        | 'id'
        | 'versionId'
        | 'publicationRevision'
        | 'profileRevision'
        | 'authorHandle'
        | 'authorName'
      >
    >();
  const byId = new Map(current.results.map((row) => [row.id, row]));
  if (
    rows.some((row) => {
      const latest = byId.get(row.id);
      return (
        !latest ||
        latest.versionId !== row.versionId ||
        latest.publicationRevision !== row.publicationRevision ||
        latest.profileRevision !== row.profileRevision ||
        latest.authorHandle !== row.authorHandle ||
        latest.authorName !== row.authorName
      );
    })
  )
    throw new HTTPException(503, { message: 'Discovery changed; reload' });
  if (scope === 'following') {
    const owners = [...new Set(rows.map((row) => row.ownerId))];
    const marks = owners.map(() => '?').join(',');
    const follows = await c
      .get('db')
      .prepare(
        `SELECT followed_id AS id FROM follows WHERE follower_id=? AND followed_id IN (${marks})`,
      )
      .bind(c.get('actor').id, ...owners)
      .all<{ id: string }>();
    if (follows.results.length !== owners.length)
      throw new HTTPException(503, { message: 'Feed changed; reload' });
  }
  if (scope === 'mine' && rows.some((row) => row.ownerId !== c.get('actor').id)) {
    throw new HTTPException(503, { message: 'Feed changed; reload' });
  }
}
