import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema';
export const profileReservedHandles = sqliteTable('profile_reserved_handles', {
  handle: text('handle').primaryKey(),
});
export const profiles = sqliteTable(
  'profiles',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id),
    handle: text('handle').unique(),
    displayName: text('display_name').notNull().default('Community member'),
    bio: text('bio').notNull().default(''),
    institution: text('institution').notNull().default(''),
    level: text('level').notNull().default(''),
    avatarKey: text('avatar_key'),
    visibility: text('profile_visibility', { enum: ['public', 'private'] })
      .notNull()
      .default('private'),
    showInstitution: integer('show_institution', { mode: 'boolean' }).notNull().default(false),
    showLevel: integer('show_level', { mode: 'boolean' }).notNull().default(false),
    allowForks: integer('allow_forks', { mode: 'boolean' }).notNull().default(true),
    moderation: text('moderation', { enum: ['visible', 'hidden', 'removed'] })
      .notNull()
      .default('visible'),
    revision: integer('revision').notNull().default(1),
    mutationId: text('mutation_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('profiles_review').on(t.moderation, t.updatedAt, t.userId),
    index('profiles_name').on(sql`lower(${t.displayName})`, t.userId),
    check(
      'profile_handle',
      sql`${t.handle} IS NULL OR (length(${t.handle}) BETWEEN 3 AND 24 AND ${t.handle} GLOB '[a-z]*' AND ${t.handle} NOT GLOB '*[^a-z0-9_]*')`,
    ),
    check('profile_name', sql`length(trim(${t.displayName})) BETWEEN 1 AND 60`),
    check('profile_bio', sql`length(${t.bio})<=280`),
    check('profile_institution', sql`length(${t.institution})<=100`),
    check('profile_level', sql`length(${t.level})<=80`),
    check('profile_visibility', sql`${t.visibility} IN ('public','private')`),
    check('profile_moderation', sql`${t.moderation} IN ('visible','hidden','removed')`),
    check(
      'profile_flags',
      sql`${t.showInstitution} IN (0,1) AND ${t.showLevel} IN (0,1) AND ${t.allowForks} IN (0,1)`,
    ),
    check(
      'profile_revision',
      sql`typeof(${t.revision})='integer' AND ${t.revision} BETWEEN 1 AND 9007199254740991`,
    ),
    check(
      'profile_dates',
      sql`typeof(${t.createdAt})='integer' AND ${t.createdAt}>=0 AND typeof(${t.updatedAt})='integer' AND ${t.updatedAt}>=${t.createdAt}`,
    ),
  ],
);
export const profileWriteWindows = sqliteTable(
  'profile_write_windows',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id),
    windowStart: integer('window_start').notNull(),
    writes: integer('writes').notNull(),
  },
  (t) => [
    check(
      'profile_write_count',
      sql`typeof(${t.writes})='integer' AND ${t.writes} BETWEEN 1 AND 120`,
    ),
    check('profile_write_window', sql`typeof(${t.windowStart})='integer' AND ${t.windowStart}>=0`),
  ],
);
export const profileReports = sqliteTable(
  'profile_reports',
  {
    id: text('id').primaryKey(),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => user.id),
    targetUserId: text('target_user_id')
      .notNull()
      .references(() => profiles.userId),
    reason: text('reason').notNull(),
    details: text('details').notNull(),
    status: text('status').notNull().default('open'),
    revision: integer('revision').notNull().default(1),
    resolution: text('resolution'),
    resolvedBy: text('resolved_by').references(() => user.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('profile_reports_unique').on(t.reporterId, t.targetUserId),
    index('profile_reports_queue').on(t.status, t.createdAt, t.id),
    index('profile_reports_subject').on(t.targetUserId, t.status, t.createdAt, t.id),
    index('profile_reports_daily').on(t.reporterId, t.createdAt),
    check('profile_report_owner', sql`${t.reporterId}!=${t.targetUserId}`),
    check('profile_report_details', sql`length(trim(${t.details})) BETWEEN 1 AND 500`),
    check(
      'profile_report_reason',
      sql`${t.reason} IN ('Misleading identity','Harassment or hate','Inappropriate avatar','Spam','Other')`,
    ),
    check('profile_report_status', sql`${t.status} IN ('open','resolved','dismissed')`),
    check(
      'profile_report_revision',
      sql`typeof(${t.revision})='integer' AND ${t.revision} BETWEEN 1 AND 9007199254740991`,
    ),
    check(
      'profile_report_resolution',
      sql`${t.resolution} IS NULL OR length(trim(${t.resolution})) BETWEEN 8 AND 1000`,
    ),
    check(
      'profile_report_outcome',
      sql`(${t.status}='open' AND ${t.resolution} IS NULL AND ${t.resolvedBy} IS NULL) OR (${t.status}!='open' AND ${t.resolution} IS NOT NULL AND ${t.resolvedBy} IS NOT NULL)`,
    ),
    check(
      'profile_report_dates',
      sql`typeof(${t.createdAt})='integer' AND ${t.createdAt}>=0 AND typeof(${t.updatedAt})='integer' AND ${t.updatedAt}>=${t.createdAt}`,
    ),
  ],
);
export const profileAvatarGarbage = sqliteTable(
  'profile_avatar_garbage',
  {
    key: text('key').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => profiles.userId),
    eligibleAt: integer('eligible_at').notNull(),
  },
  (t) => [
    index('profile_avatar_cleanup').on(t.userId, t.eligibleAt, t.key),
    check('profile_avatar_expiry', sql`typeof(${t.eligibleAt})='integer' AND ${t.eligibleAt}>=0`),
  ],
);
