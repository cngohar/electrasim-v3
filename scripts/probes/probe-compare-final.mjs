import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:4321/compare/', { waitUntil: 'networkidle' });

// Keyboard navigation: focus a row, Enter selects
const kb = await page.evaluate(() => {
  const row = document.querySelector('[data-tool-id="falstad"]');
  row.focus();
  const e = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true });
  row.dispatchEvent(e);
  return { focused: document.activeElement?.dataset?.toolId ?? null };
});
console.log('kb-select:', JSON.stringify(kb));

const radarAfterKb = await page.evaluate(() => ({
  radar: document.querySelector('#cb-radar-name').textContent,
  visibleProfile: [...document.querySelectorAll('[data-profile-for]')].filter((p) => getComputedStyle(p).display !== 'none').map((p) => p.dataset.profileFor),
}));
console.log('radar-after-kb:', JSON.stringify(radarAfterKb));

// Pin visibility on sorted rows: sort by fit, verify order matches fit scores
const sorted = await page.evaluate(() => {
  const select = document.querySelector('[data-compare-sort]');
  select.value = 'fit';
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return [...document.querySelectorAll('#cb-tool-rows [data-tool-id]')].map((r) => ({
    id: r.dataset.toolId,
    fit: r.dataset.fitScore,
  }));
});
console.log('sorted-by-fit:', JSON.stringify(sorted));

// Source section jumps: select the tool first, then its source-jump is visible
await page.click('[data-bar-tool="mechsimulator"]');
await page.waitForTimeout(200);
await page.click('[data-source-jump="mechsimulator"]');
const sourceOpen = await page.evaluate(() => document.querySelector('[data-source-entry="mechsimulator"]').open);
console.log('source-open:', sourceOpen);

// Full-page screenshot for visual check
await page.screenshot({ path: 'compare-bench-full.png', fullPage: false });

console.log('PAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
