import { describe, expect, test } from "bun:test";
import {
  authorizePlatformAdmin,
  authorizeWorkspace,
  type SessionActor,
} from "@electrasim/authorization";

function actor(overrides: Partial<SessionActor> = {}): SessionActor {
  return {
    userId: "user-1",
    sessionId: "session-1",
    emailVerified: true,
    onboardingComplete: true,
    mfaSatisfied: true,
    stepUpValidUntil: new Date("2026-09-24T13:00:00Z"),
    platformPermissions: new Set(["platform.audit.read"]),
    workspaceMemberships: new Map([
      ["workspace-a", { active: true, permissions: new Set(["institution.member.read"]) }],
    ]),
    ...overrides,
  };
}

const now = new Date("2026-09-24T12:00:00Z");

describe("admin and workspace authorization gates", () => {
  test("requires authentication, verification, and completed onboarding", () => {
    const requirement = { permission: "platform.audit.read", now };
    expect(authorizePlatformAdmin(null, requirement)).toEqual({
      allowed: false,
      reason: "unauthenticated",
    });
    expect(authorizePlatformAdmin(actor({ emailVerified: false }), requirement)).toEqual({
      allowed: false,
      reason: "email_unverified",
    });
    expect(authorizePlatformAdmin(actor({ onboardingComplete: false }), requirement)).toEqual({
      allowed: false,
      reason: "onboarding_incomplete",
    });
  });

  test("separates platform permission from tenant membership", () => {
    expect(
      authorizePlatformAdmin(actor({ platformPermissions: new Set() }), {
        permission: "platform.audit.read",
        now,
      }),
    ).toEqual({ allowed: false, reason: "permission_denied" });

    expect(
      authorizeWorkspace(actor(), "workspace-b", {
        permission: "institution.member.read",
        now,
      }),
    ).toEqual({ allowed: false, reason: "workspace_membership_inactive" });
  });

  test("requires MFA and a fresh step-up for high-risk admin actions", () => {
    const requirement = {
      permission: "platform.audit.read",
      requireMfa: true,
      requireStepUp: true,
      now,
    };
    expect(authorizePlatformAdmin(actor({ mfaSatisfied: false }), requirement)).toEqual({
      allowed: false,
      reason: "mfa_required",
    });
    expect(
      authorizePlatformAdmin(
        actor({ stepUpValidUntil: new Date("2026-09-24T11:59:59Z") }),
        requirement,
      ),
    ).toEqual({ allowed: false, reason: "step_up_required" });
    expect(authorizePlatformAdmin(actor(), requirement)).toEqual({ allowed: true });
  });

  test("allows only an active membership with the exact workspace permission", () => {
    expect(
      authorizeWorkspace(actor(), "workspace-a", {
        permission: "institution.member.read",
        now,
      }),
    ).toEqual({ allowed: true });
    expect(
      authorizeWorkspace(actor(), "workspace-a", {
        permission: "institution.member.role.assign",
        now,
      }),
    ).toEqual({ allowed: false, reason: "permission_denied" });
  });
});
