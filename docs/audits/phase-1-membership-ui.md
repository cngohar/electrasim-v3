# Phase 1.8 — Super-admin membership UI

Status: complete locally on 2026-10-10. Phase 1.9 remains separate; F.3
accepted performance exceptions remain unchanged. On 2026-10-10 the user authorized
a local commit and GitHub push after completion. Cloudflare operations remain local-only.

## Scope

The independent `/admin/pro/` Vite entry serves Plans, Benefits, Members and Audit.
It uses the existing Hono membership API with real session cookies, fresh role
checks, explicit reasons, optimistic versions and transactional audit history.
The simulator is not booted by the admin entry. The public shell contains no
membership data, and private responses are never cached.

Plan forms cover descriptive pricing, duration policy, status and implemented
benefits; detail includes affected-member and retained-grant counts. Benefit forms
preserve locale maps, immutable keys/handlers and the distinction between
marketing archive and capability disablement. Member selection searches names
and emails with pagination; plan choices are paginated. New grants can prefill
explicit UTC dates from plan policy. Edits support extension, suspension/resume
and revocation. Audit shows actor, reason, target, request and before/after data.

Mutations have a review step and mandatory reason. Removal describes hard-delete,
archive or revoke semantics. Stale versions require reloading before retrying.
Guest/expired sessions show sign-in; ordinary staff/organization roles are denied.
Focus/reconnect rechecks access and discards stale administrative screens.

## Local verification

`bun run verify:phase-1.8` is the consolidated gate: typecheck, lint, units, graph,
build, assets/links/SEO/CSP, real local Worker/D1 membership suite and desktop/phone
browser administration. Browser role fixtures exist only in the isolated test
Worker entrypoint and cannot be reached through the production Worker.

The renewed `bun run verify:phase-1.8` passed all stages:

- All project typechecks and repository lint; **143 files / 2,223 unit tests**.
- **4 graph tests**, including configuration traversal, incremental refresh and
  exclusion of root environment files.
- Vite/Astro/postbuild, assets, **194 HTML link checks**, **191 SEO pages**, CSP.
- **36 actual local Worker/D1/cookie groups** in `.wrangler/membership-tests-MAnVFB/`.
- **22 browser cases**: all 11 scenarios on Chromium desktop and Pixel 7, covering
  lifecycle, role/session denial, conflicts, localized benefits, long-name layout,
  focus revalidation and preservation during delayed benefit loading.

Final initial assets: **250,732 B gzip JavaScript / 300,000 B** (including the
shared eager runtime), **27,549 B CSS / 30,000 B**. No budget was raised.
The full log is `.wrangler/phase18-final-gate.log`; focused recovery logs are
`.wrangler/phase18-phone-recovery.log`, `phase18-focus.log` and
`phase18-loading.log`. Screenshots are `.wrangler/phase18-chromium.png` and
`.wrangler/phase18-mobile-chrome.png`. All remain local and ignored.

The earlier development gate reached 17/18 browser passes; it did not close the
phase. The renewed gate includes the phone fix and additional regressions. The
last draft-loading/status refinements landed after its initial type/lint stages;
final-tree commit hooks recheck types and staged lint/format before delivery.
The earlier built-entry smoke also confirmed HTTP 200, CSP, real-cookie access
and no browser page errors through an actual local Worker serving built assets.

This closes Phase 1.8 only. Phase 1.9 full verification and F.3 accepted solver,
generator and dense-rendering exceptions remain. GitHub publication is explicitly
authorized by the user; no Cloudflare account/resource operation or deployment
is authorized.

## Verified implementation findings

- Long unbroken benefit names overflowed the phone layout and made checkbox
  hit-testing unreliable. Inherited text wrapping and a bounded label grid fix
  the overflow; the real mobile test asserts viewport containment.
- Access checks and list fetches have distinct cancellation lifetimes. Cancelling
  an old list must not invalidate a newer focus/reconnect role check. Desktop and
  phone tests exercise valid focus checks and denial after role removal.
- Plan edits replace the entire feature list. Review is blocked until all benefit
  choices load, preserving access during a slow response. A delayed real-API
  browser test verifies that the existing capability remains attached.
- D1 rejects long LIKE patterns. Literal case-insensitive substring searches now
  support long email addresses without treating percent/underscore as wildcards.
- Vite shares React between the simulator and independent admin entry. The asset
  checker includes modulepreload chunks so splitting cannot hide download cost.

The graph now indexes admin HTML, public headers/redirects and an allowlist of
root build/test/local-Worker configurations. Reviewed `configured-by` edges make
these inputs navigable while preserving bounded impact and ignored private data.

## Local login focus repair — 2026-10-10

Returning from another window previously changed access to checking and unmounted
the signed-out form, erasing pasted credentials. Automatic focus/online checks now
skip the login state; initial checks, explicit checks and post-login validation
remain, as does signed-in focus revalidation. Credentials remain only in the form.

Focused Chromium and Pixel 7 verification passed all four login/session-expiry
and focus/role-revocation cases against the isolated local test Worker, using
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3001. Tests now derive request Origin from
the configured base URL; the initial alternate-port attempt failed at signup
because of the old hardcoded port. This is focused repair evidence, not a rerun
of the Phase 1.8 or 1.9 full gate.

## Follow-up: clipboard workflow and signed-in refreshes — 2026-10-10

The user reported that the first repair did not resolve their workflow and that
signed-in pages refreshed repeatedly. The earlier four tests only established
synthetic focus behavior on the source server; they did not establish actual
clipboard paste or delivery of the updated built admin entry. The prior claim
of complete resolution was too broad.

Focus/online checks now run silently only for allowed sessions, use an independent
access generation, and coalesce concurrent checks. Successful checks preserve
lists and unsaved editor forms. Authorization failures still clear private data.
The signed-out form remains mounted while copying between windows.

Six focused browser cases passed on desktop Chromium and Pixel 7 using the
isolated local Worker and source server on port 3001: real clipboard write and
Control+V after tab switching, login/session expiry, and preservation of an unsaved
plan draft followed by denial after role removal. Production Worker port 8791
serves dist; source-server results alone do not prove that built UI was updated.
This follow-up rebuilt dist as well. At that follow-up, Phase 1.9 remained planned
and full acceptance was not claimed.

The rebuild completed and the normal local Worker was restarted. Additional
browser smoke checks passed on both http://localhost:3000/admin/pro/ and
http://127.0.0.1:8791/admin/pro/: actual clipboard paste of the demo credentials,
successful login, and retention of an unsaved plan draft after focus revalidation.
Application and E2E TypeScript checks and scoped Biome checks passed. No actual
plan was saved by these smoke checks; no remote operation occurred.

Subsequent [Phase 1.9 verification](phase-1-full-verification.md) renewed the
broader local matrix and closed with user-accepted performance exceptions on
2026-10-12. Its aggregate evidence and failed timing limits remain explicit.
