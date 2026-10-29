# Phase 2.4 discovery local acceptance

Status: complete locally on 2026-10-29 with explicit timeout and source-stability
recovery. All 33 stage identities have passing evidence, including 2,348 units,
897 unchanged electrical parity cases, 402 source/built browser cases, five
discovery storage groups and eight discovery HTTP/race groups. No uninterrupted
full-selection exit 0 is claimed. See the [dedicated manifest](data/phase24-acceptance.json)
for each stage, local log, source hash and screenshot. No remote operation,
ordinary local database migration, or deployment is included.

## Scope reviewed

The approved [HTML concept](../design/community-discovery/index.html) is now
adapted to the real Worker and publication data at `/c/explore` and `/c/feed`.
Astro `/explore/` remains the existing laboratory page, and `/c/:slug` remains
the immutable public circuit detail. The [contract](../api/discovery.md) and
[execution plan](../plans/PHASE_2_4_DISCOVERY_PLAN.md) define the read and
moderation boundaries.

Migration 0012 adds validated author-supplied zone/study-standard labels, a
current-visible-publication projection, FTS5 search and a follows read table.
Publication and profile triggers synchronize the search index. The Worker
rechecks publication/profile/session state on the primary before delivery.
Existing staff publication hide, restore and remove controls change discovery
immediately. The broader admin review queue remains 2.7; follow mutations remain
2.6 and are represented by isolated test fixtures here.

## Focused evidence already reviewed

- Populated local migration and FTS/trigger/constraint/query-plan checks: five
  storage groups passed.
- Real local Worker/D1 discovery and moderation checks: eight HTTP groups passed.
- Existing publication API: 22 groups passed; profile API: 21 groups passed;
  preview API: nine groups passed on its isolated rerun. An earlier preview
  attempt timed out while several local checks ran concurrently; it is not
  counted as passing evidence.
- Source and built discovery browser matrices: six cases each across desktop,
  phone and WebKit, without retries or skips. Desktop and phone Explore/feed
  screenshots were inspected; clear filters and no-JS cards were visible.
- Local build, full typecheck and lint passed. The first full gate passed its
  first eight stages, then exposed a static-link-check gap for the new
  Worker-rendered routes. The narrow route registration check is fixed and
  `check:links` passes 203 generated HTML files.
- A second full-selection attempt passed typecheck, lint, 2,348 units, gate and
  graph tests, build, performance/CSP/links/SEO, local foundation/component/
  admin/membership/profile checks and 897 electrical parity cases. Its first
  broad browser matrix passed 104/105 cases; one existing WebKit component
  admin scenario exceeded its 30-second test limit. That exact scenario then
  passed alone with the same 30-second limit and no retries. The broad-run
  failure and its screenshot remain recorded. The graph's root input list was
  also updated during the second attempt to include two new Playwright configs,
  so its source-stability check reports that exact changed file. A separate
  stable-input recovery passed the remaining 14 stages: 105 built admin/component,
  30 source + 30 built profile, 27 source + 27 built publication, 33 source + 33
  built preview, and six source + six built discovery browser cases, plus
  publication, preview and discovery storage/API stages. A final stable-input
  prefix recovery passed typecheck, lint, 2,348 units and gate tests; graph
  tests and all later baseline stages had passed after the graph input edit.
  One intervening prefix command was externally terminated during unit tests;
  its completed typecheck/lint and later unit/gate rerun are recorded separately.

The agent inspected eight source/built desktop/phone screenshots of Explore and
Feed; the approved filter and clear controls, no-JS cards, real schematic
thumbnails and responsive feed were present. WebKit assertions passed in both
source and built discovery suites. The existing app entry remains below its
unchanged 300,000 B gzip JS and 30,000 B gzip CSS budgets (269,379 B and
29,462 B in the gate). The static link check passed 203 built HTML pages with
the two registered Worker routes checked explicitly.

Source hashes only establish that the reviewed inputs stayed stable during a
gate run; recorded stage exits and logs establish test outcomes. The 1,400
acceptance-run inputs match across the stable recovery and final prefix runs.
Full Phase 2, follow/unfollow actions in 2.6, the wider admin review queue in
2.7 and historical hardware/performance exceptions remain open.

## Git commit hook formatting and final-tree check

The pre-commit Biome hook formatted 13 implementation and harness inputs after
the 33-stage acceptance recovery. This changed their source fingerprints, so
the prior full predecessor matrix is not claimed on the committed bytes. The
formatted tree passed the hook's typecheck/lint, 2,348 units, the production
build, unchanged performance and 203-page link checks, five discovery storage
groups, eight discovery HTTP groups, 22 publication API groups, nine preview
API groups, and six source plus six built discovery browser cases on desktop,
phone and WebKit without retries. The [manifest](data/phase24-acceptance.json)
lists the changed inputs and post-format checks. No Cloudflare remote work
occurred.
