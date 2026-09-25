# Guided diagnostics v0.8

Status: internally implemented and deterministic; instructor/pilot feedback and independent electrical-SME review remain external gates.

## Exercises

The simulator exposes five deterministic diagnostic fault fixtures:

- open CPC / equipment grounding conductor;
- high-resistance joint;
- unintended neutral-earth bond;
- 2 MΩ insulation damage with modeled capacitance;
- equal-resistance parallel continuity path.

They are available from the scenario selector and `/api/simulator/run`. They intentionally model evidence, not a universal pass/fail threshold.

Three guided evaluations are available in the workbench and through `GET|POST /api/simulator/lessons`:

1. build a protected lamp circuit;
2. diagnose an open CPC / EGC;
3. measure damaged insulation and complete discharge.

Each lesson contains instructor-template metadata, ordered learner instructions, and deterministic checks evaluated from the submitted schema-v2 circuit. The POST response includes the circuit revision so a future durable LMS submission can bind the evaluation to an immutable project revision rather than trusting a browser-only score.

## Safety closure

Normal simulation is now prohibited inside `runSimulation` whenever the persisted diagnostic session is locked. This domain boundary supplements, rather than relies on, the UI lock.

`release_lock` is accepted only after:

- lockout was established;
- test-for-dead and re-prove completed;
- stored test voltage is zero;
- automatic discharge is complete; and
- the workflow is in a dead-testing state.

After release, the normal simulation boundary permits a controlled re-energization attempt. The UI warns users to inspect repairs and protection before doing so.

## Deliberate boundaries

- Lesson completion is deterministic simulator evidence, not trade certification.
- Durable learner/instructor submission storage still requires the authenticated LMS assignment schema and product workflow checkpoint.
- Instructor templates do not imply that any jurisdiction has approved the lesson.
- Pilot outcomes, accessibility testing with representative users, hardware comparisons, and expert safety approval remain external release gates.
