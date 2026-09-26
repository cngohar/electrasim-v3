# ADR 0006 — Seed Share / Replay Format

**Status:** Accepted · **Phase:** Post-F audit (plan §30, §47; constraints §3, §6, §48)

## Context

Plan §30 requires a "Copy Seed" affordance: a learner must be able to hand an
exercise to a tutor, attach it to a bug report, or return to it later, and get
back *the same exercise*. Nothing in the tree implemented it — no copy control,
no replay entry point, no codec.

Two constraints shape the answer:

- **§3 / §48 — no backend, no accounts, works offline.** There is nowhere to
  store a shared exercise and no id server to mint short links.
- **§6 — generator versioning is explicit.** A challenge's identity is
  `seed + difficulty + mode + generatorVersion` (+ rage tier). The same seed
  under a different generator version is not guaranteed to be the same circuit.

The tempting shortcut is to serialise the generated circuit itself. That would
be self-contained, but it is the wrong artefact: it is large, it duplicates
state the generator already derives deterministically, it would drift out of
sync with the component registry, and it would ship the *answer* — the faulted
circuit — inside a string learners are encouraged to paste around.

## Decision

### 1. Share the identity inputs, never the circuit

The ticket carries exactly the values the generator treats as canonical:

```
ES{generatorVersion}:{seed}:{difficulty}:{mode}[:{rageTier}]
```

The circuit is a pure function of those inputs, so replay re-runs the generator
rather than restoring a snapshot. The ticket stays a handful of bytes, cannot
drift from the generator, and reveals nothing: reproducing the exercise requires
running the generator, which is exactly what the learner was going to do anyway.
The fault and its location are never encoded.

### 2. Human block for humans, machine line for machines

`formatShareText` emits a labelled `Seed: / Difficulty: / Mode:` block with a
trailing `Code:` line. The block is what a learner actually pastes into a
message; the `Code:` line is what the parser looks for. `formatShareCode` emits
the bare code for constrained surfaces.

### 3. Parsing is tolerant, but never guesses

`parseShareText` accepts the whole pasted block, a bare code, or a bare seed
number, and is case- and whitespace-insensitive — real pasted text is messy, and
rejecting it on a stray newline would make the feature useless. It finds the
code inside surrounding prose. When it cannot find a defensible interpretation
it returns `null` (surfaced as §47's "doesn't look like a seed") rather than
silently starting *some* exercise, which would be worse than refusing: the
learner would believe they were looking at their tutor's circuit.

### 4. Version mismatch is reported, not suppressed

A ticket from a different `generatorVersion` is still replayed — refusing would
strand old links — but `ParsedShareTicket.versionMismatch` is set and the UI says
so. Per §6, the honest position is "this may not be identical", not a silent
substitution and not a dead end.

### 5. Mode-agnostic by construction

`mode` is part of the ticket, so one codec serves Diagnosis, Challenge and rage
exercises. Both panels share a single `useCopyToClipboard` hook so the
affordance behaves identically. (The first implementation pass shipped Diagnosis
only; §30 is mode-agnostic and Challenge Mode had no seed affordance at all.
Worth remembering that a plan section written without a mode name applies to
every consuming surface.)

## Consequences

- Replay is exact, offline, and free of storage — no backend, no share endpoint,
  no analytics, consistent with §3 and §48.
- A ticket is safe to paste in public: it identifies the circuit, not the answer.
- Changing the generator's output for a given seed is a **breaking change to
  shared tickets** and must bump `GENERATOR_VERSION`, which is what makes the
  mismatch notice meaningful.
- The codec is pure domain (`src/domain/challenges/share.ts`) — no clock, no
  storage, no DOM — so it is fully unit-testable. The round-trip test rebuilds a
  real scenario from a formatted ticket and asserts an identical
  `faultedCircuit`, so the codec cannot pass while reproducing a different
  circuit.

## Alternatives rejected

- **Serialise the circuit.** Large, redundant, leaks the fault, drifts from the
  registry.
- **Hash-only / short id.** Requires a lookup table, therefore a backend.
- **Base64 the whole ticket.** Opaque to humans; the point of the block is that a
  learner can read and retype it.
