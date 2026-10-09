# Phase 1.7 — Simulator UI and modes

## Scope

Implemented the user's accepted new interface with the existing Lab Glass colors
and themes: workspace navigation, two-column component library, contextual
Inspector with labeled sections, bottom simulation controls, phone navigation
and phone Inspector. The simulation clock shows accepted solver time; stopping
ends the run and the next Run restarts time. Basic/Pro remains an interface mode,
not an entitlement grant. Existing configuration locks, membership/read-only
recovery, supply confirmation, repair and diagnostic flows remain authoritative.

Settings → Display offers Device icons (default), Circuit symbols and Both.
The library, Inspector preview and canvas share this preference. Artwork stays
inside the existing frame; canonical terminal coordinates/IDs, circuit data,
rotation and wire anchors do not change. Complex families without a dedicated
glyph use labeled functional blocks; these are not a second internal netlist.
Matter, current-flow and device effects retain their existing accepted-signal,
reduced-motion and offscreen/dense-scene behavior.

The approved [prototype](../design/phase-1.7/index.html) remains separate from the
real app. Its lamp terminal positions were corrected before implementation.
The [delivery plan](../plans/PHASE_1_7_UI_MODES_PLAN.md) defines this scope.

## Acceptance evidence — local, consolidated with focused recovery

- Initial phase gate: all project typechecks, lint, **142 test files / 2,220 unit
  tests**, build, asset budgets, internal links, SEO and CSP passed.
- Initial real-session browser acceptance found an ambiguous Import / Export
  label between the header and menu. The header action is now Files; rebuilding
  and resuming membership acceptance passed **36 real local D1/cookie groups**.
- The 35-case Chromium matrix first passed 31 cases. Four failures exposed two
  UI regressions: the phone Inspector duplicated the existing Fault Lab dialog,
  and the new desktop tab omitted the established descriptive accessible name.
  Hiding the phone Inspector while Fault Lab is open and retaining that label
  fixed both causes. **All 9 tests in the affected consumer, damage/repair and
  workspace-design files passed** in focused recovery. All 35 planned browser
  cases have passing evidence across those runs; this is not one uninterrupted
  full green gate.
- The new appearance checks cover every mode, persisted reload, unchanged saved
  circuit and terminal geometry, light/dark, desktop/phone, and keyboard netlist
  selection. Unit tests cover canonical ports at four rotations for lamps,
  switches, three-phase sources and relays. Appearance is not an input to the
  simulation hook.
- Existing Matter acceptance passed, including dense 200-component/400-wire
  suppression, reduced motion, offscreen lifecycle, ordinary trips without
  damage artwork and effects-toggle electrical identity.
- Knowledge graph: **4 tests passed**, covering bounded dependency traversal,
  cycles, AST lazy imports, workspace resolution, freshness and CLI errors.

Logs are retained locally under `.wrangler/phase17/`: `gate.log`,
`recovery-build.log`, `recovery-gate.log`, `browser-recovery.log`,
`graph-tests.log`, `final-checks.log` and `dense.log`. Membership evidence is in
`.wrangler/membership-tests-2UXRA9/`. Final typecheck, lint, build, asset, link, SEO and CSP checks passed after
recovery. Final assets are **251,223 B gzip JS / 300,000 B** and **27,542 B CSS /
30,000 B**. The 200-component/400-wire benchmark passed its existing gate: idle
p95 16.8 ms, pan/drag handler p95 0.20/0.10 ms and release commits 0.5/2.3 ms.
Zoom paint p95 was 150 ms; dense 60 fps interaction remains unmet. See
[measurements](../PERFORMANCE.md). Phase 1.7 is complete locally within this scope;
Phase 1.9 full acceptance remains pending.

## Knowledge graph continuity

All remaining phases must begin with the [local graph](../KNOWLEDGE_GRAPH.md),
per `AGENTS.md`. Explicit [phase metadata and sourced findings](../code-graph.json)
replace inferred phase numbers. The graph now bounds reverse-dependency queries,
reuses unchanged ASTs, indexes literal lazy imports and workspace aliases, and
keeps expensive compiler call resolution optional. Reviewed browser relationships
include the phone Fault Lab ownership discovered during this phase. Generated
indexes remain ignored; graph results do not substitute for acceptance evidence.

## Remaining boundaries

Phase 1.8 is super-admin membership UI; Phase 1.9 is the full local verification
matrix. Existing F.3 solver/generator and dense-interaction performance exceptions
remain explicit in [their acceptance record](phase-1-legacy-retirement.md). No
budget is relaxed by this UI phase. No Cloudflare operation, deployment, hosted
test or GitHub publication was performed.
