# Next chat handoff · Phase 1.11 completed locally

## Where the work stands

The user reviewed the Fault Lab handoff/plan/prototype, then explicitly said
“accepted and continue implementing.” Phase 1.11 implementation and aggregate
local functional acceptance are complete. Do not restart the design approval gate.
Read [the audit](../audits/phase-1-fault-lab-redesign.md) for exact evidence,
preservation boundaries and failure recovery.

The last Git checkpoint predates all Phase 1.11 work:

- Commit: `fa74721694d57f9266c1988be51eea55b65cb92b`
- Subject: `feat: complete simulator redesign and defer Challenge Mode`
- Branch: `main`
- The historical Phase 1.10 push was verified at that checkpoint; no new fetch/push/deployment was performed in Phase 1.11.

All Phase 1.11 design, implementation and evidence changes remain local and
uncommitted. Fault Lab now has real target selection, a reviewed 14-entry fault
library, detached fresh response explanation, Explain/Readings/Repair, bounded
visual-only motion, history/Undo/original restore and independent Console
navigation. Cause clearing, reset OFF, explicit ON and damage replacement stay
separate. Electrical edits invalidate captured responses; playback cannot edit
the circuit or solver clock.

The application flow uses the selected component's simulator symbol and exact
terminal positions, or the actual wire route and connected endpoint symbols.
Modeled breaks, bridges and protection-contact edits are drawn on that target;
unassessed effects name the missing model without inventing a waveform. All 14
registry types passed Apply and Clear through the browser; the refreshed 42 screenshots
are in the local [application gallery](../../.wrangler/fault-lab-application/index.html).
The gallery includes review, applied and cleared states. Exact canonical and compiled
fault targets, main canvas markers, both drawing views, badge placement and document
restoration were checked. Terminal markers now use canonical faults; the Circuit button
works after Apply, SVG animation preserves target placement, and protective bypasses
use actual modeled poles. Those applied captures precede a new simulation and do not
claim a measured result.

The 19 approved direct Diagnosis files and integration were retired **after**
replacement acceptance. Browser/D1 attempt records, schema/migrations, stored
grants, shared electrical core, generator/fault utilities, historical evidence
and deferred Challenge plans remain. Conditional generator cleanup is excluded.

## Subsequent catalogue simulation finding

A reported connected LED drawing exposed an existing core coverage gap: LED/CFL/fan
and several appliance calculations are unavailable. The default inventory has 31
unassessed models among 116 entries; one is the configurable three-phase motor,
while 30 need missing behaviour code. Fault Lab workflow acceptance never proved
whole-catalogue numerical operation. See [the gap audit](../audits/catalogue-simulation-gaps.md)
and [proposed model completion slices](../plans/CATALOGUE_MODEL_COMPLETION_PLAN.md).

The local repair adds visible unavailable-result feedback, distinct Model unavailable
and Ratings unknown badges and a shared design-voltage mismatch warning. It keeps
unknown operating ranges unassessed and does not add the missing LED/fan calculations.

## Read these files first

1. Read [final acceptance and recovery](../audits/phase-1-fault-lab-redesign.md).
2. Read the [completed Phase 1.11 plan](../plans/FAULT_LAB_REDESIGN_PLAN.md).
3. Read the [exact retirement scope and preserved data](../design/fault-lab/DIAGNOSIS_RETIREMENT_REVIEW.md).
4. The [prototype](../design/fault-lab/index.html) and [21-screen inventory](../design/fault-lab/SCREENS.md) are historical design references; production evidence is in the audit.
5. Follow the root [`AGENTS.md`](../../AGENTS.md) rules: development and verification are local only; the old Cloudflare account and live site are out of scope.

To preview from the repository root, run `node scripts/preview-fault-lab.mjs` and open `http://127.0.0.1:8765/docs/design/fault-lab/index.html`, or open the standalone HTML directly in a local browser.

## Accepted local evidence and remaining boundaries

- Full registered unit suite: **2,004 / 2,004**, zero failures/skips; baseline **2,115** reconciled exactly in the audit.
- Source browsers: **138 unique cases** across desktop Chrome, phone Chrome and tablet Safari; final stronger Console/retirement recovery **15 / 15**.
- Built browsers: **8 / 8** on final delivery, including actual Console clicks at 1280/390 px.
- Actual Bun/workerd parity: **842 cases**, explicitly replacing twelve retired grading fixtures with twelve ordinary electrical lifecycle fixtures.
- Actual local Worker/D1/cookie acceptance: **34 groups**; graph implementation **5 tests**; types/lint/build/assets/links/SEO/CSP pass.
- Rendered screenshots were visually reviewed. New two-body decorative engine update measured **0.9 ms p95**, with disposal on pause; this is not whole-frame or solver performance.
- Follow-up application lifecycle: **14 / 14 fault types applied and cleared**, 42 screenshots, **57 focused cases** across six files, rebuilt desktop/phone **2 / 2**, full types/final E2E types, repository lint and delivery budgets passed. Final initial JS is **255,327 B gzip**, CSS **27,986 B gzip**. The original full-suite **2,004 / 2,004** closure result predates this follow-up. See the audit for exact logs and scope.
- Phase 1.9 performance exceptions remain: simulation **56.65 ms p95 vs 8 ms**, generator timings and dense **60 fps** unmet.
- No commit/push, stored-data deletion, remote test, deployment, credentials or old Cloudflare account/resource operation is authorized by this work.

## Resume commands

```sh
bun run graph:phase
bun run graph:brief -- "fault-lab redesign"
bun run graph:find -- FaultLab
bun run graph:impact -- src/ui/components/inspector/InspectorFaultLabView.tsx
```

Read linked current source and evidence before further changes. The current gate
runner is `bun run verify:phase-1.11` with `--list`, `--only` and `--from` support;
selected runs are partial and require valid remaining evidence. Historical phase
commands may refer to the retired Diagnosis product. Graph freshness is not test
proof, and historical records must not be automatically rebaselined. Continue only
within a newly requested scope, preserving local-only restrictions and current data.
