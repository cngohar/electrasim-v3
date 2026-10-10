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
