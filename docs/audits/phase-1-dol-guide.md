# Phase 1.5E.3 — DOL guide and complete three-phase acceptance

Date: 2026-10-07. Status: **complete locally within the declared three-phase teaching scope**.

The DOL guide now uses one explicit five-terminal 400 V L-L, 50 Hz ABC source,
a declared 3 kW electrical-input balanced-resistive motor and a 230 V L1-N
contactor coil. A maintained switch controls A1; A2 returns to source N.
The three original power poles and motor terminals retain their indices, and
PE runs directly from the source to the motor frame. Existing stored drawings
are not silently rewritten.

This teaches maintained coil control, not a momentary start/stop seal-in
circuit. Torque, inrush, heating, timed three-phase protection, linked breaker
operation, coordination and repair assessment remain unassessed. The guide
explains those boundaries and includes phase-loss and sequence exercises.
Guide cards now display the domain's actual nonblocking limitation messages
instead of describing every partial model as manual switching only.

Guide cloning now deep-copies the entire portable circuit, including nested
source, motor and coil settings, so editing one loaded guide cannot mutate
future loads of the template.

## Entry paths and completion review

The E.3 gate includes the E.0–2 numerical, source/editor, motor/coil, saved-state,
fault and runtime regressions as well as the real desktop/phone DOL deep link.
The shared DOL fixture matrix exercises the authored guide running, stopped,
with a lost motor phase, an open coil return, reversed motor leads and an
undeclared motor. These exact documents are replayed through Bun/workerd,
authenticated local Hono and actual browser Comlink. The source suite retains
L-N/L-L edits, confirmed sequence changes, persistence, imported fault state
and source placement; the motor suite retains operating-range editing,
runtime phase loss/recovery and running locks.

Guide checklist completion is not a repair or safety assessment. The current
generic checklist requires a finding-free result, so the DOL guide deliberately
does not earn completion while its protection/mechanical models remain
unassessed, even when the declared motor runs. A regression asserts this for
every DOL fixture and separately asserts running, stopped and blocked states.
Broader authored lesson objectives and completion semantics remain in 1.5F;
E.3 does not weaken this guard to turn a running motor into a safety pass.

## Earlier focused acceptance

- All project typechecks and the domain boundary pass.
- Repository lint passes.
- 44 tests across templates, template-picker UI and motor models pass.
  New cases verify motor running/stopped states, phase-loss and reversed-lead
  blocking, retained false repair verdicts and independent nested copies.
- Desktop and 390 x 844 phone browser acceptance loads the actual guide deep
  link with a real local paid session, runs through Comlink, operates the
  maintained switch and checks the motor stops.

Commands: `bun run typecheck`, `bun run lint`,
`bun x vitest run packages/domain/src/templates.test.ts src/ui/components/TemplatesModal.test.tsx packages/domain/src/core/motor.test.ts`,
`bun x playwright test e2e/dol-guide.spec.ts --project=chromium --workers=2`.

## Complete gate evidence

Reproducible command: `bun run verify:phase-1.5e3`. The initial run passed all
project typechecks and stopped at the fixture's `noDelete` lint rule. Replacing
that deletion with an undefined assignment leaves the portable fixture
unchanged. The domain typecheck passed again, followed by a focused gate resume
using `bun run verify:phase-1.5e3 --from lint`. Every required stage has passing
evidence across these runs; the selected run alone is not a full-gate claim.
Logs: `.wrangler/phase15e3-{initial,resume,fixture-types}.log`.

- **151-module** pure domain boundary and all project typechecks passed;
  repository lint passed across **766 files**.
- **134 Vitest files / 2,178 tests** passed.
- Vite/Astro/postbuild and unchanged asset budgets passed: initial JavaScript
  **251,902 B gzip / 300,000 B**, initial CSS **26,165 B / 30,000 B**.
  Internal links passed for **193 HTML files**, SEO for **191 pages**, and CSP
  source/build consistency passed.
- **800 exact Bun/workerd cases** passed, including 24 additional DOL replay
  cases. Evidence: `.wrangler/domain-tests-638oVn/`.
- **17 actual local Worker/D1/cookie groups** passed, with the DOL matrix
  included in the authenticated phasor replay group.
  Evidence: `.wrangler/membership-tests-dshOwv/`.
- **35 Chromium cases in eight files passed** in 3.5 minutes, including the
  actual desktop/phone DOL guide and exact direct-domain/Comlink/local-Hono
  replay of all six DOL fixtures.

Existing MNA benchmark correctness assertions passed. Median/p95: series
**0.91 / 1.46 ms**, isolated transformer **0.68 / 1.44 ms**, cascade
**0.74 / 1.18 ms**. Dense 200–256-component fixtures measured
**44.76–66.88 ms median / 53.76–98.32 ms p95**. Dense solver and 60 fps
rendering targets remain open; no performance budget changed.

Full lab migration and legacy retirement remain in 1.5F. No deployment, remote
Cloudflare operations, credentials or database migrations were involved.
