import path from 'node:path';
import ts from 'typescript';

export const dependencyRelations = new Set(['imports', 'calls-into', 'tests', 'configured-by']);

/** Only dependency edges affect impact. Phase and declaration hubs must not fan out. */
export function impact(graph, file, { depth = 2, limit = 40, direction = 'dependents' } = {}) {
  const id = `file:${file}`;
  if (!graph.nodes.some((n) => n.id === id)) throw new Error(`Unknown file: ${file}`);
  const adjacency = new Map();
  for (const edge of graph.edges) {
    if (!dependencyRelations.has(edge.relation)) continue;
    const from = direction === 'dependencies' ? edge.from : edge.to;
    const to = direction === 'dependencies' ? edge.to : edge.from;
    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push({ to, relation: edge.relation });
  }
  const seen = new Set([id]);
  const results = [];
  let frontier = [id];
  for (let level = 1; level <= depth && frontier.length; level++) {
    const next = [];
    for (const source of frontier) {
      for (const edge of adjacency.get(source) ?? []) {
        if (seen.has(edge.to)) continue;
        seen.add(edge.to);
        next.push(edge.to);
        results.push({
          path: edge.to.replace(/^file:/, ''),
          depth: level,
          relation: edge.relation,
        });
      }
    }
    frontier = next;
  }
  return { results: results.slice(0, limit), total: results.length };
}

/** AST parsing records actual static/re-export/lazy imports, not examples inside comments. */
export function parseSource(file, text) {
  const imports = new Set();
  const symbols = [];
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.add(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    )
      imports.add(node.arguments[0].text);
    if (
      (ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        ts.isInterfaceDeclaration(node) ||
        ts.isTypeAliasDeclaration(node) ||
        ts.isEnumDeclaration(node)) &&
      node.name
    ) {
      symbols.push({
        name: node.name.text,
        kind: ts.SyntaxKind[node.kind].replace('Declaration', '').toLowerCase(),
        line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1,
      });
    } else if (ts.isVariableStatement(node) && ts.isSourceFile(node.parent)) {
      for (const declaration of node.declarationList.declarations)
        if (ts.isIdentifier(declaration.name))
          symbols.push({
            name: declaration.name.text,
            kind: 'variable',
            line: source.getLineAndCharacterOfPosition(declaration.getStart(source)).line + 1,
          });
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { imports: [...imports], symbols };
}

export function resolveImport(root, file, specifier, files, options) {
  const resolved = ts.resolveModuleName(
    specifier,
    path.join(root, file),
    options,
    ts.sys,
  ).resolvedModule;
  if (resolved) {
    const relative = path.relative(
      root,
      ts.sys.realpath?.(resolved.resolvedFileName) ?? resolved.resolvedFileName,
    );
    if (files.has(relative)) return relative;
  }
  if (!specifier.startsWith('.')) return null;
  const base = path.normalize(path.join(path.dirname(file), specifier));
  return (
    [
      base,
      ...['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '/index.ts', '/index.tsx'].map(
        (ext) => base + ext,
      ),
    ].find((candidate) => files.has(candidate)) ?? null
  );
}
