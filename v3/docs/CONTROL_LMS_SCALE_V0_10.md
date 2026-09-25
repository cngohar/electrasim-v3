# Control circuits, LMS evidence, and scale v0.10

Status: internally implemented and validated; external electrical-SME, instructor-pilot, and production-capacity review remain required.

## Control circuits

A generic AC control coil is now a solved complex-impedance component with A1/A2 terminals, rated voltage, and explicit controlled-contact ids. During each deterministic simulation step:

1. the network is solved with normally-open contacts open;
2. coil terminal voltage is compared with a bounded 85% educational pickup threshold;
3. assigned relay/contactor contacts are closed in a second solve; and
4. pickup/release events are emitted.

The validator rejects coil references to missing or incompatible equipment. This is an educational deterministic coupling model, not a manufacturer pickup/dropout tolerance, contact utilization category, or certified control assembly.

## Durable LMS submissions

`POST /api/simulator/lesson-submissions` now requires an authenticated identity and stores immutable lesson evidence through `SimulatorLessonSubmissionService`. `GET` returns only the current learner's submissions.

PostgreSQL migration `0011_simulator_lesson_submissions.sql` adds:

- immutable submission id and learner ownership;
- lesson id and exact circuit revision;
- completion result and structured deterministic evidence;
- submission timestamp;
- forced row-level security with owner-only read/insert policies; and
- narrow application-role grants.

The workbench exposes **Submit to LMS** after local lesson evaluation. Instructor templates continue to use the same circuit-evidence evaluator. Instructor assignment/review policy should be added through bounded workspace functions rather than weakening learner-owner RLS.

## Scale

A 100-parallel-branch, 104-component authored circuit is validated and run through the real worker host under its five-second bound. The test verifies all eleven snapshots and every component result. Worker queue, cancellation, timeout, and production bundle checks remain in v0.9.

## Validation

The complete repository gate passes with 164 tests and 787 assertions, strict TypeScript, Biome, server/worker bundles, and no failures.

## Deliberate boundaries

- Exact coil/contact curves and utilization categories require authoritative manufacturer datasets and SME review.
- Transformer coupling is not represented yet; inventing an independent secondary source would be electrically misleading.
- Instructor cross-tenant access, assignment deadlines, grading rubrics, and roster release require the broader authenticated LMS assignment model.
- Production load testing, hardware/device comparisons, and instructor/learner pilots remain external gates.
