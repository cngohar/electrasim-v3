import { sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema';

// Membership times are UTC Unix milliseconds (numbers at the API boundary).
// No cascading deletes: grants and audit are durable history.
export const proFeatures = sqliteTable('pro_features', {
  key: text('key').primaryKey(),
  handler: text('handler').notNull(),
  name: text('name', { mode: 'json' }).$type<Record<string, string>>().notNull(),
  description: text('description', { mode: 'json' }).$type<Record<string, string>>().notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  archivedAt: integer('archived_at'),
  version: integer('version').notNull().default(1),
  mutationId: text('mutation_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
  createdBy: text('created_by').references(() => user.id),
  updatedBy: text('updated_by').references(() => user.id),
});

export const plans = sqliteTable(
  'plans',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    priceMinor: integer('price_minor'),
    currency: text('currency'),
    durationDays: integer('duration_days'),
    noExpiry: integer('no_expiry', { mode: 'boolean' }).notNull(),
    status: text('status', { enum: ['draft', 'active', 'archived'] }).notNull(),
    version: integer('version').notNull().default(1),
    mutationId: text('mutation_id').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => user.id),
  },
  (t) => [
    check(
      'plans_duration',
      sql`(${t.noExpiry} = 1 AND ${t.durationDays} IS NULL) OR (${t.noExpiry} = 0 AND ${t.durationDays} IS NOT NULL AND ${t.durationDays} > 0)`,
    ),
    check(
      'plans_price',
      sql`(${t.priceMinor} IS NULL AND ${t.currency} IS NULL) OR (${t.priceMinor} IS NOT NULL AND ${t.priceMinor} >= 0 AND ${t.currency} IS NOT NULL)`,
    ),
    check('plans_status', sql`${t.status} IN ('draft','active','archived')`),
  ],
);

export const planFeatures = sqliteTable(
  'plan_features',
  {
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id),
    featureKey: text('feature_key')
      .notNull()
      .references(() => proFeatures.key),
    enabled: integer('enabled', { mode: 'boolean' }).notNull(),
    config: text('config', { mode: 'json' }).$type<Record<string, never>>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.planId, t.featureKey] }),
    index('plan_features_key_idx').on(t.featureKey),
  ],
);

export const entitlements = sqliteTable(
  'entitlements',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    planId: text('plan_id')
      .notNull()
      .references(() => plans.id),
    source: text('source', { enum: ['manual'] })
      .notNull()
      .default('manual'),
    status: text('status', { enum: ['active', 'suspended', 'revoked'] }).notNull(),
    startsAt: integer('starts_at').notNull(),
    endsAt: integer('ends_at'),
    noExpiry: integer('no_expiry', { mode: 'boolean' }).notNull(),
    reason: text('reason').notNull(),
    version: integer('version').notNull().default(1),
    mutationId: text('mutation_id').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    updatedBy: text('updated_by')
      .notNull()
      .references(() => user.id),
  },
  (t) => [
    check(
      'entitlements_validity',
      sql`(${t.noExpiry} = 1 AND ${t.endsAt} IS NULL) OR (${t.noExpiry} = 0 AND ${t.endsAt} IS NOT NULL AND ${t.endsAt} > ${t.startsAt})`,
    ),
    check('entitlements_source', sql`${t.source} = 'manual'`),
    check('entitlements_status', sql`${t.status} IN ('active','suspended','revoked')`),
    index('entitlements_user_validity_idx').on(t.userId, t.status, t.startsAt, t.endsAt),
    index('entitlements_plan_idx').on(t.planId),
  ],
);

// Actor/target are historical identifiers, intentionally not cascading FKs.
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    before: text('before_json', { mode: 'json' }),
    after: text('after_json', { mode: 'json' }),
    reason: text('reason').notNull(),
    requestId: text('request_id').notNull(),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [
    index('audit_logs_time_idx').on(t.createdAt, t.id),
    index('audit_logs_target_idx').on(t.targetType, t.targetId),
  ],
);
