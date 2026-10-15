# Phase 1.12 — Missing component calculation

Local implementation started 2026-10-15. The user confirmed Phase 1.12 after the
phase-number correction, then requested all steps in one continuous workflow.
**Milestones 1.12.0–7 are complete locally within their declared functional scope.**
Full source/built acceptance uses explicitly combined recovery evidence; historical
performance targets remain unmet. Final types/lint pass after test-flow corrections.
The implementation request did not authorize publication. After local acceptance,
the user explicitly authorized the Phase 1.12 local commit and GitHub push on
2026-10-15. This authorization does not include deployment.

## Coverage and numerical contract

The historical [placement baseline](data/phase-1.12-catalogue-baseline.json) records
116 entries and 31 default gaps. The [current reproducible matrix](data/phase-1.12-catalogue.json)
contains **30 implemented original gaps**, **one existing three-phase motor needing
explicit setup**, **82 declared models with conditions** and **33 other declared
contracts**. Inventory is navigation/accounting, not runtime proof. Original and
current counts are distinct; 82 conditions do not mean 82 wholly physical devices.

| Slice | Implemented electrical law / interaction | Independent acceptance |
| --- | --- | --- |
| 1.12.0 | Concrete family matrix, parameter provenance, ADR and responsive lamp prototype | Separate analytic reference tests and standalone browser preview |
| 1.12.1 | Strict typed profiles, schema 3, coherent nameplate edits, complex MNA and operating-point derivation | Analytic feeder roots, complex impedance equations, KCL/KVL/power, invalid inputs, migration and stale/Undo guards |
| 1.12.2 | Five regulated-input-power AC lamps, declared 207–253 V band and zero-current off state | Five independent powers; low/valid/high/open/reversed/collapse cases; real 12/230 V placement/wiring workflow |
| 1.12.3 | Six single-phase fan/motor/pump equivalents with explicit input watts and editable lagging PF | Independent complex admittance/current/real/reactive power; vector neutral and residual checks |
| 1.12.4 | Fifteen appliance/sounder/alarm profiles; regulated active/standby/alarm and composite heat/motor branches | Per-entry independent equations; mode-selected branch sums and actual Inspector workflows |
| 1.12.5 | PV I-V source, shared-common autotransformer, quasi-static SPD shunts and explicit-temperature NTC | Load-curve intersection, dark/open output, ratio/reverse/power, PE current, beta/divider equations |
| 1.12.6 | Explicit editable setup for existing motor/coil/timer/protection contracts; actionable sensor/manual limits | Valid setup tests, actual editing/run, existing sequence/timer/trip/repair browser corpus |
| 1.12.7 | Current catalogue, examples, guides, API/persistence, resumable gate and evidence review | All required functional/static/runtime/browser stages accepted through the explicit evidence combination below |

Teaching parameters are explicitly editable assumptions. The [family matrix](../specs/phase-1.12-model-families.json)
and [ADR 0016](../decisions/0016-regulated-load-profiles.md) contain laws, provenance,
required inputs and primary references. Nameplate watts never silently become a
resistor. Motor equivalents consume electrical input; they do not calculate shaft
output, speed, start/stall current or efficiency. Impedance loads still draw their
declared current outside the running band, with `outside-running-band` and no
running appearance. Regulated demand switches off outside its declared band.
Standby is a distinct consuming state without an active visual.

PV reference points are (0 V,14 A), (32 V,12.5 A), (40 V,0 A), with explicit irradiance,
temperature and editable coefficients (zero means that effect is unmodeled).
The autotransformer common ports are connected, never reported isolated. SPD AC
current is an explicitly separate RMS-envelope approximation; no impulse energy,
transient surge suppression, certification or destruction is simulated. The NTC
uses explicit temperature, R25 and beta; no thermal environment is invented.

The shared electrical model/capability version is **1.12.1.0**. Export/autosave/backup
write schema **3**; schemas 1/2 migrate without discarding IDs, ports, custom ratings,
wire routes, independent supplies, faults or permanent damage. Malformed/conflicting
profiles fail strict validation. The NTC exponential is evaluated with a bounded deterministic series after a
Chrome/Node last-bit difference was reproduced; independent formula error checks
and exact three-runtime browser parity pass without rounding. Raw HTTP circuits use the same validator directly,
without pretending that the request body is an older file envelope. Existing
membership requirements and conditional control/profile versions remain separate.

The new bounded complex kernel dispatches only for profile branches; established
fixed-resistance circuits retain the linear path. Newton uses analytic Jacobians,
64 iterations, 12 line-search steps, 16 state passes and the existing 512-real-unknown
bound. Zero-law/off branches preserve independent reference domains. Inconsistent
band switching, power collapse, unsupported excitation or a failed conservation
check returns unavailable measurements. Seed conductances are initialization only.
Scalar display magnitudes never replace complex KCL/neutral/residual sums.

Existing Fault Lab current-result guards, clear/reset-OFF/explicit-ON/replacement
operations remain separate. Automatic PIR/photocell/smart protocols/thermostat
inputs, independent double-gang inputs, full mechanical/thermal/chemical dynamics,
manufacturer certification, DC lamp drivers and electronic phase-cut dimming remain
outside the declared teaching scope with actionable setup/limitation text.

Timer/bell and staircase examples now contain explicit editable simulated-time
programs. Motor, doorbell, EV, induction, SPD, generator and AFDD guide coverage is
updated to actual calculated models. The solar/battery diagram stays Drawing only:
it lacks a charge controller/SOC model and a declared DC lamp driver. An AC driver
being available does not make that DC drawing physically modeled.

## Verification record

Required functional evidence is combined from the full attempt and focused
recoveries. The original invocation failed and is not relabeled green.

| Check | Current evidence | Retained local log / artifact |
| --- | --- | --- |
| Full registered units | **2,197 / 141 files passed** | `.wrangler/phase112-full-functional-gate.log` |
| Independent lamp reference | **8 passed**; earlier standalone preview **3 passed** | Full functional log; separate specification-only evidence |
| Types/lint, gate tools, graph tools | Full base and final test-only type/lint refresh passed | Full functional log; `.wrangler/phase112-final-types-lint.log` |
| Build/assets/links/SEO/CSP | Passed: initial JS **260,582 B gzip**, CSS **28,085 B gzip**, **194** HTML pages, **191** SEO pages | Full functional log |
| Exact Bun/workerd comparisons | **897 passed** | `.wrangler/domain-tests-Udmomb` |
| Real local API/D1/cookie authorization | **34 groups passed** | `.wrangler/membership-tests-1arcIR` |
| Affected source browser cases | **207 unique accepted** through full attempt plus focused/traced recovery | Full functional log; source recovery logs below |
| Native built LED/Fault Lab | **4 passed**, desktop/phone | `.wrangler/phase112-built-gate.log` |
| Built catalogue/models/editing/setup | **18 unique accepted**, **2 intentional skips**, through full attempt plus motor recovery | Built gate log; `.wrangler/phase112-built-motor-recovery.log` |

The numerical/model implementation stayed unchanged during the final browser
recoveries. Final static refresh covers the test-only corrections. No unnecessary
repeat of the complete unit/runtime/API stages was used for those corrections.

The 207-case source attempt finished with **192 passes / 15 failures**. Retained
failure screenshots/contexts: `.wrangler/phase112-source-attempt-results`. A
21-case focused recovery across the three projects finished **20 passes / one
local Vite module-fetch failure** in `.wrangler/phase112-browser-recovery-final.log`.
The affected phone countdown test passed alone with tracing, without source edits,
in `.wrangler/phase112-countdown-fetch-recovery.log`; trace artifacts are retained
in `.wrangler/phase112-countdown-traced-results`. The fetch failure did not reproduce;
its root cause is not established. This combines valid evidence for **207 unique
source cases** across Chrome/phone/Safari; neither earlier invocation is a full
green gate. Corrections update obsolete LED
compatibility expectations, use current Inspector tabs, close settings before Run,
scope duplicate countdown controls to their active dialog, and zoom out before
placing a motor beside the source on smaller screens. The LED damage test allows
60 s for import/editor/Run/replacement, matching the existing multi-step repair
flow; its 20 s damage-event poll is unchanged. No physical assertion or numerical
threshold is relaxed.

The built continuation passed all four native cases. The catalogue attempt passed
16 cases, skipped two source-module parity comparisons intentionally, and failed
both motor cases because the fast keyboard test had only completed two phase
wires. The solver correctly reported phase loss. Waiting for each visible wire
commit before the next pair fixed the test sequence; both desktop/phone cases
passed with tracing in `.wrangler/phase112-built-motor-recovery.log`. Artifacts:
`.wrangler/phase112-built-attempt-results` and
`.wrangler/phase112-built-motor-traced-results`. Built Run helpers explicitly
require the emitted `sim.worker` dedicated Worker. No simulation result is
injected into the delivered UI. The two skips defer direct-module contract
comparison to the source suite, where all 53 fixtures pass across all three
projects; built tests still verify actual delivered readings for every new entry.

All seven new-model family workflows, profile mode/edit/Undo/reload and exact
53-fixture direct/real-Comlink/local-Hono comparisons pass in Chrome, phone Chrome
and tablet Safari. Desktop/phone native L/N placement and 12 V/230 V LED flows
also pass. Phone and Safari captures were visually inspected. The combined
source/built evidence above completes the required affected functional scope.

`bun run verify:phase-1.12` supports `--list`,
`--only`, `--from` and truthful partial/full reporting. It covers the full registered
units/types/lint, graph/gate tools, build/asset/link/SEO/CSP checks, local runtime
parity and real D1/cookie/API authorization, affected source projects and built
native/catalogue delivery. All targets and Wrangler state are local.

Early evidence: the initial 77 model/setup units and 881 exact Bun/workerd cases
passed. The expanded profile tests pass 99 cases, including independent per-entry
appliance equations, shared-common nonlinear loading, balanced three-phase complex
neutral and reactive RCD behavior. Those focused results alone did not establish
closure; they are now included in the full registered suite. The earlier spec gate
remains specification evidence only.

Initial full units found obsolete missing-LED expectations; genuine unknown-model
guards now use an unconfigured three-phase motor. Browser testing exposed and fixed
raw API schema wrapping, then distinguished actual motor impedance current from
running appearance. Failed/interrupted attempts are retained in `.wrangler/phase112-*`;
only valid current full or explicitly combined recovery evidence is acceptance.
An earlier membership run interrupted by local Worker reload was invalid; the
subsequent 34-group result above ran after source edits stopped.

## Performance and delivery boundaries

Measurements ran after functional browser jobs stopped; thresholds are unchanged.

| Workload | Median | p95 | Interpretation |
| --- | --- | --- | --- |
| Before implementation: existing 200 components / 396 wires | 32.11 ms | 68.23 ms | Failed the existing 8 ms limit |
| Final: same existing numerical workload | 24.36 ms | **45.07 ms** | Still fails 8 ms; `.wrangler/phase112-after-simulation.log` |
| Final result serialization, 2,741,551 B | 31.56 ms | 40.82 ms | Separate transport cost; not included in solver sampling |
| New profile workload: 1 load / 3 components / 2 wires | 1.70 ms | 4.03 ms | 50 accepted samples after 10 warmups |
| New mixed profile workload: 10 loads / 12 components / 20 wires | 4.46 ms | 12.45 ms | 50 accepted samples after 10 warmups |
| New mixed profile workload: 25 loads / 27 components / 50 wires | 10.52 ms | 22.81 ms | 50 accepted samples after 10 warmups |

New mixed workloads rotate lamps, complex motor equivalents and composite
appliances, checking convergence, lamp power and complex KCL on every sample.
Their inputs were unsupported before implementation; they are not a like-for-like
regression delta or a new performance-green gate. Raw data:
`.wrangler/phase112-profile-benchmark.json`. Separate before/after runs do not
establish causation.

The unchanged dense browser benchmark **passed its existing assertions**. It
measured pan/drag/zoom frame p95 **33.4 / 66.6 / 199.9 ms**, with idle p95 **16.8 ms**.
The test's current pan/drag handler, commit and idle assertions do not establish
60 fps during gestures. Dense rendering remains below the target. Raw log/metrics:
`.wrangler/phase112-browser-performance.log` and
`.wrangler/phase112-browser-frames.json`; report retained in
`.wrangler/phase112-rendering-report`.

Historical Phase 1.9 solver p95 **56.65 ms**, generator timing and dense 60 fps
exceptions remain open. Generator timing was not rerun in this model phase; no
generator implementation changed. The strict repository-wide `verify` gate is
not green, and no new exception was silently accepted. Functional completion is
within the declared model scope; performance and unmodeled physics stay explicit.

## Knowledge graph and final record review

The phase, family, coverage and acceptance mappings were updated at implementation,
base-gate, source, recovery and closure checkpoints. Five scoped records link the
reviewed evidence: `missing-component-calculation-phase-plan`,
`catalogue-model-coverage-and-feedback`, `missing-component-calculation`,
`catalogue-simulation-coverage` and `lamp-driver-profile-specification`.
Review fingerprints describe actual scope, including combined evidence and open
performance limits. Historical unreviewed/changed records remain separate; a
global `graph:check` nonzero result is not a new-model test failure or a passing
phase gate. Generated indexes remain local and ignored.

Final inventory/reference/lint/gate-tool/graph-tool checks are recorded in
`.wrangler/phase112-final-record-checks.log`; **251 relative file links in 11
changed/new Markdown files** and diff whitespace checks pass. No resource-saving
percentage is claimed. The handoff names valid logs and affected-check triggers
so continuation can avoid repeating unchanged, already accepted numerical/API
stages. Active phase 1.12 records functional completion; no next phase is started.

Development and verification remained local; the work was uncommitted at functional
closure. The user subsequently authorized this Phase 1.12 GitHub checkpoint. Git
commit history and local/upstream/remote equality are the authority for publication;
verify those refs before reporting a successful push. No Cloudflare account
operation, deployment or live-site test is included.

Publication preparation ran the normal staged Biome checks: nine files received
formatting/import-order normalization only. The six affected unit files then
passed **86 tests** in `.wrangler/phase112-publish-focused.log`. These are focused
post-format checks, distinct from the retained full 2,197-test gate. Commit hooks
also enforce staged checks and full typecheck. Functional/performance conclusions
are unchanged by this publication checkpoint.
