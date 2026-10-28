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
import { user } from './auth-schema';

export const adminRevision = sqliteTable(
  'admin_revision',
  {
    id: integer('id').primaryKey(),
    version: integer('version').notNull().default(1),
    mutationId: text('mutation_id'),
  },
  (t) => [
    check('admin_revision_singleton', sql`${t.id} = 1`),
    check('admin_revision_positive', sql`${t.version} > 0`),
  ],
);
export const adminRoles = sqliteTable(
  'admin_roles',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    archived: integer('archived').notNull().default(0),
    version: integer('version').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('admin_roles_name').on(sql`lower(${t.name})`),
    check('admin_roles_name_length', sql`length(${t.name}) BETWEEN 1 AND 80`),
    check('admin_roles_archived', sql`${t.archived} IN (0,1)`),
  ],
);
export const adminRolePermissions = sqliteTable(
  'admin_role_permissions',
  {
    roleId: text('role_id')
      .notNull()
      .references(() => adminRoles.id),
    permission: text('permission').notNull(),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permission] })],
);
export const adminUserRoles = sqliteTable(
  'admin_user_roles',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    roleId: text('role_id')
      .notNull()
      .references(() => adminRoles.id),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.roleId] }),
    index('admin_user_roles_role').on(t.roleId, t.userId),
  ],
);
export const adminPolicy = sqliteTable(
  'admin_policy',
  {
    globalRole: text('global_role').primaryKey(),
    permissionsJson: text('permissions_json').notNull(),
    version: integer('version').notNull(),
  },
  (t) => [
    check('admin_policy_roles', sql`${t.globalRole} IN ('moderator','admin')`),
    check('admin_policy_json', sql`json_valid(${t.permissionsJson})`),
  ],
);
export const adminSettings = sqliteTable(
  'admin_settings',
  {
    namespace: text('namespace').primaryKey(),
    valuesJson: text('values_json').notNull(),
    version: integer('version').notNull(),
  },
  (t) => [check('admin_settings_json', sql`json_valid(${t.valuesJson})`)],
);
export const accountControls = sqliteTable(
  'account_controls',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id),
    suspended: integer('suspended').notNull().default(0),
    endsAt: integer('ends_at'),
    version: integer('version').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [
    index('account_controls_active').on(t.suspended, t.endsAt, t.userId),
    check('account_controls_status', sql`${t.suspended} IN (0,1)`),
    check('account_controls_restored', sql`${t.suspended} = 1 OR ${t.endsAt} IS NULL`),
  ],
);
export const communityRestrictions = sqliteTable(
  'community_restrictions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    startsAt: integer('starts_at').notNull(),
    endsAt: integer('ends_at'),
    revokedAt: integer('revoked_at'),
    reason: text('reason').notNull(),
    actorId: text('actor_id')
      .notNull()
      .references(() => user.id),
    version: integer('version').notNull(),
  },
  (t) => [
    index('community_restrictions_user').on(t.userId, t.revokedAt, t.endsAt),
    check(
      'community_restrictions_validity',
      sql`${t.endsAt} IS NULL OR ${t.endsAt} > ${t.startsAt}`,
    ),
  ],
);
export const adminAudit = sqliteTable(
  'admin_audit',
  {
    id: text('id').primaryKey(),
    namespace: text('namespace').notNull(),
    actorId: text('actor_id').notNull(),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    beforeJson: text('before_json'),
    afterJson: text('after_json'),
    reason: text('reason').notNull(),
    requestId: text('request_id').notNull(),
    createdAt: integer('created_at').notNull(),
    version: integer('version').notNull(),
  },
  (t) => [
    index('admin_audit_scope').on(t.namespace, t.createdAt, t.id),
    index('admin_audit_target').on(t.targetId, t.createdAt, t.id),
    index('admin_audit_actor').on(t.actorId, t.createdAt, t.id),
    check('admin_audit_before_json', sql`${t.beforeJson} IS NULL OR json_valid(${t.beforeJson})`),
    check('admin_audit_after_json', sql`${t.afterJson} IS NULL OR json_valid(${t.afterJson})`),
  ],
);
