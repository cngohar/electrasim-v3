import { describe, expect, test } from "bun:test";
import {
  AccountLifecycleService,
  type AccountLifecycleState,
  IdentityLifecycleError,
  type IdentityProvisioningRepository,
  resolveAccountGate,
} from "@electrasim/identity";

function completeState(overrides: Partial<AccountLifecycleState> = {}): AccountLifecycleState {
  return {
    userId: "user-1",
    emailVerified: true,
    personalWorkspaceReady: true,
    adultEligibilityConfirmedAt: new Date("2026-09-24T00:00:00Z"),
    primaryGoal: "learn",
    experienceLevel: "new",
    supplyFamily: "us_110_120",
    accessibilityPresentedAt: new Date("2026-09-24T00:01:00Z"),
    safetyTermsVersion: "2026-09-24",
    onboardingCompletedAt: new Date("2026-09-24T00:02:00Z"),
    disabled: false,
    ...overrides,
  };
}

class RecordingRepository implements IdentityProvisioningRepository {
  personalInputs: unknown[] = [];
  instructorInputs: unknown[] = [];
  institutionInputs: unknown[] = [];
  async ensurePersonalWorkspace(input: {
    userId: string;
    requestId: string;
    idempotencyKey: string;
  }) {
    this.personalInputs.push(input);
    return { workspaceId: "personal-1", created: this.personalInputs.length === 1 };
  }
  async createIndependentInstructorWorkspace(input: {
    userId: string;
    name: string;
    slug: string;
    requestId: string;
    idempotencyKey: string;
  }) {
    this.instructorInputs.push(input);
    return { workspaceId: "instructor-1", created: this.instructorInputs.length === 1 };
  }
  async createInstitutionWorkspace(input: {
    userId: string;
    name: string;
    slug: string;
    countryCode: string;
    timezone: string;
    requestId: string;
    idempotencyKey: string;
  }) {
    this.institutionInputs.push(input);
    return {
      workspaceId: "institution-workspace-1",
      institutionId: "institution-1",
      created: this.institutionInputs.length === 1,
    };
  }
}

describe("mandatory account lifecycle", () => {
  test("resolves every mandatory onboarding gate in order", () => {
    expect(resolveAccountGate(completeState({ emailVerified: false }))).toBe(
      "email_verification_required",
    );
    expect(resolveAccountGate(completeState({ personalWorkspaceReady: false }))).toBe(
      "personal_workspace_provisioning",
    );
    expect(resolveAccountGate(completeState({ adultEligibilityConfirmedAt: null }))).toBe(
      "adult_eligibility_required",
    );
    expect(resolveAccountGate(completeState({ primaryGoal: null }))).toBe("role_goal_required");
    expect(resolveAccountGate(completeState({ experienceLevel: null }))).toBe(
      "experience_required",
    );
    expect(resolveAccountGate(completeState({ supplyFamily: null }))).toBe(
      "region_standard_required",
    );
    expect(resolveAccountGate(completeState({ accessibilityPresentedAt: null }))).toBe(
      "accessibility_preferences_required",
    );
    expect(resolveAccountGate(completeState({ safetyTermsVersion: null }))).toBe(
      "safety_terms_required",
    );
    expect(resolveAccountGate(completeState({ onboardingCompletedAt: null }))).toBe(
      "completion_required",
    );
    expect(resolveAccountGate(completeState())).toBe("complete");
    expect(resolveAccountGate(completeState({ disabled: true }))).toBe("account_disabled");
  });

  test("personal workspace reconciliation always uses the same idempotency key", async () => {
    const repository = new RecordingRepository();
    const service = new AccountLifecycleService(repository);
    await service.ensurePersonalWorkspace("user-1", "request-1");
    await service.ensurePersonalWorkspace("user-1", "request-2");
    expect(repository.personalInputs).toEqual([
      {
        userId: "user-1",
        requestId: "request-1",
        idempotencyKey: "identity.personal_workspace.ensure:user-1",
      },
      {
        userId: "user-1",
        requestId: "request-2",
        idempotencyKey: "identity.personal_workspace.ensure:user-1",
      },
    ]);
  });

  test("blocks instructor registration until verification, adulthood, and onboarding complete", async () => {
    const service = new AccountLifecycleService(new RecordingRepository());
    await expect(
      service.createIndependentInstructorWorkspace({
        lifecycle: completeState({ onboardingCompletedAt: null }),
        name: "Alex Training",
        slug: "alex-training",
        requestId: "request-1",
        idempotencyKey: "instructor-create-1",
      }),
    ).rejects.toEqual(new IdentityLifecycleError("onboarding_incomplete"));
  });

  test("creates an independent instructor context without creating an institution", async () => {
    const repository = new RecordingRepository();
    const service = new AccountLifecycleService(repository);
    const result = await service.createIndependentInstructorWorkspace({
      lifecycle: completeState({ primaryGoal: "teach_independently" }),
      name: "  Alex Training  ",
      slug: "alex-training",
      requestId: "request-2",
      idempotencyKey: "instructor-create-2",
    });
    expect(result).toEqual({ workspaceId: "instructor-1", created: true });
    expect(repository.instructorInputs).toEqual([
      {
        userId: "user-1",
        name: "Alex Training",
        slug: "alex-training",
        requestId: "request-2",
        idempotencyKey: "instructor-create-2",
      },
    ]);
  });

  test("creates an institution root with validated location metadata", async () => {
    const repository = new RecordingRepository();
    const service = new AccountLifecycleService(repository);
    const result = await service.createInstitutionWorkspace({
      lifecycle: completeState({ primaryGoal: "join_or_manage_institution" }),
      name: "Lodhran Electrical Institute",
      slug: "lodhran-electrical-institute",
      countryCode: "pk",
      timezone: "Asia/Karachi",
      requestId: "request-institution",
      idempotencyKey: "institution-create-1",
    });
    expect(result).toMatchObject({ institutionId: "institution-1", created: true });
    expect(repository.institutionInputs).toEqual([
      {
        userId: "user-1",
        name: "Lodhran Electrical Institute",
        slug: "lodhran-electrical-institute",
        countryCode: "PK",
        timezone: "Asia/Karachi",
        requestId: "request-institution",
        idempotencyKey: "institution-create-1",
      },
    ]);
  });
});
