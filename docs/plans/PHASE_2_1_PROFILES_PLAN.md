# Phase 2.1 — profiles and privacy

**Status (2026-10-26): Gates A–E complete locally. Owner approved the design and
authorized integration on 2026-10-25. The dedicated full 22-stage gate exited 0:
2,339 units / 153 files, 270 source/built browser cases without skips/retries,
8 profile storage and 21 profile API/race groups. All 1,350 selected source/harness
inputs stayed unchanged.** See the [audit](../audits/phase-2-profiles.md#gate-e--dedicated-full-local-acceptance-complete-2026-10-26)
and [acceptance manifest](../audits/data/phase21-acceptance.json).
The owner requested starting the next phase and a demo to review and approve.
Phase 2.0A Gates A–F are complete within their separately recorded local scope.
See the [Community plan](PHASE_2_COMMUNITY_PLAN.md),
[2.0A acceptance](../audits/data/phase20a-acceptance.json) and
[profile demo](../design/profiles/README.md).

## Proposed sequence

| Gate | Deliverable | Exit evidence | Status |
| --- | --- | --- | --- |
| A — design and contract | Profile editor, public/owner/private states, avatar controls, handle claim, reports and staff review concept; agree defaults and handle policy | Local prototype checks and owner feedback/approval recorded separately | Owner approved; complete as a design gate |
| B — storage and policy | Separate profiles table keyed to auth user; unique normalized nullable handle; moderation state/revision, profile report subject and scoped permission registration; populated upgrade preserves current data | Local D1 upgrade/constraints/collision/race tests; pure projection/visibility checks | Complete locally: 8 populated-upgrade/constraint groups, repeated in E |
| C — owner/public APIs and avatar | Owner-only edits/claim, local R2 validation and visibility-checked delivery, privacy-safe public projection; rate limits and restrictions; atomic revisioned staff actions/audit | Local Worker/D1/R2 HTTP, upload, authorization, stale-session and concurrency checks | Complete locally: 21 real Worker/D1/R2 HTTP/race groups, repeated in E |
| D — product UI and SSR | Owner settings, handle onboarding, `/u/:handle` server-rendered profile, report flow and real staff profile/report screens in accepted admin shell | Source and built desktop/phone/WebKit workflows; no-JS HTML/metadata and actual asset/header checks | Complete locally: 30 source + 30 built profile cases across desktop/phone/WebKit, repeated in E |
| E — dedicated local acceptance | Full current regression plus complete 2.1 storage/API/browser/SSR/privacy/cache/asset/performance coverage | `verify:phase-2.1` full selection exits 0, dedicated manifest with scoped results and source hashes | Complete locally: all 22 stages exited 0; dedicated manifest linked above |

A records the owner-approved design, separate from product acceptance. B–E now
have complete local execution evidence. Normal developer D1 was backed up before
applying pending migrations 0009/0010; the integrated Worker serves port 8791.
Overall Phase 2, later publication/fork/social/support work and prior Phase 1
hardware/performance exceptions remain open. No remote operation is authorized.

## Owner-approved design decisions

- Profiles are separate from sign-in identity. Display name, bio, optional
  institution and learning level belong to the profile; email never appears publicly.
- A new profile starts private; institution/level visibility is opt-in. Existing
  accounts receive an unclaimed profile, not an automatically public identity.
- Handles use 3–24 lowercase ASCII letters, numbers or underscores, starting with a
  letter. Reject reserved and claimed names. Preserve a complete reserved-name
  list as code, backed by uniqueness in D1. No client availability check guarantees
  a successful claim. Unclaimed handles remain nullable until an explicit claim.
- The concept requires a reviewed claim before saving the onboarding profile.
  Claim once; no rename UI in the first release. Display names remain editable.
  The owner approved this interpretation of “claimed once” on 2026-10-25.
  If rename is desired, agree reservation/redirect/attribution rules before B.
- Avatar proposal: JPEG/PNG/WebP, at most 2 MiB, initials fallback. The demo only
  decodes selected bytes in memory. Production needs server-side byte/dimension
  validation, metadata handling and safe serving. File extension/browser MIME is
  insufficient evidence of content type. Raw storage keys must not bypass visibility.
- Public profile shows identity/about and a genuine empty circuits state. No
  invented publications, follower counts or working follow/fork features. Publishing
  starts in 2.2; follow/reaction/collection workflows remain 2.6. The fork toggle
  is a future publication default; its real enforcement is later acceptance.
- Private, hidden, removed and unclaimed public views use a neutral unavailable
  page without identity/bio/avatar. Owner settings explain the applicable state.
- Another authenticated member can report a visible profile; anonymous visitors
  are prompted to sign in. Duplicate reporting is acknowledged. Staff record a
  separate reasoned report outcome; resolving a report does not restore visibility.
- Hide is reversible through a new review. Remove retains a tombstone and has no
  restore action. Profile edits cannot clear either state. Restoration preserves
  owner privacy settings. Avatar removal is independent of profile clearance.
- Staff changes require a reason and current revision. Concurrent changes reject
  the stale decision and require a fresh review/reason. The concept has read-only
  and moderator personas; real permissions remain server enforced.

## Production implementation boundaries

Read current `packages/db/schema.ts`, auth schema, migrations through 0009,
`src/worker.ts`, platform registry, atomic mutation helper, accepted admin request
recovery and community settings before B/C. Allocate the next migration from the
actual tree. Reuse scoped module/permission/audit conventions; do not widen
membership or protected account authority. Community write restrictions and
platform suspension retain their distinct semantics. Prevent profile registration
or mutation from setting roles, account identity, plan grants or moderation state.

Public projection is a server allowlist, not UI filtering. Gate avatar requests
and metadata at delivery, use neutral metadata for unavailable profiles, invalidate
or revalidate cached visibility, and keep private content out of JSON-LD/OG/search.
Confirm HTTP status/canonical policy for missing/private/hidden/removed profiles
in the API contract before C. Existing visible publications eventually retain
neutral attribution when author identity is moderated; 2.2/2.3 must enforce this.

SSR must return meaningful HTML, canonical/title/description/OG/Twitter and `Person`
JSON-LD for visible profiles without JavaScript. Add explicit Worker route ownership
so `/u/*` cannot fall into the static marketing shell. Do not load the simulator
bundle. Use current model/circuit protections and unchanged asset budgets.

Profile reports/moderation must arrive in 2.1. Cross-subject assignment, outcome
notification and complete moderation dashboard integration remain in 2.7; 2.6
provides persistent notifications. Do not describe the memory-only demo report
history as audited D1 data or delivered notifications.

## Required acceptance coverage

- Populated local D1 upgrade preserves existing auth/private circuits/membership/
  admin/component policy. Case-normalization, reserved/invalid names, duplicate
  claims, concurrent claims, repeat claims and owner identity binding.
- Field limits/output encoding, request origin/CSRF convention, authentication,
  session revocation, restrictions and protected field rejection. Real server
  allowlists for public/owner/staff data; role-scoped report reasons/identity.
- Avatar byte/type/size/dimension validation; replacement/removal and orphan handling;
  raw key/method/content-type defenses; immediate private/hidden/removed delivery
  denial across API/SSR/metadata/asset/cache surfaces.
- Report dedupe/eligibility/rate limit; auto-hide settings/banned-word integration
  at the profile boundary; reasoned hide/restore/remove/avatar actions; visibility
  recheck, revision conflicts and atomic audit rollback. Owner edits cannot evade
  moderation, and restoration cannot override private visibility.
- Real owner/public/staff screens, claim confirmation, save failure/retry/conflict,
  loading/empty/error/expired-access clearing, keyboard/focus and phone layouts.
  Cover source and built desktop/phone/WebKit with no skipped required cases.
- No-JS SSR/JSON-LD/metadata, unknown routes, public bundle isolation, complete
  existing types/lint/units, unchanged 897 parity, accepted admin/component/
  membership regressions and measured asset budgets. A dedicated full manifest
  must distinguish passing executions from fingerprints and partial selections.

All work is local. Use fresh isolated persistence for tests; no account operation,
remote migration, publication or deployment is authorized by any gate here.
