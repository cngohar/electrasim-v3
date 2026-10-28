import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema';

// Migration 0009 also enforces immutable baseline and protected override triggers.
export const componentAccessBaseline = sqliteTable(
  'component_access_baseline',
  {
    componentId: text('component_id').primaryKey(),
    originalTier: text('original_tier', { enum: ['basic', 'pro'] }).notNull(),
  },
  (t) => [check('component_access_original_tier', sql`${t.originalTier} IN ('basic','pro')`)],
);
export const componentAccessRevision = sqliteTable(
  'component_access_revision',
  {
    id: integer('id').primaryKey(),
    revision: integer('revision').notNull().default(1),
  },
  (t) => [
    check('component_access_singleton', sql`${t.id} = 1`),
    check(
      'component_access_revision_valid',
      sql`typeof(${t.revision}) = 'integer' AND ${t.revision} BETWEEN 1 AND 9007199254740991`,
    ),
  ],
);
export const componentAccessOverrides = sqliteTable(
  'component_access_overrides',
  {
    componentId: text('component_id')
      .primaryKey()
      .references(() => componentAccessBaseline.componentId),
    access: text('access', { enum: ['free', 'pro'] }).notNull(),
    version: integer('version').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    check('component_access_value', sql`${t.access} IN ('free','pro')`),
    check(
      'component_access_override_version',
      sql`typeof(${t.version}) = 'integer' AND ${t.version} BETWEEN 1 AND 9007199254740991`,
    ),
    check(
      'component_access_created_at',
      sql`typeof(${t.createdAt}) = 'integer' AND ${t.createdAt} BETWEEN 0 AND 9007199254740991`,
    ),
    check(
      'component_access_updated_at',
      sql`typeof(${t.updatedAt}) = 'integer' AND ${t.updatedAt} BETWEEN ${t.createdAt} AND 9007199254740991`,
    ),
  ],
);
