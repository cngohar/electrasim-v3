import {
  InvitationError,
  type InvitationManagementRepository,
  type InvitationWorkspaceType,
  isInvitationRoleAllowed,
} from "@electrasim/invitations";
import type { TransactionalEmailMessage } from "@electrasim/platform-contracts";
import type { Database, DatabaseTransaction } from "./index.ts";

export class PostgresInvitationManagementRepository implements InvitationManagementRepository {
  constructor(
    private readonly database: Database,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  async issue(
    input: Parameters<InvitationManagementRepository["issue"]>[0],
  ): Promise<Awaited<ReturnType<InvitationManagementRepository["issue"]>>> {
    const result = await this.database.begin(async (transaction) => {
      await setContext(transaction, input.actorUserId, input.workspaceId, input.requestId);
      const workspaceType = await assertManager(transaction, input.workspaceId, input.actorUserId);
      const roles = await transaction<{ id: string; key: string }[]>`
        select id, key from roles
        where key in ${transaction(input.roleKeys)}
          and scope_type <> 'platform'
      `;
      if (
        roles.length !== input.roleKeys.length ||
        roles.some((role) => !isInvitationRoleAllowed(workspaceType, role.key))
      ) {
        throw new InvitationError("invitation_role_not_allowed");
      }
      // Serialize issue attempts for one workspace/email pair. The partial unique
      // index remains the final invariant; this lock lets us return a stable domain error.
      await transaction`
        select pg_advisory_xact_lock(
          hashtextextended(${`${input.workspaceId}:${input.emailNormalized}`}, 0)
        )
      `;
      await transaction`
        update invitations set status = 'expired', updated_at = now()
        where workspace_id = ${input.workspaceId}::uuid
          and email_normalized = ${input.emailNormalized}
          and status = 'pending'
          and expires_at <= now()
      `;
      const [pending] = await transaction<{ id: string }[]>`
        select id from invitations
        where workspace_id = ${input.workspaceId}::uuid
          and email_normalized = ${input.emailNormalized}
          and status = 'pending'
          and expires_at > now()
        limit 1
      `;
      if (pending) throw new InvitationError("pending_invitation_exists");

      await transaction`
        insert into invitations (
          id, workspace_id, email_normalized, token_hash, status,
          invited_by_user_id, expires_at
        ) values (
          ${input.invitationId}::uuid,
          ${input.workspaceId}::uuid,
          ${input.emailNormalized},
          ${input.tokenHash},
          'pending',
          ${input.actorUserId}::uuid,
          ${input.expiresAt.toISOString()}::timestamptz
        )
      `;
      for (const role of roles) {
        await transaction`
          insert into invitation_roles (invitation_id, role_id)
          values (${input.invitationId}::uuid, ${role.id}::uuid)
        `;
      }

      const email: TransactionalEmailMessage = {
        id: `workspace-invitation-${input.invitationId}`,
        to: input.emailNormalized,
        template: "workspace_invitation",
        variables: { url: input.invitationUrl },
        tags: { workspaceId: input.workspaceId, invitationId: input.invitationId },
      };
      await transaction`
        insert into durable_system_jobs (id, type, payload)
        values (
          ${`email.transactional:${email.id}`},
          'email.transactional',
          ${JSON.stringify(email)}::jsonb
        )
        on conflict (id) do nothing
      `;
      await writeEvents(transaction, {
        auditId: this.nextId(),
        outboxId: this.nextId(),
        action: "identity.invitation.issued",
        invitationId: input.invitationId,
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        requestId: input.requestId,
        payload: {
          invitationId: input.invitationId,
          workspaceId: input.workspaceId,
          roleKeys: roles.map((role) => role.key),
        },
      });
      return {
        value: {
          invitationId: input.invitationId,
          workspaceId: input.workspaceId,
          expiresAt: input.expiresAt,
        },
      };
    });
    return result.value;
  }

  async revoke(
    input: Parameters<InvitationManagementRepository["revoke"]>[0],
  ): Promise<{ readonly alreadyRevoked: boolean }> {
    const result = await this.database.begin(async (transaction) => {
      await setContext(transaction, input.actorUserId, input.workspaceId, input.requestId);
      await assertManager(transaction, input.workspaceId, input.actorUserId);
      const [invitation] = await transaction<{ status: string }[]>`
        select status from invitations
        where id = ${input.invitationId}::uuid
          and workspace_id = ${input.workspaceId}::uuid
        for update
      `;
      if (!invitation) throw new InvitationError("invitation_not_found");
      if (invitation.status === "revoked") return { value: { alreadyRevoked: true } };
      if (invitation.status !== "pending") {
        throw new InvitationError("invitation_not_revocable");
      }
      await transaction`
        update invitations set status = 'revoked', updated_at = now()
        where id = ${input.invitationId}::uuid
      `;
      await writeEvents(transaction, {
        auditId: this.nextId(),
        outboxId: this.nextId(),
        action: "identity.invitation.revoked",
        invitationId: input.invitationId,
        workspaceId: input.workspaceId,
        actorUserId: input.actorUserId,
        requestId: input.requestId,
        payload: {
          invitationId: input.invitationId,
          workspaceId: input.workspaceId,
          revokedAt: input.revokedAt.toISOString(),
        },
      });
      return { value: { alreadyRevoked: false } };
    });
    return result.value;
  }
}

async function assertManager(
  transaction: DatabaseTransaction,
  workspaceId: string,
  actorUserId: string,
): Promise<InvitationWorkspaceType> {
  const [access] = await transaction<{ type: string; can_manage: boolean }[]>`
    select workspaces.type,
      exists (
        select 1
        from workspace_memberships memberships
        join membership_role_assignments assignments on assignments.membership_id = memberships.id
        join role_permissions on role_permissions.role_id = assignments.role_id
        where memberships.workspace_id = workspaces.id
          and memberships.user_id = ${actorUserId}::uuid
          and memberships.status = 'active'
          and role_permissions.permission_key = 'workspace.membership.manage'
      ) as can_manage
    from workspaces where workspaces.id = ${workspaceId}::uuid
  `;
  if (!access?.can_manage) throw new InvitationError("invitation_management_denied");
  if (access.type !== "institution" && access.type !== "independent_instructor") {
    throw new InvitationError("invitation_role_not_allowed");
  }
  return access.type;
}

async function writeEvents(
  transaction: DatabaseTransaction,
  input: {
    readonly auditId: string;
    readonly outboxId: string;
    readonly action: string;
    readonly invitationId: string;
    readonly workspaceId: string;
    readonly actorUserId: string;
    readonly requestId: string;
    readonly payload: Record<string, unknown>;
  },
): Promise<void> {
  await transaction`
    insert into audit_events (
      id, workspace_id, actor_user_id, action, target_type, target_id, request_id, metadata
    ) values (
      ${input.auditId}::uuid, ${input.workspaceId}::uuid, ${input.actorUserId}::uuid,
      ${input.action}, 'invitation', ${input.invitationId}, ${input.requestId}, '{}'::jsonb
    )
  `;
  await transaction`
    insert into outbox_events (
      id, workspace_id, topic, aggregate_type, aggregate_id, payload, occurred_at
    ) values (
      ${input.outboxId}::uuid, ${input.workspaceId}::uuid, ${input.action},
      'invitation', ${input.invitationId}, ${JSON.stringify(input.payload)}::jsonb, now()
    )
  `;
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
