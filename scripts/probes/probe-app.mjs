import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto('http://localhost:3000/app/', { waitUntil: 'networkidle' });

// Dismiss welcome if present
const welcome = page.locator('text=Welcome').first();
if (await welcome.isVisible().catch(() => false)) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

// Try running the simulation (demo circuit)
const runBtn = page.locator('button:has-text("Run Simulation")').first();
if (await runBtn.isVisible().catch(() => false)) {
  await runBtn.click();
  await page.waitForTimeout(1500);
}

const state = await page.evaluate(() => ({
  runBtnText: document.querySelector('button')?.textContent ?? '',
  hasFaultAlert: !!document.querySelector('[role="alertdialog"]'),
  consoleErrors: window.__errors ?? 0,
}));
console.log('app-state:', JSON.stringify(state));
console.log('PAGE ERRORS:', errors.length ? errors.slice(0, 5) : 'none');

await browser.close();
