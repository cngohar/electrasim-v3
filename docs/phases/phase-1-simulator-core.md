# Phase 1 — Simulator Core (Lab Circuit Heart)

> **Status:** IMPLEMENTING — 1.0 inventory and local-only isolation completed 2026-09-26; 1.1 standards corrections completed; 1.2 domain extraction completed; 1.3 memberships/roles completed locally on 2026-09-27; 1.4 canvas foundation implemented locally (dense 60 fps target remains open); 1.5 state/persistence next. Simulator membership enforcement and UI remain pending in 1.5/1.7/1.8. See [inventory evidence](../audits/phase-1-inventory.md).
> **Method:** Sub-phase → Steps → Gate. Each implementation sub-phase ships as its own scoped commit. All development is local-only: the old live-account credentials were removed locally; a new account will be configured after development. Passing a gate never authorizes remote access (see root `AGENTS.md`).
> **Previous baseline:** Phase 0 recorded `typecheck/lint/vitest 97/1464`, local D1 14 tables and auth 200. These are historical results, not checks rerun for this planning revision.
> **Principle:** Electrical standards are code-owned (§32). D1 `electrical_standards` remains read-only, including for super admins. Membership controls features, never electrical rules or the truth of basic safety diagnostics.

## 0. Decisions before code

### 0A. Retain SVG; Matter is visual only

Keep the accessible SVG renderer, `labGlassLight/Dark`, `editorBackground` and orthogonal routing. Enhance existing component artwork to resemble physical electrical devices using clean vector illustrations, as confirmed by the user on 2026-09-27. Introduce viewport culling, LOD and dirty-flag rendering as measurements require. Target 60 fps at 200 components + 400 wires and simulation median <5 ms; measure renderer and solver costs separately during this phase. The current 202-component/300-wire headless fixture does not establish the new rendering target; use ADR 0007's measurement-based decision boundary before considering another renderer.

Matter.js is limited to sag, snapping and overload effects. It must never change `simulate()` results. Pixi/Three remain outside this phase. Record the decision in `docs/decisions/0007-renderer-svg-matter-only.md` during inventory.

### 0B. Standards audit runs first

Use [the revised electrical standards audit](../audits/electrical-standards-gap.md). Public IET, NFPA and IEC sources were checked on 2026-09-26. Required corrections include:

- BS 7671:2018+A4:2026 is published; the A2:2022 book with A3:2024 remains valid during the transition until **15 October 2026**.
- NEC 2026 is published; adoption is jurisdiction-specific. A citation must not imply every US installation uses that edition.
- IEC 60364 is a series with separately versioned parts. **IEC 60364-8-81:2026 replaces 8-1:2019**; **8-82:2022+AMD1:2026** is the current consolidated prosumer reference found in the publisher search.
- `int` is a generic IEC teaching profile. Countries sharing 230 V / 50 Hz do not necessarily share installation rules; `eu` also needs national-adoption caveats.
- Do not mandate a C-curve breaker for every EV charger, reuse UK Zs rules as NEC rules, or use 400 V line-to-line voltage for a 230 V line-to-earth loop check. The audit replaces these earlier proposed fixes.

Edition metadata, implemented model coverage and jurisdictional adoption are separate facts. Updating a citation or passing an internal score does not establish full-standard compliance.

### 0C. Membership decisions confirmed by the user

| Capability | Guest / free account | Active paid member |
|------------|----------------------|--------------------|
| Basic simulator and components | Yes | Yes |
| Basic fault injection and diagnosis | Yes, including guests | Yes |
| Basic safety warnings and detection of wiring mistakes | Yes | Yes |
| Existing Pro components | Preview; use requires membership | Yes |
| Advanced fault exercises, including multiple injected faults | Preview; use requires membership | Yes |
| Advanced Diagnosis Lab and all Ohmageddon tiers | Preview; use requires membership | Yes |
| Additional benefits | Existing free functionality remains | Configurable framework; no additional benefit enabled or promised yet |

**Phase 1:** super admins create/edit/delete paid plans and manually grant/edit/revoke memberships. **Phase 7:** online checkout and payment lifecycle, using the same entitlement model. Prices, durations and names are data; do not invent commercial defaults.

Membership is separate from platform/organization roles. Ordinary admins, instructors and organization owners cannot manage paid plans or grants. Data model, access boundaries, deletion semantics and tests: [Paid Membership Plan](../plans/PAID_MEMBERSHIP_PLAN.md).

### 0D. Dense, legible simulator UI

Use the same theme tokens with two densities: spacious marketing shells and a dense simulator. Preserve search, plug-family filtering, recent components, resizable panels, minimap, command palette and zoom-to-fit. Inspector v2 groups Properties, Wiring, Simulation and Analytics. Lock indicators explain membership features without hiding free diagnostics.

### 0E. Component appearance — user-confirmed 2026-09-27

Enhance the current SVG artwork into consistent, recognizable illustrations of actual device families. The user approved the rest of the proposed canvas direction: a large wiring surface, compact surrounding controls, clear routing/terminals and uncluttered navigation.

- Use meaningful silhouettes, housing proportions, terminal blocks, screws, toggles, knobs and restrained shading. Keep drawings legible in both themes and at working zoom levels. Photorealistic raster imagery is outside this brief.
- Distinguish device families: DIN-rail protection with toggles/test-button markings as applicable; region-appropriate socket faceplates; contactors with terminal blocks; motors with fins, terminal boxes and shafts; switches/dimmers with recognizable actuators.
- Printed ratings and animated states must match the configured component and solver state. Replace hardcoded illustrative ratings when they can disagree with the device configuration. Artwork must not imply unsupported terminals, functions or electrical findings.
- Preserve canonical component/terminal IDs, connectivity and saved-circuit compatibility. Align artwork with the existing interactive terminal anchors; any geometry change needs explicit routing and restore regression checks.
- Build reusable artwork by device family and evaluate the enhanced catalog in the dense-circuit benchmark. Reduce decorative detail at distant zoom levels while retaining important state and fault cues.

This visual work belongs to 1.4's component rendering foundation. The broader palette/toolbar/inspector redesign remains in 1.7; physical cable effects remain in 1.6.

## 1. Revised sub-phase map

This replaces the previous 1.0–1.7 sequence. Membership foundations precede persistence; the final local gate is now **1.9**.

| Sub-phase | Title | Scope | Key files / planned modules | Local exit gate |
|-----------|-------|-------|-----------------------------|-----------------|
| **1.0** | **Inventory and scope** | Refresh domain/UI census; trace tiers, faults, imports, seeds and auth; finish standards register and renderer ADR | `docs/audits/*`, `docs/decisions/0007-*.md`, membership plan | Confirmed requirements map to implementation/tests; uncertain clauses marked unverified |
| **1.1** | **Standards corrections** | Correct claims/edition metadata; review EVSE, Zs applicability, voltage-drop/rating policies and regional diagnostic text; reseed verified changes | `packages/domain/src/{standards,zsCheck,compliance,faults,templates}.ts`, electrical helpers, relevant Astro tools, migrations | Typecheck + targeted Vitest; independent expected-value fixtures; unsupported cases never yield a false compliance pass |
| **1.2** | **Domain package** | Extract pure `packages/domain`; retain one `Circuit` format; separate electrical computation from access policy | `packages/domain/**`, workspace/import configuration | Typecheck all projects; browser/Hono Worker compatibility; parity tests |
| **1.3** | **Membership and roles** | Trusted global role, super-admin bootstrap, plans/features/entitlements/audit schema, resolver and manual APIs | `packages/db/**`, migrations, planned `packages/access/**`, Hono routes | Local D1 + cookie-authenticated role/entitlement tests; signup cannot self-assign role/access |
| **1.4** | **Canvas base** | SVG layers, enhanced physical-device artwork, routing, fitRegion, measured culling/LOD, theme CSS variables | `src/ui/canvas/**` | Browser/a11y checks; measure 200-component/400-wire workload with enhanced artwork |
| **1.5** | **State, simulation and persistence** | Slim Zustand; `comlink`; circuit CRUD; gate premium actions, imports, copies, restores and server results | `src/store/**`, `src/sim-worker/**`, Hono circuit/scenario routes | Free local sim without login; fresh paid authorization; imported content cannot bypass gates; downgrade preserves documents |
| **1.6** | **Matter visuals** | Sag/snap/overload effects, throttling and offscreen sleep | planned `src/ui/canvas/MatterLayer.tsx` | Same electrical output with effects on/off; reduced-motion and perf checks |
| **1.7** | **Simulator UI and modes** | Palette/Inspector/commands; basic vs advanced controls; membership status; read-only premium documents | `src/ui/components/**`, access client state | Guest completes basic diagnosis; paid member runs advanced/Ohmageddon; keyboard and restore paths obey policy |
| **1.8** | **Super-admin membership UI** | `/admin/pro` plans/benefits/members/audit; grant, edit, extend, suspend/revoke, archive/delete | admin UI + APIs from 1.3 | Create plan → assign member → unlock → edit → revoke; ordinary admin/org owner denied by API and UI |
| **1.9** | **Verify** | Full local gate, authorization matrix, expiry/revocation, legacy migration, D1 burst and perf | scripts, local API/browser suites | `bun run verify` plus dedicated Worker API/E2E gates against local Wrangler; all required cases below pass |

Revisit the roadmap estimate after inventory; added membership/admin work is not assumed to fit the original simulator-only estimate.

## 2. Next implementation steps

| Step | Action | Evidence / gate |
|------|--------|-----------------|
| 1.0.1 | Refresh inventory with `rg --files`; trace registry, stores, circuit entry points and Worker routes | Current paths/counts, not historical line counts |
| 1.0.2 | Record authoritative standards, edition/adoption distinctions and unresolved clauses | [Audit](../audits/electrical-standards-gap.md), source linked to each decision |
| 1.0.3 | Census all Pro component IDs and 14 current `FaultType` values; map diagnosis/rage profiles | Every ID covered; unknown IDs rejected at protected entry points |
| 1.0.4 | Write ADR 0007 for SVG and visual-only Matter | Solver behavior stays independent |
| 1.0.5 | Confirm scripts/dependencies; change dependencies only when required | No unverified latest-version claim or unrelated upgrade sweep |
| 1.1.1 | Implement audited claim/applicability corrections before numerical changes | No automatic EVSE B→C patch |
| 1.1.2 | Add independent regression fixtures for verified rules; update D1 through local migration | Supported valid and invalid cases; no demand for one UK EV template to score 100 under every profile |
| 1.3.1 | Implement trusted role/bootstrap and schema before membership CRUD | No self-grants; super-admin action audited |
| 1.3.2 | Implement manual memberships and common capability resolver | Active, scheduled, expired, suspended and revoked behavior covered |

The 1.0 inventory, 1.1 claim/applicability, 1.2 domain-package and 1.3 membership/role gates are complete. The 1.4 canvas foundation and measurement gate are complete locally; continue with 1.5. Dense interaction performance is not yet 60 fps; see [performance evidence](../PERFORMANCE.md). Phase 1.3 passed 19 real local D1/cookie API groups, all 1,514 unit tests, typechecks, lint and the production asset build. Migration 0004 is applied locally. See the [membership API and bootstrap contract](../api/membership.md). See [standards implementation evidence](../audits/phase-1-standards-implementation.md). Later sub-phases remain gated on their predecessors.

## 3. Membership acceptance scenarios

- Guest/free users build a basic circuit, inject one basic fault, trace it and complete a basic diagnosis without payment.
- A paid member uses Pro components, advanced injection, advanced diagnosis and Ohmageddon; identical authorized scenarios produce identical electrical results.
- Super admin creates, edits and removes plans/grants. Membership removal revokes access while preserving audit; referenced-plan removal archives without erasing grants or circuits.
- Browser settings, forged payloads, direct URLs, imported/pasted components, shared seeds and resumed IndexedDB sessions cannot grant server-authorized paid access.
- Expiry/logout/suspension/revocation and plan capability edits apply on the next protected action, independently of stale public config caches.
- Downgrade preserves premium documents read-only and permits raw backup and a user-created basic copy. It never silently deletes components or suppresses known hazards.
- Naturally miswired free circuits still receive multiple safety findings. The paid multi-fault limit applies to deliberate exercises/injection.
- No payment provider is needed for the Phase 1 flow; unimplemented benefits are not advertised.

## 4. Verification and risks

- Current `e2e:production` defaults to `scripts/preview-server.mjs`. Static preview cannot prove membership authorization. Add a suite using `wrangler dev --local --persist-to .wrangler/state` with isolated test data and real sessions/D1; pin Phase 1 URLs to localhost.
- Preserve `bun run verify` (build, perf, links/SEO/CSP, simulation/browser benchmarks and E2E), and add Worker membership gates. Old test counts are not acceptance criteria.
- Browser simulation code can be modified by its owner. UI gates cover supported flows; Hono protects server actions, premium content delivery and accepted results. Basic offline use remains; Phase 1 premium actions require online validation, without a tamper-proof offline licensing claim.
- `appMode` currently controls palette visibility and some stress calculations. Separate access, presentation and fault reporting so payment cannot make an unsafe circuit appear safe.
- Publisher summaries do not verify every numerical rule. Mark unsupported national rules, earthing arrangements and device models explicitly.
- D1 authorization needs fresh primary reads and atomic conditional writes where needed; a 60-second public cache cannot extend revoked access. See the membership plan and §33.
- No remote deployment, checkout activation or production membership migration is part of this planning update.
