# ElectraSim Documentation Directory

This directory contains technical documentation, Architecture Decision Records (ADRs), specifications, feature plans, audits, and design references for the ElectraSim project.

> **Active v3 implementation foundation:** [`../v3/README.md`](../v3/README.md) — isolated Bun workspace, portable HTTP boundary, OCI definition, tests, and managed-PaaS spike evidence.

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
│   ├── 0007-bun-cloudflare-portable-runtime.md # Superseded by ADR 0009
│   ├── 0008-deterministic-simulation-animation.md
│   ├── 0009-bun-paas-cloudflare-cdn.md
│   ├── 0010-postgresql-tenancy-rls.md
│   ├── 0011-auth-account-lifecycle-onboarding.md
│   ├── 0012-localization-content-language.md
│   └── 0013-platform-admin-content-studio.md
├── plans/                  # Feature implementation plans & design briefs
│   ├── ElectraSim-Cable-Sizing-Visual-Plan.md
│   ├── ElectraSim-Challenge-Mode-Plan.md
│   ├── ElectraSim-Circuit-Generator-Foundation-Test-Plan.md
│   ├── ElectraSim_Electrical_Toolbox_Master_Plan.md
│   ├── ElectraSim_Interactive_Guide_Implementation_Plan_v3.md
│   ├── LIGHT-EXPLORER-PLAN-v3.md
│   └── UI_V2_REDESIGN_PLAN.md
├── audits/                 # Component audits & capability gap analyses
│   ├── V3_CODEBASE_UX_AUDIT.md  # v3 rewrite evidence: architecture, tests & rendered UI
│   ├── COMPONENT_AUDIT_REPORT.md
│   └── FEATURE_ANALYSIS.md
├── prototypes/             # Reviewable UX prototypes and validation captures
│   ├── v3-shell-demo.html  # Responsive learner home and onboarding demo
│   ├── v3-simulator-workbench-demo.html # Interactive Build/Test/Diagnose/Review workbench
│   ├── v3-fault-animation-demo.html # Animated overload, trip, failed-protection & damage lab
│   ├── v3-platform-switchboard-demo.html # Non-sidebar platform operations and Content Studio
│   ├── v3-content-studio-editor-demo.html # Hybrid WYSIWYG, Markdown, review and attribution flow
│   └── images/             # Desktop/tablet/mobile reviewed states
├── notes/                  # Implementation notes & technical records
│   └── IMPLEMENTATION_NOTES.md
├── branding/               # Design identity, logo concept & aesthetic notes
│   └── logo-concept.md
├── archive/                # Historical launch, plan, changelog & progress archives
│   ├── PLAN-v2-legacy-2026-09-24.md
│   ├── CHANGELOG-v2-legacy-2026-09-24.md
│   ├── progress-v2-legacy-2026-09-24.md
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

### 4. UX Prototypes (`docs/prototypes/`)
Standalone, dependency-free review artifacts created before implementation. The shell demo establishes the electrical-blue left-sidebar composition, mandatory onboarding, responsive behavior, and spacious non-dashboard home. The linked simulator workbench demonstrates a product-specific electrical workspace with responsive circuit canvas, component bench, contextual inspector, simulation evidence, and Build/Test/Diagnose/Review modes. Its fault lab compares a correctly coordinated trip with failed protection and persistent conductor damage through controllable animation and an explainable event timeline.

### 5. Implementation Notes (`docs/notes/`)
Low-level technical notes regarding simulation edge cases, numerical stability, and domain abstractions.

### 6. Performance (`docs/PERFORMANCE.md`)
Enforced size ceilings (gzip JS/CSS), frame budgets (60 fps), solver timing limits (<8 ms p95 main thread fallback), and crawler index limits.
