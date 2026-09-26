# ADR 0005 — Ohmageddon Foundation

**Status:** Accepted · **Phase:** E (plan §23–§28, §42, §51 Phase E, §52, §57)

## Context

Ohmageddon Mode is the plan's opt-in "deliberately difficult" diagnostic mode.
It arrives with two hard constraints that pull in opposite directions:

- §25: *"Do NOT create a separate Ohmageddon Generator. Use the same generator
  and add scenario modifiers."*
- §26: it *"must NEVER make the electrical simulation dishonest"* —
  **"Rage against the circuit, not against physics."**

The obvious implementation (a rage generator that fabricates nastier circuits)
violates both. The interesting question is how to make a puzzle harder using
only truthful electrical states.

## Decision

### 1. Modifiers, not a generator

`generateChallenge()` is untouched and remains locked per §57. Rage is a list of
**composable modifiers** applied at three points of the *existing* diagnosis
pipeline (`src/domain/challenges/rage/`):

```
generateChallenge()          ← locked, no rage logic
      ↓ healthy circuit
① transformCircuit           ← red herrings
      ↓ re-validated circuit
② rankCandidates             ← push the fault away from the symptom
      ↓ chosen fault + measured symptom
③ adjustPresentation         ← ration hints
      ↓
DiagnosisScenario
```

Each hook is optional; a modifier declares only the stage it needs. Nothing in
`generator/**` imports from `rage/**`, which keeps the §57 gate checkable by
inspecting imports.

### 2. Honesty is enforced, not promised

`applyCircuitStage` pushes any modified circuit back through the **same**
`validateCandidate()` the generator uses — structure, connection rules, BS 7671,
and both simulation modes — and additionally compares declared-load behaviour
before and after. A modifier whose output fails either check is **discarded**
and the unmodified circuit is kept. There is no relaxed "rage-only" validator.

The component budget is the single deliberate exception: a red herring is an
extra component by definition, so enforcing the difficulty's component ceiling
would reject the modifier for doing its job.

### 3. Determinism by construction

Every hook receives a forked, labelled RNG (`rage:circuit:<id>`, etc.), so
adding, removing or reordering a modifier cannot shift the stream another
modifier sees. Same `(seed, difficulty, tier)` ⇒ byte-identical scenario;
asserted over 1,440 scenarios in the stress harness.

### 4. `rage: null` is the §24 safety guarantee

`DiagnosisScenario.rage` is `null` unless an explicit `rageTier` was passed.
The domain never reads settings, so the only boundary between the normal and
rage worlds is one parameter, gated in exactly one place —
`diagnosisStore.start()`:

```ts
const effectiveTier = useSettingsStore.getState().ohmageddonMode ? rageTier : undefined;
```

A stale UI, a resumed record or a future caller therefore cannot conjure a rage
exercise while the setting is off. `resume()` discards a saved rage run rather
than downgrading it, since a downgrade would silently change the puzzle.

## The three shipped modifiers (§52)

| Modifier | Mechanic | Why it is honest (§26) |
|---|---|---|
| `redHerring` | Splices a Wago / terminal strip / junction box into a live run | All three are `isPassThrough` + `isJunction`: the simulator treats them as a straight-through connection. Run length is split in half, so total length — and therefore voltage drop and Zs — is unchanged. Listed verbatim under §26 "Red-herring components". |
| `remoteFault` | Restricts selection to the candidates furthest (in graph hops) from the symptom | Changes *which* eligible fault is chosen, nothing about the fault or the simulation. §26 "Fault farther from symptom". First consumer of `maxFaultDistanceFromSymptom`, which Phase A declared and left unread. |
| `limitedHints` | Drops the later hints, location hint first | Withholds assistance; never misinforms. At least one hint always survives. §26 "Fewer hints". |

The red-herring design was validated *before* it was written: 2,745 splices
across 180 generated circuits, **99.1%** accepted by the unmodified
`validateCandidate` gate, every accepted one behaviourally identical to its
parent. The 0.9% are rejected by an existing compat rule — the safety net
working as intended.

### Deliberately not shipped *(superseded by Phase F)*

All four names that were stubs at Phase E now ship. See the Phase F1–F6
addenda: plural `scenario.faults` unlocked `multiFault` / `compoundFault`;
`isMisleadingPlacement` unlocked `misleadingSymptom`; the optional Rage 4
timer unlocked `timeLimit`. There is no remaining unimplemented modifier
in the §25 vocabulary.

## Tiers (§27)

§27 warns: *"Do not initially create dozens of Rage levels."* Three ship:

| Tier | Modifiers | Deviation from §27 |
|---|---|---|
| Rage 1 | `redHerring` | none — exactly "1 fault + 1 red herring" |
| Rage 2 | `remoteFault`, `limitedHints` | §27 asks for `misleadingSymptom`; substituted `remoteFault` (same intent — the obvious place to look is wrong — via a mechanic the simulator supports truthfully) |
| Rage 3 | `redHerring`, `remoteFault`, `limitedHints` | §27's "2 faults" half deferred to Phase F; shipped as the single-fault version |

Rage 4 is not shipped: it needs `compoundFault` and `timeLimit`. The tiers are
labelled for what they actually do rather than what they were named — §24's
rule that the mode must not mislead the user cuts both ways.

## Consequences

**Measured escalation** (120 seeds × 3 difficulties × 4 modes, `stress:ohmageddon`):

| difficulty | mean fault distance (normal → rage-2 → rage-3) | mean hints |
|---|---|---|
| beginner | 0.61 → 1.30 → 1.98 | 3 → 2 → 1 |
| intermediate | 0.95 → 2.72 → 2.89 | 3 → 2 → 1 |
| advanced | 0.70 → 1.95 → 2.25 | 3 → 2 → 1 |

The harness *fails* if escalation stops being measurable, so "harder" can never
become a label with nothing behind it. Build p95 is 2.67 ms against a 200 ms
budget.

**A decoy is never the fault.** `applyCandidateStage` filters every
decoy-touching candidate before any modifier runs. A red herring that could
turn out to be the culprit is not a herring, and a learner who learns "the odd
extra Wago is always it" has learned a pattern rather than a skill.

**Testing note worth keeping.** Four negative controls were run against this
work. Two initially *failed to fail*, and both revealed genuinely weak tests:

1. Deleting the decoy-exclusion filter still passed, because the original test
   only sampled the *selected* fault — and with ~14 of ~31 candidates touching
   the decoy, weighted selection lands on one too rarely. Replaced with an
   assertion over the whole candidate list.
2. Disabling the `validateCandidate` honesty gate still passed, because the
   shipped modifiers are honest, so nothing exercised the gate. Added a test
   that injects a deliberately dishonest transform — using a *stray unwired
   component* (structurally invalid, electrically inert) so it isolates the
   validator limb rather than tripping the behavioural one too.

**One defect was found only by reading a rendered screenshot.** The decoy's id
was `<wireId>-decoy`, and `ComponentNode.tsx` prints `component.id` beneath
every device — so the red herring announced itself on the canvas in plain text.
No unit test was looking. Decoys are now named `<prefix>-jN`, matching the
generator's own convention, and both a unit test and an e2e test lock it. This
is the third time in this project that screenshot review has caught a UI defect
the suite missed.


---

## Addendum (Phase F3) — `compoundFault`, and where a claim gets proved

**Context.** §26 asks for scenarios where one fault hides another. That is a
statement about the electrical world, so it has to be *proved*, not arranged.

**Decision 1 — the proof lives in `diagnosis/`, not in the modifier.**
`rage/**` may not import the simulator (only `runner.ts` does), and the runner
has no access to the scenario's healthy baseline, which masking is measured
against. So the modifier only *proposes* partners, nearest-load-first, and
`tryBuildScenario` proves or rejects the masking. This keeps the layering rule
from ADR 0005 intact and puts the electrical judgement where the electrical
context already is.

**Decision 2 — masking is judged on the learner-visible world only.**
`sameObservableWorld` compares dead loads, tripped protection and blown
components; it ignores `newErrorWires` / `newErrorComponents` / `newErrors`.
Not a simplification — a correction. Every wire fault adds its own wire to
`errorWires`, so a predicate including them reports "different" for every pair
in existence (0 of 67,476 in the first probe). The flags describe the
simulator's bookkeeping; masking is about what the learner can observe.

**Decision 3 — a failed proof degrades the scenario, it does not reject the
seed.** The primary fault is chosen before the compound search starts, so
rejecting unmaskable seeds would silently bias which circuits and which fault
families ever appear. Instead the exercise ships as a plain multi-fault and the
summary says so. Measured honest compound rate: 52.5 % of rage-4 scenarios.

**Decision 4 — an authoritative later verdict must replace the earlier
optimistic row.** `buildRageSummary` merges duplicate modifier ids with
"applied anywhere wins". Appending the masking verdict next to the selection
stage's provisional row therefore let the optimistic one win, and 71 of 120
scenarios claimed a compound that did not exist. The verdict now splices the
proposal out. **Anywhere two stages write the same modifier id, this hazard
exists.**

**Decision 5 — Rage 4 omits `remoteFault`.** Two individually-correct modifiers
can cancel out: compound masking needs a partner inside the branch the primary
de-energises, `remoteFault` needs the most distant band, and the intersection is
usually empty — the failure that once made Rage 3 ship a single fault. Rage 4 is
therefore *shorter* than Rage 3 and harder, so tier escalation is now asserted
on the learner's burden rather than on modifier count.

**Consequence for the UI.** A compound fault is unobservable unless the panel
re-reads the circuit, so `observeSymptom` was added to the diagnosis domain and
the panel now renders live evidence. §14 is preserved by reusing the same vague
`describeSymptom` phrasing: it reports what is seen, never what is wrong.

---

## Addendum (Phase F4–F6) — `misleadingSymptom`, Rage 2 swap, optional timer

**Decision 6 — a misleading symptom is a selection, never a rewrite.**
`misleadingSymptom.rankCandidates` drops candidates that sit on a declared
load. That is only a heuristic: the complaint is written from the *measured*
symptom, so the authoritative verdict lives in `tryBuildScenario` via
`isMisleadingPlacement` (dead load → the load, its terminals, its incident
wires). The summary *replaces* the proposal row, same as Decision 4.

**Decision 7 — Rage 2 retires the `remoteFault` stand-in.** §27 asked for
"1 fault + misleading symptom + reduced hints". Phase E substituted
`remoteFault` because the proof did not exist. They are not the same
modifier: a jammed MCB one hop from the lamp is misleading ("the lamp is
dead") without being remote. Rage 3 keeps `remoteFault`.

**Decision 8 — the Rage 4 timer is 1.5× par, and expiry scores what was
found.** Scoring still rewards finishing *under* par, so the hard stop sits
above the medal cutoff. Hitting zero ends the session as `timed-out`,
scores `faultsIdentified` so far, and does not invent a fail. Untimed
tiers keep `timeLimitSeconds: null`.

**Current tiers (Phase F complete).** The Phase E table above is historical.

| Tier | Modifiers | Notes |
|---|---|---|
| Rage 1 | `redHerring` | unchanged |
| Rage 2 | `misleadingSymptom`, `limitedHints` | Decision 7 |
| Rage 3 | `redHerring`, `remoteFault`, `multiFault`, `limitedHints` | two faults |
| Rage 4 | `redHerring`, `compoundFault`, `limitedHints`, `timeLimit` | Decision 5 + 8 |
