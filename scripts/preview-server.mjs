import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(__dirname, '..');
const dist = join(root, 'dist');
const port = Number(process.env.PORT || 8788);
const host = '127.0.0.1';

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
        'Content-Security-Policy':
          "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data: https:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
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

  if (ext === '.html') {
    if (pathname.startsWith('/app/')) {
      headers['Content-Security-Policy'] =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";
    } else {
      headers['Content-Security-Policy'] =
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: https:; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
    }
  }

  res.writeHead(200, headers);
  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`⚡ Preview server running at http://${host}:${port}/ (serving ${dist})`);
});
