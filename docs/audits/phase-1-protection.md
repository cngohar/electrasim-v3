# Phase 1.5D.2 — timed protection models

Updated 2026-10-05. **Complete locally within the scope below.** This follows [1.5D.1](phase-1-timers-dimming.md); it does not complete damage, Fault Lab repair or the lab migration.

[ADR 0012](../decisions/0012-timed-protection-models.md) records the laws, versioning and bounds. An optional `state.protectionModel` declares explicit MCB/RCBO curve, fuse I²t and RCD residual sensitivity/type for automatic protection devices. Static documents never acquire an assumed law, and isolators/SPD/main switches cannot declare one. Transient heat, residual timing and trip latches live only in `simulationState.protection`; configuration changes require reset, and a latched trip clears only after an explicit OFF or a fresh run.

Trips are driven by actual per-pole branch currents through the shared event clock. Overcurrent uses the IEC thermal power law or the fuse melting integral, electromagnetically bracketed by the expected instantaneous zones. Residual devices use the signed pole sum against a declared IΔn band delay; Type B is required for smooth-DC detection. Bypassed devices see almost no pole current and stay blind to the load; the fault shunt keeps the path alive through the actual topology. Pre-event pole currents, current multiple and residual mA are reported on each trip event; post-event readings describe the opened topology.

## Acceptance

Reproducible command: `bun run verify:phase-1.5d2`.

The command includes all project typechecks, boundary/lint/unit checks, Vite/Astro/postbuild and asset/link/SEO/CSP checks, numerical benchmarks, Bun/workerd parity, real local Worker/D1/cookie acceptance, and Chromium regressions including the new protection cases. Independent fixtures cover instantaneous and thermal MCB zones, fuse energy, RCD band delays and pole-sum cancellation, latched reset, deterministic replay, foreign state, persistence, balanced-load non-tripping and basic/Pro equality.

The required gate checks passed on 2026-10-05. Results: **127 Vitest files / 2,054 passes**, all project typechecks and the 137-module domain boundary, repository lint, Vite/Astro/postbuild, all asset/link/SEO/CSP checks, **675 Bun/workerd parity cases**, **13 local Worker/D1/cookie groups** and **59 Chromium regression cases**. Initial JavaScript is **248,568 B gzip / 250,000 B**, CSS **26,165 B / 30,000 B**. Links checked 193 HTML files; SEO checked 191 pages; CSP passed. MNA medians were **1.07 ms** for two series loads, **0.92 ms** for the isolated transformer and **0.96 ms** for cascaded transformers. Dense 200–256-component cases measured **48.71–76.19 ms median**; the existing dense fallback/60 fps targets remain open and no budget was increased. A numerical-projection crossing issue (fuse trip waiting at a µs-boundary tie) was diagnosed and resolved before this gate; no application behavior changed afterward. No remote testing or deployment was part of acceptance.

Evidence remains in ignored `.wrangler/phase15d2-gate.log`, `.wrangler/domain-tests-zqV30y/`, `.wrangler/membership-tests-VnNjSS/` and related built-evidence directories.

## Remaining scope

Arc-fault detection physics, coordination/selectivity, prospective-fault energy, damage and manufacturer tolerances remain unassessed. This is a deterministic teaching boundary, not a device-acceptance certificate. Simulated time never turns into wall clock or timezones, and a latched trip is not a destruction event.

Cable/device damage and the complete Fault Lab reset/repair lifecycle remain **1.5D.3**, followed by three-phase **1.5E** and full exercise migration/legacy retirement **1.5F**. Existing dense renderer/solver targets remain open. Local-only credentials, bindings, deployment restrictions and performance budgets remain in force.
