/** Run while the built browser Worker is listening. Anonymous localhost reads only. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { localTestUrl } from './local-test-url.ts';

export default async function checkPlatformAssets() {
  const origin = localTestUrl(
    process.env.PLATFORM_ASSET_TEST_ORIGIN,
    'http://127.0.0.1:8793',
    'PLATFORM_ASSET_TEST_ORIGIN',
  );
  const scripts = (html) =>
    [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["']/gi)].map((match) => match[1]);
  const editor = new Set(scripts(readFileSync('dist/app/index.html', 'utf8')));
  const checked = new Set();
  const paths = [
    '/admin/',
    '/admin/users/',
    '/admin/permissions/',
    '/admin/settings/',
    '/admin/audit/',
    '/admin/standards/',
    '/admin/pro/',
    '/admin/components/',
  ];
  for (const path of paths) {
    const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('cache-control') ?? '', /private/);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    assert.match(response.headers.get('x-robots-tag') ?? '', /noindex/);
    const csp = response.headers.get('content-security-policy') ?? '';
    assert.match(csp, /script-src 'self'/);
    assert.doesNotMatch(csp, /unsafe-|https?:/);
    const html = await response.text();
    assert.match(html, /<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i);
    for (const src of scripts(html)) {
      const url = new URL(src, origin);
      assert.equal(url.origin, origin, 'Admin scripts must stay same-origin');
      assert(!editor.has(src), `${path} must have its own entry, separate from the editor`);
      if (!checked.has(url.href)) {
        const asset = await fetch(url);
        assert.equal(asset.status, 200, src);
        assert.match(asset.headers.get('content-type') ?? '', /javascript/);
        checked.add(url.href);
      }
    }
    assert(scripts(html).length > 0, path);
    console.log(
      `PASS ${path}: private/no-store, noindex, strict CSP and separate built script entry`,
    );
  }
  assert.equal((await fetch(`${origin}/admin/unimplemented/`, { redirect: 'manual' })).status, 404);
  console.log(
    `Built admin assets passed: ${paths.length} pages, ${checked.size} scripts and unknown-route 404.`,
  );
}

if (import.meta.main) await checkPlatformAssets();
