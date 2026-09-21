import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

// Direct article load
await page.goto('http://localhost:4321/blog/how-household-wiring-works/', { waitUntil: 'networkidle' });
const initial = await page.evaluate(() => ({
  toc: !!document.querySelector('.art-toc'),
  anchors: document.querySelectorAll('.h-anchor').length,
  tocLinks: document.querySelectorAll('a[data-toc-link]').length,
}));
console.log('article-load:', JSON.stringify(initial));

// Click a TOC link → anchor scroll works
await page.click('a[data-toc-link]');
await page.waitForTimeout(300);
const afterTocClick = await page.evaluate(() => ({
  hash: location.hash,
  focused: document.activeElement?.tagName,
}));
console.log('toc-click:', JSON.stringify(afterTocClick));

// Navigate article → article via a related-post link (soft nav)
const related = await page.evaluate(() => {
  const links = [...document.querySelectorAll('a[href^="/blog/"]')]
    .map((a) => a.getAttribute('href'))
    .filter((h) => h && h !== '/blog/' && !h.includes('tags') && h !== location.pathname);
  return links[0] ?? null;
});
console.log('related-target:', related);
if (related) {
  await page.goto(`http://localhost:4321${related}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}
const secondArticle = await page.evaluate(() => ({
  path: location.pathname,
  toc: !!document.querySelector('.art-toc'),
  anchors: document.querySelectorAll('.h-anchor').length,
  duplicated: document.querySelectorAll('.h-anchor .h-anchor').length,
}));
console.log('second-article:', JSON.stringify(secondArticle));

// Scroll down to trigger scroll-spy + scroll-top
await page.evaluate(() => window.scrollTo(0, 2000));
await page.waitForTimeout(400);
const scrollState = await page.evaluate(() => ({
  scrollTopVisible: document.getElementById('scroll-top')?.classList.contains('visible'),
  activeToc: document.querySelector('.art-toc a[aria-current="true"]')?.textContent ?? null,
}));
console.log('scroll-state:', JSON.stringify(scrollState));

console.log('PAGE ERRORS:', errors.length ? errors : 'none');
await browser.close();
