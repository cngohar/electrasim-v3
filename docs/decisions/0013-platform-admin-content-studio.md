# ADR 0013 — Platform Administration and First-Party Content Studio

- **Status:** Accepted
- **Date:** 2026-09-24
- **Phase:** v3 platform operations and public content
- **Depends on:** ADR 0010, ADR 0011, ADR 0012

## Context

The current Astro site stores blog articles as Markdown and exposes a GitHub-backed Decap CMS configuration. Existing articles were written by ElectraSim's actual owner and their authorship, original publication date, slug, and search equity must survive the v3 rewrite.

Platform operations also need an administration surface. Treating every operator as an unrestricted “super admin” would make content editing, support, billing, moderation, and tenant operations unnecessarily dangerous.

## Decision

Build a small first-party Content Studio inside the platform administration application. Do not adopt a general-purpose external CMS for launch and do not make GitHub the day-to-day editorial database. Import current Markdown posts into versioned content records while preserving slug, author/byline, publication date, update date, tags, category, canonical URL, and redirects.

Public rendering consumes only immutable published revisions. Draft edits never mutate the live revision. A post follows draft → review → scheduled/published → archived states. Publishing, unpublishing, slug changes, and safety-sensitive revisions require fresh step-up authentication and audit records. Previous revisions remain recoverable.

Authorship and editing are separate facts:

- `author`/byline identifies the original owner or credited writer;
- `created_by`, `edited_by`, `reviewed_by`, and `published_by` identify account actions;
- an editor cannot silently replace the historical author;
- byline changes are audited and require publish permission.

The Content Studio supports articles, static marketing pages, SEO fields, preview, scheduling, media references, categories/tags, revision comparison, redirects, and localization status. It uses a **hybrid editor**: an accessible WYSIWYG writing surface is the default for articles, with an optional Markdown source mode for the owner and power users; static pages use a bounded visual block composer. Existing Markdown remains importable/exportable. The canonical saved representation is validated Markdown or versioned structured-block JSON—not arbitrary rendered HTML. Raw JavaScript, event attributes, unapproved embeds, and unrestricted HTML are never publishable. It does not become the LMS course-authoring system, simulator component catalog, community-post editor, legal-consent store, or an arbitrary page-builder.

## Interaction model

Platform administration does not use a generic persistent left sidebar or dashboard-card grid. Its navigation is an electrical switchboard bus across the top: each capability-visible station opens a focused workplane. The default workplane is a chronological decision ledger, not a vanity metrics dashboard. Healthy systems remain quiet, exceptions carry evidence and a recommended next action, and command search gives expert operators direct keyboard access. Narrow screens retain the same model through a horizontally scrollable station bus and full-width workplane.

The interaction contract is prototyped at `docs/prototypes/v3-platform-switchboard-demo.html`; the hybrid writing experience is prototyped at `docs/prototypes/v3-content-studio-editor-demo.html`. Both must pass keyboard, focus-order, reduced-motion, responsive-overflow, and permission-hiding checks before integration.

## Authorization

Use capabilities rather than one all-powerful UI role:

- `platform.content.read`
- `platform.content.edit`
- `platform.content.publish`

The `content_manager` role receives these capabilities. Super administrators retain them for emergency/owner operation, but ordinary editorial work should use `content_manager`. Publication is high risk and requires MFA plus a fresh step-up proof. Future teams may split editing and publishing roles without changing content ownership.

## Super administrator boundaries

Even a super administrator cannot through the UI:

- read passwords, password hashes, passkey private material, recovery secrets, payment credentials, or integration secrets;
- execute arbitrary SQL or bypass immutable audit/outbox history;
- rewrite accepted assessment attempts, grades, financial ledgers, consent history, or published authorship without a dedicated audited correction workflow;
- enter a tenant as a user without a time-limited, reason-bound support session and visible audit trail;
- erase another user's public/community content outside the moderation and appeal workflow;
- silently publish safety-critical electrical claims without the configured review gate;
- disable their own MFA/step-up requirement for high-risk operations.

Destructive and bulk actions require explicit confirmation, reason capture, bounded scope, fresh step-up, and audit/outbox events. Break-glass recovery is operationally separate from normal web administration.

## Migration

1. Inventory current Markdown and media.
2. Import idempotently by stable legacy source key.
3. Preserve author/byline and original timestamps exactly.
4. Validate internal links, component-help deep links, metadata, and canonical URLs.
5. Generate redirects for any approved slug change.
6. Compare rendered output and sitemap before switching public reads.
7. Keep the Git history as a read-only provenance archive after cutover.

## Consequences

ElectraSim owns a focused CMS matching its localization, safety, and audit requirements without inheriting a large generic CMS surface. It requires an editor, preview renderer, media pipeline, migration utility, and publication tests. Platform admin remains least-privilege even though the owner may initially hold both super-admin and content-manager capabilities.
