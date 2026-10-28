# Phase 2.3 — local preview implementation and evidence

2026-10-28: complete locally with explicit interrupted-run recovery. See the
acceptance status below for selected passing evidence and retained failures.
Implementation began locally on 2026-10-27 under the owner's instruction to continue
the next phase. Phase 2.2's recorded interruption/recovery acceptance remains its
historical scope. No remote account/resource operation, migration, deployment or
push is authorized or performed.

The [execution plan](../plans/PHASE_2_3_PREVIEW_PLAN.md) and
[API contract](../api/preview.md) define the scope. Component/wire SVG drawing now
has pure modules with thin editor adapters. The same scene renders detail HTML,
standalone thumbnails and simulation results. Public detail reads immutable
versions only and rechecks publication visibility and author privacy. A small
explicitly loaded DOM island owns ephemeral interaction; the server rechecks
current component policy, membership, sessions and visibility around computation.

## Implementation chronology — scoped results and corrections

- Initial real local HTTP checks exposed an unpowered fixture that could not
  generate transient simulation state. The fixture now declares and connects a
  real AC supply, manual switch and load. The endpoint explicitly requests the
  domain's zero initial step. The engine is unchanged.
- Initial pure-renderer selection passed four cases and caught the missing
  component-map argument for static fault descriptors. Corrected it; all five
  cases then passed, including complete catalogue/rotation terminal/frame/artwork
  comparisons with the real editor and strict-CSP deterministic rendering.
- React's server renderer reported a device tooltip `<title>` with array children.
  The shared pure node now supplies a single string, preserving the editor text.
- First desktop browser attempt: six passed, three failed. One used the unpowered
  fixture; Pro/report cases used Playwright's isolated request context rather than
  the page cookie jar. Fixtures now use `page.request` and the declared supply;
  product authorization was retained. These failed runs are not acceptance.
- `.wrangler/preview-api-B0qsEc/result.json`: eight real local HTTP/race groups
  passed (no-JS/thumbnail delivery, immutable/version identity, private edits and
  attribution, current policy, premium/session/account/expiry races and lifecycle
  visibility). Later checks and dedicated acceptance remain to be recorded.
- Existing editor node/appearance/geometry selection: nine tests passed in three
  files. Dedicated gate tooling now includes the complete 2.2 predecessor plus
  preview API and both three-project browser deliveries (29 stages). Its initial
  test corrected array-step versus expanded-stage counting; all 15 tooling tests
  passed afterward. Matching hashes will be recorded separately from test results.

No schema changes or seeding of ordinary local persistence are needed. Static
social OG remains the later 2.8 strategy. At that point, source/built acceptance, visual inspection
and final review were pending. Final closure is recorded below. Overall
Phase 2 and earlier hardware/performance exceptions remain open.

Additional pre-acceptance review corrected temporary switch changes during a run:
they preserve transient engine state and apply at a zero-time step rather than
resetting the simulation clock. Both HTTP and actual browser checks assert the
clock/load behavior. The first dedicated invocation A was explicitly stopped
during typechecking for this correction; it is not acceptance. The 30-case source
selection passed across desktop/phone/WebKit before the final control additions;
six focused pan/focus cases subsequently passed. Earlier reporting fixture failures
were self-report denials (correct product behavior); the fixture now uses a separate
reporter. A late-response test now waits for its intercepted request to finish, so
its callback cannot outlive the test. Unsupported/unpowered circuits explicitly
show unavailable calculations and stop the preview clock. Known unavailable content
cannot be restored by Reset or focus events. Full final acceptance is still pending.

Dedicated invocation B found a real dependency/type boundary issue in the final
runtime-test TypeScript configuration: importing shared colors from the editor's
combined theme/preset module followed type imports into editor/worker-client
code. B's typecheck failed; its lint passed, and units were explicitly stopped
while correcting the dependency. B is not acceptance. The shared light-theme
values now live in a pure tokens module re-exported by the editor, and the preview
imports that pure module directly. Main theme types also reference the pure canvas
type instead of the editor component. A renderer test now preserves title strings
that resemble theme expressions; serialization substitutes only presentation
attributes, not arbitrary user text. No electrical or access behavior changed.

Invocation C passed full types/lint, 2,348 units / 155 files, 15 gate / 5 graph
tooling tests, build/budgets/CSP/links/SEO and component storage. Its historical
2.0 infrastructure fixture expected `/c/relay` to serve spike HTML, but production
now owns that route and correctly returns unavailable without a publication.
C was stopped for this fixture integration correction; its partial results are
not a full successful gate. Following the established 2.1 `/__phase20/u` isolation,
spike detail HTML now uses `/__phase20/c/:slug`. All fixture encoding/CSP/no-store
assertions remain; both product and fixture unknown subpaths are checked. The real
2.3 route has its own immutable snapshot/visibility/access acceptance. Final
full acceptance is rerun after this correction.

## Interrupted D and explicit recovery — 2026-10-28

The interrupted D invocation retained 19 passing stage records: complete
non-browser prefix (2,348 units / 155 files, unchanged 897 electrical parity and
all existing storage/API groups) plus all 105 existing source browser cases.
Built browser execution reached 99 passing cases but has no completed stage or
final gate manifest; it is not accepted as a complete matrix. No verification
process survived the interruption. Existing workerd client-disconnect/Broken pipe
diagnostics remain in the partial built log, separate from case outcomes.

All 1,387 implementation/harness inputs, including enumeration of additions and
deletions, match D's initial SHA-256 baseline. The local stability record is
`.wrangler/preview-recovery-stability-2026-10-28.json`. Hashes establish stability,
not passing tests. `recovery-2026-10-28a` resumes the remaining ten stages from
`browser:2`, repeating that entire built matrix and all later profile/publication/
preview groups sequentially without retries or skipped assertions. Completion
requires passing reviewed evidence for all 29 stage identities. Combined evidence
will be distinguished from an uninterrupted full-selection exit 0; D's partial
built run and all earlier failures/interruptions remain explicit.

Recovery A completed all ten stages on unchanged inputs. Nine stages passed:
30 source + 30 built profile cases; 8 publication storage / 22 publication API
groups; 27 source + 27 built publication cases; 9 preview HTTP/race groups and
33 source + 33 built preview cases. Built existing regression had 104 passes and
one WebKit total-test timeout in the existing stale-plan edit case (30-second
deadline). Its snapshot already showed version 2 and the winning plan name after
conflict/reload, but that case and the stage remain failed. Recovery A's recorded
status and command exit are 1; it is not a successful full selection.

An explicit traced run of that same stale-plan case passed all three projects
with the original assertions/deadlines and no retries (4.2 s desktop, 4.0 s phone,
26.7 s WebKit). Evidence is `.wrangler/phase23/stale-plan-trace-2026-10-28.log`
and its retained trace artifacts. No source or harness was changed for this
recovery. A separate `recovery-2026-10-28b --only browser:2` repeats the entire
105-case built regression; this must pass before its stage contributes to closure.
The failed A stage remains in the audit rather than being counted as successful.

All eight final source/built desktop/phone no-JS and interactive preview
screenshots from A were inspected. Hashes and review scope are retained at
`.wrangler/phase23/reviewed-screenshots.json`. Schematic, component/version
navigation and controls fit their viewports; these headless checks do not imply
new human or physical-device acceptance.

## Acceptance status — complete locally 2026-10-28

All 29 required stage identities now have passing evidence on the same 1,387
implementation/harness inputs. The [dedicated manifest](data/phase23-acceptance.json)
records stage identity, invocation, status, log hash, complete source hashes,
required exit groups and eight inspected screenshot hashes. Fingerprints establish
stability; executed outcomes establish the reported passing checks.

| Selected evidence | Passing scope |
| --- | --- |
| D, first 19 stages | Full types/lint; 2,348 units / 155 files; 15 gate / 5 graph tooling checks; build, budgets, CSP, links and SEO; 6 infrastructure / 8 component storage / 14 component API / 20 admin / 34 membership-simulator / 8 profile storage / 21 profile API groups; 897 unchanged electrical parity; all 105 existing source browser cases |
| Recovery A, nine passing stages | 30 source + 30 built profile cases; 8 publication storage / 22 publication API groups; 27 source + 27 built publication cases; 9 preview HTTP/race groups; 33 source + 33 built preview cases |
| Recovery B, complete built regression | All 105 existing built browser cases; stage and enclosing command exit 0; original assertions and deadlines retained |

Recovery B finished at 2026-10-28 08:10:48 UTC. Its full built matrix passed in
11.5 minutes, including the previously timed-out stale-plan WebKit case in 25.0
seconds under its unchanged 30-second deadline. Recovery A remains status/exit 1;
D remains interrupted with no whole-command result. The supplementary traced
three-project run is diagnostic evidence, not a replacement for B's full matrix.
This is complete selected-stage coverage across the interrupted invocation and
explicit recoveries, **not an uninterrupted full-selection exit-0 claim**.

All 390 selected browser cases passed across eight source/built matrices, with
Playwright retries disabled and no skipped cases. Earlier failed attempts remain
explicit above. Workerd client-disconnect/Broken pipe diagnostics remain in the
built logs, separately from passing case/stage outcomes; no log filtering was used.

Actual built Assets/header/CSP and unknown-route checks passed, including eight
admin pages / eleven scripts and preview source/built byte equality. Initial app
assets remain 269,377 B JavaScript gzip / 29,462 B CSS gzip under the unchanged
300,000 / 30,000 B limits. Detail loader is 390 B gzip; the lazy preview island is
3,054 B gzip; detail styles are 1,389 B gzip. Preview/discovery pages import no
editor/store/autosave code. These static budgets are not hardware recertification.

Eight source/built desktop/phone no-JS and interactive screenshots were inspected.
The schematic, controls, component list, version navigation and provenance remain
readable within their viewports; zoom supports closer inspection on phone.
Headless checks imply no new human visual or physical-device acceptance.

The [2.3 plan](../plans/PHASE_2_3_PREVIEW_PLAN.md) is complete locally within this
scope. Next is 2.4 Explore, feed and search. Overall Phase 2, support 2.7A and prior
hardware/performance exceptions remain open. Static social OG retains the 2.8
scope; SVG thumbnails are deterministic, uncached visibility-gated fallbacks.
Simulation retains the 500-component/1,000-wire and current-model/international
standard limits; results are temporary and never certification. SSR displays the
newest 100 versions, with the bounded history API available for further history.
No remote operation, deployment, commit or push occurred.

## Ordinary local delivery and graph review

The ordinary Worker was restarted using `bun run dev:worker` on 127.0.0.1:8791
with existing local persistence. All eight delivery checks passed in
`.wrangler/preview-local-readiness-2026-10-28.json`: health, app, owner workspace,
public loader/island, unavailable detail/thumbnail and anonymous owner API denial.
No migration, fixture identities or publication rows were seeded into this store.
Authenticated acceptance used isolated local stores.

The preview graph record maps runtime, shared drawing/theme, configuration and
focused/full checks to this plan, contract, audit and manifest. Its scoped review
covers these final sources and executed outcomes; historical unreviewed/changed
records retain their baselines. Graph fingerprints are a content-review aid and
are never described as passing tests.
