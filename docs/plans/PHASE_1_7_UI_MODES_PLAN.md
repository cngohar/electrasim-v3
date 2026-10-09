# Phase 1.7 — Simulator UI and modes

**Complete locally, 2026-10-09:** [acceptance and retained boundaries](../audits/phase-1-ui-modes.md).

## Accepted direction

The user approved the standalone `docs/design/phase-1.7` design on 2026-10-09,
including the existing Lab Glass colors and themes, a new canvas-first shell,
workspace rail, searchable library, contextual Inspector and bottom simulation
controls. Device icons are the default; Settings offers symbols or both. Both
must remain inside the same device frame. Correct the preview lamp terminals;
production uses canonical domain terminal positions in every appearance mode.

## Continuous local delivery

1. Correct preview anchors and record the accepted design.
2. Persist and validate the appearance preference; share artwork across canvas,
   library and Inspector without changing geometry, circuit data or results.
3. Rebuild desktop/phone navigation and panel layout around existing actions.
4. Clarify Basic/Pro versus membership, configuration locks, current readings,
   readiness, simulation time controls and keyboard-accessible circuit netlist.
5. Run affected tests during development, then one consolidated local gate;
   recover only affected failures, recording full versus focused evidence.
6. Update acceptance/progress and deliver a scoped local commit.

## Acceptance

Typecheck/lint, unit tests, build/asset/link/SEO/CSP budgets; local membership and
simulator API flows; browser checks for desktop/phone/light/dark, all appearance
modes with invariant terminal/wire geometry, preference reload, keyboard netlist,
mode switching, actual run/stop and repair/consumer/lab regressions. Measure the
existing dense workload and report it without relaxing budgets. Existing F.3
solver/generator and dense-interaction exceptions remain explicit. Phase 1.8
admin UI and Phase 1.9 full acceptance remain separate.

No remote testing, Cloudflare operations, deployment or GitHub publication.
