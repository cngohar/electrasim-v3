# Phase 2 — Community

**Status (2026-10-27): 2.0 shared admin foundation and the approved current-scope
admin integration/parity review are accepted locally within their recorded scopes.
Phase 2.0A component access Gates A-F are now complete locally: dedicated full
18-stage exit 0, 2305 units / 151 files, 6 infrastructure / 8 storage / 14 component
API / 20 existing admin / 34 membership-simulator groups, 897 unchanged parity and
105 source + 105 built browser cases without skips/retries. All 1318 selected
source/harness inputs matched. Profiles 2.1 Gates A–E are complete locally (2026-10-26): dedicated full 22-stage exit 0, 2339 units / 153 files, 270 source/built browser cases without skips/retries, 8 profile storage / 21 profile API groups and 1350 unchanged source/harness inputs. Overall Phase 2
and support 2.7A remain open/planned.**
See the [2.0A acceptance](../audits/phase-2-component-access.md#gate-f--dedicated-full-local-acceptance-complete-2026-10-25)
and [dedicated manifest](../audits/data/phase20a-acceptance.json).
See the [foundation record](../audits/phase-2-admin-foundation.md),
[API contract](../api/platform-admin.md) and
[spike decision record](../audits/phase-2-foundation-spike.md).
Phase 1.14 is closed locally with an explicit hardware-dependent performance
exception. Phase 2 builds on the private circuit/document, membership and
simulator foundations already on `main` (`1120abf`). All development, migrations
and tests remain local; no Cloudflare remote operation, publication or deployment
is authorized.

**Owner design review:** the functional 2.0 baseline passed its recorded gate.
The owner requested a richer visual design/workflows and an HTML concept before
production adaptation. The [local admin concept](../design/platform-admin/README.md)
now includes membership plan creation/assignment and dedicated user pages with
a quick-view drawer. The owner approved the panel and authorized local integration on 2026-10-24;
the complete actual/demo follow-up passed its separate 16-check scope using the
retained non-browser prefix and explicit browser recovery (**2,235 units; 156
source/built browser cases**). See the [complete parity review](../audits/admin-prototype-parity-review.md)
for corrections, evidence and explicit remaining differences.
See the [integration plan](../plans/PLATFORM_ADMIN_DESIGN_INTEGRATION.md). 2.1 has owner-approved [design](../design/profiles/README.md) and complete local product acceptance; see the [profile audit](../audits/phase-2-profiles.md) and [dedicated manifest](../audits/data/phase21-acceptance.json).

**Scheduling addition (2026-10-24):** the owner approved adding component access
management before profiles and a support desk before final Community acceptance.
See the [2.0A / 2.7A extension plan](../plans/PHASE_2_ADMIN_EXTENSIONS_PLAN.md).
The owner explicitly accepted the completed admin panel review on 2026-10-25 and
authorized starting 2.0A implementation. Shared policy/storage Gate B passed focused local checks;
Gate C server policy/API passed 14 focused HTTP/race groups and the full existing
16-stage regression. Gate D client policy/recovery passed its dedicated checks and full existing regression; Gate E Components UI and its scoped source/built checks are complete; dedicated
full acceptance F passed all 18 stages with exit 0. Full blog/static-page
editing remains Phase 5 Content Studio.

[2.0A execution plan](../plans/PHASE_2_0A_COMPONENT_ACCESS_PLAN.md) ·
[Detailed plan](../plans/PHASE_2_COMMUNITY_PLAN.md) ·
[Roadmap](../REWRITE_PLAN_V3_FULL.md#28-phased-roadmap-bun--workers--original-22-week-estimate) ·
[Phase 1 map](phase-1-simulator-core.md) ·
[Persistence boundary](../audits/phase-1-persistence.md)

See the [2.1 execution plan](../plans/PHASE_2_1_PROFILES_PLAN.md) and
[local demo instructions](../design/profiles/README.md). Prototype evidence does not
close the production profile milestone.

Phase 2.2 publications is complete locally (2026-10-27) with explicit recovery:
all 26 stage identities have passing evidence, including 2,342 units, 324 browser
cases, 8 publication storage / 22 API groups and 897 unchanged parity cases on
1,367 unchanged inputs. Coverage combines 18 initial stages and an eight-stage
recovery, not an uninterrupted full-default exit 0. The recovery manifest records
status 0; its enclosing execution session reported 143 after completion. See the
[execution plan](../plans/PHASE_2_2_PUBLICATIONS_PLAN.md), [publication audit](../audits/phase-2-publications.md)
and [dedicated manifest](../audits/data/phase22-acceptance.json). Phases 2.3 and
2.4 are complete locally with recorded recovery.
Overall Phase 2 remains open.

## Scope

Turn a private saved circuit into an immutable published snapshot that can be
discovered, opened read-only, forked with attribution, discussed and collected.
Public content must be reproducible, capability-gated, searchable and
server-rendered for SEO, while private working copies remain owner-only.

Deliver the shared platform admin foundation: common navigation, user directory,
system/custom roles and permission matrix, separate account/community restrictions,
validated settings and scoped audit. Community gets complete admin screens for
publications, comments, profiles/avatars and public collections. Existing membership
administration stays super-admin-only. Later phases add their modules through the
accepted permission/settings/audit extension contract. Add protected Free/Pro
access controls for existing Pro components (2.0A) and private support tickets,
staff replies/internal notes, assignment/status and in-app updates (2.7A). Preserve
the confirmed Basic component baseline and electrical definitions; support is
available to free and paid users with separate owner/staff privacy boundaries.

Out of scope: LMS/organization publishing, gamification/XP, Content Studio,
payments, real-time presence/collaboration, email digests and AI moderation.
Later-phase business controls, impersonation and hard account deletion are also
outside Phase 2; the shared admin foundation does not implement those features.
Challenge Mode and Diagnosis remain retired.

## Milestones

| Milestone | Scope | Status |
| --- | --- | --- |
| **2.0** | Routing/schema/security spike first; then shared admin shell, users, roles/permissions, restrictions/suspension, settings/audit and protected membership integration; local foundation acceptance | Complete locally — full 16-stage gate; 132 source/built browser cases; scoped evidence linked above |
| **2.0A** | Component Free/Pro access management, protected Basic baseline, super-admin policy/audit and simulator enforcement; required before 2.1 | Complete locally — Gates A-F; dedicated full 18-stage exit 0; 2305 units, 8 storage / 14 component API groups, 897 parity, 105 source + 105 built cases; acceptance linked above |
| **2.1** | Profiles, handles, avatar, privacy and `/u/:handle` SSR; profile reports and staff controls | Complete locally — Gates A–E; full 22-stage exit 0; 2339 units, 8 profile storage / 21 API groups, 270 source/built browser cases; [manifest](../audits/data/phase21-acceptance.json) |
| **2.2** | Publish/unpublish, immutable versions, slugs, tags and tombstones; publication reports and staff controls | Complete locally with recorded recovery; [audit](../audits/phase-2-publications.md) |
| **2.3** | Read-only circuit renderer, thumbnails and `/c/:slug` detail page | Complete locally with recorded recovery; [audit](../audits/phase-2-preview.md) |
| **2.4** | `/c/explore` and `/c/feed`, filters, keyset pagination and FTS5 search | Complete locally with explicit recovery; [audit](../audits/phase-2-discovery.md) |
| **2.5** | Forks, attribution lineage and fork counters | Planned |
| **2.6** | Follows, reactions, threaded comments, accepted answers, collections and in-app notifications; comment/collection moderation | Planned |
| **2.7** | Complete community admin workflows: report assignment/resolution, content review, user restrictions, settings, outcome notices and scoped audit | Planned |
| **2.7A** | Private support desk: tickets/replies, assignment/status/priority, internal notes, scoped audit and in-app updates; depends on 2.6/2.7 | Planned — required before 2.8 |
| **2.8** | Dynamic/cached OG, accessibility/performance pass and integrated local acceptance including 2.0A and 2.7A | Planned |

## Core invariants

- `circuits` stays the owner-private working copy; public routes read immutable
  `publication_versions` only.
- A published snapshot records its circuit fingerprint, model/engine versions and
  verification time; a later model/version mismatch is shown as stale and never
  presented as a fresh assessment or safety certificate.
- Premium capabilities are rechecked at publish, fork and simulation; public
  schematic display never grants premium simulation.
- Private profile fields and private circuit content never enter public payloads,
  notifications or search.
- Moderation is post-publication by default, with reports, auto-hide, moderator
  actions and audit. Pre-moderation is configurable but off by default.
- Admin navigation never substitutes for server authorization. Custom roles and
  permission settings cannot delegate protected super-admin actions; organization
  roles and paid grants do not confer platform staff powers.
- Community restrictions preserve private circuit work and membership records.
  Platform suspension is a distinct super-admin action enforced by auth/session
  guards. Moderated subjects cannot leak through search, cached assets or notices.
- Discovery pages must not load the editor bundle. The existing 300,000 B app-entry
  gzip and other performance budgets remain unchanged unless the owner explicitly
  approves a measured exception.

## Acceptance

The final gate requires real local Worker/D1/R2/KV/Queue tests, source and built
browser cases for desktop/phone/Safari where applicable, SSR/no-JS and metadata
checks, full types/lint/units, unchanged 897 Bun/workerd parity, asset/performance
measurements and a tracked `verify:phase-2` manifest. Passing local checks do not
authorize deployment, remote migration or publication. See the
[detailed plan](../plans/PHASE_2_COMMUNITY_PLAN.md#acceptance-gates) for the full
matrix and milestone exits.

Admin acceptance requires working screens, role/custom-permission and session
revocation tests, concurrent last-super-admin protection, atomic audit and settings
conflict recovery, unchanged membership boundaries and a test-only extension
fixture. 2.0 is the accepted baseline; 2.0A must pass before 2.1, and 2.7A before final
2.8 closure. Moderation is delivered with each public subject,
then integrated in 2.7. API-only evidence does not close the admin UI scope.

The [extension acceptance matrices](../plans/PHASE_2_ADMIN_EXTENSIONS_PLAN.md) add
policy/membership race and recovery checks, and private ticket ownership/internal-note
isolation, assignment/status concurrency and notification dedupe. Existing 2.0
acceptance does not accept either module. 2.0A Gates A–F are complete locally with the dedicated full acceptance above.
Later publication/preview/fork integration remains required in 2.2/2.3/2.5 and 2.8.
2.7A remains planned.

### 2.3 — complete locally with recorded recovery (2026-10-28)

Shared pure device/wire SVG drawing now powers immutable no-JS detail,
visibility-gated thumbnails and a lazy read-only simulation preview with current
component policy/membership checks. All 29 stage identities have passing evidence:
2,348 units / 155 files, 390 source/built browser cases, 9 preview HTTP/race groups
and 897 unchanged electrical parity cases on 1,387 unchanged inputs. Evidence
combines D's 19 passing stages, nine from recovery A, and the complete built matrix
from recovery B (exit 0). A's WebKit timeout remains recorded; no uninterrupted
full-selection exit 0 is claimed. Eight final screenshots were inspected.

See the [2.3 plan](../plans/PHASE_2_3_PREVIEW_PLAN.md), [contract](../api/preview.md),
[audit](../audits/phase-2-preview.md) and [manifest](../audits/data/phase23-acceptance.json).
Phase 2.4 Explore, feed and search is complete locally with explicit recovery:
all 33 stage identities have passing evidence across interrupted/partial runs,
including 2,348 units, 402 source/built browser cases, five discovery storage /
eight HTTP groups and 897 unchanged electrical parity cases. The broad source
admin browser command had one WebKit timeout after 104 passes; that exact case
passed alone at the original limit. The 1,400 acceptance-run inputs matched
across stable recovery runs. The Git commit hook then formatted 13 source inputs;
focused final-tree checks passed as recorded in the audit. See the
[2.4 plan](../plans/PHASE_2_4_DISCOVERY_PLAN.md),
[contract](../api/discovery.md), [audit](../audits/phase-2-discovery.md) and
[manifest](../audits/data/phase24-acceptance.json). Next is 2.5 forks and
attribution. Overall Phase 2 and all historical exceptions remain open. No
ordinary-store seed, remote operation or deployment occurred.
