# Phase 1.11 — Fault Lab redesign and Diagnosis retirement

Status: complete locally on 2026-10-14 following explicit user design approval; aggregate functional acceptance and focused recovery. Historical performance exceptions remain open.

The standalone design and retirement inventory in `docs/plans/FAULT_LAB_REDESIGN_PLAN.md` were approved by “accepted and continue implementing.” Fault Lab replacement passed scoped local acceptance before the direct Diagnosis runtime list was removed. Browser records, D1 schema/migrations, stored capabilities, historical evidence and conditional generator utilities are preserved. Changes are local and uncommitted; no push, deployment, credential or live-account operation occurred.

## Baseline

Before deletion, the full registered suite passed **2,115 / 2,115**, exit 0: `bun run test --reporter=json --outputFile=.wrangler/phase111-unit-baseline.json`, with raw output `.wrangler/phase111-unit-baseline.log`. The final full registered suite passed **2,004 / 2,004**, zero failures or skips, exit 0: `.wrangler/phase111-unit-complete.json` and `.wrangler/phase111-unit-complete.log`.

## Electrical boundary

Capture only a fresh accepted electrical result matching `circuitRevision`. Protection and damage timestamps come from engine events; final operating points are presented as a causal walkthrough. Applying, clearing, resetting, operating and replacing are edits; playback is presentation only.

`faultLabEvidence.ts` deep-clones accepted scalar electrical readings, named source branches, protection, damage and actual circuit events into a detached display snapshot. The display store keeps bounded target captures and merges events from the current run; a new run resets event timing. Stop may clear live telemetry without deleting the captured response. Electrical edits invalidate captures; loading another document resets the investigation. Unassessed fault models suppress readings, events and animated outcome claims. Phasor-only results do not acquire invented scalar playback.

The modeless workspace uses real component, wire and named-terminal targets; the 14-entry registry library explains applicability and assessment. Cancel is read-only, and Apply is one guarded undoable fault edit. Explain/Readings/Repair, target photos or an explicit no-photo state, active causes, history/Undo, original restoration, comparison and leaving are implemented. The original snapshot includes editor groups and is restored through the ordinary guarded undo path. Comparison is available only for two assessed captured responses. Read-only and membership restrictions remain in the existing mutation/service boundary.

Cause clear, breaker reset to OFF, explicit ON operation and damaged-item replacement retain distinct controls and effects. Console severity filters and message clearing leave faults, damage and event history untouched. Applied-fault warnings and target-bearing diagnostics provide navigation to actual current components/wires; removed targets disable navigation. The modeless Fault Lab window renders below the Console, while ordinary modal dialogs retain their higher layer.

`FaultLabStage.tsx` provides labeled explanatory cutaways and a saved-topology overview. Conductor gaps, declared damage budgets, accepted protection contact state and lighting halos use captured outcomes. The existing canvas short, arc and smooth-DC fault effects now use badges, avoiding flames or assessed waveform claims. The numerical simulation, fault, protection and damage engine is not replaced.

## Local acceptance

Acceptance is assembled from the full and focused stages below, with failure recovery retained. It is not one uninterrupted execution of the phase runner. The new `bun run verify:phase-1.11` runner lists the complete local functional stages and supports the existing `--only` / `--from` workflow. Earlier phase runners and their audits are historical and may reference retired product checks.

Baseline full unit run: **2,115 / 2,115 passed**, exit 0. Direct Diagnosis test retirement is **121 cases**:

| File | Registered cases |
| --- | ---: |
| `src/store/diagnosisPersistence.test.ts` | 26 |
| `src/store/diagnosisStore.test.ts` | 27 |
| `packages/domain/src/challenges/diagnosis/assessment.test.ts` | 5 |
| `packages/domain/src/challenges/diagnosis/evaluator.test.ts` | 26 |
| `packages/domain/src/challenges/diagnosis/scenario.test.ts` | 19 |
| `packages/domain/src/challenges/diagnosis/scoring.test.ts` | 18 |

### Exact unit reconciliation

| Change | Baseline | Final | Difference |
| --- | ---: | ---: | ---: |
| Six direct Diagnosis test files above | 121 | 0 | −121 |
| `src/store/electricalEditing.test.ts` | 23 | 20 | −3 |
| `src/store/supplyProfiles.test.ts` | 8 | 7 | −1 |
| `src/store/useSimulation.test.ts` | 12 | 11 | −1 |
| `packages/access/src/circuit.test.ts` | 4 | 3 | −1 |
| `InspectorFaultLabView.test.tsx` replacement | 5 | 12 | +7 |
| `faultLabEvidence.test.ts` | 0 | 5 | +5 |
| `LogPanel.test.tsx` | 0 | 3 | +3 |
| `FaultFxLayer.test.tsx` | 7 | 8 | +1 |

All other registered file counts are unchanged. The six shared removed cases assert retired exercise locks, exercise authorization classification or hidden-answer narration. Ordinary electrical edit, supply, simulation and access checks remain. Equivalently: **2,115 − 127 retired cases − 5 superseded Fault Lab cases + 21 replacement/additional cases = 2,004**. Counts come from both complete runner JSON files, not a selected test run.

## Replacement acceptance before retirement

The replacement passed 19 focused unit cases (`.wrangler/phase111-fault-unit.log`), full types (`.wrangler/phase111-types.log`), lint (`.wrangler/phase111-lint-before-retirement.log`), nine source-browser cases across Chrome/phone Chrome/tablet Safari (`.wrangler/phase111-fault-browser-final.log`), and two built-browser cases at 1280/390 px (`.wrangler/phase111-fault-built-accepted.log`). Build exited 0 (`.wrangler/phase111-build-before-retirement-final.log`). Actual screenshots were reviewed. Earlier failures are retained: ambiguous test selector, readiness-dialog scheduling, cleared telemetry after Stop, disappearing transient events, overlapping test-fixture geometry and correctly blocked premium guest fixtures. Assertions were repaired or implementation fixed; electrical checks were retained.

After this scoped local replacement acceptance, the 19 approved direct Diagnosis files were retired. The exact patch, list and original-file backups are local at `.wrangler/phase111-retirement.patch`, `.wrangler/phase111-retirement-files.json` and `.wrangler/phase111-retired-backup/`. No schema, migration, stored record or grant was deleted. Dependency review narrowed retirement by extracting the unchanged healthy generator predicate into `generator/assessmentEvidence.ts` and preserving historical share-code metadata in `challenges/replayIdentity.ts`. Conditional generator cleanup remains excluded.

## Retirement and preservation

The approved direct list is the panel; Diagnosis store and persistence files/tests; API and access module; two Diagnosis browser suites; diagnosis stress script; and all nine files under `packages/domain/src/challenges/diagnosis/`. Integration removal covers imports/exports, route mounting, menu/welcome/toolbar/help/marketing entries, active exercise state, authorization requests, hidden readiness/narration, canvas concealment, edit locks and recovery-copy exit hooks. The replacement is Fault Lab on the normal saved drawing; there is no automatic Diagnosis resume.

Kept: ordinary circuit schema/serialization, fault registry/applicability/actions, solver/control/protection/damage contracts, generator and fault verification utilities, normal guides/instruments/analytics/exports, membership/admin functionality, `advanced_diagnostics` stored grants, `diagnosis_attempts`, all migration files, browser keys `electrasim:diagnosis:active:v1` and `electrasim:diagnosis:stats:v1`, historical design/ADR/audit evidence and deferred Challenge plans. Schema/migrations and local-only Cloudflare configuration have no diff in this phase. Preservation browser cases seed existing records, retain a separately moved/autosaved ordinary drawing across reload, and assert those records remain byte-for-byte unchanged. Real local D1 cases insert/read historical attempt rows and confirm retired endpoints are absent.

Twelve Diagnosis-specific grading parity fixtures were replaced by twelve ordinary shared electrical lifecycle fixtures in `packages/domain/src/simulation/faultLabFixtures.ts`. This retains **842 exact Bun/workerd cases** while changing the corpus explicitly: fault application/clear, named terminal, protection state and irreversible cable/device damage remain runtime checks. An unchanged total does not imply the retired grading corpus still runs.

## Consolidated local evidence

| Stage | Result | Evidence |
| --- | --- | --- |
| Full types, including E2E/Astro/access/domain/core/service harness | Passed, domain boundary 140 modules | `.wrangler/phase111-types-complete.log` |
| Repository lint | Passed, 785 files, renewed after final CSS/test edits | `.wrangler/phase111-lint-final.log` |
| Full registered unit suite | 2,004 passed, zero failures/skips | `.wrangler/phase111-unit-complete.json`, `.log` |
| Graph implementation tests | 5 passed | `.wrangler/phase111-graph-tests.log` |
| Complete build | Passed, including final Console layering | `.wrangler/phase111-build-console-recovery.log` |
| Asset/link/SEO/CSP stage selection | Passed on final build; 194 HTML files, 191 SEO pages | `.wrangler/phase111-static-console-recovery.log` |
| Actual Bun/workerd domain parity | 842 passed | `.wrangler/phase111-domain-parity.log`, `.wrangler/domain-tests-L9m32s/` |
| Actual local Worker/D1/cookie acceptance | 34 groups passed, including guest offline/clear and paid save/revoke/export/basic-copy browser paths | `.wrangler/phase111-membership-accepted.log`, `.wrangler/membership-tests-4JV4vK/` |
| Source browsers: Fault Lab/retirement/damage/consumer/workbench | 66 passed across desktop Chrome, phone Chrome and tablet Safari | `.wrangler/phase111-browser-accepted.log` |
| Source browsers: Challenge deferral/editing/Matter/Open Drafting Table | 72 passed across the same three projects | `.wrangler/phase111-shared-browser.log` |
| Built delivery: Fault Lab and accepted simulator shell | 8 passed on final build, including actual Console target clicks at 1280/390 px | `.wrangler/phase111-built-console-recovery.log` |
| Final Console interaction / retirement recovery | 15 passed across all three source projects; native desktop pointer clicks | `.wrangler/phase111-console-recovery.log` |
| Final E2E typecheck after added built interaction | Passed | `.wrangler/phase111-e2e-types-recovery.log` |
| New conductor decorative-motion measurement | 91 updates over four seconds, 2 bodies, Engine.update p95 0.9 ms, zero bodies after pause | `.wrangler/phase111-visual-budget.json`, `.log` |

The source scopes contain **138 unique browser cases**. Final Console recovery repeats affected cases with stronger real pointer-navigation assertions; it is not counted as additional unique coverage. Built delivery uses actual import, catalogue, reviewed Apply, fresh diagnostic capture, Stop/replay, separate clear, stale response and responsive geometry. Screenshots `.wrangler/phase111-{chromium,mobile-chrome,tablet-safari}.png` and `.wrangler/phase111-built-{1280,390}.png` were visually reviewed. The tool window remains above the shelf and within the viewport; phone content scrolls within the sheet.

## Fault application review and screenshot follow-up

After the phase closure, a screenshot review found that the earlier Fault Lab images had **Compare previous** selected. Those images showed the healthy captured revision and do not document the applied-fault appearance. The first follow-up added registry-wide captures, but the user correctly pointed out that generic conductor/device sketches looked unrelated to the real selected component. The application view has since been redrawn around the selected target.

`FaultTargetApplicationDiagram.tsx` now renders the same `ComponentSymbol` used by the canvas and the exact terminal anchors and labels in `COMPONENT_DEFS`. Component-target opens identify the affected terminal; short/earth and leakage paths use the target's actual L/N/PE pins; reverse polarity names the real L/N connection swap. Protection faults show the selected device and open contacts; the bypass route passes around its symbol. Wire targets use the saved wire route, endpoint device symbols and connected port labels. The canvas contact glyph also shows forced-open/bypassed contacts open while preserving the handle state. Arc, switched-neutral, live-to-earth and smooth-DC still show the actual target with precise missing-model labels; no waveform or response is fabricated.

`e2e/fault-lab-application-review.spec.ts` exercises all **14 registered fault types** through reviewed Apply, both drawing views and individual Clear in the actual browser workspace. The fixture now has a protected three-pin outlet with connected L/N/PE and a real downstream resistive load; earth faults no longer target an unconnected source PE pin. Every case asserts the exact canonical fault type/target, the same target in the compiled electrical graph, the actual target preview and the main canvas marker. Clear removes the cause and visible markers and restores the starting document. These captures precede a new simulation and document applied edits, not assessed electrical responses.

The refreshed local gallery at `.wrangler/fault-lab-application/index.html` contains **42 screenshots**: 14 review, 14 applied and 14 cleared. All three contact sheets and selected full-size applied images were visually reviewed. The applied contact sheet is `.wrangler/fault-lab-application/contact-sheet-applied.jpg`.

### Apply/Clear verification and remaining presentation fixes

A follow-up live review found real defects beyond the panel preview:

- `collectFaultFx` read only legacy component/wire mirrors. Canonical terminal causes and some wire fault types could be saved without a visible canvas marker. It now reads normalized active faults, deduplicates mirrors and places terminal markers and local cuts on the exact pin. Resolved causes disappear.
- The stage returned early for an applied fault, ignoring the Circuit button and changing React hook order on Apply/Clear. The hook is now unconditional; Circuit view renders the actual component symbols, pin positions and sampled saved wire paths with fault overlays.
- SVG entrance animation overrode placement transforms and moved chips/earth markers to the canvas origin. Placement and animation now use separate groups. Every source case and both built widths assert the rendered chip remains at its declared target.
- Unassessed switched-neutral causes no longer fabricate a neutral conductor by recoloring an arbitrary live pair. Protection bypass uses the device model's actual contact poles; canonical protection causes keep canvas contacts open even when another legacy mirror is present. The target diagram uses shared port geometry for rotated pins and lead directions.

| Follow-up check | Result | Evidence |
| --- | --- | --- |
| Target preview / Inspector / canvas model / SVG layer / component / canvas units | **57 passed**, six files | `.wrangler/phase111-fault-apply-clear-unit-final.log` |
| Full typecheck and final E2E typecheck | Passed | `.wrangler/phase111-fault-apply-clear-typecheck-final.log`, `.wrangler/phase111-fault-apply-clear-e2e-types-final.log` |
| Repository lint | Passed, 789 files | `.wrangler/phase111-fault-apply-clear-lint-final.log` |
| Source browser, all registered Apply/Clear flows and chip placement | **14/14 types**, one registry-wide Chromium test | `.wrangler/phase111-fault-apply-clear-source-final.log` |
| Rebuilt browser at 1280/390 px | **2 passed**, Apply/views/placement/fresh capture/Clear | `.wrangler/phase111-fault-apply-clear-built-final.log` |
| Complete build and delivery budgets | Passed; initial JS **255,327 B gzip**, CSS **27,986 B gzip** | `.wrangler/phase111-fault-apply-clear-build-final.log`, `.wrangler/phase111-fault-apply-clear-budget-final.log` |

The **2,004 / 2,004** full-suite figure above is the Phase 1.11 closure run before this follow-up and was not rerun. The latest scope has focused functional and delivery evidence; it does not renew broad numerical/performance acceptance. The electrical solver is unchanged. Arc/DC waveforms and missing neutral/leakage models remain explicitly unassessed.

## Failure recovery and practical limits

- The initial post-retirement consolidated check exposed an accidentally removed ordinary `setTemplatesOpen` action. It was restored; the subsequent full check passed all 1,997 then-registered units and ordinary guide paths. Final additional coverage brings the complete suite to 2,004.
- Under a heavily loaded full unit run, the external-modal pause assertion exceeded Testing Library's default one-second polling deadline. The same focused case passed. The assertion now has a five-second polling allowance within the existing test timeout; playback suspension and unchanged circuit assertions are retained, and the full final suite passed.
- Legacy UI selectors, readiness scheduling, transient event loss and Stop clearing live results were repaired in the replacement; actual captured event retention and restarted-run timing have unit coverage. The independent guest/basic and paid fixtures remain correctly authorized.
- Final desktop pointer testing found the wide Fault Lab panel covered a Console target button. The modeless Fault Lab is now below the independent Console. Recovery uses native clicks and retains target selection assertions; no force click masks the overlap.
- A first standalone visual measurement found no running local source server and failed with connection refused. It was rerun against the local browser server. The recorded 8.99 maximum is the internal body coordinate immediately after Engine.update, before the application clamp; SVG placement is clamped to 0–8 units and velocity is reset at the bound. This measurement covers the new two-body engine update only, not overall React/render/frame or solver latency.

Matter creation is lazy; fixed integration step is 1/60 s, update scheduling at most 30 Hz. Position/velocity bounds and disposal are explicit. Playback/motion stop for pause, stale or blocked response, hidden page, reduced motion, changed target/document and open modal; failed loading leaves the static cutaway. Existing shared visual-effects browser tests cover reduced motion and bounded state consumers. Measurements were obtained locally under concurrent work, not from production hardware.

Final accepted asset measurements are initial JS **254,563 B gzip / 300,000 B budget** and CSS **27,986 B / 30,000 B**. These are delivery budgets. Historical solver p95 **56.65 ms vs 8 ms**, generator timing limits and dense **60 fps** remain open; no numerical performance rerun or claim of a full green Phase 1.9 gate is made. The local D1 burst HTTP p95 values were write **8,531.18 ms** and read **24,854.03 ms**, including host auth/queue/network; these are not Worker-to-D1 latency or production performance results.

## Knowledge graph and publication

Curated feature/check mappings and actual scoped review are updated separately from generated index freshness. The reviewed records include `fault-lab-redesign-proposal`, `diagnosis-retirement-proposal`, `fault-lab-captured-presentation`, `fault-lab-application-preview`, `phone-fault-lab-single-surface` and `fault-edit-fresh-runtime-result`. Stable IDs retain their earlier names for navigation; current summaries distinguish approved completion from the historical proposal. Tests have explicit edges to the display adapter/store, actual tool/CSS/Console, retired route boundary and new parity fixture.

The overall `graph:check` remains nonzero for historical unreviewed/changed records; those records are not automatically rebaselined. A current fingerprint for this reviewed scope is evidence freshness, not test proof. Phase 1.11 closes locally within the approved scope; broader Phase 1.9 performance acceptance remains unchanged. No local acceptance authorizes GitHub publication, deployment, old-account access or stored-data deletion.
