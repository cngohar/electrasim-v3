export type InvitationWorkspaceType = "independent_instructor" | "institution";

const invitationRoleCeilings: Readonly<Record<InvitationWorkspaceType, ReadonlySet<string>>> = {
  independent_instructor: new Set(["co_instructor", "grader", "learner"]),
  institution: new Set([
    "institution_admin",
    "academic_admin",
    "billing_admin",
    "data_officer",
    "instructor",
    "teaching_assistant",
    "learner",
    "observer",
  ]),
};

export function isInvitationRoleAllowed(
  workspaceType: InvitationWorkspaceType,
  roleKey: string,
): boolean {
  return invitationRoleCeilings[workspaceType].has(roleKey);
}

export interface InvitationIssueResult {
  readonly invitationId: string;
  readonly workspaceId: string;
  readonly expiresAt: Date;
}

export interface InvitationManagementRepository {
  issue(input: {
    readonly invitationId: string;
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly emailNormalized: string;
    readonly roleKeys: readonly string[];
    readonly token: string;
    readonly tokenHash: string;
    readonly invitationUrl: string;
    readonly expiresAt: Date;
    readonly requestId: string;
  }): Promise<InvitationIssueResult>;
  revoke(input: {
    readonly invitationId: string;
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly requestId: string;
    readonly revokedAt: Date;
  }): Promise<{ readonly alreadyRevoked: boolean }>;
}

export class InvitationManagementService {
  constructor(
    private readonly repository: InvitationManagementRepository,
    private readonly baseURL: string,
    private readonly now: () => Date = () => new Date(),
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  async issue(input: {
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly email: string;
    readonly roleKeys: readonly string[];
    readonly requestId: string;
  }): Promise<InvitationIssueResult> {
    const emailNormalized = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNormalized)) {
      throw new InvitationError("invalid_invited_email");
    }
    const roleKeys = [...new Set(input.roleKeys)];
    if (roleKeys.length === 0 || roleKeys.length > 8) {
      throw new InvitationError("invitation_role_not_allowed");
    }
    const invitationId = this.nextId();
    const issued = await issueInvitationToken({
      workspaceId: input.workspaceId,
      invitationId,
    });
    const expiresAt = new Date(this.now().getTime() + 7 * 24 * 60 * 60 * 1_000);
    const invitationUrl = new URL("/app", this.baseURL);
    invitationUrl.searchParams.set("invitation", issued.token);
    return this.repository.issue({
      invitationId,
      workspaceId: input.workspaceId,
      actorUserId: input.actorUserId,
      emailNormalized,
      roleKeys,
      token: issued.token,
      tokenHash: issued.tokenHash,
      invitationUrl: invitationUrl.toString(),
      expiresAt,
      requestId: input.requestId,
    });
  }

  revoke(input: {
    readonly invitationId: string;
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly requestId: string;
  }): Promise<{ readonly alreadyRevoked: boolean }> {
    return this.repository.revoke({ ...input, revokedAt: this.now() });
  }
}

export interface ParsedInvitationToken {
  readonly workspaceId: string;
  readonly invitationId: string;
  readonly tokenHash: string;
}

export interface InvitationAcceptanceResult {
  readonly workspaceId: string;
  readonly membershipId: string;
  readonly alreadyAccepted: boolean;
}

export interface InvitationAcceptanceRepository {
  accept(input: {
    readonly token: ParsedInvitationToken;
    readonly userId: string;
    readonly requestId: string;
    readonly acceptedAt: Date;
  }): Promise<InvitationAcceptanceResult>;
}

export class InvitationAcceptanceService {
  constructor(
    private readonly repository: InvitationAcceptanceRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async accept(input: {
    readonly rawToken: string;
    readonly userId: string;
    readonly requestId: string;
  }): Promise<InvitationAcceptanceResult> {
    const token = await parseInvitationToken(input.rawToken);
    return this.repository.accept({
      token,
      userId: input.userId,
      requestId: input.requestId,
      acceptedAt: this.now(),
    });
  }
}

export async function issueInvitationToken(input: {
  readonly workspaceId: string;
  readonly invitationId: string;
  readonly randomBytes?: Uint8Array;
}): Promise<{ readonly token: string; readonly tokenHash: string }> {
  if (!isUuid(input.workspaceId) || !isUuid(input.invitationId)) {
    throw new InvitationError("invalid_token");
  }
  const randomBytes = input.randomBytes ?? crypto.getRandomValues(new Uint8Array(32));
  if (randomBytes.byteLength < 32) throw new InvitationError("invalid_token");
  const secret = base64Url(randomBytes);
  const token = `v1.${input.workspaceId}.${input.invitationId}.${secret}`;
  return { token, tokenHash: await sha256(token) };
}

export async function parseInvitationToken(rawToken: string): Promise<ParsedInvitationToken> {
  if (rawToken.length > 512) throw new InvitationError("invalid_token");
  const [version, workspaceId, invitationId, secret, extra] = rawToken.split(".");
  if (
    version !== "v1" ||
    !isUuid(workspaceId) ||
    !isUuid(invitationId) ||
    !secret ||
    secret.length < 43 ||
    extra !== undefined ||
    !/^[A-Za-z0-9_-]+$/.test(secret)
  ) {
    throw new InvitationError("invalid_token");
  }
  return { workspaceId, invitationId, tokenHash: await sha256(rawToken) };
}

export type InvitationErrorCode =
  | "invalid_token"
  | "invalid_invited_email"
  | "invitation_not_found"
  | "pending_invitation_exists"
  | "invitation_not_revocable"
  | "invitation_management_denied"
  | "invitation_expired"
  | "invitation_revoked"
  | "invitation_already_used"
  | "verified_onboarded_account_required"
  | "invited_email_mismatch"
  | "membership_suspended"
  | "invitation_role_not_allowed";

export class InvitationError extends Error {
  constructor(readonly code: InvitationErrorCode) {
    super(code);
    this.name = "InvitationError";
  }
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  );
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
