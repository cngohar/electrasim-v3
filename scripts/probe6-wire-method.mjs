import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:3000';
const out = { consoleErrors: [] };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => out.consoleErrors.push(String(e).slice(0, 200)));
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => {
  window.localStorage.setItem('electrasim:welcomed', '1');
  window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
});
await page.goto(`${BASE}/?template=two-way-staircase-light`);
await page
  .getByRole('article')
  .filter({ has: page.getByRole('heading', { name: 'Two-Way Staircase Light' }) })
  .getByRole('button', { name: 'Load guide' })
  .click();
await page.getByRole('button', { name: 'Hide guide' }).click();

// Wires are canvas buttons named "Wire <id>"; straight SVG wire groups have a
// zero-area bbox, so force-click centers on the visible line itself.
out.wireCount = await page
  .getByRole('button', { name: /^Wire two-way-staircase-light-w-/ })
  .count();
await page
  .getByRole('button', { name: 'Wire two-way-staircase-light-w-traveller-l1' })
  .click({ force: true });
await page.waitForTimeout(400);
// The Inspector may already auto-expand on wire selection; only open the
// properties tab if the collapsed rail is showing.
const propsTab = page.getByRole('button', { name: 'Properties & Settings' });
if (await propsTab.count()) {
  await propsTab.click();
  await page.waitForTimeout(400);
}
out.methodCard = await page.getByText('Installation Method (BS 7671)').count();
out.drawerText = (
  await page
    .locator('aside.fixed')
    .allInnerTexts()
    .catch(() => [])
).map((t) => t.slice(0, 300));
if (out.methodCard > 0) {
  out.baseReadout = await page.getByText(/A base$/).innerText();
  await page.getByRole('button', { name: /Method B1/ }).click();
  await page.waitForTimeout(300);
  out.baseReadoutB1 = await page.getByText(/A base$/).innerText();
  out.effectiveNote = await page.getByText(/effective\)\.$/).innerText();
}
await page.screenshot({ path: 'test-results/probe6-wire-method.png' });
console.log(JSON.stringify(out, null, 2));
await browser.close();
process.exit(0);

// Check the Simulation tab wire telemetry shows the mV/A/m drop while running
await page.getByRole('button', { name: /^Run Simulation$/ }).click();
await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Simulation Telemetry & Faults' }).click();
await page.waitForTimeout(400);
out.vdropCard = await page.getByText('Voltage Drop').count();
out.vdropValue = await page
  .locator('div')
  .filter({ hasText: /^\d+\.\d+ V \(\d+\.\d+%\)$/ })
  .last()
  .innerText()
  .catch(() => 'NONE');
await page.screenshot({ path: 'test-results/probe6-wire-sim.png' });
console.log(JSON.stringify(out, null, 2));
await browser.close();
