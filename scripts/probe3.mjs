import { chromium } from 'playwright';
const BASE = 'http://127.0.0.1:3000';
const out = {};
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('pageerror', (e) => {
  out.pageError = String(e).slice(0, 200);
});
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => {
  window.localStorage.setItem('electrasim:welcomed', '1');
  window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
});
const step = async (name, fn) => {
  try {
    out[name] = await fn();
    console.error('ok:', name);
  } catch (e) {
    out[name] = { ERROR: String(e).split('\n')[0] };
    console.error('FAIL:', name);
  }
};
const dialogText = async () =>
  (
    await page
      .locator('dialog[open]')
      .innerText()
      .catch(() => '')
  ).slice(0, 140);
const closeDialog = async () => {
  const d = page.locator('dialog[open]');
  if (await d.count()) {
    await d
      .getByRole('button', { name: /Close|Cancel/ })
      .first()
      .click()
      .catch(() => {});
    await page.keyboard.press('Escape');
  }
};

await page.goto(`${BASE}/?template=two-way-staircase-light`);
await page
  .getByRole('article')
  .filter({ has: page.getByRole('heading', { name: 'Two-Way Staircase Light' }) })
  .getByRole('button', { name: 'Load guide' })
  .click();
await page.getByRole('button', { name: /^Run Simulation$/ }).click();
await page.waitForTimeout(800);

const bulb = page.locator('[data-component-id="two-way-staircase-light-bulb"] > g[role="button"]');
const mcb = page.locator('[data-component-id="two-way-staircase-light-mcb"] > g[role="button"]');

await step('injectShortCircuit', async () => {
  await bulb.click({ button: 'right' });
  await page.waitForTimeout(250);
  const items = await page.getByRole('button', { name: /Inject/ }).allInnerTexts();
  await page.getByRole('button', { name: /Inject Short Circuit/ }).click();
  await page.waitForTimeout(900);
  return {
    menuItems: items,
    health: await page
      .getByText('Faults Active')
      .first()
      .innerText()
      .catch(() => '(no Faults Active)'),
    mcbAria: await mcb.getAttribute('aria-label'),
    lampGlow: await page
      .locator('[data-component-id="two-way-staircase-light-bulb"]')
      .locator('circle[fill="#facc15"]')
      .count(),
  };
});

await step('faultUndo', async () => {
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  return { mcbAria: await mcb.getAttribute('aria-label') };
});

await step('deleteWithConfirm', async () => {
  await bulb.click({ button: 'right' });
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: /Delete Component/ }).click();
  await page.waitForTimeout(400);
  const dlg = await dialogText();
  // confirm deletion in the modal (destructive action button)
  const dlgEl = page.locator('dialog[open]');
  if (await dlgEl.count()) {
    await dlgEl
      .getByRole('button', { name: /Delete|Remove|Confirm/ })
      .first()
      .click();
    await page.waitForTimeout(300);
  }
  return {
    dialogText: dlg,
    bulbCount: await page.locator('[data-component-id="two-way-staircase-light-bulb"]').count(),
  };
});

await step('deleteUndo', async () => {
  await page.keyboard.press('Control+z');
  await page.waitForTimeout(400);
  return {
    bulbCount: await page.locator('[data-component-id="two-way-staircase-light-bulb"]').count(),
  };
});

await step('copyPaste', async () => {
  await mcb.click();
  await page.waitForTimeout(250);
  const before = await page.locator('[data-component-id]').count();
  await page.keyboard.press('Control+c');
  await page.keyboard.press('Control+v');
  await page.waitForTimeout(400);
  await closeDialog();
  return { before, after: await page.locator('[data-component-id]').count() };
});

await step('exportImport', async () => {
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.waitForTimeout(300);
  const menuTexts = await page.locator('dialog[open] button, [role="menu"] button').allInnerTexts();
  const dlPromise = page.waitForEvent('download', { timeout: 4000 }).catch(() => null);
  await page
    .getByText(/Import \/ Export|Export/)
    .first()
    .click();
  await page.waitForTimeout(400);
  const dlg = page.locator('dialog[open]');
  const dlgText2 = await dialogText();
  // try clicking an export action inside whatever surfaced
  await page
    .getByRole('button', { name: /^Export|Export JSON|Download/ })
    .first()
    .click()
    .catch(() => {});
  const dl = await dlPromise;
  await closeDialog();
  return {
    menuTexts: menuTexts.slice(0, 20),
    dialog: dlgText2,
    download: dl ? dl.suggestedFilename() : '(no download)',
  };
});

await step('stressAndDashboard', async () => {
  await page.getByRole('button', { name: /STRESS/ }).click();
  await page.waitForTimeout(1200);
  const afterStress = await page
    .getByText(/Stress|stress/)
    .first()
    .innerText()
    .catch(() => '(none)');
  const modeBtn = page.getByRole('button', { name: /Student|Pro/ }).first();
  const modeLabel = await modeBtn.innerText();
  await modeBtn.click();
  await page.waitForTimeout(700);
  const dashTexts = (await page.locator('aside').allInnerTexts()).join(' | ').slice(0, 200);
  return {
    afterStress: afterStress.slice(0, 80),
    modeWas: modeLabel,
    asidesAfterModeToggle: dashTexts,
  };
});

await page.screenshot({ path: 'test-results/probe3-final.png' });
console.log(JSON.stringify(out, null, 2));
await browser.close();
