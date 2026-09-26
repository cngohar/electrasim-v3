# 0003 — Challenge Mode: how "did the learner build the right circuit?" is decided

- **Status:** Accepted
- **Date:** 2026-08-18
- **Phase:** C (Challenge Mode), plan §51 steps 1–11
- **Supersedes:** nothing. **Builds on:** [0002 — Challenge generator foundation](./0002-challenge-generator-foundation.md)

## Context

Challenge Mode shows a brief, lets the learner build a circuit, and then has to
answer one question: **is this the circuit we asked for?**

The plan is deliberately quiet here. A grep across all 2 212 lines for
`compare | equivalen | objective | target circuit` returns five incidental
hits and no definition of correctness. Everything below is therefore a
decision we are making, not a requirement we are transcribing — which is
exactly why it is written down.

Three properties make the naive answers wrong:

1. **Ids are not comparable.** The generator emits `beginner-switched-light-mcb`;
   the learner drags a component that becomes `c-17`. Any id-based diff fails
   on every correct answer.
2. **Order is not meaningful.** Components and wires are arrays, but the
   circuit is a graph. Two identical builds can serialise differently.
3. **Direction is not meaningful.** A wire from the MCB to the lamp is the same
   conductor as one from the lamp to the MCB.

## Decision

Correctness is decided by **four gates, cheapest first**, in
`challenge/evaluator.ts`. A submission must pass all four:

| # | Gate | Question | Implementation |
|---|------|----------|----------------|
| 1 | structure | Do all wires land on real components and ports? | local checks |
| 2 | rules | Does it break an electrical rule? | `validateCircuitRules()` |
| 3 | simulation | Does it actually work, with the expected loads live? | `simulate()` |
| 4 | match | Is it the circuit that was *asked for*? | `challenge/comparison.ts` |

Gates 1–3 reuse the existing engines verbatim, per plan §51 ("reuse existing
electrical rules and simulator"). Gate 4 is the only new logic.

### Why both a "works" gate and a "matches" gate

They answer different questions and we deliberately keep both:

- Passing 1–3 but failing 4 means *"it works, but it is not the exercise"* —
  e.g. the learner wired the lamp straight to the supply, skipping the switch.
- Passing 4 but failing 1–3 should be impossible for a generated target, and
  if it ever happens it is a generator bug worth surfacing loudly.

The learner sees a different message for each, which is the pedagogical point.

### Gate 4: labelled-graph isomorphism

Equality is **never** id equality. A wire is reduced to a canonical signature:

```
`${type}:${portIndex}` per endpoint, the two endpoints sorted lexicographically
→  "mcb:1|lamp:0"
```

Sorting the endpoints makes direction irrelevant. Using type + port index —
never the id — makes relabelling irrelevant.

Comparison then runs in three escalating stages, so the expensive one is
almost never reached:

1. **Component-type multiset.** Cheap, and produces the "add one more MCB"
   diff the checklist renders.
2. **Connection-signature multiset.** Also cheap; produces the "missing
   connection: MCB terminal 2 → lamp terminal 1" diff. A *multiset*, not a
   set, so parallel duplicate wires are counted.
3. **Backtracking isomorphism search**, only if 1 and 2 both pass. Nodes are
   refined by `type#sorted(port>neighbourType:neighbourPort)`, the most
   constrained unmapped node is chosen first with a −1000 bias toward nodes
   adjacent to the already-mapped region, and `consistent()` requires equal
   edge counts into that region plus identical port-pair multisets.

The search is bounded by `ISOMORPHISM_NODE_BUDGET = 200_000`; exhaustion sets
`searchExhausted` and reports "too tangled to check automatically" rather than
hanging or silently accepting. Generated circuits are 4–16 components, so the
budget is never approached in practice.

### What we deliberately do NOT do

- **No behavioural/`simulate()` equivalence as the definition of "matches."**
  It is tempting to call two circuits equal when they energise the same loads,
  but that accepts a lamp wired straight across the supply as equivalent to
  one behind the required switch. Behaviour is checked — as gate 3 — but it is
  not the identity relation.
- **No positional comparison.** Where a component sits on the canvas is a
  layout choice, not a wiring choice.
- **No id, order, or direction sensitivity**, per the reasoning above.

### Symmetric circuits are accepted as equivalent

If the target has two identical branches, swapping them produces a genuinely
isomorphic graph and is accepted. This is correct: the two circuits are
electrically and structurally indistinguishable, so failing the learner would
be arbitrary. Verified — see below.

## Verification

The risk with a hand-written isomorphism search is that it is *wrong in the
same way* as the tests written alongside it. So the stress harness
(`npm run stress:challenge`) cross-checks every verdict against an
**independent 1-Weisfeiler-Leman colour-refinement oracle** that shares no
code with the product implementation.

Full sweep (250 seeds × 3 difficulties):

```
Scenarios generated : 750
Evaluations run     : 4500
Corruptions checked : 3000   (all rejected)
WL-oracle checks    : 841/841 agreement
Evaluation timing   : median 0.11 ms, p95 0.34 ms, max 20.57 ms
```

Per scenario the harness asserts: a correct rebuild under fresh ids and
shuffled arrays passes; dropped wires, rewired endpoints, duplicated
components, deleted components and the bare starting circuit all fail;
scenarios are deterministic; and no target id leaks into learner-visible text.

**Negative controls** (each mutation applied to the source, harness expected to
fail — it did):

| Injected defect | Caught by |
|---|---|
| `isomorphic`/`matches` forced true | stress harness — 6 WL-oracle disagreements |
| match gate removed from the evaluator | stress harness — "extra component ACCEPTED" |
| port index erased from the wire signature | `comparison.test.ts` — port-swap rejection |

The third is worth noting: the stress harness *did not* catch it, because the
isomorphism search's refinement key reads port indices directly and so remains
correct even when the signature is degraded — the damage is confined to
diff-message precision. That is defence in depth rather than redundancy, and
it is the reason both layers are kept.

## Consequences

**Good**

- A learner's circuit is judged on wiring, not on ids, ordering or layout.
- Cheap gates produce the actionable diffs; the expensive search runs rarely.
- Sub-millisecond typical evaluation, so it can run on every edit.
- `comparison.ts` is pure and UI-free: no store, no simulation, no persistence.

**Costs / limits**

- Isomorphism is worst-case exponential. Mitigated by the node budget and by
  the 4–16 component envelope the generator guarantees (ADR 0002).
- Symmetric alternatives are accepted (argued above as correct, but it is a
  choice).
- Signatures are type-level, so two components of the same type with different
  `state` (e.g. a 6 A vs a 16 A MCB) are interchangeable in gate 4. Ratings are
  still enforced electrically by gates 2–3, and the objective panel labels the
  required rating explicitly.

## Related

- `src/domain/challenges/challenge/comparison.ts` — the comparison engine
- `src/domain/challenges/challenge/evaluator.ts` — the four gates
- `src/domain/challenges/challenge/scenario.ts` — briefing built on the generator
- `src/domain/challenges/challenge/scoring.ts` — plan §17/§18 scoring
- `scripts/stress-challenge-mode.ts` — the harness described above
