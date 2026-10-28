/** Actual built Worker assets and entry isolation; localhost only. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import profiles from './check-profile-assets.mjs';
export default async function check() {
  await profiles();
  const origin = 'http://127.0.0.1:8797';
  const sizes = {};
  for (const name of ['detail.js', 'preview.js', 'detail.css']) {
    const path = `/community/${name}`;
    const response = await fetch(origin + path);
    assert.equal(response.status, 200, path);
    const source = readFileSync(`public${path}`);
    const built = readFileSync(`dist${path}`);
    assert(source.equals(built), `${path} built bytes must match reviewed source`);
    assert.equal(await response.text(), built.toString(), path);
    const size = gzipSync(built).byteLength;
    sizes[name] = size;
    assert(size < (name === 'detail.js' ? 5000 : 15000), `${path} exceeds its gzip limit`);
    if (name.endsWith('.js'))
      assert.doesNotMatch(
        built.toString(),
        /localStorage|indexedDB|\/api\/circuits|\/store\/|react-dom|CircuitCanvas|autosave/i,
      );
    assert.match(response.headers.get('cache-control') ?? '', /must-revalidate/);
  }
  for (const path of ['/c/unavailable', '/c/unavailable/thumbnail.svg', '/c/unavailable/extra']) {
    const response = await fetch(origin + path);
    assert.equal(response.status, 404, path);
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
  }
  const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));
  assert(config.assets.run_worker_first.includes('/c/*'));
  assert(readFileSync('vite.config.ts', 'utf8').includes('/^\\/c\\//'));
  console.log(
    `Public detail/preview assets (gzip B): ${JSON.stringify(sizes)}. Lazy island has no editor/persistence imports; actual Assets and unavailable routes passed.`,
  );
}
if (import.meta.main) await check();
