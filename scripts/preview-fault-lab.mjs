// Local standalone design server. It does not boot the simulator or any Worker/API.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.FAULT_DESIGN_PORT ?? 8765);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error('Invalid local design port.');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
};
const server = createServer((request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end();
    return;
  }
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }
  if (pathname.split('/').some((segment) => segment === '.' || segment === '..')) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (pathname === '/') {
    response.writeHead(302, { Location: '/docs/design/fault-lab/index.html' }).end();
    return;
  }
  const allowed =
    pathname.startsWith('/docs/design/fault-lab/') ||
    pathname.startsWith('/docs/design/open-drafting-table/') ||
    pathname.startsWith('/src/assets/images/') ||
    pathname === '/node_modules/matter-js/build/matter.min.js' ||
    pathname === '/docs/plans/FAULT_LAB_REDESIGN_PLAN.md' ||
    pathname === '/docs/handoffs/fault-lab-next-chat.md' ||
    pathname === '/README.md';
  const path = resolve(root, `.${pathname}`);
  if (
    !allowed ||
    !path.startsWith(`${resolve(root)}${sep}`) ||
    !existsSync(path) ||
    !statSync(path).isFile() ||
    !types[extname(path)]
  ) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(200, {
    'Content-Type': types[extname(path)],
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(path).pipe(response);
});
server.listen(port, '127.0.0.1', () =>
  console.log(`Fault Lab design: http://127.0.0.1:${port}/docs/design/fault-lab/index.html`),
);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => server.close(() => process.exit(0)));
