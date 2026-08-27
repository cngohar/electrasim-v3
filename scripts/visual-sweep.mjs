import { chromium, devices } from 'playwright';
const BASE = 'http://127.0.0.1:3000';
const shots = 'test-results/sweep';
import { mkdirSync } from 'node:fs';
mkdirSync(shots, { recursive: true });
const errors = [];
const browser = await chromium.launch();

async function snap(page, name) {
  console.error('STEP', name);
  await page.waitForTimeout(650);
  await page.screenshot({ path: `${shots}/${name}.png` });
}
function watch(page, tag) {
  page.on(
    'console',
    (m) => m.type() === 'error' && errors.push(`[${tag}] console: ${m.text().slice(0, 160)}`),
  );
  page.on('pageerror', (e) => errors.push(`[${tag}] pageerror: ${String(e).slice(0, 160)}`));
}
const init = () => {
  window.localStorage.setItem('electrasim:welcomed', '1');
  window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
};

// 1. Desktop fresh editor
const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
watch(p, 'desktop');
await p.addInitScript(init);
p.on('dialog', (d) => d.accept());
await p.goto(BASE);
await snap(p, '01-desktop-editor');
// 2. Guides modal
await p.getByRole('button', { name: 'Guides' }).click();
await snap(p, '02-desktop-guides');
await p.keyboard.press('Escape');
await p.waitForTimeout(400);
// 3. Load two-way guide, run, then select switch → return-to-guide chip
await p.goto(`${BASE}/?template=two-way-staircase-light`);
await p
  .getByRole('article')
  .filter({ has: p.getByRole('heading', { name: 'Two-Way Staircase Light' }) })
  .getByRole('button', { name: 'Load guide' })
  .click();
await snap(p, '03-desktop-guide-loaded');
await p.getByRole('button', { name: /^Run Simulation$/ }).click();
await snap(p, '04-desktop-running');
await p
  .locator('[data-component-id="two-way-staircase-light-switch-a"] > g[role="button"]')
  .dblclick();
await snap(p, '05-desktop-return-chip');
// 4. Expand inspector (properties)
await p.getByRole('button', { name: 'Expand Inspector Panel' }).click();
await snap(p, '06-desktop-inspector');
// 5. Context menu on component (right-click)
await p
  .locator('[data-component-id="two-way-staircase-light-switch-b"] > g[role="button"]')
  .click({ button: 'right' });
await snap(p, '07-desktop-contextmenu');
await p.keyboard.press('Escape');
// 6. Menu overlay
await p.getByRole('button', { name: 'Menu' }).click();
await snap(p, '08-desktop-menu');
await p.close();

// 7-9. Mobile
const m = await browser.newPage({ ...devices['Pixel 7'] });
watch(m, 'mobile');
await m.addInitScript(init);
m.on('dialog', (d) => d.accept());
await m.goto(BASE);
await snap(m, '09-mobile-editor');
await m.goto(`${BASE}/?template=push-button-doorbell`);
await m
  .getByRole('article')
  .filter({ has: m.getByRole('heading', { name: 'Push-Button Doorbell' }) })
  .getByRole('button', { name: 'Load guide' })
  .click();
await snap(m, '10-mobile-guide-sheet');
await m.getByRole('button', { name: /^Run Simulation$/ }).click();
await snap(m, '11-mobile-running');
await m.close();

// 10. Tablet
const t = await browser.newPage({ ...devices['iPad Pro 11'] });
watch(t, 'tablet');
await t.addInitScript(init);
t.on('dialog', (d) => d.accept());
await t.goto(BASE);
await snap(t, '12-tablet-editor');
await t.close();

await browser.close();
console.log(JSON.stringify({ errors }, null, 2));
