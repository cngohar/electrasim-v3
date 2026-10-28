/** Built Worker+Assets checks, not a static-shell proxy. localhost only. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
export default async function check() {
  const origin = 'http://127.0.0.1:8797';
  const editor = readFileSync('dist/app/index.html', 'utf8');
  const editorScripts = [...editor.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  for (const path of ['/settings/profile/', '/settings/publications/', '/admin/community/']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
    assert.match(response.headers.get('content-security-policy') ?? '', /script-src 'self'/);
    const html = await response.text();
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
    assert(scripts.length);
    for (const src of scripts) {
      assert(!editorScripts.includes(src));
      const asset = await fetch(new URL(src, origin));
      assert.equal(asset.status, 200, src);
      assert.match(asset.headers.get('content-type') ?? '', /javascript/);
    }
  }
  for (const path of [
    '/community/profile.css',
    '/community/profile.js',
    '/community/publications.js',
  ])
    assert.equal((await fetch(origin + path)).status, 200, path);
  for (const path of [
    '/u/no_such_profile',
    '/settings/unimplemented/',
    '/admin/community/unimplemented/',
  ])
    assert.equal((await fetch(origin + path)).status, 404, path);
  const js = gzipSync(readFileSync('dist/community/profile.js')).byteLength;
  const css = gzipSync(readFileSync('dist/community/profile.css')).byteLength;
  assert(js < 15000, 'Public profile enhancement JS must stay below 15 kB gzip');
  assert(css < 10000, 'Profile styles must stay below 10 kB gzip');
  console.log(`Public profile assets: ${js} B JS gzip / ${css} B CSS gzip.`);
  console.log(
    'Profile built assets passed: owner/admin entries and shared CSS/JS resolve; privacy/CSP headers and unknown routes checked.',
  );
}
if (import.meta.main) await check();
