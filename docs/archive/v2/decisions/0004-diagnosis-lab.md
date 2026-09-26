# 0004 — Diagnosis Lab: proving a fault was actually fixed

- **Status:** Accepted
- **Date:** 2026-08-18
- **Phase:** D (Diagnosis), plan §11–§22, §33, §41, §57
- **Supersedes:** nothing. **Builds on:** [0003 — Challenge Mode comparison](./0003-challenge-mode-comparison.md)

## Context

Challenge Mode asks *"can you build this?"*. The Diagnosis Lab asks the harder
question: *"this installation is broken — what is wrong, where, and can you put
it right?"*

Two constraints shape everything below.

**§57 forbids touching the core generator to support individual fault types.**
The generator produces healthy circuits; faults are injected on top by a
separate layer. Nothing in `src/domain/challenges/generator/**` knows a fault
exists.

**§16 says a correct guess must never, on its own, complete the exercise.**
This is the whole pedagogical point. A learner who picks the right radio button
from a list of five has demonstrated recognition, not competence. They must
also *repair* the installation and have the simulator confirm it works.

## Decision

### 1. Three-state verdicts, not pass/fail (§41)

`evaluateDiagnosis` returns `'success' | 'incomplete' | 'failure'`:

| Diagnosis | Repair | Verdict | Why |
| --- | --- | --- | --- |
| wrong | anything | `failure` | recognition failed; costs an attempt, exercise continues |
| right | not done | `incomplete` | §16 — the guess alone is worth nothing |
| right | done, simulation recovers | `success` | the only way to finish |

`incomplete` is deliberately *not* a failure. The learner has reasoned
correctly and is mid-repair; punishing that would teach them to guess less
rather than to work more carefully.

### 2. Recovery is measured, never asserted

We never trust "the fault object is gone" as proof of repair. Success requires
`isFullRecovery` — a fresh simulation of the learner's circuit whose symptom
diff against the healthy baseline is empty. Every de-energised load must be
live again.

This closed a real loophole. `isFaultResolved` returns **true when the faulted
target is deleted**, so "select the broken wire, press Delete" cleared the
fault while leaving the load dead. `describeStructuralGap` now chains after
`describeRecoveryGap` and compares the connection multiset against the healthy
circuit, reporting deficits only. Deleting a faulty wire is graded
`incomplete`; deleting it *and running a replacement* is `success` — which is
exactly what an electrician does. `scripts/stress-diagnosis.ts` asserts both
halves on every seed.

### 3. Faults are injected only where the plan allows

`withScenarioFaults` writes **only** `Circuit.faults` (§13); the legacy
`component.state.fault` / `wire.fault` paths stay untouched. Candidate
selection lives in `faults/eligibility.ts`, and `open-earth` is excluded via
`NON_DIAGNOSABLE_FAULTS` because it is behaviourally silent — a fault with no
observable symptom is an unfair exercise, not a hard one. Every generated
scenario asserts `symptom.observable` before it is handed to a learner.

### 4. The brief describes symptoms, never causes (§14)

`describeSymptom` is written so it *cannot* name a fault type: it reports what
is dead, what tripped, what blew. The complaint reads "The LED Bulb (9W) is
dead", never "there is an open circuit". Hints escalate in three levels, and
only the final one may narrow to a location. The stress harness greps the
complaint, brief, expected behaviour and every non-final hint for the fault
type on all 600 scenarios, and an e2e test re-checks the rendered DOM.

An earlier draft leaked the answer through the UI rather than the copy: the
repair button was gated on `faultAtSelection`, so it only enabled when the
learner clicked the genuinely faulty item — a perfect oracle. The button is now
gated on `canSubmit` alone and logs neutrally.

### 5. Framing the circuit is part of correctness (§33)

A diagnosis exercise you cannot see is not an exercise. Two defects here were
invisible to the entire unit suite and only surfaced by reading screenshots:

- The panel covered the circuit, because the fit maths assumed a fixed 420px
  dock offset.
- On a phone the circuit collapsed into an illegible ~12px clump.

The cause of the second one is worth recording. `CircuitCanvas` renders with a
fixed `viewBox` of 1200×720 and `preserveAspectRatio="xMidYMid meet"`, so there
is a scale factor between CSS pixels and SVG user units — 0.325 on a 390×844
phone. `viewportStore.zoomToFit` works in **user units** and takes a size with
no origin. Passing it `getBoundingClientRect()` pixels therefore applied the
meet-scale twice *and* centred on the whole canvas.

`src/ui/canvas/fitRegion.ts` replaces that: it converts the canvas rect to user
units, subtracts the **measured** rects of every `[data-canvas-occluder]`
element, keeps the largest remaining strip, and centres the circuit in it. The
occluders are measured rather than hard-coded, so the phone sheet, the narrow
`w-56` tablet dock and the `lg:w-[340px]` desktop dock all work with no
device-specific constants. A near-fullscreen panel falls back to the whole
canvas rather than producing a sliver.

Note the selector is `[data-canvas-occluder]`, not `[role="region"]`: a CSS
attribute selector cannot match the *implicit* ARIA role a named `<section>`
carries, so the role-based selector silently matched nothing.

## Consequences

- **Guessing is closed off** — verified exhaustively: for every scenario, every
  decoy location is rejected even when the circuit is fully repaired.
- **Deleting things is not a repair shortcut**, and the guidance says so.
- **Fault injection is confined** to the diagnosis layer and the stress
  harness; §57's "do not modify the core generator" holds.
- **Layout has test coverage.** `fitRegion.test.ts` (18 tests) pins the
  arithmetic and `e2e/diagnosis-lab.spec.ts` asserts on real rendered geometry
  at desktop and phone that no component overlaps the panel.
- **Cost:** the fit runs on a `requestAnimationFrame` after each new scenario so
  the panel has been laid out and can be measured. If a future panel covers the
  canvas without setting `data-canvas-occluder`, framing silently ignores it.

## Verification

- 3 new unit files this phase plus `fitRegion.test.ts`; full suite green.
- `npm run stress:diagnosis` — 600 scenarios, ~11 000 evaluations, build p95
  1.9 ms, eval p95 0.2 ms, all invariants held.
- `e2e/diagnosis-lab.spec.ts` — 8 tests × chromium + mobile-chrome, all passing.
