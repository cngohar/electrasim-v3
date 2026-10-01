import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth-schema';

export const circuits = sqliteTable(
  'circuits',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    name: text('name').notNull(),
    content: text('content').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('circuits_owner_updated').on(t.userId, t.updatedAt)],
);

/** Server-owned scenario and progress. Client scores or requirement claims are never stored. */
export const diagnosisAttempts = sqliteTable(
  'diagnosis_attempts',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    scenario: text('scenario').notNull(),
    circuit: text('circuit').notNull(),
    progress: text('progress').notNull(),
    version: integer('version').notNull().default(1),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('diagnosis_attempts_owner').on(t.userId, t.updatedAt)],
);
