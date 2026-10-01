# Phase 1.5A — audit baseline and immediate corrections

Date: 2026-09-30. **Status: CLOSED LOCALLY.** The complete `bun run verify:phase-1.5a` command and the real local Worker/D1 membership acceptance passed. The earlier localhost/registry blockers are resolved for this acceptance run. Dependency review is complete with one documented, currently unexposed tooling advisory; a zero-advisory audit is not claimed. **The next phase remains deferred at the user’s request; no 1.5B implementation was started.**

Scope and original finding register: [core rebuild plan](../plans/SIMULATOR_CORE_REBUILD_PLAN.md). Architecture and migration decision: [ADR 0008](../decisions/0008-staged-electrical-core.md).

## Implemented

- **N9/N23/N24:** automatic fault operation uses overcurrent/residual/arc capabilities rather than `isProtection`. Plain RCCBs do not clear balanced L–N shorts; isolators do not auto-trip. Cable capacity no longer substitutes for a device's nameplate rating. Overloaded accessories without overcurrent protection receive a warning, without invented automatic operation or immediate destruction.
- **N23/N25:** resettable breaker operation is separate from damage; fuse links require replacement. Missing device-specific curves do not become an invented Type B MCB curve. A component receives at most one damage entry per result. Residual devices with no declared leakage rating receive an unassessed warning instead of an invented threshold.
- **N22, partial:** protection bypass suppresses overload and injected-short operation; forced-open still interrupts the path. A bypass does not yet shunt a manually opened switch because traversal still applies its switch-state gate first; the correct desired behavior is an executable expected-failure case owned by 1.5D.
- **2.4/N11/N12/N27, guarded:** DC battery/PV, transformer and three-phase models now return explicit blocking model limitations with no invented voltages, currents, energized loads or destructive effects. Their drawings remain editable/exportable. This guards unsupported operation; it does **not** implement those electrical models.
- **2.7/N15, limited:** timers/dimmers continue to support manual continuity while exposing unassessed timing/level behavior. Validation keeps those limitations as warnings instead of a perfect score.
- **N29/UI:** the guide picker identifies drawing-only examples before loading. DOL and solar guide text no longer promises simulated phase loss, charging or source interaction. Component telemetry and inspector simulation/analytics views report unavailable measurements for blocked models. Coverage findings are configuration issues, not invented short-circuit reports.
- **N30:** the homepage title/description assertions match the existing intended SEO copy and retain exact-value and length checks. The rebuilt output passes static SEO validation and the full built-output browser suite.
- **N31/local workflow:** `bun run verify:phase-1.5a` provides a serial local gate for check, build, asset checks, solver benchmark, built-assets browser suite and focused audit/relay browser cases. No hosted workflow was activated.

Existing uncommitted Phase 1.5 persistence/access/relay work was preserved. Closure adds targeted dependency updates and test-harness fixes; no document-schema change, new migration or remote action was made.

## Durable regression corpus

`packages/domain/src/simulation/auditFixtures.ts` uses explicit component/wire IDs. `audit-regressions.test.ts` contains **25 passing current-behavior checks and 7 explicitly expected failures** for remaining work. It covers analytical P/V values, device mechanisms, fuse/reset semantics, damage uniqueness, raw invalid-file rejection, injected fault paths and model-coverage guards.

The seven `it.fails` cases assert correct desired behavior for series resistive loads (2.1), parallel branch currents (2.2), default switch state (N13), 12 V mismatch handling (N10), bypass of an open breaker (N22), invalid direct-validator ports and reversed polarity (N26). They are named with their owning later phase. An unexpected pass fails the suite until the modifier is removed and the case is promoted. Their passing test status is **not** evidence that those defects are fixed. The complete audit register retains the remaining inspected/partial/unverified items.

Two store tests feed the **real solver** through a stubbed transport and verify its real state projection: an overloaded breaker is tripped without being persisted as destroyed; an unsupported drawing is preserved and its limitation is logged. The guide-picker test verifies the user-visible drawing-only notice. Existing relay, serialization, membership and generator tests remain in place. Generator acceptance explicitly allows only the declared timer/dimmer coverage warnings; it does not ignore arbitrary errors or warnings.

The two audit Playwright cases now pass against the real local app: guest breaker state through Comlink and transformer drawing/measurement preservation. The existing relay case also passes. The transformer test explicitly opens the inspector through its **Inspect** button before asserting unavailable telemetry. The inspector-specific case is desktop-only.

## Final local verification evidence

The final command completed successfully on 2026-09-30 using Bun **1.4.2** and Node **24.14.1**. Logs are under ignored `.wrangler/phase15a/`.

| Check | Result |
|---|---|
| Complete `bun run verify:phase-1.5a` | **Passed end to end**, including all rows below through the focused browser cases. Evidence: `closure-gate.log`. |
| Typechecks and lint | All TypeScript projects passed; domain boundary: **88 modules**; lint: **629 files**. |
| Vitest 4.1.11 | **110 files; 1,574 passed + 7 explicitly expected failures = 1,581 cases**, with no unhandled errors. The seven known core defects remain owned by later phases. |
| Fresh build | Vite, Astro and postbuild passed. |
| Asset budgets | Initial JS **243,624 B gzip / 250,000 B**; CSS **26,394 B / 30,000 B**; 193 HTML pages. |
| Links, SEO, CSP | Passed: 193 HTML files checked for links; 191 SEO pages; source/built CSP checks passed. |
| Simulation benchmark | **200 components / 396 wires; 3.55 ms median / 7.06 ms p95**, within the existing 8 ms p95 budget. This does not establish dense-render 60 fps. |
| Built-output Playwright | **53 / 53 passed** against localhost, including homepage SEO and offline lazy dialogs. |
| Audit/relay Playwright | **3 / 3 desktop cases passed**: breaker trip without destruction, unsupported transformer preservation/telemetry, relay NO/NC transfer and dropout. |
| `bun run test:membership` | **25 groups passed** against real local D1 and cookie sessions, including simulator authorization, owner/version circuit CRUD, server-owned diagnosis, revocation, and paid browser flows. Evidence: `closure-membership.log` and `.wrangler/membership-tests-dmXYo3/`. |
| Frozen Bun lockfile | `bun install --frozen-lockfile --ignore-scripts --offline` checked 848 installs across 1,062 packages; **no changes**. |
| Current dependency review | Completed; targeted updates reduce the audit to **one moderate esbuild tooling finding**, whose vulnerable serving API is not used here. See [dependency evidence and disposition](phase-1-dependencies.md). `bun audit` still exits 1; no clean-audit claim. |
| Wider `bun run verify` | Not run or claimed. Full Phase 1, numerical replacement, stress and dense-interaction gates remain later work. |

## Gate repairs and dependency migration

- **Vitest 3.2.7 → 4.1.11** belongs to 1.5A.2's verified dependency fixes. The root and Astro workspace versions, UI, coverage and mocker packages stay aligned. The test config imports `defineConfig` from `vitest/config` and uses `import.meta.dirname`; `MenuOverlay.test.tsx` awaits dialog preloads with `vi.dynamicImportSettled()` before teardown. The initial full run exposed six teardown errors; the final full run has none.
- The static built-assets preview does not implement membership APIs. Its offline-dialog test now supplies an empty membership snapshot at that exact API path, while every asset request still uses the real built app/service worker and console/page errors still fail the test. This is an asset-availability test; real authorization is verified separately by local Hono/D1 acceptance.
- The transformer browser test initially selected the component without opening its collapsed inspector. It now follows the visible **Inspect** action before checking the unchanged telemetry assertion.
- Targeted Astro/Wrangler/transitive updates, advisory ranges, the retained esbuild finding and the corrected Node >=22.19.0 tooling minimum are recorded in [the dependency review](phase-1-dependencies.md). No system runtime was changed, no blind fix/override was applied, and no later major upgrade is scheduled separately from the Phase 8 dependency review.
- The earlier native-tool helper fix remains: Astro invokes its esbuild prebuild/predev helper through the installed Node runtime after Bun reproduced `The service was stopped`; Bun still orchestrates project scripts and packages.

The earlier 1.5A run was blocked by localhost `listen EPERM` and registry `DNSResolveFailed`. Those historical failures were not counted as passes. The closure run used authorized local execution for browser/Worker binding; no hosted test, Cloudflare account/resource operation, credential restoration, deployment or publication occurred.

## Closure and deferred work

All four 1.5A steps are complete within their defined scope: the independent audit corpus, local gate/dependency review, immediate protection and coverage corrections, and ADR 0008. The [finding register](../plans/SIMULATOR_CORE_REBUILD_PLAN.md) retains the later contracts, branch-current, source, time/protection, three-phase and integration work.

**Stop after 1.5A as requested.** The planned next milestone is **1.5B contracts and graph**, left unstarted. Phases 1.5B–1.5F still precede 1.6 Matter effects. The known expected failures, unsupported-model guards and the reviewed tooling advisory remain explicit; closing this baseline does not claim a completed numerical engine or full electrical compliance.
