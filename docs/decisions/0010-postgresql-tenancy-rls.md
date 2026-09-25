# ADR 0010 — PostgreSQL Tenancy, Scoped RBAC, and Row-Level Security

- **Status:** Accepted
- **Date:** 2026-09-24
- **Phase:** v3 identity and tenancy foundation
- **Deciders:** Product owner and architecture owner
- **Depends on:** [ADR 0009](./0009-bun-paas-cloudflare-cdn.md)
- **Plan references:** `PLAN.md` §§4–7, 14–16

## Context

ElectraSim has one global identity per person and several distinct management contexts:

- a personal workspace created for every user;
- an independent-instructor workspace that any verified adult user may create;
- an institution tenant with owners, administrators, instructors, learners, optional campuses, and optional departments;
- platform administration for ElectraSim staff;
- later course/section roles inside teaching workspaces.

Authentication alone cannot enforce these boundaries. A user may be an institution administrator in one tenant, learner in another, independent instructor elsewhere, and an ordinary personal user globally. Platform staff permissions must not be conflated with institution permissions. Assessments may exist only in independent-instructor or institution teaching contexts.

Application authorization remains the primary policy layer, but database row-level security (RLS) is required as defense in depth against missing filters, insecure direct-object references, and accidental cross-tenant queries.

## Decision

Use portable PostgreSQL as the source of truth with **global identity, explicit workspaces, scoped RBAC, application policy enforcement, and PostgreSQL RLS defense in depth**.

### Identity and workspace model

A user is global and is not duplicated for each tenant. Every tenant-owned row carries a non-null `workspace_id` unless an ADR explicitly identifies it as global reference data.

Workspace types are:

```text
personal
independent_instructor
institution
```

- **Personal:** exactly one owner; learning, sandbox projects, profile, and plan context; no formal assessment or gradebook authority.
- **Independent instructor:** one owner plus optional collaborators and invited learners; may own courses, assessments, gradebook, and teaching analytics.
- **Institution:** organization tenant supporting owners/admins, campuses, departments, terms, course offerings, cohorts, integrations, licenses, and institution analytics.

An institution record has a one-to-one relationship with its institution workspace. Campuses and departments are optional children and never independent security tenants in the initial model.

### Membership and role model

Workspace membership records answer **where** a person belongs. Roles answer **what** they may do there.

- Platform roles are assigned globally and stored separately from workspace memberships.
- Workspace roles are assigned through membership-role records.
- Later course/section assignments add a narrower resource scope without replacing workspace membership.
- Roles are versioned permission bundles. Authorization checks use permission keys, never scattered role-name comparisons.
- System roles cannot be edited. Institution custom roles may only include permissions allowed for their scope and plan.
- A user may hold multiple roles; effective permissions are the union within the active scope, subject to explicit policy constraints.
- No workspace role can grant platform permissions or access another workspace.

Initial system role families are:

```text
platform: super_admin, platform_moderator, support_agent,
          billing_operator, content_manager, auditor

personal: owner

independent instructor: owner_instructor, co_instructor, grader, learner

institution: owner, institution_admin, academic_admin, billing_admin,
             data_officer, instructor, teaching_assistant, learner, observer
```

Platform `super_admin` is not a routine database bypass. Browser requests still use policy checks, tenant context, step-up authentication for high-risk actions, and audit events.

### Authorization boundary

The application policy service is authoritative for actions such as:

```ts
can(actor, "institution.member.role.assign", {
  workspaceId,
  targetMembershipId,
});
```

Every protected use case provides the actor, active workspace, action, resource identifiers, and relevant attributes. Default is deny.

RLS provides a narrower safety boundary: tenant rows are only visible when the transaction has an authenticated user and active workspace that match an active membership, or when an explicitly audited platform operation uses a dedicated path.

### Transaction-scoped PostgreSQL context

At the start of every tenant transaction, the database adapter uses transaction-local settings:

```sql
select set_config('app.current_user_id', $1, true);
select set_config('app.current_workspace_id', $2, true);
select set_config('app.request_id', $3, true);
```

The final `true` makes each value local to the transaction and prevents pooled-connection leakage. Queries outside the helper have no tenant context and fail closed under RLS.

Application code cannot set an arbitrary workspace until the policy layer has validated active membership. Worker jobs use an explicit service/actor context recorded in the audit event.

### Database roles

Use separate PostgreSQL roles:

- migration owner — owns schema and applies reviewed migrations; not used by the web application;
- authentication runtime — dedicated least-privilege role for Better Auth's global `users`, `sessions`, `accounts`, `verifications`, passkey, and MFA records; it receives no tenant-table mutation grants;
- application runtime — no superuser and no `BYPASSRLS`; reads/writes tenant data only through granted tables/functions after policy validation;
- background worker — similarly constrained, with only required job/outbox operations;
- read-only operations/analytics roles — separately granted and audited where needed.

The production roles must not own tenant tables because table owners may bypass RLS unless forced. Enable and force RLS on tenant tables. Better Auth must create and verify global identities before a tenant context exists, so global auth tables—including `users`—are deliberately outside tenant RLS. Their isolation boundary is the dedicated authentication role plus explicit grants, not a permissive context-free RLS policy. Application code must not reuse the authentication connection for arbitrary domain queries.

### RLS policy shape

Reusable security-definer functions live in a dedicated schema with a fixed safe `search_path`. They expose only narrow checks such as:

- current user ID;
- current workspace ID;
- active membership in the current workspace;
- effective permission inside the current workspace.

Tenant policies require both `workspace_id = current_workspace_id()` and active membership. Write policies use `WITH CHECK` as well as `USING` so rows cannot be inserted or moved into another tenant.

RLS does not replace application checks for ownership, course assignment, invitation expiry, plan entitlement, assessment windows, accommodations, or high-risk step-up authentication. It also does not protect global Better Auth tables: those tables use least-privilege grants on the separate authentication role, with passwords stored only as Better Auth credential hashes and tokens treated as secrets.

### Platform administration

Platform administration is a separate route and policy context. Platform staff roles remain least-privilege:

- support cannot silently acquire billing or moderation powers;
- institution support access requires a reason, expiry, target tenant, and visible audit record;
- impersonation creates an explicit support session and never reuses the staff member as the user's identity;
- destructive tenant deletion and large exports require two-person approval;
- audit-only roles cannot mutate product data.

### Institution administration

Institution administration is always workspace-scoped. Owners/admins may manage only their tenant's hierarchy, memberships, roles, courses, licenses, integrations, policies, analytics, and audit history according to permission.

Campus and department scope may narrow visibility for delegated administrators, but absence of those structures keeps small institutions flat.

### Independent instructor administration

Independent instructors use the same workspace and membership primitives, but cannot claim institution-only capabilities such as verified domains, campuses, enterprise SSO, institution-wide analytics, or institution branding. Conversion to an institution is an explicit reviewed workflow, not a role toggle.

### Invitations

Invitations are tenant-bound, expire, are single-use/idempotent, and record inviter, normalized target email, intended roles, and status. Accepting an invitation never links identities solely by an unverified email claim.

### Audit and outbox

High-risk and security-sensitive mutations write an append-only audit event in the same transaction as the business change. Audit context includes actor, support actor where applicable, active workspace, action, target, request ID, timestamp, and redacted metadata.

Integration/domain events use a transactional outbox. Workers may update delivery metadata, but may not erase the original event payload or business transaction reference.

### Deletion and retention

- Removing membership revokes access without deleting the global user.
- Tenant deletion is a staged, recoverable, two-person operation with retention/legal checks.
- Personal account deletion does not erase institution-owned academic records where lawful retention applies; identity is detached or pseudonymized according to policy.
- Audit, grade, payment, and XP records use explicit retention and correction/reversal semantics rather than silent destructive edits.

## Initial schema boundary

The first migration contains:

```text
users
workspaces
workspace_memberships
institutions
campuses
departments
permissions
roles
role_permissions
membership_role_assignments
platform_role_assignments
invitations
invitation_roles
audit_events
outbox_events
```

Courses, sections, assessments, grades, subscriptions, and community records follow after tenancy isolation is proven.

## Testing gates

A real PostgreSQL test instance—not an in-memory SQL substitute—must prove:

1. missing tenant context returns no tenant rows or raises a controlled denial;
2. Workspace A cannot read, insert, update, or delete Workspace B rows, including direct-ID attempts;
3. `WITH CHECK` prevents changing a row's `workspace_id`;
4. removed/suspended membership immediately loses access;
5. independent-instructor roles cannot acquire institution/platform permissions;
6. institution administrators cannot grant platform roles;
7. platform support access requires explicit audited context and expires;
8. pooled transactions do not leak user/workspace settings;
9. migration and table-owner roles differ from the runtime role;
10. authentication, application, and worker roles do not have `BYPASSRLS`;
11. the authentication role can operate required global auth records but cannot read or mutate tenant-owned data;
12. the application role cannot read credential secrets or verification/recovery tokens outside the reviewed auth boundary;
13. invitation acceptance is expiry-aware and idempotent;
14. audit/outbox records commit or roll back with the protected mutation.

Static SQL inspection tests may supplement but never replace execution against PostgreSQL.

## Rationale

- Explicit workspaces cleanly distinguish ordinary users, independent instructors, and institutions.
- Scoped RBAC supports users with multiple simultaneous relationships without global role inflation.
- Application policy expresses rich product rules while RLS catches missing tenant filters.
- Transaction-local context is compatible with pooled managed PostgreSQL connections.
- Separate platform roles prevent institution administrators from becoming ElectraSim operators.
- Audit/outbox transactions protect high-risk operations and reliable integrations.

## Consequences

### Positive

- Admin, instructor, learner, and platform surfaces share one consistent authorization model.
- Tenant-owned tables have a repeatable isolation pattern.
- Independent instructors do not need fake institution records.
- Future PaaS/database-provider changes do not alter domain tenancy semantics.

### Costs and limitations

- Every tenant transaction must establish validated context.
- RLS policies and application policy both require testing and review.
- Analytics and support operations need explicit safe paths rather than unrestricted queries.
- Custom roles require permission ceilings and versioning.
- Real PostgreSQL integration tests are mandatory in CI and local container-enabled development.

## Revisit triggers

Revisit this ADR if parent/child institutions become separate legal/security tenants, customers require database-per-tenant isolation, delegated campus/department administration cannot be expressed safely, or measured RLS overhead requires a reviewed alternative.
