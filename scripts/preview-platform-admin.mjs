// Standalone local design preview. No Worker, database, auth or remote services.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../', import.meta.url));
const root = resolve(repo, 'docs/design/platform-admin');
const fonts = resolve(repo, 'astro-site/public/fonts');
const port = Number(process.env.ADMIN_DESIGN_PORT ?? 8794);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid local design port');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.md': 'text/plain; charset=utf-8',
};
const server = createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400).end();
    return;
  }
  let path;
  if (pathname.startsWith('/fonts/')) {
    if (
      !['plus-jakarta-sans-latin.woff2', 'space-grotesk-latin.woff2'].includes(pathname.slice(7))
    ) {
      res.writeHead(404).end();
      return;
    }
    path = resolve(fonts, pathname.slice(7));
  } else if (pathname === '/favicon.svg') path = resolve(repo, 'astro-site/public/favicon.svg');
  else {
    path = resolve(root, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!path.startsWith(`${root}${sep}`)) {
      res.writeHead(404).end();
      return;
    }
  }
  if (!existsSync(path) || !statSync(path).isFile() || !types[extname(path)]) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, {
    'Content-Type': types[extname(path)],
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'none'; form-action 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  });
  if (req.method === 'HEAD') res.end();
  else createReadStream(path).pipe(res);
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Admin design preview: http://127.0.0.1:${port}/`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
