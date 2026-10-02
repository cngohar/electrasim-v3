# ElectraSim Documentation Directory

This directory contains technical documentation, Architecture Decision Records (ADRs), specifications, feature plans, audits, and design references for the ElectraSim project.

Current work: [Phase 1 simulator core](phases/phase-1-simulator-core.md). The [deep-scan reconciliation and electrical-core rebuild plan](plans/SIMULATOR_CORE_REBUILD_PLAN.md) inserts 1.5A–1.5F before visual effects and maps the root audit to current V3 findings and later-phase gates. Development and testing remain local-only under root `AGENTS.md`.

[Phase 1.5C.2 load response and wires](audits/phase-1-load-response.md) records fixed-rating operating points, finite losses, per-pole currents, wire-property corrections and the passing local gate. **1.5C.0–2 are complete locally; next is 1.5C.3 isolated transformers/PE.** [Linear MNA acceptance](audits/phase-1-mna-solver.md) and [supplies/preflight](audits/phase-1-supply-preflight.md) retain the earlier numerical and persisted-contract evidence. [Phase 1.5B contracts](audits/phase-1-electrical-contracts.md) retains input/default/wire policy, topology and fault coverage. [Phase 1.5A acceptance](audits/phase-1-audit-baseline.md), the [dependency review](audits/phase-1-dependencies.md) and [ADR 0008](decisions/0008-staged-electrical-core.md) retain the earlier corrections and migration boundaries. Full editing/readiness UI and actual MNA runtime integration remain in 1.5C.4–5.

[Current behavior audit](audits/phase-1-behavior-review.md) completes the 2026-10-01 review with 42 local observations and source-inspected editing/exercise findings. [ADR 0009](decisions/0009-mna-solver.md) selects **MNA**, and the [behavior plan](plans/SIMULATOR_BEHAVIOR_PLAN.md) assigns shared compatibility, confirmed supply changes, readiness and cable/current correctness to **1.5C.0–5**, timed behavior to **1.5D**, three-phase models to **1.5E**, and full Fault Lab/Diagnosis Lab/Ohmageddon integration to **1.5F**. These are implementation requirements; the audit update does not implement the solver or UI corrections.

## Directory Structure

```
docs/
├── README.md               # This directory index
├── PERFORMANCE.md          # Performance budgets, benchmark baselines & telemetry rules
├── decisions/              # Architecture Decision Records (ADRs)
│   ├── 0001-visual-direction.md
│   ├── 0002-challenge-generator-foundation.md
│   ├── 0003-challenge-mode-comparison.md
│   ├── 0004-diagnosis-lab.md
│   ├── 0005-ohmageddon-foundation.md
│   ├── 0006-seed-share-format.md
│   ├── 0007-renderer-svg-matter-only.md
│   ├── 0008-staged-electrical-core.md
│   └── 0009-mna-solver.md
├── plans/                  # Feature implementation plans & design briefs
│   ├── ElectraSim-Cable-Sizing-Visual-Plan.md
│   ├── ElectraSim-Challenge-Mode-Plan.md
│   ├── ElectraSim-Circuit-Generator-Foundation-Test-Plan.md
│   ├── ElectraSim_Electrical_Toolbox_Master_Plan.md
│   ├── ElectraSim_Interactive_Guide_Implementation_Plan_v3.md
│   ├── LIGHT-EXPLORER-PLAN-v3.md
│   ├── UI_V2_REDESIGN_PLAN.md
│   ├── SIMULATOR_CORE_REBUILD_PLAN.md
│   └── SIMULATOR_BEHAVIOR_PLAN.md
├── audits/                 # Component audits & capability gap analyses
│   ├── COMPONENT_AUDIT_REPORT.md
│   ├── FEATURE_ANALYSIS.md
│   ├── phase-1-electrical-contracts.md
│   ├── phase-1-behavior-review.md
│   └── phase-1-supply-preflight.md
├── notes/                  # Implementation notes & technical records
│   └── IMPLEMENTATION_NOTES.md
├── branding/               # Design identity, logo concept & aesthetic notes
│   └── logo-concept.md
├── archive/                # Historical launch checklists & milestone archives
│   ├── LAUNCH.md
│   └── LAUNCH-v1.0.0.md
└── research/               # Planning notes, survey data & exploratory work
    └── v2-planning/
```

## Sections Overview

### 1. Architecture Decisions (`docs/decisions/`)
Records irreversible architectural choices. Every significant design pivot requires an ADR before or alongside implementation.

### 2. Feature Plans (`docs/plans/`)
Detailed architectural specifications and roadmaps for major capabilities including the Electrical Toolbox, Cable Sizing Visualizer, Challenge Mode, and Circuit Generator.

### 3. Audits & Reports (`docs/audits/`)
Comprehensive audits of electrical component libraries, symbols, terminal definitions, and feature parity against real-world wiring guides.

### 4. Implementation Notes (`docs/notes/`)
Low-level technical notes regarding simulation edge cases, numerical stability, and domain abstractions.

### 5. Performance (`docs/PERFORMANCE.md`)
Enforced size ceilings (gzip JS/CSS), frame budgets (60 fps), solver timing limits (<8 ms p95 main thread fallback), and crawler index limits.
