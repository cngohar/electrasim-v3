# Profiles 2.1 — local integration contract

Owner approved the profile concept and local integration on 2026-10-25, including
public `/u/:handle`, owner-only `/settings/profile/` and staff-only
`/admin/community/`. This contract describes the locally accepted implementation;
the dedicated full acceptance is recorded in `docs/audits/phase-2-profiles.md`
and `docs/audits/data/phase21-acceptance.json` (2026-10-26).

## Storage and identity

Migration `0010_profiles.sql` follows 0009. A separate profile references auth user
ID. Existing users are backfilled with an unclaimed private profile and optional
fields hidden; a trigger supplies the same defaults for new accounts. Auth names
provide a bounded initial display name, with a neutral fallback; they are not
synchronized by later profile edits. Auth schema/roles/grants/circuit contents do
not change. Public payloads omit user IDs, email, raw avatar keys and mutation IDs.

Handles are lowercase ASCII `[a-z][a-z0-9_]{2,23}` and claimed once. Reserved handles
are code-owned and mirrored in immutable local storage. Database uniqueness and
triggers reject duplicate/reserved/invalid claims, rename/NULL/replacement/deletion
and resurrection of removed profiles. This release does not rename or transfer
handles. The editor confirms the first claim before saving. Public profiles and
future publishing require a handle; unclaimed accounts retain private settings.

## Routes

| Route | Authorization and response |
| --- | --- |
| `GET /api/me/profile` | Fresh session; owner settings allowlist, revision and owner avatar delivery URL |
| `PATCH /api/me/profile` | Owner; JSON full editor fields plus `revision`; claim or edit settings; rejects protected/unknown fields |
| `POST /api/me/avatar` | Owner; binary JPEG/PNG/WebP with `X-Profile-Revision`; returns updated owner profile |
| `DELETE /api/me/avatar` | Owner; JSON `{revision}`; updated owner profile |
| `GET /api/me/avatar` | Fresh owner session; private no-store image delivery |
| `GET /api/community/users/:handle` | Anonymous, currently visible public allowlist; generic 404 otherwise |
| `GET /api/community/users/:handle/publications` | Same visibility rule; empty result until 2.2 supplies publications |
| `GET /api/community/users/:handle/avatar` | Current profile-bound R2 image; rechecks primary revision/key/visibility after R2 read |
| `POST /api/community/users/:handle/reports` | Another authenticated eligible member; JSON reason/details; 201 created or 200 duplicate acknowledgement; no reporter projection |
| `GET /u/:handle` | Worker-owned SSR; visible profile 200, neutral unavailable 404; visible uppercase/trailing-slash variants canonicalize with 308 |
| `GET /api/admin/community/profiles` | `community.profiles.read`; bounded prefix search/moderation filter/offset |
| `GET /api/admin/community/profiles/:id` | Same permission; minimal identity/bio/visibility/revision context and authorized recent reports/history |
| `GET /api/admin/community/profiles/:id/avatar` | Same permission and fresh session; permissions/visibility clearance/revision rechecked after R2 |
| `GET /api/admin/community/reports` | `community.reports.read`; bounded status filter/offset queue |
| `POST /api/admin/community/profiles/:id/moderate` | `community.profiles.moderate`; admin `version`, `profileRevision`, action and reason |
| `POST /api/admin/community/reports/:id/resolve` | `community.reports.review`; admin `version`, `reportRevision`, outcome and reason |

Mutations require matching Origin and reject cross-site Fetch Metadata. JSON
mutations require JSON; avatar upload has a distinct binary content-type/body limit.
Owner/profile reports are bounded to 8/4 KiB JSON, and avatars to 2 MiB. Owner
profile changes and report submission respect active community restrictions;
private circuit work remains independent. Account suspension/session revocation
are separate boundaries. Staff profile actions do not confer membership authority.

Validation errors are 400, missing/expired session 401, permission/restriction/origin
403, unavailable public profile/avatar 404, stale revision/policy/claim conflict
409, oversized body 413, unsupported content type 415, limits 429 and temporary
service failure 503. Every public unavailable subject uses the same neutral body
and excludes identity/schema/canonical data. Public API/page/image responses use
private/no-store and never honor conditional/range reads to bypass visibility.

## Privacy, images and rendering

The public projection contains only handle, display name, bio, join time, safe
avatar URL and independently opted-in institution/level. Fork defaults and privacy/
moderation flags are owner settings. Profile privacy does not publish private
circuits. The editor has no staff navigation; staff review uses the existing
permission-filtered admin shell. No prototype persona or fictional record is
promoted into app data.

Photo uploads accept signatures matching declared JPEG/PNG/WebP, bounded static
container/frame sizes and dimensions (up to 2048 × 2048), reject SVG/animation and
truncated/trailing containers, and remove metadata. PNG additionally validates CRCs
and bounded decompressed scanline sizes/filters. JPEG/WebP checks parse their
containers/frame headers; these are not general pixel decoders. The owner browser
decodes and re-encodes selected photos as PNG, resized to 512 pixels, stripping
metadata before upload. Report and removal workflows still apply to image content.

Random image keys are never reused or returned. A durable cleanup candidate is
recorded before R2 writes; successful attach removes it transactionally and stages
the old key for cleanup. Failed/abandoned uploads remain candidates; unreferenced
keys are cleaned in bounded owner-scoped batches (abandoned stages after one hour)
on subsequent avatar activity and avatar-removing staff actions. Failed cleanup
keeps the candidate for a later retry. Delivery always joins profile state, never
serves a caller-supplied raw key, and rechecks after R2 I/O. This release has no
scheduled global orphan sweeper.

Public HTML contains readable identity/about, the empty circuits section, canonical,
description, Open Graph/Twitter fallback and Person JSON-LD without JavaScript.
Optional institution is absent from JSON-LD unless opted in. HTML and structured
JSON are escaped. CSP hashes the per-response JSON-LD; a small standalone script
adds reports, owner navigation and tabs. No simulator bundle loads. Private or
moderated views have neutral noindex metadata. New snapshots/discovery/social data
arrive in their scheduled milestones, not as synthetic profile counters.

## Moderation and concurrency

Profiles have independent `visible/hidden/removed` state and owner `public/private`
visibility. Owner edits cannot clear staff moderation. Hidden→visible requires a
reasoned staff review; removed is terminal. Restoration preserves owner privacy.
Avatar removal retains profile state. Removal clears the photo, retains handle
and attribution tombstone, and preserves private circuits/account/membership.

Staff actions require reasons of 8–1000 characters and current admin/profile/report
revisions. They reuse the existing revision-claimed atomic audit helper, guarded
against profile changes, actor role/suspension and live session revocation. Owner
writes also predicate on live session/suspension/restrictions, current admin policy
revision, profile revision and a bounded per-minute write counter. A stale action
cannot write quota, profile or audit. After a successful owner mutation, a fresh
primary row/session read must still identify that exact mutation and revision;
a competing post-commit edit produces a conflict rather than transferring its
new revision onto an older editor draft. Rejected UI reviews require explicit reload
and a new reason; obsolete requests and expired sessions cannot repopulate private UI.

Reports are permanently deduplicated per reporter/profile, require a distinct
non-restricted signed-in member and enforce the community daily limit. Staff
recent-report context never returns reporter identity. Report outcomes are separate
from visibility and do not restore content. Configured banned text hides a visible
public profile; owner edits cannot undo that hidden state. Distinct open reports
from currently non-suspended/non-restricted reporters trigger configured auto-hide.
Report insertion/hide/system audit commit or roll back together. Settings are
rechecked at commit; audit uses `system:profile-policy` for automatic actions.

The existing preModeration flag concerns future publications, not a requirement
to approve every profile. Cross-subject assignment/outcome notices/notifications
remain in 2.6/2.7; neutral author attribution on publications belongs to 2.2/2.3.

Platform references consulted: [D1 transactions](https://developers.cloudflare.com/d1/worker-api/d1-database/),
[R2 binding API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/),
and installed Wrangler 4.144.0 help/schema. All execution remains local and no
Cloudflare account/deployment action is authorized.
