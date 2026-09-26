# ElectraSim v2 — Circuit Generator Foundation Test Plan

## Purpose

The Circuit Generator is implemented but not yet tested.

This plan verifies whether it is stable enough to become the foundation for:

1. Challenge Mode
2. Diagnosis Lab
3. Ohmageddon Mode

**Do not build those consumers until the Foundation Lock passes.**

---

## 1. Testing Rule

First:

1. Inspect the implementation.
2. Audit architecture.
3. Run existing tests.
4. Add missing tests.
5. Run deterministic tests.
6. Run stress tests.
7. Produce a failure report.
8. Fix confirmed defects.
9. Repeat the full test suite.

**Do not refactor merely because code looks ugly.**

---

## 2. 🍝 Spaghetti / Architecture Audit

Before functional testing, inspect the generator for:

- God components/functions
- excessively large files
- generator logic mixed with UI/rendering
- generator logic mixed with simulation
- fault/diagnosis logic inside the generator
- Ohmageddon logic inside the generator
- duplicated generation/validation logic
- hidden mutable global state
- uncontrolled randomness
- circular dependencies
- direct mutation of existing circuit state
- hard-coded component lists duplicating the registry
- scattered difficulty rules
- retry loops without hard limits
- swallowed exceptions
- silent fallback behavior
- tests that mock away the real generator

Report:

```text
Problem
Why it matters
Location
Impact
Suggested direction
```

**Do not refactor during the first audit unless a defect prevents testing.**

---

## 3. Build / Static Checks

Run the repository's actual commands for:

- typecheck
- lint
- unit tests
- production build
- existing integration tests

Record every command and result.

### Pass criteria

- no blocking type errors
- build succeeds
- relevant tests pass
- warnings are documented

---

## 4. Existing Test Suite

Run existing tests **before adding new tests**.

Record:

- passed
- failed
- skipped
- flaky
- baseline failures

This establishes what was already broken versus what the generator introduced.

---

## 5. Generator Unit Tests

Test independently:

### Seed / RNG

- valid seed
- invalid seed
- same seed → same deterministic sequence
- different seeds → normally different output
- seed preserved in metadata

### Generator Version

- version recorded
- version returned in metadata
- version changes are detectable

### Recipes

For every supported recipe:

- resolves correctly
- required components exist
- constraints are respected
- unsupported recipe fails gracefully

### Difficulty

Test:

- Beginner
- Intermediate
- Advanced

Verify the actual constraints applied by each level.

### Component Selection

Verify:

- components exist in the real registry
- unavailable components are never generated
- recipe restrictions are respected

### Topology

Verify:

- valid endpoints
- valid connections
- no nonexistent component/wire references
- required paths exist
- recipe topology constraints are respected

### Layout

Verify:

- valid positions
- usable canvas bounds
- renderable output
- topology/layout consistency

### Validation

Test structural validation and electrical validation independently.

---

## 6. 🔑 Determinism Test — CRITICAL

For fixed:

```text
seed
recipe
difficulty
generatorVersion
```

generate twice.

Expected:

```text
A === B
```

Compare:

- components
- component properties
- connections
- topology
- layout
- recipe
- difficulty
- generator version

Repeat across many seeds.

If identical inputs produce different meaningful circuits without an explicitly documented reason:

> ❌ Foundation Lock FAIL

---

## 7. Different-Seed Diversity

Generate a large seed set and measure:

- unique topologies
- unique component combinations
- unique layouts
- duplicate outputs
- suspicious clustering

Different seeds should produce meaningful variation within recipe constraints.

Do not require every seed to be unique if the recipe has a small valid solution space.

---

## 8. 🔥 Stress Test

Use the **real generator**:

```text
Beginner      1,000 seeds
Intermediate  1,000 seeds
Advanced      1,000 seeds

Total         3,000 generations
```

For every result:

```text
Generate
 ↓
Structural validation
 ↓
Electrical validation
 ↓
Baseline simulation
```

Record every failure.

**Never silently discard failed seeds.**

Example:

```text
FAIL
Seed: 18273
Difficulty: Advanced
Recipe: ...
Stage: topology validation
Reason: ...
```

---

## 9. Failure Reproduction

For every failure:

1. Save seed.
2. Save recipe.
3. Save difficulty.
4. Save generator version.
5. Run again.
6. Confirm same failure.

If it cannot be reproduced, classify it as:

> ⚠️ Possible nondeterministic/flaky failure

Do not simply mark it passed.

---

## 10. Retry / Infinite Loop Test

Test deliberately difficult or impossible inputs.

Verify:

```text
Attempt
 ↓
Failure
 ↓
Retry
 ↓
...
 ↓
Hard limit
 ↓
Graceful failure
```

There must be a bounded retry count.

An infinite hang is:

> ❌ Foundation Lock FAIL

---

## 11. ⚡ Real Simulator Integration

**Do not mock the simulator.**

For generated circuits:

```text
Generated Circuit
 ↓
Existing Circuit Model
 ↓
Existing Simulation Engine
 ↓
Simulation Result
```

Verify:

- simulator accepts generated circuit
- no runtime exception
- no invalid component reference
- no invalid wire reference
- expected behavior is produced
- simulator state is not corrupted

The generator must produce circuits the **real ElectraSim simulator** understands.

---

## 12. Generator → Existing Editor

Load generated circuits into the actual editor.

Verify:

- components render
- wires render
- selection works
- interaction works
- simulation works
- no runtime/React errors

Generated circuits must behave like manually created circuits.

---

## 13. Regeneration

Repeatedly:

```text
Generate
Generate
Generate
...
```

Verify:

- no stale state
- no duplicated components
- no duplicated wires
- no leaked listeners
- no accumulating circuit state
- old generated circuit is replaced correctly

---

## 14. Existing Manual Circuit Regression

Verify the generator does not break the normal simulator.

1. Build a simple circuit manually.
2. Simulate.
3. Edit it.
4. Save/reload where supported.
5. Generate a circuit.
6. Return to the normal workflow.
7. Verify manual circuits still work.

---

## 15. IndexedDB / Persistence

Because IndexedDB already exists, verify:

- generated state saves where intended
- reload restores correctly
- old generated state does not leak into new generation
- existing saved circuits remain readable
- corrupt/unexpected stored data fails gracefully

Do not allow generator testing to corrupt existing persistence.

---

## 16. Performance

Measure:

- average generation time
- maximum generation time
- validation time
- simulation time
- retry count
- repeated-generation behavior

Record at least:

```text
Difficulty
Seeds tested
Average generation time
Maximum generation time
Average retries
Maximum retries
Failures
```

Do not optimize before identifying an actual bottleneck.

---

## 17. Browser / UI Smoke Test

Test:

- first generation
- regeneration
- seed input if exposed
- difficulty selection
- loading state
- error state
- rapid repeated generation
- refresh
- browser navigation where relevant

Check console for:

- uncaught exceptions
- rejected promises
- React errors
- suspicious warnings

---

## 18. Mobile / Responsive Test

Test:

- desktop
- tablet
- phone

Verify:

- controls usable
- circuit visible
- no horizontal overflow
- no broken layout
- touch interaction works

---

## 19. Accessibility Smoke Test

Verify:

- keyboard navigation
- visible focus
- meaningful button labels
- accessible difficulty controls
- understandable generation status
- understandable errors

---

## 20. Robustness / Input Validation

Test:

- invalid seed
- extremely large seed
- negative seed if unsupported
- malformed recipe
- unknown recipe
- invalid difficulty
- malformed persisted data

Expected:

> graceful failure, never corruption or infinite loops.

---

## 21. Regression Seeds

Every discovered bug becomes a permanent regression case.

Example:

```text
Seed: 18273
Recipe: two_way_lighting
Difficulty: advanced
Bug: invalid wire endpoint
```

Then add a test ensuring that seed remains valid.

---

## 22. AI Test Report

The AI coder must finish with:

```text
# Circuit Generator Foundation Test Report

## Environment
Commit:
Branch:
Build:
Runtime:
Generator version:

## Static Checks
Typecheck:
Lint:
Build:

## Existing Tests
Passed:
Failed:
Skipped:

## Generator Tests
Seed/RNG:
Recipes:
Difficulty:
Components:
Topology:
Layout:
Validation:

## Determinism
Seeds tested:
Deterministic:
Failures:

## Stress Test
Beginner:
Intermediate:
Advanced:
Total:
Failures:

## Simulator Integration
Passed:
Failed:

## Editor Integration
Passed:
Failed:

## Persistence
Passed:
Failed:

## Performance
Average:
Maximum:
Retries:

## Architecture Audit
Critical:
High:
Medium:
Low:

## Regression Seeds
Added:

## Final Verdict
PASS / PASS WITH ISSUES / FAIL

## Blocking Issues
...

## Recommended Next Step
...
```

---

# 23. 🚫 AI Must Not Hide Failures

The test agent must NOT:

- silently skip failed seeds
- silently increase retry limits
- weaken validation
- mock away real failures
- modify expected results just to pass
- delete failing tests
- disable type/lint checks
- claim success from one working example

**Report failures first. Fix second.**

---

# 24. 🔒 Foundation Lock

The generator can be declared **FOUNDATION LOCKED** only when:

### Required

- [ ] Typecheck passes
- [ ] Production build passes
- [ ] Relevant existing tests pass
- [ ] Generator unit tests pass
- [ ] Determinism verified
- [ ] Recipes verified
- [ ] Beginner verified
- [ ] Intermediate verified
- [ ] Advanced verified
- [ ] Structural validation verified
- [ ] Electrical validation verified
- [ ] Real simulator integration verified
- [ ] Stress test completed
- [ ] No unexplained generation failures
- [ ] No infinite retry/hang
- [ ] Failure seeds reproducible
- [ ] Critical regression seeds added
- [ ] Existing manual workflow still works
- [ ] IndexedDB remains healthy
- [ ] No critical architecture defect remains

### Recommended

- [ ] Browser UI tested
- [ ] Mobile/tablet tested
- [ ] Accessibility smoke test completed
- [ ] Performance baseline recorded
- [ ] Architecture audit completed

---

# 25. Final Verdict

Use exactly one:

## 🟢 FOUNDATION LOCKED

The generator is stable enough to become the foundation for Challenge Mode.

Next:

> **Begin Challenge Mode implementation.**

## 🟡 PASS WITH ISSUES

The generator works, but non-blocking issues remain.

Fix or document them before depending on the generator.

## 🔴 FOUNDATION FAILED

Critical generator/simulator problems remain.

> **Do not build Challenge Mode yet. Fix the generator and repeat Foundation Lock.**

---

# 26. Golden Rule

The test is successful only when we can confidently say:

> **For a known seed and recipe, ElectraSim repeatedly generates a valid circuit that the real simulator understands, without corrupting the existing application.**

Then:

```text
              🧪 TESTS
                 │
                 ▼
          FOUNDATION LOCK
                 │
                 ▼
       🚀 CHALLENGE MODE
                 │
                 ▼
        🔧 DIAGNOSIS LAB
                 │
                 ▼
          😈 OHMAGEDDON
```

**Do not close the case before the Foundation Lock passes.**
