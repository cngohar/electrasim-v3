import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { PGlite } from "@electric-sql/pglite";

const database = new PGlite();
const migration = await Bun.file(
  new URL("../packages/database/migrations/0001_tenancy_foundation.sql", import.meta.url),
).text();
const authMigration = await Bun.file(
  new URL("../packages/database/migrations/0002_auth_account_lifecycle.sql", import.meta.url),
).text();
const authorizationMigration = await Bun.file(
  new URL("../packages/database/migrations/0003_authorization_catalog.sql", import.meta.url),
).text();
const systemJobsMigration = await Bun.file(
  new URL("../packages/database/migrations/0004_durable_system_jobs.sql", import.meta.url),
).text();
const stepUpMigration = await Bun.file(
  new URL("../packages/database/migrations/0005_step_up_sessions.sql", import.meta.url),
).text();
const contentStudioMigration = await Bun.file(
  new URL("../packages/database/migrations/0006_content_studio.sql", import.meta.url),
).text();
const simulatorProjectsMigration = await Bun.file(
  new URL("../packages/database/migrations/0007_simulator_projects.sql", import.meta.url),
).text();
const entitlementsMigration = await Bun.file(
  new URL("../packages/database/migrations/0008_account_entitlements.sql", import.meta.url),
).text();
const workspaceAdministrationMigration = await Bun.file(
  new URL("../packages/database/migrations/0009_workspace_administration.sql", import.meta.url),
).text();
const simulatorSchemaV2Migration = await Bun.file(
  new URL("../packages/database/migrations/0010_simulator_schema_v2.sql", import.meta.url),
).text();

beforeAll(async () => {
  await database.exec(migration);
  await database.exec(authMigration);
  await database.exec(authorizationMigration);
  await database.exec(systemJobsMigration);
  await database.exec(stepUpMigration);
  await database.exec(contentStudioMigration);
  await database.exec(simulatorProjectsMigration);
  await database.exec(entitlementsMigration);
  await database.exec(workspaceAdministrationMigration);
  await database.exec(simulatorSchemaV2Migration);
});

afterAll(async () => {
  await database.close();
});

describe("tenancy migration supplemental execution", () => {
  test("creates the complete initial table set", async () => {
    const result = await database.query<{ table_name: string }>(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name
    `);
    expect(result.rows.map((row) => row.table_name)).toEqual([
      "account_entitlements",
      "accounts",
      "audit_events",
      "campuses",
      "content_authors",
      "content_items",
      "content_media",
      "content_publication_events",
      "content_redirects",
      "content_revision_media",
      "content_revisions",
      "departments",
      "durable_system_jobs",
      "identity_operations",
      "institutions",
      "invitation_roles",
      "invitations",
      "membership_role_assignments",
      "outbox_events",
      "passkeys",
      "permissions",
      "platform_role_assignments",
      "role_permissions",
      "roles",
      "sessions",
      "simulator_project_revisions",
      "simulator_projects",
      "step_up_sessions",
      "two_factors",
      "users",
      "verifications",
      "workspace_memberships",
      "workspaces",
    ]);
  });

  test("enables and forces RLS in the PostgreSQL catalog", async () => {
    const result = await database.query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      select relname, relrowsecurity, relforcerowsecurity
      from pg_class
      where relname in ('workspaces', 'workspace_memberships', 'institutions', 'audit_events')
      order by relname
    `);
    expect(result.rows).toHaveLength(4);
    for (const row of result.rows) {
      expect(row.relrowsecurity).toBe(true);
      expect(row.relforcerowsecurity).toBe(true);
    }
  });

  test("creates a constrained global durable-job queue outside tenant RLS", async () => {
    const result = await database.query<{ relrowsecurity: boolean }>(`
      select relrowsecurity from pg_class where relname = 'durable_system_jobs'
    `);
    expect(result.rows).toEqual([{ relrowsecurity: false }]);
    await expect(
      database.exec(`
        insert into durable_system_jobs (id, type, payload, status)
        values ('bad-job', 'test', '{}', 'not-a-status')
      `),
    ).rejects.toThrow();
  });

  test("resolves active simulator Pro entitlement from authenticated user context", async () => {
    const userId = "10000000-0000-4000-8000-000000000008";
    await database.exec(`
      insert into users (id, email_normalized, display_name)
      values ('${userId}', 'entitlement@example.com', 'Entitled Member');
      insert into account_entitlements (id, user_id, entitlement_key, source)
      values ('20000000-0000-4000-8000-000000000008', '${userId}', 'simulator_pro', 'manual');
      begin;
      select set_config('app.current_user_id', '${userId}', true);
    `);
    const result = await database.query<{ active: boolean }>(
      "select app_private.has_active_entitlement('simulator_pro') as active",
    );
    await database.exec("rollback");
    expect(result.rows).toEqual([{ active: true }]);
  });

  test("discovers only the current member workspaces and permission-bounds roster PII", async () => {
    const userId = "10000000-0000-4000-8000-000000000009";
    const workspaceId = "30000000-0000-4000-8000-000000000009";
    const membershipId = "40000000-0000-4000-8000-000000000009";
    await database.exec(`
      insert into users (id, email_normalized, display_name, email_verified, onboarding_completed_at)
      values ('${userId}', 'owner@example.com', 'Institution Owner', true, now());
      insert into workspaces (id, type, name, slug, created_by_user_id)
      values ('${workspaceId}', 'institution', 'Lodhran Technical Institute', 'lodhran-tech', '${userId}');
      insert into institutions (id, workspace_id, legal_name, display_name, country_code, timezone)
      values ('50000000-0000-4000-8000-000000000009', '${workspaceId}', 'Lodhran Technical Institute', 'Lodhran Technical Institute', 'PK', 'Asia/Karachi');
      insert into workspace_memberships (id, workspace_id, user_id, status, joined_at)
      values ('${membershipId}', '${workspaceId}', '${userId}', 'active', now());
      insert into membership_role_assignments (membership_id, role_id, granted_by_user_id)
      values ('${membershipId}', '00000000-0000-7000-8300-000000000001', '${userId}');
      begin;
      select set_config('app.current_user_id', '${userId}', true);
    `);
    const workspaces = await database.query<{ workspace_name: string; role_keys: string[] }>(
      "select workspace_name, role_keys from app_private.list_my_workspaces()",
    );
    const roster = await database.query<{ display_name: string; email_normalized: string }>(
      `select display_name, email_normalized from app_private.get_workspace_roster('${workspaceId}')`,
    );
    await database.exec("rollback");
    expect(workspaces.rows).toEqual([
      { workspace_name: "Lodhran Technical Institute", role_keys: ["institution_owner"] },
    ]);
    expect(roster.rows).toEqual([
      { display_name: "Institution Owner", email_normalized: "owner@example.com" },
    ]);
  });

  test("keeps global Better Auth identity tables outside tenant RLS", async () => {
    const result = await database.query<{ relname: string; relrowsecurity: boolean }>(`
      select relname, relrowsecurity
      from pg_class
      where relname in ('users', 'sessions', 'accounts', 'verifications')
      order by relname
    `);
    expect(result.rows).toHaveLength(4);
    for (const row of result.rows) expect(row.relrowsecurity).toBe(false);
  });

  test("binds step-up proof to the same Better Auth session and user", async () => {
    const catalog = await database.query<{
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(`
      select relrowsecurity, relforcerowsecurity
      from pg_class where relname = 'step_up_sessions'
    `);
    expect(catalog.rows).toEqual([{ relrowsecurity: true, relforcerowsecurity: true }]);
    await database.exec(`
      insert into users (id, email_normalized, display_name) values
        ('10000000-0000-4000-8000-000000000001', 'step-one@example.test', 'Step One'),
        ('10000000-0000-4000-8000-000000000002', 'step-two@example.test', 'Step Two');
      insert into sessions (id, user_id, token, expires_at) values
        ('10000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000001', 'step-session-one', now() + interval '1 day');
      insert into step_up_sessions (
        id, session_id, user_id, method, verified_at, expires_at, request_id
      ) values (
        '10000000-0000-4000-8000-000000000021',
        '10000000-0000-4000-8000-000000000011',
        '10000000-0000-4000-8000-000000000001',
        'password', now(), now() + interval '10 minutes', 'step-request-one'
      );
    `);
    await expect(
      database.exec(`
        insert into step_up_sessions (
          id, session_id, user_id, method, verified_at, expires_at, request_id
        ) values (
          '10000000-0000-4000-8000-000000000022',
          '10000000-0000-4000-8000-000000000011',
          '10000000-0000-4000-8000-000000000002',
          'password', now(), now() + interval '10 minutes', 'step-request-two'
        )
      `),
    ).rejects.toThrow();
  });

  test("installs tenant and platform-assignment self-access policies", async () => {
    const result = await database.query<{ policyname: string }>(`
      select policyname from pg_policies
      where schemaname = 'public'
      order by policyname
    `);
    const policies = new Set(result.rows.map((row) => row.policyname));
    expect(policies.has("workspaces_current")).toBe(true);
    expect(policies.has("workspace_memberships_current")).toBe(true);
    expect(policies.has("platform_roles_self_select")).toBe(true);
    expect(policies.has("audit_events_current_insert")).toBe(true);
  });

  test("seeds separate platform, instructor, institution, and personal roles", async () => {
    const result = await database.query<{ key: string; scope_type: string }>(`
      select key, scope_type from roles
      where key in ('super_admin', 'personal_owner', 'owner_instructor', 'institution_admin')
      order by key
    `);
    expect(result.rows).toEqual([
      { key: "institution_admin", scope_type: "workspace" },
      { key: "owner_instructor", scope_type: "workspace" },
      { key: "personal_owner", scope_type: "workspace" },
      { key: "super_admin", scope_type: "platform" },
    ]);
  });

  test("gives content publishing to bounded platform roles", async () => {
    const result = await database.query<{ role_key: string; permission_key: string }>(`
      select roles.key as role_key, role_permissions.permission_key
      from roles
      join role_permissions on role_permissions.role_id = roles.id
      where role_permissions.permission_key like 'platform.content.%'
      order by roles.key, role_permissions.permission_key
    `);
    expect(result.rows).toEqual([
      { role_key: "content_manager", permission_key: "platform.content.edit" },
      { role_key: "content_manager", permission_key: "platform.content.publish" },
      { role_key: "content_manager", permission_key: "platform.content.read" },
      { role_key: "super_admin", permission_key: "platform.content.edit" },
      { role_key: "super_admin", permission_key: "platform.content.publish" },
      { role_key: "super_admin", permission_key: "platform.content.read" },
    ]);
  });

  test("creates an immutable-revision Content Studio boundary", async () => {
    const tables = await database.query<{ table_name: string }>(`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name like 'content_%'
      order by table_name
    `);
    expect(tables.rows.map((row) => row.table_name)).toEqual([
      "content_authors",
      "content_items",
      "content_media",
      "content_publication_events",
      "content_redirects",
      "content_revision_media",
      "content_revisions",
    ]);
    const policies = await database.query<{ policyname: string }>(`
      select policyname from pg_policies
      where tablename = 'content_revisions'
      order by policyname
    `);
    expect(policies.rows.map((row) => row.policyname)).toEqual([
      "content_revisions_insert",
      "content_revisions_read",
      "content_revisions_review_update",
    ]);
    const globalEvidencePolicies = await database.query<{ policyname: string }>(`
      select policyname from pg_policies
      where policyname in ('audit_events_platform_content_insert', 'outbox_events_platform_content_insert')
      order by policyname
    `);
    expect(globalEvidencePolicies.rows.map((row) => row.policyname)).toEqual([
      "audit_events_platform_content_insert",
      "outbox_events_platform_content_insert",
    ]);
  });

  test("installs narrow public-read and scheduled-release content functions", async () => {
    const functions = await database.query<{ proname: string }>(`
      select proname from pg_proc
      where proname in ('get_published_content', 'get_published_media', 'release_due_content')
      order by proname
    `);
    expect(functions.rows.map((row) => row.proname)).toEqual([
      "get_published_content",
      "get_published_media",
      "release_due_content",
    ]);
  });

  test("retains schema v1 revisions while permitting schema v2 circuit documents", async () => {
    const constraint = await database.query<{ definition: string }>(`
      select pg_get_constraintdef(oid) as definition
      from pg_constraint where conname = 'simulator_project_document_ck'
    `);
    expect(constraint.rows[0]?.definition).toContain("'1'::text");
    expect(constraint.rows[0]?.definition).toContain("'2'::text");
  });

  test("rejects a campus whose institution belongs to another workspace", async () => {
    await database.exec(`
      insert into users (id, email_normalized, display_name) values
        ('00000000-0000-7000-8000-000000000001', 'owner@example.test', 'Owner');
      insert into workspaces (id, type, name, slug, created_by_user_id) values
        ('00000000-0000-7000-8000-000000000101', 'institution', 'Institution A', 'institution-a', '00000000-0000-7000-8000-000000000001'),
        ('00000000-0000-7000-8000-000000000102', 'institution', 'Institution B', 'institution-b', '00000000-0000-7000-8000-000000000001');
      insert into institutions (id, workspace_id, legal_name, display_name, country_code, timezone) values
        ('00000000-0000-7000-8000-000000000201', '00000000-0000-7000-8000-000000000101', 'Institution A Ltd', 'Institution A', 'US', 'UTC');
    `);

    await expect(
      database.exec(`
        insert into campuses (id, workspace_id, institution_id, name)
        values (
          '00000000-0000-7000-8000-000000000301',
          '00000000-0000-7000-8000-000000000102',
          '00000000-0000-7000-8000-000000000201',
          'Invalid cross-tenant campus'
        );
      `),
    ).rejects.toThrow();
  });
});
