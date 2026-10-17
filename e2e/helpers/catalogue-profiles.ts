import { exportJSON } from '@electrasim/domain/circuitFormat';
import type { Circuit } from '@electrasim/domain/types';
import { type Page, expect } from '@playwright/test';
import { activateControl, fitCanvas, supplyTrigger } from './workbench';

export async function importProfileCircuit(
  page: Page,
  circuit: Circuit,
  options: { fit?: boolean } = {},
) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/app/');
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await activateControl(page, page.getByRole('button', { name: /^Import \/ Export/ }));
  const dialog = page.getByRole('dialog');
  await activateControl(page, dialog.getByRole('button', { name: 'Import', exact: true }));
  await dialog.locator('textarea').fill(exportJSON(circuit));
  await activateControl(page, dialog.getByRole('button', { name: 'Import from paste' }));
  await expect(dialog).toContainText(
    `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
  );
  await page.keyboard.press('Escape');
  if (options.fit !== false) await fitCanvas(page);
}
export async function runProfileCircuit(page: Page) {
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  const review = page.getByRole('dialog', { name: 'Circuit readiness' });
  if (await review.isVisible())
    await activateControl(
      page,
      review.getByRole('button', { name: /^Run diagnostic$|^Run with findings$/ }),
    );
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await expect
    .poll(() => page.workers().some((worker) => worker.url().includes('sim.worker')))
    .toBe(true);
}
export async function setProfileSupply(page: Page, voltage: number) {
  await activateControl(page, supplyTrigger(page));
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply voltage in volts').fill(String(voltage));
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
}
export async function assertProfileReadings(
  page: Page,
  id: string,
  point: { voltage?: number; currentAmps?: number; powerWatts?: number },
) {
  const panel = await inspectProfileComponent(page, id);
  const readings = panel.locator(`[data-electrical-readings="${id}"]`);
  for (const [field, value, unit] of [
    ['voltage', point.voltage, 'V'],
    ['current', point.currentAmps, 'A'],
    ['power', point.powerWatts, 'W'],
  ] as const) {
    if (value !== undefined)
      await expect(readings.locator(`[data-reading="${field}"]`)).toHaveText(
        `${Number(value.toFixed(4))} ${unit}`,
      );
  }
  await expect(panel).not.toContainText('Calculation unassessed');
  return panel;
}

/** Native keyboard selection also reaches dense nodes beneath floating controls. */
export async function inspectProfileComponent(page: Page, id: string) {
  await fitCanvas(page);
  await page.locator(`[data-component-id="${id}"] [data-component-hitbox]`).press('Enter');
  const inspector = page.getByRole('complementary', { name: 'Inspector', exact: true });
  if (!(await inspector.isVisible()))
    await activateControl(
      page,
      page.locator('.table-top-right').getByRole('button', { name: 'Inspect', exact: true }),
    );
  await activateControl(page, inspector.getByRole('button', { name: 'Properties', exact: true }));
  await activateControl(
    page,
    inspector.getByRole('button', { name: 'Detailed model settings', exact: true }),
  );
  return page.getByRole('dialog', { name: /· detailed settings$/ });
}
