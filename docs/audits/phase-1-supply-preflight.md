# Phase 1.5C.0 — persisted supplies and shared preflight

Date: 2026-10-02. Status: **complete locally; full 1.5C.0 acceptance gate passed**. This is the first foundation step of 1.5C, not completion of the MNA solver or the whole sub-phase. Root `AGENTS.md` keeps every service, test and persistence target local.

## Document and source contract

Circuit-file and portable-backup writers now emit schema **2**; readers accept **1 and 2**. Electrical contract version remains **1**, with model version **`1.5c.0.1`**. The existing IndexedDB key `electrasim:circuit:v1` remains in use and its record version advances to 2, so old autosaves are not orphaned or unexpectedly resurrected. Circuit IDs, component/port identities, wire properties/routes, explicit design ratings and fault/trip/damage records survive migration.

`Circuit.supply` describes the named document supply/default. `ComponentState.sourceProfile` freezes independent source settings and preserves explicit legacy alias overrides for conflict diagnosis. Each profile has a version, a discriminated DC/single-phase/three-phase model and value provenance. Source identities continue to derive from the alias group or canonical component IDs; copying an independent source creates a new identity with the copied settings.

Legacy omitted settings mean **230 V AC / assumed 50 Hz**. A legacy 120 V document keeps an explicit 50 Hz assumption; creating a new US document with `createEmptyCircuit('us')` selects **120 V / 60 Hz**. Changing the standards view never changes saved source settings. AC profile voltages are RMS L-N; a reserved three-phase descriptor does not create phase terminals or working three-phase physics.

The document-voltage action now changes only its named aliases/default. It no longer rewrites batteries, separate mains/generators, PE or the first arbitrary load. Independent legacy sources capture their previous voltage before a default changes. Identical edits create no history; the transaction participates in ordinary undo/redo and fresh authorization. Source configuration is locked during running and active exercises, while runtime switches remain usable. Full authored-context enforcement and confirmation/impact/review UI remain later steps.

All circuit snapshots used by autosave, portable files, account save, recovery copies, tutorial/challenge return workspaces, diagnosis, export/share, Comlink and validation carry the profile. Supply-only revisions invalidate worker inputs and validation reports and count in authorization race checks. The existing voltage controls retain source kind/frequency; voltage-only preset labels no longer promise an AC/DC or three-phase conversion. Context/status labels use saved settings, including 12 V AC and 60 Hz. Zs/export cannot apply the limited 50 Hz AC teaching estimate to a saved DC or unsupported frequency profile.

## Capability and preflight contract

The explicit inventory covers **115 catalogue variants**. It separates source controls and modeled batteries from PE, photocells and loads. Nine existing element/hot-filament types use their own nominal-voltage/power fixed-resistance approximation. Electronic lamps, motors, coils, control electronics, PV and other unspecified load laws remain unassessed. Outlet capacity is not power consumption. Missing maximum voltage, ampacity, coil rating and operating range remain unknown; this layer invents no 250 V, 20 A or damage threshold.

Relay contacts and coils have separate groups and ratings. Transformer primary and secondary groups retain separate domains and AC ratings. Compatibility checks return structured supply-kind, phase, frequency, voltage/range, underpowered, unknown-rating and unsupported-model reasons. Nominal source comparisons are provisional; supplied solved terminal measurements are a separate input. The result is independent of membership and presentation mode.

`assessCircuitReadiness` distinguishes invalid, empty, no-source, no-load, open, partial, connected and source-short topology. An iterative biconnected-path analysis recognizes a source/load cycle without treating a dangling conductor or a floating loop joined at one terminal as a powered branch. It does not assert nonzero current: even a closed-path branch can have zero current in a balanced network. Open switches permit a diagnostic workflow without being labeled an automatic wiring mistake. A pure source short takes precedence over no-load status. Per-group source lookup respects isolated domains and can distinguish direct feeds with a shared neutral.

Calculation is **not performed**, operation and standards assessment are **not assessed**, and no voltage/current telemetry is fabricated. Readiness is not an empty error list, `faultsCleared`, successful operation or a safety certificate. Existing runtime coverage guards remain; new unsupported source configurations do not fall back to the old last-source-wins rail voltage.

## Local acceptance

Reproducible command: **`bun run verify:phase-1.5c0` passed end to end**. It runs typechecks/boundaries/lint/unit tests, a build and asset checks, the existing simulation benchmark, Bun/local Hono-workerd parity, local D1/cookie simulator acceptance, built-output browser tests, focused real Comlink/import/persistence/source/relay browser cases, and the existing voltage-preset interaction.

| Check | Result |
|---|---|
| Typechecks, domain boundary and lint | Passed, including strict indexed access for the core; 102 domain runtime modules and 653 linted files |
| Unit tests | 114 files; **1,701 passed**, plus five explicitly expected failures owned by later core phases |
| Build, performance assets, links, SEO and CSP | Passed; initial JS **246,780 B gzip / 250,000 B**, CSS **26,394 B / 30,000 B**; links in 193 HTML files and 191 SEO pages checked |
| Existing simulation benchmark | 200 components / 396 wires; **4.61 ms median / 7.78 ms p95**, within the unchanged 8 ms budget |
| Bun / local Hono-workerd parity | **494 cases** covering simulation, compilation, persisted profiles, capabilities and readiness |
| Local Worker/D1/cookie simulator acceptance | **9 groups**, including profile round-trip, malformed frequency rejection, ownership/version checks and actual paid browser flows |
| Built-output browser acceptance | **53 passed** against the localhost preview |
| Focused browser acceptance | **6 passed**: existing overload, transformer and relay cases; profile import/edit/undo/redo/download/IndexedDB reload; saved DC parity through real Comlink and local Hono; voltage preset interaction |

The first full run stopped at a benchmark p95 of 8.59 ms. A local comparison of the unchanged prior commit also exceeded the budget (8.84 ms), while this working tree passed at 7.95 ms. The final complete gate passed at 7.78 ms; no benchmark threshold, fixture, warmup or solver behavior was changed to obtain a pass. These short-run timings vary and do not close the separate dense-rendering performance target.

The sandbox initially denied localhost binding; approved local execution allowed the real Worker and Chromium checks. Evidence is retained in ignored `.wrangler/phase15c0-verify.log`, `.wrangler/phase15c0-verify-initial.log`, `.wrangler/domain-tests-mEEfrO/` and `.wrangler/membership-tests-3rSy7D/`. These are phase-specific acceptance results, not a claim that the broader `bun run verify`, stress matrix or replacement numerical engine is complete.

## Remaining work

Next: **1.5C.1**, the independently asserted MNA resistive series/parallel/shared-feeder and independent-source slice. The implementation sequence and numerical rules are in [ADR 0009](../decisions/0009-mna-solver.md#implementation-contract-established-in-15c0).

1.5C.2–5 still own load operating response/wire losses, isolated transformer/PE equations, confirmed staged supply changes with impact/Review/Undo, safe variant mappings, complete palette/inspector/Run integration and actual MNA results in the browser and local server. Current source edit guards and labels are a compatibility prerequisite, not completion of that workflow. Timed protection/damage, supported three-phase solving and complete exercise/result migration remain 1.5D–F. No deployment, remote Cloudflare operation or hosted test is part of this acceptance.
