// SQL migration 0011 also owns immutable-version and terminal-tombstone triggers.
import { sql } from 'drizzle-orm';
import {
  type AnySQLiteColumn,
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema';
import { profiles } from './profile-schema';
export const publications = sqliteTable(
  'publications',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => profiles.userId),
    sourceCircuitId: text('source_circuit_id').notNull(),
    slug: text('slug').notNull().unique(),
    status: text('status').notNull().default('published'),
    moderation: text('moderation').notNull().default('visible'),
    currentVersionId: text('current_version_id').references(
      (): AnySQLiteColumn => publicationVersions.id,
    ),
    revision: integer('revision').notNull().default(1),
    mutationId: text('mutation_id').notNull(),
    publishedAt: integer('published_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    zone: text('zone').notNull().default('general'),
    standard: text('standard').notNull().default('int'),
  },
  (t) => [
    uniqueIndex('publication_source').on(t.ownerId, t.sourceCircuitId),
    index('publications_owner').on(t.ownerId, t.updatedAt, t.id),
    index('publications_review').on(t.moderation, t.updatedAt, t.id),
    check(
      'publication_slug',
      sql`length(${t.slug}) BETWEEN 10 AND 100 AND ${t.slug} NOT GLOB '*[^a-z0-9-]*'`,
    ),
    check('publication_status', sql`${t.status} IN ('published','unpublished','deleted')`),
    check('publication_moderation', sql`${t.moderation} IN ('visible','hidden','removed')`),
    check(
      'publication_zone',
      sql`${t.zone} IN ('general','lighting','protection','control','power')`,
    ),
    check('publication_standard', sql`${t.standard} IN ('int','uk','us','eu')`),
    check(
      'publication_revision',
      sql`typeof(${t.revision})='integer' AND ${t.revision} BETWEEN 1 AND 9007199254740991`,
    ),
    check(
      'publication_dates',
      sql`typeof(${t.publishedAt})='integer' AND ${t.publishedAt}>=0 AND typeof(${t.updatedAt})='integer' AND ${t.updatedAt}>=${t.publishedAt}`,
    ),
  ],
);
export const publicationVersions = sqliteTable(
  'publication_versions',
  {
    id: text('id').primaryKey(),
    publicationId: text('publication_id')
      .notNull()
      .references(() => publications.id),
    versionNumber: integer('version_number').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    tagsJson: text('tags_json').notNull(),
    allowForks: integer('allow_forks').notNull(),
    circuitJson: text('circuit_json').notNull(),
    circuitSchemaVersion: integer('circuit_schema_version').notNull(),
    requirementsJson: text('requirements_json').notNull(),
    componentPolicyRevision: integer('component_policy_revision').notNull(),
    modelVersion: text('model_version').notNull(),
    engineVersion: text('engine_version').notNull(),
    controlEngineVersion: text('control_engine_version').notNull(),
    fingerprint: text('fingerprint').notNull(),
    validatedAt: integer('validated_at').notNull(),
    verifiedAt: integer('verified_at'),
    sourceVersion: integer('source_version').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => profiles.userId),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('publication_version_number').on(t.publicationId, t.versionNumber),
    check(
      'publication_version_integer',
      sql`typeof(${t.versionNumber})='integer' AND ${t.versionNumber} BETWEEN 1 AND 9007199254740991`,
    ),
    check(
      'publication_version_text',
      sql`length(trim(${t.title})) BETWEEN 1 AND 160 AND length(${t.description})<=2000`,
    ),
    check(
      'publication_version_tags',
      sql`json_valid(${t.tagsJson}) AND json_type(${t.tagsJson})='array' AND json_array_length(${t.tagsJson})<=8`,
    ),
    check('publication_version_flags', sql`${t.allowForks} IN (0,1)`),
    check(
      'publication_version_circuit',
      sql`json_valid(${t.circuitJson}) AND json_type(${t.circuitJson})='object' AND ${t.circuitSchemaVersion}>0`,
    ),
    check(
      'publication_version_requirements',
      sql`json_valid(${t.requirementsJson}) AND json_type(${t.requirementsJson})='array' AND ${t.componentPolicyRevision}>=1`,
    ),
    check(
      'publication_version_fingerprint',
      sql`length(${t.fingerprint})=64 AND ${t.fingerprint} NOT GLOB '*[^a-f0-9]*'`,
    ),
    check(
      'publication_version_dates',
      sql`typeof(${t.validatedAt})='integer' AND ${t.validatedAt}>=0 AND typeof(${t.createdAt})='integer' AND ${t.createdAt}>=0 AND ${t.verifiedAt} IS NULL`,
    ),
    check(
      'publication_source_version',
      sql`typeof(${t.sourceVersion})='integer' AND ${t.sourceVersion}>=1`,
    ),
  ],
);
export const publicationTags = sqliteTable(
  'publication_tags',
  {
    publicationId: text('publication_id')
      .notNull()
      .references(() => publications.id),
    tag: text('tag').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.publicationId, t.tag] }),
    index('publication_tags_lookup').on(t.tag, t.publicationId),
    check(
      'publication_tag',
      sql`length(${t.tag}) BETWEEN 2 AND 24 AND ${t.tag} NOT GLOB '*[^a-z0-9-]*'`,
    ),
  ],
);
export const publicationWriteWindows = sqliteTable(
  'publication_write_windows',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id),
    windowStart: integer('window_start').notNull(),
    writes: integer('writes').notNull(),
  },
  (t) => [
    check(
      'publication_write_limit',
      sql`typeof(${t.writes})='integer' AND ${t.writes} BETWEEN 1 AND 120`,
    ),
  ],
);
export const publicationReports = sqliteTable(
  'publication_reports',
  {
    id: text('id').primaryKey(),
    reporterId: text('reporter_id')
      .notNull()
      .references(() => user.id),
    publicationId: text('publication_id')
      .notNull()
      .references(() => publications.id),
    versionId: text('version_id')
      .notNull()
      .references(() => publicationVersions.id),
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
    uniqueIndex('publication_report_unique').on(t.reporterId, t.publicationId),
    index('publication_reports_queue').on(t.status, t.createdAt, t.id),
    index('publication_reports_subject').on(t.publicationId, t.status, t.createdAt, t.id),
    index('publication_reports_daily').on(t.reporterId, t.createdAt),
    check(
      'publication_report_reason',
      sql`${t.reason} IN ('Unsafe or misleading','Harassment or hate','Spam','Other')`,
    ),
    check('publication_report_details', sql`length(trim(${t.details})) BETWEEN 1 AND 500`),
    check('publication_report_status', sql`${t.status} IN ('open','resolved','dismissed')`),
    check(
      'publication_report_revision',
      sql`typeof(${t.revision})='integer' AND ${t.revision} BETWEEN 1 AND 9007199254740991`,
    ),
    check(
      'publication_report_resolution',
      sql`${t.resolution} IS NULL OR length(trim(${t.resolution})) BETWEEN 8 AND 1000`,
    ),
    check(
      'publication_report_outcome',
      sql`(${t.status}='open' AND ${t.resolution} IS NULL AND ${t.resolvedBy} IS NULL) OR (${t.status}!='open' AND ${t.resolution} IS NOT NULL AND ${t.resolvedBy} IS NOT NULL)`,
    ),
    check('publication_report_dates', sql`${t.updatedAt}>=${t.createdAt}`),
  ],
);
