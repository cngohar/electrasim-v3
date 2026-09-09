#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, process.argv[2] ?? 'dist');
const sourceHeadersPath = join(projectRoot, 'public/_headers');
const builtHeadersPath = join(outputRoot, '_headers');
const failures = [];

if (!existsSync(outputRoot)) {
  console.error(`CSP check failed: ${relative(projectRoot, outputRoot)} does not exist.`);
  console.error('Run the production build before checking CSP consistency.');
  process.exit(1);
}

if (!existsSync(sourceHeadersPath) || !existsSync(builtHeadersPath)) {
  console.error('CSP check failed: public/_headers or dist/_headers is missing.');
  process.exit(1);
}

const sourceHeaders = readFileSync(sourceHeadersPath, 'utf8');
const builtHeaders = readFileSync(builtHeadersPath, 'utf8');
if (sourceHeaders !== builtHeaders) {
  failures.push('dist/_headers differs from the source public/_headers file');
}

function parseHeaderRules(text) {
  const rules = [];
  let current = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (!/^\s/.test(rawLine)) {
      current = { pattern: line, headers: {} };
      rules.push(current);
      continue;
    }

    const separator = line.indexOf(':');
    if (!current || separator === -1) continue;
    current.headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return rules;
}

function patternMatches(pattern, pathname) {
  if (pattern === pathname) return true;
  const star = pattern.indexOf('*');
  if (star === -1) return false;

  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  return pathname.startsWith(prefix) && pathname.endsWith(suffix);
}

const rules = parseHeaderRules(sourceHeaders);
function cspFor(pathname) {
  let policy;
  for (const rule of rules) {
    if (!patternMatches(rule.pattern, pathname)) continue;
    const nextPolicy = rule.headers['Content-Security-Policy'];
    if (nextPolicy) policy = nextPolicy;
  }
  return policy;
}

const strictCsp = cspFor('/guide/');
if (!strictCsp || !strictCsp.includes("style-src 'self'") || strictCsp.includes('unsafe-inline')) {
  failures.push('the guide CSP is not strict');
}

for (const pathname of [
  '/',
  '/about/',
  '/blog/',
  '/contact/',
  '/guide/',
  '/privacy/',
  '/terms/',
  '/explore/',
  '/updates/',
  '/404.html',
]) {
  if (cspFor(pathname) !== strictCsp) {
    failures.push(`${pathname}: CSP differs from the strict content-page policy`);
  }
}

function listHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(entryPath);
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

function pageUrl(filePath) {
  const outputPath = relative(outputRoot, filePath).split('\\').join('/');
  return `/${outputPath.replace(/index\.html$/, '')}`;
}

for (const filePath of listHtmlFiles(outputRoot)) {
  const source = pageUrl(filePath);
  if (!source.startsWith('/guide/') && !source.startsWith('/glossary/')) continue;

  const html = readFileSync(filePath, 'utf8');
  if (/<style\b/i.test(html)) failures.push(`${source}: inline <style> element`);
  if (/\bstyle\s*=\s*["']/.test(html)) failures.push(`${source}: inline style attribute`);

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const attributes = match[1] ?? '';
    if (/\bsrc\s*=/.test(attributes)) continue;
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(attributes)) continue;
    if ((match[2] ?? '').trim()) failures.push(`${source}: executable inline script`);
  }
}

const notFoundHtml = readFileSync(join(outputRoot, '404.html'), 'utf8');
const metaCsp = notFoundHtml.match(
  /<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]*)"/i,
)?.[1];
if (metaCsp !== strictCsp) {
  failures.push('404 page meta CSP differs from its _headers policy');
}

if (failures.length > 0) {
  console.error(`CSP check failed with ${failures.length} problem(s):`);
  for (const failure of failures.slice(0, 40)) console.error(`  ${failure}`);
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more`);
  process.exit(1);
}

console.log(
  'CSP check passed: source and built headers match; guide output has no inline styles or executable scripts.',
);
