export * from "./step-up.ts";

export interface SessionActor {
  readonly userId: string;
  readonly sessionId: string;
  readonly emailVerified: boolean;
  readonly onboardingComplete: boolean;
  readonly mfaSatisfied: boolean;
  readonly stepUpValidUntil: Date | null;
  readonly platformPermissions: ReadonlySet<string>;
  readonly workspaceMemberships: ReadonlyMap<
    string,
    {
      readonly active: boolean;
      readonly permissions: ReadonlySet<string>;
    }
  >;
}

export type AuthorizationDenial =
  | "unauthenticated"
  | "email_unverified"
  | "onboarding_incomplete"
  | "permission_denied"
  | "workspace_membership_inactive"
  | "mfa_required"
  | "step_up_required";

export type AuthorizationDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: AuthorizationDenial };

export interface AuthorizationRequirement {
  readonly permission: string;
  readonly requireMfa?: boolean;
  readonly requireStepUp?: boolean;
  readonly now?: Date;
}

function sessionGate(
  actor: SessionActor | null,
  requirement: AuthorizationRequirement,
): AuthorizationDecision | null {
  if (!actor) return { allowed: false, reason: "unauthenticated" };
  if (!actor.emailVerified) return { allowed: false, reason: "email_unverified" };
  if (!actor.onboardingComplete) return { allowed: false, reason: "onboarding_incomplete" };
  if (requirement.requireMfa && !actor.mfaSatisfied) {
    return { allowed: false, reason: "mfa_required" };
  }
  const now = requirement.now ?? new Date();
  if (
    requirement.requireStepUp &&
    (!actor.stepUpValidUntil || actor.stepUpValidUntil.getTime() <= now.getTime())
  ) {
    return { allowed: false, reason: "step_up_required" };
  }
  return null;
}

export function authorizePlatformAdmin(
  actor: SessionActor | null,
  requirement: AuthorizationRequirement,
): AuthorizationDecision {
  const denied = sessionGate(actor, requirement);
  if (denied) return denied;
  if (!actor?.platformPermissions.has(requirement.permission)) {
    return { allowed: false, reason: "permission_denied" };
  }
  return { allowed: true };
}

export function authorizeWorkspace(
  actor: SessionActor | null,
  workspaceId: string,
  requirement: AuthorizationRequirement,
): AuthorizationDecision {
  const denied = sessionGate(actor, requirement);
  if (denied) return denied;
  const membership = actor?.workspaceMemberships.get(workspaceId);
  if (!membership?.active) {
    return { allowed: false, reason: "workspace_membership_inactive" };
  }
  if (!membership.permissions.has(requirement.permission)) {
    return { allowed: false, reason: "permission_denied" };
  }
  return { allowed: true };
}
