# Diagnostic Probes & Automation Scripts

This directory contains standalone browser inspection and pure-domain diagnostic probes. Development and testing are local-only under root `AGENTS.md`; browser targets must stay on localhost.

## Scripts Overview

| Script | Purpose |
|---|---|
| `phase15c-behavior.ts` | Collects 42 current domain/graph/validation observations for readiness, supply/load response, branch/cable behavior and protection; independent references are evidence, not pass/fail assertions |
| `probe-app.mjs` | Basic smoke check: launches browser, dismisses welcome modal, runs simulation, reports console errors |
| `probe-app2.mjs` / `probe-app3.mjs` | Multi-step interactive probes testing circuit interactions and panel state |
| `probe-article.mjs` / `probe-article-nav.mjs` | Verifies guide article rendering, breadcrumbs, TOC anchors, and navigation |
| `probe-bench.mjs` | Headless performance and FPS measurement probe |
| `probe-challenge.mjs` | Validates Challenge Mode UI, hints, and validation flow |
| `probe-compare-final.mjs` | Generates comparison snapshots against reference designs |
| `probe-cover.mjs` | Verifies image coverage and responsive canvas scaling |
| `probe-hidden.mjs` | Inspects hidden element rendering and captures diagnostic screenshots |
| `probe-mission.mjs` | Probes mission modal dialogs and goal status indicators |
| `probe-navigation.mjs` | Verifies top-level routing, deep links, and hash anchor scrolling |
| `probe-skip.mjs` | Checks skip-link accessibility and keyboard focus navigation |

## Running Probes

The Phase 1.5C domain probe needs no server or browser:

```bash
bun scripts/probes/phase15c-behavior.ts
```

It emits one JSON object per observation, including expected teaching-model behavior and the current result. A successful exit does **not** mean the known electrical defects are fixed. See the [behavior audit](../../docs/audits/phase-1-behavior-review.md) and [delivery gates](../../docs/plans/SIMULATOR_BEHAVIOR_PLAN.md#7-delivery-order-and-exit-gates).

Browser probes require Playwright and a running local dev server:

```bash
# In one terminal:
bun run dev

# In another terminal:
node scripts/probes/probe-app.mjs
```
