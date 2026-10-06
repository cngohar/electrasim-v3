# Phase 1.5D.3 — declared damage and Fault Lab repair

Updated 2026-10-06. **Complete locally within the declared D.3 scope.** `bun run verify:phase-1.5d3` passed end to end after the local execution environment was unlocked. This follows the accepted [1.5D.2 protection slice](phase-1-protection.md). The next local slice is **1.5E: supported three-phase teaching models**; Phase 1 as a whole remains in progress.

[ADR 0013](../decisions/0013-damage-and-repair.md) and the [simulator API contract](../api/simulator.md) define the model, input bounds and persistence behavior. Contract version remains 1; shared model/capability version is `1.5d.3.1`, and the timed engine is `mna-controls-4`. Older transient states are rejected. No dependency, database schema or circuit-file schema change is required.

## Accepted scope

- Supported resistive loads may declare a version 1 current or terminal-voltage damage budget; wires may declare a current budget. Actual DC/RMS branch current or load terminal-pair voltage drives cumulative `max(measured² − threshold², 0)` exposure. Undeclared damage stays unassessed, independently of ratings, cable ampacity or installed protection.
- Damage opens the element at the first microsecond at or after crossing. Protection, controls and damage share the event clock; final-step integration precedes later input edits. Events retain pre-event measurements, and the next solve supplies post-event readings. Repeated and partitioned steps preserve deterministic event order without mutating caller state.
- The bypass teaching model disconnects the sensed ideal contact and routes current through an external shunt. It avoids an indeterminate split between two ideal paths; it does not model real bridge current sharing. Breakers can clear before a damage budget is reached, while a bypass or protection in another branch does not suppress the affected cable's stress.
- Fuse operation emits `fuse-operated` and survives OFF/ON. The application saves irreversible component/wire failure through existing `isBlown` / `isBusted` flags. Stop/Run resets time, exposure and resettable trips without replacing saved failed items; transient state itself is not persisted. Pure domain/API calculations leave input documents unchanged.
- Fault Lab separates clearing injected faults, resetting breakers to OFF and replacing damaged items. Replacement requires a stopped run and preserves wiring, ratings, declarations and remaining faults. Legacy restored trips also reset to OFF. Fault edits during a timed run preserve time and latches. The start guard requires replacement/reset before a new run with saved failed items.
- Damage settings obey running/exercise configuration locks. Existing membership checks still guard mutations, including asynchronous fault clearing and replacement. Saved legacy faults appear in the active-fault list and can be cleared by their displayed IDs. Event history retains simulated time, model version and measured damage/fuse values. Modern damage does not trigger the legacy automatic-stop/destruction narration.
- The Pro phone dock opens the same Fault Lab controls in a scrollable dialog, including component/wire targets and circuit-wide repair. Closing it restores focus to the dock. Student presentation keeps manual Fault Lab controls hidden; ordinary basic-circuit simulation remains free. The phone dock and optional repair surfaces load on demand to preserve the existing bundle budget.

Implementation is in `packages/domain/src/core/{damageModel,damageStep,controlStep,protectionStep}.ts`, compiler/input/normalization and simulation adapters, `src/store/{circuitStore,circuitStore.faultActions,useSimulation,eventHistoryPersistence}.ts`, the shared Fault Lab damage/repair panel, phone dialog and related inspector/dialog controls. Full authored-exercise/result migration and every legacy entry path remain 1.5F.

## Completed local checks

| Check | Result on the final implementation |
| --- | --- |
| `bun run check` | Passed: all project typechecks, strict core check, 140-module domain boundary, repository lint, **130 Vitest files / 2,084 passes**, no expected failures |
| Focused damage coverage | 16 domain cases, 7 store lifecycle/access cases, 5 rendered form/repair cases and 2 hook lifecycle cases; included in the full suite |
| `bun run build` | Vite, Astro and postbuild passed |
| `bun run check:perf` | Passed: **249,424 B gzip initial JS / 250,000 B**, **26,165 B CSS / 30,000 B**, 7,966,946 B HTML across 193 pages; budgets unchanged |
| `check:links`, `check:seo`, `check:csp` | Passed: links across 193 HTML files, SEO across 191 pages, source/built CSP agreement |
| `bun run benchmark:mna` | Numerical assertions passed; measurements below retain the existing dense-performance limitation |
| `bun run test:domain-local` | **705 Bun/workerd parity cases passed**, including 30 damage/fuse steps |
| `bun run test:simulator` | **15 groups passed** against actual local Worker/D1/cookie sessions, including damage/API replay, malformed-state/access rejection and saved-damage persistence |
| Chromium phase suite | **63 cases passed in 12 files**, including all 4 new damage/repair cases and existing protection, controls, editing, wire, supply, workbench, challenge and relay cases |

Independent damage fixtures use a 230 V source, 52.9 Ω load and three 0.0175 Ω leads: `I = 230 / (52.9 + 0.0525)`. Current stress uses a 2 A threshold and 10 A²s budget; voltage stress uses actual `I × 52.9` V, a 200 V threshold and 6,000 V²s budget. Assertions cover crossing time, pre/post-event values, DC/RMS inputs, separate branches, protection/bypass, simultaneous component/wire IDs, export/import, malformed/obsolete state and basic/Pro equality. Store and rendered tests cover clearing versus replacement, remaining faults, undo, locks, denied membership and legacy reset behavior.

The browser cases import real drawings through the UI and run the actual Comlink worker. They verify persisted cable failure, stopped replacement preserving the exact injected break, zero load power until that break is cleared, repeated damage from an unchanged cause, measured device-voltage events, and breaker clear/reset/recovery without destruction. The 390 × 844 phone case edits and persists both damage fields, checks horizontal overflow, restores focus on close and confirms the Student-mode visibility boundary. Its screenshot was visually inspected. Hook tests use the real domain solver through a mocked transport; the separate browser tests establish actual Comlink behavior.

The MNA benchmark used 20 warmups and 100 samples per drawing:

| Drawing | Median | p95 |
| --- | --- | --- |
| Two series loads | 1.01 ms | 1.80 ms |
| 199 parallel loads | 49.17 ms | 60.72 ms |
| 255 series loads | 67.35 ms | 75.41 ms |
| 255 parallel loads | 70.55 ms | 82.29 ms |
| Isolated 230:12 V transformer | 0.76 ms | 1.47 ms |
| Two cascaded transformers | 0.77 ms | 1.63 ms |

These measure the numerical slice, not browser rendering, timed-damage throughput or production capacity. The existing 8 ms dense fallback target and 60 fps renderer target remain unmet. Initial JavaScript has 576 B of budget headroom; later changes must preserve the limit.

## Reproduction and evidence

Run `bun run verify:phase-1.5d3` from the repository root. It retains type/lint/unit/build/asset checks, numerical benchmarks, Bun/workerd parity, real local Worker/D1/cookie tests and Chromium scenarios. The complete command passed on the final implementation; subsequent repository edits record this acceptance in documentation.

Local evidence from this session:

- Full successful command: `.wrangler/phase15d3-acceptance.log`.
- Bun/workerd parity: `.wrangler/domain-tests-sY3ChO`.
- Worker/D1/cookie acceptance: `.wrangler/membership-tests-rde0MP`.
- Phone screenshot: `.wrangler/phase15d3-evidence/damage-settings-phone.png`.
- Reviewed commit paths: `.wrangler/phase15d3-evidence/changed-files.txt`.

Earlier execution restrictions and failed browser attempts remain recorded in append-only `progress.md` and ignored local logs. The final successful gate supersedes those blockers. Its phone screenshot and runtime results are accepted evidence, not test discovery or fixture generation alone.

## Remaining scope

The declared D.0–3 teaching-model slices close 1.5D locally. Three-phase work follows in **1.5E**, full lab/legacy result migration in **1.5F**, and state-driven effects in **1.6**. The wider `verify`, stress, exercise-migration and dense-rendering gates remain separate.

All development and tests used localhost and isolated local persistence. Root `AGENTS.md` still forbids the old live Cloudflare account; credentials, bindings and the disabled deploy command remain unchanged. Local acceptance is not deployment authorization.
