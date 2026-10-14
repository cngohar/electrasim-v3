# Production cleanup review

Status on 2026-10-14: **the four-file deletion is explicitly approved and applied**;
post-deletion verification passed and Phase 1.10 is complete locally.
The user explicitly requested review before unrelated unused code is removed.
Challenge Mode's separate runtime retirement was already authorised and completed.

After reviewing the four files, exact functions and replacements, the user said:

> ok accpetd , you are free to delete them and complete the phase, and when done then let me know that

The reviewed patch was applied without expanding its scope. Exact current-file
backups and an applied deletion ledger remain in the ignored local review folder.

## Approved files and replacement

| File | Lines | Replacement and dependency evidence |
| --- | ---: | --- |
| `src/ui/components/PhoneDock.tsx` | 182 | Centered `Toolbar` / `CanvasToolbar`, full-width `Palette`, three-tab `Inspector`, modeless Fault Lab. No source/test/build consumer imports the dock. Graph reports zero dependents. |
| `src/ui/components/AlignmentBar.tsx` | 107 | `InlineArrange` in the context menu calls the existing batched canvas actions. No source/test/build consumer imports the strip. Graph reports zero dependents. |
| `src/ui/components/FaultLabDialog.tsx` | 12 | Shared modeless Inspector tool window provides the same `InspectorFaultLabView` on desktop and phone. Before deletion its only importer was the unused `PhoneDock`. |
| `src/ui/workspace.css` | 417 | Imported `src/ui/open-table.css` provides the accepted responsive shell. No production import or build entry point loads the previous stylesheet. Its exact current contents, including pre-existing local edits, are backed up. |

These four files total 718 lines. This removal does not delete stores, solver
models, access guards, persisted data/migrations, physical-art fallback code,
Inspector re-exports, plans or historical audits. Shared fault/repair controls
and alignment/rotation/history actions remain active.

## Exact approved functions and styles

- `PhoneDock.tsx`: remove `PhoneDock()`, its local `deleteSelection()` callback,
  `PhoneBtn()`, the local `PhoneBtnProps` interface and the lazy Fault Lab wrapper
  import. These implement the previous phone strip. The shared delete, supply,
  wiring, fit, review, inspection and settings actions remain in their active
  modules and redesigned controls.
- `AlignmentBar.tsx`: remove `AlignmentBar()` and its local `AlignBtn()` helper.
  Keep `alignSelected()` and `distributeSelected()` in `canvas-actions.ts`;
  `InlineArrange` calls them from the right-click menu with the existing Undo
  behavior. The proposal removes only the previous floating strip.
- `FaultLabDialog.tsx`: remove `FaultLabDialog()`, the old phone-only modal
  wrapper. Keep `InspectorFaultLabView` and all shared fault/repair behavior;
  the active Inspector hosts that view on desktop and phone.
- `workspace.css`: remove the whole unimported previous shell stylesheet.
  Keep the active `open-table.css`, shared styles, theme settings and persisted
  appearance choices. The previous stylesheet contains existing local edits,
  so its exact current contents are included in the backup.

The user was shown these exact four files, function names and replacements on
2026-10-14 and then explicitly approved their deletion in the reply quoted above.

## Concrete local diff

The exact [deletion patch](../../../.wrangler/open-drafting-table/cleanup-review/proposed-deletions.patch)
was prepared against the current files. `git apply --check` passed before the
approved patch was applied. Exact backups are under the same ignored local
directory, mirroring source paths. All four originals are now removed from the
working tree; [the ledger](../../../.wrangler/open-drafting-table/cleanup-review/applied-deletions.json)
records their backup hashes and line counts.

Reverse dependencies were inspected with `graph:impact`; imports, dynamic imports,
source/test selectors and Vite entry points were searched directly. Graph edges
are navigation evidence, not passing runtime tests. The production migration's
[acceptance record](../../audits/open-drafting-table-implementation.md) records
source/built, phone/desktop, terminal geometry, history, access and repair checks.
No source, test or Vite entry-point import references the removed files.
Post-deletion gates all completed with command exit 0:

- Typechecks/lint and 139 unit files / **2,115 tests** (`cleanup-check.log`).
- Fresh simulator/Astro build, unchanged static asset budgets, links, SEO and
  CSP (`cleanup-build.log`, `cleanup-budget.log`, `cleanup-links.log`,
  `cleanup-seo.log`, `cleanup-csp.log`).
- **18** affected source cases across Chrome, phone Chrome and Safari:
  clear shell, original canvas commands, direct alignment/Undo, modeless Fault
  Lab handoff, phone terminal-disconnect injection and phone damage/access/focus
  controls (`cleanup-source-ui.log`).
- **Six** fresh built desktop/phone cases: actual loaded model rows, canvas
  artwork/reference photo, basic drafts/Undo, motion/Console and catalogue
  placement (`cleanup-built-ui.log`).
- **Five** graph implementation tests (`cleanup-graph-tests.log`).

All logs are under `.wrangler/open-drafting-table/`. The
[implementation audit](../../audits/open-drafting-table-implementation.md)
preserves prior failure/recovery and performance boundaries. This completes the
approved cleanup and Phase 1.10; the historical Phase 1.9 performance exceptions
are unchanged.

Approval covers only these four files. Existing unrelated workspace changes and
historical deletions are outside this removal.
