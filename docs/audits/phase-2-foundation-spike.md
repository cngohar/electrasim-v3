# Phase 2.0 — local foundation spike

Phase 2 started on 2026-10-23 following the user's instruction to start the next
phase. Follow-up: the [2.0 foundation](phase-2-admin-foundation.md) completed scoped
local acceptance on 2026-10-24. The remainder records the historical spike exit. This record covers 2.0 execution gates 1–2: boundary review and bounded
infrastructure/routing experiments. **2.0 and Phase 2 remain in progress.** The
shared admin product, complete implementation contracts and 2.1 are not accepted.
Phase 1.14's hardware-dependent performance exception remains unchanged.

The user reconfirmed that V3 has no Cloudflare login and must not use a global
Cloudflare account. All commands here are local, with placeholder bindings,
localhost targets and isolated `.wrangler/phase20-spike-*` persistence. No account,
login, logout, remote migration, deployment, publication, commit or push occurred.
The spike runner removes inherited `CLOUDFLARE_*` and `CF_*` environment variables
from child commands; it never needs account credentials.

## Reviewed boundaries

Reviewed `src/worker.ts`, `src/api/context.ts`, `src/api/membership.ts`,
`src/api/circuits.ts`, `packages/db/{schema,auth,auth-schema,circuit-schema}.ts`,
the migration directory/journal, `scripts/postbuild.mjs`, `public/_headers`,
`wrangler.jsonc`, existing API/browser harnesses and the Phase 2 plan.

Hono flattens mounted middleware into the parent route tree. Membership's broad
`/admin/*` guard would reject moderators before a later module could authorize
them. `src/api/membership.ts` now scopes fresh context to its owned routes and
session/super-admin/same-origin/body-size guards to `/admin/ping`, `/admin/pro`
and `/admin/pro/*`. `/me/membership` owns its own session check. Existing endpoints,
mutation validation, membership audit and primary role reads remain intact.

The spike mounts the **actual application first**, then a test staff router.
This proves later module isolation without hiding the problem through registration
order. Its staff and security endpoints are fixtures, **not** the implemented
platform permission registry or `/api/admin/access` product contract. Ordinary
accounts cannot use them; moderator/admin accounts can enter the staff fixture
but cannot enter membership or the protected security fixture. Reusing cookies
after demotion proves immediate role revalidation.

The circuit router still installs common fresh-context/same-origin/10 MiB limits
on unmatched API paths. That does not grant staff access, but future modules must
install their own smaller limits and permissions; public read caching must not
inherit API-private response headers accidentally. No auth/suspension behavior has
been implemented by this spike.

## Routing and rendering decisions

Use Hono `html` tagged templates for initial server-only community pages. Dynamic
values are encoded by the tag, with no raw HTML helper for user text. The spike
returns meaningful HTML over fetch without loading any JavaScript. Product SEO,
structured data, visual design and read-only circuit preview remain later work.

`wrangler.phase20-test.jsonc` proves explicit Worker-first ownership of `/api/*`,
`/explore`, `/explore/*`, `/feed`, `/feed/*`, `/c/*`, `/u/*` and `/collections/*`
against the combined built Vite/Astro `dist`. Include bare and slash variants for
list pages; reserve detail prefixes, including unknown descendants, for Worker
404s. `/explore/` must win even though a static marketing asset already exists.
Use `404-page` for unknown static URLs rather than returning the marketing index
with status 200. Existing `/app/` and `/admin/pro/` resolve from their own built
assets. The production configuration is unchanged: adopt the proven ownership
rules when actual community routes arrive, not fixture pages.

Worker HTML explicitly supplies CSP, `nosniff`, framing/referrer policy,
`private, no-store` and `noindex, nofollow` for fixtures. `_headers` only supplies
static asset headers; it cannot secure Worker-generated HTML. Product admin HTML
must likewise be noindex/no-store with a dedicated same-origin CSP. The existing
legacy CMS `/admin/` asset and its broad CDN CSP must be replaced explicitly when
the shared shell is implemented; do not apply that policy to the new shell.

Use private/no-store for initial dynamic community payloads until subject-aware
cache invalidation is accepted. Public asset delivery must authorize a subject ID
and current visibility before resolving its storage key; never expose raw R2 keys
as a public delivery API. Upload validators and subject visibility tests are still
required in 2.1/2.2. Discovery routes must remain separate from editor imports.

References checked alongside installed Wrangler 4.144.0 schema/help:
[Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/),
[SSR header responsibility](https://developers.cloudflare.com/workers/static-assets/headers/),
[local Queue producer/consumer behavior](https://developers.cloudflare.com/queues/configuration/local-development/).
The installed compatibility date/flags remain unchanged.

## Schema and storage decisions

Local migrations run through `0006_diagnosis_benefit_copy.sql`. The Drizzle
journal currently ends at 0005; Wrangler's SQL migrations directory is the current
local sequence, not proof that journal 0006 exists. Reserve `0007_admin_foundation`
next, followed by 0008 profiles, 0009 publications, 0010 social and 0011 FTS, as in
the plan. No new product migration or schema table was created in this spike.

Keep the existing membership `audit_logs` contract untouched. Add separate
`admin_audit` for platform/community actions, with append-only writes, safe
allowlisted before/after payloads and namespace-scoped reads. Shared user-role,
restriction and setting mutations must commit their audit in the same D1 batch.
Keep profiles separate from Better Auth tables, and preserve both private circuits
and retired diagnosis rows. A community restriction and platform suspension need
separate storage/policies and cannot reuse paid-grant status.

D1 FTS5 works in the actual local Worker. A bound MATCH query returns the fixture
and `EXPLAIN QUERY PLAN` reports its virtual table index. The test uses only
`phase20_fts` inside a newly migrated disposable database. Product FTS writes must
remain explicit and atomic with publish/hide/remove updates; this small probe
does not accept synchronization, relevance, pagination or latency at scale.

R2 put/get/delete and KV put/get/delete round trips work through local bindings.
Queue success requires the real consumer to record delivery in KV; accepting a
producer send alone is insufficient. This proves local wiring only, not production
latency, distributed KV consistency, retry/dedupe or notification visibility.
All fixture/probe routes live solely in `scripts/phase20-spike.worker.ts`; the
application Worker never imports that entrypoint.

## Verification

Run `bun run build`, then `bun run test:phase-2.0-spike`. The runner pins localhost,
uses fresh isolated local persistence and migrates only with `--local`. Generated
binding types live in `scripts/fixtures/phase20/env.d.ts`; regenerate with the
`bun run types:phase-2.0-spike` after changing its test configuration.
The generator wraps Wrangler declarations in a module to avoid introducing global
Worker types into the existing Node/browser checks.

The first run passed all **6 groups** in
`.wrangler/phase20-spike-4G9Dvn`: SSR/encoding/CSP, routing/misses/static assets,
real signup/role-claim rejection, independent staff/membership/security boundaries,
next-request role revocation, and D1 FTS5/R2/KV/actual Queue delivery. Local logs,
query plans and a results JSON stay ignored. This first run used the existing
built assets; current-build regression results are recorded below after execution.

Current-build verification completed on 2026-10-23:

| Check | Observed outcome |
| --- | --- |
| `bun run test:phase-2.0-spike` after build | **6/6 groups**, `.wrangler/phase20-spike-hyc5q3` |
| `bun run test:membership` | **34 groups** including simulator APIs and paid browser flow, `.wrangler/membership-tests-tYVPh7` |
| `PLAYWRIGHT_DEV_PORT=3020 bun x playwright test e2e/admin-membership.spec.ts --workers=1` | **36/36**, desktop Chrome, phone Chrome and tablet Safari; `.wrangler/phase20-admin-browser.log` |
| `bun run typecheck` | Passed all configured projects; `.wrangler/phase20-typecheck.log` |
| `bun run lint` | Passed |
| `bun x vitest run packages/access/src src/admin/client.test.ts` | **28 tests / 3 files** passed |
| `bun run build` | Passed; `.wrangler/phase20-build.log` |
| `check:perf`, `check:csp`, `check:links`, `check:seo` | Passed: initial JS **266,483 B gzip**, CSS **29,450 B gzip**, 194 HTML files / 191 SEO pages; budgets unchanged |
| `bun run test:graph` | **5 tests** passed after adding explicit graph inputs |
| Relative Markdown file links | **130** resolve in roadmap/phase map/plan/spike audit/progress |

The first membership regression attempt failed with local `SQLITE_BUSY` while
its harness used two local workerd connections. A fresh isolated retry passed all
34 groups; the failure is retained here and is not a product authorization pass.
The spike uses only its serving Worker's bindings and did not encounter that lock.

The first typecheck failed because global Worker declarations changed the existing
Node/browser types. The generated declarations now have a repeatable module
wrapper; the final full typecheck passes without changing shared auth or Drizzle
runtime code. The graph allowlist now explicitly includes the spike configuration,
its test tsconfig and package scripts; it still excludes arbitrary root/secret files.

This is scoped spike and membership regression evidence. The full unit suite,
897 domain parity matrix, built browser matrix, new platform admin screens,
custom-role policies, suspension/concurrency and target-device performance are
not rerun or accepted by this record. Graph checks validate references/fingerprints;
historical unreviewed/changed records remain explicit, not passing test claims.

## Next gate at the historical spike exit

Finish 2.0 gate 3 before building dependent product screens: typed permission
registry/protected-action policy, methods/payload/error contracts, validated setting
schemas, custom-role/assignment/index constraints, atomic audit/conflict handling
and concurrent last-active-super-admin protection. Suspension must gate both new
sign-in and stale authenticated cookies, revoke sessions atomically, preserve
private documents/grants, and never revive old sessions on restore/expiry. Those
paths need real Better Auth hook/guard and concurrent D1 evidence before acceptance.

Then build and verify the shared admin shell/users/roles/restrictions/settings/audit
and read-only standards, replacing the existing CMS index deliberately while
preserving `/admin/pro/`. Full source/built desktop/phone/Safari UI evidence and the
test module extension contract remain mandatory. Only a completed 2.0 foundation
can advance to profiles (2.1). No community product feature is accepted by this spike.
