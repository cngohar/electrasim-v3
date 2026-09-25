import { describe, expect, test } from "bun:test";
import { createApplication } from "@electrasim/http-application";
import {
  InvitationAcceptanceService,
  InvitationError,
  type InvitationManagementRepository,
  InvitationManagementService,
  isInvitationRoleAllowed,
  issueInvitationToken,
  type ParsedInvitationToken,
  parseInvitationToken,
} from "@electrasim/invitations";
import type { Logger } from "@electrasim/platform-contracts";

const workspaceId = "11111111-1111-4111-8111-111111111111";
const invitationId = "22222222-2222-4222-8222-222222222222";
const userId = "33333333-3333-4333-8333-333333333333";
const membershipId = "44444444-4444-4444-8444-444444444444";
const logger: Logger = { info() {}, error() {} };

describe("institution and instructor invitations", () => {
  test("issues a high-entropy opaque-secret token and hashes the complete routing envelope", async () => {
    const issued = await issueInvitationToken({
      workspaceId,
      invitationId,
      randomBytes: new Uint8Array(32).fill(7),
    });
    const parsed = await parseInvitationToken(issued.token);
    expect(parsed).toEqual({ workspaceId, invitationId, tokenHash: issued.tokenHash });

    const changedWorkspace = issued.token.replace(workspaceId, membershipId);
    expect((await parseInvitationToken(changedWorkspace)).tokenHash).not.toBe(issued.tokenHash);
    await expect(parseInvitationToken("v1.invalid.token.secret")).rejects.toMatchObject({
      code: "invalid_token",
    });
  });

  test("enforces separate role ceilings and never grants owner/platform roles by invitation", () => {
    expect(isInvitationRoleAllowed("independent_instructor", "co_instructor")).toBe(true);
    expect(isInvitationRoleAllowed("independent_instructor", "institution_admin")).toBe(false);
    expect(isInvitationRoleAllowed("institution", "instructor")).toBe(true);
    expect(isInvitationRoleAllowed("institution", "institution_owner")).toBe(false);
    expect(isInvitationRoleAllowed("institution", "super_admin")).toBe(false);
  });

  test("passes only the token hash and authenticated actor into the transactional repository", async () => {
    let captured:
      | {
          token: ParsedInvitationToken;
          userId: string;
          requestId: string;
          acceptedAt: Date;
        }
      | undefined;
    const service = new InvitationAcceptanceService(
      {
        async accept(input) {
          captured = input;
          return { workspaceId, membershipId, alreadyAccepted: false };
        },
      },
      () => new Date("2026-09-24T12:00:00Z"),
    );
    const issued = await issueInvitationToken({
      workspaceId,
      invitationId,
      randomBytes: new Uint8Array(32).fill(9),
    });
    expect(
      await service.accept({ rawToken: issued.token, userId, requestId: "invitation-request-1" }),
    ).toEqual({ workspaceId, membershipId, alreadyAccepted: false });
    expect(captured).toEqual({
      token: { workspaceId, invitationId, tokenHash: issued.tokenHash },
      userId,
      requestId: "invitation-request-1",
      acceptedAt: new Date("2026-09-24T12:00:00Z"),
    });
  });

  test("issues normalized seven-day invitations without returning the raw token", async () => {
    let captured: Parameters<InvitationManagementRepository["issue"]>[0] | undefined;
    const service = new InvitationManagementService(
      {
        async issue(input) {
          captured = input;
          return {
            invitationId: input.invitationId,
            workspaceId: input.workspaceId,
            expiresAt: input.expiresAt,
          };
        },
        async revoke() {
          return { alreadyRevoked: false };
        },
      },
      "https://app.electrasim.test",
      () => new Date("2026-09-24T12:00:00Z"),
      () => invitationId,
    );
    const result = await service.issue({
      workspaceId,
      actorUserId: userId,
      email: "  Learner@Example.TEST ",
      roleKeys: ["learner", "learner"],
      requestId: "issue-1",
    });
    expect(result).toEqual({
      invitationId,
      workspaceId,
      expiresAt: new Date("2026-10-01T12:00:00Z"),
    });
    expect(captured?.emailNormalized).toBe("learner@example.test");
    expect(captured?.roleKeys).toEqual(["learner"]);
    expect(captured?.invitationUrl).toStartWith("https://app.electrasim.test/app?invitation=");
    expect(JSON.stringify(result)).not.toContain(captured?.token ?? "raw-token-not-present");
  });

  test("workspace invitation HTTP routes require the exact management permission", async () => {
    const service = new InvitationManagementService(
      {
        async issue(input) {
          return {
            invitationId: input.invitationId,
            workspaceId: input.workspaceId,
            expiresAt: input.expiresAt,
          };
        },
        async revoke() {
          return { alreadyRevoked: false };
        },
      },
      "https://app.electrasim.test",
      () => new Date("2026-09-24T12:00:00Z"),
      () => invitationId,
    );
    const actor = (permissions: ReadonlySet<string>) => ({
      userId,
      sessionId: "session-1",
      emailVerified: true,
      onboardingComplete: true,
      mfaSatisfied: true,
      stepUpValidUntil: null,
      platformPermissions: new Set<string>(),
      workspaceMemberships: new Map([[workspaceId, { active: true, permissions }]]),
    });
    const create = (permissions: ReadonlySet<string>) =>
      createApplication({
        version: "test",
        clock: { now: () => new Date("2026-09-24T12:00:00Z") },
        logger,
        readinessChecks: [],
        resolveWorkspaceActor: async () => actor(permissions),
        invitationManagement: service,
      });
    const request = () =>
      new Request(`https://electrasim.test/api/workspaces/${workspaceId}/invitations`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "learner@example.test", roleKeys: ["learner"] }),
      });
    expect((await create(new Set())(request())).status).toBe(403);
    const issued = await create(new Set(["workspace.membership.manage"]))(request());
    expect(issued.status).toBe(201);
    const body = await issued.text();
    expect(JSON.parse(body)).toMatchObject({ invitationId, workspaceId });
    expect(body).not.toContain("invitation=");
  });

  test("HTTP acceptance requires authentication and maps lifecycle denial without leaking token", async () => {
    const issued = await issueInvitationToken({
      workspaceId,
      invitationId,
      randomBytes: new Uint8Array(32).fill(11),
    });
    const deniedService = new InvitationAcceptanceService({
      async accept() {
        throw new InvitationError("invited_email_mismatch");
      },
    });
    const unauthenticated = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
      resolveIdentity: async () => null,
      invitationAcceptance: deniedService,
    });
    const request = () =>
      new Request("https://electrasim.test/api/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: issued.token }),
      });
    expect((await unauthenticated(request())).status).toBe(401);

    const authenticated = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
      resolveIdentity: async () => ({ userId }),
      invitationAcceptance: deniedService,
    });
    const response = await authenticated(request());
    expect(response.status).toBe(403);
    const body = await response.text();
    expect(JSON.parse(body)).toMatchObject({ error: "invited_email_mismatch" });
    expect(body).not.toContain(issued.token);
  });
});
