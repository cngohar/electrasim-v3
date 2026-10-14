> **Current status (2026-10-14):** The user approved the direct list and implementation. All 19 direct files and their runtime integration were retired after scoped replacement acceptance. Aggregate local functional checks pass; browser/D1 records, migrations and stored grants remain. Shared generator evidence and replay metadata were extracted to preserve existing dependencies. Conditional cleanup remains excluded. [The audit](../../audits/phase-1-fault-lab-redesign.md) records exact inventory, counts and recovery.

# Diagnosis Lab retirement · concrete review scope

**Historical review inventory, now applied within the approved scope. No record or schema deletion was performed.**

The user directed that the Diagnosis Lab be removed and the Fault Lab redesigned, with a complete reviewable design before implementation. This file separates code dedicated to the current Diagnosis product from shared simulator code and from further cleanup candidates. The latter groups need a dependency review before any deletion.

## 1. Direct Diagnosis-owned code proposed for retirement

These files implement the separate exercise product: generated hidden-cause sessions, scoring, answer/recovery assessment, server-owned progress, persistence, or their product tests. Their removal is proposed only after the user approves the design package and the replacement Fault Lab passes local acceptance.

| Path | Current responsibility |
| --- | --- |
| `src/ui/components/DiagnosisPanel.tsx` | Diagnosis exercise entry, symptoms, hints, answers, repair and session UI |
| `src/store/diagnosisStore.ts` | Session lifecycle, generated scenario, submit/hint/checkpoint/abandon and resume orchestration |
| `src/store/diagnosisStore.test.ts` | Dedicated store/session behavior tests |
| `src/store/diagnosisPersistence.ts` | Active attempt and aggregate local statistics persistence |
| `src/store/diagnosisPersistence.test.ts` | Dedicated browser persistence validation |
| `src/api/diagnosis.ts` | Server routes for Diagnosis attempts and grading/progress |
| `packages/access/src/diagnosis.ts` | Diagnosis-specific access requirements |
| `packages/domain/src/challenges/diagnosis/scenario.ts` and `scenario.test.ts` | Generate and inject authored Diagnosis scenarios |
| `packages/domain/src/challenges/diagnosis/assessment.ts`, `assessmentFixtures.ts` and `assessment.test.ts` | Authored circuit/recovery assessment fixtures and rules |
| `packages/domain/src/challenges/diagnosis/evaluator.ts` and `evaluator.test.ts` | Diagnosis answer + actual repair verdict evaluation |
| `packages/domain/src/challenges/diagnosis/scoring.ts` and `scoring.test.ts` | Exercise scoring and progress outcomes |
| `e2e/diagnosis-lab.spec.ts` | User-facing Diagnosis launch, session, hint, answer and repair flows |
| `e2e/diagnosis-assessment.spec.ts` | Authored assessment and recovery behavior |
| `scripts/stress-diagnosis.ts` | Diagnosis scenario/evaluator stress corpus |

The canonical [ADR 0004](../../decisions/0004-diagnosis-lab.md), its audit and historical acceptance evidence should remain as history. Edit their status/context only where a current-document clarification is needed; do not rewrite their old measurements as if the lab had never existed.

## 2. Required integration edits, not whole-file deletion

These files also own simulator features. Remove only the Diagnosis-specific branches and wiring after confirming their remaining callers. Keep all unrelated simulation, UI, access, guide and fault behavior.

| Path | Review the Diagnosis-owned part | Preserve |
| --- | --- | --- |
| `src/worker.ts` | Remove the `diagnosisApi` import and `app.route('/api', diagnosisApi)` mount | Hono worker, circuits, membership, auth and other routes |
| `src/ui/Editor.tsx` | Remove lazy `DiagnosisPanel`, `diagnosisOpen`, `data-learning-open`'s Diagnosis branch and the `SurfacePresence` mount | Editor shell, guide lifecycle, Console, Inspector and normal canvas |
| `src/store/uiStore.ts`, `src/store/uiStore.types.ts` | Remove `diagnosisOpen`, `diagnosisActive`, `setDiagnosisOpen`, `setDiagnosisActive` and Diagnosis-only close/reset behavior | Shared store, Fault Lab flag, run/readiness, logs and fault actions |
| `src/store/useSimulation.ts` | Remove `diagnosing`/`hideNarration` branches, answer-concealing fault narration, and Diagnosis-only trip hint | Simulation result processing, fault alerts, normal narration, fresh result guards |
| `src/ui/components/Toolbar.tsx` | Remove `diagnosisActive`, `readinessLabel(..., diagnosisActive)`, Diagnosis launch action and `setDiagnosisOpen(false)` cleanup | Run, Fault Lab, tools, phone clearance, membership and all other controls |
| `src/ui/components/MenuOverlay.tsx`, `WelcomeModal.tsx` | Remove the `Diagnosis Lab` menu/learning entries and `setDiagnosisOpen(true)` callbacks | Other learning, guide, file, settings and help entries |
| `src/store/simulatorAccess.ts`, `src/api/circuits.ts` | Audit/remove the `exercise` state, second `/simulator/authorize` request and `diagnosis` request-body field if no caller remains | Circuit authorization, component/fault requirements and server-side predicates |
| `packages/access/src/circuit.ts`, `packages/access/src/index.ts` | Audit/remove `circuitRequirements(circuit, diagnosis)`, `requirementsForContent(...diagnosis)` and the Diagnosis-only `advanced_diagnostics` requirement branch | `advanced_diagnostics` stored capability/grant while account migration policy is undecided; `advanced_faults` and component capability rules |
| `src/ui/components/SimulatorAccessBanner.tsx` | Remove only dynamic `useDiagnosisStore.getState().exit()` on recovery-copy flow if no exercise store remains | Save original backup, basic-copy, export and access error handling |
| `src/ui/components/CircuitReadinessDetails.tsx`, `StatusPill.tsx`, `SubHeaderBar.tsx`, `src/ui/components/Toolbar.tsx` | Remove `diagnosisActive` inputs to `readinessLabel` and the Diagnosis-specific sentence | Readiness output, warnings and ordinary status |
| `src/ui/CircuitCanvas.tsx` | Remove only the `!diagnosisActive` gate on `FaultFxLayer` if stale answer-concealment is no longer required | `physicsEffects`, interface-motion and fault visual behavior |
| `src/store/electricalEditing.ts` and its tests | Remove `diagnosisActive` / `useSimulatorAccess.exercise` editing locks after no exercise caller remains | Running-state locks, fault edit confirmations, circuit revision and undo contracts |
| `packages/domain/src/core/readinessPresentation.ts` | Remove its Diagnosis-only label parameter/branch after all callers switch | Every non-Diagnosis readiness label and validation outcome |

The implementation must use `bun run graph:impact` and direct import/call-site reads before changing each shared file. A filename or module relationship is not proof that all code in the file belongs to Diagnosis. The rows above name proposed symbols and branches for user review; call-site evidence may narrow the actual patch further.

## 3. Shared simulator behavior to retain

Do **not** remove or simplify these systems as a side effect of Diagnosis retirement:

- `packages/domain/src/faults.ts`, `faultApplicability.ts`, fault topology and fault propagation, supported fault IDs, fault target rules, or shared `core` fault handling.
- Circuit fault state, manual Fault Lab inject/clear, `src/store/circuitStore.faultActions.ts`, fresh-result invalidation, runtime protection behavior, latched breaker reset, cable/device damage and replacement behavior.
- Current production Inspector integration (`InspectorFaultLabView`, `FaultRepairPanel`), history/Undo, Console/log ownership, readiness/validation and electrical readings.
- Ordinary simulation, authored circuit templates, guides, saved circuits, component/wire editing, variants, user membership and the original-circuit backup/export/basic-copy path.
- `FaultFxLayer`, `MatterLayer` and their shared renderer/effect boundary. New Matter.js animation stays visual-only.

Diagnosis scenario helpers may import these shared systems. Remove only the exercise layer; retain the common behavior and tests proving it works.

## 4. Data and compatibility preservation

The local Diagnosis persistence code uses these browser keys:

- `electrasim:diagnosis:active:v1`
- `electrasim:diagnosis:stats:v1`

Retirement should stop reading and auto-resuming the active session. It must not clear either key, browser storage generally, or any ordinary circuit record. Avoid an automatic migration that overwrites a normal drawing with the saved exercise circuit. If a future data export or user-visible recovery is required, review that as a separate feature before removing record support.

The local schema declares `diagnosis_attempts` in `packages/db/circuit-schema.ts`; migration `migrations/0005_circuit_persistence.sql` creates it. Keep that schema declaration, migration and generated migration snapshots initially. Do not add a `DROP TABLE`, delete rows, or run a destructive migration. They are historical compatibility/data-preservation artifacts, especially while a new Cloudflare account has not been configured.

The capability name `advanced_diagnostics` is also exposed to administrators in `src/admin/Editor.tsx` and exists in the access capability list. Keep persisted entitlement/configuration data until the account and migration policy is reviewed. Removing the Diagnosis UI does not authorize deleting stored benefit grants or changing unrelated admin/member data.

## 5. Conditional unused-code candidates — not included in the first removal list

After Challenge Mode runtime was removed, Diagnosis may be the only remaining production consumer of some exercise-generation modules. The following code is a **separate cleanup candidate**, not approved as part of this proposal:

- `packages/domain/src/challenges/generator/**` (recipes, seeded generation, topology, layout, validation and their tests)
- `packages/domain/src/challenges/difficulty/profiles.ts` and its test
- `packages/domain/src/challenges/faults/**` and its tests
- `packages/domain/src/challenges/types.ts`, `format.ts`, `share.ts`, `index.ts` and any challenge generation/stress scripts or fixtures

These names cover historical Challenge and Diagnosis functionality, not the shared simulator fault model. Before deleting any of them, enumerate active imports, tests, exported package API, parity fixtures and preserved future Challenge plans; list exact functions/files and ask the user to review that list. Do not keep dead runtime code solely because it may be reused later, and do not delete it solely because it is currently unused. The user review decides the scope.

## 6. Documentation to retain or update

- Retain `docs/decisions/0004-diagnosis-lab.md` and `docs/audits/phase-1-diagnosis-integration.md` as historical decisions/results.
- Update current product/help/API documentation so it no longer advertises Diagnosis as an available lab after actual retirement. Keep dated phase evidence truthful.
- Update `docs/plans/SIMULATOR_BEHAVIOR_PLAN.md` with an explicit user-directed retirement note while preserving the old requirements and acceptance history.
- Keep Challenge Mode plans and the Phase 1.10 challenge-retirement audit. Diagnosis retirement does not authorize deleting Challenge plans.
- Update `docs/code-graph.json` to distinguish the historical Diagnosis evidence from current Fault Lab code and record only findings actually verified.

## 7. Validation expected after approval

Before deleting code, record the baseline registered unit-test total and count the cases in each exact test file proposed for retirement. Final evidence must reconcile **baseline − removed Diagnosis cases + new Fault Lab cases = final count**, with the actual runner's count and command. Do not expect the total to stay unchanged if exercise-specific tests are deliberately removed. Preserve or replace shared fault, damage, access, editing and readiness tests.

After scoped code changes, verify source and built desktop/phone flows, Console selection and clear independence, fault applicability, fresh result behavior, clear/reset/replace separation, Undo, regular circuit save/load and local Worker/D1 routes affected by removal. Broaden simulation checks when shared domain, access or worker behavior changes. Keep test outcomes separate from browser visuals and historical performance status.

All work remains local. The existing Cloudflare account, credentials and live `electrasim.com` environment remain out of scope.
