# Open Drafting Table — accepted simulator redesign implementation

Date: 2026-10-13. User status: design accepted and actual implementation authorised.
Implementation order: retire Challenge Mode first, validate locally, then migrate
the simulator UI. Challenge Mode is deferred to a later-stage rebuild and its
existing plan/documentation stays available.

Status on 2026-10-14: **complete locally**, including the subsequently reviewed,
explicitly approved four-file cleanup and passing post-deletion gates. See the
[implementation audit](../audits/open-drafting-table-implementation.md) for exact
scope, evidence and the retained historical performance exceptions.

The approved [prototype](../design/open-drafting-table/README.md) and its
[screen inventory](../design/open-drafting-table/SCREENS.md) are the review reference.
Historical 52-screen coverage includes the now-deferred Challenge Mode screen.
The active preview has 51 screen designs after this user-directed removal.

## Scope and sequence

1. Complete and validate the [retirement](../audits/challenge-mode-retirement.md).
   Preserve Diagnosis, Fault Lab, guided circuits, normal autosave and shared replay.
2. Migrate the entire workspace shell: centred commands, full-width bottom
   component shelf/catalogue and independent Console severity selections.
   Retain project, account, standards, placement, editing and run behavior.
3. Implement desktop-right / phone-bottom Inspector with Properties, Readings
   and Configure. Basic component/wire edits remain inline; detailed models
   and installation settings retain focused windows. Preserve review/access/Undo.
4. Adopt recognisable physical device families and separate schematic badges
   across catalogue and actual canvas. Keep canonical terminals, saved circuit
   schema, hit targets, rotation and wires. Photos remain representative references.
   Glow follows fresh accepted load response.
5. Redesign every active simulator surface: files/import/export, templates/guides,
   settings, context actions, diagnostics/readings/history, Fault Lab/Diagnosis,
   access/recovery, documentation/onboarding and error/loading states. Existing
   numerical, ownership, grading and repair semantics remain authoritative.
6. Apply darker muted blue/slate palettes, selective icons and two-way motion.
   Respect manual/OS reduced motion; keep exits mounted through transitions.
   Inline Align/Distribute/Rotate uses real selection and batched history.
7. Consolidate source and built local acceptance, documentation and graph evidence.
   Existing Phase 1.9 performance exceptions remain explicit until measured
   evidence satisfies unchanged targets.

## Review before unrelated cleanup

Identify exact unused theme/styling/function candidates and their replacements.
Inspect graph dependencies plus dynamic/style/test consumers, prepare a concrete
diff and validation, then request user review before deletion. Challenge Mode's
specific removal is already authorised. A prototype does not prove that an old
production module is unused.

On 2026-10-14, after reviewing the exact four files/functions and replacements,
the user explicitly approved the [718-line cleanup](../design/open-drafting-table/CLEANUP_REVIEW.md)
and instructed completing this phase. Only `PhoneDock.tsx`, `AlignmentBar.tsx`,
`FaultLabDialog.tsx` and `workspace.css` were removed. Their exact local backups
are retained. Post-deletion gates and phase closure are recorded in the
[implementation audit](../audits/open-drafting-table-implementation.md).

## Required local validation

- Typecheck, lint and relevant/full unit acceptance for shared store/contracts.
- Build simulator and Astro, then assets/links/SEO/CSP checks.
- Exercise real desktop/phone/tablet inputs and keyboard in source and built
  delivery: selection/placement, terminal/wire geometry, drafts/reviews/Undo,
  Console, settings persistence, photos, freshness and animation.
- Preserve Diagnosis identification plus actual repair, damage/repair, guides,
  access restrictions, original export/basic copy and autosave/reload.
- Run local Worker/D1/session acceptance where auth/API behavior changes.
- Distinguish partial/recovery results and complete gates. The knowledge graph
  is navigation and scoped evidence, not passing-test proof.

All work is local. No publication, remote Cloudflare operation, credentials or
framework rewrite is authorised. The existing Astro/React boundary continues.
