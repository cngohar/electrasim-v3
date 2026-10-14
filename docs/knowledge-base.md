# Repository knowledge workflow

Use the existing local graph to retrieve a bounded task briefing before opening
source files. No service, database, embedding model or network access is needed.

```bash
bun run graph:brief -- "membership access"
bun run graph:brief -- appearance --limit 8
bun run graph:impact -- src/admin/Admin.tsx
bun run graph:check
```

`brief` matches all query terms across each record's ID, summary, tags and paths.
It includes linked findings, global constraints, entry points, suggested commands,
related test files, decisions and broader-check triggers. Each section has a
12-item default limit and reports omitted counts. Narrow the query or raise
`--limit` to inspect omitted context. Unmatched queries fall back to source/symbol
matches and explicitly report missing curated coverage. Commands are displayed,
never executed. Read linked evidence before editing; graph edges do not prove
runtime coverage. No test selection overrides a required phase gate.

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
