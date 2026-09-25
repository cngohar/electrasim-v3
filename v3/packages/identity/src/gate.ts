import type { AccountGate, AccountLifecycleState } from "./index.ts";

export function resolveAccountGate(state: AccountLifecycleState): AccountGate {
  if (state.disabled) return "account_disabled";
  if (!state.emailVerified) return "email_verification_required";
  if (!state.personalWorkspaceReady) return "personal_workspace_provisioning";
  if (!state.adultEligibilityConfirmedAt) return "adult_eligibility_required";
  if (!state.primaryGoal) return "role_goal_required";
  if (!state.experienceLevel) return "experience_required";
  if (!state.supplyFamily) return "region_standard_required";
  if (!state.accessibilityPresentedAt) return "accessibility_preferences_required";
  if (!state.safetyTermsVersion) return "safety_terms_required";
  return state.onboardingCompletedAt ? "complete" : "completion_required";
}
