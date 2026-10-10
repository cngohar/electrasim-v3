# Local knowledge graph

Every remaining phase uses this graph to find relevant code and evidence before
repeating broad exploration. `AGENTS.md` makes the workflow durable across sessions.

```sh
bun run graph:phase
bun run graph:find -- componentAppearance
bun run graph:impact -- src/ui/canvas/ComponentNode.tsx
bun run graph:impact -- src/ui/Editor.tsx --direction dependencies --depth 1 --limit 20
bun run graph:status
bun run graph:build -- --semantic
bun run test:graph
```

Queries check file inventory, modification times/sizes and Git status, rebuilding
when stale. Unchanged source syntax is reused; default builds do not instantiate
the expensive TypeScript type checker. AST indexing includes static imports,
re-exports and literal lazy imports, resolved through the repository TS settings
and workspace package exports. Semantic builds optionally add compiler-resolved
cross-file calls. A later fast rebuild explicitly drops old semantic edges rather
than presenting stale call evidence. Metadata-preserving edits can be refreshed
by removing the generated index and rebuilding.

Impact traverses incoming dependency/test edges by default. It excludes phase,
knowledge and symbol-declaration hubs, and bounds output. It is conservative:
nonliteral runtime imports, configuration wiring and same-name test heuristics
can require manual evidence links. It does not replace source inspection or tests.

Maintain `docs/code-graph.json` with explicit phases, sourced findings and reviewed
test edges. Phase numbers are not guessed from arbitrary prose, version strings,
or benchmark decimals. The graph is an index of evidence, not an acceptance result.
Generated cache files in `.code-graph/` are ignored by Git and Biome.

The inventory includes the separate `admin/` entry, public script/header/redirect
files and an explicit allowlist of root Vite, Vitest, Playwright and local Wrangler
configs. It never scans arbitrary root files or environment secrets. Reviewed
`configured-by` edges connect HTML entries to build/security configuration and
participate in bounded impact queries; they are not inferred runtime imports.
For membership work, start with `graph:phase 1.8`, `graph:find -- src/admin`, and
`graph:impact -- public/_headers`. Browser tests cross the separate HTML entry,
real-cookie test Worker and local D1; an import-only traversal cannot prove that
coverage. Keep those test relationships explicit in `docs/code-graph.json`.
