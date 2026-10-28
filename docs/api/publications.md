# Publications — Phase 2.2 local contract

Implementation and acceptance tracking: [execution plan](../plans/PHASE_2_2_PUBLICATIONS_PLAN.md).
Development, migrations and verification are local only.

## Owner workflow

`/settings/publications/` is an authenticated owner workspace, linked from the
simulator circuit library. An optional `?source=<saved circuit ID>` selects a
working copy. Publishing always reads its saved server revision; unsaved editor
changes are excluded. The confirmation explains that circuit labels and wiring
will be public. A claimed handle is required. Profile privacy independently
controls whether public attribution names the author.

| Method and route | Contract |
| --- | --- |
| `GET /api/me/publications` | Owner-only keyset list; optional `sourceCircuitId`, `cursor=updatedAt:id`, `limit` 1–100, default 20 |
| `GET /api/me/publications/:id` | Owner summary and newest 100 immutable-version metadata records, including withdrawn tombstones |
| `POST /api/community/publications` | `sourceCircuitId`, `sourceVersion`, `title`, optional `description`, `tags`, `allowForks`; creates first snapshot |
| `PATCH /api/community/publications/:id` | Current `revision`, `sourceVersion`, `title`, optional description/tags/fork choice; creates a new snapshot and republishes |
| `POST /api/community/publications/:id/unpublish` | Current `revision`; withdraws every public version |
| `DELETE /api/community/publications/:id` | Current `revision`; terminal owner tombstone, retaining slug and versions |

Titles have 1–160 characters, descriptions at most 2,000. At most eight distinct
tags normalize to lowercase; each has 2–24 letters, numbers or hyphens and begins
and ends with a letter/number. Slugs retain a normalized title prefix plus the
publication UUID; identical titles allocate distinct addresses. Slugs, owner and
source identity never change or become reusable.

Each source has at most one publication. Deleting the private working copy does
not delete its publication, and its owner can still unpublish/remove it. A deleted
or staff-removed publication cannot be republished or recreated for that source.
Withdrawal remains available after membership loss or a community write
restriction; a live unsuspended owner session is still required.

Publishing validates and normalizes the complete saved circuit, captures current
component-policy requirements and revision, and stores schema/model/MNA/control
versions, a SHA-256 of normalized snapshot JSON, validation time and source version.
`verifiedAt` is null: publication performs no electrical assessment or certification.
Versions include their title/description/tags/fork choice and reject database
update, deletion and replacement. Owner metadata changes publish a new version.

Writes enforce same-origin JSON, an 8 KiB request limit, session/restriction/
capability and component/admin policy checks. Source content/revision, profile
revision, publication revision and quotas are rechecked in the transaction. A
unique mutation ID gates snapshot/tag/quota/audit changes and response ownership.
A stale transaction returns 409; validation 400, access 401/403, missing private
source 404 and rate limit 429. A failed audit rolls back dependent writes.

## Public reads and reports

| Route | Response |
| --- | --- |
| `GET /api/community/publications/:slug` | Allowlisted current metadata and privacy-safe author attribution |
| `GET /api/community/publications/:slug/versions` | Version metadata, optional exclusive numeric `before` cursor and `limit` 1–100 |
| `GET /api/community/publications/:slug/versions/:versionId` | Immutable snapshot JSON/provenance, only when this version belongs to the visible publication |
| `GET /api/community/users/:handle/publications` | Visible publications of a public profile; keyset `cursor=publishedAt:id`, `limit` 1–100 |
| `POST /api/community/publications/:slug/reports` | Authenticated non-owner, allowlisted `reason` and `details` 1–500 characters |

Public detail/version routes never read mutable circuit rows. Unpublished,
hidden, deleted and removed subjects uniformly return 404, including historical
versions. No raw source/owner IDs or authentication fields appear in public
projections. Private or moderated author profiles use neutral “Community member”
attribution on otherwise visible publications. Primary visibility is rechecked
after awaited work. Responses use `private, no-store`.

Visible public profiles server-render real publication cards. A small independent
script opens snapshot metadata/history and submits reports; this is not the 2.3
read-only circuit renderer or `/c/:slug` detail page. No editor bundle is loaded.
Report reasons are Unsafe or misleading, Harassment or hate, Spam and Other.
Reports deduplicate by member/publication and reference the reported version.
The profile/publication daily report limit is shared. Distinct eligible open
reports can auto-hide a publication, with an atomic system audit. Text-policy or
first-publication pre-moderation can also hold a snapshot. Owner edits cannot
clear staff or automatic moderation.

## Staff surface

`/admin/community/?section=publications` uses the existing permission-filtered
shell and review dialog. Registered permissions are
`community.publications.read` and `community.publications.moderate`; community
report/audit permissions remain independent. Defaults grant publication review
to moderators/admins; explicit existing role-policy overrides remain authoritative.
Membership/security administration remains protected.

Publication list/detail, snapshot inspection and `/moderate` live under
`/api/admin/community/publications`. Reports use
`GET /api/admin/community/publication-reports` and
`POST /api/admin/community/publication-reports/:id/resolve`. Queue reads accept
bounded search/state/offset pagination. Snapshot inspection reads published
versions only, including hidden content under staff authorization.

Hide/restore/remove require an 8–1,000 character reason, current administration
`version` and `publicationRevision`. Report outcomes require `reportRevision` and
`outcome=resolved|dismissed`. Revision/session/role guards and audit commit
together. Restore preserves owner withdrawal; remove is terminal. Report outcomes
do not restore a subject. Conflicts clear the decision and require fresh review.

Public renderer/detail SSR, discovery/search, actual fork enforcement, social
notifications and complete cross-subject admin work retain their later milestone
scopes. Public snapshot readability does not grant premium simulation or forking.
