#!/usr/bin/env node
/**
 * check-seo.mjs — snippet-length gate for the built site.
 *
 * Google truncates a title at roughly 60 characters and a description at
 * roughly 155–160, and it truncates them itself, mid-word, wherever its pixel
 * budget runs out. Before this gate existed the guide shipped 128 of 188 pages
 * with descriptions over that limit — the worst were the component pages at
 * 415 characters, because their description template appended the entire
 * terminals list, so a search result for a cooker unit advertised a wall of
 * terminal names and never got to what the part was.
 *
 * `Base.astro` clamps copy as it renders, so this check is the backstop: it
 * reads what actually shipped rather than trusting the templates, and it also
 * catches missing snippets and duplicate descriptions across pages.
 *
 * Usage:  node scripts/check-seo.mjs [outputDir]
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, process.argv[2] ?? 'dist');

/** Google's truncation points. A little headroom keeps the tail intact. */
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;
/** Shorter than this and the snippet is not worth showing. */
const MIN_DESCRIPTION = 40;

if (!existsSync(outputRoot)) {
  console.error(`SEO check failed: ${relative(projectRoot, outputRoot)} does not exist.`);
  console.error('Run the production build before checking snippets.');
  process.exit(1);
}

function listHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(entryPath);
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

function pageUrl(filePath) {
  const outputPath = relative(outputRoot, filePath).split(sep).join('/');
  return `/${outputPath.replace(/index\.html$/, '')}`;
}

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
  '#039': "'",
  '#x27': "'",
};

/**
 * Decode the entities that appear in snippets.
 *
 * Counting the escaped form charges "&amp;" five characters for one, which
 * turned a 58-character title into a reported 64 — the length a crawler sees
 * is the rendered one, so that is what has to be measured.
 */
function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code) => {
    const key = code.toLowerCase();
    if (ENTITIES[key]) return ENTITIES[key];
    if (key.startsWith('#x')) return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
    if (key.startsWith('#')) return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
    return match;
  });
}

const htmlFiles = listHtmlFiles(outputRoot).filter((file) => {
  const url = pageUrl(file);
  // /app/* is the simulator shell, not indexed content, and /admin/ is the
  // Sveltia CMS shell — both are excluded from robots.txt, so neither has a
  // snippet for a crawler to truncate.
  return !url.startsWith('/app/') && !url.startsWith('/admin/');
});

const failures = [];
const descriptions = new Map();

for (const filePath of htmlFiles) {
  const html = readFileSync(filePath, 'utf8');
  const source = pageUrl(filePath);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = decodeEntities(titleMatch?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title) {
    failures.push(`${source}: missing <title>`);
  } else if (title.length > MAX_TITLE) {
    failures.push(`${source}: title is ${title.length} chars (max ${MAX_TITLE}) — "${title}"`);
  }

  const descMatch = html.match(/<meta\s+name="description"\s+content="([^"]*)"/i);
  const description = decodeEntities(descMatch?.[1] ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!description) {
    failures.push(`${source}: missing meta description`);
  } else if (description.length > MAX_DESCRIPTION) {
    failures.push(`${source}: description is ${description.length} chars (max ${MAX_DESCRIPTION})`);
  } else if (description.length < MIN_DESCRIPTION) {
    failures.push(
      `${source}: description is only ${description.length} chars (min ${MIN_DESCRIPTION})`,
    );
  } else {
    const seen = descriptions.get(description) ?? [];
    seen.push(source);
    descriptions.set(description, seen);
  }
}

for (const [description, sources] of descriptions) {
  if (sources.length > 1) {
    failures.push(
      `duplicate description shared by ${sources.length} pages (${sources.slice(0, 3).join(', ')}${sources.length > 3 ? '…' : ''})`,
    );
  }
}

if (failures.length > 0) {
  console.error(
    `SEO check failed with ${failures.length} problem(s) across ${htmlFiles.length} pages:`,
  );
  for (const failure of failures.slice(0, 40)) console.error(`  ${failure}`);
  if (failures.length > 40) console.error(`  …and ${failures.length - 40} more`);
  process.exit(1);
}

console.log(
  `SEO check passed (${htmlFiles.length} pages): titles ≤ ${MAX_TITLE}, descriptions ${MIN_DESCRIPTION}–${MAX_DESCRIPTION}, no duplicates.`,
);
