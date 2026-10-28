# Phase 2.0A — component access contract

**2026-10-25: shared policy/storage Gate B and server boundary Gate C are implemented.
All 14 focused local HTTP/race groups passed. Client policy/recovery Gate D is complete
locally with 36 new units, 12 source + 12 built policy browser cases and full existing
16-stage regression exit 0 (2305 units, 78 source + 78 built admin browser cases).
Gate E production Components UI is complete locally with 15 source + 15 built
dedicated cases, 14 repeated server groups, 8 asset/header pages and full existing
16-stage regression exit 0. Dedicated full 2.0A acceptance Gate F remains pending.** The local HTML workflow is reviewable at
`http://127.0.0.1:8794/#components`. The owner approved the admin panel and authorized local UI
integration on 2026-10-24. [Implementation gates](../plans/PHASE_2_0A_COMPONENT_ACCESS_PLAN.md)
and [audit](../audits/phase-2-component-access.md) distinguish design checks from
runtime acceptance. All development and eventual tests remain local.

## Classification and trust

The [recorded baseline](../specs/component-access-baseline.json) enumerates all
116 current canonical IDs: **75 protected Basic and 41 originally Pro**. It was
read from `COMPONENT_DEFS`; omitted `tier` means Basic, matching the existing access
resolver. This is an inventory of existing behavior, not new product classification.
A future canonical ID requires explicit code/baseline/migration review. Do not
regenerate the protected list from mutable policy or silently remove IDs from it.

`ComponentAccess = 'free' | 'pro'`. An effective classification requires a known
canonical ID and a validated policy. Unknown IDs fail; protected Basic always
resolves Free. Originally Pro defaults to Pro without a fresh policy. There are no
per-plan component lists. The boolean `pro_components` benefit authorizes all
components currently requiring Pro; fault capabilities stay independent.

The shared access package accepts an opaque validated policy input, never raw
request JSON. Snapshot validation checks exact schema/classification version,
nonnegative safe integer revision, every canonical ID exactly once, no unknown
fields/IDs, valid access values and protected Basic immutability. Public snapshots
are display data. They are not credentials and are never accepted as server
policy, even when syntactically valid. Server resolvers read primary D1 themselves.
Do not trust client tiers, required-capability arrays, timestamps or policy hashes.

## Storage foundation

Migration `0009_component_access.sql` follows the actual `0008` directory indexes.
The Drizzle mirror is exported through the current schema entrypoint. The code-owned
baseline is pinned independently of mutable policy and compared against the recorded
inventory and canonical definitions by access tests. Server circuit actions now read authoritative primary policy (Gate C). Editor display uses an independently expiring validated policy snapshot (Gate D).
Originally-Pro actions always request fresh server authorization, even when displayed Free;
stale/offline display falls back to the original classification.
This migration is exercised only on isolated local test stores during Gate B.

| Table | Columns and invariants |
| --- | --- |
| `component_access_baseline` | `component_id TEXT PRIMARY KEY`, `original_tier TEXT CHECK IN ('basic','pro')`; all 116 code-owned seed rows. Update/delete prohibited by triggers; future insertions arrive through reviewed migrations. Runtime has no baseline-write API. |
| `component_access_revision` | singleton `id = 1`, `revision INTEGER >= 1`; initialized at 1, updated only with a successful access change. Separate from the admin revision so unrelated staff changes do not invalidate simulator actions. |
| `component_access_overrides` | `component_id TEXT PRIMARY KEY REFERENCES component_access_baseline`, `access TEXT CHECK IN ('free','pro')`, `version INTEGER >= 1` (last modifying admin revision), `actor_id TEXT REFERENCES user`, `created_at`, `updated_at` in UTC ms. Initially empty: code baseline applies. Insert/update triggers reject protected Basic or unknown IDs. Explicit Pro rows may remain for history; audit is authoritative. |

Baseline protection also rejects `INSERT OR REPLACE` of existing IDs, which could
otherwise bypass delete triggers. Revision/version and timestamp checks enforce
safe integers; timestamps are nonnegative and updated time cannot precede creation.
The shared snapshot validator accepts nonnegative safe revision values as specified;
persisted policy starts at revision 1. Validated snapshots are copied, sorted,
frozen and runtime-branded; validation grants neither freshness nor server authority.

The baseline seeds classify every ID; only overrides need mutable rows. No circuit,
membership, electrical definition or solver table is rewritten. Migration tests
must use populated pre-change databases and verify row/content preservation,
constraints, triggers and primary reads. No cascading deletion of staff audit.

## Module and HTTP surfaces

Module `catalog` is registered with its real handlers and focused acceptance mapping:
protected `catalog.components.manage` and `catalog.audit.read`, action
`catalog.components.access.update` and audit namespace `catalog`. Navigation
`/admin/components/` arrives with the real screen in Gate E. No default admin/moderator/custom/system override grants. Super admins
receive the registered actions through the existing registry. Catalogue access
alone never grants memberships or permission management.

All responses use `Cache-Control: private, no-store`, with safe error messages and
request IDs. The public projection requires no session and has no actor, reason,
audit, counts or private document data. No cross-origin access or edge caching.
Authenticated handlers repeat fresh primary authorization independently of UI.

```ts
type EffectiveComponentPolicy = {
  schemaVersion: 1;
  classificationVersion: 1;
  revision: number;
  components: { id: string; access: 'free' | 'pro' }[];
};
type AdminComponent = {
  id: string;
  label: string;
  description: string;
  category: string;
  originalTier: 'basic' | 'pro';
  protectedBasic: boolean;
  access: 'free' | 'pro';
  overrideVersion: number | null;
};
```

| Route | Method | Request and response |
| --- | --- | --- |
| `/api/catalog/component-access` | GET | Exact `EffectiveComponentPolicy`, sorted by canonical ID; complete classification, no staff metadata. Missing/invalid storage returns 503, never a fabricated fresh Free snapshot. |
| `/api/admin/components?q=&category=&access=&limit=&offset=` | GET | `{version, policyRevision, categories: string[], inventory: {total, protectedBasic}, items: AdminComponent[], total, limit, offset}`. Categories are sorted canonical values and inventory totals are unfiltered metadata for the production filters; no private content is scanned. `q` trimmed ≤200 chars, case-insensitive ID/label substring over bounded code catalogue; category from canonical enum, access `all/free/pro/protected`, limit 1–100 (default 25), offset 0–10000. Reject unknown query fields/values. Stable label/ID ordering. |
| `/api/admin/components/:id` | GET | `{version, policyRevision, component: AdminComponent, impact: {savedCircuits: null, publicContent: null}, history}`. History ≤20 safe catalogue events for this ID. Null means unavailable, never zero; no private document scan/JSON projection. Exact usage aggregation is deferred pending indexed storage. |
| `/api/admin/components/:id/access` | PATCH | Exactly `{access: 'free'|'pro', version: integer>=1, policyRevision: integer>=1, reason: trimmed string 1..1000}`. Returns `{ok:true, version, policyRevision, auditId, component}`. Reject Basic changes even when requesting Free (protected resource); reject no-op effective change. |
| `/api/admin/audit?namespace=catalog&targetId=...` | GET | Existing safe audit projection, independently guarded by protected `catalog.audit.read`; user-directory and platform/community audit permissions alone do not expose catalogue history. |

Mutation uses existing same-origin JSON/32 KiB limits. Responses: 400 malformed,
unknown properties/enum/no-op; 401 no session; 403 insufficient current authority,
suspension or protected Basic mutation; 404 unknown component; 409 stale revision
or concurrent state change; 503 storage failure. 409 requires reload and a new
review/reason; no automatic replay. Display label/description is read-only code data.

## Transaction and racing-action rules

Read current admin revision, actor, policy revision and component classification
in a consistent primary snapshot. Use `commitAdminChange` to claim admin revision,
recheck current super-admin role and active account, and guard expected policy
revision plus target effective access. In that same guarded D1 batch upsert the
override, increment policy revision exactly once and insert scoped append-only
audit. Every statement uses the claim's mutation ID. Audit records ID, before/after
access and policy revision, actor, reason, request ID and UTC time. Failed claims,
validation, competing edits or audit insertion leave all rows/revisions unchanged.

Server circuit actions read fresh policy and membership together in one consistent
primary snapshot (or compare revisions around the read), normalize and
recompute requirements from actual content. **Apply a policy revision predicate
on every content-saving INSERT/PATCH, including saves with no required capability.** Add it to
the existing membership predicates rather than replacing them. For updates,
recompute the union of old and replacement requirements under the same snapshot:
a caller cannot silently strip locked content during a racing downgrade. The write
must either use that exact revision or return 409. A Pro→Free→Pro cycle still
conflicts even if the access value later matches; compare the revision.

`/simulator/authorize` and `/simulator/simulate` must include the server policy snapshot
in their access metadata and recheck the policy revision and current membership
before returning an authorized response/result. Computation is bounded, pure and
performs no storage/network lookup. A changed policy discards the computed result
and returns 409; it is never presented as fresh authorization. This final primary
read is the action's authorization point. A later policy change invalidates future
actions and UI state; it cannot retract a completed response. Circuit reads still
return the owner's original document with effective requirements/read-only status.

## Client integration and recovery

Keep policy state separate from memberships. UI display snapshots expire after
30 seconds using local receipt time and are invalidated on focus, visibility return,
offline, logout or session-generation change. Revalidate on a bounded timer while
visible. Unknown schema/baseline, malformed response, failed read or offline state
restores originally-Pro requirements; Basic stays usable offline. A slow older
request cannot overwrite a newer revision or a new session's state.

A cached policy never grants an action: placement, paste, import, template use,
restoration editing, fault entry where components occur, save and simulation of
**any originally-Pro content** require a fresh server authorization, even if the
UI currently shows Free and computed membership requirements are empty. Otherwise
the current `authorizeCircuit` early return would bypass policy checks. Basic-only
offline operations retain their existing path; authenticated persistence still
checks the server policy revision. Reviewed asynchronous actions also verify their
captured session/access generation before committing local document changes.

After revocation/expiry/offline/policy downgrade preserve the exact document,
raw backup and existing explicit Basic-copy recovery; do not auto-delete or
reclassify components. Membership refresh alone cannot restore a policy override.
A fresh permitted policy/action restores editing without changing electrical
inputs/results. Later 2.2/2.3/2.5 publish/preview/fork recheck current policy; stored
publication provenance never freezes a permanent authorization grant.

The existing authorize payload retains `userId` (optional for a guest), `required`,
`capabilities`, `nextChangeAt`, `asOf` and adds `policy: EffectiveComponentPolicy`.
Simulation keeps its current result fields and adds an `access` object with those
same fields; no result fields are renamed or nested. Owner circuit GET retains
its current payload and adds `policy`; save success adds `policyRevision`. Request
bodies keep their current exact fields; client-supplied policy is rejected. The
server always chooses the primary revision, with conditional writes closing the
read/write race. Explicit owner deletion keeps its existing owner/version checks;
product gating must not prevent deliberate private-document deletion.
