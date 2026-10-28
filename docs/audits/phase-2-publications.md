# Phase 2.2 — local publications acceptance

2026-10-27: complete locally with explicit interrupted-run recovery. The owner
authorized the next milestone after the repository next-step review. This is
local authorization; no Cloudflare account, remote resource, deployment, commit
or push is authorized. No new human visual approval is inferred.

## Scope implemented

Migration 0011 adds separate publications, immutable versions, searchable tag
relations, bounded write windows and version-bound publication reports. Existing
private circuit storage and all previous tables are preserved. Version triggers
reject update/deletion/replacement; identity and terminal tombstones retain their
slugs/source identity. A private source can be deleted without losing owner
withdrawal controls for its publication.

Owner publishing reads a saved circuit at its expected version, validates and
normalizes it, captures current component requirements and provenance and commits
the snapshot/tag/quota changes atomically. Unique mutation IDs bind post-commit
responses to the caller's own change. Model/schema/engine versions, validation
time and SHA-256 describe provenance; verifiedAt remains null. Publishing performs
no fresh assessment or certification.

Public allowlists exclude private source/owner/auth fields. Profile privacy and
moderation yield neutral attribution without suppressing visible publications.
All public detail/history/snapshot routes share the publication lifecycle gate.
Profile publication lists and SSR cards recheck current profile/publication state.
The small public enhancement provides real history/reporting without loading the
editor or claiming the later 2.3 circuit renderer/detail route.

The owner workspace is `/settings/publications/`, with source links in the circuit
library. Publication/report review lives at
`/admin/community/?section=publications` in the existing shell. Staff can inspect
published JSON, including the version a report references, and perform reasoned,
revisioned hide/restore/remove and separate report outcomes. Public snapshots are
separate from private working JSON. Membership/security routes keep their existing
guards. Withdrawal is independent from membership and community write restrictions.

The [API contract](../api/publications.md) and
[execution plan](../plans/PHASE_2_2_PUBLICATIONS_PLAN.md) define the bounded scope.

## Focused evidence and corrections

- `.wrangler/publication-storage-T886S1/result.json`: 8 populated-upgrade,
  immutability/identity/pointer/report/constraint/rollback groups passed locally.
- `.wrangler/publications-api-Y5jmUS/result.json`: all 22 real local Worker/D1
  HTTP/race groups passed, including premium membership revocation, policy/source/
  session/restriction races, response ownership, rate limits across profile and
  publication reports, eligible auto-hide and atomic report/audit rollback.
- Focused unit selection: 37 tests across publication policy, existing profile
  policy and admin registry passed. Gate tooling: all 14 tests passed.
- Initial source browser attempt was explicitly interrupted after 14 passes,
  6 failures and one interrupted case; 3 cases did not run. The Tags field and
  public report controls received explicit labels; staff login assertions now
  match the real shared shell. A traced reporting regression identified the
  nested select-label ambiguity. Reporting passed after explicit label association.
- Subsequent source selection ran all 27 cases: 25 passed; 2 fixture setup failures
  reused the same unique custom-role name on phone/WebKit. Role names now include
  their fixture UUID. This is not a full successful browser run. Targeted recovery
  and the full dedicated gate are recorded below when finished.
- An early dedicated full invocation was stopped during typecheck to correct that
  fixture. A second invocation, `acceptance-2026-10-26a`, passed types/lint, all
  2,342 units / 154 files, build/static checks and component storage/API stages,
  then was stopped to register the new browser configs in the graph tool's
  explicit root-input allowlist. Graph impact/reference validation now succeeds;
  graph freshness still reports existing unreviewed/changed historical records.
  Neither interrupted invocation is acceptance. Failed/interrupted evidence
  remains local and is not relabelled as successful full runs.
- `acceptance-2026-10-26b` passed all 18 non-browser stages preceding source
  browser regression, then stopped after 104 passes and one existing WebKit
  membership-test failure. Its snapshot already showed Access denied with private
  controls removed: focus revalidation completed before the test's queued Refresh
  click. The test now accepts that already-completed denial while retaining both
  denial and private-control clearance assertions; no product access guard or
  timeout was relaxed. The complete gate is being rerun as
  `acceptance-2026-10-26c`; B is not a successful full gate.
- C repeated the complete preceding regression and finished the source matrix
  with 104 passes and one WebKit native-navigation failure in the existing
  component-admin helper. The failure occurred on a same-page/hash `goto` directly
  after reload, before the access assertions. That helper now changes the hash
  directly when already on the page; first-entry navigation and all authorization
  assertions remain intact. The final full selection is running as
  `acceptance-2026-10-26d` with `--keep-going`: every stage still must pass, failures
  remain failures, and no browser retries/skips are enabled. Targeted component
  navigation recovery passed all three browsers. A separate publication-browser
  attempt timed out during server startup before running assertions; it provides
  no product acceptance. Browser selections return to sequential gate execution.
- D preserved 18 passing initial stages, 105 built admin/component/simulator
  browser passes and 30 source profile passes. The source regression had 104
  passes and one 30-second WebKit timeout in the component-policy lifecycle;
  its snapshot showed both audited changes and expanded history, and the full
  screenshot was written, but the case remains failed. Built profile execution
  was interrupted after 13 passes; its next case records a closed browser
  context. A machine restart left no running gate or final manifest. These
  partial results are not a successful full selection.
- On 2026-10-27 all 1,367 selected implementation/harness files still matched
  D's initial SHA-256 hashes. `recovery-2026-10-27a` resumes from `browser` with
  `--keep-going`, repeating every browser selection and both new publication
  storage/API stages sequentially, without retries or skipped assertions. This
  is explicitly a partial recovery invocation; closure requires reviewed passing
  evidence for all 26 stage identities, with any combined coverage distinguished
  from an uninterrupted full-gate exit 0.

Built browser logs retain workerd `Broken pipe (os error 32)` client-disconnect
diagnostics, also recorded in prior accepted admin/component runs and D's passing
built stage. They coincide with role/permission/context transitions; the server
continues serving subsequent assertions. They are retained as runtime diagnostics,
separate from Playwright case and stage results; no log filtering or test retry
is used to hide them.

Earlier screenshot review found a narrow-phone heading laid out in three columns and an
oversized checkbox. Scoped publication styles now stack that heading and constrain
the checkbox. Staff action history uses human-readable names. The completed
source/built browser selections cover these final changes. All eight desktop/phone
owner-history and staff-review screenshots were inspected; their paths and hashes
are recorded in the manifest. No new human visual approval is inferred.

## Acceptance status

All 26 stage identities now have passing local evidence on the same 1,367
implementation/harness inputs. The [dedicated manifest](data/phase22-acceptance.json)
records selected stage results, log hashes, complete source hashes, required exit
groups, screenshot review and limitations. Hashes establish stability; executed
stage outcomes establish the reported check results.

| Selected evidence | Outcome |
| --- | --- |
| D's initial 18 stages | Types/lint, 2,342 units / 154 files, 14 gate / 5 graph tooling checks, build/static budgets, 6 infrastructure / 8 component storage / 14 component API / 20 admin / 34 membership-simulator / 8 profile storage / 21 profile API groups, 897 unchanged electrical parity cases |
| `recovery-2026-10-27a` eight resumed stages | Every child stage exited 0: 105 source + 105 built existing browser cases, 30 source + 30 built profile cases, 8 publication storage / 22 publication API groups and 27 source + 27 built publication browser cases |

The recovery completed on 2026-10-27 at 07:00:57 UTC. Its final manifest records
status 0 and no changed sources. The enclosing execution session subsequently
reported 143; both observations are retained separately. This is complete passing
stage coverage across an interrupted full invocation and explicit recovery,
**not an uninterrupted full-default gate exit 0 or a whole-command exit-0 claim**.
D's timeout and interruption and all earlier failed/interrupted attempts remain
explicit above. No browser retries, skipped cases or weakened deadlines were used
in the final recovery. All 324 browser cases passed across the six matrices.

Built Worker asset/header/CSP and unknown-route checks passed. Initial app assets
remain 269,087 B JS gzip / 29,462 B CSS gzip under unchanged limits. Independent
Node zlib review recorded public profile JS 2,157 B plus publication JS 1,814 B
(3,971 B combined), with profile styles 5,005 B. The built public files match source;
`.wrangler/publications-public-assets-review.json` retains hashes and byte counts.

Phase 2.2 is complete locally within this scope. Earlier acceptance scopes and
hardware/performance exceptions are unchanged. Next is 2.3 read-only renderer,
preview and public detail SSR. Discovery, forks, social notifications, support and
final Phase 2 acceptance remain their later milestones. The owner workspace shows
the first 100 saved circuits/publications and newest 100 version metadata records;
public profile SSR shows the first 20 publications. Public list/history APIs have
bounded pagination. No remote operation or deployment occurred.

The publication knowledge-graph mapping includes the migration, runtime/UI/styles,
command/configuration inputs and focused/full test relationships. Its scoped review
covers this audit and manifest; historical unreviewed or changed evidence baselines
remain untouched. Graph fingerprints remain a content-review aid, not test results.

## Ordinary local review readiness

Backed up both ordinary local D1 files with SQLite's backup API to
`.wrangler/local-backups/publications-20261026T120837Z/`, then applied only pending
`0011_publications.sql` with `wrangler d1 migrations apply DB --config
wrangler.jsonc --local --persist-to .wrangler/state`. The migration completed all
23 commands successfully; output remains at
`.wrangler/publications-local-migration.log`. No private working rows were seeded
or changed by the migration.

`bun run dev:worker` serves the ordinary local store on `127.0.0.1:8791`.
`.wrangler/publications-local-readiness.json` records five successful checks:
health 200; actual publishing/admin HTML 200 with private no-store, noindex and
CSP; anonymous owner API 401; unavailable public publication 404. No fixture
identities were seeded into this store. This delivery smoke is separate from
authenticated isolated acceptance. Backup/runtime artifacts stay local and ignored.

After the machine restart, the ordinary Worker was restarted on 2026-10-27 with
the same supported `bun run dev:worker` command and existing local persistence.
All five delivery checks passed again; current evidence is
`.wrangler/publications-local-readiness-2026-10-27.json`. No migration or fixture
seeding was repeated.
