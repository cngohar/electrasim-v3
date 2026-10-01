# Phase 1.5B — electrical contracts and terminal graph

Date: 2026-10-01. Status: **complete locally; the full `bun run verify:phase-1.5b` gate passed**. This resumes and closes the previously deferred milestone under the user's instruction to finish 1.5B. Numerical solving, timed devices, three-phase operation and legacy retirement remain 1.5C–1.5F.

## Boundary and versions

`packages/domain/src/core` implements the normalize/validate/compile stages of [ADR 0008](../decisions/0008-staged-electrical-core.md). Import `compileCircuit` from `@electrasim/domain/core` or the existing `@electrasim/domain/simulation` entry point. It returns a discriminated result:

- `invalid`: structured diagnostics with codes, paths and available component/wire/fault IDs; no partial graph is exposed.
- `compiled`: a normalized document, terminal graph, diagnostics and coverage for topology, sources, loads, controls, protection, faults and measurements.

The electrical contract version is **1** and the model version is **`1.5b.1`**. Compilation is not a numerical solve: circuit measurement coverage is always `not-assessed`. Typed future state/results keep document state, elapsed simulation time, measurements, diagnostics and convergence separate. The existing `simulate()` now includes additive contract metadata identifying **`legacy-rail-1.5b`** and `invalid`, `estimated` or `not-assessed` status. It validates and normalizes before entering the legacy solver; it does not run the new graph as a replacement solver.

The persisted circuit schema remains **1**. No D1 migration or score regrading is introduced. Persisting engine/exercise versions with accepted results remains an integration requirement in 1.5F.

## Input, defaults and saved-document compatibility

One `validateCircuitInput` boundary serves direct simulation, compilation, validation and circuit-file imports. It rejects unknown component types, duplicate or reserved IDs, missing endpoints, invalid/fractional ports, self-connected terminals, malformed state/enums, nonfinite/out-of-range quantities, invalid fault targets and excessive input. Object-valued enums are rejected without invoking string conversion. IDs retain valid Unicode and separators; lone UTF-16 surrogates are rejected before legacy fault-ID encoding.

The limits are 5,000 components, 10,000 wires, 1,000 explicit faults, 50 control points per wire, 256-character IDs/strings and finite coordinates within ±100,000. Positive electrical quantities are bounded to 0.001–100,000; power may be zero and derating remains 0.1–1. File imports retain their existing 10 MiB string-length bound; HTTP simulation retains its tighter 500-component/1,000-wire limit. Invalid simulation produces no electrical telemetry and direct validation cannot return a pass for malformed topology.

Physical cross-role wiring and bridges between different terminals on one component remain representable. Validation must not silently repair a reversed connection or discard a real short. Their electrical consequences and comprehensive polarity/PE scoring still require the solver/integration stages.

Normalization copies data, retains array order, canonical component IDs, terminal indices, fault records, wire properties and explicit `false`, trip and damage state. Missing switch state uses the catalogue's `defaultOn`, otherwise `false` (**N13**). Repeated normalization is idempotent. File/backup adapters release momentary inputs; immediate simulation, compilation and in-memory exercise loading preserve an explicitly held contact. The full suite caught an exercise-loading regression at this boundary; preserving the authored bell-push state restores successful repair evaluation without changing persistence behavior.

For schema-1 drawings with omitted supply configuration, the documented legacy assumption stays **230 V / 50 Hz**. `createEmptyCircuit(profile)` supplies a new document's nominal voltage, including **120 V** for `us`. This is a domain construction helper, not a redesign of the editor's supply controls. Changing an assessment profile does not rewrite a saved supply. Frequency is explicit in the compiled model; schema-1 AC frequency remains a disclosed 50 Hz assumption, not a claim of correct US mains frequency. New persisted source settings need versioned migration in the later solver/UI work.

## Sources, device models and graph

Terminal IDs encode the component ID and saved terminal index without delimiter collisions. Graph arrays, conductive nets and domains have stable ordering independent of the input component/wire order. Compilation retains physical wire endpoints even when terminal role labels disagree.

| Contract | Behavior |
|---|---|
| Independent source blocks | AC mains, generator and DC battery blocks have separate identities; battery defaults to 12 V independently of document voltage. Explicit instance voltage wins. |
| Legacy supply aliases | Live/neutral rail terminals describe one named legacy supply. One explicit live-alias voltage can configure that supply; conflicting explicit live values/frequencies are invalid. Electrical values, rather than object property order, determine equality. |
| PE and references | PE is a protective bus/electrode reference, never a power source. Neutral/DC gauge references create no implicit N–PE bond. Explicit wiring remains visible. |
| Conductors | Only closed ideal internal links, selected contacts and explicitly modeled short/bypass branches merge solver nodes. Finite-resistance wires stay branches. |
| Domains | Galvanic domains include closed source/load/winding branches. Transformer primary and secondary remain separate; their coupling metadata does not merge nets or domains. |
| Contacts | Relay coils, NO/NC throws and independent poles stay separate. Transient contact-state overrides do not mutate the drawing. Invalid self-shorted poles or coil/contact overlap are rejected. Terminal-strip ways, intermediate travellers and three-phase distribution poles retain their own connectivity. |
| Resistive loads | Named heaters and incandescent/halogen lamps use an explicit fixed hot-resistance approximation, nominal voltage/power and optional maximum voltage. The independent 12 V / 24 W fixture produces a declared 6 Ω branch; it does not claim a solved 1 A series result yet. |
| Other loads/outlets | An LED driver, motor, PV power label or outlet capacity is not automatically converted into resistance. Unspecified laws and multi-terminal incidence are unassessed. An outlet consumes no power by itself. |
| Unsupported models | Autotransformers, PV source laws, timing, coil consumption and protection operation remain explicit gaps. The three-phase supply descriptor is reserved; a two-terminal/legacy-alias declaration cannot stamp a working three-phase source. |

Coverage describes the compiled model, not compliance or proof of safe operation. Existing runtime guards for DC, transformer and three-phase drawings remain active until their numerical models pass independent acceptance.

## Shared wire properties

`resolveWireProperties` is used by graph compilation, legacy wire telemetry/heating, conductor validation and Zs size resolution (**N20**). Its precedence is explicit wire mm² → saved supported AWG → smallest explicitly configured endpoint mm² → 2.5 mm² default. Catalogue tail recommendations do not silently change a run's conductor size. Each property records whether it came from the wire, an endpoint or a default.

Other defaults are 10 m, copper, installation method C and derating factor 1. The graph's resistance is for **one conductor at 20 °C**: `rho * length / area`, with 0.0175 Ω·mm²/m for copper or 0.0282 for aluminium. It is separate from the existing two-conductor/70 °C voltage-drop table. Zs retains its restricted UK TN copper T&E applicability; sharing the size resolver does not expand those standards claims. True wire current/loss solving remains 1.5C and consistent editor presentation remains 1.7.

## Fault topology and unresolved physics

All 14 registered fault types remain identifiable with explicit topology coverage. Modern records and deterministic legacy mirrors are preserved. The compiler ignores resolved records while suppressing their legacy mirrors; the legacy runtime's resolved-flag policy is unchanged pending migration.

- Open conductors interrupt the specified wire/role. A terminal disconnection removes external wire connections without erasing a device's internal source/coil branch.
- Forced-open protection opens contact branches. A bypass creates a separate shunt for each pole, including a manually open/tripped pole, without joining poles together. This is compiled topology; legacy runtime open-switch bypass remains an expected failure owned by 1.5D.
- A component with exactly one L and one N can receive a specified L–N bridge. An earth fault on a component with one L and one PE creates the L–PE bridge while preserving its CPC. A broken PE is a different fault.
- A local L–PE leakage path retains branch incidence but has unspecified impedance/current; it never becomes a zero-ohm short or an invented measured residual current.
- Reversed polarity swaps external connections while retaining saved port IDs. Swaps precede disconnections, so random fault IDs or record ordering cannot disconnect the wrong final terminal. Duplicate reversal records do not cancel the fault.
- A wire/port short without a second conductor, an ambiguous multi-pole component short, switched-neutral injection, smooth-DC residual and arc behavior stay explicitly unassessed. No unrelated global return or dynamic current is invented.

## Local acceptance

The reproducible gate is `bun run verify:phase-1.5b`. It runs typechecks (including `noUncheckedIndexedAccess` for the new core), domain-boundary checks, lint, unit tests, a fresh build, assets/links/SEO/CSP checks, the simulation benchmark, Bun/local Hono-workerd parity, real local Worker/D1 simulator acceptance, built-output browser tests and focused Comlink audit/relay cases.

The complete command passed on 2026-10-01. Evidence: ignored `.wrangler/phase15b-verify.log`.

| Check | Final result |
|---|---|
| Complete `bun run verify:phase-1.5b` | **Passed end to end**, including every required row below. |
| Typechecks / domain boundary / lint | All projects passed, including strict indexed access in the core and local parity scripts; **96 domain modules**, **641 linted files**. |
| Vitest | **111 files; 1,645 passed + 5 explicitly expected failures = 1,650 cases**, with no unhandled errors. |
| Focused regressions | **4 files / 123 passed**, including core contracts, file compatibility, undo and the repaired diagnosis lifecycle. |
| Fresh build and asset budgets | Vite/Astro/postbuild passed; **244,624 B** initial JS gzip / 250,000 B budget; **26,394 B** CSS gzip / 30,000 B budget; **193 HTML pages**. |
| Links / SEO / CSP | Passed; 193 HTML files checked for links and 191 SEO pages. |
| Simulation benchmark | **200 components / 396 wires; 4.74 ms median / 7.43 ms p95**, within the existing 8 ms p95 budget. This measures the guarded legacy simulation boundary, not the new numerical solver or rendering. |
| Bun ↔ local Hono/workerd parity | **486 cases passed**: 480 simulation combinations plus six compiler fixtures; `.wrangler/domain-tests-DiRShd/`. |
| Real local Worker/D1/cookie acceptance | **9 groups passed**, including owner/version CRUD, preserved faults, server-owned diagnosis results, revocation and paid browser flows; `.wrangler/membership-tests-4Qu3pb/`. |
| Built-output Chromium | **53 / 53 passed** against localhost, including offline lazy dialogs and responsive toolbox pages. |
| Comlink audit/relay Chromium | **3 / 3 passed**: guest breaker trip without destruction, unsupported transformer document/telemetry preservation and relay NO/NC transfer/dropout. |

The two 1.5B-owned audit expectations (N13 default state and malformed-port N26) were promoted to ordinary regressions. Five `it.fails` fixtures still assert desired future behavior for series and branch currents, 12 V compatibility, legacy open-switch bypass and physical reversed-polarity diagnosis. They remain owned by 1.5C, 1.5D and 1.5F, not reported as implemented physics.

The first full attempt passed the static/build/benchmark gates but the sandbox denied localhost binding at Worker parity. After local execution approval, the entire phase command was rerun and passed; no blocked check was counted as a pass. Existing uncommitted work from prior milestones was preserved. No dependency upgrade or database migration was needed for this closeout.

No hosted tests, Cloudflare account/resource operations, credential restoration or deployment are authorized or performed. The wider `bun run verify`, dense 60 fps target, new numerical solver, complete device dynamics and legacy retirement are not claimed by 1.5B.
