# Next chat handoff — Phase 1.12: Missing component calculation

Status: **planned; implementation not started**. The user requested committing
and pushing the current repository, then creating this new phase plan.

## Published baseline

- Repository: `cngohar/electrasim-v3`, branch `main`.
- Implementation checkpoint: `ac6c1d9cc889506d04c2a89f372c9db1c241dfe8`.
- GitHub publication of that checkpoint was verified on 2026-10-14 by matching
  local HEAD, `origin/main` and the advertised remote head; divergence was `0 0`.
- The Phase 1.12 plan is a separate documentation checkpoint. Inspect current
  `git log` and `git status` before resuming rather than treating the implementation
  hash above as the latest planning commit.

Phase 1.11's approved Fault Lab implementation, all-type application/clearing
repairs and Diagnosis retirement are committed. Historical records and shared
electrical contracts remain. Read [its audit](../audits/phase-1-fault-lab-redesign.md)
for the historical complete/focused evidence boundaries. No deployment occurred.

## Read first

1. [Phase 1.12 plan](../plans/MISSING_COMPONENT_CALCULATION_PLAN.md).
2. [Catalogue gap inventory and feedback audit](../audits/catalogue-simulation-gaps.md).
3. [Phase 1 roadmap](../phases/phase-1-simulator-core.md) and current `progress.md`.
4. Root `AGENTS.md`, then linked model/compiler/runtime/UI source from the graph.

The default inventory is **116 entries**, with **31 unassessed defaults**: 30 need
missing electrical behaviour code; one three-phase motor already supports a
configured teaching model. The other 85 include conditional/partial controls and
unknown ratings. Do not claim complete numerical operation from this inventory.

The LED reproducer is a connected L/N drawing with a 12 V document supply and a
230 V / 9 W LED. Source magnitude is correct. Current LED behaviour remains
unsupported even at 230 V. The published repair makes that result visible and
separates Model unavailable from Ratings unknown; it does not implement an LED,
fan or appliance calculation.

## First milestone

Start **1.12.0 — Profile and coverage specification**. Produce the reproducible
inventory, parameter/provenance matrix, per-family model/operating-state decisions,
lamp profile and migration/validation contract. Then implement shared numerical
support and the first real lamp workflow in 1.12.1–2. Continue through fans/motors,
appliances/alarms, special sources/devices and conditional controls before final
catalogue integration. Keep the plan's milestone acceptance checks explicit.

```sh
bun run graph:phase
bun run graph:brief -- "missing-component-calculation"
bun run graph:find -- resolveDeviceModel
bun run graph:impact -- packages/domain/src/core/models.ts
```

## Evidence and boundaries

- Published feedback scope: 465 affected units, 842 exact isolated Bun/workerd
  parity cases, three native source browser flows, three actual-Comlink numerical
  regressions and two rebuilt desktop/phone native flows. Types/lint/build and
  delivery budgets passed. These do not accept the planned new models.
- Independent equations/reference fixtures, current model/input identity and real
  runtime/browser output are required. Do not substitute label-based estimates or
  visual effects for electrical calculation.
- Preserve existing custom ratings, independent supplies, IDs/ports/routes,
  stored drawings, membership boundaries and separate clear/reset/replacement.
- Historical solver/generator/frame exceptions remain open. Model functionality,
  graph freshness, GitHub publication and deployment are separate statuses.
- All development and verification remain local. GitHub authorization for this
  checkpoint does not authorize Cloudflare deployment or old-account operations.
