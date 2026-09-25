export type WorkspaceType = "personal" | "independent_instructor" | "institution";
export type MembershipStatus = "active" | "suspended";

export interface WorkspaceSummary {
  readonly id: string;
  readonly name: string;
  readonly type: WorkspaceType;
  readonly membershipStatus: string;
  readonly roleKeys: readonly string[];
}

export interface CampusSummary {
  readonly id: string;
  readonly name: string;
  readonly code: string | null;
}

export interface DepartmentSummary {
  readonly id: string;
  readonly campusId: string | null;
  readonly parentDepartmentId: string | null;
  readonly name: string;
  readonly code: string | null;
}

export interface WorkspaceMemberSummary {
  readonly membershipId: string;
  readonly userId: string;
  readonly name: string;
  readonly email: string;
  readonly status: string;
  readonly roleKeys: readonly string[];
  readonly joinedAt: Date | null;
}

export interface WorkspaceAdministrationRepository {
  listForUser(userId: string): Promise<readonly WorkspaceSummary[]>;
  getOrganization(
    workspaceId: string,
    actorUserId: string,
  ): Promise<{
    readonly campuses: readonly CampusSummary[];
    readonly departments: readonly DepartmentSummary[];
  }>;
  createCampus(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly name: string;
    readonly code: string | null;
    readonly requestId: string;
  }): Promise<CampusSummary>;
  createDepartment(input: {
    readonly id: string;
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly campusId: string | null;
    readonly parentDepartmentId: string | null;
    readonly name: string;
    readonly code: string | null;
    readonly requestId: string;
  }): Promise<DepartmentSummary>;
  listMembers(workspaceId: string, actorUserId: string): Promise<readonly WorkspaceMemberSummary[]>;
  setMemberStatus(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly membershipId: string;
    readonly status: MembershipStatus;
    readonly requestId: string;
  }): Promise<WorkspaceMemberSummary>;
}

export class WorkspaceAdministrationService {
  constructor(
    private readonly repository: WorkspaceAdministrationRepository,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  listForUser(userId: string) {
    return this.repository.listForUser(userId);
  }

  getOrganization(workspaceId: string, actorUserId: string) {
    return this.repository.getOrganization(workspaceId, actorUserId);
  }

  createCampus(input: {
    workspaceId: string;
    actorUserId: string;
    name: string;
    code?: string | null;
    requestId: string;
  }) {
    return this.repository.createCampus({
      ...input,
      id: this.nextId(),
      name: normalizedName(input.name),
      code: normalizedCode(input.code),
    });
  }

  createDepartment(input: {
    workspaceId: string;
    actorUserId: string;
    campusId?: string | null;
    parentDepartmentId?: string | null;
    name: string;
    code?: string | null;
    requestId: string;
  }) {
    return this.repository.createDepartment({
      ...input,
      id: this.nextId(),
      campusId: input.campusId ?? null,
      parentDepartmentId: input.parentDepartmentId ?? null,
      name: normalizedName(input.name),
      code: normalizedCode(input.code),
    });
  }

  listMembers(workspaceId: string, actorUserId: string) {
    return this.repository.listMembers(workspaceId, actorUserId);
  }

  setMemberStatus(input: {
    workspaceId: string;
    actorUserId: string;
    membershipId: string;
    status: MembershipStatus;
    requestId: string;
  }) {
    return this.repository.setMemberStatus(input);
  }
}

export type WorkspaceAdministrationErrorCode =
  | "invalid_organization_name"
  | "invalid_organization_code"
  | "workspace_administration_denied"
  | "workspace_not_institution"
  | "organization_parent_not_found"
  | "member_not_found"
  | "member_self_management_denied"
  | "workspace_owner_protected";

export class WorkspaceAdministrationError extends Error {
  constructor(readonly code: WorkspaceAdministrationErrorCode) {
    super(code);
    this.name = "WorkspaceAdministrationError";
  }
}

function normalizedName(value: string): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (normalized.length < 2 || normalized.length > 120) {
    throw new WorkspaceAdministrationError("invalid_organization_name");
  }
  return normalized;
}

function normalizedCode(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  const normalized = value.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,19}$/.test(normalized)) {
    throw new WorkspaceAdministrationError("invalid_organization_code");
  }
  return normalized;
}
