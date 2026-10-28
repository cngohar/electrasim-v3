# Phase 2.2 — publications and immutable versions

Status (2026-10-27): complete locally with documented interrupted-run recovery.
All 26 stage identities have passing evidence on 1,367 unchanged source/harness
inputs: 2,342 units, 324 browser cases, 8 publication storage / 22 publication API
groups and 897 unchanged parity cases. Coverage combines the passing initial
18 stages with an eight-stage recovery; no uninterrupted full-default exit 0 is
claimed. The recovery manifest records status 0, while the enclosing execution
session reported 143 after completion. See the [acceptance audit](../audits/phase-2-publications.md)
and [dedicated manifest](../audits/data/phase22-acceptance.json).

Implementation was authorized by the owner's “ok do it” instruction after the
next-step review. Phase 2.1 retains its separate completed acceptance. Next is
2.3 read-only preview and public detail. Overall Phase 2 remains open. No deployment,
account operation, commit or push is authorized.

## Contract and sequence

1. Storage/policy: allocate 0011 after the existing profiles migration; preserve
   private circuits and all prior data. Publications retain stable slugs and
   tombstones. Immutable versions include validated, normalized circuit JSON,
   title/description/tags/fork permission, capability requirements and provenance.
2. Owner/public APIs: publish only an owned saved circuit at its expected version,
   with a claimed handle, current membership/component policy and unrestricted
   community access. Republishing creates another version. Private edits do not
   change snapshots. Unpublish and deletion are withdrawals, independent of staff
   moderation. Removed/deleted publications cannot be restored by the owner.
3. Owner/admin UI: publish and manage versions from saved circuit workflows;
   real publication review, reporting and reasoned staff actions in the shared
   admin shell. Stale decisions require reload and renewed review.
4. Verification: populated local migration, immutable/constraint tests, real
   Worker/D1 HTTP and race coverage, browser workflows, existing regression,
   source/built delivery and dedicated acceptance evidence before claiming closure.

Public reads never select the mutable source circuit. Hidden/unpublished/deleted
publications deny detail, version/history and report reads uniformly. Profile
privacy/moderation controls attribution, without suppressing otherwise visible
publications. Staff can read only published snapshots, never private working JSON.
Owner edits cannot clear moderation. Report outcomes do not change subject state.

Snapshot validation is not electrical certification: validation time, source model
and engine versions and SHA-256 identify the snapshot; verifiedAt stays null because
publishing does not execute a verification/assessment. Preview rendering, public
detail SSR, discovery, forks and notifications keep their later milestone scopes
(2.3/2.4/2.5/2.6). No premature working links to those routes are added.
