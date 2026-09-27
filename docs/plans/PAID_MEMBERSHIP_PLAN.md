# Paid Membership — Phase 1 Implementation Plan

> **Status:** Phase 1.3 backend foundation completed locally on 2026-09-27: trusted roles/bootstrap, canonical schema, shared resolver and audited manual APIs. Simulator enforcement/persistence (1.5), simulator controls (1.7) and admin UI (1.8) remain pending. Decisions confirmed by the user on 2026-09-26. See [API contract and local verification](../api/membership.md).
> **Parent:** [Phase 1](../phases/phase-1-simulator-core.md), [Master plan §9](../REWRITE_PLAN_V3_FULL.md#9-paid-membership--super-admin-managed).

## 1. Confirmed scope

Phase 1 provides manually managed paid memberships. Super admins create, add, edit and delete membership plans and individual assignments. Online checkout remains in Phase 7. Paid access unlocks existing Pro components, advanced fault mode and advanced diagnostic mode, including Ohmageddon. Basic fault and diagnostic modes remain available to everyone, including guests.

Only these confirmed paid features launch initially. The framework supports more benefits later; this plan invents no cloud quota, export restriction, premium template pack, trial, price or support commitment.

Membership is an entitlement, not a global role. Buying or receiving it does not grant admin access. An organization `member` record establishes LMS tenancy, not paid membership.

## 2. Current code and gaps

| Existing code | Observed behavior | Required change |
|---------------|-------------------|-----------------|
| `packages/domain/src/components/*.ts`, `src/ui/components/Palette.tsx` | Registry has `tier: 'pro'`; palette filters by `appMode` | Seed mapping from actual component IDs; authorize placement/use |
| `src/store/settingsStore.ts`, `src/ui/components/Toolbar.tsx` | IndexedDB stores `appMode`; anyone can toggle it; Pro components stay functional in Basic mode | Presentation preference cannot grant access; replace public unlock toggle |
| `src/store/useSimulation.ts`, `packages/domain/src/simulation/simulate.ts` | `appMode` affects stress behavior | Separate electrical results/basic warnings from premium exercise controls |
| `packages/domain/src/faults.ts`, `src/store/circuitStore.faultActions.ts`, Inspector | 14 fault types; manual setting described as Pro-only | Explicit basic/advanced policy, enforced at actions |
| `src/store/diagnosisStore.ts`, `packages/domain/src/challenges/{diagnosis,rage}/*` | Three difficulty levels/four rage tiers; start/restore trust browser settings | Check actual requirements on start, regeneration, resume and submission |
| `packages/db/*`, `packages/access/*`, `src/api/*`, `src/worker.ts` | Phase 1.3 roles, plans, entitlements, resolver and manual APIs implemented locally | Integrate simulator enforcement and admin UI in 1.5/1.7/1.8 |

Simulator observations are from 2026-09-26; the backend row was updated after the 1.3 local gate on 2026-09-27. Backend completion does not mean simulator entry points or admin screens are gated yet.

## 3. Capability boundary

Initial paid plan capabilities: `pro_components`, `advanced_faults`, `advanced_diagnostics`. Super admin chooses names, durations and prices. Basic capabilities are a protected public baseline, outside paid-plan switches.

| Feature | Free baseline | Paid capability |
|---------|---------------|-----------------|
| Components | Current basic IDs | `pro_components`: current Pro IDs |
| Fault injection | At most one active injected fault from the basic list | `advanced_faults`: advanced types or multiple deliberately injected faults, within engine limits |
| Diagnosis | Beginner/intermediate with basic components and one basic fault; basic probes, tracing, hints, explanations and results | `advanced_diagnostics`: advanced difficulty, multi-fault diagnosis and every Ohmageddon tier |
| Automatic findings | All basic safety warnings, even for multiple wiring mistakes | Never gate whether a detected hazard is shown |

**Initial basic injection list:** `open-circuit`, `open-live`, `open-neutral`, `open-earth`, `terminal-disconnect`, `reverse-polarity`, `switched-neutral`, `short-circuit`, `earth-fault`, `live-to-earth`.

**Initial advanced injection list:** `smooth-dc-residual`, `arc-fault`, `protection-forced-open`, `protection-bypass`; more than one injected fault also requires `advanced_faults`. This initial product classification does not classify electrical severity. Super admin can reclassify implemented advanced content, but cannot remove the confirmed basic baseline or change fault physics.

Scenarios declare the complete capability set. A multi-fault exercise using Pro components needs all three capabilities. Ohmageddon additionally requires `advanced_faults` because its modifiers can introduce advanced fault behavior. Free intermediate generation selects basic-eligible recipes; it must not unexpectedly paywall a basic exercise after generation.

Keep diagnostic access separate from generic Challenge Mode difficulty; unrelated wiring games do not automatically become paid. Version changes to generator eligibility, preserve old records and shared-seed reproducibility, and display access requirements for premium legacy scenarios. Do not regenerate a different circuit under the same version/seed.

## 4. Super-admin permissions

| Action | Guest / free / paid | Admin / moderator / instructor / org owner | Super admin |
|--------|--------------------|--------------------------------------------|-------------|
| View public active plans | Yes | Yes | Yes |
| View own membership | Authenticated account | Own account | Yes |
| Manage plans and benefits | No | No | Yes |
| Grant/edit/extend/suspend/revoke any membership | No | No | Yes |
| View other users' membership audit | No | No | Yes |
| Change electrical rules/tables | No | No | No; code release only |

Add a trusted global role through Better Auth server configuration and generated schema migration; `globalRole` defaults to `individual` and is excluded from signup/profile input. Bootstrap the first super admin with an explicit operator command against a known local user, never “first signup wins.” Test malicious role fields in signup/profile requests.

Membership administration has a server-side `super_admin` guard regardless of the general editable permission matrix. Super-admin preview access is explicit, scoped and audited. Other staff use normal grants for testing; staff status alone does not unlock paid features.

## 5. Data model and lifecycle

Use Drizzle SQLite and existing D1. Keep canonical names `plans`, `pro_features`, `entitlements`; do not add a competing subscription store.

| Table | Fields / constraints |
|-------|----------------------|
| `pro_features` | Stable key, localized name/description, supported handler key, enabled flag, order, timestamps. Handlers are a code-owned allowlist; marketing text cannot create executable features. |
| `plans` | ID/slug, name/description, optional price in currency minor units, currency, explicit validity/duration policy, active/archived state, version, actor/timestamps. Price is descriptive; a manual grant is not a payment receipt. |
| `plan_features` | Unique `(planId, featureKey)`, FKs, enabled/config values validated per handler. Replaces the old draft `featuresJson`; no duplicate source of truth. Future quotas need implemented handlers. |
| `entitlements` | ID, required `userId` FK in Phase 1, `planId` FK, `source='manual'`, `status=active/suspended/revoked`, `startsAt`, nullable `endsAt` only for explicit no-expiry grants, reason, actor/timestamps, version. Require `endsAt > startsAt`; index user/status/validity and plan queries. |
| `audit_logs` | Actor, action, target, before/after, reason, request ID, UTC timestamp. Changes and audit commit atomically. History survives removal. |

Document one UTC timestamp unit across API/database boundaries. Scheduled/expired states derive from timestamps; expiry does not depend on cron. Access requires active status, `startsAt <= now` and `endsAt IS NULL OR now < endsAt`.

The resolver unions supported capabilities across valid grants. Revoking one removes its contribution only. Plan capability edits affect existing grants on their next check; show affected-member count before saving. Price/default-duration changes affect future assignments; extending an existing membership explicitly changes its dates. Archiving a plan stops new assignments while existing grants retain features until edited, expired or revoked.

“Delete membership” revokes/removes the active assignment while retaining audit history. Hard-delete only unused draft plans/benefits without references. Archive referenced records and offer explicit reassignment/revocation; never cascade-delete users, circuits or financial history. An explicitly disabled benefit stops authorizing that capability; archiving its marketing record alone must not silently revoke existing access.

Phase 7 adds payments/events and provider-origin grants with idempotent reconciliation. Refunds/provider updates must not overwrite manual grants. Institution billing is later; org membership alone never grants Pro access.

## 6. APIs and enforcement

| Planned route | Purpose / access |
|---------------|------------------|
| `GET /api/plans` | Public active plans and implemented benefits; no member records |
| `GET /api/me/membership` | Own grant summary/capabilities/next expiry; authenticated, private/no-store |
| `/api/admin/pro/plans` and `/api/admin/pro/plans/:id` | Super-admin list/create/read/update/delete-or-archive |
| `/api/admin/pro/features` and `/api/admin/pro/features/:id` | Super-admin supported-benefit configuration; reject unknown handlers |
| `/api/admin/pro/memberships` and `/api/admin/pro/memberships/:id` | Super-admin assignments; validate user, plan, dates and version |
| `GET /api/admin/pro/audit` | Super-admin paginated audit history |

Use GET for reads, POST for creation, PATCH for edits and DELETE for removal. Validate inputs, enforce authenticated same-origin mutations/CSRF protection and pagination. Return 401 for no session, 403 for denied access, 409 for stale versions and validation errors for unsupported configuration. Client `isPro`, role, price or capability claims never authorize access.

One pure access-policy module serves UI and Worker, evaluating server-resolved capabilities against canonical component/fault IDs and scenario requirements. The electrical solver stays pure and never queries membership.

Gate placement/paste/duplicate, templates, imports, scenario start/regeneration/resume, deliberate fault injection and server persistence/simulation/submission. Future premium exports use the same resolver. Recompute requirements from validated content or server-known scenario definitions, not client `tier`/mode/requirement arrays. Reject unknown IDs; normalize legacy component/wire fault fields and modern injected faults before limits.

Server authorization uses fresh D1 primary reads, independent of public KV config or client token feature claims. Conditional writes/batches cover authorization-sensitive mutations and stale-version detection. After revocation commits, the next protected request observes it; already-running work may complete. Public plan display may be cached; private grants may not be shared-cached. Refetch client authorization on login/logout, focus, reconnect and protected actions. Failure preserves basic access and denies new premium actions.

Browser-delivered simulation code cannot provide tamper-proof offline licensing. UI checks cover supported flows; Hono protects server operations, premium scenario delivery and accepted results. Basic simulation stays offline; Phase 1 premium actions require online validation.

## 7. UI and existing data

`/admin/pro` has Plans, Benefits, Members and Audit views. Members supports user search, plan, start/end dates, explicit no-expiry choice, reason, current state and edit/extend/suspend/revoke. Show affected records for changes/removal. Include loading/empty/denied/expired/error states and localization.

The simulator separates view preference from paid capability. Locked tiles/modes can preview features and plan details. During Phase 1 the CTA explains administrator-assigned membership; it must not pretend checkout exists.

Existing browser `appMode='pro'`, cloud metadata and shared circuits do not become grants. On expiry/revocation/logout, preserve premium circuits/scenarios read-only and explain the restriction. Permit raw backup and an explicit basic-copy workflow where the user chooses what to remove. Never silently remove components/faults, erase progress or consume an attempt after an authorization failure. Do not restrict ordinary free saves/exports to invent another paid benefit.

## 8. Local acceptance gates

| Group | Required behavior |
|-------|-------------------|
| Roles | Guest/free/paid/admin/instructor/org owner denied membership mutations; super admin allowed; signup/profile cannot inject role |
| Lifecycle | Create/edit/extend/suspend/revoke; future start; exact expiry; explicit no-expiry; overlapping grants; referenced-plan archive; atomic audit; stale-write conflict |
| Free experience | Guest offline basic circuit + single basic fault + diagnosis; no premium content generated accidentally; multiple natural mistakes still reported |
| Paid experience | Pro placement/use, advanced injected fault, multi-fault diagnosis, every Ohmageddon tier after manual grant |
| Bypasses | Direct requests, settings changes, imports/templates, clipboard/duplicate, seeds, legacy fault fields, resume and forged capabilities |
| Revocation/failure | Existing session loses authorization on next request despite cached config; UI refresh; expired offline cache; D1 failure retains basic access; original document recoverable |
| Electrical parity | Identical authorized scenarios have identical findings regardless of membership presentation; benefit APIs cannot change physics/standards |
| Future benefits | Unknown/unimplemented handlers cannot be enabled/advertised; copy changes alone grant nothing |

Use meaningful resolver/classification unit tests and real local Wrangler/D1 tests. Browser tests cover simulator entry points and the super-admin grant/revoke flow. Static preview or mocked membership responses alone are insufficient.

No further product answer is required to begin the confirmed scope. Super admin chooses plan names, prices and durations through the data model; future benefits remain a later decision.
