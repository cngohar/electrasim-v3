import { type Page, expect } from '@playwright/test';
import { activateControl, fitCanvas, inspectComponent, supplyTrigger } from './workbench';

async function place(page: Page, type: string, query: string, x: number, y: number) {
  await activateControl(page, page.getByRole('button', { name: /Browse all components|Browse$/ }));
  const library = page.getByRole('dialog', { name: 'Component library' });
  await library.getByLabel('Show all / fault exercise').check();
  await library.getByLabel('Search components').fill(query);
  await activateControl(page, library.locator(`[data-palette-type="${type}"]`).first());
  await expect(library).not.toBeVisible();
  const canvas = await page.locator('[data-circuit-canvas]').boundingBox();
  await page.mouse.click(canvas!.x + canvas!.width * x, canvas!.y + canvas!.height * y);
  const node = page
    .locator('[data-component-id][data-component-appearance]')
    .filter({ has: page.locator(`[data-device-art="${type}"],[data-component-symbol="${type}"]`) });
  await expect(node).toHaveCount(1);
  return (await node.getAttribute('data-component-id'))!;
}

async function setVoltage(page: Page, voltage: number) {
  await activateControl(page, supplyTrigger(page));
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply voltage in volts').fill(String(voltage));
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  await expect(dialog).not.toBeVisible();
}

async function start(page: Page) {
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  const review = page.getByRole('dialog', { name: 'Circuit readiness' });
  if (await review.isVisible())
    await activateControl(
      page,
      review.getByRole('button', { name: /^Run diagnostic$|^Run with findings$/ }),
    );
}

/** Real placement, port wiring, confirmed supply edits, Run and inspection. */
export async function exerciseUnsupportedLoadFeedback(page: Page, screenshotPrefix: string) {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/app/');
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await activateControl(page, page.getByRole('button', { name: /^Import \/ Export/ }));
  const importer = page.getByRole('dialog');
  await activateControl(page, importer.getByRole('button', { name: 'Import', exact: true }));
  await importer.locator('textarea').fill(
    JSON.stringify({
      version: 1,
      exportedAt: 0,
      circuit: { components: [], wires: [], globalVoltage: 230 },
    }),
  );
  await activateControl(page, importer.getByRole('button', { name: 'Import from paste' }));
  await expect(importer).toContainText('Loaded 0 components, 0 wires.');
  await page.keyboard.press('Escape');
  await expect(importer).not.toBeVisible();

  const line = await place(page, 'live-terminal', 'Live Terminal', 0.24, 0.3);
  const neutral = await place(page, 'neutral-terminal', 'Neutral Terminal', 0.24, 0.56);
  await setVoltage(page, 12);
  const lamp = await place(page, 'bulb', 'LED Bulb', 0.65, 0.38);
  const node = (id: string) =>
    page.locator(`[data-component-id="${id}"][data-component-appearance]`);
  const port = (id: string, index: number) =>
    node(id).locator(`[data-port-group="${index}"] [data-port-touch-target]`);
  await port(line, 0).press('Enter');
  await port(lamp, 0).press('Enter');
  await port(lamp, 1).press('Enter');
  await port(neutral, 0).press('Enter');
  await expect(page.locator('[data-wire-hitbox]')).toHaveCount(2);
  await fitCanvas(page);
  await expect(node(lamp)).not.toContainText('Model unavailable');
  await start(page);
  const feedback = page.locator('[data-simulation-feedback="operating-voltage"]');
  await expect(feedback).toBeVisible();
  await expect(feedback).toContainText('Outside operating voltage');
  await expect(feedback).toContainText('LED Bulb (9W)');
  await expect(feedback).toContainText('12 V is outside the declared 207–253 V range');
  await expect(page.getByLabel('Console messages')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await fitCanvas(page);
  await page.screenshot({ path: `${screenshotPrefix}-12v-led.png`, fullPage: true });
  await activateControl(page, feedback.getByRole('button', { name: 'View findings' }));
  const review = page.getByRole('dialog', { name: 'Circuit readiness' });
  await expect(review).toContainText('12 V is outside the declared 207–253 V range');
  await expect(review).toContainText('Calculated. No load current.');
  await page.keyboard.press('Escape');
  const inspector = await inspectComponent(page, lamp);
  const readings = inspector.locator(`[data-electrical-readings="${lamp}"]`);
  await expect(readings.locator('[data-reading="voltage"]')).toHaveText('12 V');
  await expect(readings.locator('[data-reading="current"]')).toHaveText('0 A');
  await expect(readings.locator('[data-reading="power"]')).toHaveText('0 W');
  await expect(readings).toContainText('undervoltage off');
  await page.keyboard.press('Escape');
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  await expect(feedback).not.toBeVisible();
  await setVoltage(page, 230);
  await start(page);
  await expect(feedback).not.toBeVisible();
  const working = await inspectComponent(page, lamp);
  await expect(working.locator('[data-reading="power"]')).toHaveText('9 W');
  await expect(working.locator('[data-reading="current"]')).toHaveText('0.0391 A');
  await expect(working).toContainText('Profile state: on');
  await page.keyboard.press('Escape');
  await fitCanvas(page);
  await page.screenshot({ path: `${screenshotPrefix}-230v-led.png`, fullPage: true });
  expect(errors).toEqual([]);
}
