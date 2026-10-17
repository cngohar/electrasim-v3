# Fault Lab follow-up investigation — 2026-10-16

Status: all-type review and visual proposal complete; no production implementation. The user expanded the
reported open-circuit problem to all 14 registered fault types. Review Help and
visual communication, target applicability, active-catalogue state, repeated Apply,
ordinary/diagnostic Run, accepted response visibility, Clear and target geometry.
This does not advance Phase 1.12 or renew historical performance acceptance.

## Step 1 — screenshot and source trace

Started with graph brief/phase/find/impact. Missing store method matches were
followed with targeted search. Sources: `InspectorFaultLabView.tsx`,
`FaultFxLayer.tsx`, `faultFx.ts`, `circuitStore.faultActions.ts`,
`core/faultTopology.ts`, `faults.ts`, `faultApplicability.ts`, `uiStore.ts`,
`CircuitReadinessDetails.tsx`, `useSimulation.ts` and `faultLabEvidence.ts`.

Verified findings:

- The supplied screenshot has a component-level CFL open-circuit fault. At least
  one external cut marker floats away from its bent conductor. Ordinary non-port
  cut geometry uses the arithmetic endpoint midpoint and chord angle, while the
  rendered path can be orthogonal or curved. Port-target handling is separate.
- Component `open-circuit` disables the selected component's internal branches
  in `core/faultTopology.ts`; the canvas overlay instead severs every attached
  external wire and dims those runs. Internal component failure and external cable
  breaks need different geometry and labels. This mismatch is visual evidence,
  not proof that the solver cut the wrong conductor.
- SeverCut hard-codes copper-coloured tips, a 26-unit generic cut rectangle and
  animated red tip dots. Neither material nor an accepted arcing outcome drives
  these decorations. Prefer an exact path gap/terminal withdrawal/internal break
  with one brief separation motion and a static final marker; no automatic sparks.
- Library cards in both inline/full catalogues show applicability/coverage but
  never consult active faults. The separate Active faults section is below the
  catalogue and can be out of view. `choose` opens an ordinary new draft for an
  already-applied same-type/same-target fault.
- The shared store rejects exact duplicates and only writes a browser
  `console.warn`. The Apply handler receives an empty ID and leaves the review
  dialog open with no visible explanation. This path is shared by all fault types;
  native per-type verification follows below.
- Help is a bare four-item `<ol>` with no dedicated numbered-row/diagram layout.
  The intended steps are Select, review/apply/run, inspect results, and repair/run
  again. Their visual hierarchy and individual actions need explicit styling.

A corrected direct normalized L/N/CFL probe at 230 V gives healthy **15 W** and
an applied component open **230 V across the open load / 0 A / 0 W**, with a
converged result and supported fault coverage. This shows an open diagnostic can
validly remain running without illumination or current. It does not yet establish
the user's exact browser handoff. The initial probe incorrectly passed an
unversioned source model as a persisted profile; input validation rejected it.
The normalized probe corrected that harness error; no production model changed.

All application tests use an isolated localhost Vite and dedicated local
Playwright Worker/D1, with real test-cookie authorization. Do not use the user's
normal browser storage/database or any live Cloudflare website.

## Step 2 — direct all-type matrix

Reused the applicable targets from `e2e/fault-lab-application-review.spec.ts` and
the actual `FAULT_REGISTRY`; the registry/scenario counts both equal 14. Direct
normalized calls reviewed applicability, coexistence, compiled result status,
readiness, load readings and visual descriptors. All **14 exact duplicates are
rejected**. Ten scenarios have supported effects and converged results. Four are
explicitly not assessed and return unsupported, rather than invented operation.

| Fault | Target in reviewed fixture | Direct effect / result | Canvas indicator |
| --- | --- | --- | --- |
| Open circuit | Wire | Open path; converged, zero load current | Sever |
| Open live | Line wire | Open path; converged, zero load current | Sever |
| Open neutral | Return wire | Open path; converged, numerical zero load current | Sever |
| Open earth | Outlet PE terminal | Load may continue; CPC opening is separate from load interruption | Sever |
| Terminal disconnect | Protective-device terminal | Named connection open; converged, zero load current | Sever |
| Reverse polarity | Outlet | L/N incidence swapped; converged, resistive load may continue | Swap |
| Switched neutral | Switching device | Required conductor mapping not declared; unsupported | Scenario badge |
| Earth fault | Outlet L/PE | Declared L/PE bridge; converged; outcome depends on the return/protection model | Earth marker |
| Live-to-earth leakage | Outlet L/PE | Leakage impedance not declared; unsupported | Scenario badge |
| Smooth DC residual | Outlet | Waveform/saturation model not declared; unsupported | Scenario badge |
| Arc fault | Outlet | Arc/AFDD model not declared; unsupported | Scenario badge |
| Protection forced open | Protective device | Contact held open; converged, zero load current | Jam |
| Protection bypass | Protective device | Current routed outside sensed poles; converged | Bridge |
| Short circuit | Outlet L/N | Declared L/N bridge; converged; timed clearing needs runtime evidence | Scenario badge |

These are 14 representative applicable targets, not exhaustive combinations of
every fault, component, terminal, material, source and protection configuration.
In particular, a continuing lamp/load does not by itself disprove an earth,
polarity, bypass or unassessed fault. Read the modeled incidence, currents,
potential and protective response for the particular arrangement.

The historical 14-type browser check covers real Apply/Clear, canonical/compiled
fault identities, target diagrams and badge-transform stability. It does not run
each fault, repeat Apply, assert a library active state or compare a sever marker
against the actual routed path. Its earlier acceptance is retained within that
scope and does not establish the new behaviors being investigated here.

Local raw evidence: `.wrangler/fault-lab-followup-review/direct-matrix.json`.

## Step 3 — native all-type reproduction and Run handoff

Complete current-source evidence combines the main run and focused gate recovery:
**14 registered target scenarios + the CFL component case on desktop and phone =
16 unique native scenarios**. Each used real local test-cookie authorization,
native file import, target selection, Apply, repeated Apply, Run/diagnostic/explicit
teaching override where applicable, and Clear. There were no page exceptions.
This is representative current-source investigation, not built/browser-engine
parity or a full phase acceptance run.

- **All 14** catalogue cards lacked an Applied indicator after applying their
  same-type/same-target fault. Repeated Apply kept exactly one fault, left the
  review open, warned only in the browser developer console and produced no
  visible app Console message. The CFL desktop/phone cases reproduce this too.
- **All 14** Clear actions removed the injected fault row and main-canvas marker.
  Clearing the cause is not proof of repaired protection/damage or successful
  operation. Runtime resettable trips and persistent damage have separate rules.
- The eight supported fixtures that pass ordinary preflight produced current,
  converged results and fresh Lab captures. Open circuit/live/neutral,
  terminal-disconnect and forced-open used the diagnostic button. Open earth and
  bypass must not be assumed to remove load power by their names.
- Reverse polarity and short circuit instead hit the existing Pro validation gate
  (`polarity-reversed` and `readiness-short`). The validation window replaces the
  shared Lab view. Existing explicit teacher/demo overrides produced converged
  runs; the short fixture's runtime protective device is tripped. No gate or
  protection behavior was bypassed by changing source/test expectations.
- **New handoff bug:** the validation redirection changes `activeInspectorTab`
  but keeps `faultLabOpen = true`. Closing validation leaves Lab hidden. The first
  menu toggle sets the stale flag false and still shows no Lab; the second toggle
  opens it. Both Pro-gated types reproduced this. A return/open action must restore
  the intended view, rather than toggle a hidden flag. Preserve the selected target
  and clearly explain whether Run was blocked or started.
- The four unassessed fixtures return a current **unsupported** result, remain in
  Run state and produce no accepted Lab capture. This is no evidence of calculated
  arcing/leakage/tripping. Their exact missing-model reason needs a prominent
  Unavailable state instead of relying on long text or implying a pending capture.

The reported **CFL component open** was reproduced on **1440 px and 390 px**.
Readiness opens, Run diagnostic starts, readiness closes, and the Lab captures
**230 V across the open load, 0 A, 0 W** with a current converged result. The exact
"diagnostic button does nothing" outcome was not reproduced here. Remaining in a
continuous run and an unlit load are expected for that open path; the missing
completion/status hierarchy makes it difficult to understand.

Route measurements in the desktop CFL fixture found one cut **68.65 screen px**
from the nearest actual wire path. The open-earth terminal fixture had a cut
**12.47 px** from the nearest route. Terminal-disconnect was within **0.43 px**
in its tested geometry, while straight/symmetric wire cases were essentially on
the path. The bug therefore depends on route/target shape; a straight-wire check
cannot certify curved/orthogonal placement. Use the actual rendered route for
both gap position and terminal-direction sampling.

Browser Help measured **four items, list-style none, zero icons**. The existing
steps are present in markup but their numbering is reset, matching the reported
plain-text appearance. The new proposal uses explicit numbered rows and labelled
small diagrams; it does not add icons to every paragraph.

Source also shows the inside demonstration takes `selectedFaults[0]`. When several
faults share a component, a cause selector/count is needed to avoid silently
showing just the first cause. This is a source finding; exhaustive multi-fault
coexistence/lifecycle browser acceptance is outside this representative matrix.

## Step 4 — proposed visuals and verification

The [interactive design](../design/fault-lab-followup/index.html) demonstrates:

1. Internal component opening: external wires stay intact; a symbolic internal
   branch opens. It does not claim which physical CFL part failed.
2. External conductor break: the gap and tangent come from the actual SVG path;
   one brief endpoint separation ends in a static gap.
3. Terminal disconnect: only the named conductor withdraws at its terminal.
4. Persistent Applied badge, duplicate prevention with visible explanation,
   Inspect/Clear actions and a separate explicit diagnostic state.
5. Six Help rows: choose target, review/apply, run, read response, repair, verify.

Do not use continuous sparks/flames for an open fault. Metal colour, electrical
potential, current-flow animation, fault identity and damage are separate data.
Use semantic diagrams for the path and short text for values, limits and caveats.
Jam, bypass, polarity and earth faults need their own contact/bridge/swap/PE cues;
the four unassessed effects should keep an honest labelled scenario marker until
their electrical models exist.

Three standalone Chromium workflows passed at **1440/390/360 px**: target switching,
exact route anchoring, applied/duplicate status, clear/reapply, diagnostic preview,
six Help rows, Escape, light theme and reduced motion. Gap-to-route distance was
zero in the preview's tested geometry; no horizontal overflow/page exceptions.
Desktop scene and phone Help captures were visually inspected. This is an
illustrative proposal, not an application fix or solver evidence.

Existing focused units passed **39 tests / 4 files**:
`faultFx.test.ts`, `FaultFxLayer.test.tsx`, `InspectorFaultLabView.test.tsx` and
`faultLabEvidence.test.ts`. Preview syntax, scoped Biome, local document links and
final graph mappings are checked separately. These tests do not cover the newly
identified duplicate/library/run-handoff/route-distance gaps and cannot certify
those fixes before implementation.

Tracked [matrix evidence](data/fault-lab-followup-matrix.json) contains direct
results, sanitized native outcomes and proposal checks. Local raw attempts and
screens are under `.wrangler/fault-lab-followup-review/`.

## Failed and recovered investigation attempts

- Initial partial native harness used the old helper's schema-2 export for the
  normalized CFL profile; import correctly required schema 3. Recovery used the
  real `exportJSON` serializer. No circuit data was discarded to make it pass.
- The first Run probe checked for readiness too early. It was replaced by polling
  the actual readiness/Stop/override state, retaining the native click and all
  substantive assertions. Partial evidence is not called a diagnostic failure.
- In the main matrix, the two Pro-gated cases unmounted Lab; the probe initially
  timed out reading that absent panel. Focused gate recovery confirmed the explicit
  override, then exposed the stale-open-flag bug. Final recovery reproduced both
  native reopen clicks and completed Clear. Acceptance above is aggregate/focused
  recovery, not one uninterrupted all-green invocation.

## Proposed implementation order

1. Fix shared user feedback and catalogue state for every type/target; return
   structured duplicate/conflict outcomes instead of developer-console-only text.
2. Repair validation/Lab ownership and explicit Return to Lab; show Diagnostic
   running, Captured, Blocked, Unavailable and Stale distinctly. Preserve Pro
   gates, current-result identity and physical repair rules.
3. Correct route/terminal/internal-path geometry before adding the short optional
   animation. Check zoom, rotation, Bezier/orthogonal/dense renderers and export.
4. Introduce the numbered Help and type-specific semantic diagrams; shorten or
   fold secondary explanations. Add multi-cause target selection.
5. Verify the new behaviors across all 14 types with meaningful source/built
   desktop/phone checks and affected units/runtime evidence. Do not treat this
   investigation or old Apply/Clear coverage as production acceptance.

Production source/models remain unchanged. No commit, push, deployment or remote
Cloudflare action occurred. Phase 1.12 and its accepted exceptions are unchanged.
