import {
  type CampusSummary,
  type DepartmentSummary,
  WorkspaceAdministrationError,
  type WorkspaceAdministrationRepository,
  type WorkspaceMemberSummary,
  type WorkspaceSummary,
} from "@electrasim/workspace-administration";
import type { Database, DatabaseTransaction } from "./index.ts";

export class PostgresWorkspaceAdministrationRepository
  implements WorkspaceAdministrationRepository
{
  constructor(private readonly database: Database) {}

  async listForUser(userId: string): Promise<readonly WorkspaceSummary[]> {
    const result = await this.database.begin(async (tx) => {
      await setContext(tx, userId);
      const rows = await tx<WorkspaceRow[]>`select * from app_private.list_my_workspaces()`;
      return { value: rows.map(toWorkspace) };
    });
    return result.value;
  }

  async getOrganization(workspaceId: string, actorUserId: string) {
    const result = await this.database.begin(async (tx) => {
      await setContext(tx, actorUserId, workspaceId);
      await requirePermission(tx, workspaceId, "workspace.settings.manage");
      await requireInstitution(tx, workspaceId);
      const campuses = await tx<CampusRow[]>`
        select id, name, code from campuses
        where workspace_id = ${workspaceId}::uuid and archived_at is null order by name, id
      `;
      const departments = await tx<DepartmentRow[]>`
        select id, campus_id, parent_department_id, name, code from departments
        where workspace_id = ${workspaceId}::uuid and archived_at is null order by name, id
      `;
      return {
        value: { campuses: campuses.map(toCampus), departments: departments.map(toDepartment) },
      };
    });
    return result.value;
  }

  async createCampus(input: Parameters<WorkspaceAdministrationRepository["createCampus"]>[0]) {
    const result = await this.database.begin(async (tx) => {
      await setContext(tx, input.actorUserId, input.workspaceId);
      await requirePermission(tx, input.workspaceId, "workspace.settings.manage");
      const institutionId = await requireInstitution(tx, input.workspaceId);
      const [row] = await tx<CampusRow[]>`
        insert into campuses (id, workspace_id, institution_id, name, code)
        values (${input.id}::uuid, ${input.workspaceId}::uuid, ${institutionId}::uuid, ${input.name}, ${input.code})
        returning id, name, code
      `;
      if (!row) throw new WorkspaceAdministrationError("organization_parent_not_found");
      await audit(tx, input, "workspace.campus.created", "campus", input.id);
      return { value: toCampus(row) };
    });
    return result.value;
  }

  async createDepartment(
    input: Parameters<WorkspaceAdministrationRepository["createDepartment"]>[0],
  ) {
    const result = await this.database.begin(async (tx) => {
      await setContext(tx, input.actorUserId, input.workspaceId);
      await requirePermission(tx, input.workspaceId, "workspace.settings.manage");
      const institutionId = await requireInstitution(tx, input.workspaceId);
      if (input.campusId) {
        const [campus] = await tx<{ id: string }[]>`
          select id from campuses where id = ${input.campusId}::uuid
            and workspace_id = ${input.workspaceId}::uuid and archived_at is null
        `;
        if (!campus) throw new WorkspaceAdministrationError("organization_parent_not_found");
      }
      if (input.parentDepartmentId) {
        const [parent] = await tx<{ id: string }[]>`
          select id from departments where id = ${input.parentDepartmentId}::uuid
            and workspace_id = ${input.workspaceId}::uuid and archived_at is null
        `;
        if (!parent) throw new WorkspaceAdministrationError("organization_parent_not_found");
      }
      const [row] = await tx<DepartmentRow[]>`
        insert into departments (
          id, workspace_id, institution_id, campus_id, parent_department_id, name, code
        ) values (
          ${input.id}::uuid, ${input.workspaceId}::uuid, ${institutionId}::uuid,
          ${input.campusId}::uuid, ${input.parentDepartmentId}::uuid, ${input.name}, ${input.code}
        ) returning id, campus_id, parent_department_id, name, code
      `;
      if (!row) throw new WorkspaceAdministrationError("organization_parent_not_found");
      await audit(tx, input, "workspace.department.created", "department", input.id);
      return { value: toDepartment(row) };
    });
    return result.value;
  }

  async listMembers(workspaceId: string, actorUserId: string) {
    const result = await this.database.begin(async (tx) => {
      await setContext(tx, actorUserId, workspaceId);
      const rows = await tx<MemberRow[]>`
        select * from app_private.get_workspace_roster(${workspaceId}::uuid)
      `;
      return { value: rows.map(toMember) };
    });
    return result.value;
  }

  async setMemberStatus(
    input: Parameters<WorkspaceAdministrationRepository["setMemberStatus"]>[0],
  ) {
    const result = await this.database.begin(async (tx) => {
      await setContext(tx, input.actorUserId, input.workspaceId);
      await requirePermission(tx, input.workspaceId, "workspace.membership.manage");
      const [target] = await tx<{ user_id: string }[]>`
        select user_id from workspace_memberships
        where id = ${input.membershipId}::uuid and workspace_id = ${input.workspaceId}::uuid
        for update
      `;
      if (!target) throw new WorkspaceAdministrationError("member_not_found");
      const roles = await tx<{ key: string }[]>`
        select roles.key from membership_role_assignments assignments
        join roles on roles.id = assignments.role_id
        where assignments.membership_id = ${input.membershipId}::uuid
      `;
      if (target.user_id === input.actorUserId) {
        throw new WorkspaceAdministrationError("member_self_management_denied");
      }
      if (
        roles.some((role) => role.key === "institution_owner" || role.key === "owner_instructor")
      ) {
        throw new WorkspaceAdministrationError("workspace_owner_protected");
      }
      await tx`
        update workspace_memberships set status = ${input.status},
          joined_at = case when ${input.status} = 'active' then coalesce(joined_at, now()) else joined_at end,
          ended_at = case when ${input.status} = 'suspended' then now() else null end,
          updated_at = now()
        where id = ${input.membershipId}::uuid and workspace_id = ${input.workspaceId}::uuid
      `;
      await audit(
        tx,
        input,
        `workspace.member.${input.status}`,
        "workspace_membership",
        input.membershipId,
      );
      const rows = await tx<MemberRow[]>`
        select * from app_private.get_workspace_roster(${input.workspaceId}::uuid)
        where membership_id = ${input.membershipId}::uuid
      `;
      const row = rows[0];
      if (!row) throw new WorkspaceAdministrationError("member_not_found");
      return { value: toMember(row) };
    });
    return result.value;
  }
}

type WorkspaceRow = {
  workspace_id: string;
  workspace_name: string;
  workspace_type: WorkspaceSummary["type"];
  membership_status: string;
  role_keys: string[];
};
type CampusRow = { id: string; name: string; code: string | null };
type DepartmentRow = {
  id: string;
  campus_id: string | null;
  parent_department_id: string | null;
  name: string;
  code: string | null;
};
type MemberRow = {
  membership_id: string;
  user_id: string;
  display_name: string;
  email_normalized: string;
  membership_status: string;
  role_keys: string[];
  joined_at: Date | null;
};

function toWorkspace(row: WorkspaceRow): WorkspaceSummary {
  return {
    id: row.workspace_id,
    name: row.workspace_name,
    type: row.workspace_type,
    membershipStatus: row.membership_status,
    roleKeys: row.role_keys,
  };
}
function toCampus(row: CampusRow): CampusSummary {
  return { id: row.id, name: row.name, code: row.code };
}
function toDepartment(row: DepartmentRow): DepartmentSummary {
  return {
    id: row.id,
    campusId: row.campus_id,
    parentDepartmentId: row.parent_department_id,
    name: row.name,
    code: row.code,
  };
}
function toMember(row: MemberRow): WorkspaceMemberSummary {
  return {
    membershipId: row.membership_id,
    userId: row.user_id,
    name: row.display_name,
    email: row.email_normalized,
    status: row.membership_status,
    roleKeys: row.role_keys,
    joinedAt: row.joined_at,
  };
}
async function setContext(tx: DatabaseTransaction, userId: string, workspaceId = "") {
  await tx`select set_config('app.current_user_id', ${userId}, true)`;
  await tx`select set_config('app.current_workspace_id', ${workspaceId}, true)`;
}
async function requirePermission(
  tx: DatabaseTransaction,
  workspaceId: string,
  permission: string,
): Promise<void> {
  const [row] = await tx<{ allowed: boolean }[]>`
    select app_private.has_workspace_permission(${workspaceId}::uuid, ${permission}) as allowed
  `;
  if (!row?.allowed) throw new WorkspaceAdministrationError("workspace_administration_denied");
}
async function requireInstitution(tx: DatabaseTransaction, workspaceId: string): Promise<string> {
  const [row] = await tx<{ id: string }[]>`
    select id from institutions where workspace_id = ${workspaceId}::uuid
  `;
  if (!row) throw new WorkspaceAdministrationError("workspace_not_institution");
  return row.id;
}
async function audit(
  tx: DatabaseTransaction,
  input: { workspaceId: string; actorUserId: string; requestId: string },
  action: string,
  targetType: string,
  targetId: string,
) {
  await tx`
    insert into audit_events (id, workspace_id, actor_user_id, action, target_type, target_id, request_id)
    values (${crypto.randomUUID()}::uuid, ${input.workspaceId}::uuid, ${input.actorUserId}::uuid,
      ${action}, ${targetType}, ${targetId}, ${input.requestId})
  `;
}
