# Progress Log — ElectraSim V3

> **Master plan:** [`docs/REWRITE_PLAN_V3_FULL.md`](./docs/REWRITE_PLAN_V3_FULL.md) — locked stack (Bun + Workers), architecture, roadmap.
> **Changelog:** [`CHANGELOG.md`](./CHANGELOG.md) — shipped changes (Keep-a-Changelog).
> **Archive:** V2 log through 2026-09-21 is at [`docs/archive/v2/progress-v2.md`](./docs/archive/v2/progress-v2.md).

Append-only. Every coding session adds an entry. Every entry names files + measured results.

---

## Session 2026-09-25 — V3 reset: archive V2, fresh tracking, circuit deferred, local-first contract

**Request:** leave the circuit (simulator) for later phases; continue working; create a new changelog + progress + tracking for V3; archive V2 for reference; everything tested locally before uploading to Cloudflare.

**Done:**

1. Archived V2 to `docs/archive/v2/`:
   - `CHANGELOG.md` → `CHANGELOG-v2.md`, `progress.md` → `progress-v2.md`, `TRACKING.md` → `TRACKING-v2.md`, `PLAN.md` → `PLAN-v2.md`, plus `docs/decisions/` → `decisions/`, `docs/plans/` → `plans/`, `docs/audits/` → `audits/` + `docs/archive/v2/README.md`.
   - Originals preserved in place until overwritten below (so working set stays intact).
2. Fresh V3 heads:
   - `CHANGELOG.md` — new Keep-a-Changelog from `Unreleased` (V2 archived note + `3.0.0` template).
   - `progress.md` — this file (pointer to `REWRITE_PLAN_V3_FULL.md`, archive pointer, session discipline).
   - `TRACKING.md` — privacy/SEO/delivery tied to Workers artifact + local verification commands.
   - `PLAN.md` — slim pointer file (V2 archived, V3 is `REWRITE_PLAN_V3_FULL.md`; circuit section marked Deferred).
3. `docs/REWRITE_PLAN_V3_FULL.md` patched:
   - Circuit ambiguity clarified: **Lab Circuit (heart) NOT deferred**; **Published Circuit (social sharing) deferred** to Community Phase 2+. `PLAN.md` pointer and `REWRITE_PLAN_V4_FULL.md` superseded banner aligned.
   - Local-first contract added: `wrangler dev --local` / `--local --persist-to` + `d1 migrations apply --local` etc. before any `--remote` deploy.
   - New sections §30–§33 added: **Astro redesign two-stage (SSG on Worker Assets → hybrid/D1 SSR + dynamic behaviours)**, **i18n (locale-prefixed routes, `hreflang`, RTL, `content_pages(locale)`, `i18n_strings`)**, **Electrical Standards IMMUTABLE (code-owned, super_admin read-only)**, **D1 at scale (replicas + `D1.batch()` + KV shield + Queues + budgets)**.
   - §34–§35 added as checklist for the exhaustive `src/` + `astro-site/src/` coupling audit (next action).
4. `wrangler.jsonc` updated to `compatibility_date 2024-09-23` + `nodejs_compat` + local-first comments (bindings placeholder for Phase 0). `TRACKING.md` surfaces updated for locale routing, immutable standards, and parallel-burst verification.

---

## Session 2026-09-25 (cont.) — Circuit clarification + Astro / i18n / electrical-standards / D1 performance

**Request:** clarify "circuit" deferral; how Astro site fits and where dynamics live; exhaustive codebase scan concern (Astro + simulator couplings); **localization (multi-language, international site)**; **electrical standards must follow global standards and be NOT overridable (super admin read-only)**; **D1 performance under parallel reads/writes — no failures, blazing fast**.

**Done:**

1. Clarified deferral in `docs/REWRITE_PLAN_V3_FULL.md` header + §28 + `PLAN.md`: **Lab Circuit heart → Phase 1 (not deferred)**, **Published Circuit → Phase 2+ (Community)**. Earlier misread corrected.
2. Added §30 **Astro Site in V3**: two stages — (A) `bun x astro build` → Worker Assets redesign in place; (B) files → D1 `content_pages/posts` then hybrid/SSR. Table of dynamic behaviours (procedural hero, auth-aware header, LMS-scoped guide, `FTS5` search) that live in Worker, not static Astro; coupling seams to `templates.ts` / `theme.ts` listed.
3. Added §31 **Localization (i18n)**: locale-prefixed routes with `Accept-Language` + `CF-IPCountry` fallback, `hreflang` + `og:locale` + `dir="rtl"` for RTL, `content_pages(locale)` / `i18n_strings` / `glossary_terms(locale)` model, `astro-i18n` (marketing) + `i18next` (app) + email locale, `/admin/i18n` coverage view. All hot-reloadable.
4. Added §32 **Electrical Standards — Global Immutable**: code-owned (`standards.ts`, `electricalCalculations.ts`, `tripCurves.ts`, `compliance.ts`), D1 projection seeded at build (`bun run seed:standards`), **super_admin viewer-only** (no `POST/PATCH /api/standards`), changes only via PR + migration + release + `CHANGELOG.md` citation.
5. Added §33 **D1 Performance at Scale**: replicas `withSession(bookmark)`, short batched writes, 70% KV shield, Queues for slow work, idempotency + `409` OCC, DO for hot aggregates, `EXPLAIN QUERY PLAN` per query, p95 budgets, local parallel-burst verification command.
6. Added §34 **Exhaust Inventory** checklist (every `src/` + `astro-site/src/` file to read) and §35 open questions. `PLAN.md` / `TRACKING.md` aligned to all four.
7. Added edge-case answers inline: RTL scope, standards version pin, card/quiz localization vs electrical number immutability.

**Still pending for next session:** run the exhaustive `glob` + line-by-line reads listed in §34 and produce the **coupling table** appendix in `docs/REWRITE_PLAN_V3_FULL.md` so §30–§33 move from "designed" to "proven against the real files". Then scaffold Phase 0.

---

<!-- Next session appends below. Keep append-only. -->


## Session 2026-09-26 — Phase 1.0 and Cloudflare isolation

Completed inventory and ADR 0007; the actual registry has 115 components, including 41 Pro. Membership scope and standards-source corrections are recorded in the Phase 1 and membership plans.

At the user's request, deleted `/home/ali-gohar/.config/.wrangler/config/default.toml` (OAuth/refresh tokens) locally. No account logout/revocation or remote operation was performed. Added the local-only workspace rule, explicit local Wrangler bindings, disabled deploy/remote seed paths and loopback-only browser test targets. A new account will be configured after development.

Validation: `bun run typecheck`; changed-file Biome lint; deploy/default-seed/remote-seed refusal checks; local/nonlocal URL checks; `wrangler dev --local` on port 8791 reports all bindings local and `/api/health` returns 200. Continue from Phase 1.1 standards corrections.


## Session 2026-09-26 — Phase 1.1 standards corrections

Completed the claim/applicability gate described in [implementation evidence](docs/audits/phase-1-standards-implementation.md). The source register remains the reviewed IET/NFPA/IEC audit; full normative tables are explicitly unverified. Basic physical-fault guards and safety findings remain available.

Validation: all 99 Vitest files / 1,488 tests passed; all project typechecks and repository lint passed. Five Chromium flows passed (profile/plug switching, rating advice, safety advice, UK/TN-S/TT/US Zs boundaries, and EIC download). Initial browser runs found missing Chromium and stale test selectors; installed the matching browser and corrected the selectors. `bun run build` passed after fixing the pre-existing Bun Astro script invocation. Migration 0003 and standards seed ran only on local D1; `/api/standards` on port 8791 returned version 2 metadata for all four profiles. The old credential file is still absent; no remote operation occurred.

Next: Phase 1.2 shared domain package. Membership/API/UI implementation remains pending in 1.3–1.8.


Phase 1.1 follow-up before extraction: corrected the solver's residual-trip metadata so selecting US does not relabel a 30 mA device as 6 mA; US trip timing is now unassessed. Removed IEC/UL curve equivalence and used actual supply voltage in switched-neutral warnings. The focused simulation/curve regressions include these cases. Included the Astro calculator's regenerated checked-in bundle from the successful build.


## Session 2026-09-26 — Phase 1.2 shared domain package

Moved the electrical domain to `packages/domain/src`, updated all application/Worker/tool imports to `@electrasim/domain`, and retained direct challenge subpaths for lazy loading. The package has no runtime dependencies; its 84 runtime modules pass a boundary check and compile with ES2022 types only (no DOM/framework types). The single `Circuit` contract is unchanged. Domain tests now run in Node, application tests in jsdom; shipped-demo integration coverage stays with the app.

Legacy fault normalization previously read `Date.now()` and `Math.random()` during `simulate()`. It now derives stable IDs and uses timestamp 0 for unknown creation time, while preserving explicit saved records. Before/after extraction comparisons matched all electrical results across 480 cases, excluding only that intentional identity-metadata change. An isolated real local Hono/workerd fixture then produced exactly identical complete outputs to Bun for all 480 cases.

Gates: 101 Vitest files / 1,491 tests passed; all four TypeScript projects, boundary checks and repository lint passed; `bun run build` passed; five local Chromium flows passed. The simulation benchmark passed at 3.67 ms median / 6.34 ms p95 on 200 components / 396 wires when rerun after other CPU-heavy gates finished (the simultaneous benchmark was distorted by test/build contention). Frozen-lockfile installation passed; lockfile changes only add the workspace package, with no dependency upgrades.

Local fixtures: `wrangler.domain-test.jsonc` and `scripts/check-domain-worker.ts`; see [package README](packages/domain/README.md). The isolated test Worker is not imported by the application and must never be deployed. Main Worker `/api/standards` still serves four profiles locally. No live Cloudflare operation occurred.

Next: Phase 1.3 trusted roles, manual membership schema/resolver/APIs and local cookie-authenticated authorization tests. The paid-membership feature is still pending; Phase 1.1/1.2 establish its electrical/domain foundations.


## Session 2026-09-27 — Phase 1.3 memberships and trusted roles

Completed the local backend foundation in `packages/db/{auth,auth-schema,membership-schema}.ts`, migration `0004_membership_foundation.sql`, `packages/access/`, and `src/api/`. Better Auth rejects/ignores protected role inputs; an explicit known-user operator command bootstraps the first local super admin with an atomic audit. Staff and organization roles never imply paid capabilities or membership administration.

The manual APIs manage plans, supported benefits and grants, with localized benefit copy, strict fields/dates, pagination, impact counts, same-origin checks, fresh primary D1 reads and optimistic versions. Random mutation tokens bind plan feature replacement and audit to the winning write in one D1 transaction. Deletion archives referenced plans/benefits and revokes grants while retaining history. Public marketing archive is separate from explicit capability disablement. No commercial plans or memberships are seeded.

Added [the API/bootstrap contract](docs/api/membership.md), local test configuration and `bun run test:membership`. That gate migrates isolated local D1, registers real Better Auth users and uses issued cookies. All **19 acceptance groups passed**, including role/CSRF denial, signup/profile role injection, overlapping/scheduled/expired/no-expiry grants, suspension/extension/revocation with the same cookie, concurrent plan/feature/grant edits, audit rollback, unavailable D1, archive/hard-delete behavior and staff demotion. Evidence remains in `.wrangler/membership-tests-zzVhBB/`; tests shut down their isolated Worker.

Validation: **102 Vitest files / 1,514 tests passed**, including 23 resolver/classification tests; domain/access isolation compiles, all application/E2E/Astro/API-script typechecks and repository lint passed. `bun run build` passed. Drizzle regeneration reports no schema drift. Migration 0004 applied to the regular **local** `.wrangler/state` database; the local Worker on port 8791 returns phase 1.3 health, empty public plans and a 401 for unauthenticated admin access. Logs: `.wrangler/phase-1.3-{check,build}.log`. No dependency versions were upgraded.

Phase 1.3 is complete; next is **1.4 canvas base**. Simulator redesign spans 1.4 (canvas), 1.6 (visual effects) and 1.7 (main interface). Simulator action/persistence enforcement remains in 1.5/1.7 and the membership administration UI in 1.8. Development remains local-only; no live Cloudflare account or remote resource was used.

## 2026-09-27 — Phase 1.4 canvas foundation

Implemented the accepted canvas direction in the simulator itself; no standalone demo or broader 1.7 shell redesign. All 115 canonical types have cached vector device artwork, including enhanced breaker/switch/contactor/motor/fan/source families and retained regional socket silhouettes. Device markings use instance ratings, moving actuators reflect switch/trip state, and motor/fan housings stay still while only their rotors animate. Terminals retain their canonical IDs and positions; labels and screw details support identification.

Canvas CSS variables survive SVG/PNG export. Reduced motion and reduced effects suppress decorative animation. Dense circuits keep recognizable device bodies and their accessible controls; diagnostic, traced, severed, shorted, overheated and melted wires retain their normal safety indicators. Normal dense wire selection keeps its original focus target. Cancelled or zero-motion drags preserve component rotation.

Every general fit control now uses the same SVG-coordinate and rotated-footprint helper, measuring palette, inspector, toolbar, console, minimap and diagnosis occlusion. Layer memoization avoids rebuilding components and wires for viewport-only changes; panel backdrop blur is suspended during gestures and restored afterward. Existing orthogonal routing and circuit data/solver behavior are retained.

Validation: **104 Vitest files / 1,520 tests passed**, all project typechecks and lint passed, and the final build/bundle budgets passed (237,882 B gzip initial JS; 26,359 B CSS). The final selected-wire focus adjustment also passed its targeted regression test. Chromium desktop/phone browser checks: **31 passed, 13 platform-specific skips**, covering new artwork, keyboard wiring, cancellation/rotation, panel-aware fit, light/dark themes, reduced motion, SVG/PNG downloads, protection trips, rerouting, touch cancellation, undo/copy/paste, staircase switching and Zs inspection. Screenshots were visually inspected; local copies are under `.wrangler/phase-1.4-evidence/`.

The corrected dense fixture actually imports 200 components / 400 wires (the old share URL exceeded its size limit at this workload). Dev-build headless averages: pan 98.30 → 20.90 ms, drag 43.50 → 40.96 ms; zoom after optimization 133.89 ms. Pointer handler/commit and idle gates pass. A test-only Canvas 2D paint comparison improves zoom to 42.65 ms but slows pan to 45.48 ms and lacks application parity. **The 60 fps dense-interaction target remains open**, especially for zoom. SVG is retained; no renderer dependency was added. Culling is deferred until focus, cross-viewport wires, gesture previews and exports can be preserved. See `docs/PERFORMANCE.md` and ADR 0007 for methodology and limitations.

A separate localhost production-asset benchmark also passed its CPU/idle gates: average idle/pan/drag/zoom 19.82/20.90/21.18/148.58 ms. It confirms the zoom limitation; no 60 fps acceptance claim.

Phase 1.4's canvas foundation and measurement gate are complete locally, with the performance target explicitly unresolved. Next is **1.5 state, simulation and persistence**, including membership enforcement. No credentials, remote resources, dependencies or live deployments changed.

## 2026-09-28 — Phase 1.5 state, simulation and persistence

Resumed the existing Phase 1.5 work and verified its operation before closing the sub-phase. The shared circuit format now lives in `packages/domain`; `packages/access` classifies actual circuit/scenario content; the editor guards protected mutations, undo/redo and Comlink simulation using fresh membership. Circuit CRUD and server-owned diagnosis attempts use migration 0005 and Hono owner/version/capability checks. Account documents, interrupted repairs and explicit IndexedDB backups survive downgrade; guests retain basic offline editing, faults and diagnosis.

Relay correction: explicit isolated contact poles, exclusive NO/NC, automatic coil operation/dropout, bounded feedback resolution and derived canvas/inspector state. DPDT NC terminals are appended without changing old indices. SPST/SPDT remain free. See `docs/audits/phase-1-relay-regression.md` for model limits.

The continuation fixed terminal diagnosis persistence: accepted completion/timeout/abandonment no longer reopen as active, aggregate statistics update once, and accepted scores survive server reads/reloads. Failed starts restore the prior exercise access context; resumed authorized work clears its blocked state. Test fixtures now share the serving test Worker's local D1 runtime, eliminating observed competing-runtime SQLite locks; the fixture endpoint is absent from the application Worker.

Validation: final `bun run check` passed **108 files / 1,544 tests**, all project typechecks and lint. Baseline full membership acceptance passed 24 groups; the updated `test:simulator` passed **9 real local D1/cookie/Chromium groups**, including paid completion, guest offline diagnosis, revoked reload, backup export and basic-copy recovery. Selected desktop browser regression covered **51 scenarios**: 48 passed initially, and all three failures passed after correcting test timing for real authorization round trips and server-result waits. Build, bundle budgets, internal links, SEO and CSP passed. Solver benchmark: **3.70 ms median / 6.32 ms p95**, 200 components / 396 wires. Migration 0005 is already applied to the regular local database.

Evidence and command details: `docs/audits/phase-1-persistence.md`, `docs/api/simulator.md`, and ignored `.wrangler/resume-phase15-*.log` artifacts. The basic-copy browser screenshot was visually inspected. No Cloudflare credentials or remote resources were used, and nothing was deployed or pushed. Next: **1.6 visual-only Matter effects**. The broader interface/admin work remains in 1.7/1.8, the full local matrix in 1.9, and the dense-canvas 60 fps target remains open.

## 2026-09-29 — Phase 1.5 completion gate

Closed the final Phase 1.5 acceptance gap: Saved circuits now keep the owner-scoped selected document, name and optimistic-concurrency version outside the lazy modal, so closing and reopening the panel retains the document used by Update. Account changes clear that session selection. Added a regression test for same-owner retention and account-change clearing.

Validation: `bun run test:simulator` passed **9 real local D1/cookie/Chromium groups**; `bun run test:membership` passed **25 groups**; `bun run check` passed **109 files / 1,546 tests**, all project typechecks and lint; `bun run build`, performance, links, SEO and CSP checks passed; the relay Chromium regression passed; and the 200-component/396-wire solver benchmark measured **3.14 ms median / 5.62 ms p95**. Migration 0005 remains applied to local D1. Phase 1.5 is now complete locally. Continue with **1.6 visual-only Matter effects**; no remote operation or deployment occurred.

## 2026-09-30 — Deep-scan reconciliation and electrical-core replanning

Reviewed root `v3-audit.md` against V3 `d054468` plus the existing Phase 1.5 working changes. The supplied report targets V2 `e9673c8`; preserved it unchanged. Added [the complete finding register and staged core rebuild plan](docs/plans/SIMULATOR_CORE_REBUILD_PLAN.md), updated the detailed Phase 1 sequence, master roadmap, `PLAN.md` and documentation index. **Next is now 1.5A audit baseline/corrections, followed by 1.5B–1.5F electrical-core replacement and integration, before 1.6 effects.** Completed persistence/membership/canvas work retains its recorded scope. Later community, scoring, generation and LMS plans now require model-version and applicability handling. No replacement engine or defect fixes were implemented in this planning session.

Direct Bun probes reproduced dead series loads, 8.7348 A painted on both heater/bulb branches, 230 V from the 12 V battery/transformer model, a motor operating from one live terminal, missing default-state semantics, protection-bypass/trip/damage inconsistencies and validation false passes. Basic/Pro overload outputs now agree; forced-open protection disconnects correctly; cited EV/cooker template errors no longer reproduce, while cable/three-phase limitations remain. Plain RCCB operation on a physical L–N bridge still incorrectly uses magnetic-breaker semantics. The auditor's S3 benchmark claim was explicitly retracted and is not treated as an open defect. Dependency advisory claims remain pending current verification.

Validation for this review: **2 Vitest files / 11 tests passed** (current relay and circuit-file validation regressions). The selected real localhost built-assets Playwright homepage test **failed as reported in N30**, expecting the old title and receiving the current title. No new build or full `verify` was run. Local probe source/results are retained under ignored `.wrangler/audit-reconciliation-2026-09-30/`; permanent independently asserted audit fixtures are a 1.5A deliverable. No runtime source, dependencies, credentials, account resources or deployment settings changed; no remote operation or hosted test was run.

## 2026-09-30 — Phase 1.5A audit corrections and local acceptance baseline

Implemented the next authorized sub-phase in `packages/domain/src/simulation/{simulate,faultPropagation}.ts`, `protectionRoles.ts`, `simulationCoverage.ts`, `types.ts` and `circuitValidation.ts`. Automatic operation now follows device capabilities and nameplate ratings: plain RCCBs and isolators do not act as overcurrent breakers, ordinary breaker trips do not persist as destruction, fuse links still require replacement, and damage entries are unique. Bypass suppresses protective operation; bypass of a manually opened contact remains an explicit 1.5D defect. Unsupported DC, transformer and three-phase drawings return unavailable electrical assessment without invented telemetry or destructive effects; timer/dimmer models disclose their manual-continuity limits.

Updated `templates.ts`, catalogue/help copy, `TemplatesModal.tsx`, `ComponentPropertiesView.tsx` and `Inspector.tsx` so unsupported guides and measurements are visible to the user while drawings remain editable/exportable. Added `auditFixtures.ts`, `audit-regressions.test.ts` and `e2e/audit-baseline.spec.ts`, plus real-solver store and guide-picker checks. The audit suite has **25 normal checks and 7 explicit expected failures** for later contracts/solver/protection/integration work. Those seven defects are recorded, not fixed. Updated existing template/generator assertions to require explicit model warnings instead of false passes.

Added `scripts/verify-phase15a.mjs` and `bun run verify:phase-1.5a` for a serial local acceptance command. Corrected the exact homepage SEO expectations in `e2e/production.spec.ts`. Astro's native esbuild helper now uses the installed Node runtime in `astro-site/package.json` after Bun reproduced `The service was stopped`; the ordinary Bun-orchestrated build then passed. No dependency version or lockfile change was needed. Added [ADR 0008](docs/decisions/0008-staged-electrical-core.md) and [implementation/verification evidence](docs/audits/phase-1-audit-baseline.md); aligned the Phase 1 plan, master roadmap, rebuild plan, `PLAN.md`, documentation index and changelog.

Validation: `bun run check` passed **110 files / 1,578 tests**, including the seven expected failures, plus all typechecks/lint. After adding three store/picker cases, their focused run passed **2 files / 12 tests**; no later full-suite count is claimed. Final typecheck/domain boundary and lint passed (88 domain modules; 629 files linted). The fresh build, asset budgets, links, SEO and CSP passed: **243,624 B initial JS gzip / 250,000 B**, **26,394 B CSS / 30,000 B**, 193 HTML files checked for links and 191 SEO pages. Solver benchmark passed at **3.60 ms median / 6.95 ms p95**, 200 components / 396 wires. E2E compilation and discovery passed for three desktop cases; discovery is not browser execution. Reviewed 53 relative links across seven phase/plan documents and checked tracked diff whitespace. Logs remain in ignored `.wrangler/phase15a/`.

**1.5A acceptance remains open.** Built-assets browser tests could not start because the sandbox rejected localhost binding with `listen EPERM` on `127.0.0.1:8788`; real Worker/D1 acceptance was not rerun. The current dependency advisory request failed with `DNSResolveFailed`; resolved versions are recorded, but no clean security audit is claimed. There is no complete green `verify:phase-1.5a` or full `verify` result. Next: run the phase command and `bun audit --json` in a local environment permitting localhost and registry access, resolve any failures, then begin **1.5B contracts and graph**. The original Phase 1.5 remains complete within its recorded scope; Matter effects follow 1.5B–1.5F. Existing uncommitted persistence/membership/relay work was preserved. No credentials, Cloudflare accounts/resources, hosted tests, deployment or publication changed.

## 2026-09-30 — Phase 1.5A closed locally; next phase deferred

**Supersedes the open acceptance status above.** Completed the current dependency review and the entire `bun run verify:phase-1.5a` command. The user narrowed this continuation to closing 1.5A only; **no 1.5B implementation was started**.

Targeted Bun updates include Astro 7.2.8, Vitest/UI/coverage/mocker 4.1.11, Wrangler 4.144.0 and patched transitive packages. Vitest's major upgrade belongs to **1.5A.2 dependency remediation**; the plan had no separate later Vitest-upgrade milestone. Fixed its test-config type import and awaited menu dialog preloads before environment teardown. Corrected the already-inaccurate Node minimum to >=22.19.0 without changing the installed runtime. The refreshed audit now reports one moderate esbuild advisory through Drizzle's old transform-only loader: its vulnerable serving API is not used here. No override or clean-audit claim was added. See [dependency versions, exposure and follow-up](docs/audits/phase-1-dependencies.md); the next scheduled dependency review remains Phase 8.

Real browser execution exposed two fixture gaps: the offline built-assets test needed an empty membership snapshot because its static preview has no API, and the transformer test needed to open the collapsed inspector via **Inspect** before asserting unassessed telemetry. Both retain their asset/electrical assertions. The real Hono/D1 membership gate independently verifies authentication and authorization.

Final acceptance: **110 Vitest files; 1,574 passed and 7 explicitly expected core failures**, all typechecks and lint (88 domain modules; 629 files), fresh build, asset/link/SEO/CSP gates, **53 built-output plus 3 simulator browser cases**, and **25 real local Worker/D1 membership groups**, including paid browser flows. Final simulation benchmark: **3.55 ms median / 7.06 ms p95** at 200 components / 396 wires. Asset budgets: **243,624 B initial JS gzip / 250,000 B**, **26,394 B CSS / 30,000 B**; links checked 193 HTML files and SEO checked 191 pages. Frozen offline Bun install verified 848 installs across 1,062 packages with no changes. Evidence: ignored `.wrangler/phase15a/closure-gate.log`, `closure-membership.log`, before/after audit responses, and `.wrangler/membership-tests-dmXYo3/`.

Updated the [1.5A closure record](docs/audits/phase-1-audit-baseline.md), active Phase 1 plan, master roadmap, rebuild plan, documentation index, persistence sequence pointer and changelog. The full `bun run verify`, dense 60 fps target and replacement numerical engine are not claimed complete. Seven owned core defects and the reviewed tooling advisory remain explicit. Existing uncommitted work was preserved; no commit, publication, deployment, credential restoration or Cloudflare account/resource operation occurred. **Stop after 1.5A and resume the next phase later.**

## 2026-10-01 — Phase 1.5B completed locally

Resumed the user's requested contracts/graph milestone from the existing working implementation and closed its local acceptance gate. `packages/domain/src/core` provides bounded shared input validation, canonical defaults, wire properties with provenance, typed source/device/result coverage and deterministic terminal compilation. Independent source blocks, relay/contactor poles, coils and transformer windings stay separate. Physical cross-role wiring remains representable; unknown fault pairs and unsupported physics are explicitly unassessed. The circuit schema remains version 1; the electrical contract is version 1 with model `1.5b.1`.

The completion review corrected two concrete regressions: in-memory exercise loading now preserves an intentionally held bell-push state while file/backup adapters still release it; an earth fault now forms the specified L–PE short instead of breaking the CPC. Leakage impedance stays unassessed, and polarity swaps precede terminal disconnections independent of fault IDs. Added regressions for malformed enum/Unicode inputs, duplicate polarity records, isolated source terminal disconnection, ambiguous fault pairs, source-constraint equality and invalid coil/contact models. N13 defaults and the malformed-port N26 audit fixture are ordinary passing checks; five expected failures remain owned by 1.5C/1.5D/1.5F.

**`bun run verify:phase-1.5b` passed end to end:** all project typechecks including strict indexed access for the new core, 96-module domain boundary, lint, **111 Vitest files / 1,645 passes plus 5 expected failures**, Vite/Astro/postbuild, assets/links/SEO/CSP, **486 Bun/local Hono-workerd parity cases**, **9 real Worker/D1/cookie simulator groups**, **53 built-output browser cases** and **3 Comlink audit/relay cases**. The simulation benchmark measured **4.74 ms median / 7.43 ms p95** at 200 components / 396 wires. Initial JS is **244,624 B gzip**, within 250,000 B. The initial sandbox localhost denial was resolved through approved local execution; the entire command was then rerun successfully.

Evidence and contracts: [Phase 1.5B record](docs/audits/phase-1-electrical-contracts.md), ignored `.wrangler/phase15b-verify.log`, `.wrangler/domain-tests-DiRShd/` and `.wrangler/membership-tests-4Qu3pb/`. Updated the phase plan, rebuild plan, master roadmap, documentation pointers, simulator API notes, ADR implementation note and changelog. Existing uncommitted work was preserved; no dependency upgrade, new migration, credential/account/resource operation, publication or deployment occurred. **Next is 1.5C voltage and branch solving.** Full numerical correctness, complete device dynamics, legacy retirement, the wider `bun run verify` and dense 60 fps remain outside this completed milestone.

## 2026-10-01 — Behavior audit completed; 1.5C and later gates expanded

Finished the existing MNA/behavior-planning work against V3 `6e2736c`. Added the [current behavior audit](docs/audits/phase-1-behavior-review.md), completed the [behavior requirements and delivery plan](docs/plans/SIMULATOR_BEHAVIOR_PLAN.md), and linked [ADR 0009](docs/decisions/0009-mna-solver.md) as the selected Modified Nodal Analysis formulation. The Phase 1 plan now defines **1.5C.0–5**: extend accepted contracts and persist typed supply settings; implement the MNA slice; correct load ranges/branch current/wire losses; add isolated transformers and PE semantics; deliver shared compatibility, confirmed supply changes/Undo, safe variants and readiness; integrate supported results through direct domain, Comlink and local Hono.

Mapped Fault Lab capability/readout work to 1.5C and timed trip/damage/repair to 1.5D; supported three-phase models remain 1.5E. Full Fault Lab, basic/advanced Diagnosis Lab and Ohmageddon migration belongs to **1.5F**, including intended operating results, authored supply/edit constraints, honest fault observability, partial/full recovery and replay/model/profile versions. Later 1.7 refines the interface, while Phases 3–6 expand scoring/generation/content/LMS. Updated the rebuild plan, master roadmap, `PLAN.md`, documentation index, ADR 0008 follow-up, probe README and changelog.

Local evidence: `bun scripts/probes/phase15c-behavior.ts` collected **42 observations**, including the incorrect 2 kW heater response at 12 V, component-order-dependent independent supplies, shared current on separate/open branches, ineffective cable losses, branch-protection errors and wire editor/validator inconsistencies. Preserved findings that already work: unsupported battery guard, bounded input rejection, resolved wire sizes/material/derating, variant wattage differences and isolator/RCCB roles. Raw results are ignored under `.wrangler/phase15c-behavior-review-2026-10-01/`; the durable probe and audit retain fixtures and independent expectations.

Validation: **4 existing test files / 145 passes plus 5 expected failures** for core contracts, audit regressions, diagnosis evaluation and fault verification. All **192 local Markdown links/anchors across 12 documents**, the probe's Biome check and diff whitespace checks passed; corrected the master roadmap's existing table-of-contents anchors. UI findings were source-inspected; this review did not run a fresh build, browser/Worker/D1 acceptance, stress matrix or full `verify`. **The audit/planning task is complete; MNA and the behavior corrections are not implemented. Next is 1.5C.0.** No runtime source, dependencies, migrations, credentials, remote account/resources, deployment or publication changed.

## 2026-10-02 — Phase 1.5C.0 supplies and shared preflight completed locally

Implemented persisted version-1 supply profiles, explicit source interfaces and a capability/rating inventory for all 115 catalogue variants in the pure domain core. Circuit and portable-backup writers now emit schema 2 and read schemas 1 and 2; the existing IndexedDB key upgrades in place. Legacy IDs, terminals, wire properties, load design ratings and fault/trip/damage records remain intact. Contract version stays 1 and model version is `1.5c.0.1`. Legacy frequency remains an explicit 50 Hz assumption; new US documents use 120 V / 60 Hz.

Shared terminal-group compatibility distinguishes source kind, phase, frequency, nominal/solved voltage and unknown operating limits. Preflight distinguishes empty, missing-source/load, open, partial, connected, invalid and source-short topology without claiming measurements, normal operation or standards approval. Source edits preserve independent supplies, loads and PE; supply profiles survive editor history, authorization races, autosave, recovery, file/backup/share and browser/local-server boundaries. Existing voltage controls preserve saved kind/frequency and lock during simulation and exercises. Full staged confirmation/impact/Review/Undo, palette/inspector/Run integration and the MNA solver remain pending. Unsupported mixed/DC/three-phase configurations retain explicit legacy-runtime guards.

**`bun run verify:phase-1.5c0` passed end to end:** all typechecks, 102-module domain boundary, lint over 653 files, **114 Vitest files / 1,701 passes plus five owned expected failures**, Vite/Astro/postbuild, asset/link/SEO/CSP checks, **494 Bun/local Hono-workerd parity cases**, **9 real Worker/D1/cookie groups**, **53 built-output plus 6 focused browser cases**. Browser acceptance exercised actual import, voltage edit, undo/redo, JSON download and IndexedDB reload, preserved independent source/rating/fault data, and compared the saved DC guard through real Comlink and local Hono.

Final benchmark: **4.61 ms median / 7.78 ms p95** at 200 components / 396 wires, within the unchanged 8 ms budget. The initial full run stopped at 8.59 ms; the prior commit also exceeded the limit in an isolated comparison (8.84 ms), while the current tree passed at 7.95 ms. No benchmark parameters or numerical behavior were changed. Initial JS is **246,780 B gzip / 250,000 B** and CSS **26,394 B / 30,000 B**; 193 HTML files and 191 SEO pages passed. Approved local execution resolved the sandbox's localhost binding restriction.

Recorded [scope and acceptance](docs/audits/phase-1-supply-preflight.md), the concrete [MNA implementation contract](docs/decisions/0009-mna-solver.md#implementation-contract-established-in-15c0), and updated current phase/roadmap/changelog pointers. Logs remain ignored under `.wrangler/phase15c0-verify.log`, `.wrangler/phase15c0-verify-initial.log`, `.wrangler/domain-tests-mEEfrO/` and `.wrangler/membership-tests-3rSy7D/`. Broader `verify`, stress suites, dense 60 fps and all of 1.5C are not claimed complete. No dependency change, remote test, deployment or Cloudflare credential/account/resource operation occurred. The user requested committing/pushing this completed milestone, then starting **1.5C.1**.

## 2026-10-02 — Phase 1.5C.1 linear MNA solver slice

Continued the authorized current sub-phase. Implemented the bounded ADR 0009 first numerical slice in `packages/domain/src/core/`: `mna.ts` (`solveCircuit`), `linearSystem.ts` (scaled partial pivoting, pivot guards, residual verification), `voltageConstraints.ts` (conflicting/redundant ideal-source detection), `linearMeasurements.ts` (link-current recovery, KCL/KVL/per-domain power verification), plus `mnaFixtures.ts`/`mna.test.ts`, `benchmark:mna` and `verify:phase-1.5c1`. The contracts extend with engine version, signed branch voltages/powers, wire losses, terminal domains, references and conservation checks; model version is `1.5c.1.1`. Independent analytical expectations cover series/parallel/shared-feeder/bridge networks, a dangling live end, balanced zero-current branch, independent sources, AC RMS at 12/120/230 V, signed source absorption/delivery, reversed-lead sign conventions, static contact state, scale sweeps and input-order invariance. Unsupported connected load laws, transformers/motors/PV, mixed AC kinds/frequencies, phase-undeclared AC and singular/indeterminate constraints return explicit unavailable results with no telemetry fabricated.

**`bun run verify:phase-1.5c1` passed end to end:** all typechecks including strict indexed access for the core, 107-module domain boundary, lint over 663 files, **116 Vitest files / 1,763 passes plus five owned expected failures**, Vite/Astro/postbuild, asset/link/SEO/CSP checks, and **510 Bun/local Hono-workerd parity cases** covering simulation, compilation, profiles, capabilities, readiness and MNA fixtures. The first gate attempt failed one flaky orthogonal-routing perf assertion (58.1 ms vs 50 ms); the file passed standalone and the rerun gate passed without any threshold, fixture or solver change.

MNA benchmark evidence: two series loads **0.44 ms median / 1.17 ms p95** at 6 driven unknowns; 400/512 driven unknowns **42.8–65.6 ms median**, so dense factorization misses the legacy 8 ms budget at the 200-component fixture — recorded as decision input for ADR 0009's sparse/external-library step, not a legacy-adapter regression. Initial JS **246,774 B gzip / 250,000 B**, CSS **26,394 B / 30,000 B**; 193 HTML files and 191 SEO pages passed. Evidence in ignored `.wrangler/domain-tests-Ig1Qjk/`.

Recorded [Phase 1.5C.1 acceptance](docs/audits/phase-1-mna-solver.md), updated the phase plan status/verification rows, ADR 0009's status line, changelog and progress. The app runtime still uses the guarded legacy engine; consumer/browser/local-Hono MNA integration is 1.5C.5, load ranges and wire losses in 1.5C.2, isolated transformers/PE in 1.5C.3, confirmed supply editing in 1.5C.4. Broader `verify`, stress suites, dense 60 fps and 1.5D–F remain open. No credentials, remote account/resources, hosted tests, deployment or dependency changes occurred.

## 2026-10-02 — Phase 1.5C.2 load response and wire properties

Completed the resumed operating-point layer with model/capability version `1.5c.2.1`. MNA results now include shared compiled readiness, fixed-rating load response and compatibility, wire properties/drop/loss, actual pole currents and separately labeled current-capacity/overcurrent/residual units. Unknown ranges/ratings remain unassessed, open branches keep useful voltage without invented current, and no timed trip or damage is performed. Added independent heater voltage/cable sweeps, declared-range and boundary cases, unknown LED coverage, independent supplies, branch-protection readings and provenance/state regressions.

Corrected the wire inspector and header to use the domain resolver; metric/AWG edits now preserve one physical size through undo/redo/export. Inspector readings no longer substitute 0.05 Ω or 20 A. Cable validation uses resolved wires rather than stale endpoint recommendations, removes ineffective component-only quick fixes, and keeps unsupported capacity and unknown device ratings unassessed. Nonstandard/AWG capacity does not round up to a larger table size; the conductor-resistance model remains available.

**`bun run verify:phase-1.5c2` passed end to end:** all typechecks including strict core indexing, 110-module domain boundary, lint over 671 files, **119 Vitest files / 1,818 passes plus five owned expected failures**, build/assets/links/SEO/CSP, **524 Bun/local Hono-workerd parity cases**, and **four local Chromium cases** for wire edits/unavailable readings plus existing supply/Comlink/local-Hono continuity. Initial JS is **247,605 B gzip / 250,000 B**, CSS **26,394 B / 30,000 B**. MNA benchmark: **0.85 ms median / 2.07 ms p95** for two series loads; 400/512 unknowns measured **47.90–69.80 ms median**, retaining the known dense-solver performance limitation. Evidence: ignored `.wrangler/phase15c2-verify.log` and `.wrangler/domain-tests-fpULEa/`.

Recorded [scope and acceptance](docs/audits/phase-1-load-response.md) and updated the current roadmap, phase, behavior-plan, ADR and changelog pointers. **Next is 1.5C.3 isolated AC transformers and PE/reference relationships.** Full editing/readiness UI and actual MNA runtime integration remain 1.5C.4–5; the browser still runs guarded legacy numerical results. Timed/three-phase models, full lab migration, wider `verify`/stress and dense 60 fps remain pending. No dependency, credential, Cloudflare account/resource, remote test or deployment changes occurred.

## 2026-10-02 — Phase 1.5C.3 isolated transformers and protective references

Completed the next core milestone with engine `mna-linear-2` and model/capability version `1.5c.3.1`. MNA now couples isolated AC windings using fixed turns ratios and signed power transfer, including backfeeding and cascades, while preserving independent galvanic references. The 512-unknown allocation bound applies to the complete coupled group. Added winding ratio/current/power checks alongside terminal KCL, source constraints and per-domain energy balance. Catalogue ratings, saved IDs, source profiles, wire properties and fault state remain intact; no circuit schema changed.

Shared readiness traces winding/load excitation without assigning primary voltage to secondary loads, distinguishes secondary shorts from original-source shorts, and reports explicit PE/neutral/DC-negative/winding relationships. Added protective continuity, polarity, neutral-switching, PE-return and protective-current findings. Fault currents are limited estimates of the declared network; missing leakage/soil/source/winding models do not become invented values or clearing results. Floating faults can retain hazardous potential at zero current. DC excitation, undeclared phase/frequency combinations, broken internal windings, ambiguous faults and singular floating ideal networks remain explicitly unavailable. No rectifier, magnetizing, timed protection or thermal model was introduced.

**`bun run verify:phase-1.5c3` passed end to end:** all project typechecks including strict core indexing, 116-module domain boundary, lint over 680 files, **121 Vitest files / 1,878 passes plus five owned expected failures**, build/assets/links/SEO/CSP, **551 Bun/local Hono-workerd parity cases**, and **four local Chromium continuity cases**. Initial JS is **247,600 B gzip / 250,000 B**, CSS **26,394 B / 30,000 B**. The 8-unknown isolated transformer measured **0.94 ms median / 1.34 ms p95**; two cascaded transformers measured **0.87 / 1.27 ms** at 12 unknowns. Existing 400/512-unknown workloads measured **58.55–82.95 ms median**, retaining the known dense-solver performance limit.

The first gate reached local Worker parity after passing static/unit/build/benchmark checks, but the sandbox denied a localhost bind. Approved local execution allowed the full gate to pass without relaxing any assertion or budget. Evidence: ignored `.wrangler/phase15c3-verify.log`, `.wrangler/phase15c3-verify-approved.log` and `.wrangler/domain-tests-eWsbzS/`.

Recorded [scope and acceptance](docs/audits/phase-1-transformers-pe.md), updated the current roadmap/phase/behavior pointers, ADR 0009 and simulator API notes. **Next is 1.5C.4 essential editing/readiness UI**, followed by actual MNA application/Comlink/local-Hono integration in 1.5C.5. The browser still uses guarded legacy numerical results; the browser gate proves existing persistence/readout continuity. Timed and three-phase models, full lab migration, wider `verify`/stress and dense 60 fps remain pending. No dependency, credential, Cloudflare account/resource, remote-test or deployment change occurred.
