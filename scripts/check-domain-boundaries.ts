/** Keep the electrical domain independent of UI, storage and access policy. */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve('packages/domain/src');
let count = 0;
function scan(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      scan(file);
      continue;
    }
    if (!file.endsWith('.ts') || /\.(test|spec)\.ts$/.test(file)) continue;
    count++;
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const check = (literal: ts.Node | undefined) => {
      if (!literal || !ts.isStringLiteralLike(literal)) return;
      const spec = literal.text;
      const target = relative(root, resolve(dirname(file), spec));
      if (!spec.startsWith('.') || target === '..' || target.startsWith('../')) {
        throw new Error(`${relative(root, file)} imports outside the domain: ${spec}`);
      }
    };
    const visit = (node: ts.Node) => {
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) check(node.moduleSpecifier);
      if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
        check(node.arguments[0]);
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument))
        check(node.argument.literal);
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
}
scan(root);
console.log(`Domain boundary passed: ${count} modules, no external runtime imports.`);
