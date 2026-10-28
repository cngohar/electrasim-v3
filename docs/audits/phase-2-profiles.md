# Phase 2.1 — profiles integration and acceptance

**2026-10-26: Gates A–E complete locally. Owner approved the demo and authorized
integration on 2026-10-25. Full 22-stage acceptance exited 0 with 2,339 units and
270 source/built browser cases.** See the [final acceptance](#gate-e--dedicated-full-local-acceptance-complete-2026-10-26)
and [manifest](data/phase21-acceptance.json). Earlier entries below retain their
historical design/focused/failed-attempt scopes.
The owner requested the next phase and a demo to review and approve. Read the
current Community plan and recorded full 2.0A acceptance before starting. Used
`graph:phase`, a scoped `graph:brief`, targeted find/impact and linked source/audit
reads. The parent plan identifies 2.1 as profiles/handles/avatar/privacy/SSR and
profile reports/staff controls, following complete 2.0A.

## Historical design-only deliverables

- [Execution plan](../plans/PHASE_2_1_PROFILES_PLAN.md) separates design approval,
  storage/policy, API/avatar delivery, real UI/SSR and dedicated full acceptance.
- [Interactive concept](../design/profiles/README.md) has public/editor/staff routes,
  in-memory edits/claim/avatar/report/moderation, public/owner and staff personas,
  revision conflict recovery and resettable profile states. Reuses current local
  fonts, blue controls and admin visual conventions.
- Standalone GET/HEAD-only loopback server, strict no-network/form CSP and noindex;
  package commands `demo:profiles` and `check:profiles-demo`. No production app,
  Worker, schema/migration, account/binding or simulator behavior was changed.

The owner approved these design proposals on 2026-10-25: new profiles start private with
institution/level hidden; handles are claimed once with no rename UI in the first
release; JPEG/PNG/WebP photo limit is 2 MiB. Existing fictional public sample opts
into its displayed optional fields. The circuits section is empty; future social,
publishing and fork enforcement are not implemented by this concept.

## Executed prototype checks

`bun run check:profiles-demo`: **exit 0**, desktop Chromium (1440×1080), phone
Chromium (Pixel 7), tablet WebKit (iPad Pro 11). Same workflow assertions run on
all three; no skips/retries. This is three prototype project runs, not product
source/built browser acceptance.

Coverage: public/about tabs with keyboard focus, profile text escaping, avatar
selection validation and staff avatar removal, live editor, independent optional
field suppression, private/unclaimed/hidden/removed views without identity/avatar,
signed-out report prompt, member submission and dedupe, reasoned staff decisions,
report outcomes separate from visibility, read-only staff controls, stale revision
rejection/fresh reason, owner edit unable to clear hidden state, private setting
preserved by staff restoration, irreversible removal presentation, reserved/taken/
invalid handles and explicit claim confirmation/lock. New profile privacy defaults,
reload/reset behavior, document viewport containment, same-origin GET-only/no-API
browser traffic, strict CSP/no runtime errors, noindex and HTTP method rejection
also pass.

Artifacts: `.wrangler/profiles-design/results.json` and desktop/phone
`{public,edit,private,staff}.png`, all ignored. Desktop/phone public/editor/staff
screens were visually reviewed. WebKit runs the same functional/layout checks;
Chromium captures artifacts because WebKit screenshot preparation injects an
inline style that conflicts with the intentionally strict preview CSP.

Focused `biome lint` and `biome format` checks for the new scripts/CSS and updated
JSON pass; Node syntax checks pass. Product types/units/parity/source/built/full
phase gates were not rerun for isolated design files. Prior 2.0A acceptance remains
historical within its existing scope. `graph:check` reports existing unreviewed/changed
evidence records and exits 1; no missing reference was reported. Only the new
profile design record receives a scoped evidence review; other baselines are
left unchanged, and no matching fingerprint is presented as a passing test.

Initial prototype check stopped at an exact accessible-label lookup for the viewer
select. Added an explicit accessible label and reran all projects successfully.
Visual review found the staff profile context mistakenly sharing a horizontal flex
row with bio/actions; corrected the missing wrapper close and reran the complete
prototype check. Also shortened mobile persona option labels to avoid truncation.
No assertion was removed to make these checks pass.

## Limits and next action

This demo has no real authentication, API, persistence, R2 upload/delivery, server
rendering, rate limit, audit transaction or concurrent HTTP mutation. Browser
validation/persona controls demonstrate proposed behavior only. In particular,
prototype uploads do not prove server byte/dimension validation, and neutral HTML
states do not prove production privacy/cache/asset isolation.

Owner reviews the demo and decisions before Gate B production adaptation. Then
implement and accept all gates in the linked execution plan. No Cloudflare account,
credentials, normal local database, remote resource, deployment, publication, commit
or push was used. Overall Phase 2 and previous hardware exceptions remain open.

## Owner approval — 2026-10-25

Owner confirmed “approved, you are free to integrate it” after clarifying the
route boundaries: public `/u/:handle`, owner-only `/settings/profile/`, and staff
review in `/admin/community/`. Approved private defaults, one-time handles and
the complete profile/report/moderation presentation. Local product integration is
authorized; no remote/deployment permission is granted. Gates B–E remain open.

## Gates B/C — focused local integration checks

Added migration 0010 and Drizzle mirror for profiles, reserved handles, write
windows, profile reports and durable avatar cleanup candidates. Existing users
backfill privately; new users receive private unclaimed profiles. Handles and
removed tombstones have storage-level protections. No auth name/role/private
circuit/grant rewrite. Shared policy code defines explicit owner/public projections.

`bun run test:profile-storage`: **8/8** real isolated D1 groups passed, including
populated 0009→0010 upgrade and unchanged prior tables, new/existing defaults,
reserved/invalid/unique/permanent handles, terminal removal, constraints, reports
and transactional rollback. Evidence: `.wrangler/profile-storage-cZMPUa/`.
The existing 2.0A storage harness was bounded to migrations through 0009 so its
historical upgrade continues testing its own 0008→0009 boundary; it also passed.

`bun run test:profiles-api`: **19/19** real local Worker/D1/R2/cookie/race groups
passed at `.wrangler/profiles-api-TaBRiR/`. Covers strict field/origin/session
boundaries, claim collision and permanence, primary privacy-safe API/SSR/metadata,
avatar validation and visibility across R2 I/O, authorized moderation/read-only
custom roles, actor role/session/suspension/restriction/policy races, stale profile
and report revisions, report dedupe/eligible auto-hide, separate outcomes,
reasoned/system audit rollback, banned text, rate limits and removed tombstones.
Subsequent final acceptance also exercises real browser-generated JPEG/WebP bytes;
the earlier API run covered PNG uploads. Local image/policy/SSR unit checks passed
**34 tests in two files** including complete/truncated/trailing JPEG/WebP containers.

An initial HTTP test found circuit middleware mounted with `*` was enforcing JSON
on unrelated API paths. Scoped it to circuits/simulator paths, retaining their
original policies, and reran the complete profile HTTP group selection. No JSON
or origin check was weakened. New profile middleware is likewise route-scoped.

## Gate D — integrated presentation, verification in progress

Owner settings are a dedicated entry, with real session sign-in/revalidation,
one-time claim confirmation, independent visibility, immediate resized photo
saves that preserve pending text, explicit stale-profile reload, pending submit
guards and private draft clearing on lost access. Simulator library links to
Profile & privacy in a new tab to preserve the current workbench.

Public `/u/:handle` is real Worker SSR without simulator code: readable profile,
empty circuits/about, safe canonical/OG/Twitter/Person metadata, neutral unavailable
states and strict CSP. Optional tabs/report submission/owner link use a small
standalone same-origin script. No prototype persona or sample content is used.

Staff `/admin/community/` uses the accepted admin shell, permission-filtered
profiles/reports, prefix search/status filters/pagination, dedicated profile
context, reasoned hide/restore/remove/avatar removal and independent report
outcomes/history. It reuses the existing atomic audit/revision helper. Read-only
staff see context without mutation controls. Conflicts retain the explicit reload
requirement after closing the review.

Desktop source preflight passed all **10 cases** after correcting native-dialog
focus restoration. Source/built phone and WebKit matrices are in progress; product
acceptance is still open. The first browser selection matched unrelated catalogue/
supply files because its pattern was too broad; interrupted it and anchored the
profile spec pattern. An initial built launch inherited/concatenated source web
servers; excluded that inherited configuration. Parallel source/built Wrangler
launches then collided on the default inspector port; assigned explicit distinct
local inspector ports. These setup attempts are not accepted browser evidence.

Product and test contracts are in [profiles.md](../api/profiles.md). The dedicated
`verify:phase-2.1` includes the complete 2.0A regression and new profile storage/API/
source/built checks, with immutable logs, selection scope and source fingerprints.
Gate tooling tests require both browser deliveries and all dedicated exit groups.

## Continuation — 2026-10-26

Continued the owner-authorized integration. The phone matrix exposed that the
shared admin header hides text action buttons below 760 px, including the required
reload action. Added a compact labelled reload icon on phones while retaining the
desktop label and existing behavior. Repeated the complete source profile matrix:
**30/30 passed** across desktop/phone Chromium and tablet WebKit, no retries/skips,
at `.wrangler/profile-final-checks/source.log` and `source-results/`. Visually
reviewed current owner editor, public profile and staff profile screenshots on
desktop/phone, including the visible phone reload control.

The multi-context report→hide→owner edit→dismiss→restore case has a 60-second
end-to-end deadline because it performs three separate real sign-ins, report
submission and two audited staff changes; all assertions and per-action checks
remain. Its previous concurrent source/built preflight reached the final views but
exhausted the default whole-case deadline. Safari failure screenshot preparation
also emitted a CSP style-injection violation; successful runs retain the strict
CSP and run the runtime/CSP assertions without screenshotting Safari.

First full acceptance attempt `acceptance-2026-10-26` stopped at typecheck: the
rejection-fixture loop exposed `ArrayBufferLike` rather than `ArrayBuffer` under
one library configuration. Copied the fixture bytes into a concrete buffer; no
runtime validation or assertion changed. The second attempt
`acceptance-2026-10-26b` was deliberately interrupted during typecheck when the new
runtime graph mapping revealed that `settings/` and the new explicit profile test
configs were missing from the graph's allowlist. Added those safe source inputs
and a fixture regression; all five graph tooling tests passed and the real runtime
brief now resolves its entry points/checks. No secret/environment input was added.
This is not a passing second gate.

The complete gate restarted with a fresh evidence directory at
`.wrangler/phase21/acceptance-2026-10-26c/`. Sources are frozen during it. Its final
status, counts, manifest and review are still required before E closure. The
historical 2.0/2.0A acceptance and design-only evidence keep their original scopes.

## Gate D — completed focused matrix, full gate E remains open

The final focused built profile matrix passed **30/30** cases across desktop/phone
Chromium and tablet WebKit without retries/skips at
`.wrangler/profile-final-checks/built.log` and `built-results/` (6.3m). The source
matrix separately passed **30/30** (2.9m). Built Assets checks verified the real
owner/admin entries, shared assets, no-store/noindex/CSP headers, unknown-route
404s and isolated public enhancement budgets (**2157 B JS gzip / 4578 B CSS gzip**).
Runtime/CSP assertions pass; accepted screenshot captures remain Chromium-only.
Wrangler logged two successful ProxyWorker connection recoveries during the built
run; these were not test retries, and no assertion was skipped.

The ordinary source browser harness now supplies the same isolated local profile
fixtures and a local R2 binding. This prevents the new profile spec from requiring
an undocumented test-only invocation when the normal browser selection includes
it. Its focused avatar and read-only/revoked-staff cases also passed **2/2** with
`PLAYWRIGHT_DEV_PORT=3034` at `default-harness.log`. Product Worker imports no test
fixture. Scope remains local and normal developer persistence is not used by tests.

A subsequent full typecheck exposed only the required versus optional browser-test
`Window.profileCsp` fixture annotation under the browser configuration. Made it
optional, matching the read-side annotation; no runtime/CSP assertion changed.
The final standalone full-project typecheck and lint exited 0 at
`typecheck-final.log` and `lint.log`. The complete acceptance restarted fresh at
`.wrangler/phase21/acceptance-2026-10-26d/` with all implementation/harness inputs
frozen. Its full exit 0 and final reviewed manifest remain required for E closure.

## Final concurrency review and updated foundation probe

The `acceptance-2026-10-26d` attempt passed types/lint/2339 units (153 files),
gate/graph tooling, build/performance/CSP/links, then correctly stopped at SEO:
the new private settings entry lacked a generic description and fallback OG image.
Added those static non-personal tags while retaining noindex. A focused build/SEO
check passed all 192 pages. No SEO requirement was excluded or weakened.

The `acceptance-2026-10-26e` attempt passed that complete prefix including SEO,
then stopped at the old foundation routing probe: its `/u/owner` placeholder is
now owned by the real product profile route and correctly returns neutral 404.
Moved the historical fixture probe to `/__phase20/u/:handle`, preserving all of its
SSR/encoding/header assertions, and added explicit checks that the real missing
profile returns neutral 404/no-store/noindex with the real profile CSP. All six
infrastructure groups passed at `.wrangler/phase20-spike-g78UTV/`.

A final source review identified a separate post-commit response race. An owner
save could commit, then return a later competing edit's revision; the photo editor
would preserve its earlier pending fields with that newer revision. Added a real
HTTP race that commits the competing edit between the batch and response. It
**failed against the earlier code** (200 instead of expected conflict), then passed
when the response was required to match its own mutation ID and next revision.
The owner read also joins the returned row and live session in one fresh primary
statement; staff avatar session checks explicitly use a fresh primary session.
Denied avatar bodies are canceled. Added owner/staff session revocation during R2
read checks, preserving and then reauthenticating the same local fixture accounts.

Final focused profile API selection passed **21/21 groups** at
`.wrangler/profiles-api-7DVumU/`, including both new boundary cases. The earlier
20-group post-commit run passed at `.wrangler/profiles-api-PL9uCt/`; the initial
red regression remains in `.wrangler/profile-final-checks/postcommit-before.log`.
These focused results do not close the full milestone gate. The complete gate
restarted fresh at `.wrangler/phase21/acceptance-2026-10-26f/`, with final sources
frozen; its outcome and reviewed manifest remain pending.

## Gate E — dedicated full local acceptance complete (2026-10-26)

Final full selection exited **0 across all 22 stages**, without browser test
retries or skipped required cases:

```bash
PHASE21_EVIDENCE_DIR=.wrangler/phase21/acceptance-2026-10-26f bun run verify:phase-2.1
```

The [dedicated tracked manifest](data/phase21-acceptance.json) records command,
selection, stage exit codes, log hashes, required exit-group mapping and all 1350
selected source/harness hashes. Reviewed the successful stage logs and verified
every retained log hash plus every current selected source hash. No implementation
or harness changed during the gate. Hash matches establish stability; the executed
stage outcomes establish the checks below.

| Check | Final full-gate result |
| --- | --- |
| Types / lint / units | Exit 0; 2339 tests in 153 files |
| Gate and graph tooling | 13 and 5 tests respectively |
| Build / budgets / CSP / links / SEO | Exit 0; SEO checks 192 pages |
| Infrastructure / component storage / component API | 6 / 8 / 14 passing groups |
| Existing admin / membership-simulator | 20 / 34 passing HTTP groups |
| Unchanged electrical parity | 897 cases |
| Profile populated storage / HTTP-race matrix | 8 / 21 passing groups |
| Existing source / built UI regression | 105 / 105 passing cases; 35 per desktop, phone and WebKit project |
| Profile source / built UI and SSR | 30 / 30 passing cases; 10 per desktop, phone and WebKit project |
| App initial gzip | 269089 B JS / 29462 B CSS, within unchanged budgets |
| Isolated public profile gzip | 2157 B JS / 4578 B CSS, within 15000 / 10000 B budgets |

There are **270 total browser cases**, including existing component/editor/admin
regressions and the dedicated profile workflows. Actual built Assets/header checks
cover the existing eight admin pages plus the new community and owner entries,
shared asset delivery, private no-store/noindex/CSP, unknown-route 404 and public
bundle isolation. Runtime/CSP assertions run in all configured browsers; visual
captures/review are Chromium desktop/phone as described under Gate D.

**Gates A–E are complete locally.** This full run accepts the authorized profile
scope. Earlier failed/interrupted attempts and focused runs remain recorded above;
they are not relabelled as successful complete gates. Historical 2.0, admin parity
recovery and 2.0A manifests retain their separate acceptance scopes.

## Ordinary local review readiness

After acceptance, backed up both ordinary local D1 files using SQLite's backup API
under `.wrangler/local-backups/profiles-20261026T020450Z/`. Applied pending
`0009_component_access.sql` and `0010_profiles.sql` successfully with:

```bash
bun x wrangler d1 migrations apply DB --config wrangler.jsonc --local --persist-to .wrangler/state
bun run dev:worker
```

Migration output is retained at
`.wrangler/profile-final-checks/local-migration.log`. The integrated Worker serves
`http://127.0.0.1:8791` using ordinary local persistence. Readiness checks at
`local-readiness.json` verified health 200, real owner/admin HTML 200 with private
no-store/noindex/CSP, anonymous `/api/me/profile` 401 and neutral public unavailable
404 with no-store/noindex. This delivery smoke does not replace authenticated
source/built acceptance; no test fixture identities were seeded into the ordinary
store. The backup is local ignored data, not part of the tracked evidence manifest.

Public profile addresses are `/u/:handle`; `/settings/profile/` requires the owner
session and `/admin/community/` requires the applicable staff permissions. New
profiles remain private until explicitly made public by their owner; handles are
permanent in this release. Photo cleanup is bounded/opportunistic with durable
candidates; there is no scheduled global orphan sweeper. JPEG/WebP checks validate
containers/frames rather than implementing a general pixel decoder.

Overall Phase 2 remains open, with 2.2 next planned. Publication attribution,
publish/preview/fork policy, social notifications, full cross-subject moderation
and support 2.7A remain scheduled later. No Phase 1 hardware/performance exception
was recertified. All execution and migrations were local; no Cloudflare account,
credential/resource operation, deployment, commit or push occurred.

Final documentation validation found no invalid graph references or whitespace
errors. Global `graph:check` remains exit 1 for existing unreviewed/changed
historical evidence records; only the profile design/runtime records receive a
scoped review for this task. A current fingerprint is not a passing test result,
and this review does not renew unrelated acceptance baselines.
