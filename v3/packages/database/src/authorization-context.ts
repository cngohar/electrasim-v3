import type { SessionActor } from "@electrasim/authorization";
import type { Database, DatabaseTransaction } from "./index.ts";

export interface AuthenticatedSessionContext {
  readonly userId: string;
  readonly sessionId: string;
  readonly emailVerified: boolean;
  readonly mfaSatisfied: boolean;
  readonly stepUpValidUntil: Date | null;
}

export class PostgresAuthorizationContextRepository {
  constructor(private readonly database: Database) {}

  async resolvePlatformActor(identity: AuthenticatedSessionContext): Promise<SessionActor | null> {
    return this.database.begin(async (transaction) => {
      await setUserContext(transaction, identity.userId);
      const lifecycle = await readLifecycle(transaction, identity.userId);
      if (!lifecycle) return null;
      const stepUpValidUntil = await readStepUpValidUntil(transaction, identity);
      const permissions = await transaction<{ permission_key: string }[]>`
        select distinct role_permissions.permission_key
        from platform_role_assignments assignments
        join roles on roles.id = assignments.role_id
        join role_permissions on role_permissions.role_id = roles.id
        where assignments.user_id = ${identity.userId}::uuid
          and (assignments.expires_at is null or assignments.expires_at > now())
      `;
      return actor(
        identity,
        lifecycle,
        stepUpValidUntil,
        new Set(permissions.map((row) => row.permission_key)),
        new Map(),
      );
    });
  }

  async resolveWorkspaceActor(
    identity: AuthenticatedSessionContext,
    workspaceId: string,
  ): Promise<SessionActor | null> {
    return this.database.begin(async (transaction) => {
      await setUserContext(transaction, identity.userId, workspaceId);
      const lifecycle = await readLifecycle(transaction, identity.userId);
      if (!lifecycle) return null;
      const stepUpValidUntil = await readStepUpValidUntil(transaction, identity);
      const [membership] = await transaction<{ id: string; status: string }[]>`
        select id, status from workspace_memberships
        where workspace_id = ${workspaceId}::uuid and user_id = ${identity.userId}::uuid
      `;
      const permissions = membership
        ? await transaction<{ permission_key: string }[]>`
            select distinct role_permissions.permission_key
            from membership_role_assignments assignments
            join role_permissions on role_permissions.role_id = assignments.role_id
            where assignments.membership_id = ${membership.id}::uuid
          `
        : [];
      return actor(
        identity,
        lifecycle,
        stepUpValidUntil,
        new Set(),
        new Map([
          [
            workspaceId,
            {
              active: membership?.status === "active",
              permissions: new Set(permissions.map((row) => row.permission_key)),
            },
          ],
        ]),
      );
    });
  }
}

interface LifecycleRow {
  readonly onboarding_completed_at: Date | null;
  readonly disabled_at: Date | null;
}

async function readLifecycle(
  transaction: DatabaseTransaction,
  userId: string,
): Promise<LifecycleRow | null> {
  const [row] = await transaction<LifecycleRow[]>`
    select onboarding_completed_at, disabled_at from users where id = ${userId}::uuid
  `;
  return row ?? null;
}

async function readStepUpValidUntil(
  transaction: DatabaseTransaction,
  identity: AuthenticatedSessionContext,
): Promise<Date | null> {
  const [row] = await transaction<{ expires_at: Date }[]>`
    select expires_at from step_up_sessions
    where session_id = ${identity.sessionId}::uuid
      and user_id = ${identity.userId}::uuid
      and revoked_at is null
      and expires_at > now()
    order by expires_at desc
    limit 1
  `;
  return row?.expires_at ?? null;
}

function actor(
  identity: AuthenticatedSessionContext,
  lifecycle: LifecycleRow,
  stepUpValidUntil: Date | null,
  platformPermissions: ReadonlySet<string>,
  workspaceMemberships: SessionActor["workspaceMemberships"],
): SessionActor {
  return {
    userId: identity.userId,
    sessionId: identity.sessionId,
    emailVerified: identity.emailVerified,
    onboardingComplete:
      lifecycle.onboarding_completed_at !== null && lifecycle.disabled_at === null,
    mfaSatisfied: identity.mfaSatisfied,
    stepUpValidUntil,
    platformPermissions,
    workspaceMemberships,
  };
}

async function setUserContext(
  transaction: DatabaseTransaction,
  userId: string,
  workspaceId?: string,
): Promise<void> {
  await transaction`select set_config('app.current_user_id', ${userId}, true)`;
  await transaction`select set_config('app.current_workspace_id', ${workspaceId ?? ""}, true)`;
}
