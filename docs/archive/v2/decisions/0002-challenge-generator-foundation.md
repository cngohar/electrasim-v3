# ADR 0002 — Challenge Generator Foundation

- **Status:** Accepted
- **Date:** 2026-08-18
- **Phase:** ElectraSim v2 · Phase A (Circuit Generator Foundation)
- **Deciders:** Project owner

## Context

The ElectraSim v2 plan (§1–§12, §29–§39, §51, §57) introduces three learning
modes — Challenge Mode, Diagnosis Lab and Ohmageddon — that all need the *same*
thing first: a **deterministic generator that emits electrically valid
ElectraSim circuits**.

The plan is explicit that the generator is a foundation, not a feature:

- §7 — the core generator *stops* after producing a valid circuit. Fault
  selection, injection, diagnosis and Ohmageddon modifiers are **not** part of
  it.
- §51 — Phase A ends at "generator unit tests", with a hard **STOP** before
  Challenge Mode.
- §57 — a Generator Foundation Gate must pass before any learning mode is
  allowed to consume the generator.
- §58 — do not rewrite the simulator, duplicate fault logic, create a second
  `Circuit` model, or use uncontrolled randomness.

The existing repository already provides everything the generator must reuse:

| Capability | Existing module |
| --- | --- |
| Circuit / component / wire model | `src/domain/types.ts` |
| Component registry (99 types, ports, ratings) | `src/domain/components/` |
| Simulation engine (pure, worker-safe) | `src/domain/simulation/` |
| BS 7671 validation + compliance | `src/domain/circuitValidation.ts`, `compliance.ts` |
| Terminal / connection rule engine | `src/domain/electrical/` |
| Cable ampacity & voltage drop | `src/domain/electricalCalculations.ts`, `simulation/tripCurves.ts` |
| Fault registry & engine | `src/domain/faults.ts` |
| Hand-authored teaching circuits | `src/domain/templates.ts` |

Two constraints emerged from reading those modules that shape the design:

1. **`src/store/seed.ts` is a demo *circuit* builder, not a PRNG.** There is no
   deterministic random source anywhere in the project, and `Math.random` is
   used only for cosmetic animation. A new PRNG module is therefore required.
2. **The validators are deliberately conservative.** Three of them constrain
   what a generated circuit may contain:
   - `circuitValidation.ts` assumes **1.5 mm²** for any wire that declares a
     `lengthMeters`, so a protective device is flagged `mcb_overrated_group`
     (error) whenever its rating exceeds **20 A**.
   - `compliance.ts` walks *every* path from a load back to *any* source when
     estimating voltage drop, so long default cable runs accumulate drop across
     unrelated branches.
   - `simulation/simulate.ts` compares one **circuit-wide** load current against
     *every* protective device, so the smallest breaker rating in the circuit
     bounds the total connected load.

## Decision

We add a new, self-contained domain area `src/domain/challenges/` whose Phase A
surface is a **pure, deterministic, versioned circuit generator**.

```text
src/domain/challenges/
├── types.ts                    # shared challenge vocabulary (no duplicated domain types)
├── difficulty/profiles.ts      # beginner / intermediate / advanced profiles (§9)
├── generator/
│   ├── seed.ts                 # mulberry32 PRNG + FNV-1a hashing + challenge identity (§5, §6, §29, §31)
│   ├── recipes.ts              # 12 known-valid circuit recipes with randomised parameters (§8)
│   ├── topology.ts             # port-checked circuit builder (§7)
│   ├── layout.ts               # deterministic grid layout (§7)
│   ├── validator.ts            # structural + electrical + baseline-simulation validation (§10)
│   └── generator.ts            # pipeline + bounded retries (§7, §35, §37)
└── index.ts                    # barrel, re-exported from src/domain/index.ts
```

Specific decisions:

1. **PRNG.** `mulberry32` seeded through an FNV-1a-derived 32-bit hash of
   `(generatorVersion, seed, difficulty, mode, rageProfile)`. `Math.random` is
   banned inside `src/domain/challenges/**` and a unit test asserts its absence.
2. **Generator version.** `GENERATOR_VERSION = 1`, part of both the RNG seed
   derivation and the challenge identity hash, so a future algorithm change
   cannot silently re-use an old seed's identity (§6).
3. **Challenge identity.** `computeChallengeIdentity()` returns a 32-bit hash, a
   6-digit numeric form and a display string `ES-<PREFIX>-<6 digits>`
   (`ES-DIAG-482917`, `ES-RAGE-482917`) (§29). `dailyChallengeSeed(isoDate,
   version)` exists as the §31 hook only — nothing consumes it yet and no
   backend is introduced.
4. **Recipes, not random wiring.** Circuits are produced from 12 curated
   recipes (4 beginner / 5 intermediate / 3 advanced) whose *parameters* are
   randomised (load kind, protective device kind and rating, switch kind, branch
   count, cable size, run lengths, layout order). Only component types verified
   present in `COMPONENT_DEFS` are referenced (§8).
5. **Reuse, never re-implement.** Topology building mirrors the port-type checks
   already used by `templates.ts`; validation composes `validateCircuitRules`,
   `validateCircuit` and `simulate` rather than adding a parallel rule set.
6. **Baseline contract.** A candidate is accepted only when it is structurally
   sound, produces **zero** error-severity validation issues, zero simulation
   errors, no tripped/blown/busted elements, disjoint live and neutral graphs,
   and energises every load the recipe declares — in *both* `basic` and `pro`
   app modes (§10).
7. **Bounded retries.** A maximum attempt count (default 12) with a per-attempt
   forked RNG. Exhaustion returns a structured failure carrying every rejection
   reason; `generateChallenge()` throws `ChallengeGenerationError`. No unbounded
   loop exists (§37).
8. **Generator-safe electrical envelope.** To satisfy the three conservative
   validators above, every generated circuit:
   - sets an explicit `customCableMm2` on every component **and** wire, so the
     "undersized cable" heuristic compares a value against itself;
   - sets an explicit short `lengthMeters` (1.5–8 m) on every wire;
   - caps every protective device at **20 A** (`PROTECTION_RATING_CEILING_AMPS`);
   - keeps total connected load current below the smallest breaker rating.
   These are encoded as named constants with comments pointing at the validator
   that motivates them.
9. **Purity.** No `Date.now()`, no IndexedDB, no store access, no React. The
   generator returns `{ circuit, scenario, metadata }` (§35) and is safe to call
   from the existing Comlink worker — but **no second worker is added** (§45).

## Rationale

- Recipes keep generated circuits *meaningful*: randomly connecting registry
  components would produce circuits that are electrically legal but pedagogically
  worthless, and would fail the compliance engine constantly.
- Validating with the production validators (rather than a bespoke checker)
  guarantees the learner never sees a generated circuit that the app itself
  would flag red — and means the generator inherits future BS 7671 work for free.
- Deriving the RNG seed from the *whole* request (not just `seed`) means
  beginner/intermediate/advanced runs of the same numeric seed are independent
  sequences, which keeps per-difficulty seed batches genuinely diverse.
- Publishing the difficulty profiles now — including the hint budget and
  diagnostic choice-set size from §9 — lets Phases C/D consume declarative data
  instead of re-deriving difficulty semantics per mode. The profile carries no
  fault logic, so the §57 gate item "generator contains no diagnosis/fault
  specific logic" still holds.
- The 20 A protection ceiling and explicit cable metadata are the minimum
  intervention that makes generation reliable without weakening any existing
  electrical rule (§58: "do not weaken existing electrical rules").

## Consequences

**Positive**

- Phases C–F consume one small, tested API: `generateChallenge(request)`.
- Every generated circuit is reproducible from six primitive values, which makes
  bug reports, regression seeds and later daily challenges trivial.
- The 100-seeds-per-difficulty test (§39) doubles as a permanent guard against
  regressions in the simulator and validators.

**Negative / accepted trade-offs**

- Recipes must be hand-written; adding a new circuit family is a code change,
  not data entry. Accepted: §8 explicitly requires curated recipes.
- The generated envelope excludes very high-power loads (electric shower,
  immersion heater) because the simulator's single circuit-wide current model
  would trip smaller breakers on unrelated branches. Revisit if the engine gains
  per-branch current.
- `rageProfile` appears as an *opaque identity input* in Phase A so the §29 hash
  shape is stable. It carries no behaviour until Phase E.

**Follow-ups**

- Phase B: seed-stress script (§56) and the foundation lock.
- Any change to recipe or topology output must bump `GENERATOR_VERSION`.
