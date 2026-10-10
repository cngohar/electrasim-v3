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
        facts: [],
        relations: [{ from: 'src/a.ts', relation: 'configured-by', to: 'vite.config.ts' }],
      }),
    );
    await writeFile(path.join(fixture, 'src/a.ts'), 'export const original = 1;');
    await writeFile(path.join(fixture, 'vite.config.ts'), 'export default {};');
    await writeFile(path.join(fixture, '.env.local'), 'PRIVATE=do-not-index');
    await mkdir(path.join(fixture, 'admin/pro'), { recursive: true });
    await writeFile(path.join(fixture, 'admin/pro/index.html'), '<div>Admin entry</div>');
    const run = (...args) =>
      execFileSync(process.execPath, [script, ...args], {
        cwd: fixture,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    assert.match(run('phase'), /Phase 1.8: planned/);
    assert.match(run('status'), /Current graph/);
    assert.match(run('find', 'admin/pro/index.html'), /admin\/pro\/index.html/);
    assert.match(run('impact', 'vite.config.ts'), /configured-by\s+src\/a.ts/);
    await writeFile(path.join(fixture, 'src/a.ts'), 'export const replacementLonger = 2;');
    assert.match(run('status'), /STALE/);
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
