import {
  type InvitationAcceptanceRepository,
  type InvitationAcceptanceResult,
  InvitationError,
  isInvitationRoleAllowed,
} from "@electrasim/invitations";
import type { Database, DatabaseTransaction } from "./index.ts";

export class PostgresInvitationAcceptanceRepository implements InvitationAcceptanceRepository {
  constructor(
    private readonly database: Database,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  async accept(
    input: Parameters<InvitationAcceptanceRepository["accept"]>[0],
  ): Promise<InvitationAcceptanceResult> {
    const result = await this.database.begin(async (transaction) => {
      await setContext(transaction, input.userId, input.token.workspaceId, input.requestId);
      const [user] = await transaction<
        {
          email_normalized: string;
          email_verified: boolean;
          onboarding_completed_at: Date | null;
          disabled_at: Date | null;
        }[]
      >`
        select email_normalized, email_verified, onboarding_completed_at, disabled_at
        from users where id = ${input.userId}::uuid
      `;
      if (!user?.email_verified || !user.onboarding_completed_at || user.disabled_at) {
        throw new InvitationError("verified_onboarded_account_required");
      }

      const [invitation] = await transaction<
        {
          id: string;
          workspace_id: string;
          email_normalized: string;
          status: "pending" | "accepted" | "revoked" | "expired";
          expires_at: Date;
          accepted_by_user_id: string | null;
          invited_by_user_id: string;
        }[]
      >`
        select id, workspace_id, email_normalized, status, expires_at, accepted_by_user_id,
          invited_by_user_id
        from invitations
        where id = ${input.token.invitationId}::uuid
          and workspace_id = ${input.token.workspaceId}::uuid
          and token_hash = ${input.token.tokenHash}
        for update
      `;
      if (!invitation) throw new InvitationError("invitation_not_found");
      if (invitation.status === "accepted") {
        if (invitation.accepted_by_user_id !== input.userId) {
          throw new InvitationError("invitation_already_used");
        }
        const membershipId = await existingMembershipId(
          transaction,
          invitation.workspace_id,
          input.userId,
        );
        if (!membershipId) throw new InvitationError("invitation_already_used");
        return {
          value: {
            workspaceId: invitation.workspace_id,
            membershipId,
            alreadyAccepted: true,
          },
        };
      }
      if (invitation.status === "revoked") throw new InvitationError("invitation_revoked");
      if (
        invitation.status === "expired" ||
        invitation.expires_at.getTime() <= input.acceptedAt.getTime()
      ) {
        throw new InvitationError("invitation_expired");
      }
      if (invitation.email_normalized !== user.email_normalized) {
        throw new InvitationError("invited_email_mismatch");
      }

      const [workspace] = await transaction<
        {
          type: "independent_instructor" | "institution" | "personal";
        }[]
      >`
        select type from workspaces where id = ${invitation.workspace_id}::uuid
      `;
      if (
        !workspace ||
        (workspace.type !== "independent_instructor" && workspace.type !== "institution")
      ) {
        throw new InvitationError("invitation_role_not_allowed");
      }
      const workspaceType = workspace.type;
      const roles = await transaction<{ id: string; key: string }[]>`
        select roles.id, roles.key
        from invitation_roles
        join roles on roles.id = invitation_roles.role_id
        where invitation_roles.invitation_id = ${invitation.id}::uuid
      `;
      if (
        roles.length === 0 ||
        roles.some((role) => !isInvitationRoleAllowed(workspaceType, role.key))
      ) {
        throw new InvitationError("invitation_role_not_allowed");
      }

      const [existingMembership] = await transaction<{ id: string; status: string }[]>`
        select id, status from workspace_memberships
        where workspace_id = ${invitation.workspace_id}::uuid
          and user_id = ${input.userId}::uuid
        for update
      `;
      if (existingMembership?.status === "suspended") {
        throw new InvitationError("membership_suspended");
      }
      const membershipId = existingMembership?.id ?? this.nextId();
      if (existingMembership) {
        await transaction`
          update workspace_memberships
          set status = 'active', joined_at = coalesce(joined_at, ${input.acceptedAt.toISOString()}::timestamptz),
              ended_at = null, updated_at = now()
          where id = ${membershipId}::uuid
        `;
      } else {
        await transaction`
          insert into workspace_memberships (id, workspace_id, user_id, status, joined_at)
          values (
            ${membershipId}::uuid,
            ${invitation.workspace_id}::uuid,
            ${input.userId}::uuid,
            'active',
            ${input.acceptedAt.toISOString()}::timestamptz
          )
        `;
      }

      for (const role of roles) {
        await transaction`
          insert into membership_role_assignments (membership_id, role_id, granted_by_user_id)
          values (
            ${membershipId}::uuid,
            ${role.id}::uuid,
            ${invitation.invited_by_user_id}::uuid
          )
          on conflict (membership_id, role_id) do nothing
        `;
      }
      await transaction`
        update invitations
        set status = 'accepted', accepted_at = ${input.acceptedAt.toISOString()}::timestamptz,
            accepted_by_user_id = ${input.userId}::uuid, updated_at = now()
        where id = ${invitation.id}::uuid and status = 'pending'
      `;
      await transaction`
        insert into audit_events (
          id, workspace_id, actor_user_id, action, target_type, target_id, request_id, metadata
        ) values (
          ${this.nextId()}::uuid,
          ${invitation.workspace_id}::uuid,
          ${input.userId}::uuid,
          'identity.invitation.accepted',
          'invitation',
          ${invitation.id},
          ${input.requestId},
          ${JSON.stringify({ roleKeys: roles.map((role) => role.key) })}::jsonb
        )
      `;
      await transaction`
        insert into outbox_events (
          id, workspace_id, topic, aggregate_type, aggregate_id, payload, occurred_at
        ) values (
          ${this.nextId()}::uuid,
          ${invitation.workspace_id}::uuid,
          'identity.invitation.accepted',
          'invitation',
          ${invitation.id},
          ${JSON.stringify({
            invitationId: invitation.id,
            membershipId,
            userId: input.userId,
            workspaceId: invitation.workspace_id,
          })}::jsonb,
          ${input.acceptedAt.toISOString()}::timestamptz
        )
      `;
      return {
        value: {
          workspaceId: invitation.workspace_id,
          membershipId,
          alreadyAccepted: false,
        },
      };
    });
    return result.value;
  }
}

async function existingMembershipId(
  transaction: DatabaseTransaction,
  workspaceId: string,
  userId: string,
): Promise<string | null> {
  const [membership] = await transaction<{ id: string }[]>`
    select id from workspace_memberships
    where workspace_id = ${workspaceId}::uuid and user_id = ${userId}::uuid
  `;
  return membership?.id ?? null;
}

async function setContext(
  transaction: DatabaseTransaction,
  userId: string,
  workspaceId: string,
  requestId: string,
): Promise<void> {
  await transaction`select set_config('app.current_user_id', ${userId}, true)`;
  await transaction`select set_config('app.current_workspace_id', ${workspaceId}, true)`;
  await transaction`select set_config('app.request_id', ${requestId}, true)`;
}
