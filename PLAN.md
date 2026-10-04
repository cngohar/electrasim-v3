# ElectraSim — Master Plan (Pointer)

> **V3 is the real V3.** The paper plan shipped as `2.0.x` was archived; the active plan is below.
> Do not use this file for stack/roadmap detail — it lives in the full rewrite doc.

| What | Where |
|------|-------|
| **Active plan (locked)** | [`docs/REWRITE_PLAN_V3_FULL.md`](./docs/REWRITE_PLAN_V3_FULL.md) — Bun + 100% Workers (D1/R2/KV/DO/Queues), Better Auth, electrical-native UI |
| **Phase 1 — current detailed sequence** | [`docs/phases/phase-1-simulator-core.md`](./docs/phases/phase-1-simulator-core.md) — 1.5C.0–5 complete locally; next 1.5D timed controls/protection; remaining 1.5D–1.5F work precedes effects |
| **Deep-scan reconciliation and core rebuild** | [`docs/plans/SIMULATOR_CORE_REBUILD_PLAN.md`](./docs/plans/SIMULATOR_CORE_REBUILD_PLAN.md) — current findings, independent fixtures, replacement stages and later-phase requirements |
| **Simulator behavior and lab integration** | [`docs/plans/SIMULATOR_BEHAVIOR_PLAN.md`](./docs/plans/SIMULATOR_BEHAVIOR_PLAN.md) — shared compatibility, confirmed supply edits, readiness, cable/current semantics and Fault Lab/Diagnosis Lab/Ohmageddon phase ownership |
| **Current behavior audit** | [`docs/audits/phase-1-behavior-review.md`](./docs/audits/phase-1-behavior-review.md) — 42 local observations, source-inspected UI findings, existing safeguards and remaining requirements |
| **MNA numerical decision** | [`docs/decisions/0009-mna-solver.md`](./docs/decisions/0009-mna-solver.md) — selected formulation; bounded linear slice, operating points, isolated transformer/PE equations and application runtime implemented |
| **Phase 1.5C.5 MNA application runtime** | [`docs/audits/phase-1-mna-runtime.md`](./docs/audits/phase-1-mna-runtime.md) — shared supported-result runtime across domain, Comlink and local Hono; passing local acceptance |
| **Phase 1.5C.4 editing and readiness** | [`docs/audits/phase-1-editing-readiness.md`](./docs/audits/phase-1-editing-readiness.md) — confirmed supply changes, safe terminal mapping, shared Run guidance and passing local acceptance |
| **Phase 1.5C.3 transformers and PE** | [`docs/audits/phase-1-transformers-pe.md`](./docs/audits/phase-1-transformers-pe.md) — coupled AC equations, explicit references, limited fault currents and passing local acceptance |
| **Phase 1.5C.2 load response and wires** | [`docs/audits/phase-1-load-response.md`](./docs/audits/phase-1-load-response.md) — fixed-rating voltage sweeps, finite wire losses, per-pole currents, shared wire properties and passing local acceptance |
| **Phase 1.5C.1 linear MNA** | [`docs/audits/phase-1-mna-solver.md`](./docs/audits/phase-1-mna-solver.md) — independent analytical fixtures, conservation checks and bounded numerical solve |
| **Phase 1.5C.0 supplies and preflight** | [`docs/audits/phase-1-supply-preflight.md`](./docs/audits/phase-1-supply-preflight.md) — schema-2 migration, 115-variant capability inventory, shared compatibility/readiness and passing local acceptance |
| **Phase 1.5B electrical contracts and graph** | [`docs/audits/phase-1-electrical-contracts.md`](./docs/audits/phase-1-electrical-contracts.md) — input/default/wire policy, source/pole/winding isolation, fault coverage and local gate evidence |
| **Phase 1.5A completed local acceptance** | [`docs/audits/phase-1-audit-baseline.md`](./docs/audits/phase-1-audit-baseline.md) — passing phase/browser/Worker gates and explicitly scoped remaining core defects |
| **Phase 1.5A dependency review** | [`docs/audits/phase-1-dependencies.md`](./docs/audits/phase-1-dependencies.md) — Vitest 4.1.11 migration, targeted updates and one reviewed tooling advisory |
| **Paid membership specification** | [`docs/plans/PAID_MEMBERSHIP_PLAN.md`](./docs/plans/PAID_MEMBERSHIP_PLAN.md) — free/paid boundary, super-admin management, lifecycle and gates |
| **Standards research** | [`docs/audits/electrical-standards-gap.md`](./docs/audits/electrical-standards-gap.md) — IET/NFPA/IEC sources checked 2026-09-26 |
| **Previous full draft (superseded)** | `docs/REWRITE_PLAN_V4_FULL.md` (Node/Postgres) — kept for diff only |
| **V2 archive** | [`docs/archive/v2/PLAN-v2.md`](./docs/archive/v2/PLAN-v2.md) + decisions/plans/audits |
| **Changelog** | [`CHANGELOG.md`](./CHANGELOG.md) |
| **Progress log** | [`progress.md`](./progress.md) |
| **Privacy/SEO/delivery** | [`TRACKING.md`](./TRACKING.md) |

## V3 Cross-Cutting (added 2026-09-25)

- **i18n (§31):** locale-prefixed routes (`/en/` `/fr/` `/de/`…), `hreflang`, RTL, `content_pages(locale)`, `i18n_strings` — admin adds locales as data. Simulator chrome + LMS + emails all localized; electrical numbers never translate.
- **Electrical Standards (§32 — IMMUTABLE):** `domain/standards.ts` + `electricalCalculations.ts` + `tripCurves.ts` + `compliance.ts` are **code-owned, versioned in git**. D1 `electrical_standards` is read-only projection. **Super admin = read-only viewer**; no `POST/PATCH /api/standards` exists. Changes only via reviewed PR + migration + release. This is a safety/regulatory boundary and overrides "everything admin-editable".
- **D1 at Scale (§33):** read replicas (`withSession(bookmark)`), short `D1.batch()` writes, KV read shield (70% off D1), Queues for slow work, idempotency, `409` on stale `updatedAt`, DO for hot aggregates, budgets (p95 write <50ms), `EXPLAIN QUERY PLAN` per new query. Parallel-burst local verification before any remote deploy.
- **Astro in V3 (§30):** redesigned in place (Stage A: `bun x astro build` → Worker Assets), then data source swaps to D1 Content Studio (Stage B: hybrid/SSR). Dynamics (procedural hero, auth-aware header, LMS-scoped guide, `FTS5` search) live in Worker, not static Astro.

## V3 Phases (summary — detail in REWRITE_PLAN_V3_FULL §28)

0 Foundation (Bun + Hono Worker + D1/R2/KV/DO + Better Auth) →
1 **Simulator core rebuild + manual paid memberships (Lab Circuit — heart, NOT deferred)** →
2 Community (Published Circuit sharing — **deferred until simulator**) →
3 Gamification → 4 Procedural engine → 5 Wiring Games + Content Studio →
6 LMS → 7 Online checkout + Pro polish → 8 Hardening & live cutover

**Membership decisions (2026-09-26):** basic faults/diagnosis remain free to guests; existing Pro components, advanced faults/multi-fault exercises and advanced diagnosis/Ohmageddon require membership. Super admins manage plans, benefits and assignments in Phase 1; checkout remains Phase 7. Additional benefits remain configurable but uncommitted. The revised Phase 1 sequence is 1.0–1.9, with local gates throughout.

**Audit revision (2026-09-30):** preserve completed 1.0–1.5 foundations; insert **1.5A–1.5F before 1.6 Matter effects**. Replace the electrical core through a stable domain boundary, covering real branch currents, voltage/source domains, isolation, time/protection and supported three-phase models. Retain the useful canvas/persistence/access work. The [supplied audit](./v3-audit.md) targets V2; the linked reconciliation distinguishes current defects, fixed/partial findings and unverified claims. Later phases inherit model-version and supported-coverage requirements. Re-estimate the schedule after the first solver slice.

**Behavior revision (2026-10-01):** **1.5C** delivers MNA plus essential compatibility, confirmed supply changes/Undo, circuit readiness and cable/current correctness. **1.5D/E** add timed and three-phase models; **1.5F** completes existing labs, grading/replay and legacy retirement. **1.7** refines the UI; **Phases 3–6** expand scoring/generation/content/LMS after existing exercises use truthful results. Current implementation progress is recorded below.

**Core progress (2026-10-04):** **1.5C.0–5 are complete locally**, covering persisted supplies, shared preflight, bounded linear MNA, load/wire response, isolated transformer/PE equations, essential editing/readiness UI and the application/Comlink/local-Hono MNA runtime. The latest [1.5C.5 gate](docs/audits/phase-1-mna-runtime.md) passed 2,000 unit checks, 626 local runtime parity cases, 10 Worker/D1/session groups and 49 browser cases. **Next is 1.5D timed controls and protection**; a guarded legacy observation path remains for unmigrated models.

**Deferral clarified 2026-09-25:** **Lab Circuit** (simulator `domain/simulation` + canvas + Matter.js visual) is **NOT deferred** — it is Phase 1.
Deferred is **Published Circuit** (sharing to feed `/feed` `/explore` `/c/[id]` + fork chain), which naturally comes with Community (Phase 2+).

**Local-only contract (2026-09-26):** the live site’s Cloudflare credentials have been removed locally. All development and tests stay local; no old-account login or remote operations. A new account will be configured after development, with explicit user authorization before remote work. See `AGENTS.md` and `TRACKING.md`.
