# Phase 2.0A — component access implementation

**2026-10-25: Gates A-F are complete locally. Dedicated full Gate F passed
`bun run verify:phase-2.0a` with full selection, exit 0 and all 18 stages:
2305 units / 151 files, 6 infrastructure / 8 storage / 14 component API /
20 existing admin / 34 membership-simulator groups, 897 unchanged parity and
105 source + 105 built browser cases without skips/retries. All 1318 selected
source/harness inputs matched. Profiles 2.1 Gates A–E are complete locally (2026-10-26): dedicated full 22-stage exit 0, 2339 units / 153 files, 270 source/built browser cases without skips/retries, 8 profile storage / 21 profile API groups and 1350 unchanged source/harness inputs.**
See the [dedicated acceptance manifest](../audits/data/phase20a-acceptance.json).
The historical 2.0 acceptance and Phase 1 performance exceptions remain unchanged.
All implementation and checks remain local; design checks alone do not accept runtime work.

[Extension scope and exit matrix](PHASE_2_ADMIN_EXTENSIONS_PLAN.md) ·
[API/schema contract](../api/component-access.md) ·
[Design review](../design/platform-admin/README.md) ·
[Local audit](../audits/phase-2-component-access.md)

## Execution gates

| Gate | Work and exit | Status |
| --- | --- | --- |
| A — inventory, contract and design | Review existing resolver/guards/atomic audit. Record 75 Basic/41 Pro IDs; define policy/storage/HTTP/race rules. Deliver complete local Components demo with reasoned review, protected Basic, conflict recovery and persona boundaries. Verify prototype locally and record the owner approval received before production adaptation. | Complete as a design gate; panel approval recorded and shared admin integration accepted |
| B — shared policy and storage | Allocate migration against actual sequence; immutable canonical baseline, revision, overrides and Drizzle mirror. Opaque validated snapshot input in access package. Preserve membership/fault semantics and pure solver. | Complete locally — 59 access units, 8 isolated D1 storage groups and historical Gate B full existing regression passed; Gate C recorded separately below |
| C — authoritative server boundary | Public metadata-only policy; super-admin catalogue reads/mutations and protected audit. Fresh primary policy+membership checks, transaction revision predicates on every write, final response recheck on simulation/authorization. | Complete locally — 14 focused HTTP/race groups and full existing 16-stage regression passed; client evidence follows in D |
| D — simulator/recovery | Thread policy through all access entry points. Authorize originally-Pro actions even if currently Free. Session/freshness/offline invalidation; original document/raw backup/Basic-copy preservation and restoration. | Complete locally — 36 new units, 53 selected units / 5 files, 12 source + 12 built policy browser cases and full existing 16-stage regression exit 0 |
| E — reviewed production admin UI | Implement approved Components presentation inside shared shell, actual list/detail/reasoned review/audit, locked Basic, loading/error/expiry/conflict and keyboard/phone behavior. | Complete locally — 15 source + 15 built Components cases, 14 repeated server groups, 8 asset/header pages and full existing 16-stage exit 0 |
| F — dedicated local acceptance | Actual Worker/D1 migration/auth/rollback/race/recovery tests; source+built admin/editor browsers and regressions; record counts/failures/fingerprints in dedicated 2.0A manifest. | Complete locally — full 18-stage exit 0, 105 source + 105 built cases, 8 storage / 14 API groups and unchanged 1318 source/harness fingerprints |

Do not register placeholder permissions/navigation. Do not advance 2.1 until all
gates pass. Gate A prototype results are neither API acceptance nor a production
permission grant. Full phase completion requires the extension matrix, not this
checklist alone. Keep the 2.0 manifest intact.

## Implementation navigation and checks

- Shared resolver: `packages/access/src/index.ts`, `circuit.ts`; extend both pure
  input validation and circuit-content coverage with a complete 116-ID baseline.
- Server: `src/api/simulator-access.ts`, `circuits.ts`, primary `freshContext`,
  `src/api/platform/{access,mutation,reads,index}.ts`, `src/platform/registry.ts`.
  The existing capability guard has zero predicates when requirements are empty;
  a separate policy-revision condition must cover previously-Free writes.
- Client: begin at `src/store/simulatorAccess.ts`, then use targeted graph impact
  for placement/palette, import/paste/templates, persistence, read-only recovery,
  simulation and applicable labs. Never assume import edges prove runtime coverage.
- Admin: registry, `src/admin/platform/`, real `/admin/components/` Vite/Worker
  entry and headers/assets. Add protected catalogue audit scope to all relevant
  projections, without widening ordinary staff history.
- Gate A commands currently exist: `bun scripts/check-component-access-design.ts`,
  `node scripts/check-platform-design.mjs` (localhost preview running), and focused
  Biome checks. Gate B now has `bun x vitest run packages/access/src` and
  `bun run test:component-access-storage` (isolated populated D1 upgrade/constraints).
  Gate C uses `bun run test:component-access-api` (14 actual local HTTP/race groups).
  Gate D passed `bun x vitest run src/store/componentPolicy.test.ts src/store/circuitOpening.test.ts src/store/componentPolicySimulation.test.ts src/store/simulatorAccess.test.ts src/store/useSimulation.test.ts`,
  `PLAYWRIGHT_DEV_PORT=3027 bun x playwright test e2e/component-access.spec.ts --workers=1`
  and `bun x playwright test --config=playwright.component-access-built.config.ts --workers=1`.
  Its full existing regression passed via `bun run verify:phase-2.0` (2305 units,
  78 source + 78 built admin browsers). Gate E passed `PLAYWRIGHT_DEV_PORT=3028 bun x playwright test e2e/component-admin.spec.ts --workers=1`
  and `bun x playwright test --config=playwright.component-admin-built.config.ts --workers=1`
  (15 source + 15 built), repeated 14 API groups, 8 asset/header pages and full
  existing 16-stage regression exit 0. Its dedicated scoped manifest is
  `docs/audits/data/component-access-gate-e-acceptance.json`; full F acceptance now
  has its own `docs/audits/data/phase20a-acceptance.json` and 18-stage command below.
- Retain existing `test:platform-admin`, `test:membership`, `test:simulator`, access
  units, types/lint/build/assets, unchanged 897 parity and source/built editor/admin
  regressions. Exact new test groups come with implementation; the extension plan
  remains the authoritative race/recovery/auth/browser matrix.

## Design decisions

Counts of affected private circuits and future publications are unavailable in the
initial contract. Show that explicitly. Do not scan private JSON in list endpoints
or imply zero impact. Later indexed aggregate storage requires its own review.

Public policy contains no staff metadata; admin audit contains only access changes
and reasons. Baseline is code-owned, runtime rows cannot paywall Basic, and changing
product access never changes physics. Only the existing `pro_components` benefit
is used; arbitrary component packs remain deferred.

## Gate F acceptance command

`bun run verify:phase-2.0a` runs all 18 stages by default. It retains the existing
foundation checks and adds isolated populated D1 upgrade/storage, authoritative
component API/race checks and the combined source/built Components + editor policy
matrices. Built global setup checks all eight actual admin pages and their scripts,
headers and unknown-route 404. Browsers use one worker and zero retries.

Each invocation writes a new `.wrangler/phase20a/run-*/` directory (override with
`PHASE20A_EVIDENCE_DIR`), per-stage logs, browser artifacts, results and a manifest
that explicitly records full/partial selection. Existing evidence cannot be
overwritten. Source/harness inputs are fingerprinted before execution and compared
at completion; changes fail the gate. Documentation review and actual test results
remain separate. `--list`, `--only` and `--from` retain the shared gate semantics.
The historical 2.0 command and manifests keep their original scope.
