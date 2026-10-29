import { createHash } from 'node:crypto';

export const fingerprint = (content) => createHash('sha256').update(content).digest('hex');
export const records = (knowledge) => [
  ...(knowledge.facts ?? []).map((r) => ({ ...r, kind: 'fact' })),
  ...(knowledge.features ?? []).map((r) => ({ ...r, kind: 'feature' })),
];
export function evidencePaths(record) {
  return [
    ...new Set([
      ...(record.evidence ?? []),
      ...(record.entryPoints ?? []),
      ...(record.checks ?? []).flatMap((c) => c.files),
    ]),
  ];
}
export function reviewFingerprint(record, hashes) {
  const { review: _review, kind: _kind, ...definition } = record;
  return fingerprint(
    JSON.stringify([definition, evidencePaths(record).map((p) => [p, hashes[p] ?? null])]),
  );
}
export function freshness(record, hashes) {
  if (!record.review) return 'unreviewed';
  return record.review.fingerprint === reviewFingerprint(record, hashes)
    ? 'current evidence'
    : 'needs review';
}
export function validateKnowledge(knowledge, files) {
  const ids = new Set();
  for (const record of records(knowledge)) {
    if (!record.id || ids.has(record.id))
      throw new Error(`Duplicate or missing knowledge id: ${record.id}`);
    ids.add(record.id);
    if (!record.summary || !record.evidence?.length)
      throw new Error(`Missing summary/evidence: ${record.id}`);
    for (const file of evidencePaths(record)) {
      if (!files.has(file)) throw new Error(`Missing knowledge evidence: ${record.id}: ${file}`);
    }
    for (const check of record.checks ?? []) {
      if (!check.command || !check.reason || !check.files?.length)
        throw new Error(`Incomplete check: ${record.id}`);
    }
    if (
      record.review &&
      (!record.review.scope ||
        !record.review.at ||
        !/^[a-f0-9]{64}$/.test(record.review.fingerprint))
    )
      throw new Error(`Invalid review: ${record.id}`);
  }
  for (const feature of knowledge.features ?? []) {
    for (const id of feature.facts ?? []) {
      if (!knowledge.facts.some((f) => f.id === id)) throw new Error(`Unknown fact: ${id}`);
    }
  }
}

// Keep version/milestone numbers atomic: 2.4 must never match 12.47.
const tokens = (text) =>
  text.toLowerCase().match(/[a-z]+[a-z0-9]*|[0-9]+(?:\.[0-9]+)*(?:[a-z]+)?/g) ?? [];
const stopWords = new Set([
  'a',
  'an',
  'and',
  'for',
  'how',
  'i',
  'in',
  'is',
  'of',
  'the',
  'to',
  'with',
]);

export function searchRecords(knowledge, query) {
  const terms = [
    ...new Set(
      tokens(
        query
          .split(/\s+/)
          .filter((word) => !stopWords.has(word.toLowerCase()))
          .join(' '),
      ),
    ),
  ];
  if (!terms.length) throw new Error('brief requires a searchable query');
  const numeric = terms.filter((term) => /^\d/.test(term));
  const fallbackTerms = terms.filter((term) => !stopWords.has(term));
  const ranked = records(knowledge)
    .map((r) => {
      const fields = [
        r.id,
        ...(r.tags ?? []),
        ...(r.entryPoints ?? []),
        ...(r.evidence ?? []),
        r.summary,
      ];
      const sets = fields.map((field) => new Set(tokens(field)));
      const matched = terms.filter((term) => sets.some((set) => set.has(term)));
      const exact =
        r.id.toLowerCase() === query.toLowerCase()
          ? 1000
          : (r.tags ?? []).some((tag) => tag.toLowerCase() === query.toLowerCase())
            ? 500
            : 0;
      const weight = terms.reduce(
        (sum, term) =>
          sum +
          (sets[0].has(term)
            ? 30
            : sets.slice(1, 1 + (r.tags?.length ?? 0)).some((set) => set.has(term))
              ? 15
              : 1),
        0,
      );
      return {
        r,
        matched: matched.length,
        partialMatched: matched.filter((term) => fallbackTerms.includes(term)).length,
        score: exact + weight,
        numericMatch: numeric.every((term) => matched.includes(term)),
      };
    })
    .filter((item) => item.matched && item.numericMatch);
  const full = ranked.filter((item) => item.matched === terms.length);
  const partial = !full.length;
  return {
    partial,
    ranked: (partial
      ? ranked.filter(
          (item) =>
            item.partialMatched >= Math.min(2, fallbackTerms.length) && item.partialMatched > 0,
        )
      : full
    ).sort(
      (a, b) =>
        b.score - a.score ||
        b.matched - a.matched ||
        Number(b.r.kind === 'feature') - Number(a.r.kind === 'feature') ||
        a.r.id.localeCompare(b.r.id),
    ),
    terms,
  };
}

// Porcelain -z uses destination then source for renames/copies. Preserve spaces.
export function changedPaths(status) {
  const fields = status.split('\0');
  const paths = [];
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (!field) continue;
    paths.push(field.slice(3));
    if (/[RC]/.test(field.slice(0, 2)) && fields[i + 1]) paths.push(fields[++i]);
  }
  return [...new Set(paths)];
}

export function briefing(
  graph,
  query,
  {
    limit = 12,
    detail = false,
    budget = detail ? 24000 : 6000,
    changed,
    affected = [],
    impactOmitted = 0,
  } = {},
) {
  const scope = new Set([...(changed ?? []), ...affected]);
  const search = changed
    ? {
        partial: false,
        terms: [],
        ranked: records(graph.knowledge)
          .filter((r) => evidencePaths(r).some((p) => scope.has(p)))
          .map((r) => ({
            r,
            score: evidencePaths(r).reduce(
              (score, p) =>
                score +
                (changed.includes(p)
                  ? (r.entryPoints ?? []).includes(p)
                    ? 30
                    : (r.checks ?? []).some((c) => c.files.includes(p))
                      ? 15
                      : 1
                  : scope.has(p)
                    ? 0.1
                    : 0),
              0,
            ),
          }))
          .sort((a, b) => b.score - a.score || a.r.id.localeCompare(b.r.id)),
      }
    : searchRecords(graph.knowledge, query);
  const selected = search.ranked.slice(0, limit).map(({ r }) => r);
  const linked = new Set(selected.flatMap((r) => r.facts ?? []));
  const globals = (graph.knowledge.facts ?? []).filter((f) => f.global);
  const facts = (graph.knowledge.facts ?? []).filter(
    (f) => !f.global && (linked.has(f.id) || selected.some((s) => s.id === f.id)),
  );
  const matches = changed
    ? []
    : graph.nodes.filter((n) => {
        if (!n.path || n.id.startsWith('fact:')) return false;
        const set = new Set(tokens(`${n.name} ${n.path}`));
        return search.terms.every((term) => set.has(term));
      });
  // Global evidence must not pull unrelated tests into every task.
  const paths = new Set([
    ...scope,
    ...selected.flatMap(evidencePaths),
    ...facts.flatMap(evidencePaths),
    ...matches.map((n) => n.path),
  ]);
  const phase = graph.knowledge.phases.find((p) => p.id === graph.activePhase);
  const lines = [
    `Task: ${changed ? 'working-tree changes' : query}`,
    `Active phase: ${graph.activePhase}${detail ? ` (${phase?.status})` : '; status, acceptance history and exceptions: bun run graph:phase'}`,
    'Local guidance only; evidence freshness is not a passing test result. Required phase gates still apply.',
    ...globals.map(
      (r) =>
        `Required: ${r.summary} [${freshness(r, graph.evidenceHashes)}]; evidence: ${r.evidence.join(', ')}`,
    ),
  ];
  if (search.partial && selected.length)
    lines.push('Partial matches only; verify relevance in linked evidence.');
  if (changed)
    lines.push(
      `Changed indexed paths: ${changed.length}; affected paths: ${affected.length}; omitted impact results: ${impactOmitted}. Impact is bounded navigation, not complete test coverage.`,
    );
  if (!selected.length)
    lines.push('No curated match. Use graph:find and graph:impact; do not infer absence of tests.');
  const summary = (r) =>
    `${r.id}: ${detail || r.summary.length <= 240 ? r.summary : 'long summary/acceptance details omitted; use --detail'} [${freshness(r, graph.evidenceHashes)}]`;
  const unique = (items) => [...new Set(items)];
  const checks = new Map();
  for (const record of selected) {
    for (const check of record.checks ?? []) {
      if (!checks.has(check.command)) checks.set(check.command, new Set());
      checks.get(check.command).add(check.reason);
    }
  }
  const sections = [
    ['Features', selected.filter((r) => r.kind === 'feature').map(summary)],
    [
      'Entry points and evidence',
      unique([
        ...(changed ?? []),
        ...selected.flatMap((r) => r.entryPoints ?? []),
        ...selected.flatMap((r) => r.evidence ?? []),
        ...facts.flatMap((r) => r.evidence ?? []),
        ...matches.map((n) => n.path),
        ...paths,
      ]),
    ],
    [
      'Suggested checks (not executed)',
      [...checks].map(([command, reasons]) => {
        const reason = [...reasons].join(' / ');
        return `${command} — ${detail || reason.length <= 240 ? reason : 'see --detail for scope and acceptance caveats'}`;
      }),
    ],
    [
      'Decisions and broader-check triggers',
      unique(selected.flatMap((r) => [...(r.decisions ?? []), ...(r.broaderChecks ?? [])])),
    ],
    [
      'Constraints and findings',
      facts.map((r) => `${summary(r)}; evidence: ${r.evidence.join(', ')}`),
    ],
    [
      'Related test files (inferred or recorded; assess coverage)',
      unique(
        graph.edges
          .filter((e) => e.relation === 'tests' && paths.has(e.to.replace(/^file:/, '')))
          .map((e) => e.from.replace(/^file:/, '')),
      ),
    ],
  ].map(([title, items]) => ({ title, items, shown: [] }));
  const render = () =>
    [
      ...lines,
      ...sections.flatMap(({ title, items, shown }) =>
        items.length
          ? [`\n${title} (${shown.length}/${items.length})`, ...shown.map((item) => `- ${item}`)]
          : [],
      ),
      `\nMatched records: ${selected.length}/${search.ranked.length}. Counts show omissions. Expand with --detail --budget 24000 --limit 40; narrow the query for relevance.`,
    ].join('\n');
  // Round-robin allocation prevents a long feature list starving checks/entry points.
  // Never cut a row mid-sentence, potentially dropping an acceptance caveat.
  for (let i = 0; i < limit; i++) {
    for (const section of sections) {
      if (i >= section.items.length) continue;
      section.shown.push(section.items[i]);
      if (render().length > budget) section.shown.pop();
    }
  }
  let output = render();
  if (output.length > budget)
    output += '\nRequired constraints/header exceed the requested budget; retained in full.';
  return output;
}
