# Phase 2.3 — read-only preview and public detail

Status (2026-10-28): complete locally with explicit interrupted-run recovery.
All 29 stage identities have passing evidence on 1,387 unchanged source/harness
inputs: 2,348 units / 155 files, 390 browser cases, 9 preview HTTP/race groups
and 897 unchanged electrical parity cases. Coverage combines D's 19 passing
stages, nine from recovery A, and the complete 105-case built matrix from recovery
B. A's WebKit timeout remains recorded; B exited 0. No uninterrupted full-selection
exit 0 is claimed. See the [audit](../audits/phase-2-preview.md) and
[manifest](../audits/data/phase23-acceptance.json).

The owner authorized this next milestone after 2.2 and resumed it on 2026-10-28.
Overall Phase 2 remains active; next is 2.4 Explore, feed and search. No remote
operation, deployment, commit or push is authorized by local acceptance.

## Contract and execution gates

A. Extract store-independent SVG device/wire drawing from the existing editor.
Keep the editor adapter's appearance, terminals, routes and interactions intact.
Use the same pure drawing for deterministic server HTML and SVG thumbnails.

B. Add `/c/:slug` and version-selected detail, with metadata, JSON-LD, author
privacy, immutable provenance, clear older-model/unassessed labels and no-JS
schematic, component list and version navigation. Add a visibility-gated thumbnail
route. Public reads must never select the private circuit. Use no-store responses
and final primary visibility/attribution checks on every page/image/result.

C. Add a separately and explicitly loaded read-only preview island. It supports
keyboard/touch pan/zoom, inspection and temporary switch controls, start/pause/reset
and bounded server simulation steps. It imports no editor/store/autosave code.
Requests bind the selected publication/version; the server loads its immutable
snapshot and rechecks current component policy, membership and session after
computation. Temporary inputs/results stay in memory, never in persistent storage.
Publication/report controls remain available from the real detail page.

D. Verify pure renderer/editor parity, no-JS rendering, privacy/lifecycle isolation,
current policy and entitlement races, read-only behavior, source/built delivery,
phone/WebKit/reduced motion, headers/assets and unchanged electrical truth. Add
focused runtime and browser checks and a dedicated gate including prior 2.2
regressions. Record exact outcomes and limitations before marking completion.

No migration or new storage is needed. Deterministic SVG thumbnails are the local
fallback; social OG uses the existing static image until 2.8's OG strategy. Explore,
forks, social notifications and support retain their later milestones. No new
human visual or target-device approval is inferred from headless checks.

## Gate exit

A–D are complete within the contract above. Pure renderer/editor tests and the
full retained regression prove the shared drawing/access boundary; real local
HTTP races and both source/built desktop/phone/WebKit preview matrices exercise
no-JS detail, current policy/membership, immutable versions, read-only controls,
clock continuity, reset, inactive-page and late-response recovery. Eight final
source/built screenshots were inspected. No new schema or ordinary-store seed
was required. Later milestones and hardware/performance exceptions remain open.
