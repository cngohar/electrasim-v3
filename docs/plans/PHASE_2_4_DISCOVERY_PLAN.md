# Phase 2.4 — circuit discovery, feed and search

Status: complete locally on 2026-10-29 with explicit timeout and source-stability
recovery. All 33 stage identities have passing evidence, including 402 browser
cases, 2,348 units, five discovery storage/eight HTTP groups and 897 unchanged
electrical parity cases. No uninterrupted full-selection exit 0 is claimed; see
the [audit](../audits/phase-2-discovery.md) and
[manifest](../audits/data/phase24-acceptance.json).
The approved preview is `docs/design/community-discovery/index.html`. This plan
uses `/c/explore` and `/c/feed`; Astro's historical laboratory retains
`/explore/`. Existing `/c/:slug` details and `/u/:handle` profiles retain their
addresses. No deployment or remote Cloudflare operation is authorized.

## Contract

1. Public `/c/explore` and `GET /api/community/explore` list current visible
   publication versions only. `GET /api/community/search` applies D1 FTS5 to
   title, description, tags and the author's currently public handle. Search,
   zone, standard and tag filters compose with a bounded keyset cursor. Sorts are
   newest, oldest and title. Invalid parameters fail closed.
2. Authenticated `/c/feed` and `GET /api/community/feed` expose following and
   own-publication views. Phase 2.4 seeds follow rows only in isolated tests; the
   follow/unfollow mutation workflow remains 2.6. Anonymous feed HTML offers a
   sign-in state without exposing personalized rows.
3. The `zone` and `standard` selectors are author-supplied discovery labels on
   the current publication, validated on publish/republish. Existing rows start
   `general` and `int`; labels do not certify electrical compliance or change
   the immutable circuit snapshot. A republish may update these labels with its
   current version. The UI says “study standard” to avoid implying certification.
4. A local D1 search projection contains only published, visible current versions.
   SQL triggers update it and its FTS5 index when a publication is republished,
   withdrawn, hidden, restored or removed, or when profile visibility, moderation
   or handle changes. Every discovery read still checks live publication state and
   current profile attribution on the primary. Responses use no-store.
5. Explore and feed are Worker SSR, useful without JavaScript, with canonical and
   metadata, small CSS, visibility-gated thumbnails and no editor bundle or
   server-side simulation. The accepted concept informs layout; production cards
   use real snapshots and data. Plain HTML GET forms and next-page links work
   without JavaScript.

## Local acceptance

- Apply 0012 to an isolated populated 0011 database, preserving all prior rows;
  verify constraints, FTS5 query plans, trigger synchronization and rollback.
- Test real local Worker/D1 API and HTML for search syntax/case/tag composition,
  all sorts and keyset boundaries under inserts, empty/invalid/error states,
  anonymous/authenticated feed, and current publication/profile/session races.
  Existing staff hide/restore/remove actions must immediately change results.
- Check source and built desktop, phone and WebKit routes, no-JS content,
  navigation, filters, pagination, CSP, canonical/metadata and responsive layout.
- Run affected predecessor regression, typecheck/lint/units, unchanged electrical
  parity and existing asset budgets. Record actual stage outcomes and any
  interruption separately from source fingerprints in a dedicated 2.4 manifest.
  Update `docs/code-graph.json` only after source/evidence review. Overall Phase 2
  and historical hardware/performance exceptions remain open.
