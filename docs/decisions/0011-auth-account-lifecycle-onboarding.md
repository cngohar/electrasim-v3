# ADR 0011 — Better Auth, Account Lifecycle, Mandatory Onboarding, and Admin Session Gates

- **Status:** Accepted
- **Date:** 2026-09-24
- **Phase:** v3 identity foundation
- **Deciders:** Product owner and architecture owner
- **Depends on:** [ADR 0009](./0009-bun-paas-cloudflare-cdn.md), [ADR 0010](./0010-postgresql-tenancy-rls.md)
- **Plan references:** `PLAN.md` §§3.7, 4–7, 14–16

## Context

ElectraSim v3 targets adults only and requires mandatory onboarding. Every person has one global account, one personal workspace, and may later create an independent-instructor workspace or join one or more institutions. Platform administration, institution administration, and independent-instructor management are distinct protected contexts.

The product needs email/password, email verification, recovery, social providers, passkeys, MFA, secure sessions, account linking, invitations, and eventual enterprise SSO. Authentication must remain separate from authorization: a valid session does not grant tenant or admin access.

The application runs on Bun behind Cloudflare DNS/CDN/TLS and a managed PaaS. Authenticated responses cannot be shared-cacheable. Proxy-derived host/protocol values cannot be trusted without explicit configuration.

## Decision

Use **Better Auth 1.7.x**, pinned to an exact reviewed patch, for credential/session/account plumbing. ElectraSim-owned application services remain authoritative for onboarding, workspaces, invitations, tenant membership, roles, admin access, and audit.

### Launch authentication methods

- email and password;
- mandatory email verification before ordinary authenticated product access;
- password reset by single-use expiring email link;
- Google and Microsoft OAuth when production credentials are configured;
- passkeys/WebAuthn;
- TOTP two-factor authentication and one-time recovery codes for users who enable it;
- step-up authentication for high-risk administration operations.

Magic-link/email-OTP login may be enabled after abuse, enumeration, and delivery-rate controls pass. Institution OIDC follows the core identity slice; SAML/SCIM remains an enterprise phase.

### Better Auth boundary

Mount Better Auth at `/api/auth/*` by forwarding the raw Web Standard `Request` to `auth.handler(request)`. Do not put institution or platform authorization into Better Auth organization-role shortcuts.

Better Auth owns:

- credential/account records;
- session issuance, rotation, expiry, and revocation;
- verification and recovery tokens;
- OAuth account linking plumbing;
- passkey and MFA credential plumbing.

ElectraSim owns:

- adult eligibility;
- mandatory onboarding state;
- personal/instructor/institution workspaces;
- memberships, roles, permissions, and entitlements;
- institution invitations;
- admin route/action policies;
- audit events and support sessions.

### Database integration

Use the Better Auth Drizzle adapter with the shared PostgreSQL connection and an explicitly mapped schema. Better Auth schema changes are generated/reviewed into normal SQL migrations; the application never performs uncontrolled schema migration on startup.

Core auth tables are:

```text
users
sessions
accounts
verifications
passkeys
two_factors
```

The existing global `users` table is the Better Auth user model and includes ElectraSim lifecycle fields. Auth records are global rather than tenant-owned. Tenant access remains in ADR 0010 membership tables.

Better Auth signup and verification run before any active workspace exists. Therefore global auth tables—including `users`—do not use tenant RLS. Better Auth uses a dedicated least-privilege PostgreSQL connection role that can operate the reviewed global auth tables and cannot mutate tenant-owned tables. The normal application and worker roles receive only the auth-table columns/functions their use cases require. This is an explicit exception to tenant RLS, not permission for context-free access from the general application connection.

IDs are application/library-generated opaque UUID-compatible strings according to the reviewed adapter configuration. No email address is used as a foreign key.

### Signup and email verification

- Normalize email consistently and enforce database uniqueness.
- Return non-enumerating responses for signup, verification resend, login failure, and recovery where practical.
- Require verified email before completing onboarding, accepting an institution invitation, creating an instructor workspace, or entering admin surfaces.
- Email delivery goes through the provider-neutral transactional email port. Resend is the launch provider; Amazon SES remains an adapter alternative.
- Verification/recovery callbacks await only a durable provider-neutral enqueue/outbox write; they never await Resend/SES network delivery. A worker performs provider delivery, preserving durability while reducing provider timing leakage.
- Links use allowlisted first-party callback URLs only.

### Personal workspace provisioning

User creation and Better Auth hooks are not assumed to share an atomic transaction with ElectraSim tables. Therefore personal workspace provisioning is an **idempotent lifecycle operation**, not a fragile one-shot side effect.

1. After user creation, schedule `identity.personal_workspace.ensure` with an idempotency key based on user ID.
2. The lifecycle service transaction creates the personal workspace, active owner membership, owner role assignment, audit event, and outbox event if they do not already exist.
3. The first authenticated request also invokes the same ensure operation when provisioning is incomplete.
4. A reconciliation job repairs accounts left incomplete by provider/database/email failures.
5. Product access remains in `provisioning` state until the operation succeeds; credentials are never silently deleted because workspace provisioning temporarily failed.

Exactly one personal workspace per user is enforced by database constraint, not only application code.

### Mandatory onboarding state machine

```text
registered
  -> email_verification_required
  -> personal_workspace_provisioning
  -> adult_eligibility_required
  -> role_goal_required
  -> experience_required
  -> region_standard_required
  -> accessibility_preferences
  -> complete
```

Required launch fields:

- verified email;
- adult eligibility confirmation (18+ launch policy);
- primary goal: learn independently, teach independently, or join/manage an institution;
- electrical experience;
- region/supply family: US 110–120 V or international 230–240 V;
- acknowledgement of safety/terms versions.

Accessibility preferences may retain safe defaults and allow “use defaults,” but the screen must still be presented. Biography, avatar, interests, and public-profile fields remain optional.

Every authenticated application request resolves an onboarding gate. Users with incomplete onboarding may access only sign-out, session/security settings, verification, recovery, required onboarding, legal/safety documents, accessibility controls, and support. Deep links resume after onboarding only if the destination is still authorized.

### Independent-instructor self-registration

Any verified adult account with completed onboarding may create an independent-instructor workspace. This operation:

- is explicit and separate from choosing “teach” during signup;
- applies anti-abuse/rate controls;
- creates the workspace, owner membership, `owner_instructor` role, audit event, and outbox event atomically;
- is idempotent for retried requests;
- never creates or claims an institution;
- does not grant platform or institution roles;
- may require plan/entitlement checks for later premium limits, but basic instructor registration remains available according to product policy.

### Institution invitation acceptance

Invitation acceptance requires:

- authenticated verified identity;
- normalized invited email match unless an institution-approved alternate identity flow exists;
- unexpired, pending, tenant-bound invitation;
- transactionally created/reactivated membership and allowed role assignments;
- idempotent repeated acceptance;
- complete audit record.

Invitation links contain non-secret workspace/invitation routing IDs plus at least 256 bits of random secret material; PostgreSQL stores only the SHA-256 hash of the complete token. Acceptance rechecks workspace type and explicit role ceilings, and invitation links can never grant owner or platform roles.

An invitation never merges accounts automatically. Account linking requires fresh proof from both identities/providers.

### Session and cookie policy

- HTTP-only cookies;
- `Secure` in production;
- `SameSite=Lax` by default, with stricter or explicit exceptions reviewed per OAuth flow;
- host-only cookie by default; no broad parent-domain cookie unless a future multi-subdomain design requires it;
- bounded session lifetime, rotation, and per-device revocation;
- no auth tokens in localStorage;
- state-changing browser requests protected by same-origin/CSRF controls;
- authenticated/session responses use `Cache-Control: private, no-store`;
- session identifiers, verification tokens, recovery tokens, and secrets are never logged.

Better Auth `baseURL` and trusted origins are explicit environment configuration. Forwarded host/protocol headers are trusted only through the reviewed proxy chain; unknown hosts fail closed.

### Admin session gates

Authentication establishes the actor; authorization evaluates every route and action.

- `/app/admin/*` requires an active session, verified email, completed onboarding, applicable platform permission, and MFA/step-up where required.
- `/app/i/:workspace/*` requires active membership in the exact route workspace plus the action permission.
- independent-instructor management requires active membership in that independent-instructor workspace.
- platform support impersonation uses a separate short-lived support-session record containing staff actor, target user, target workspace, reason, expiry, approval where required, and audit IDs.
- impersonation is visually persistent and cannot access credentials, MFA secrets, or unrestricted billing/payment operations.

A successful step-up creates a short-lived proof record bound by composite foreign key to the exact Better Auth session and user. Password step-up uses Better Auth's server-side password verifier; passkey step-up must establish the same proof semantics. Proof records use forced self-RLS, expire after at most 15 minutes, and are deleted when the parent session is revoked.

UI navigation hiding is convenience only; the server policy is mandatory.

### Account lifecycle

- Users can list/revoke sessions, change password, register/remove passkeys, configure MFA, and review linked accounts.
- Sensitive changes require fresh authentication.
- Changing primary email requires verification and collision checks.
- Institution offboarding removes membership without deleting the global account or personal workspace.
- Account deactivation revokes sessions and prevents login while preserving records according to retention policy.
- Deletion is staged and audited; institution-owned academic records follow lawful retention/pseudonymization rules.
- Platform suspension and community sanctions are distinct states with distinct appeal/audit behavior.

### Rate limits and abuse controls

Apply actor/IP/network-aware limits to signup, login, password reset, verification resend, OAuth linking, passkey registration, MFA recovery, invitation acceptance, instructor workspace creation, and admin step-up. Limits and challenges must remain accessible and avoid cognitive CAPTCHA puzzles.

## Testing gates

1. auth handler accepts Web Standard requests under Bun;
2. signup does not expose whether an account exists;
3. unverified email cannot enter normal product, invitation, instructor, or admin routes;
4. personal workspace provisioning is idempotent and reconciles interrupted attempts;
5. onboarding gates every protected deep link and resumes safely;
6. under-age eligibility fails closed and no minor profile/workspace flow is created;
7. instructor creation is atomic, idempotent, audited, and cannot create institution/platform roles;
8. institution invitation acceptance enforces email, expiry, tenant, role ceiling, and idempotency;
9. session cookies have production security attributes;
10. authenticated responses are `private, no-store` through origin and CDN;
11. account linking requires fresh provider proof and cannot take over an existing identity;
12. admin routes deny missing permission, incomplete onboarding, absent MFA/step-up, wrong tenant, suspended membership, and expired support session;
13. session revocation takes effect across application instances;
14. secrets and tokens do not appear in logs, traces, audit metadata, or errors;
15. the dedicated authentication role can complete signup/verification but cannot access tenant-owned rows, while the ordinary application role cannot bypass the reviewed auth boundary.

## Rationale

- Better Auth supplies reviewed authentication/session primitives without becoming the authorization model.
- Idempotent personal-workspace provisioning survives non-atomic library hooks and transient failures.
- A mandatory state machine makes onboarding enforceable and testable instead of a dismissible modal.
- Separate admin gates preserve platform, institution, and instructor boundaries.
- Explicit proxy/origin configuration matches the Bun PaaS plus Cloudflare CDN topology.

## Consequences

### Positive

- One account can participate safely in multiple contexts.
- Authentication can evolve without rewriting tenant RBAC.
- Failed side effects do not strand irreparable accounts.
- Admin access is explicit, least-privilege, and audited.

### Costs and limitations

- Better Auth schema and patch upgrades require migration/security review.
- Provisioning and invitation reconciliation jobs are required.
- OAuth/passkey/MFA flows add browser and integration test complexity.
- Production email and social-provider tests require configured provider accounts and secrets outside the repository.

## Revisit triggers

Revisit this ADR if Better Auth fails Bun/PostgreSQL compatibility, enterprise identity requires a separate broker, regulatory identity assurance exceeds ordinary account verification, or the product expands below age 18.
