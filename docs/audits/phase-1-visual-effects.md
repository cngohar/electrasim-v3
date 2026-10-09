# Phase 1.6 — visual effects acceptance

Date: 2026-10-09. Status: complete locally, with comprehensive and focused recovery evidence.

## Scope

One continuous implementation, followed by a consolidated gate and focused
failure recovery. See the [delivery plan](../plans/PHASE_1_6_EFFECTS_PLAN.md).

- `collectMatterEffects` projects current versioned overload/damage evidence and
  saved irreversible failures. An ordinary protective trip cannot cause a damage
  cue. Missing/stale/legacy readings cannot create new consequences.
- `MatterLayer` retains SVG routing and hit targets, samples the routed wire for
  the accent anchor, and dynamically imports isolated Matter physics. Animations
  are illustrative local sag/snap/stress cues, not temperature/fire predictions.
- At most 24 targets / 48 bodies, two fixed 60 Hz substeps per throttled 30 Hz
  presentation, and disposal after 45 displayed steps. Static cues remain after
  settling. Stop, hidden document, offscreen viewport, reduced motion and dense
  circuits suspend physics. Replacement/disabling/unmount dispose obsolete work.
- Settings → Simulation → Wire and damage effects persists through settings
  storage and backup. Diagnosis exercises suppress the extra layer. Existing
  static fault/damage cues remain when the new effects are disabled.

## Evidence

The first full unit run covered 2,218 tests: 2,216 passed and two test expectations
failed. Corrected the old settings-whitelist expectation for the new default and
changed the trip fixture to assert the shared protection event, which exists in
basic mode. The focused rerun passed all 19 tests in those two files. Thus all
2,218 unique cases have passing evidence across comprehensive and focused runs;
this is not one uninterrupted green run. New coverage includes real electrical
parity/replay, damage versus trips, stale evidence, saved damage/replacement,
bounded deterministic geometry, and lifecycle disposal/accessibility.

Typecheck and lint passed. Production build and asset/link/SEO/CSP checks passed:
252,084 B initial JS gzip, 26,092 B CSS gzip, 193 built pages. Matter is a separate
lazy chunk (28.07 kB gzip), outside initial JS.

Maximum-scene benchmark: 24 targets, 48 bodies, 900 measured samples after warmup;
median 0.197 ms and p95 0.260 ms against a 4 ms update budget. This measures physics
and path generation, excluding browser paint and the electrical solver.

Exact Bun/local-workerd parity passed all 858 cases; evidence directory
`.wrangler/domain-tests-ub3tOn`. All 20 local Hono/D1/cookie groups passed
(`.wrangler/membership-tests-cdb6us`). All 24 Chromium browser cases passed in
2.6 minutes, including four new effects cases, explicit phone coverage, existing
damage/repair, consumer evidence, Diagnosis Lab and Ohmageddon regressions.

Browser effects update plus SVG-write measurements over 45 displayed frames:
mean 0.300 ms, p95 0.900 ms against 4 ms. The dense 200-component/400-wire idle
fixture measured 16.7 ms frame p95 with zero animated bodies. This is an idle
sample with performance-mode effects suppression, not a dense pan/drag/zoom or
60 fps interaction certification. The recorded screenshot was visually reviewed.

The default gate passed typecheck/lint and collected the comprehensive unit run;
the two corrected test files passed 19 focused checks. A fresh lint passed, then
`verify:phase-1.6 --from build` passed every remaining stage. All phase requirements
have evidence; neither the selected-stage command alone nor the initial failed
run is described as an uninterrupted full green gate.

Logs are retained under ignored `.wrangler/phase16-gate.log`,
`.wrangler/phase16-focused.log`, `.wrangler/phase16-gate-resume.log` and
`.wrangler/phase16-fix-lint.log`. The browser report and screenshot are copied to
`.wrangler/phase16-browser-report.html` and `.wrangler/phase16-effects.png`.
These are local artifacts, not committed.

## Retained limits

F.3 solver/generator timing exceptions and the unmet dense 60 fps interaction
target remain unchanged. This phase does not claim a full green `verify` gate.
Phase 1.9 owns that broader acceptance. No Cloudflare account/resource operation,
remote test, deployment or GitHub publication is included.
