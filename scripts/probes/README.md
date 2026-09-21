# Diagnostic Probes & Automation Scripts

This directory contains standalone Playwright inspection and diagnostic probe scripts used to verify UI state, benchmark rendering performance, and capture comparison screenshots during development.

## Scripts Overview

| Script | Purpose |
|---|---|
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

Probes require Playwright and a running dev server:

```bash
# In one terminal:
npm run dev

# In another terminal:
node scripts/probes/probe-app.mjs
```
