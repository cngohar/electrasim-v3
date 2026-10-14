# Open Drafting Table production implementation

The user accepted the complete design and authorised production implementation on
2026-10-13, after explicitly retiring Challenge Mode runtime while retaining its
plans/docs. That prerequisite is [complete locally](challenge-mode-retirement.md).
This audit covers the separate production redesign, completed against the existing
Astro marketing / React simulator boundary. No framework rewrite is included.

Status on 2026-10-14: production migration complete locally within the functional
UI scope. The reviewed four-file cleanup is explicitly approved and applied;
post-deletion verification passed and Phase 1.10 is complete locally. Long-run
process-exit and historical performance boundaries are explicit below. All work and tests use local files and localhost services.

## Implemented behavior

The darker muted blue/slate theme, centered command bar, full-width component
shelf and full catalogue share the accepted visual system. All 116 component
types use an explicit registry of 60 physical artwork families. Catalogue,
placement preview and actual canvas bodies use the same images; the separate
schematic badge avoids overlap. Canonical saved terminals, wires, rotation and
hit targets are preserved. Existing saved icon/symbol preferences remain valid;
new settings default to Both.

The desktop-right / phone-bottom Inspector has Properties, Readings and Configure.
Properties retains the raster reference photo, enlargement and manual operating
controls. Readings uses current accepted simulation evidence; unsupported models
remain unassessed. Configure stages simple component/wire drafts, Reset, Apply
and atomic Undo. Source and variant changes still require the authoritative
ratings/terminal review, access guard and connected-wire preview. Detailed models
and installation settings remain separate windows. Optional wire labels are
validated display metadata and round-trip with the portable circuit.

Console remains reachable with severity counts and visible All / Errors /
Warnings / Info selections. Clearing logs leaves faults, damage and event history
unchanged. Context actions have borderless hover rows and direct Align, Distribute
and Rotate actions, with existing batched history and running/read-only locks.

Shared windows enter in 180 ms and exit in 160 ms. Closed windows retain their
visible title/content through exit, become inert and leave the accessible tree.
Reopening cancels removal. Nested windows own Escape/focus/scroll in stack order.
Manual and OS reduced motion suppress interface/effect animation. Fault Lab is a
modeless tool window: canvas picking stays available, and Inspect explicitly
returns to Properties. Its tool-menu entry dismisses the menu; keyboard export
remains available in modeless controls.

Lamp illumination is a local warm emission halo with a neutral device housing;
it requires fresh accepted load response. It is not an electrical indication for
unsupported or stale results. Numerical, grading, ownership and repair contracts
remain authoritative.

## Complete active-surface migration

This is the production counterpart of the accepted 51-screen inventory. Several
screen IDs share a production window. Shared foundations style their existing
controls rather than substituting illustrative prototype data.

| Active workflow | Production migration |
| --- | --- |
| Canvas, placement, context actions | Editor, Toolbar, CanvasToolbar, Palette, ContextMenu/InlineArrange, native artwork registry and real placement overlay |
| Files/import/export/account/library | Shared Modal, ImportExportModal and CircuitLibrary; responsive form rows retain downloads, ownership and version behavior |
| Templates/guides/Diagnosis/pause/results | TemplatesModal and contextual task sheets preserve guide progress, authored repair, grading and seed replay |
| Editing/display/simulation/backup/about preferences | Five SettingsModal tabs with spacious controls, persisted appearance and manual motion choice; grid/snapping remain discoverable |
| Variant/source/review/readiness | ElectricalEditDialog and existing model controls retain draft/cancel/review/apply and stale-preview protection |
| Component info/photo/detailed model | InspectorOverview, reference-photo window, ComponentInfoModal and responsive detailed-settings grid |
| Coil/timer/motor/protection models | Existing editors hosted in desktop rows and phone columns; existing numeric validation and model limitations remain |
| Wire/connections/netlist | Configure wire draft, advanced WireInspectorView, connections window and keyboard node navigation |
| Validation/Zs/analysis/readings/history | Inspector detail windows retain unavailable/stale evidence rules; focused review/validation columns remain |
| Fault Lab/fault alert/What Happened | Modeless shared Fault Lab plus shared alert/fault windows; desktop fault sections use parallel rows |
| Access/sign-in/recovery/basic copy | Redesigned CircuitLibrary/account forms and viewport-contained SimulatorAccessBanner with original export and explicit basic-copy choices |
| Help/shortcuts/contact/welcome/tour/mobile | Shared windows, Help table of contents and existing onboarding anchors/cancellation |
| Loading/offline/blocked/error | Styled deferred loading/failure states and root error recovery card; preserved retry/reload and truthful saved-state wording |

## Validation record

Ignored local evidence is under `.wrangler/open-drafting-table/`. Prototype
results remain separate design evidence; no live-site or remote test is included.

| Gate / evidence | Final local result and scope |
| --- | --- |
| `check-verified.log` | All types/lint and **139 unit files / 2,115 tests** passed on the final source tree. No numerical assertion or timing allowance was relaxed. |
| `ui-final.log` | All **63** core/workbench/appearance assertions passed across Chrome, phone Chrome and Safari before final learning/toast polish; long outer shell exited 143 after the reporter completed. |
| `consumers-verified.log` | All **90** source consumer assertions passed across the three engines: actual imports, reviewed supply/variant edits, Undo/Redo/autosave, Comlink and local-Hono parity, damage/repair/trip/reset, guides, Diagnosis grading/repair/reload and retired-session non-resume. Long outer shell exited 143 after the reporter completed. |
| `polish-verified.log` / `framing-verified.log` | Eight of nine polish cases initially passed; phone Diagnosis framing failed. After reducing its sheet height, all **six** final frame/Console cases passed with clean exit 0. The earlier Properties/draft and retained-motion cases passed on each engine. The **25 px** component legibility and no-overlap assertions remain unchanged. |
| `built-verified.log` / `built-loaded.log` / `built-closed.log` | All **six** fresh built desktop/phone cases passed with clean exit 0. The two strengthened loaded-model cases also passed, checking actual form chunks, desktop rows / phone column and completed entry opacity before screenshots. The final six-case run repeats these strengthened checks against the final built assets and passes. |
| `simulator-verified.log` | All **20** real isolated local Worker/D1/cookie groups passed with clean exit 0, including ownership, authoritative grading/revocation, viewport-contained original export and basic-copy recovery. |
| Final build/static records | Fresh simulator/Astro output and unchanged assets/links/SEO/CSP checks passed; final `*-closed.log` figures are **255,122 / 300,000** bytes gzip JS and **28,571 / 30,000** CSS. 194-page links and 191-page SEO are checked. |
| `graph-tests-final.log` / `graph-tests-closed.log` | All **five** knowledge-graph tests passed, including the final repeat. Scoped graph review checks content freshness only, never passing-test proof. |

The two long source reporters are assertion-complete results, not clean
process-exit proof. The final bounded **15-case** source run (`final-recovery.log`) passed with
exit 0 after the shorter phone sheet: current graded repair/reload/stale-model
checks plus Properties/drafts and retained/manual-motion checks on every engine.
Short frame/Console, built and Worker commands also exited 0. No cause for the long outer-shell signal is inferred and no failed assertion
is discarded. This UI acceptance is separate from the strict Phase 1.9 full
verification/performance gate, which remains historically not green.

## Failed attempts and corrections

The first full unit check passed 2,111 tests and failed two presentation cases.
A momentary operation control was restored on Properties; the old unversioned
fake energized-bell assertion was replaced with a real solved lamp and stale
result check. Another intermediate full check stopped on a useless fragment;
the fragment was removed. The later complete 2,115-test run passed unchanged
numerical budgets. The first surface subset passed 66/68 before closing dialogs
were made inert and inaccessible during their retained exit.

Initial browser passes/failures are retained in `browser-first.log`,
`browser-fixed.log`, `browser-all.log`, `workbench-first.log` and
`workbench-all.log`. Corrections covered nested photo Escape preserving selection,
actual wire auto-inspection, Console/Apply and tour/Close occlusion, catalogue
placement on exposed background and old workbench selectors. The 24-case core
run passed across all three engines. The initial extended 39-case run passed 37
and failed two Safari cases; both recovered without relaxed deadlines.

Consumer failures exposed obsolete Inspector analysis/supply selectors and
keyboard/stop/Undo actions attempted behind a still-open detailed window. Tests
now follow the actual Basic Properties / Advanced window distinction. The real
Inspect handoff while Fault Lab was open was repaired, and the tool menu now
closes when opening Fault Lab. Electrical assertions, port faults, damage,
current, voltage, losses and Undo comparisons were retained.

The first renewed Worker gate failed during bootstrap with a local SQLite lock.
A second run passed API/session groups but exposed a partly off-screen original
export control. The banner's old Tailwind individual translate was still active
after setting `transform: none`; resetting `translate` fixes its geometry. The
real access browser gate now asserts the recovery panel is inside the viewport.
These attempts remain in `simulator-final.log` and `simulator-recovery.log`.

## Cleanup and limits

The concrete [four-file cleanup](../design/open-drafting-table/CLEANUP_REVIEW.md)
was explicitly approved by the user on 2026-10-14 after the file/function table and
exact patch were shown. The reviewed patch removes only the old phone dock,
alignment strip, unused phone Fault Lab wrapper and unimported previous stylesheet
(718 lines). Exact current-file backups, including previous local CSS edits, and
the applied ledger remain local. Shared alignment/delete/fault/repair/history
actions stay active. No source/test/build import references the deleted files;
all post-deletion gates below pass with clean command exit 0.

Phase 1.9 remains historically closed by user decision with documented performance
exceptions. Simulation p95 56.65 ms versus 8 ms, generator timing and dense 60 fps
remain unmet. This UI gate does not remeasure or certify those budgets. Static
asset budgets are separate. Local HTTP bursts include authentication/queue/network
and do not certify Worker-to-D1-only or remote latency.

No commit, push, deployment, remote Cloudflare/account operation or credential
change is part of this work.

An intermediate final-cohort attempt was stopped after an initialization-order
mistake in the new guide transition hook; type checking identified using the guide
ID before its declaration. The hook was moved after that declaration, and the full
code gate passed. `consumers-final.log` records three failures, one interrupted
case and 86 not run; it is not acceptance evidence. `consumers-complete.log` records
13 passes, three Diagnosis pointer failures, one interrupted case and 73 not run:
the new fading wrapper needed an explicit stacking layer above the mini-map.
The corrected guide/Diagnosis layers now preserve their original relative order.
Phone Console handoff reserves a clear control row and keeps the guide footer
scroll-independent. A phone "Show guide steps" chip overlapped zoom controls in
`learning-console.log` (two passes / one failure); its final three-case run passes.
The initial built run (`built-complete.log`) passed one and failed five, using
incomplete Inspector setup and a desktop-only Browse button name on phones.
Built tests now open Inspect explicitly and use the actual responsive Browse name.

The final long UI and consumer reporters completed all assertions (**63** and
**90** passes respectively), but the tool reported outer-shell exit 143 after
completion. These are assertion-complete results, not clean process-exit proof.
The short learning handoff and built runs exited 0; final bounded source checks
are recorded separately. No cause for the long-run shell signal is inferred from
a passing reporter, and no failed assertion is discarded.

The bounded source polish run passed eight and failed the phone Diagnosis
framing assertion (`polish-verified.log`): the full sheet left too little visible
canvas and the existing fitter deliberately fell back to overlapping the full
view. The phone Diagnosis form is now a shorter scrollable sheet. The final
six-case frame/Console run (`framing-verified.log`) passes across Chrome, phone
Chrome and Safari, preserving the **25 px** legibility threshold and no-overlap
assertions. No fitter arithmetic or numerical/electrical assertion was weakened.

## Approved cleanup verification — 2026-10-14

After reviewing the exact four-file/function table and deletion patch, the user
explicitly approved the cleanup and instructed completing the phase. The exact
718-line patch was applied: `PhoneDock.tsx`, `AlignmentBar.tsx`,
`FaultLabDialog.tsx` and `workspace.css`. The local applied ledger contains hashes
of exact backups, including the earlier local CSS edits. Git's base-to-working-tree
diff reports 710 deleted lines because the backed-up stylesheet also contained
eight existing local lines; the applied current-file scope remains 718 lines.

Post-deletion evidence under `.wrangler/open-drafting-table/`:

| Evidence | Completed result |
| --- | --- |
| `cleanup-check.log` | All typechecks/lint and **139 unit files / 2,115 tests** passed, command exit 0. |
| `cleanup-build.log` / `cleanup-budget.log` | Fresh simulator/Astro build and unchanged budgets passed, command exit 0. Initial JS **255,105 / 300,000 B gzip** and CSS **28,538 / 30,000 B gzip**. |
| `cleanup-links.log` / `cleanup-seo.log` / `cleanup-csp.log` | All **194** HTML link checks, **191** SEO pages and matching source/built CSP passed, command exit 0. |
| `cleanup-graph-tests.log` | All **five** graph implementation tests passed, command exit 0. |
| `cleanup-source-ui.log` | All **18** affected source cases passed across Chrome, phone Chrome and Safari, command exit 0: responsive clear shell, canvas commands, inline arrangement/Undo, shared modeless Fault Lab handoff, actual phone terminal-disconnect injection and phone damage/access/focus controls. |
| `cleanup-built-ui.log` | All **six** final built desktop/phone cases passed against the post-deletion build, command exit 0: actual loaded model rows, artwork/reference photo, basic drafts/Undo, motion/Console and catalogue placement. |

Phase 1.10 is complete locally, including the explicitly approved cleanup. The prior full
functional evidence, long-run outer-shell distinction and unchanged Phase 1.9
performance exceptions remain as documented above; no remote work is included.
