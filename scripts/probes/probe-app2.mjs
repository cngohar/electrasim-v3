import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:3000/app/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1000);

// What's on screen?
const ui = await page.evaluate(() => ({
  buttons: [...document.querySelectorAll('button')].slice(0, 25).map((b) => b.textContent.trim().slice(0, 40) || b.getAttribute('aria-label') || '(empty)'),
  dialogs: [...document.querySelectorAll('dialog[open]')].length,
  canvas: !!document.querySelector('[data-circuit-canvas]'),
  headings: [...document.querySelectorAll('h1,h2,h3')].slice(0, 5).map((h) => h.textContent.trim().slice(0, 40)),
}));
console.log(JSON.stringify(ui, null, 2));

// Try to close any dialog
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// Look for Run Simulation button specifically
const runButtons = await page.evaluate(() => [...document.querySelectorAll('button')].filter((b) => /run|simulat/i.test(b.textContent)).map((b) => b.textContent.trim().slice(0, 50)));
console.log('RUN BUTTONS:', JSON.stringify(runButtons));

console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 5) : 'none');
await browser.close();
