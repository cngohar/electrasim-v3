// SQL migration 0012 owns the FTS5 virtual table and synchronization triggers.
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { profiles } from './profile-schema';
import { publicationVersions, publications } from './publication-schema';

export const publicationDiscovery = sqliteTable(
  'publication_discovery',
  {
    id: integer('id').primaryKey(),
    publicationId: text('publication_id')
      .notNull()
      .references(() => publications.id),
    ownerId: text('owner_id')
      .notNull()
      .references(() => profiles.userId),
    versionId: text('version_id')
      .notNull()
      .references(() => publicationVersions.id),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    tags: text('tags').notNull(),
    authorHandle: text('author_handle').notNull(),
    zone: text('zone').notNull(),
    standard: text('standard').notNull(),
    componentCount: integer('component_count').notNull(),
    publishedAt: integer('published_at').notNull(),
  },
  (t) => [
    uniqueIndex('publication_discovery_publication').on(t.publicationId),
    index('publication_discovery_recent').on(t.publishedAt, t.publicationId),
    index('publication_discovery_zone_recent').on(t.zone, t.publishedAt, t.publicationId),
    index('publication_discovery_standard_recent').on(t.standard, t.publishedAt, t.publicationId),
    index('publication_discovery_title').on(t.title, t.publicationId),
    index('publication_discovery_owner_recent').on(t.ownerId, t.publishedAt, t.publicationId),
  ],
);

export const follows = sqliteTable(
  'follows',
  {
    followerId: text('follower_id')
      .notNull()
      .references(() => profiles.userId),
    followedId: text('followed_id')
      .notNull()
      .references(() => profiles.userId),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followedId] }),
    index('follows_followed').on(t.followedId, t.followerId),
    check('follows_no_self', sql`${t.followerId}!=${t.followedId}`),
  ],
);
