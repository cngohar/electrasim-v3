# Challenge Mode retirement — explicit user decision

Date: 2026-10-13. Status: complete locally within the authorised retirement scope.

The user accepted the full simulator design and authorised its implementation.
Before that implementation, the user explicitly instructed:

> before implementation remove the "challange mode" from code base but not from plan and docs file and because i plan it build later stages (also update the docs about removal the challange mode with explict statement from user) and when removal is done then we can continue th actual implementation

The user additionally instructed:

> also update the knowlwdge graph on removal and redesign

This is a deliberate deferral for a later-stage rebuild, not completion or
cancellation of the preserved Challenge Mode plan. This instruction authorises
the Challenge Mode deletion scope. Unrelated unused theme, styling or function
deletions still require a concrete review and user confirmation.

## Removal scope

- Dedicated declarative Challenge Mode domain definitions/rules/validator and tests.
- Session store, persistence implementation, intro/tutorial, hints, focus,
  pause, celebration, indicator and runtime surfaces.
- Application mounting/preloads, menu/welcome entry points, keyboard bindings,
  UI mirrors, palette restrictions, autosave routing and Challenge-only locks.
- Dedicated browser spec/probe and obsolete references in executable gate lists.
- Challenge-only celebration CSS. Tour hint effects remain in use and were
  renamed to tour-specific classes; tour functionality was preserved.
- Challenge generation mode and share-code acceptance. Diagnosis is now the
  only supported generated mode. New tests reject explicit retired mode codes.
- Active marketing and standalone prototype Challenge Mode entry points.
  Historical design images, plans, audits and documentation remain preserved.

The deletion ledger and exact copies of removed files are stored locally under
.wrangler/challenge-retirement/; a pre-task working-tree patch preserves the
existing modified state. No unrelated pre-existing deletion is attributed to
this task. No browser storage keys or user circuits are deleted.

## Shared implementation retained

Diagnosis Lab still consumes the deterministic circuit generator, difficulty
profiles, fault applicability/injection/verification, scoring and replay codec.
Their existing challenges/ directory and compatibility names such as
ChallengeDifficulty, generateChallenge and challengeId remain shared contracts.
They do not expose an active Challenge Mode session.

Nine explicit Diagnosis requests (three seeds at each difficulty) were captured
before removal and replayed afterwards: identity, recipe and full circuit are
unchanged. Existing Diagnosis fingerprint/reserved-slot derivation and generator
version are preserved. Bare seeds now generate Diagnosis circuits; explicit
Challenge-mode codes/requests are rejected rather than silently converted.

Guided circuits retain their independent progress and old-key migration, including
a historical storage key with the word challenge. That migration preserves
learner data; it is not a Challenge Mode runtime.

## Validation and boundaries

- All project typechecks passed; pure-domain boundary now covers 142 modules.
- Repository lint passed. Earlier unlinted standalone prototype style expressions
  were normalised without deleting unrelated functions or changing theme behavior.
- Final bun run check passed: all typechecks/lint and 139 files / 2,113 tests.
  Evidence: .wrangler/challenge-retirement/check-final.log.
- Simulator + Astro build and static budgets/links/SEO/CSP passed. Initial JS:
  248,863 B gzip / 300,000 B; CSS: 25,131 B / 30,000 B. Evidence: build.log and
  static-checks.log in the local retirement directory.
- Real local Worker/D1/cookie simulator acceptance passed 20 groups, including
  Diagnosis repair/grading/reload/revocation and original circuit preservation.
  Evidence: simulator.log and .wrangler/membership-tests-rdoZl7/.
- Final focused browser run passed 21 cases across Chromium desktop, phone Chrome
  and tablet Safari: retired-mode absence, old saved-session non-resume, normal
  autosave preservation, Diagnosis replay/actual repair/reload and guided circuits.
  Evidence: browser-final.log. Built fresh desktop/phone menus and marketing
  separately passed smoke checks without page errors (built-smoke.json).
- Knowledge-graph tests passed 5 cases. The active 51-screen prototype's quick
  Inspector checks passed 37 assertions after code-style normalisation.
- The Phase 1.9 closure is historical, with its accepted performance exceptions.
  This removal does not renew its full matrix or mark performance green.
- Development/testing remains localhost-only. No commit, push, deployment,
  remote account operation or credential change is included.

## Following work

The accepted [implementation plan](../plans/OPEN_DRAFTING_TABLE_IMPLEMENTATION_PLAN.md)
follows this prerequisite. The knowledge graph tracks retirement and redesign
separately. Full simulator redesign remains authorised; unrelated deletion
approval is reserved for concrete reviewed diffs.


## Failed attempts retained

The first unit run had an obsolete Welcome feature-presence assertion and a
50 ms simulation smoke assertion at 73.75 ms while other local gates were active.
The obsolete assertion was corrected; the unchanged timing assertion and all
other tests passed in the final complete check. No timing budget was weakened.

The initial browser run passed 14 and timed out in Safari on an unstable child
span during Diagnosis reopening. That test now uses the existing accessible
button activation helper (actual keyboard activation on Safari); deadlines and
repair assertions are unchanged. The final expanded 21-case run passed without
interruption. Both earlier logs remain in the retirement directory.

An exploratory built smoke reused desktop panel state while resizing to phone
and encountered a blocking panel. The final smoke checks fresh desktop and phone
loads separately; responsive state migration is part of the authorised redesign.
Do not represent the exploratory attempt as passing or as coverage of live resize.

Retirement acceptance is this scope only. Redesign implementation starts after
this checkpoint and will require its own consolidated local acceptance.
