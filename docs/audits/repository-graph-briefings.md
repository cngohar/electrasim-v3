# Repository graph briefing improvements — 2026-10-28

## Scope and result

Repository-wide graph tooling only. Compact briefings share a 6,000-character
body budget. Exact IDs/tags rank ahead of incidental matches; numeric identifiers
are atomic; missing full matches use an explicitly labelled partial fallback.
Working-tree briefings map indexed staged/unstaged/untracked paths and bounded
reverse dependencies to curated feature/check records. Direct implementation and
check-file changes rank above shared historical evidence. Paths and commands are
deduplicated; merged check commands preserve all reasons in detailed output.

Full phase status, acceptance/recovery distinctions and exceptions remain in the
existing records and `graph:phase` / `brief --detail`. Compact output does not
invent shortened acceptance claims. Required global constraints and the gate
reminder are retained even when they exceed a requested budget. Matching evidence
fingerprints remain distinct from executed tests. No active phase was advanced.

## Observed output sizes

Five warm direct invocations of `bun scripts/code-graph.mjs brief QUERY` before
and after the implementation; stdout measured as UTF-8 bytes. These are single
samples collected during this task, before registering this audit and renewing
the graph-tooling review. Those later metadata additions can change output size.
This is output reduction, not a measured model-token saving or coding-speed gain.
Character limits differ from UTF-8 bytes, so a body below 6,000 characters may
exceed 6,000 bytes. The CLI also emits a final newline.

| Query | Before bytes | After bytes | Reduction |
| --- | ---: | ---: | ---: |
| `repository-knowledge` | 5474 | 2013 | 63.2% |
| `membership access` | 26502 | 6004 | 77.3% |
| `component appearance` | 18217 | 3473 | 80.9% |
| `graph workflow faster development token saving` | 4930 | 2098 | 57.4% |
| `2.4` | 11869 | 4196 | 64.6% |

Before-call elapsed times were 0.545–0.660 seconds and after-call times were
0.427–0.445 seconds. Single samples and environment variability do not establish
a performance improvement. Cached incremental parsing remains in place.

Retrieval inspection confirmed the natural-language graph query now returns
`repository-knowledge` as a labelled partial match, instead of no curated match.
The numeric query no longer matches the unrelated `12.47` measurement. The changed
brief ranks `repository-knowledge` first for the tooling edits. Shared evidence
can still select broad historical records; counts and limits expose the scope.

## Verification and limits

- `bun run test:graph`: 10 tests pass. Coverage includes CLI incremental refresh,
  actual fixture Git status, environment-file exclusion, review invalidation,
  exact ID/tag and numeric/path matching, partial fallback, whole-output budgets,
  required-constraint overflow, detail caveats, source fallback tests, changed-file
  ranking, command deduplication and NUL-delimited rename/copy parsing.
- An intermediate regression run caught an overly broad partial match after path
  token handling changed. Fallback matching now excludes stop words while full
  path matching preserves them; the CLI regression remains covered.
- Targeted Biome checks and `git diff --check` pass.
- Real `brief --changed` and representative query outputs were inspected.
- `graph:check` reported 17 unreviewed, 54 needs-review and 7 current records before
  the scoped tooling review. This is an evidence inventory, not test failure or
  success. Only `repository-knowledge` receives a new baseline after review.
- Application runtime and phase acceptance suites were not rerun: no application
  code changed. Required phase gates remain authoritative for future phase work.

`--changed` is a bounded navigation aid, not a complete test selector. Unindexed
paths are excluded; deleted paths absent from the current index cannot be
traversed. Missing declared evidence still fails validation. A change to shared
knowledge evidence can legitimately produce broad suggestions. No remote service,
Cloudflare account operation, deployment, credentials or private content was used.
