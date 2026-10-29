# Repository knowledge workflow

Use the existing local graph to retrieve a bounded task briefing before opening
source files. No service, database, embedding model or network access is needed.

```bash
bun run graph:brief -- "membership access"
bun run graph:brief -- appearance --limit 8
bun run graph:impact -- src/admin/Admin.tsx
bun run graph:check
```

`brief` returns a compact task briefing with a 6,000-character body budget.
Exact IDs and tags rank ahead of incidental text; numeric identifiers are atomic
(`2.4` does not match `12.47`). All meaningful query terms are matched first.
If no full match exists, a labelled partial fallback requires at least two terms
(or the sole term for a one-term query), and every numeric term must still match.
Partial matches are navigation suggestions; inspect linked source and evidence.

```bash
bun run graph:brief -- "membership access"
bun run graph:brief -- "membership access" --detail --budget 24000 --limit 40
bun run graph:brief --changed
bun run graph:brief --changed --depth 3 --limit 20
```

The default prints the active phase ID and a command to read its full status.
`--detail` includes the original phase history and full record summaries and check
rationales; its default budget is 24,000 characters. Historical acceptance,
interrupted-run recovery and exceptions remain in the authoritative records.
Compact mode explicitly replaces long summaries/rationales with a detail pointer;
it never cuts an acceptance sentence in half or invents a condensed acceptance.

`--budget` accepts 1,000–200,000 characters (not a model-specific token count).
The body is bounded as a whole, with round-robin space for entry points, checks,
decisions, findings and tests. Whole rows are omitted when they do not fit.
Section counts report shown/available rows, and matched-record counts report the
selection limit. Global constraints and the required-gate reminder are always
retained; a warning reports if these plus the header exceed a requested budget.
A graph-refresh diagnostic is separate from the briefing body.

`--limit` defaults to 12 per section and selected-record list. Increase both budget
and limit for detail, or narrow the query. Paths and commands are deduplicated.
Global constraint evidence does not automatically add unrelated test files.
Unmatched queries still fall back to exact-token source/symbol paths and explicitly
report missing curated coverage. Commands are displayed, never executed.

`--changed` accepts no query. It reads staged, unstaged and untracked paths from
local Git status, handles rename/copy paths, and uses only paths in the graph's
existing file inventory. It maps those files and bounded reverse dependencies to
curated records through entry points, evidence and check files. Traversal defaults
to depth 2 and the briefing's limit per changed file; omitted impact counts are
reported. Unindexed files are excluded, including environment files. Deleted
paths cannot be traversed once absent from the index; broken declared evidence
continues to fail validation. This is navigation, not a complete test selector.
No test selection overrides a required phase gate.

## Authoritative records

- `AGENTS.md`: workspace rules and local-only restrictions.
- Phase plans and audits: scope, acceptance and exceptions.
- `docs/code-graph.json`: navigation summaries, explicit relationships and review
  metadata; link to authoritative documents instead of copying their narratives.
- `.code-graph/`: disposable generated index, always local and ignored.

A feature has a stable `id`, `summary`, search `tags`, `entryPoints`, `evidence`,
linked `facts`, and `checks` with a `command`, `files` and `reason`. Use `decisions`
for short rationale with an authoritative source; `broaderChecks` records when a
focused check is insufficient. Mark only universally relevant facts `global`.
The existing `relations` array continues to connect individual test files to
implementation files for impact traversal.

## Freshness and review

Freshness compares SHA-256 hashes of evidence, entry points, check files and the
record definition with an explicitly recorded baseline. It is independent of
index freshness and persists across deleting/rebuilding `.code-graph/`.

- `unreviewed`: no baseline; historical evidence may exist, but this tool has not
  recorded a scoped review.
- `current evidence`: the record and its direct evidence match the baseline.
  This is not proof of correctness or a passing test result.
- `needs review`: supporting content or the record definition changed.

After inspecting the evidence (and running checks when appropriate), record the
actual scope. Review one record at a time; never automatically renew baselines.

```bash
bun run graph:review -- membership-access --scope "Reviewed audit and gate mapping; no runtime tests rerun"
```

`graph:check` exits 1 for unreviewed or changed records and for invalid references;
it does not run tests. Existing historical findings intentionally start unreviewed.
`graph:review` writes only that record's baseline into the tracked knowledge file.
It does not certify tests or phase completion. Format JSON after edits with Biome.
Changes outside a record's declared evidence are not detected by its fingerprint:
keep evidence coverage explicit and use impact analysis for transitive changes.

## Measuring value

For recurring tasks, compare elapsed briefing time, output bytes, files opened
before the first useful edit, and relevant checks missed. Keep those observations
in task audits when useful; do not invent a percentage saving. Retain fast cached
AST navigation by default; request `graph:build -- --semantic` only when compiler
call resolution would help. Add richer search/storage only after observing a
specific retrieval bottleneck.
