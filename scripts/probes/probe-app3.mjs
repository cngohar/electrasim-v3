import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:3000/app/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

// Close the welcome dialog
await page.keyboard.press('Escape');
await page.waitForTimeout(500);

// Click Run Simulation
await page.locator('button:has-text("Run Simulation")').click();
await page.waitForTimeout(2000);

const afterRun = await page.evaluate(() => ({
  runButtonText: [...document.querySelectorAll('button')].find((b) => /simulation/i.test(b.textContent))?.textContent?.trim() ?? null,
  dialogs: [...document.querySelectorAll('dialog[open]')].length,
  alertDialogs: [...document.querySelectorAll('[role="alertdialog"], dialog[open]')].map((d) => d.textContent?.slice(0, 120)),
  logErrors: [...document.querySelectorAll('.text-red-500, [class*="error"]')].length,
}));
console.log(JSON.stringify(afterRun, null, 2));
console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 6) : 'none');

await browser.close();
