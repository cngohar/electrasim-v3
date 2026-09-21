import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:4321/blog/how-household-wiring-works/', { waitUntil: 'networkidle' });
const before = await page.evaluate(() => ({
  path: location.pathname,
  anchors: document.querySelectorAll('.h-anchor').length,
}));
console.log('before:', JSON.stringify(before));

// Soft-nav: click a link to another article (view transition swap)
const clicked = '/blog/series-vs-parallel-circuits/';
console.log('soft-nav-to:', clicked);
await page.click(`a[href="${clicked}"]`);
await page.waitForTimeout(1200);

const after = await page.evaluate(() => ({
  path: location.pathname,
  toc: !!document.querySelector('.art-toc'),
  anchors: document.querySelectorAll('.h-anchor').length,
  duplicated: document.querySelectorAll('.h-anchor .h-anchor').length,
}));
console.log('after-soft-nav:', JSON.stringify(after));

// Back via view transition
await page.goBack();
await page.waitForTimeout(1200);
const backHome = await page.evaluate(() => ({
  path: location.pathname,
  anchors: document.querySelectorAll('.h-anchor').length,
  duplicated: document.querySelectorAll('.h-anchor .h-anchor').length,
}));
console.log('after-back:', JSON.stringify(backHome));

console.log('PAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
