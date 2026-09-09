import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(projectRoot, process.argv[2] ?? 'dist');
const siteOrigin = 'https://electrasim.com';

if (!existsSync(outputRoot)) {
  console.error(`Internal-link check failed: ${relative(projectRoot, outputRoot)} does not exist.`);
  console.error('Run the production build before checking links.');
  process.exit(1);
}

function listHtmlFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listHtmlFiles(entryPath);
    return entry.name.endsWith('.html') ? [entryPath] : [];
  });
}

function outputPathExists(pathname) {
  const relativePath = pathname.replace(/^\/+/, '');
  const directPath = join(outputRoot, relativePath);

  if (pathname.endsWith('/')) return existsSync(join(directPath, 'index.html'));
  return existsSync(directPath) || existsSync(join(directPath, 'index.html'));
}

function pageUrl(filePath) {
  const outputPath = relative(outputRoot, filePath).split(sep).join('/');
  return `/${outputPath.replace(/index\.html$/, '')}`;
}

/**
 * Element ids present in a rendered page.
 *
 * Cached because the 190-page crawl checks thousands of links against a few
 * dozen targets. Without this check a `href="#letter-a"` pointing at nothing
 * passes: the file exists, so the link "works" — which is exactly how the
 * glossary A–Z strip shipped with 13 dead jump links.
 */
const idCache = new Map();
function pageIds(htmlPath) {
  const cached = idCache.get(htmlPath);
  if (cached) return cached;
  const ids = new Set();
  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, 'utf8');
    for (const match of html.matchAll(/\sid="([^"]+)"/g)) ids.add(match[1]);
  }
  idCache.set(htmlPath, ids);
  return ids;
}

/** The HTML file that serves an internal pathname, whether it resolves or not. */
function htmlFileFor(pathname) {
  const directPath = join(outputRoot, pathname.replace(/^\/+/, ''));
  if (pathname.endsWith('/')) return join(directPath, 'index.html');
  if (directPath.endsWith('.html')) return directPath;
  return existsSync(join(directPath, 'index.html'))
    ? join(directPath, 'index.html')
    : directPath;
}

const failures = [];
const htmlFiles = listHtmlFiles(outputRoot);

for (const filePath of htmlFiles) {
  const html = readFileSync(filePath, 'utf8');
  const source = pageUrl(filePath);

  for (const match of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])([^"']+)\1/gi)) {
    const href = match[2].trim();
    if (!href || /^(?:data|javascript|mailto|tel):/i.test(href)) continue;

    // Same-page fragment: the target id must exist in this file.
    if (href.startsWith('#')) {
      const fragment = href.slice(1);
      if (fragment && !pageIds(filePath).has(fragment)) {
        failures.push({ source, href, target: `${source}#${fragment} (no such id)` });
      }
      continue;
    }

    let url;
    try {
      url = new URL(href, `${siteOrigin}${source}`);
    } catch {
      failures.push({ source, href, target: 'invalid URL' });
      continue;
    }

    if (url.origin !== siteOrigin) continue;

    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      failures.push({ source, href, target: 'invalid encoded path' });
      continue;
    }

    const targetFile = htmlFileFor(pathname);
    if (!existsSync(targetFile)) {
      failures.push({ source, href, target: url.pathname });
      continue;
    }

    // Cross-page fragment: the target page must carry the id.
    const fragment = url.hash ? decodeURIComponent(url.hash.slice(1)) : '';
    if (fragment && !pageIds(targetFile).has(fragment)) {
      failures.push({
        source,
        href,
        target: `${url.pathname || source}#${fragment} (no such id)`,
      });
    }
  }
}

if (failures.length > 0) {
  console.error(`Internal-link check failed with ${failures.length} broken link(s):`);
  for (const failure of failures) {
    console.error(`  ${failure.source} -> ${failure.href} (${failure.target})`);
  }
  process.exit(1);
}

console.log(`Internal-link check passed (${htmlFiles.length} HTML files).`);
