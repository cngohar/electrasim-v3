# Changelog — ElectraSim V3

All notable changes to the V3 rewrite (Bun + 100% Cloudflare Workers) are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [SemVer](https://semver.org/).

> **Archive:** V2 history through `2.0.4` is at `docs/archive/v2/CHANGELOG-v2.md`.

## [Unreleased]

### Added

- Faster phase reruns: all 15 phase commands support `--list`, `--dry-run`, `--only STAGE[,STAGE]` and `--from STAGE`, with separate type/lint/unit stages and explicit partial-run reporting. `check:changed` runs lint plus affected unit tests; the full default acceptance scope and local-only restrictions are preserved. [Workflow](docs/DEVELOPMENT.md).
- Phase 1.5E.2: explicit unity-PF motor teaching models with separate electrical input power, phase-loss/sequence/range guards, timed AC contactor coils and complex sensed-pole/residual readings through the app, Comlink and local Hono. Independent source references withhold undefined residuals; mechanical/reactive/transient behavior and automatic phasor protection/damage/repair assessment remain unassessed. Shared desktop/phone settings preserve Undo/Redo, persistence and running/exercise locks. **Completed locally on 2026-10-06:** the full `verify:phase-1.5e2` gate passed with 2,175 unit tests, 776 exact Bun/workerd cases, 17 real Worker/D1 groups and 33 browser cases. [Scope and local acceptance](docs/audits/phase-1-three-phase-motor.md); DOL migration/full three-phase acceptance is next in E.3.
- Phase 1.5E.1: free portable three-phase source with L1/L2/L3/N/PE artwork and saved settings; confirmed L-N/L-L voltage, frequency and phase-sequence edits; separate complex RMS readings through the app, Comlink and local Hono. Source-neutral current uses vector addition; operation/protection/repair assessment stays unassessed. **Completed locally on 2026-10-06:** 2,139 unit tests, 726 exact Bun/workerd cases, 16 real Worker/D1 groups and 28 browser cases passed across the main checks and focused reruns. [Scope and local acceptance](docs/audits/phase-1-three-phase-source.md); motor/contactors and DOL remain E.2–3.
- Phase 1.5E.0 three-phase numerical foundation: explicit phase-source contracts, complex RMS resistive MNA, balanced/unbalanced star and delta fixtures, neutral displacement, phase loss and inter-phase shorts. Exact Bun/workerd parity is preserved; source catalogue/UI, motor models and application phasor consumers remain E.1–3. [Scope and local acceptance](docs/audits/phase-1-phasor-foundation.md).
- Faster local development commands: `test:changed`, `test:related` and `check:core`, with [a targeted/watch workflow](docs/DEVELOPMENT.md). Build and final acceptance keep their existing scopes; the phase gate remains required before completion.
- Phase 1.5D.3 declared current/voltage damage budgets, deterministic cable/device openings, saved failed-item flags and distinct fuse operation. Fault Lab separates fault clearing, breaker reset to OFF and replacement while preserving remaining faults and configuration; desktop and phone use shared controls. **Completed locally on 2026-10-06:** `bun run verify:phase-1.5d3` passed with 2,084 unit tests, 705 Bun/workerd parity cases, 15 real local Worker/D1/session groups and 63 Chromium cases. [Scope and acceptance](docs/audits/phase-1-damage-repair.md).
- Phase 1.5D.2 declared timed protection models: optional `state.protectionModel` for MCB/RCBO curves, fuse I²t, RCD/RCBO residual sensitivity/type, timed trips, residual band delays, deterministic projections, latching events and post-trip topologies, with actual-pole-current measurements and isolation of bypassed devices. Inspector settings/readings, deterministic replay and a local gate. **Completed locally on 2026-10-05:** `bun run verify:phase-1.5d2` passed with 2,054 unit tests, 675 parity cases, 13 local Worker/D1/session groups and 59 browser cases. Damage and Fault Lab repair remain 1.5D.3. [Scope and evidence](docs/audits/phase-1-protection.md).
- Phase 1.5D.1 declared timer programs and resistive dimming: daily/weekly schedules, staircase and powered countdown intervals on the deterministic clock, and ideal switching-state RMS/real-power dimmer levels through MNA across app, Comlink and local Hono. Inspector settings/readings, countdown electronics consumption, persisted programs and a local gate. **Completed locally on 2026-10-05:** `bun run verify:phase-1.5d1` passed with 2,045 unit tests, 666 parity cases, 12 local Worker/D1/session groups and 56 browser cases. Protection/damage/Fault Lab repair remain later 1.5D slices. [Scope and evidence](docs/audits/phase-1-timers-dimming.md).
- Phase 1.5D.0 explicit coil teaching models and deterministic control time/state/events: actual resistive-coil consumption, pickup/dropout hysteresis, on/off delay, reset/replay and final-topology MNA readings across app, Comlink and local Hono. Added inspector settings/readings, saved-setting validation and a local gate. **Completed locally on 2026-10-05:** required checks passed with 2,020 unit tests, 631 parity cases, 11 local Worker/D1/session groups and 52 browser cases (the prior model-version assertion was updated and rerun). Dimming, protection and damage remain later 1.5D slices. [Scope and evidence](docs/audits/phase-1-timed-controls.md).
- Phase 1.5C.5 shared application MNA runtime: `simulate()` now validates/compiles once, solves through the bounded MNA core and projects the versioned result through the adapter; the Comlink worker and local Hono API consume the same entry, with explicit unavailable readings and unassessed three-phase/legacy guards instead of legacy numerical estimates. **Completed locally on 2026-10-04:** `bun run verify:phase-1.5c5` passed with 2,000 unit passes, 626 parity cases, 10 real Worker/D1/session groups and 49 browser cases. [Scope and evidence](docs/audits/phase-1-mna-runtime.md); timed controls/protection are next in 1.5D.
- Phase 1.5C.4 confirmed supply changes with impact/Cancel/Apply/Review/Undo, capability-based placement and inspector controls, safe variant terminal/fault mappings, shared Run readiness, running/exercise locks and stale-result protection. **Completed locally on 2026-10-03:** `bun run verify:phase-1.5c4` passed with 1,921 unit passes plus five expected failures, 569 Bun/workerd parity cases, 9 real Worker/D1/session groups and 42 browser cases. [Scope and evidence](docs/audits/phase-1-editing-readiness.md).
- Phase 1.5C.3 ideal isolated AC transformer equations, coupled-domain conservation and explicit PE/reference relationships: winding ratios, reverse power transfer, cascades, normal/fault returns, CPC/polarity/neutral-switching findings and limited fault-current estimates. **Completed locally on 2026-10-02:** `bun run verify:phase-1.5c3` passed with 1,878 unit passes plus five expected failures, 551 Bun/workerd parity cases and four local browser continuity cases. [Scope and evidence](docs/audits/phase-1-transformers-pe.md); essential editing/readiness UI is next in 1.5C.4.
- Phase 1.5C.2 load operating points and wire losses: fixed-rating heater voltage sweep, declared range/frequency checks, independent supplies, per-pole current/capacity/residual units, explicit unavailable readings and shared wire-property consumers. **Completed locally on 2026-10-02:** `bun run verify:phase-1.5c2` passed with 1,818 unit passes plus five expected failures, 524 Bun/workerd parity cases and four local browser cases. [Scope and evidence](docs/audits/phase-1-load-response.md); isolated transformers/PE are next in 1.5C.3.
- Phase 1.5C.1 bounded linear MNA solver slice: dense scaled-pivoting factorization with residual/pivot guards, canonical per-domain unknowns, conflicting/redundant/indeterminate ideal-source diagnostics, open-circuit and independent-reference handling, wire-loss and per-domain conservation verification, and independently asserted series/parallel/shared-feeder/bridge/two-source fixtures. **Completed locally on 2026-10-02:** `bun run verify:phase-1.5c1` passed end to end with 1,763 unit passes plus five expected failures, the MNA benchmark and 510 Bun/workerd parity cases. Consumers, operating ranges, transformers and timed/three-phase models remain in 1.5C.2–F.
- Phase 1.5C.0 persisted supply profiles, explicit capability/rating inventory for all 115 variants, shared terminal-group compatibility/readiness and ADR 0009's MNA implementation contract. **Completed locally on 2026-10-02:** the full phase gate passed with 1,701 unit passes plus five expected later-phase failures, 494 Bun/workerd parity cases, 9 Worker/D1 groups and 59 browser cases. MNA solving begins in 1.5C.1.
- Phase 1.5B versioned electrical contracts, deterministic terminal compiler, source/pole/winding isolation, shared wire properties and bounded input validation. **Completed locally on 2026-10-01:** the full gate passed with 1,645 unit passes plus five expected later-phase failures, 486 Bun/workerd parity cases, 9 real Worker/D1 groups and 56 browser cases. Numerical solving remains in 1.5C–1.5F.
- Phase 1.5A executable audit corpus, explicit unsupported-model results, local acceptance runner and ADR 0008 for the staged electrical-core replacement. **Closed locally on 2026-09-30:** full phase command, 53 built-output plus 3 simulator browser cases, and 25 real Worker/D1 membership groups passed.
- Phase 1.5 circuit CRUD and server-owned diagnosis attempts (local migration 0005), shared circuit validation, fresh membership enforcement for protected editor/simulation actions, and IndexedDB recovery with explicit basic-copy/export flows.
- Real local D1/cookie/Chromium simulator acceptance and isolated paid browser fixtures; guest relay coverage checks coil-driven switching through Comlink.

- Phase 1.4 canvas foundation: cached physical-device vector artwork for all 115 component types, live instance markings and actuator states, terminal labels and reduced-motion support.
- Desktop/phone browser coverage for keyboard wiring, rotated drag cancellation, panel-aware fitting and SVG/PNG exports; opt-in 200-component/400-wire pan/drag/zoom measurement and test-only Canvas 2D paint comparison.

- Phase 1.3: trusted global roles, explicit audited local super-admin bootstrap, and canonical plans/features/manual entitlements/audit tables (migration 0004).
- Super-admin membership APIs with same-origin protection, primary D1 authorization, version conflicts and atomic audit; public plan and private own-membership reads preserve expiry/revocation and archive semantics.
- Pure `@electrasim/access` capability resolver and canonical content policy; 19 real local D1/cookie acceptance groups, added to `bun run verify`. Simulator gates and membership screens follow in 1.5/1.7/1.8; checkout remains Phase 7.


### Changed

- Raised the initial app JavaScript budget from 250,000 to 300,000 bytes gzip with the user's approval on 2026-10-06. The project can continue growing through features loaded on demand; other asset and interaction/solver limits retain their existing values. [Performance guidance](docs/PERFORMANCE.md).
- Timed steps now integrate through the requested final timestamp before accepting changed inputs. The declared bypass routes current outside the sensed contact instead of leaving an indeterminate ideal current split; real parallel bridge sharing remains unassessed. Fuse links survive OFF/ON until replacement, and ordinary breaker trips never imply damage.
- Electrical results now carry `engineVersion`, signed branch voltages/powers, wire losses, references, terminal domains, source-branch mapping and conservation checks, plus shared readiness and separate load/wire/pole/transformer operating points, protective currents and limited fault estimates, with static engine `mna-linear-2`, control engine `mna-controls-4`, standalone dimming `mna-dimming-1` and shared model/capability version `1.5e.2.1`. The separate phasor API reports `mna-phasor-resistive-1` or timed coil engine `mna-phasor-controls-1`. The app runtime selects scalar MNA or the separate complex RMS result for supported circuits; guarded legacy observation remains for unmigrated load/control/fault models.
- Every Run path uses current shared readiness; empty/missing-source/invalid drawings cannot start ordinary simulation, and open/no-load drawings require diagnostic Run. Diagnosis and construction grading reject altered authored supplies. Unsupported waveform, energy and terminal-pair measurements are labeled unavailable; inspector tabs and the command palette load on demand within the existing bundle budget.
- Wire displays and sizing advice use shared mm²/AWG/endpoint/default resolution. Metric/AWG edits preserve one physical size through undo/export, unknown capacities stay unassessed, and inspector telemetry no longer substitutes 0.05 Ω or 20 A. Explicit wire sizes outrank component-tail recommendations; capacity comparisons remain distinct from timed trip/damage and complete safety assessment.
- Circuit and portable-backup writers emit schema 2 while reading schemas 1 and 2; autosaves upgrade under the existing IndexedDB key. Supply profiles survive save/import/export/share, undo/redo, recovery and worker/server boundaries. Confirmed supply edits preserve unrelated sources, device ratings and faults, use explicit AC/DC/frequency settings, and lock during running or active exercises. Standards and display-preference changes preserve edited drawings and saved supply settings.
- Source/status labels use saved waveform and frequency. Mixed/conflicting, DC and reserved three-phase configurations cannot obtain unsupported legacy measurements; limited Zs/EIC checks reject unsupported saved supply profiles.
- Missing switch states now use canonical catalogue defaults at domain/file/store boundaries while explicit off/trip/damage values remain intact. Authored in-memory momentary states survive exercise loading; persistence still releases held controls.
- Graph fault compilation distinguishes L–PE shorts, broken earth conductors and unassessed leakage impedance. Polarity swaps and terminal disconnections compose deterministically, and ambiguous fault paths remain unassessed.
- Protection operation now uses device capabilities and nameplate ratings: plain RCCBs and isolators do not trip as overcurrent breakers; ordinary breaker clearing no longer destroys the device; fuse links remain replaceable and damage entries are unique. Bypass suppresses protective operation; open-switch bypass traversal remains tracked for the new core.
- Unsupported DC source, transformer and three-phase drawings remain editable/exportable with electrical assessment unavailable. Timer/dimmer continuity limits are explicit; guide and inspector copy no longer presents unsupported results as measured behavior.
- Homepage browser assertions match current SEO copy. Astro's native esbuild helper uses the installed Node runtime to avoid the reproduced Bun service-launch failure; Bun remains the command/package runner.
- Relay contacts now isolate coils and poles, select NO/NC exclusively and operate/drop out from coil supply. DPDT adds NC terminals without renumbering saved ports; static coil-model limits remain documented.
- Basic diagnosis selects free-eligible recipes without changing version-1 seed semantics. Paid completion, timeout and abandonment preserve accepted scores, update local statistics and clear active records; revocation/reload preserves repair work read-only.

- Shared fit-to-view now uses SVG units, rotated footprints and measured floating panels across keyboard, desktop, phone and command-palette controls.
- Dense wire rendering retains diagnostic, trace, severed, short and melted-wire indicators. Canvas theme variables survive standalone exports.
- Memoized scene layers and gesture-aware panel blur substantially reduce dense pan work; the 60 fps dense-interaction target remains open, especially during zoom. SVG remains the production renderer; no dependency changes.

- Phase 1.2: extracted `@electrasim/domain` for the simulator, Comlink Worker and Astro consumers; added an ES2022-only compile/import boundary and real local Hono Worker parity checks. Existing circuit format is unchanged.
- Legacy fault normalization now preserves deterministic identity instead of generating fresh fault IDs/timestamps on each solver call.

- Phase 1.1: corrected standards references/adoption claims, scoped UK loop estimates with explicit unsupported results, removed universal EVSE/125% sizing policies and blanket compliance passes, and propagated supply/model context to the inspector and EIC export. Local D1 standards projection is version 2.
- Simulator trip reports retain actual device residual ratings across profiles and omit unmodelled US clearing times; switched-neutral hazards use actual supply voltage.
- Fixed intermediate-size cable resistance lookup and Bun Astro script invocation; retained documented limits of the numerical teaching models.

- Phase 1.0: confirmed manual-membership scope, inventoried 115 components (41 Pro) and accepted SVG/visual-only Matter ADR 0007.
- Development is local-only pending a new Cloudflare account. Removed the old shared local Wrangler login; disabled deployment and remote seeding, pinned bindings/test targets to local use and preserved the live account unchanged.

### Planning

- **2026-10-01 simulator behavior audit and phase revision:** recorded 42 local observations and current compatibility/editing/readiness/cable findings; selected MNA in ADR 0009. Expanded 1.5C.0–5 with shared compatibility, confirmed supply changes/Undo, readiness, truthful branch/wire results and actual runtime/UI integration. Mapped timed Fault Lab behavior to 1.5D, three-phase models to 1.5E, and full Diagnosis Lab/Ohmageddon grading/replay migration to 1.5F; 1.7 retains UI refinement. These are requirements, not implemented corrections. Four existing suites passed 145 tests with five expected failures; no full acceptance or deployment claim. See [audit](docs/audits/phase-1-behavior-review.md), [behavior plan](docs/plans/SIMULATOR_BEHAVIOR_PLAN.md) and [Phase 1](docs/phases/phase-1-simulator-core.md).

- **V3 full rewrite plan locked.** See `docs/REWRITE_PLAN_V3_FULL.md` — the real V3 (paper v3 never shipped).
  - Stack: **Bun** everywhere (`bun install/run/test/build`), **Hono on Workers**, **Better Auth + D1 (SQLite)**, **R2 + KV + Durable Objects (SQLite) + Queues**.
  - No external DB/compute. Previous `REWRITE_PLAN_V4_FULL.md` (Node/Postgres) superseded.
  - Brand kept, rebuilt from line 1: `labGlassLight/Dark` + `editorBackground` evolved, electrical-native whitespace, not generic SaaS.
  - Pro benefits, institution pricing (`flat` vs `perSeat`), achievements/levels/XP, permissions — **all admin-editable**, data not code.
  - Content Studio mini-CMS (blog + static pages, approval-gated).
  - Matter.js **visual-only** (overload tear, sag) — never touches `simulate()`.
  - Procedural engine for homepage / games / exam variants (`HMAC` per student).
  - Moderation ON by default + `moderator` role; exam strictness per-exam by instructor; certificates procedurally generated → R2.
  - **Localization (i18n):** locale-prefixed routes, `hreflang`, RTL, admin adds locales as data (§31).
  - **Electrical Standards IMMUTABLE:** code-owned (`standards.ts`, `electricalCalculations.ts`), super_admin read-only, D1 projection seeded at build (§32).
  - **D1 at scale:** replicas `withSession(bookmark)`, batched writes, KV shield, Queues, budgets — parallel-burst verified (§33).
  - **Astro two-stage:** SSG on Worker Assets → hybrid/D1 SSR (§30); dynamics (procedural hero, auth header, LMS-scoped guide) live in Worker.
  - Local-first: everything verified via `wrangler dev --local` before any Cloudflare deploy.
- **V2 archived.** `CHANGELOG.md` / `progress.md` / `TRACKING.md` / `PLAN.md` + `docs/decisions/` + `docs/plans/` + `docs/audits/` copied to `docs/archive/v2/`.

---

## [3.0.0] — Unreleased (V3.0 development)

_Template for first V3 release — remove this block when 3.0.0 ships._

### Added
- (Phase 0) Bun workspaces + Hono Worker + D1 via `wrangler d1` + Better Auth (`provider:"sqlite"`).

### Changed
- Runtime: Node/npm → Bun. DB: Postgres/Neon → D1. Auth: none → Better Auth (Google/GitHub/Microsoft).

### Fixed

- Phase 1.5A dependency review: targeted Astro, Vitest 4.1.11, Wrangler and transitive updates; Vitest config typing and menu-preload teardown fixes; accurate Node >=22.19.0 tooling requirement. The remaining esbuild advisory is documented as currently unexposed tooling use, not reported as a clean audit.
- Local acceptance fixtures now isolate the missing membership API in the offline built-assets test and explicitly open the inspector for unsupported transformer telemetry. Electrical and authorization assertions remain intact.
- —

### Removed
- —

---

## Pre-V3

For `2.0.4` and earlier see `docs/archive/v2/CHANGELOG-v2.md`.
