# Phase 1.5C.4 — Confirmed editing and circuit readiness

Date: 2026-10-03. Status: **complete locally; full 1.5C.4 acceptance gate passed**. This milestone connects the shared electrical contracts to supply editing, component replacement, placement guidance and Run. The application still uses the guarded legacy numerical engine; switching supported calculations to MNA is **1.5C.5**. All development and verification use localhost and local persistence under root `AGENTS.md`.

## Supply transactions and history

The toolbar, L/N inspector, independent-source inspector and phone controls use one staged dialog. Voltage, AC/DC and frequency fields do not mutate the drawing while typing. The preview identifies the document supply or named independent source, old/new profiles, source aliases, affected terminal groups, review findings and unchanged independent supplies. Cancel and Escape leave the document untouched and restore focus. Identical settings produce no history entry.

Apply commits one authorized, undoable transaction. IDs, routes, terminal connections, equipment ratings, injected faults and existing trip/damage state remain intact. Document changes preserve unrelated independent sources. L/N aliases can retain their terminals for explicitly previewed AC/DC changes; PE remains protective earth. An independent AC block cannot silently turn into a battery, and three-phase editing remains unavailable without explicit phase terminals and a supported model.

Previews refresh when the drawing changes. Apply checks the exact document revision, request identity, running/exercise locks and membership again before committing an asynchronous authorization result. Canceling a pending request cannot later apply it. Published simulation results are invalidated on document changes; old worker responses are checked against the captured inputs before publishing. File imports and account loads stop an active simulation before replacing the drawing.

The post-change notification includes Review and Undo. Its Undo applies only while both the current document and last history entry still identify that change. Later edits cannot be accidentally undone by an old notification. The notification expires after 12 seconds; the persistent Review controls always show findings for the current drawing. Sandbox undo/redo retains the source transaction coherently. Source/variant/design settings lock during running and active exercises; history navigation is conservatively locked in those contexts too. Supported switch press/release and on/off actions remain available.

## Capabilities and replacement

The palette, recent/recommended entries and command suggestions share `assessPlacement`. The selected document or independent supply supplies nominal guidance. The default view shows compatible options and keeps independent sources/converters discoverable; **Show all / fault exercise** exposes labeled incompatible/unassessed options. Membership and authored component restrictions remain separate. Existing imported or placed parts are retained and receive canvas and inspector findings.

The inspector separates source output, load nameplate, coil, winding, contact/protection and cable-tail fields. Unknown ratings have no fabricated defaults. Battery chemistry appears only on the battery and is explicitly a stored label without modeled discharge behavior. PE has no source controls. Changing the standards view does not change a saved supply. Demo swaps caused by mode/plug preferences respect configuration locks and retain drawings with changed supply, ratings, wire properties or faults.

Variant replacement previews unique mappings by terminal label, conductor type and electrical role. It never falls back to the saved port index. For example:

| Connection | MCB terminal | RCCB terminal |
|---|---|---|
| L-in | 1 | 1 |
| L-out | 2 | 3 |
| Additional RCCB poles | Absent | N-in and N-out remain unconnected |

Wire endpoints and port-targeted faults use that mapping. Missing/ambiguous terminals or invalid references block replacement. New nameplate/control/protection defaults replace old overrides; component identity, labels, grouping and injected faults survive. A tripped/damaged device requires the separate repair/reset operation before replacement. Replacing the device is not a cosmetic appearance change.

## Readiness and honest results

Toolbar Run, shortcuts, command actions, diagnostic Run and the existing Pro override use current shared readiness. The real domain simulation boundary attaches the same result, including through Comlink and local Hono. Contradictory ideal voltage constraints block calculation with source-linked findings.

| Drawing | Ordinary Run behavior |
|---|---|
| Empty, missing supply or invalid constraints | Blocked with an accessible explanation and persistent Review |
| No load or an open return/switch | Requires explicit **Run diagnostic** |
| Partly connected circuit | Identified as partial; findings remain available |
| Finite-impedance supply short | Identified as a short, not hidden as no-load |
| Incompatible/unknown ratings or unsupported models | Explicit findings and existing numerical coverage guards |

Readiness, calculation, operation and standards assessment remain distinct. Empty/no-source direct calls cannot report fault-clearing success. A no-load drawing may have no active faults, but its operation/assessment remain unassessed and it cannot enter ordinary Run. The status bar no longer equates an active component with “Healthy” or every warning with “Open Circuit.”

Component properties label the existing runtime's rail/current/power estimates and show unavailable values when absent. They do not claim voltage measured across a terminal pair. The legacy waveform/energy panel is withheld because its generated waveforms, noise, power factor, temperature and accumulated energy are not measurements. A live conductor can carry zero current. Correct loaded branch measurements and supported MNA runtime results still belong to 1.5C.5.

Grading independently compares submitted supply settings with the authored exercise. Diagnosis retains the original source inventory and independent profiles; construction exercises can add sources at the authored document supply. Changing magnitude, frequency, kind or an existing source cannot earn repair success through imports/direct calls or accepted local-server submissions. Full lab result migration remains 1.5F.

Electrical contract version remains **1**, numerical MNA engine remains **`mna-linear-2`**, and the shared model version is **`1.5c.4.1`**. The unchanged capability catalogue retains **`1.5c.3.1`**. Circuit-file schemas remain 1/2.

## Local acceptance

Reproducible command: **`bun run verify:phase-1.5c4`**. The complete command passed on 2026-10-03, with no gate or electrical-tolerance changes.

| Check | Result |
|---|---|
| Types, domain boundary and lint | All project typechecks passed, including strict core indexing; 122 domain modules and 697 linted files |
| Unit tests | 123 files; **1,921 passed plus 5 owned expected failures** |
| Build and unchanged asset/link/SEO/CSP budgets | Vite/Astro/postbuild passed; initial JS **249,775 B gzip / 250,000 B**, CSS **26,165 B / 30,000 B**; links across 193 HTML files, SEO on 191 pages and CSP checks passed |
| MNA benchmark | Two series loads **0.74 ms median / 1.79 ms p95**; 400–512 driven unknowns **47.07–65.75 ms median**; the known dense-solver target remains open |
| Bun / local Hono-workerd parity | **569 cases passed**, including supply previews, variant mappings and shared readiness through `simulate()` |
| Real local Worker/D1/cookie/browser simulator checks | **9 groups passed**, including rejection of changed-supply repair submissions and paid/guest browser continuity |
| Focused local Chromium | **42 passed**, including all 9 new electrical-editing cases |

The isolated transformer measured **0.74 ms median / 1.66 ms p95** and two cascaded transformers **0.70 ms / 1.06 ms**. Dense parallel/series p95 measurements were **53.97–75.07 ms**; these do not meet the existing 8 ms fallback target. The gate records numerical-slice timings without claiming full runtime or rendering performance. Initial JavaScript has only **225 B** of remaining budget; subsequent runtime integration must retain the existing limit.

Local evidence: `.wrangler/phase-1.5c4-gate-20261003-continuation.log`, `.wrangler/domain-tests-PyPLUR/` and `.wrangler/membership-tests-nGRVfy/`. Formatting and import organization also passed for all 65 changed code/configuration files. Evidence directories remain ignored.

The built application was also checked at `http://127.0.0.1:8878/app/` in 1440 × 1000 desktop and 390 × 844 phone viewports. Supply previews and readiness dialogs were visually inspected; phone Apply opened the updated incompatible-supply findings. Four built-output screenshots and a zero-page-error result are in `.wrangler/phase-1.5c4-visual-evidence/`. The static preview was stopped after inspection.

Browser coverage includes Cancel/Escape/focus, Apply/Undo/Redo/export/reload, AC/DC and independent sources, preview refresh, guarded notice Undo, all readiness states, compatibility/imports, MCB-to-RCCB wire/fault mapping, running/exercise locks, phone controls and reordered responses from a real Comlink worker. The latter delivers the newer DC result first and proves the older AC response cannot overwrite it. Existing workbench, Pro inspector, construction challenge and guest relay suites run in the same gate. They cover actual placement/wiring/grading, reload/exit, diagnostic no-load Run, independent standard/plug selection, guest fault injection and withheld analytics. Membership checks use the existing isolated real Worker/D1/session harness, including a changed-supply submission that cannot complete an otherwise repaired attempt.

The initial build exceeded the existing 250,000 B gzip JavaScript budget. Inspector properties/connections/simulation tabs and the command palette now load only when opened. Budgets and electrical tolerances were not raised. The known dense-MNA and dense-rendering performance limits remain open; this gate does not claim the wider `verify`, stress matrix, 60 fps target, full Phase 1 or deployment acceptance.

## Next step

**1.5C.5** integrates supported MNA results through the real application domain, Comlink and local Hono paths. Unsupported models remain guarded until their dedicated gates pass. Timed protection/damage, three-phase models and complete existing-lab integration remain 1.5D–F. No remote tests, deployment, account/credential operations or Cloudflare resource changes were performed.
