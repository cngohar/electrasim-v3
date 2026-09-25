import { resolveAccountGate } from "./gate.ts";
import type {
  AccountGate,
  AccountLifecycleState,
  ExperienceLevel,
  PrimaryGoal,
  SupplyFamily,
} from "./index.ts";

export type OnboardingCommand =
  | { readonly type: "confirm_adult"; readonly confirmed: true }
  | { readonly type: "set_primary_goal"; readonly value: PrimaryGoal }
  | { readonly type: "set_experience"; readonly value: ExperienceLevel }
  | { readonly type: "set_supply_family"; readonly value: SupplyFamily }
  | { readonly type: "acknowledge_accessibility" }
  | { readonly type: "accept_safety_terms"; readonly version: string }
  | { readonly type: "complete_onboarding" };

export interface OnboardingMutation {
  readonly command: OnboardingCommand;
  readonly occurredAt: Date;
  readonly requestId: string;
}

export interface AccountOnboardingRepository {
  getLifecycleState(userId: string): Promise<AccountLifecycleState | null>;
  applyOnboardingMutation(userId: string, mutation: OnboardingMutation): Promise<void>;
}

export class AccountOnboardingService {
  constructor(
    private readonly repository: AccountOnboardingRepository,
    private readonly currentSafetyTermsVersion: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  get safetyTermsVersion(): string {
    return this.currentSafetyTermsVersion;
  }

  async getGate(userId: string): Promise<{ state: AccountLifecycleState; gate: AccountGate }> {
    const state = await this.repository.getLifecycleState(userId);
    if (!state) throw new OnboardingError("account_not_found");
    return { state, gate: resolveAccountGate(state) };
  }

  async submit(
    userId: string,
    command: OnboardingCommand,
    requestId: string,
  ): Promise<{ state: AccountLifecycleState; gate: AccountGate }> {
    const current = await this.getGate(userId);
    if (current.gate === "account_disabled") throw new OnboardingError("account_disabled");
    if (current.gate === "complete") return current;

    const expectedCommand = commandForGate(current.gate);
    if (command.type !== expectedCommand) {
      throw new OnboardingError("step_out_of_order", current.gate);
    }
    if (
      command.type === "accept_safety_terms" &&
      command.version !== this.currentSafetyTermsVersion
    ) {
      throw new OnboardingError("safety_terms_version_mismatch", current.gate);
    }

    await this.repository.applyOnboardingMutation(userId, {
      command,
      occurredAt: this.now(),
      requestId,
    });
    return this.getGate(userId);
  }
}

function commandForGate(gate: AccountGate): OnboardingCommand["type"] | null {
  switch (gate) {
    case "adult_eligibility_required":
      return "confirm_adult";
    case "role_goal_required":
      return "set_primary_goal";
    case "experience_required":
      return "set_experience";
    case "region_standard_required":
      return "set_supply_family";
    case "accessibility_preferences_required":
      return "acknowledge_accessibility";
    case "safety_terms_required":
      return "accept_safety_terms";
    case "completion_required":
      return "complete_onboarding";
    default:
      return null;
  }
}

export type OnboardingErrorCode =
  | "account_not_found"
  | "account_disabled"
  | "step_out_of_order"
  | "safety_terms_version_mismatch";

export class OnboardingError extends Error {
  constructor(
    readonly code: OnboardingErrorCode,
    readonly currentGate?: AccountGate,
  ) {
    super(code);
    this.name = "OnboardingError";
  }
}
