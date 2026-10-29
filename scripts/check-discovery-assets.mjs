import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
export default async function check() {
  const css = 'dist/community/discovery.css';
  assert(existsSync(css), `${css} missing from built Assets`);
  const source = readFileSync(css, 'utf8');
  assert.match(source, /\.feed-layout/);
  assert.match(source, /\.clear-filters|\.filter-actions/);
  assert(!source.includes('/app/assets/'));
  const config = readFileSync('wrangler.profiles-browser-test.jsonc', 'utf8');
  assert.match(config, /"\/c\/\*"/);
  const response = await fetch('http://127.0.0.1:8797/community/discovery.css');
  assert.equal(response.status, 200);
  assert.equal(await response.text(), source);
  console.log('Discovery built CSS and Worker-first route present');
}
if (import.meta.main) await check();
