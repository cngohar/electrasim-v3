# Phase 1.5D.1 — timer programs and resistive dimming

Updated 2026-10-05. **Complete locally within the scope below.** This follows [1.5D.0](phase-1-timed-controls.md); it does not complete protection, damage or the lab migration.

[ADR 0011](../decisions/0011-rms-dimming-and-timer-programs.md) records the laws, versioning and bounds. Both dimmer controls now use their saved level in independently checked MNA switching states, with RMS current/voltage and mean real power. Shared feeder currents and wire losses follow the actual network. Zero output opens the switch; the lossless switch does not consume the missing lamp power. Pair RMS readings use sample differences, and lower RMS voltage cannot establish suitability for an incompatible on-state voltage.

Daily/weekly programs, staircase intervals and powered countdown intervals use the existing deterministic clock. Schedule edges, retrigger/held-input behavior, countdown supply loss and delayed relay interaction produce explicit events and final-topology measurements. Countdown electronics consume their declared real power separately from the contact current. Two-terminal timer clocks are explicitly external. Programs and ratings persist; latches, clock time and derived contacts do not.

The inspector exposes program settings, runtime dimmer levels and timer triggers, clock status, contact readings and pending deadlines. Configuration locks during a run or authored exercise. Existing IDs, wires, source profiles, membership requirements and persistence formats remain. Dimming and timer programs use the same domain entry through the app, Comlink and local Hono.

The dimmable-lighting guide uses an incandescent load and teaches measured full/quarter/zero output. Existing fan-regulator recipes retain their five-position inputs and identities. Unmigrated fan/driver exercises keep tagged legacy continuity/fault observations under the existing 1.5C.5 boundary, with numerical and operating telemetry unavailable. Their full model-aware grading remains 1.5F. No timed request or dimming waveform/reactive/limit failure uses legacy results.

## Acceptance

Reproducible command: `bun run verify:phase-1.5d1`.

The command includes all project typechecks, boundary/lint/unit checks, Vite/Astro/postbuild and asset/link/SEO/CSP checks, numerical benchmarks, Bun/workerd parity, real local Worker/D1/cookie acceptance, and Chromium regressions including the new controls. Independent fixtures cover RMS/real-power laws, shared feeders, switch loss, wire loss, sample-wise conservation, zero/full/cascaded levels, unsafe conduction voltage, unsupported loads/supplies, exact timer boundaries, cycle wrap, triggers/retrigger, power loss, timer-fed coils, replay/reset, invalid state/programs, persistence and basic/Pro equality.

The required gate checks passed on 2026-10-05. Results: **126 Vitest files / 2,045 passes**, all project typechecks and the 134-module domain boundary, repository lint, Vite/Astro/postbuild, all asset/link/SEO/CSP checks, **666 Bun/workerd parity cases**, **12 local Worker/D1/cookie groups** and **56 Chromium regression cases**. The browser timed-contact assertions were given explicit 20 s poll budgets after one parallel-run timeout; the failing case passed standalone and in the rerun, with no product-code change. Initial JavaScript is **247,721 B gzip / 250,000 B**, CSS **26,165 B / 30,000 B**. Links checked 193 HTML files; SEO checked 191 pages; CSP passed. MNA medians were **0.76 ms** for two series loads, **0.62 ms** for the isolated transformer and **0.67 ms** for cascaded transformers. Dense 200–256-component cases measured **48.66–65.32 ms median**; the existing dense fallback/60 fps targets remain open and no budget was increased. No remote testing or deployment was part of acceptance.

Evidence remains in ignored `.wrangler/phase15d1-{gate,final-gate,check,canonical-fixed}.log`, `.wrangler/domain-tests-MKPttR/`, `.wrangler/membership-tests-I26UIn/` and related built-evidence directories.

## Remaining scope

Only fixed-resistance AC dimming is supported. LED drivers, motors, reactive excitation in a dimmed network, arbitrary relative switching phases, detailed waveforms/harmonics, real dimmer loss/leakage, timer clock backup, damage and manufacturer behavior remain unassessed. Reversing branch waveforms and circuits beyond the stated sample/MNA bounds are unavailable, without a legacy numerical fallback. The UI level is an energy fraction, not firing angle or predicted visual brightness.

Time protection/fuses/residual operation remain **1.5D.2**. Cable/device damage and the complete Fault Lab reset/repair lifecycle remain **1.5D.3**, followed by three-phase **1.5E** and full exercise migration/legacy retirement **1.5F**. Existing dense renderer/solver targets remain open. Local-only credentials, bindings, deployment restrictions and performance budgets remain in force.
