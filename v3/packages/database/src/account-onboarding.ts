import type {
  AccountLifecycleState,
  AccountOnboardingRepository,
  OnboardingMutation,
} from "@electrasim/identity";
import type { Database, DatabaseTransaction } from "./index.ts";

export class PostgresAccountOnboardingRepository implements AccountOnboardingRepository {
  constructor(
    private readonly database: Database,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  async getLifecycleState(userId: string): Promise<AccountLifecycleState | null> {
    const [row] = await this.database<
      {
        id: string;
        email_verified: boolean;
        adult_eligibility_confirmed_at: Date | null;
        primary_goal: AccountLifecycleState["primaryGoal"];
        experience_level: AccountLifecycleState["experienceLevel"];
        supply_family: AccountLifecycleState["supplyFamily"];
        accessibility_presented_at: Date | null;
        safety_terms_version: string | null;
        onboarding_completed_at: Date | null;
        disabled_at: Date | null;
        personal_workspace_ready: boolean;
      }[]
    >`
      select
        users.id,
        users.email_verified,
        users.adult_eligibility_confirmed_at,
        users.primary_goal,
        users.experience_level,
        users.supply_family,
        users.accessibility_presented_at,
        users.safety_terms_version,
        users.onboarding_completed_at,
        users.disabled_at,
        exists (
          select 1 from identity_operations operations
          where operations.user_id = users.id
            and operations.operation = 'identity.personal_workspace.ensure'
            and operations.workspace_id is not null
        ) as personal_workspace_ready
      from users
      where users.id = ${userId}::uuid
    `;
    if (!row) return null;
    return {
      userId: row.id,
      emailVerified: row.email_verified,
      personalWorkspaceReady: row.personal_workspace_ready,
      adultEligibilityConfirmedAt: row.adult_eligibility_confirmed_at,
      primaryGoal: row.primary_goal,
      experienceLevel: row.experience_level,
      supplyFamily: row.supply_family,
      accessibilityPresentedAt: row.accessibility_presented_at,
      safetyTermsVersion: row.safety_terms_version,
      onboardingCompletedAt: row.onboarding_completed_at,
      disabled: row.disabled_at !== null,
    };
  }

  async applyOnboardingMutation(userId: string, mutation: OnboardingMutation): Promise<void> {
    await this.database.begin(async (transaction) => {
      const [identity] = await transaction<{ workspace_id: string }[]>`
        select workspace_id
        from identity_operations
        where user_id = ${userId}::uuid
          and operation = 'identity.personal_workspace.ensure'
          and workspace_id is not null
        for update
      `;
      if (!identity) throw new Error("personal workspace is not provisioned");

      await setTenantContext(transaction, userId, identity.workspace_id, mutation.requestId);
      const updated = await updateOnboardingField(transaction, userId, mutation);
      if (!updated) throw new Error("onboarding mutation precondition failed");

      await transaction`
        insert into audit_events (
          id, workspace_id, actor_user_id, action, target_type, target_id, request_id, metadata
        ) values (
          ${this.nextId()}::uuid,
          ${identity.workspace_id}::uuid,
          ${userId}::uuid,
          'identity.onboarding.step_completed',
          'user',
          ${userId},
          ${mutation.requestId},
          ${JSON.stringify({ step: mutation.command.type })}::jsonb
        )
      `;
    });
  }
}

async function updateOnboardingField(
  transaction: DatabaseTransaction,
  userId: string,
  mutation: OnboardingMutation,
): Promise<boolean> {
  let result: readonly unknown[];
  switch (mutation.command.type) {
    case "confirm_adult":
      result = await transaction`
        update users set adult_eligibility_confirmed_at = ${mutation.occurredAt.toISOString()}::timestamptz,
          updated_at = now()
        where id = ${userId}::uuid and email_verified = true
          and adult_eligibility_confirmed_at is null
        returning id
      `;
      break;
    case "set_primary_goal":
      result = await transaction`
        update users set primary_goal = ${mutation.command.value}, updated_at = now()
        where id = ${userId}::uuid and adult_eligibility_confirmed_at is not null
          and primary_goal is null
        returning id
      `;
      break;
    case "set_experience":
      result = await transaction`
        update users set experience_level = ${mutation.command.value}, updated_at = now()
        where id = ${userId}::uuid and primary_goal is not null and experience_level is null
        returning id
      `;
      break;
    case "set_supply_family":
      result = await transaction`
        update users set supply_family = ${mutation.command.value}, updated_at = now()
        where id = ${userId}::uuid and experience_level is not null and supply_family is null
        returning id
      `;
      break;
    case "acknowledge_accessibility":
      result = await transaction`
        update users set accessibility_presented_at = ${mutation.occurredAt.toISOString()}::timestamptz,
          updated_at = now()
        where id = ${userId}::uuid and supply_family is not null
          and accessibility_presented_at is null
        returning id
      `;
      break;
    case "accept_safety_terms":
      result = await transaction`
        update users set safety_terms_version = ${mutation.command.version}, updated_at = now()
        where id = ${userId}::uuid and accessibility_presented_at is not null
          and safety_terms_version is null
        returning id
      `;
      break;
    case "complete_onboarding":
      result = await transaction`
        update users set onboarding_completed_at = ${mutation.occurredAt.toISOString()}::timestamptz,
          updated_at = now()
        where id = ${userId}::uuid
          and email_verified = true
          and adult_eligibility_confirmed_at is not null
          and primary_goal is not null
          and experience_level is not null
          and supply_family is not null
          and accessibility_presented_at is not null
          and safety_terms_version is not null
          and onboarding_completed_at is null
        returning id
      `;
      break;
  }
  return result.length === 1;
}

async function setTenantContext(
  transaction: DatabaseTransaction,
  userId: string,
  workspaceId: string,
  requestId: string,
): Promise<void> {
  await transaction`select set_config('app.current_user_id', ${userId}, true)`;
  await transaction`select set_config('app.current_workspace_id', ${workspaceId}, true)`;
  await transaction`select set_config('app.request_id', ${requestId}, true)`;
}
