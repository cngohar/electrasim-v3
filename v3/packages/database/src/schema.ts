import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    email: text("email_normalized").notNull(),
    name: text("display_name").notNull(),
    emailVerified: boolean("email_verified").notNull().default(false),
    image: text("image"),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    adultEligibilityConfirmedAt: timestamp("adult_eligibility_confirmed_at", {
      withTimezone: true,
    }),
    primaryGoal: text("primary_goal").$type<
      "learn" | "teach_independently" | "join_or_manage_institution"
    >(),
    experienceLevel: text("experience_level").$type<
      "new" | "student_or_apprentice" | "working_professional"
    >(),
    supplyFamily: text("supply_family").$type<"us_110_120" | "international_230_240">(),
    accessibilityPresentedAt: timestamp("accessibility_presented_at", {
      withTimezone: true,
    }),
    safetyTermsVersion: text("safety_terms_version"),
    onboardingCompletedAt: timestamp("onboarding_completed_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_normalized_uq").on(table.email),
    check("users_email_normalized_ck", sql`${table.email} = lower(trim(${table.email}))`),
  ],
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey(),
    type: text("type").$type<"personal" | "independent_instructor" | "institution">().notNull(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    personalOwnerUserId: uuid("personal_owner_user_id").references(() => users.id),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspaces_slug_uq").on(table.slug),
    uniqueIndex("workspaces_personal_owner_uq")
      .on(table.personalOwnerUserId)
      .where(sql`${table.type} = 'personal'`),
    check(
      "workspaces_type_ck",
      sql`${table.type} in ('personal', 'independent_instructor', 'institution')`,
    ),
    check(
      "workspaces_personal_owner_ck",
      sql`(${table.type} = 'personal' and ${table.personalOwnerUserId} is not null) or (${table.type} <> 'personal' and ${table.personalOwnerUserId} is null)`,
    ),
  ],
);

export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").$type<"active" | "invited" | "suspended" | "left">().notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("workspace_memberships_workspace_user_uq").on(table.workspaceId, table.userId),
    index("workspace_memberships_user_idx").on(table.userId),
    check(
      "workspace_memberships_status_ck",
      sql`${table.status} in ('active', 'invited', 'suspended', 'left')`,
    ),
  ],
);

export const institutions = pgTable(
  "institutions",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    legalName: text("legal_name").notNull(),
    displayName: text("display_name").notNull(),
    verifiedDomain: text("verified_domain"),
    countryCode: text("country_code").notNull(),
    timezone: text("timezone").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("institutions_workspace_uq").on(table.workspaceId),
    uniqueIndex("institutions_id_workspace_uq").on(table.id, table.workspaceId),
  ],
);

export const campuses = pgTable(
  "campuses",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    institutionId: uuid("institution_id").notNull(),
    name: text("name").notNull(),
    code: text("code"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("campuses_workspace_idx").on(table.workspaceId),
    uniqueIndex("campuses_id_workspace_uq").on(table.id, table.workspaceId),
    foreignKey({
      name: "campuses_institution_workspace_fk",
      columns: [table.institutionId, table.workspaceId],
      foreignColumns: [institutions.id, institutions.workspaceId],
    }),
  ],
);

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    institutionId: uuid("institution_id").notNull(),
    campusId: uuid("campus_id"),
    parentDepartmentId: uuid("parent_department_id"),
    name: text("name").notNull(),
    code: text("code"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("departments_workspace_idx").on(table.workspaceId),
    uniqueIndex("departments_id_workspace_uq").on(table.id, table.workspaceId),
    foreignKey({
      name: "departments_institution_workspace_fk",
      columns: [table.institutionId, table.workspaceId],
      foreignColumns: [institutions.id, institutions.workspaceId],
    }),
    foreignKey({
      name: "departments_campus_workspace_fk",
      columns: [table.campusId, table.workspaceId],
      foreignColumns: [campuses.id, campuses.workspaceId],
    }),
  ],
);

export const permissions = pgTable("permissions", {
  key: text("key").primaryKey(),
  description: text("description").notNull(),
  scopeType: text("scope_type").$type<"platform" | "workspace" | "course">().notNull(),
  highRisk: boolean("high_risk").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const roles = pgTable(
  "roles",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id),
    key: text("key").notNull(),
    name: text("name").notNull(),
    scopeType: text("scope_type").$type<"platform" | "workspace" | "course">().notNull(),
    system: boolean("system").notNull().default(false),
    permissionVersion: integer("permission_version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("roles_scope_workspace_key_uq").on(
      table.scopeType,
      sql`coalesce(${table.workspaceId}, '00000000-0000-0000-0000-000000000000'::uuid)`,
      table.key,
    ),
    check("roles_scope_type_ck", sql`${table.scopeType} in ('platform', 'workspace', 'course')`),
    check(
      "roles_platform_workspace_ck",
      sql`(${table.scopeType} = 'platform' and ${table.workspaceId} is null) or ${table.scopeType} <> 'platform'`,
    ),
  ],
);

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    permissionKey: text("permission_key")
      .notNull()
      .references(() => permissions.key),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.roleId, table.permissionKey] })],
);

export const membershipRoleAssignments = pgTable(
  "membership_role_assignments",
  {
    membershipId: uuid("membership_id")
      .notNull()
      .references(() => workspaceMemberships.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    grantedByUserId: uuid("granted_by_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.membershipId, table.roleId] })],
);

export const platformRoleAssignments = pgTable(
  "platform_role_assignments",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    grantedByUserId: uuid("granted_by_user_id")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.roleId] })],
);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    emailNormalized: text("email_normalized").notNull(),
    tokenHash: text("token_hash").notNull(),
    status: text("status").$type<"pending" | "accepted" | "revoked" | "expired">().notNull(),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("invitations_token_hash_uq").on(table.tokenHash),
    index("invitations_workspace_email_idx").on(table.workspaceId, table.emailNormalized),
    check(
      "invitations_status_ck",
      sql`${table.status} in ('pending', 'accepted', 'revoked', 'expired')`,
    ),
  ],
);

export const invitationRoles = pgTable(
  "invitation_roles",
  {
    invitationId: uuid("invitation_id")
      .notNull()
      .references(() => invitations.id),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
  },
  (table) => [primaryKey({ columns: [table.invitationId, table.roleId] })],
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => users.id),
    supportActorUserId: uuid("support_actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    requestId: text("request_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_events_workspace_time_idx").on(table.workspaceId, table.occurredAt),
    index("audit_events_actor_time_idx").on(table.actorUserId, table.occurredAt),
  ],
);

export const outboxEvents = pgTable(
  "outbox_events",
  {
    id: uuid("id").primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id),
    topic: text("topic").notNull(),
    aggregateType: text("aggregate_type").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("outbox_events_pending_idx").on(table.processedAt, table.availableAt)],
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("sessions_token_uq").on(table.token),
    uniqueIndex("sessions_id_user_uq").on(table.id, table.userId),
    index("sessions_user_idx").on(table.userId),
    index("sessions_expiry_idx").on(table.expiresAt),
  ],
);

export const stepUpSessions = pgTable(
  "step_up_sessions",
  {
    id: uuid("id").primaryKey(),
    sessionId: uuid("session_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    method: text("method").$type<"password" | "passkey">().notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    requestId: text("request_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "step_up_sessions_session_user_fk",
      columns: [table.sessionId, table.userId],
      foreignColumns: [sessions.id, sessions.userId],
    }).onDelete("cascade"),
    index("step_up_sessions_session_expiry_idx").on(table.sessionId, table.expiresAt),
    check("step_up_sessions_method_ck", sql`${table.method} in ('password', 'passkey')`),
    check("step_up_sessions_expiry_ck", sql`${table.expiresAt} > ${table.verifiedAt}`),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("accounts_provider_account_uq").on(table.providerId, table.accountId),
    index("accounts_user_idx").on(table.userId),
  ],
);

export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);

export const passkeys = pgTable(
  "passkeys",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    aaguid: text("aaguid"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex("passkeys_credential_uq").on(table.credentialID),
    index("passkeys_user_idx").on(table.userId),
  ],
);

export const twoFactors = pgTable(
  "two_factors",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    verified: boolean("verified").notNull().default(false),
    failedVerificationCount: integer("failed_verification_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
  },
  (table) => [index("two_factors_user_idx").on(table.userId)],
);

export const identityOperations = pgTable(
  "identity_operations",
  {
    idempotencyKey: text("idempotency_key").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    operation: text("operation").notNull(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("identity_operations_user_idx").on(table.userId)],
);

export const durableSystemJobs = pgTable(
  "durable_system_jobs",
  {
    id: text("id").primaryKey(),
    type: text("type").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status")
      .$type<"pending" | "processing" | "completed" | "failed">()
      .notNull()
      .default("pending"),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(8),
    leaseOwner: text("lease_owner"),
    leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("durable_system_jobs_claim_idx").on(table.availableAt, table.createdAt),
    index("durable_system_jobs_expired_lease_idx").on(table.leaseExpiresAt),
    check(
      "durable_system_jobs_status_ck",
      sql`${table.status} in ('pending', 'processing', 'completed', 'failed')`,
    ),
    check(
      "durable_system_jobs_attempts_ck",
      sql`${table.attempts} >= 0 and ${table.maxAttempts} > 0 and ${table.attempts} <= ${table.maxAttempts}`,
    ),
  ],
);

export const accountEntitlements = pgTable(
  "account_entitlements",
  {
    id: uuid("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entitlementKey: text("entitlement_key").$type<"simulator_pro">().notNull(),
    source: text("source")
      .$type<"manual" | "binance_pay" | "nowpayments" | "promotion">()
      .notNull(),
    sourceReference: text("source_reference"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("account_entitlements_user_active_idx").on(
      table.userId,
      table.entitlementKey,
      table.expiresAt,
    ),
  ],
);

export const authSchema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  passkey: passkeys,
  twoFactor: twoFactors,
} as const;
