/** Run after starting the isolated Wrangler fixture with --local. */
import { domainParityFixture } from './domain-parity-fixture';
import { localTestUrl } from './local-test-url';
const url = localTestUrl(process.argv[2], 'http://127.0.0.1:8792', 'domain parity Worker');
const response = await fetch(url);
if (!response.ok) throw new Error(`Local Worker returned ${response.status}`);
const actual = await response.text();
const expected = domainParityFixture();
if (actual !== expected) throw new Error('Bun / workerd domain output differs');
console.log(
  `Local Hono Worker parity passed for ${JSON.parse(actual).length} simulation/compiler cases.`,
);
