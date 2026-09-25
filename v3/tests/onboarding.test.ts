import { describe, expect, test } from "bun:test";
import { createApplication } from "@electrasim/http-application";
import {
  type AccountLifecycleState,
  type AccountOnboardingRepository,
  AccountOnboardingService,
  type OnboardingMutation,
} from "@electrasim/identity";
import type { Logger } from "@electrasim/platform-contracts";

class MemoryOnboardingRepository implements AccountOnboardingRepository {
  state: AccountLifecycleState | null;
  mutations: OnboardingMutation[] = [];
  constructor(state: AccountLifecycleState | null = initialState()) {
    this.state = state;
  }
  async getLifecycleState(): Promise<AccountLifecycleState | null> {
    return this.state;
  }
  async applyOnboardingMutation(_userId: string, mutation: OnboardingMutation): Promise<void> {
    if (!this.state) throw new Error("missing account");
    this.mutations.push(mutation);
    switch (mutation.command.type) {
      case "confirm_adult":
        this.state = { ...this.state, adultEligibilityConfirmedAt: mutation.occurredAt };
        break;
      case "set_primary_goal":
        this.state = { ...this.state, primaryGoal: mutation.command.value };
        break;
      case "set_experience":
        this.state = { ...this.state, experienceLevel: mutation.command.value };
        break;
      case "set_supply_family":
        this.state = { ...this.state, supplyFamily: mutation.command.value };
        break;
      case "acknowledge_accessibility":
        this.state = { ...this.state, accessibilityPresentedAt: mutation.occurredAt };
        break;
      case "accept_safety_terms":
        this.state = { ...this.state, safetyTermsVersion: mutation.command.version };
        break;
      case "complete_onboarding":
        this.state = { ...this.state, onboardingCompletedAt: mutation.occurredAt };
        break;
    }
  }
}

function initialState(overrides: Partial<AccountLifecycleState> = {}): AccountLifecycleState {
  return {
    userId: "11111111-1111-4111-8111-111111111111",
    emailVerified: true,
    personalWorkspaceReady: true,
    adultEligibilityConfirmedAt: null,
    primaryGoal: null,
    experienceLevel: null,
    supplyFamily: null,
    accessibilityPresentedAt: null,
    safetyTermsVersion: null,
    onboardingCompletedAt: null,
    disabled: false,
    ...overrides,
  };
}

const fixedNow = () => new Date("2026-09-24T12:00:00Z");
const logger: Logger = { info() {}, error() {} };

describe("mandatory onboarding persistence", () => {
  test("advances only through the required adult, role, experience, supply, accessibility, safety, and completion sequence", async () => {
    const repository = new MemoryOnboardingRepository();
    const service = new AccountOnboardingService(repository, "safety-2026-09", fixedNow);
    const commands = [
      { type: "confirm_adult", confirmed: true } as const,
      { type: "set_primary_goal", value: "learn" } as const,
      { type: "set_experience", value: "new" } as const,
      { type: "set_supply_family", value: "us_110_120" } as const,
      { type: "acknowledge_accessibility" } as const,
      { type: "accept_safety_terms", version: "safety-2026-09" } as const,
      { type: "complete_onboarding" } as const,
    ];
    const gates: string[] = [];
    for (const command of commands) {
      gates.push((await service.submit(initialState().userId, command, "request-1")).gate);
    }
    expect(gates).toEqual([
      "role_goal_required",
      "experience_required",
      "region_standard_required",
      "accessibility_preferences_required",
      "safety_terms_required",
      "completion_required",
      "complete",
    ]);
    expect(repository.mutations).toHaveLength(7);
  });

  test("rejects skipped steps and stale safety terms", async () => {
    const repository = new MemoryOnboardingRepository();
    const service = new AccountOnboardingService(repository, "safety-current", fixedNow);
    await expect(
      service.submit(initialState().userId, { type: "set_primary_goal", value: "learn" }, "r1"),
    ).rejects.toMatchObject({
      code: "step_out_of_order",
      currentGate: "adult_eligibility_required",
    });

    repository.state = initialState({
      adultEligibilityConfirmedAt: fixedNow(),
      primaryGoal: "learn",
      experienceLevel: "new",
      supplyFamily: "international_230_240",
      accessibilityPresentedAt: fixedNow(),
    });
    await expect(
      service.submit(
        initialState().userId,
        { type: "accept_safety_terms", version: "safety-old" },
        "r2",
      ),
    ).rejects.toMatchObject({ code: "safety_terms_version_mismatch" });
  });

  test("HTTP endpoint requires a session and never exposes lifecycle timestamps", async () => {
    const repository = new MemoryOnboardingRepository();
    const service = new AccountOnboardingService(repository, "safety-2026-09", fixedNow);
    const unauthenticated = createApplication({
      version: "test",
      clock: { now: fixedNow },
      logger,
      readinessChecks: [],
      resolveIdentity: async () => null,
      accountOnboarding: service,
    });
    expect(
      (
        await unauthenticated(
          new Request("https://electrasim.test/api/account/onboarding", { method: "GET" }),
        )
      ).status,
    ).toBe(401);

    const authenticated = createApplication({
      version: "test",
      clock: { now: fixedNow },
      logger,
      readinessChecks: [],
      resolveIdentity: async () => ({ userId: initialState().userId }),
      accountOnboarding: service,
    });
    const response = await authenticated(
      new Request("https://electrasim.test/api/account/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json", "x-request-id": "onboarding-1" },
        body: JSON.stringify({ type: "confirm_adult", confirmed: true }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.gate).toBe("role_goal_required");
    expect(JSON.stringify(body)).not.toContain("2026-09-24T12:00:00");
  });
});
