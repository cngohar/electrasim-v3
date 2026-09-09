import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT || 8788);
const host = '127.0.0.1';

/**
 * `_redirects` and `_headers` support.
 *
 * This server is the stand-in for the Cloudflare Pages runtime in
 * `e2e:production`. Without these tables it could not answer for moved or
 * retired routes, or apply the same per-route CSP as production, so local
 * checks could mistake a routing or security difference for a broken page.
 *
 * Supports what Pages actually needs for this project: exact paths, and one `*`
 * wildcard whose match is substituted for `:splat` in the destination. Rules are
 * evaluated in file order, first match wins, and — as on Pages — before static
 * assets, which is what lets `/blog/index.html` redirect even though the file
 * exists.
 */
function parseRedirects(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status] = line.split(/\s+/);
      if (!from || !to) return null;
      return { from, to, status: Number(status) || 302 };
    })
    .filter(Boolean);
}

const redirectsFile = join(dist, '_redirects');
const REDIRECTS = existsSync(redirectsFile)
  ? parseRedirects(readFileSync(redirectsFile, 'utf8'))
  : [];

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

const headersFile = join(dist, '_headers');
const HEADER_RULES = existsSync(headersFile)
  ? parseHeaderRules(readFileSync(headersFile, 'utf8'))
  : [];

function headerPatternMatches(pattern, pathname) {
  if (pattern === pathname) return true;
  const star = pattern.indexOf('*');
  if (star === -1) return false;

  const prefix = pattern.slice(0, star);
  const suffix = pattern.slice(star + 1);
  return pathname.startsWith(prefix) && pathname.endsWith(suffix);
}

function cspForPath(pathname) {
  let policy;
  for (const rule of HEADER_RULES) {
    if (!headerPatternMatches(rule.pattern, pathname)) continue;
    const nextPolicy = rule.headers['Content-Security-Policy'];
    if (nextPolicy) policy = nextPolicy;
  }
  return policy;
}

function matchRedirect(pathname) {
  for (const rule of REDIRECTS) {
    if (rule.from === pathname) return { location: rule.to, status: rule.status };

    const star = rule.from.indexOf('*');
    if (star === -1) continue;

    const prefix = rule.from.slice(0, star);
    const suffix = rule.from.slice(star + 1);
    if (!pathname.startsWith(prefix) || !pathname.endsWith(suffix)) continue;
    if (pathname.length < prefix.length + suffix.length) continue;

    const splat = pathname.slice(prefix.length, pathname.length - suffix.length);
    return { location: rule.to.replace(':splat', splat), status: rule.status };
  }
  return null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
};

const server = createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${host}:${port}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // Canonical redirect for /path/index.html -> /path/
  if (pathname.endsWith('/index.html') && pathname !== '/index.html') {
    const redirectUrl = pathname.slice(0, -'index.html'.length);
    res.writeHead(301, {
      Location: redirectUrl,
      'Cache-Control': 'public, max-age=3600',
    });
    res.end();
    return;
  }

  // Everything else in dist/_redirects (moved or retired routes).
  const redirect = matchRedirect(pathname);
  if (redirect) {
    res.writeHead(redirect.status, {
      Location: redirect.location,
      'Cache-Control': 'public, max-age=3600',
    });
    res.end();
    return;
  }

  // Normalize path to dist
  let filePath = join(dist, pathname.replace(/^\/+/, ''));

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  } else if (!existsSync(filePath) && existsSync(`${filePath}.html`)) {
    filePath = `${filePath}.html`;
  } else if (!existsSync(filePath) && existsSync(join(filePath, 'index.html'))) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
    // 404 handler
    const notFoundPath = join(dist, '404.html');
    if (existsSync(notFoundPath)) {
      res.writeHead(404, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=0, must-revalidate, no-transform',
        'X-Content-Type-Options': 'nosniff',
        ...(cspForPath('/404.html') ? { 'Content-Security-Policy': cspForPath('/404.html') } : {}),
      });
      createReadStream(notFoundPath).pipe(res);
      return;
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  let cacheControl = 'public, max-age=0, must-revalidate, no-transform';
  if (
    pathname.includes('/assets/') ||
    pathname.startsWith('/_astro/') ||
    pathname.includes('/workbox-')
  ) {
    cacheControl = 'public, max-age=31536000, immutable';
  } else if (pathname.endsWith('sw.js') || pathname.startsWith('/admin')) {
    cacheControl = 'no-cache, no-store, must-revalidate';
  } else if (pathname.startsWith('/images/')) {
    cacheControl = 'public, max-age=86400, stale-while-revalidate=604800';
  } else if (pathname.startsWith('/js/')) {
    cacheControl = 'public, max-age=3600, must-revalidate';
  }

  const headers = {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Cache-Control': cacheControl,
  };

  const csp = ext === '.html' ? cspForPath(pathname) : undefined;
  if (csp) headers['Content-Security-Policy'] = csp;

  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`[preview] Preview server running at http://${host}:${port}/ (serving ${dist})`);
});
