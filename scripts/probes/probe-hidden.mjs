import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:4321/compare/', { waitUntil: 'networkidle' });

const report = await page.evaluate(() => {
  const profiles = [...document.querySelectorAll('[data-profile-for]')];
  const visible = [];
  for (const p of profiles) {
    const cs = getComputedStyle(p);
    const rect = p.getBoundingClientRect();
    visible.push({
      id: p.dataset.profileFor,
      hiddenAttr: p.hidden,
      display: cs.display,
      rectW: Math.round(rect.width),
      rectH: Math.round(rect.height),
    });
  }
  const rows = [...document.querySelectorAll('[data-tool-id]')].map((r) => ({
    id: r.dataset.toolId,
    hidden: r.classList.contains('is-hidden'),
  }));
  return { profiles: visible, rows };
});

console.log(JSON.stringify(report, null, 2));
console.log('PAGE ERRORS:', errors.length ? errors : 'none');

await page.screenshot({ path: 'probe-compare-initial.png' });

await browser.close();
