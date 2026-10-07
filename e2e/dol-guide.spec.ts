import { expect } from '@playwright/test';
import { test } from './helpers/paid-test';
import { run } from './helpers/three-phase';

for (const phone of [false, true]) {
  test(`DOL guide runs and stops through its coil control (${phone ? 'phone' : 'desktop'})`, async ({
    page,
  }) => {
    if (phone) await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem('electrasim:welcomed', '1');
      localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/?template=pro-3phase-dol-starter');
    await expect(page.getByRole('heading', { name: 'Three-Phase DOL Motor Starter' })).toBeVisible({
      timeout: 15000,
    });
    const collapse = page.getByRole('button', { name: 'Collapse panel' }).first();
    if (await collapse.isVisible()) await collapse.click();
    await run(page);
    const motorState = () =>
      page.evaluate(async () => {
        const path = '/src/store/uiStore.ts';
        return (await import(path)).useUiStore.getState().simResult?.phasor?.motors[0]?.state;
      });
    await expect.poll(motorState).toBe('running');
    if (phone) {
      await page.getByRole('button', { name: 'Hide guide' }).click();
      await page.getByRole('button', { name: 'Fit', exact: true }).click();
    } else await page.getByTitle('Zoom to fit all (F)').click();
    await page
      .locator('[data-component-id="pro-3phase-dol-starter-control"] [data-component-hitbox]')
      .dblclick();
    await expect.poll(motorState).toBe('stopped');
  });
}
