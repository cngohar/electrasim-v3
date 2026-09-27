// V3 D1 schema — Drizzle SQLite.
// - electrical_standards IMMUTABLE (read-only projection, seeded from domain/standards.ts).
// - Better Auth tables re-exported from auth-schema.ts so drizzle-kit sees the full schema.
import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ── Electrical standards — immutable, seeded from packages/domain/src/standards.ts at build ──
export const electricalStandards = sqliteTable('electrical_standards', {
  code: text('code').primaryKey(), // uk | us | eu | int
  label: text('label').notNull(),
  shortLabel: text('shortLabel').notNull(),
  citation: text('citation').notNull(),
  flag: text('flag').notNull(),
  nominalVoltage: integer('nominalVoltage').notNull(),
  frequencyHz: integer('frequencyHz').notNull(),
  wireColorsJson: text('wireColorsJson').notNull(),
  wireColorsDarkJson: text('wireColorsDarkJson').notNull(),
  voltageDropJson: text('voltageDropJson').notNull(),
  defaultMcbCurve: text('defaultMcbCurve'),
  motorMcbCurve: text('motorMcbCurve'),
  rcdThresholdMa: integer('rcdThresholdMa').notNull(),
  rcdRequiredOnSockets: integer('rcdRequiredOnSockets', { mode: 'boolean' }).notNull(),
  socketCircuitAmps: integer('socketCircuitAmps').notNull(),
  lightingCircuitAmps: integer('lightingCircuitAmps').notNull(),
  conductorLegendJson: text('conductorLegendJson').notNull(),
  metadataJson: text('metadataJson').notNull().default('{}'),
  version: text('version').notNull().default('2'),
  seededAt: integer('seededAt', { mode: 'timestamp' }).notNull(),
});

// ── Health / smoke table for local D1 verification ──
export const appMeta = sqliteTable('app_meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

// ── Better Auth — re-export so drizzle-kit generates migrations for all tables ──
export * from './auth-schema';
export * from './membership-schema';

// ── i18n foundation (0.4) ──
export const i18nStrings = sqliteTable('i18n_strings', {
  key: text('key').notNull(), // e.g. nav.home, simulator.canvas.wire
  locale: text('locale').notNull(), // en | fr | de | ...
  value: text('value').notNull(),
  namespace: text('namespace').notNull().default('common'), // common | simulator | lms | community | email
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});

export const contentPages = sqliteTable('content_pages', {
  slug: text('slug').notNull(),
  locale: text('locale').notNull().default('en'),
  title: text('title').notNull(),
  body: text('body').notNull(),
  seoJson: text('seoJson'),
  status: text('status').notNull().default('published'),
  authorId: text('authorId'),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull(),
});
