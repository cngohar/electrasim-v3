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

export function briefing(graph, query, { limit = 12 } = {}) {
  const terms = query.toLowerCase().match(/[a-z0-9_.\/-]+/g) ?? [];
  if (!terms.length) throw new Error('brief requires a searchable query');
  const score = (text) =>
    terms.reduce((n, term) => n + Number(text.toLowerCase().includes(term)), 0);
  const ranked = records(graph.knowledge)
    .map((r) => ({
      r,
      score: score(
        JSON.stringify({
          id: r.id,
          summary: r.summary,
          tags: r.tags,
          entryPoints: r.entryPoints,
          evidence: r.evidence,
        }),
      ),
    }))
    .filter((r) => r.score === terms.length)
    .sort(
      (a, b) =>
        Number(b.r.kind === 'feature') - Number(a.r.kind === 'feature') ||
        a.r.id.localeCompare(b.r.id),
    );
  const selected = ranked.slice(0, limit).map(({ r }) => r);
  const linked = new Set(selected.flatMap((r) => r.facts ?? []));
  const facts = (graph.knowledge.facts ?? []).filter(
    (f) => f.global || linked.has(f.id) || selected.some((s) => s.id === f.id),
  );
  const matches = graph.nodes.filter(
    (n) => n.path && !n.id.startsWith('fact:') && score(`${n.name} ${n.path}`) === terms.length,
  );
  const paths = new Set([
    ...selected.flatMap(evidencePaths),
    ...facts.flatMap(evidencePaths),
    ...matches.map((n) => n.path),
  ]);
  const lines = [
    `Task: ${query}`,
    `Active phase: ${graph.activePhase} (${graph.knowledge.phases.find((p) => p.id === graph.activePhase)?.status})`,
    'Local guidance only; evidence freshness is not a passing test result.',
  ];
  const section = (title, items) => {
    lines.push(`\n${title} (${Math.min(limit, items.length)}/${items.length})`);
    lines.push(...items.slice(0, limit).map((item) => `- ${item}`));
  };
  section(
    'Features',
    selected
      .filter((r) => r.kind === 'feature')
      .map((r) => `${r.id}: ${r.summary} [${freshness(r, graph.evidenceHashes)}]`),
  );
  section(
    'Constraints and findings',
    facts.map(
      (r) =>
        `${r.id}: ${r.summary} [${freshness(r, graph.evidenceHashes)}]; evidence: ${r.evidence.join(', ')}`,
    ),
  );
  section('Entry points and evidence', [
    ...new Set([
      ...selected.flatMap((r) => r.entryPoints ?? []),
      ...paths,
      ...matches.map((n) => `${n.path}${n.line ? `:${n.line}` : ''}`),
    ]),
  ]);
  section('Suggested checks (not executed)', [
    ...new Set(selected.flatMap((r) => (r.checks ?? []).map((c) => `${c.command} — ${c.reason}`))),
  ]);
  section('Related test files (inferred or recorded; assess coverage)', [
    ...new Set(
      graph.edges
        .filter((e) => e.relation === 'tests' && paths.has(e.to.replace(/^file:/, '')))
        .map((e) => e.from.replace(/^file:/, '')),
    ),
  ]);
  section(
    'Decisions and broader-check triggers',
    selected.flatMap((r) => [...(r.decisions ?? []), ...(r.broaderChecks ?? [])]),
  );
  if (!selected.length)
    lines.push(
      '\nNo curated match. Use graph:find and graph:impact; do not infer absence of tests from this result.',
    );
  lines.push(
    `\nMatched records: ${selected.length}/${ranked.length}. Limit applies per section; narrow the query for omitted context.`,
  );
  return lines.join('\n');
}
