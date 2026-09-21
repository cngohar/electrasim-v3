import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:4321/compare/', { waitUntil: 'networkidle' });

const step = async (label, fn) => {
  const result = await fn();
  console.log(`${label}: ${JSON.stringify(result)}`);
  return result;
};

// 1. Hover a row → profile swaps
await step('hover-circuitlab', async () => {
  await page.hover('[data-tool-id="circuitlab"]');
  await page.waitForTimeout(100);
  return page.evaluate(() => {
    const vis = [...document.querySelectorAll('[data-profile-for]')].filter(
      (p) => getComputedStyle(p).display !== 'none',
    );
    return { visibleProfiles: vis.map((p) => p.dataset.profileFor), radar: document.querySelector('#cb-radar-name').textContent };
  });
});

// 2. Filter wiring → status + visible rows
await step('filter-wiring', async () => {
  await page.click('[data-compare-filter="wiring"]');
  return page.evaluate(() => ({
    status: document.querySelector('#cb-matrix-status').textContent,
    visible: [...document.querySelectorAll('[data-tool-id]')].filter((r) => !r.classList.contains('is-hidden')).map((r) => r.dataset.toolId),
  }));
});

// 3. Filter pinned (none pinned yet)
await step('filter-pinned-empty', async () => {
  await page.click('[data-compare-filter="pinned"]');
  return page.evaluate(() => ({
    status: document.querySelector('#cb-matrix-status').textContent,
    visible: [...document.querySelectorAll('[data-tool-id]')].filter((r) => !r.classList.contains('is-hidden')).map((r) => r.dataset.toolId),
  }));
});

// 4. Back to all, pin one, then pinned filter
await step('pin-circuitlab', async () => {
  await page.click('[data-compare-filter="all"]');
  await page.click('[data-pin-tool="circuitlab"]');
  await page.click('[data-compare-filter="pinned"]');
  return page.evaluate(() => ({
    status: document.querySelector('#cb-matrix-status').textContent,
    visible: [...document.querySelectorAll('[data-tool-id]')].filter((r) => !r.classList.contains('is-hidden')).map((r) => r.dataset.toolId),
  }));
});

// 5. Sort by analysis
await step('sort-analysis', async () => {
  await page.click('[data-compare-filter="all"]');
  await page.selectOption('[data-compare-sort]', 'analysis');
  return page.evaluate(() =>
    [...document.querySelectorAll('#cb-tool-rows [data-tool-id]')].map((r) => r.dataset.toolId),
  );
});

// 6. Click bar → radar name
await step('click-bar-falstad', async () => {
  await page.click('[data-bar-tool="falstad"]');
  return page.evaluate(() => ({
    radar: document.querySelector('#cb-radar-name').textContent,
    points: document.querySelector('#cb-radar-area').getAttribute('points'),
  }));
});

// 7. Source jump opens details
await step('source-jump', async () => {
  await page.click('[data-source-jump="falstad"]');
  return page.evaluate(() => document.querySelector('[data-source-entry="falstad"]').open);
});

// 8. Mobile overflow check
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
const mobileErrors = [];
mobile.on('pageerror', (err) => mobileErrors.push(String(err)));
await mobile.goto('http://localhost:4321/compare/', { waitUntil: 'networkidle' });
const overflow = await mobile.evaluate(() => ({
  scrollW: document.documentElement.scrollWidth,
  clientW: document.documentElement.clientWidth,
  h1: document.querySelector('h1')?.textContent.slice(0, 60),
}));
console.log('mobile-overflow:', JSON.stringify(overflow));
console.log('mobile-errors:', mobileErrors.length ? mobileErrors : 'none');

console.log('DESKTOP PAGE ERRORS:', errors.length ? errors : 'none');

await browser.close();
