import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

// 1. Load home, verify hero canvas + nav
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });
const homeCanvas = await page.evaluate(() => {
  const c = document.getElementById('circuit-canvas');
  return { exists: !!c, w: c?.width, h: c?.height };
});
console.log('home-canvas:', JSON.stringify(homeCanvas));

// 2. Soft-navigate to a blog post via an internal link (view transition)
await page.click('a[href^="/blog/"]:not([href^="/blog/tags"])');
await page.waitForTimeout(800);
const afterNav = await page.evaluate(() => ({
  path: location.pathname,
  tocExists: !!document.querySelector('.art-toc'),
  anchors: document.querySelectorAll('.h-anchor').length,
}));
console.log('after-soft-nav:', JSON.stringify(afterNav));

// 3. Burger menu works after swap
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(300);
const burger = await page.evaluate(() => {
  const btn = document.getElementById('nav-toggle');
  if (!btn) return { ok: false };
  btn.click();
  const menu = document.getElementById('nav-mobile-menu');
  return { ok: true, menuOpen: menu?.classList.contains('open') ?? false };
});
console.log('burger-after-nav:', JSON.stringify(burger));

// 4. Theme toggle after nav (delegated listener)
const theme = await page.evaluate(() => {
  const toggle = document.querySelector('[data-theme-toggle]');
  if (!toggle) return { ok: false };
  const before = document.documentElement.getAttribute('data-theme');
  toggle.click();
  const after = document.documentElement.getAttribute('data-theme');
  toggle.click();
  return { ok: true, before, after };
});
console.log('theme-toggle:', JSON.stringify(theme));

// 5. Search modal opens after nav
await page.evaluate(() => {
  document.querySelector('[data-search-trigger]')?.click();
});
await page.waitForTimeout(300);
const searchOpen = await page.evaluate(() => {
  const d = document.getElementById('site-search-dialog');
  return { open: !!d?.open };
});
console.log('search-open:', JSON.stringify(searchOpen));

// 6. Navigate back to home via soft nav (back button triggers swap)
await page.goBack();
await page.waitForTimeout(800);
const backHome = await page.evaluate(() => ({
  path: location.pathname,
  canvas: document.getElementById('circuit-canvas')?.width ?? null,
}));
console.log('back-home:', JSON.stringify(backHome));

// 7. Hero canvas resized correctly after returning
console.log('PAGE ERRORS:', errors.length ? errors : 'none');

await browser.close();
