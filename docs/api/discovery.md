# Community discovery contract (Phase 2.4)

Local implementation only. Worker-rendered `/c/explore` is public; `/c/feed`
requires a current session to show personalized rows and otherwise offers a
sign-in state. Existing `/c/:slug` detail and Astro `/explore/` retain their
separate purposes. The discovery pages work without JavaScript.

## Read endpoints

| Route | Access | Result |
| --- | --- | --- |
| `GET /api/community/explore` | Public | Current visible publication cards |
| `GET /api/community/search` | Public | Same cards, with optional FTS5 `q` |
| `GET /api/community/feed?view=following` | Signed in | Cards from followed authors |
| `GET /api/community/feed?view=mine` | Signed in | Caller’s published cards |

All endpoints accept `q`, `zone`, `standard`, `tag`, `sort`, `limit`, and `cursor`.
`q` is up to 80 characters and one to eight Unicode words. Search uses prefix
matching across title, description, tags and currently public author handle.
`zone` and `standard` are the validated author-supplied publication labels;
`all` means no filter. `tag` is one normalized tag. `sort` is `newest` (default),
`oldest`, or `title`. `limit` is 1–50 (default 12). A returned `nextCursor` is
opaque and belongs to the same endpoint view and filter set; send it unchanged.
Unknown or invalid parameters return 400.

Successful JSON contains `items` and `nextCursor`; feed also returns `view`.
Each item includes the publication ID and slug, current fixed version ID,
title, description, tags, zone, standard, component count, publish time, and
public-safe author attribution. Private or moderated author profiles use
neutral attribution. No private circuit document or session data is returned.
Feed requires a current session (401 on failure). Responses are `no-store`.

## Visibility and moderation

The local D1 `publication_discovery` projection and FTS5 index contain only
published, visible current versions. Triggers maintain them after publication,
profile and staff moderation changes. Each read also rechecks current state
before responding; a concurrent change fails closed and asks the client to
reload. Existing publication hide, restore and remove controls immediately
affect Explore, search and feed. The wider community admin queue and review
workflow remains Phase 2.7.

The following feed query and `follows` schema are ready in 2.4. Users can
follow or unfollow in 2.6; tests seed follow rows only in isolated local data.

See [execution plan](../plans/PHASE_2_4_DISCOVERY_PLAN.md) and the local
acceptance record for actual check outcomes. No remote operation is authorized.
