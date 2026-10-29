import assert from 'node:assert/strict';
import { test } from 'node:test';
import { impact, parseSource } from './code-graph-lib.mjs';

test('impact excludes declaration/phase hubs and defaults to bounded dependents', () => {
  const graph = {
    nodes: ['a', 'b', 'c', 'unrelated'].map((p) => ({ id: `file:${p}` })),
    edges: [
      { from: 'file:b', relation: 'imports', to: 'file:a' },
      { from: 'file:c', relation: 'tests', to: 'file:b' },
      { from: 'file:a', relation: 'working-tree-change', to: 'phase:1.7' },
      { from: 'file:unrelated', relation: 'working-tree-change', to: 'phase:1.7' },
      { from: 'file:a', relation: 'declares', to: 'symbol:a:x' },
      { from: 'file:a', relation: 'imports', to: 'file:b' },
    ],
  };
  assert.deepEqual(
    impact(graph, 'a', { limit: 1 }).results.map((r) => r.path),
    ['b'],
  );
  assert.equal(impact(graph, 'a', { limit: 1 }).total, 2);
  assert.deepEqual(
    impact(graph, 'c', { direction: 'dependencies', depth: 1 }).results.map((r) => r.path),
    ['b'],
  );
  assert.throws(() => impact(graph, 'missing'), /Unknown file/);
});
test('AST imports include lazy imports and re-exports, excluding commented examples', () => {
  const parsed = parseSource(
    'sample.tsx',
    `// import fake from './fake';\nimport { A } from './a';\nexport { B } from './b';\nconst lazy = () => import('./lazy');\nfunction F(){ const nested = 1; return <div/>; }`,
  );
  assert.deepEqual(parsed.imports, ['./a', './b', './lazy']);
  assert.deepEqual(
    parsed.symbols.map((s) => s.name),
    ['lazy', 'F'],
  );
  assert.equal(parsed.symbols.find((s) => s.name === 'F').line, 5);
});

test('workspace alias and lazy import resolution points to real repository files', async () => {
  const path = await import('node:path');
  const ts = (await import('typescript')).default;
  const { resolveImport } = await import('./code-graph-lib.mjs');
  const root = process.cwd();
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
  const files = new Set([
    'packages/domain/src/components/index.ts',
    'src/ui/components/SettingsModal.tsx',
  ]);
  assert.equal(
    resolveImport(root, 'src/ui/Editor.tsx', '@electrasim/domain/components', files, options),
    'packages/domain/src/components/index.ts',
  );
  assert.equal(
    resolveImport(root, 'src/ui/Editor.tsx', './components/SettingsModal', files, options),
    'src/ui/components/SettingsModal.tsx',
  );
  assert.equal(resolveImport(root, 'src/ui/Editor.tsx', './missing', files, options), null);
});

test('CLI refreshes edited inputs incrementally and reports unknown phases accurately', async () => {
  const { execFileSync } = await import('node:child_process');
  const { mkdtemp, mkdir, writeFile, readFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const path = await import('node:path');
  const fixture = await mkdtemp(path.join(tmpdir(), 'electrasim-graph-'));
  const script = path.resolve('scripts/code-graph.mjs');
  try {
    execFileSync('git', ['init', '-q', fixture]);
    await mkdir(path.join(fixture, 'src'));
    await mkdir(path.join(fixture, 'docs'));
    for (const file of ['PLAN.md', 'progress.md', 'AGENTS.md'])
      await writeFile(path.join(fixture, file), 'Phase evidence');
    await writeFile(path.join(fixture, 'package.json'), '{}');
    await writeFile(
      path.join(fixture, 'tsconfig.json'),
      '{"compilerOptions":{"moduleResolution":"bundler","module":"esnext"}}',
    );
    await writeFile(path.join(fixture, '.gitignore'), '.code-graph/\n');
    await writeFile(
      path.join(fixture, 'docs/code-graph.json'),
      JSON.stringify({
        activePhase: '1.8',
        phases: [{ id: '1.8', status: 'planned', evidence: ['PLAN.md'] }],
        facts: [{ id: 'fixture', summary: 'Fixture evidence', evidence: ['src/a.ts'] }],
        features: [
          {
            id: 'fixture-feature',
            summary: 'Fixture feature',
            evidence: ['PLAN.md'],
            entryPoints: ['src/a.ts', 'settings/profile/index.html'],
            facts: ['fixture'],
            checks: [
              {
                command: 'echo suggested-only',
                files: ['src/a.ts'],
                reason: 'Fixture relationship',
              },
            ],
          },
        ],
        relations: [{ from: 'src/a.ts', relation: 'configured-by', to: 'vite.config.ts' }],
      }),
    );
    await writeFile(path.join(fixture, 'src/a.ts'), 'export const original = 1;');
    await writeFile(path.join(fixture, 'vite.config.ts'), 'export default {};');
    await writeFile(path.join(fixture, '.env.local'), 'PRIVATE=do-not-index');
    await mkdir(path.join(fixture, 'admin/pro'), { recursive: true });
    await writeFile(path.join(fixture, 'admin/pro/index.html'), '<div>Admin entry</div>');
    await mkdir(path.join(fixture, 'settings/profile'), { recursive: true });
    await writeFile(
      path.join(fixture, 'settings/profile/index.html'),
      '<div>Owner profile entry</div>',
    );
    await writeFile(path.join(fixture, 'wrangler.profiles-test.jsonc'), '{}');
    const run = (...args) =>
      execFileSync(process.execPath, [script, ...args], {
        cwd: fixture,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    assert.match(run('phase'), /Phase 1.8: planned/);
    assert.match(run('status'), /Current graph/);
    assert.match(run('brief', 'fixture feature'), /echo suggested-only/);
    assert.match(run('brief', 'fixture', '--detail'), /Active phase: 1.8 \(planned\)/);
    assert.ok(run('brief', 'fixture', '--budget', '2000').length <= 2001);
    assert.throws(() => run('brief', 'fixture', '--budget', 'NaN'));
    assert.throws(() => run('brief', 'fixture', '--changed'));
    const changedBrief = run('brief', '--changed');
    assert.match(changedBrief, /fixture-feature/);
    assert.doesNotMatch(changedBrief, /PRIVATE|\.env.local/);
    assert.throws(
      () => run('check'),
      (error) => /unreviewed/.test(error.stdout),
    );
    assert.throws(
      () => run('review', 'fixture'),
      (error) => /requires --scope/.test(error.stderr),
    );
    run('review', 'fixture', '--scope', 'Read fixture source only; no runtime tests');
    run('review', 'fixture-feature', '--scope', 'Read fixture relationship');
    assert.match(run('check'), /current evidence/);
    await rm(path.join(fixture, '.code-graph'), { recursive: true });
    assert.match(run('check'), /current evidence/);
    assert.match(run('brief', 'not-a-real-feature'), /No curated match/);
    assert.match(run('find', 'admin/pro/index.html'), /admin\/pro\/index.html/);
    assert.match(run('find', 'settings/profile/index.html'), /settings\/profile\/index.html/);
    assert.match(run('find', 'wrangler.profiles-test.jsonc'), /wrangler\.profiles-test\.jsonc/);
    assert.match(run('impact', 'vite.config.ts'), /configured-by\s+src\/a.ts/);
    await writeFile(path.join(fixture, 'src/a.ts'), 'export const replacementLonger = 2;');
    assert.match(run('status'), /STALE/);
    assert.throws(
      () => run('check'),
      (error) => /needs review/.test(error.stdout),
    );
    assert.match(run('brief', 'fixture'), /needs review/);
    assert.match(run('find', 'replacementLonger'), /replacementLonger/);
    const graph = JSON.parse(await readFile(path.join(fixture, '.code-graph/index.json'), 'utf8'));
    assert.equal(
      graph.nodes.some((n) => n.name === 'original'),
      false,
    );
    assert.equal(graph.semantic, false);
    assert.equal(
      graph.nodes.some((n) => n.path === '.env.local'),
      false,
    );
    assert.throws(
      () => run('phase', '99'),
      (error) => /Unknown phase: 99/.test(error.stderr) && !/index missing/.test(error.stderr),
    );
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('knowledge validation rejects broken mappings and fingerprints include definition changes', async () => {
  const { fingerprint, freshness, reviewFingerprint, validateKnowledge, briefing } = await import(
    './code-graph-knowledge.mjs'
  );
  const fact = { id: 'invariant', summary: 'Keep anchors', evidence: ['source.ts'] };
  const hashes = { 'source.ts': fingerprint('original') };
  fact.review = {
    at: '2026-10-10',
    scope: 'Source inspection',
    fingerprint: reviewFingerprint(fact, hashes),
  };
  assert.equal(freshness(fact, hashes), 'current evidence');
  assert.equal(freshness({ ...fact, summary: 'Changed assertion' }, hashes), 'needs review');
  assert.equal(freshness(fact, { 'source.ts': fingerprint('changed') }), 'needs review');
  const knowledge = { facts: [fact], features: [], phases: [{ id: '1', status: 'planned' }] };
  assert.throws(() => validateKnowledge(knowledge, new Set()), /Missing knowledge evidence/);
  assert.throws(
    () => validateKnowledge({ ...knowledge, facts: [fact, fact] }, new Set(['source.ts'])),
    /Duplicate/,
  );
  assert.throws(
    () =>
      validateKnowledge(
        {
          ...knowledge,
          features: [
            { id: 'feature', summary: 'Feature', evidence: ['source.ts'], facts: ['missing'] },
          ],
        },
        new Set(['source.ts']),
      ),
    /Unknown fact/,
  );
  const graph = { knowledge, activePhase: '1', evidenceHashes: hashes, nodes: [], edges: [] };
  assert.equal(briefing(graph, 'anchors'), briefing(graph, 'anchors'));
  assert.match(briefing(graph, 'anchors', { limit: 1 }), /Constraints and findings \(1\/1\)/);
  assert.throws(() => briefing(graph, '!!!'), /searchable query/);
});

test('brief search ranks exact IDs/tags and keeps numeric identifiers atomic', async () => {
  const { searchRecords } = await import('./code-graph-knowledge.mjs');
  const knowledge = {
    features: [
      { id: 'incidental', summary: 'Membership access implementation' },
      { id: 'membership-access', summary: 'Access rules' },
      { id: 'tagged', tags: ['membership access'], summary: 'Rules' },
      { id: 'measurement', summary: 'Drift was 12.47 px' },
      { id: 'milestone', tags: ['2.4'], summary: 'Discovery' },
    ],
  };
  assert.equal(searchRecords(knowledge, 'membership-access').ranked[0].r.id, 'membership-access');
  assert.equal(searchRecords(knowledge, 'membership access').ranked[0].r.id, 'tagged');
  assert.deepEqual(
    searchRecords(knowledge, '2.4').ranked.map(({ r }) => r.id),
    ['milestone'],
  );
  assert.equal(searchRecords(knowledge, 'membership access troubleshooting').partial, true);
  assert.equal(searchRecords(knowledge, 'membership access 9.9').ranked.length, 0);
  assert.equal(searchRecords(knowledge, 'nonexistent').ranked.length, 0);
  assert.deepEqual(
    searchRecords(
      {
        features: [
          { id: 'first', summary: 'Source', entryPoints: ['src/a.ts'] },
          { id: 'second', summary: 'Source', entryPoints: ['src/b.ts'] },
        ],
      },
      'src/a.ts',
    ).ranked.map(({ r }) => r.id),
    ['first'],
  );
});

test('compact briefs budget the whole result, retain constraints and expand full caveats', async () => {
  const { briefing } = await import('./code-graph-knowledge.mjs');
  const caveat = 'Recovered stages only; never an uninterrupted gate exit 0.';
  const graph = {
    activePhase: '2',
    evidenceHashes: {},
    nodes: [],
    edges: [],
    knowledge: {
      phases: [{ id: '2', status: `Historical evidence. ${'history '.repeat(100)}${caveat}` }],
      facts: [
        {
          id: 'local',
          global: true,
          summary: 'Local only; no deployment.',
          evidence: ['AGENTS.md'],
        },
      ],
      features: Array.from({ length: 25 }, (_, i) => ({
        id: `search-${i}`,
        summary: `Search ${'evidence '.repeat(60)}${caveat}`,
        entryPoints: ['src/shared.ts'],
        evidence: ['audit.md'],
        checks: [
          { command: 'bun run test:search', reason: 'Check results', files: ['search.test.ts'] },
        ],
        broaderChecks: ['Full phase gate required.'],
      })),
    },
  };
  const brief = briefing(graph, 'search', { budget: 2200 });
  assert.ok(brief.length <= 2200, brief.length);
  assert.match(brief, /Local only; no deployment/);
  assert.match(brief, /Required phase gates still apply/);
  assert.match(brief, /bun run test:search/);
  assert.match(brief, /src\/shared.ts/);
  assert.equal(brief.split('- src/shared.ts').length - 1, 1);
  assert.doesNotMatch(brief, /history history/);
  assert.match(brief, /Counts show omissions/);
  const detail = briefing(graph, 'search', { detail: true, budget: 50000, limit: 40 });
  assert.match(detail, /Recovered stages only; never an uninterrupted gate exit 0/);
  assert.match(detail, /Features \(25\/25\)/);
  graph.knowledge.facts[0].summary = 'Required constraint. '.repeat(400);
  const overflow = briefing(graph, 'search', { budget: 1000 });
  assert.ok(overflow.includes(graph.knowledge.facts[0].summary));
  assert.match(overflow, /exceed the requested budget/);
});

test('partial matches are labelled and global evidence does not pollute related tests', async () => {
  const { briefing } = await import('./code-graph-knowledge.mjs');
  const graph = {
    activePhase: '1',
    evidenceHashes: {},
    nodes: [],
    edges: [
      { from: 'file:unrelated.test.ts', relation: 'tests', to: 'file:global.ts' },
      { from: 'file:search.test.ts', relation: 'tests', to: 'file:search.ts' },
    ],
    knowledge: {
      phases: [{ id: '1', status: 'planned' }],
      facts: [{ id: 'global', global: true, summary: 'Global rule', evidence: ['global.ts'] }],
      features: [
        {
          id: 'search-feature',
          summary: 'Search workflow',
          entryPoints: ['search.ts'],
          evidence: ['audit.md'],
        },
      ],
    },
  };
  const brief = briefing(graph, 'search workflow improvement');
  assert.match(brief, /Partial matches only/);
  assert.match(brief, /search.test.ts/);
  assert.doesNotMatch(brief, /unrelated.test.ts/);
  const changed = briefing(graph, undefined, { changed: ['search.ts'], affected: [] });
  assert.match(changed, /search-feature/);
  assert.match(changed, /Changed indexed paths: 1/);
  assert.match(briefing(graph, undefined, { changed: [] }), /No curated match/);
  graph.nodes = [{ id: 'file:search.ts', name: 'search.ts', path: 'search.ts' }];
  graph.knowledge.features = [];
  assert.match(briefing(graph, 'search.ts'), /search.test.ts/);
});

test('changed brief prioritizes implementation over shared evidence and combines check reasons', async () => {
  const { briefing } = await import('./code-graph-knowledge.mjs');
  const graph = {
    activePhase: '1',
    evidenceHashes: {},
    nodes: [],
    edges: [],
    knowledge: {
      phases: [],
      facts: [],
      features: [
        {
          id: 'a-broad',
          summary: 'Historical scope',
          evidence: ['shared.md'],
          checks: [
            { command: 'bun run test:graph', reason: 'Historical caveat', files: ['old.test.ts'] },
          ],
        },
        {
          id: 'z-implementation',
          summary: 'Implementation scope',
          evidence: ['shared.md'],
          entryPoints: ['impl.ts'],
          checks: [
            { command: 'bun run test:graph', reason: 'Current scope', files: ['impl.test.ts'] },
          ],
        },
      ],
    },
  };
  const brief = briefing(graph, undefined, { changed: ['shared.md', 'impl.ts'], detail: true });
  assert.ok(brief.indexOf('z-implementation:') < brief.indexOf('a-broad:'));
  assert.equal(brief.split('- bun run test:graph').length - 1, 1);
  assert.match(brief, /Current scope \/ Historical caveat/);
});

test('changed paths handle staged/unstaged, deletion, rename, copy and spaces', async () => {
  const { changedPaths } = await import('./code-graph-knowledge.mjs');
  assert.deepEqual(
    changedPaths(
      ' M src/a.ts\0M  src/b.ts\0 D src/deleted.ts\0R  src/new name.ts\0src/old name.ts\0C  src/copy.ts\0src/a.ts\0?? src/fresh.ts\0',
    ),
    [
      'src/a.ts',
      'src/b.ts',
      'src/deleted.ts',
      'src/new name.ts',
      'src/old name.ts',
      'src/copy.ts',
      'src/fresh.ts',
    ],
  );
});
