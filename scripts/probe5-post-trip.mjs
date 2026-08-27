import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:3000';
const out = { consoleErrors: [] };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => {
  out.consoleErrors.push(`pageerror: ${String(e).slice(0, 160)}`);
});
page.on('console', (m) => {
  if (m.type() === 'error') out.consoleErrors.push(`console: ${m.text().slice(0, 160)}`);
});
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => {
  window.localStorage.setItem('electrasim:welcomed', '1');
  window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
});

const mcb = page.locator('[data-component-id="two-way-staircase-light-mcb"] > g[role="button"]');
const mcbNode = page.locator('[data-component-id="two-way-staircase-light-mcb"]');
const bulb = page.locator('[data-component-id="two-way-staircase-light-bulb"] > g[role="button"]');
const runBtn = /^(Run Simulation|Run)$/;

async function snapshot(label) {
  return {
    label,
    tripped: (await mcb.getAttribute('aria-label')) ?? 'MCB-GONE',
    amberDots: await mcbNode.locator('circle[fill="#f59e0b"]').count(),
    amberFrames: await mcbNode.locator('rect[stroke="#f59e0b"][stroke-dasharray="4 3"]').count(),
    runVisible: await page.getByRole('button', { name: runBtn }).first().isVisible(),
    stopVisible: await page.getByRole('button', { name: /^Stop$/ }).isVisible(),
  };
}

await page.goto(`${BASE}/?template=two-way-staircase-light`);
await page
  .getByRole('article')
  .filter({ has: page.getByRole('heading', { name: 'Two-Way Staircase Light' }) })
  .getByRole('button', { name: 'Load guide' })
  .click();
await page.getByRole('button', { name: /^Run Simulation$/ }).click();
await page.waitForTimeout(1000);

// Inject a bolted short across the lamp
await bulb.click({ button: 'right' });
await page.waitForTimeout(300);
await page.getByRole('button', { name: /Inject Short Circuit/ }).click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: runBtn }).first().click();
await page.waitForTimeout(1500);

out.afterTrip = await snapshot('after-trip');
const alertDialog = page.getByRole('dialog');
out.alertVisible = await alertDialog.isVisible();
out.alertTitle = (
  await page
    .locator('#fault-alert-title')
    .innerText()
    .catch(() => 'NO-TITLE')
)
  .replace(/\s+/g, ' ')
  .slice(0, 80);
await page.screenshot({ path: 'test-results/probe5-tripped.png' });

// Dismiss the alert and inspect the tripped breaker
await page.getByRole('button', { name: 'Close modal' }).click();
await page.waitForTimeout(400);
await mcb.click();
await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Simulation Telemetry & Faults' }).click();
await page.waitForTimeout(300);
const resetBtn = page.getByRole('button', { name: /RESET Breaker/ });
out.inspectorReset = {
  cardVisible: await page.getByText('Manual Breaker Control').isVisible(),
  statusText: await page
    .getByText(/Status:/)
    .innerText()
    .catch(() => 'NO-STATUS'),
  resetVisible: await resetBtn.isVisible(),
  resetDisabled: await resetBtn.isDisabled().catch(() => 'BTN-GONE'),
};
await page.screenshot({ path: 'test-results/probe5-inspector.png' });

// Reset the breaker with the fault STILL injected
await resetBtn.click();
await page.waitForTimeout(400);
out.afterManualReset = await snapshot('after-manual-reset');

// Run again while faulted — a real breaker would re-trip instantly
await page.getByRole('button', { name: runBtn }).first().click();
await page.waitForTimeout(1500);
out.rerunIntoFault = await snapshot('rerun-into-fault');
out.rerunAlert = await alertDialog.isVisible().catch(() => false);
if (out.rerunAlert) {
  await page.getByRole('button', { name: 'Close modal' }).click();
  await page.waitForTimeout(300);
}

// Clear the fault, reset, and run clean
await bulb.click({ button: 'right' });
await page.waitForTimeout(300);
const menuLabels = await page.locator('[role="menu"] button, [role="menuitem"]').allInnerTexts();
out.contextMenuAfterFault = menuLabels.map((t) => t.replace(/\s+/g, ' ').slice(0, 60));
const clearItem = page.getByRole('button', { name: /Clear.*Fault|Remove Fault|Clear Short/i });
if (await clearItem.count()) {
  await clearItem.first().click();
  await page.waitForTimeout(400);
} else {
  await page.keyboard.press('Escape');
}
await page
  .getByRole('button', { name: /RESET Breaker/ })
  .click()
  .catch(() => {});
await page.waitForTimeout(300);
out.afterFaultCleared = await snapshot('after-fault-cleared');
await page.getByRole('button', { name: runBtn }).first().click();
await page.waitForTimeout(1800);
out.finalCleanRun = await snapshot('final-clean-run');
await page.screenshot({ path: 'test-results/probe5-final.png' });

console.log(JSON.stringify(out, null, 2));
await browser.close();
