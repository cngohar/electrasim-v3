# ElectraSim v3 Foundation

This directory is the isolated, line-1 v3 implementation spike. It does not import or execute the v2 application.

## Locked foundation

- Bun 1.4.2 for workspaces, package management, tests, build, local runtime, and production runtime.
- Strict TypeScript checked separately with `tsc --noEmit`.
- A portable Web `Request` → `Response` application boundary.
- A non-root OCI image as the production artifact.
- Managed PaaS hosting, with Railway and Render compared before provider lock.
- Cloudflare is DNS/CDN/TLS only; it does not execute product code.
- PostgreSQL, S3-compatible storage, durable jobs, email, and observability remain ports/adapters.
- Better Auth 1.7.5 provides credential/session plumbing; ElectraSim owns onboarding, tenancy, RBAC, lifecycle provisioning, and admin gates.

See [`docs/decisions/0009-bun-paas-cloudflare-cdn.md`](../docs/decisions/0009-bun-paas-cloudflare-cdn.md).

For the complete local PostgreSQL, captured-email, signup, and onboarding flow, follow [`docs/LOCAL_DEVELOPMENT.md`](./docs/LOCAL_DEVELOPMENT.md). Local validation is required before hosting trials.

## Commands

```bash
bun install --frozen-lockfile
bun run dev
bun run check
bun run browser:validate # run while the local server is listening
bun run benchmark:renderers # isolated SVG/PixiJS software-rendered comparison
bun run build
bun run start
bun run content:inventory

# Idempotently import and publish the verified 69 owner-authored articles.
# The actor must hold platform.content.edit and platform.content.publish.
APP_DATABASE_URL=postgres://... CONTENT_IMPORT_ACTOR_USER_ID=<uuid> bun run content:import
```

The application binds to `0.0.0.0:$PORT` and provides:

- `GET /app` — integrated responsive electrical-blue auth, onboarding, and learner-home redesign.
- `GET /account/security` — passkeys, TOTP recovery, sessions, passkey step-up, and teaching-workspace creation.
- `POST /api/account/teaching-workspaces` — idempotent adult/onboarding-gated instructor or institution root creation.
- `GET /workspaces` — responsive horizontal organization, roster, invitation, and workspace-switching workplane.
- `GET /api/account/workspaces` — authenticated personal/instructor/institution workspace discovery.
- `GET /api/workspaces/:workspaceId/organization` and `POST .../{campuses|departments}` — exact-workspace hierarchy administration.
- `GET /api/workspaces/:workspaceId/members` and `PUT .../members/:membershipId/status` — permission-bounded roster and step-up-protected access changes.
- `GET /simulator` — responsive free deterministic simulator with event-driven animation, beginner/technical visuals, target-aware keyboard-accessible context menus, and a visible 30–375% zoom range.
- `GET /simulator/shared/:shareId` — read-only public presentation of an explicitly shared circuit.
- `POST /api/simulator/run` — bounded deterministic electrical, protection, and thermal execution.
- `POST /api/simulator/command` — validated free-form add/remove/connect/update/layout commands with inverse-command undo evidence.
- `POST /api/simulator/diagnostic` — persisted prove–isolate–lock–test–re-prove, continuity, insulation, discharge, and controlled lock release.
- `GET|POST /api/simulator/lessons` — instructor-template catalog and deterministic circuit-evidence evaluation.
- `GET|POST /api/simulator/lesson-submissions` — authenticated immutable LMS evidence scoped to the learner.
- `GET|POST /api/simulator/projects` and `GET|PUT /api/simulator/projects/:projectId` — member-owned account saves and immutable revisions (five Free, unlimited Pro).
- `POST /api/simulator/projects/:projectId/share` and `GET /api/public/simulator/projects/:shareId` — opaque sharing control and public retrieval.
- `GET /health` — process liveness; never CDN cached.
- `GET /ready` — dependency readiness; never CDN cached.
- `GET /public/version` — explicitly public bounded-cache probe.
- `GET /v1/session-probe` — sensitive cache-policy probe.
- `/api/auth/*` — raw Web Request forwarding to Better Auth when identity is configured; otherwise fails closed with 503.
- `GET|POST /api/account/onboarding` — session-bound ordered onboarding state and step submission.
- `GET /api/public/content/:slug?locale=en` — CDN-cacheable, published-only, safely rendered content.
- `GET /api/public/media/:mediaId` — immutable media only when linked to a current published revision.
- `POST /api/admin/content/media` — bounded, magic-byte-validated private media upload.
- `GET /api/admin/content/media/:mediaId` — permission-gated private editor preview with no-store policy.
- `GET|POST /api/admin/content` — capability-gated content listing and immutable article/static-page draft creation.
- `GET /api/admin/content/:itemId` — latest draft/revision detail for the Content Studio preview/editor.
- `GET|POST /api/admin/content/:itemId/revisions` — immutable revision history or append-only revision creation.
- `GET /api/admin/content/:itemId/revisions/:revisionId/preview` — private, sanitized historical-revision preview.
- `POST /api/admin/content/:itemId/review` — step-up-protected independent safety review.
- `POST /api/admin/content/:itemId/publish` — step-up-protected immediate or scheduled publication.
- `POST /api/admin/content/:itemId/{archive|restore|unpublish|cancel-schedule}` — reasoned high-risk lifecycle transitions.
- `POST /api/admin/content/:itemId/redirects` — managed internal canonical redirects.
- `/admin/content` — responsive horizontal Platform Switchboard with WYSIWYG-oriented editing, Markdown source, SEO, preview, history, scheduling, and publication controls.
- `/blog/:slug` and `/pages/:slug` — safely rendered public content backed by the published-revision boundary.
- `POST /api/invitations/accept` — verified/onboarded, email-bound, idempotent invitation acceptance.
- `POST /api/workspaces/:workspaceId/invitations` — permission-gated seven-day invitation issuance with atomic email enqueue.
- `DELETE /api/workspaces/:workspaceId/invitations/:invitationId` — permission-gated idempotent revocation.
- `POST /api/security/step-up/password` — fresh password proof bound to the active Better Auth session.
- `GET /api/admin/access` — platform-permission plus MFA gate probe.
- `GET /api/admin/jobs` — MFA, permission, and unexpired-step-up protected job health summary.
- `GET /api/workspaces/:workspaceId/members` — exact-workspace membership/permission gate probe.

## Structure

```text
apps/api/                    Bun server adapter and runtime configuration
packages/http-application/   portable Request/Response application and raw auth mounting
packages/auth/               Better Auth factory, passkey/MFA, verification/recovery callbacks
packages/identity/           mandatory onboarding and idempotent lifecycle orchestration
packages/authorization/      platform/workspace deny-by-default policy decisions
packages/content-studio/      editorial lifecycle, safe rendering, legacy import, and validated media ingestion
packages/invitations/        issue, revoke, token, acceptance, and role-ceiling services
packages/jobs/               durable lifecycle/email dispatch and delivery adapters
packages/localization/       BCP 47 negotiation, English fallback, Intl, and RTL readiness
packages/object-storage/      private local and S3-compatible object-store adapters
packages/platform-contracts/ infrastructure, jobs, and transactional-email ports
packages/web-ui/             integrated electrical-blue shell, auth, onboarding, and home UI
packages/workspace-administration/ validated workspace discovery, hierarchy, and roster operations
packages/database/           Drizzle schema, PostgreSQL adapter, RLS and catalog migrations
tests/                       HTTP, auth, lifecycle, policy, migration, and boundary tests
Dockerfile                   multi-stage non-root production image
railway.toml                 Railway trial configuration
render.yaml                  Render trial configuration
docs/PAAS_SPIKE.md           provider comparison and remaining live evidence
docs/RENDERER_BENCHMARK.md    SVG/PixiJS evidence, limits, and production gate
docs/PROTECTION_FAULT_LOOP_KERNEL_V0_1.md  protection/fault-loop evidence and limits
docs/CIRCUIT_SCHEMA_V2.md       v1 migration, v2 import, and persistence contract
docs/EARTHING_AND_RULE_EVIDENCE_V0_2.md  five earthing fixtures, rule evidence, and golden matrix
docs/FREE_FORM_EDITOR_V0_3.md  authoring, SVG fidelity boundary, wire routing/viewport v0.4, accessibility, and validation
docs/ASSEMBLIES_AND_MEASUREMENT_V0_5.md  bars, enclosures, loading-aware meters, multi-select, and safety limits
docs/SAFE_DIAGNOSTICS_V0_6.md  safe isolation, dead testing, continuity, insulation, and discharge evidence
docs/ADVANCED_AUTHORING_V0_7.md  selection, duplication, rotation, containment, DIN snapping, probes, and new loads
docs/GUIDED_DIAGNOSTICS_V0_8.md  fault exercises, lesson evaluation, lock release, and LMS boundary
docs/WORKER_TRANSIENT_SCALE_V0_9.md  worker queue/cancellation, motor inrush, bundles, and energy evidence
docs/CONTROL_LMS_SCALE_V0_10.md  coil/contact control, durable LMS evidence, and 100-branch scale
docs/DUAL_VISUALS_REGIONAL_CONVERSION_V0_11.md  beginner/technical views, live wires, regional conversion
scripts/benchmark-renderers.ts reproducible npm-Chromium renderer benchmark
```

## Cloudflare cache safety

The origin owns cache policy. Authenticated, tenant, assessment, grade, payment, entitlement, personal-feed, and private-file responses must use `Cache-Control: private, no-store`. Only reviewed public routes and hashed assets may opt into shared caching.

No Cloudflare-specific SDK is allowed in portable domain/application packages.

## PostgreSQL tenancy

ADR 0010 defines global users, personal/independent-instructor/institution workspaces, scoped RBAC, platform administration, transaction-local tenant context, and forced RLS. ADR 0011 defines Better Auth's boundary, mandatory verification/onboarding, personal-workspace reconciliation, instructor creation, and admin session gates. Reviewed migrations are:

- `0001_tenancy_foundation.sql` — tenant hierarchy, RBAC, audit/outbox, and RLS;
- `0002_auth_account_lifecycle.sql` — Better Auth/plugin records and lifecycle state;
- `0003_authorization_catalog.sql` — stable permission and system-role catalog;
- `0004_durable_system_jobs.sql` — leased, retryable global jobs for pre-tenant lifecycle and email work;
- `0005_step_up_sessions.sql` — short-lived proof records bound to the exact Better Auth session and user.
- `0006_content_studio.sql` — capability-protected authors, immutable content revisions, publication evidence, and redirects;
- `0007_simulator_projects.sql` — member-owned circuits, immutable revisions, opaque shares, and forced RLS;
- `0008_account_entitlements.sql` — provider-neutral, time-bounded account capabilities with forced self-read RLS;
- `0009_workspace_administration.sql` — narrow self-workspace discovery, permission checks, and roster readers across selected-workspace RLS boundaries.
- `0010_simulator_schema_v2.sql` — preserves immutable v1 circuit revisions while allowing validated v2 saves and boundary migration.

`packages/database/roles/001_runtime_roles.sql` is a separate administrative provisioning script for the auth, application, and worker roles; it is intentionally not an automatic application migration.

Global Better Auth records deliberately remain outside tenant RLS because signup occurs before tenant context exists. Production must use a dedicated least-privilege auth connection role; tenant-owned tables remain forced-RLS protected.

PGlite executes all ten migrations and the Better Auth handler/signup boundary in supplemental tests. The migrations must still pass the ADR's cross-tenant and database-role suite against real PostgreSQL before production use; PGlite is not accepted for that gate.
