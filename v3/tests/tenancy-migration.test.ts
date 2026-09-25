import { describe, expect, test } from "bun:test";
import {
  auditEvents,
  campuses,
  departments,
  institutions,
  invitations,
  outboxEvents,
  roles,
  users,
  workspaceMemberships,
  workspaces,
} from "@electrasim/database";

const migrationPath = new URL(
  "../packages/database/migrations/0001_tenancy_foundation.sql",
  import.meta.url,
);
const migration = await Bun.file(migrationPath).text();

const tenantTables = [
  "workspaces",
  "workspace_memberships",
  "institutions",
  "campuses",
  "departments",
  "roles",
  "membership_role_assignments",
  "invitations",
  "invitation_roles",
  "audit_events",
  "outbox_events",
] as const;

describe("tenancy schema contract", () => {
  test("exports the initial identity, hierarchy, RBAC, audit, and outbox tables", () => {
    const exported = [
      users,
      workspaces,
      workspaceMemberships,
      institutions,
      campuses,
      departments,
      roles,
      invitations,
      auditEvents,
      outboxEvents,
    ];
    expect(exported.every(Boolean)).toBe(true);
  });

  test("enables and forces RLS for every tenant-sensitive table", () => {
    for (const table of tenantTables) {
      expect(migration).toContain(`alter table ${table} enable row level security;`);
      expect(migration).toContain(`alter table ${table} force row level security;`);
    }
  });

  test("uses transaction-local tenant context rather than pooled session state", () => {
    expect(migration).toContain("current_setting('app.current_user_id', true)");
    expect(migration).toContain("current_setting('app.current_workspace_id', true)");
    const adapter = Bun.file(new URL("../packages/database/src/index.ts", import.meta.url));
    return adapter.text().then((source) => {
      expect(source).toMatch(/set_config\('app\.current_user_id',[\s\S]*true\)/);
      expect(source).toMatch(/set_config\('app\.current_workspace_id',[\s\S]*true\)/);
      expect(source).toMatch(/set_config\('app\.request_id',[\s\S]*true\)/);
    });
  });

  test("write policies include WITH CHECK tenant guards", () => {
    expect(migration).toMatch(
      /create policy workspaces_current[\s\S]*with check \(id = app_private\.current_workspace_id\(\)\)/,
    );
    expect(migration).toMatch(
      /create policy institutions_current[\s\S]*with check \(workspace_id = app_private\.current_workspace_id\(\)\)/,
    );
    expect(migration).toMatch(
      /create policy audit_events_current_insert[\s\S]*actor_user_id = app_private\.current_user_id\(\)/,
    );
  });

  test("uses composite hierarchy foreign keys to prevent cross-tenant parent links", () => {
    expect(migration).toContain("campuses_institution_workspace_fk");
    expect(migration).toContain("departments_institution_workspace_fk");
    expect(migration).toContain("departments_campus_workspace_fk");
    expect(migration).toContain("departments_parent_workspace_fk");
  });

  test("prevents concurrent duplicate pending invitations", () => {
    expect(migration).toContain("create unique index invitations_one_pending_email_idx");
    expect(migration).toContain("where status = 'pending'");
  });

  test("keeps platform assignments separate from workspace membership roles", () => {
    expect(migration).toContain("create table platform_role_assignments");
    expect(migration).toContain("create table membership_role_assignments");
    expect(migration).toContain("create policy platform_roles_self_select");
  });

  test("documents non-bypass runtime role requirements", () => {
    expect(migration).toContain("NOSUPERUSER NOBYPASSRLS");
    expect(migration).toContain("neither runtime role owns these tables");
  });
});
