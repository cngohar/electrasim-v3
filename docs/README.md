# ElectraSim Documentation Directory

This directory contains technical documentation, Architecture Decision Records (ADRs), specifications, feature plans, audits, and design references for the ElectraSim project.

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
│   └── 0006-seed-share-format.md
├── plans/                  # Feature implementation plans & design briefs
│   ├── ElectraSim-Cable-Sizing-Visual-Plan.md
│   ├── ElectraSim-Challenge-Mode-Plan.md
│   ├── ElectraSim-Circuit-Generator-Foundation-Test-Plan.md
│   ├── ElectraSim_Electrical_Toolbox_Master_Plan.md
│   ├── ElectraSim_Interactive_Guide_Implementation_Plan_v3.md
│   ├── LIGHT-EXPLORER-PLAN-v3.md
│   └── UI_V2_REDESIGN_PLAN.md
├── audits/                 # Component audits & capability gap analyses
│   ├── COMPONENT_AUDIT_REPORT.md
│   └── FEATURE_ANALYSIS.md
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
