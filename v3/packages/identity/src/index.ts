export * from "./gate.ts";
export * from "./onboarding.ts";

import { resolveAccountGate } from "./gate.ts";

export type PrimaryGoal = "learn" | "teach_independently" | "join_or_manage_institution";
export type ExperienceLevel = "new" | "student_or_apprentice" | "working_professional";
export type SupplyFamily = "us_110_120" | "international_230_240";

export interface AccountLifecycleState {
  readonly userId: string;
  readonly emailVerified: boolean;
  readonly personalWorkspaceReady: boolean;
  readonly adultEligibilityConfirmedAt: Date | null;
  readonly primaryGoal: PrimaryGoal | null;
  readonly experienceLevel: ExperienceLevel | null;
  readonly supplyFamily: SupplyFamily | null;
  readonly accessibilityPresentedAt: Date | null;
  readonly safetyTermsVersion: string | null;
  readonly onboardingCompletedAt: Date | null;
  readonly disabled: boolean;
}

export type AccountGate =
  | "account_disabled"
  | "email_verification_required"
  | "personal_workspace_provisioning"
  | "adult_eligibility_required"
  | "role_goal_required"
  | "experience_required"
  | "region_standard_required"
  | "accessibility_preferences_required"
  | "safety_terms_required"
  | "completion_required"
  | "complete";

export interface PersonalWorkspaceProvisioningResult {
  readonly workspaceId: string;
  readonly created: boolean;
}

export interface IndependentInstructorProvisioningResult {
  readonly workspaceId: string;
  readonly created: boolean;
}

export interface InstitutionProvisioningResult {
  readonly workspaceId: string;
  readonly institutionId: string;
  readonly created: boolean;
}

export interface IdentityProvisioningRepository {
  ensurePersonalWorkspace(input: {
    readonly userId: string;
    readonly requestId: string;
    readonly idempotencyKey: string;
  }): Promise<PersonalWorkspaceProvisioningResult>;

  createIndependentInstructorWorkspace(input: {
    readonly userId: string;
    readonly name: string;
    readonly slug: string;
    readonly requestId: string;
    readonly idempotencyKey: string;
  }): Promise<IndependentInstructorProvisioningResult>;

  createInstitutionWorkspace?(input: {
    readonly userId: string;
    readonly name: string;
    readonly slug: string;
    readonly countryCode: string;
    readonly timezone: string;
    readonly requestId: string;
    readonly idempotencyKey: string;
  }): Promise<InstitutionProvisioningResult>;
}

export class AccountLifecycleService {
  constructor(private readonly repository: IdentityProvisioningRepository) {}

  ensurePersonalWorkspace(
    userId: string,
    requestId: string,
  ): Promise<PersonalWorkspaceProvisioningResult> {
    return this.repository.ensurePersonalWorkspace({
      userId,
      requestId,
      idempotencyKey: `identity.personal_workspace.ensure:${userId}`,
    });
  }

  async createIndependentInstructorWorkspace(input: {
    readonly lifecycle: AccountLifecycleState;
    readonly name: string;
    readonly slug: string;
    readonly requestId: string;
    readonly idempotencyKey: string;
  }): Promise<IndependentInstructorProvisioningResult> {
    if (resolveAccountGate(input.lifecycle) !== "complete") {
      throw new IdentityLifecycleError("onboarding_incomplete");
    }
    if (!input.lifecycle.emailVerified || !input.lifecycle.adultEligibilityConfirmedAt) {
      throw new IdentityLifecycleError("verified_adult_required");
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
      throw new IdentityLifecycleError("invalid_workspace_slug");
    }
    if (!input.idempotencyKey.trim()) {
      throw new IdentityLifecycleError("idempotency_key_required");
    }

    return this.repository.createIndependentInstructorWorkspace({
      userId: input.lifecycle.userId,
      name: input.name.trim(),
      slug: input.slug,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
    });
  }

  async createInstitutionWorkspace(input: {
    readonly lifecycle: AccountLifecycleState;
    readonly name: string;
    readonly slug: string;
    readonly countryCode: string;
    readonly timezone: string;
    readonly requestId: string;
    readonly idempotencyKey: string;
  }): Promise<InstitutionProvisioningResult> {
    validateWorkspaceCreation(input);
    const countryCode = input.countryCode.trim().toUpperCase();
    const timezone = input.timezone.trim();
    if (!/^[A-Z]{2}$/.test(countryCode) || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+$/.test(timezone)) {
      throw new IdentityLifecycleError("invalid_institution_location");
    }
    if (!this.repository.createInstitutionWorkspace) {
      throw new IdentityLifecycleError("institution_provisioning_unavailable");
    }
    return this.repository.createInstitutionWorkspace({
      userId: input.lifecycle.userId,
      name: input.name.trim(),
      slug: input.slug,
      countryCode,
      timezone,
      requestId: input.requestId,
      idempotencyKey: input.idempotencyKey,
    });
  }
}

function validateWorkspaceCreation(input: {
  lifecycle: AccountLifecycleState;
  slug: string;
  name: string;
  idempotencyKey: string;
}): void {
  if (resolveAccountGate(input.lifecycle) !== "complete") {
    throw new IdentityLifecycleError("onboarding_incomplete");
  }
  if (!input.lifecycle.emailVerified || !input.lifecycle.adultEligibilityConfirmedAt) {
    throw new IdentityLifecycleError("verified_adult_required");
  }
  if (!input.name.trim() || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.slug)) {
    throw new IdentityLifecycleError("invalid_workspace_slug");
  }
  if (!input.idempotencyKey.trim()) throw new IdentityLifecycleError("idempotency_key_required");
}

export type IdentityLifecycleErrorCode =
  | "onboarding_incomplete"
  | "verified_adult_required"
  | "invalid_workspace_slug"
  | "invalid_institution_location"
  | "institution_provisioning_unavailable"
  | "idempotency_key_required";

export class IdentityLifecycleError extends Error {
  constructor(readonly code: IdentityLifecycleErrorCode) {
    super(code);
    this.name = "IdentityLifecycleError";
  }
}
