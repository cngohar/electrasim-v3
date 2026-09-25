import type {
  IdentityProvisioningRepository,
  IndependentInstructorProvisioningResult,
  InstitutionProvisioningResult,
  PersonalWorkspaceProvisioningResult,
} from "@electrasim/identity";
import type { Database, DatabaseTransaction } from "./index.ts";

export interface IdentityIdGenerator {
  next(): string;
}

const defaultIds: IdentityIdGenerator = { next: () => crypto.randomUUID() };

export class PostgresIdentityProvisioningRepository implements IdentityProvisioningRepository {
  constructor(
    private readonly database: Database,
    private readonly ids: IdentityIdGenerator = defaultIds,
  ) {}

  async ensurePersonalWorkspace(input: {
    readonly userId: string;
    readonly requestId: string;
    readonly idempotencyKey: string;
  }): Promise<PersonalWorkspaceProvisioningResult> {
    const result = await this.database.begin(async (transaction) => {
      await transaction`select id from users where id = ${input.userId}::uuid for update`;
      const [existing] = await transaction<{ workspace_id: string | null }[]>`
        select workspace_id from identity_operations
        where idempotency_key = ${input.idempotencyKey}
      `;
      if (existing?.workspace_id)
        return { value: { workspaceId: existing.workspace_id, created: false } };

      const workspaceId = this.ids.next();
      const membershipId = this.ids.next();
      const auditId = this.ids.next();
      const outboxId = this.ids.next();

      await setTenantContext(transaction, input.userId, workspaceId, input.requestId);
      await transaction`
        insert into workspaces (
          id, type, name, slug, created_by_user_id, personal_owner_user_id
        ) values (
          ${workspaceId}::uuid,
          'personal',
          'Personal workspace',
          ${`personal-${input.userId}`},
          ${input.userId}::uuid,
          ${input.userId}::uuid
        )
      `;
      await transaction`
        insert into workspace_memberships (id, workspace_id, user_id, status, joined_at)
        values (${membershipId}::uuid, ${workspaceId}::uuid, ${input.userId}::uuid, 'active', now())
      `;
      await transaction`
        insert into membership_role_assignments (membership_id, role_id, granted_by_user_id)
        select ${membershipId}::uuid, id, ${input.userId}::uuid
        from roles where key = 'personal_owner' and system = true
      `;
      await transaction`
        insert into audit_events (
          id, workspace_id, actor_user_id, action, target_type, target_id, request_id, metadata
        ) values (
          ${auditId}::uuid,
          ${workspaceId}::uuid,
          ${input.userId}::uuid,
          'identity.personal_workspace.created',
          'workspace',
          ${workspaceId},
          ${input.requestId},
          '{}'::jsonb
        )
      `;
      await transaction`
        insert into outbox_events (
          id, workspace_id, topic, aggregate_type, aggregate_id, payload, occurred_at
        ) values (
          ${outboxId}::uuid,
          ${workspaceId}::uuid,
          'identity.personal_workspace.created',
          'workspace',
          ${workspaceId},
          ${JSON.stringify({ userId: input.userId, workspaceId })}::jsonb,
          now()
        )
      `;
      await transaction`
        insert into identity_operations (idempotency_key, user_id, operation, workspace_id)
        values (
          ${input.idempotencyKey},
          ${input.userId}::uuid,
          'identity.personal_workspace.ensure',
          ${workspaceId}::uuid
        )
      `;
      return { value: { workspaceId, created: true } };
    });
    return result.value;
  }

  async createIndependentInstructorWorkspace(input: {
    readonly userId: string;
    readonly name: string;
    readonly slug: string;
    readonly requestId: string;
    readonly idempotencyKey: string;
  }): Promise<IndependentInstructorProvisioningResult> {
    const result = await this.database.begin(async (transaction) => {
      const [user] = await transaction<
        {
          email_verified: boolean;
          adult_eligibility_confirmed_at: Date | null;
          onboarding_completed_at: Date | null;
          disabled_at: Date | null;
        }[]
      >`
        select email_verified, adult_eligibility_confirmed_at, onboarding_completed_at, disabled_at
        from users where id = ${input.userId}::uuid for update
      `;
      if (
        !user?.email_verified ||
        !user.adult_eligibility_confirmed_at ||
        !user.onboarding_completed_at ||
        user.disabled_at
      ) {
        throw new Error("verified active adult with completed onboarding required");
      }

      const [existing] = await transaction<{ workspace_id: string | null }[]>`
        select workspace_id, operation from identity_operations
        where idempotency_key = ${input.idempotencyKey}
          and user_id = ${input.userId}::uuid
          and operation = 'identity.independent_instructor.create'
      `;
      if (existing?.workspace_id)
        return { value: { workspaceId: existing.workspace_id, created: false } };

      const workspaceId = this.ids.next();
      const membershipId = this.ids.next();
      const auditId = this.ids.next();
      const outboxId = this.ids.next();

      await setTenantContext(transaction, input.userId, workspaceId, input.requestId);
      await transaction`
        insert into workspaces (id, type, name, slug, created_by_user_id)
        values (
          ${workspaceId}::uuid,
          'independent_instructor',
          ${input.name},
          ${input.slug},
          ${input.userId}::uuid
        )
      `;
      await transaction`
        insert into workspace_memberships (id, workspace_id, user_id, status, joined_at)
        values (${membershipId}::uuid, ${workspaceId}::uuid, ${input.userId}::uuid, 'active', now())
      `;
      await transaction`
        insert into membership_role_assignments (membership_id, role_id, granted_by_user_id)
        select ${membershipId}::uuid, id, ${input.userId}::uuid
        from roles where key = 'owner_instructor' and system = true
      `;
      await transaction`
        insert into audit_events (
          id, workspace_id, actor_user_id, action, target_type, target_id, request_id, metadata
        ) values (
          ${auditId}::uuid,
          ${workspaceId}::uuid,
          ${input.userId}::uuid,
          'identity.independent_instructor.created',
          'workspace',
          ${workspaceId},
          ${input.requestId},
          '{}'::jsonb
        )
      `;
      await transaction`
        insert into outbox_events (
          id, workspace_id, topic, aggregate_type, aggregate_id, payload, occurred_at
        ) values (
          ${outboxId}::uuid,
          ${workspaceId}::uuid,
          'identity.independent_instructor.created',
          'workspace',
          ${workspaceId},
          ${JSON.stringify({ userId: input.userId, workspaceId })}::jsonb,
          now()
        )
      `;
      await transaction`
        insert into identity_operations (idempotency_key, user_id, operation, workspace_id)
        values (
          ${input.idempotencyKey},
          ${input.userId}::uuid,
          'identity.independent_instructor.create',
          ${workspaceId}::uuid
        )
      `;
      return { value: { workspaceId, created: true } };
    });
    return result.value;
  }

  async createInstitutionWorkspace(input: {
    readonly userId: string;
    readonly name: string;
    readonly slug: string;
    readonly countryCode: string;
    readonly timezone: string;
    readonly requestId: string;
    readonly idempotencyKey: string;
  }): Promise<InstitutionProvisioningResult> {
    const result = await this.database.begin(async (transaction) => {
      const [user] = await transaction<
        {
          email_verified: boolean;
          adult_eligibility_confirmed_at: Date | null;
          onboarding_completed_at: Date | null;
          disabled_at: Date | null;
        }[]
      >`
        select email_verified, adult_eligibility_confirmed_at, onboarding_completed_at, disabled_at
        from users where id = ${input.userId}::uuid for update
      `;
      if (
        !user?.email_verified ||
        !user.adult_eligibility_confirmed_at ||
        !user.onboarding_completed_at ||
        user.disabled_at
      ) {
        throw new Error("verified active adult with completed onboarding required");
      }
      const [existing] = await transaction<{ workspace_id: string | null }[]>`
        select workspace_id from identity_operations
        where idempotency_key = ${input.idempotencyKey} and user_id = ${input.userId}::uuid
          and operation = 'identity.institution.create'
      `;
      if (existing?.workspace_id) {
        const [institution] = await transaction<{ id: string }[]>`
          select id from institutions where workspace_id = ${existing.workspace_id}::uuid limit 1
        `;
        if (!institution) throw new Error("institution provisioning record is incomplete");
        return {
          value: {
            workspaceId: existing.workspace_id,
            institutionId: institution.id,
            created: false,
          },
        };
      }
      const workspaceId = this.ids.next();
      const institutionId = this.ids.next();
      const membershipId = this.ids.next();
      await setTenantContext(transaction, input.userId, workspaceId, input.requestId);
      await transaction`
        insert into workspaces (id, type, name, slug, created_by_user_id)
        values (${workspaceId}::uuid, 'institution', ${input.name}, ${input.slug}, ${input.userId}::uuid)
      `;
      await transaction`
        insert into institutions (
          id, workspace_id, legal_name, display_name, country_code, timezone
        ) values (
          ${institutionId}::uuid, ${workspaceId}::uuid, ${input.name}, ${input.name},
          ${input.countryCode}, ${input.timezone}
        )
      `;
      await transaction`
        insert into workspace_memberships (id, workspace_id, user_id, status, joined_at)
        values (${membershipId}::uuid, ${workspaceId}::uuid, ${input.userId}::uuid, 'active', now())
      `;
      await transaction`
        insert into membership_role_assignments (membership_id, role_id, granted_by_user_id)
        select ${membershipId}::uuid, id, ${input.userId}::uuid from roles
        where key = 'institution_owner' and system = true
      `;
      await transaction`
        insert into audit_events (id, workspace_id, actor_user_id, action, target_type, target_id, request_id, metadata)
        values (gen_random_uuid(), ${workspaceId}::uuid, ${input.userId}::uuid,
          'identity.institution.created', 'institution', ${institutionId}, ${input.requestId}, '{}'::jsonb)
      `;
      await transaction`
        insert into outbox_events (id, workspace_id, topic, aggregate_type, aggregate_id, payload)
        values (gen_random_uuid(), ${workspaceId}::uuid, 'identity.institution.created',
          'institution', ${institutionId}, ${JSON.stringify({ userId: input.userId, workspaceId, institutionId })}::jsonb)
      `;
      await transaction`
        insert into identity_operations (idempotency_key, user_id, operation, workspace_id)
        values (${input.idempotencyKey}, ${input.userId}::uuid, 'identity.institution.create', ${workspaceId}::uuid)
      `;
      return { value: { workspaceId, institutionId, created: true } };
    });
    return result.value;
  }
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
