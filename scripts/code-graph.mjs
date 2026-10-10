import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';
import { impact, parseSource, resolveImport } from './code-graph-lib.mjs';

const root = process.cwd();
const outputDir = path.join(root, '.code-graph');
const outputFile = path.join(outputDir, 'index.json');
const sourceRoots = [
  'src',
  'packages',
  'scripts',
  'e2e',
  'astro-site/src',
  'docs',
  'migrations',
  'admin',
  'public',
];
const ignored = new Set(['node_modules', 'dist', '.wrangler', '.git', 'coverage']);
const codePattern = /\.(?:[cm]?[jt]sx?|astro|md|mdx|sql|json|jsonc|yaml|yml|css|html)$/;
const graphVersion = 3;
// Explicit build/runtime inputs, never arbitrary root files or environment secrets.
const rootInputs = new Set([
  'vite.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'playwright.production.config.ts',
  'wrangler.jsonc',
  'wrangler.membership-test.jsonc',
  'index.html',
]);
async function filesUnder(relative) {
  let entries;
  try {
    entries = await readdir(path.join(root, relative), { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
  const files = [];
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue;
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(child)));
    else if (
      entry.isFile() &&
      (codePattern.test(entry.name) || ['_headers', '_redirects'].includes(entry.name))
    )
      files.push(child);
  }
  return files;
}
async function readIndex() {
  try {
    return JSON.parse(await readFile(outputFile, 'utf8'));
  } catch {
    return null;
  }
}
function gitStatus() {
  return execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'], {
    cwd: root,
    encoding: 'utf8',
  });
}
async function inventory() {
  const files = [
    ...new Set([
      ...(await Promise.all(sourceRoots.map(filesUnder))).flat(),
      ...(await readdir(root)).filter((file) => rootInputs.has(file)),
      'PLAN.md',
      'progress.md',
      'AGENTS.md',
      'package.json',
      'tsconfig.json',
    ]),
  ].sort();
  const stamps = Object.fromEntries(
    await Promise.all(
      files.map(async (file) => {
        const details = await stat(path.join(root, file));
        return [file, `${details.mtimeMs}:${details.size}`];
      }),
    ),
  );
  return { files, stamps, signature: JSON.stringify([graphVersion, stamps, gitStatus()]) };
}
async function build(current, existing, semantic = false) {
  const knowledge = JSON.parse(await readFile(path.join(root, 'docs/code-graph.json'), 'utf8'));
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  const options = ts.parseJsonConfigFileContent(config.config, ts.sys, root).options;
  const files = new Set(current.files);
  const nodes = current.files.map((file) => ({
    id: `file:${file}`,
    kind: /\.mdx?$/.test(file) ? 'document' : 'file',
    name: path.basename(file),
    path: file,
  }));
  const edges = [];
  const parsed = {};
  let reparsed = 0;
  for (const file of current.files.filter((file) => /\.[cm]?[jt]sx?$/.test(file))) {
    parsed[file] =
      existing?.version === graphVersion && existing.stamps?.[file] === current.stamps[file]
        ? existing.parsed?.[file]
        : null;
    if (!parsed[file]) {
      parsed[file] = parseSource(file, await readFile(path.join(root, file), 'utf8'));
      reparsed++;
    }
    for (const symbol of parsed[file].symbols) {
      const id = `symbol:${file}:${symbol.name}:${symbol.line}`;
      nodes.push({ id, path: file, ...symbol });
      edges.push({ from: `file:${file}`, relation: 'declares', to: id });
    }
    for (const specifier of parsed[file].imports) {
      const target = resolveImport(root, file, specifier, files, options);
      if (target) edges.push({ from: `file:${file}`, relation: 'imports', to: `file:${target}` });
    }
    const implementation = file.replace(/\.(test|spec)(\.[cm]?[jt]sx?)$/, '$2');
    if (implementation !== file && files.has(implementation))
      edges.push({ from: `file:${file}`, relation: 'tests', to: `file:${implementation}` });
  }
  // Optional expensive compiler call resolution. Fast queries use incremental AST imports.
  if (semantic) {
    const program = ts.createProgram(
      Object.keys(parsed).map((file) => path.join(root, file)),
      options,
    );
    const checker = program.getTypeChecker();
    for (const file of Object.keys(parsed)) {
      const source = program.getSourceFile(path.join(root, file));
      const targets = new Set();
      const visit = (node) => {
        if (ts.isCallExpression(node)) {
          const target = checker.getResolvedSignature(node)?.declaration?.getSourceFile();
          if (target) {
            const relative = path.relative(root, target.fileName);
            if (files.has(relative) && relative !== file) targets.add(relative);
          }
        }
        ts.forEachChild(node, visit);
      };
      if (source) visit(source);
      for (const target of targets)
        edges.push({ from: `file:${file}`, relation: 'calls-into', to: `file:${target}` });
    }
  }
  for (const phase of knowledge.phases) {
    nodes.push({ id: `phase:${phase.id}`, kind: 'phase', name: phase.id, status: phase.status });
    for (const evidence of phase.evidence) {
      if (!files.has(evidence)) throw new Error(`Missing phase evidence: ${evidence}`);
      edges.push({ from: `file:${evidence}`, relation: 'describes', to: `phase:${phase.id}` });
    }
  }
  for (const fact of knowledge.facts) {
    nodes.push({
      id: `fact:${fact.id}`,
      kind: 'finding',
      name: fact.summary,
      path: 'docs/code-graph.json',
    });
    for (const evidence of fact.evidence) {
      if (!files.has(evidence)) throw new Error(`Missing finding evidence: ${evidence}`);
      edges.push({ from: `fact:${fact.id}`, relation: 'supported-by', to: `file:${evidence}` });
    }
  }
  for (const relation of knowledge.relations ?? []) {
    if (!files.has(relation.from) || !files.has(relation.to))
      throw new Error(`Invalid verified relation: ${JSON.stringify(relation)}`);
    edges.push({
      from: `file:${relation.from}`,
      relation: relation.relation,
      to: `file:${relation.to}`,
    });
  }
  if (!knowledge.phases.some((p) => p.id === knowledge.activePhase))
    throw new Error('Active phase must have an explicit phase record.');
  const graph = {
    version: graphVersion,
    inputSignature: current.signature,
    stamps: current.stamps,
    parsed,
    generatedAt: new Date().toISOString(),
    semantic,
    activePhase: knowledge.activePhase,
    nodes,
    edges,
  };
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, JSON.stringify(graph));
  console.error(
    `Graph refreshed: ${nodes.length} nodes, ${edges.length} edges; ${reparsed} source files parsed (${semantic ? 'semantic' : 'fast'}).`,
  );
  return graph;
}
function options(args) {
  const result = { depth: 2, limit: 40, direction: 'dependents', semantic: false };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === '--semantic') result.semantic = true;
    else if (flag === '--depth' || flag === '--limit') {
      const value = Number(args[++i]);
      if (!Number.isInteger(value) || value < 1 || value > (flag === '--depth' ? 10 : 500))
        throw new Error(`Invalid ${flag}`);
      result[flag.slice(2)] = value;
    } else if (flag === '--direction') {
      result.direction = args[++i];
      if (!['dependents', 'dependencies'].includes(result.direction))
        throw new Error('Direction must be dependents or dependencies');
    } else throw new Error(`Unknown option: ${flag}`);
  }
  return result;
}
try {
  const [command, ...args] = process.argv.slice(2);
  if (!['build', 'find', 'phase', 'impact', 'status'].includes(command))
    throw new Error(
      'Usage: graph build|status|find QUERY|phase [PHASE]|impact FILE [--depth 2 --limit 40 --direction dependents]; build --semantic enables compiler calls.',
    );
  const query = args[0] && !args[0].startsWith('--') ? args.shift() : undefined;
  const opts = options(args);
  const existing = await readIndex();
  const current = await inventory();
  const stale = existing?.inputSignature !== current.signature;
  if (command === 'status') {
    console.log(
      `${stale ? 'STALE' : 'Current'} graph; generated ${existing?.generatedAt ?? 'never'}; active phase ${existing?.activePhase ?? 'unknown'}.`,
    );
  } else {
    const graph =
      stale || (opts.semantic && !existing?.semantic)
        ? await build(current, existing, opts.semantic)
        : existing;
    if (command === 'build')
      console.log(
        `Graph current: ${graph.nodes.length} nodes, ${graph.edges.length} edges. Active phase: ${graph.activePhase}.`,
      );
    if (command === 'find') {
      if (!query) throw new Error('find requires a query');
      const matches = graph.nodes.filter((n) =>
        `${n.name} ${n.path ?? ''}`.toLowerCase().includes(query.toLowerCase()),
      );
      for (const n of matches.slice(0, opts.limit))
        console.log(`${n.kind}\t${n.path ?? n.id}${n.line ? `:${n.line}` : ''}\t${n.name}`);
      console.log(`${Math.min(opts.limit, matches.length)} of ${matches.length} matches.`);
    }
    if (command === 'phase') {
      const id = `phase:${query ?? graph.activePhase}`;
      const phase = graph.nodes.find((n) => n.id === id);
      if (!phase) throw new Error(`Unknown phase: ${query}`);
      console.log(`Phase ${phase.name}: ${phase.status}`);
      for (const edge of graph.edges.filter((e) => e.to === id).slice(0, opts.limit))
        console.log(edge.from.replace(/^file:/, ''));
    }
    if (command === 'impact') {
      if (!query) throw new Error('impact requires a repository-relative file');
      const result = impact(graph, query, opts);
      for (const r of result.results) console.log(`${r.depth}\t${r.relation}\t${r.path}`);
      console.log(
        `${result.results.length} of ${result.total} ${opts.direction} within depth ${opts.depth}. Import impact is guidance, not proof of complete runtime coverage.`,
      );
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
