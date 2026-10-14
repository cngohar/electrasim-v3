import { expect, test } from '@playwright/test';
import { activateControl, openCircuitTools } from './helpers/workbench';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
});

for (const phone of [false, true]) {
  test(`${phone ? 'phone' : 'desktop'} appearance persists without moving terminals or modifying the circuit`, async ({
    page,
  }, info) => {
    await page.setViewportSize(phone ? { width: 390, height: 844 } : { width: 1440, height: 1000 });
    await page.goto('/');
    await expect(page.locator('[data-component-id]').first()).toBeVisible();
    const snapshot = () =>
      page.evaluate(async () => {
        const path = '/src/store/circuitStore.ts';
        const c = (await import(path)).useCircuitStore.getState();
        return {
          circuit: JSON.stringify({
            components: c.components,
            wires: c.wires,
            supply: c.supply,
            faults: c.faults,
          }),
          ports: [...document.querySelectorAll('[data-component-id] [data-port-touch-target]')].map(
            (el) => [el.getAttribute('cx'), el.getAttribute('cy')],
          ),
        };
      });
    const before = await snapshot();
    for (const appearance of ['Device icons', 'Circuit symbols', 'Both']) {
      await activateControl(page, page.getByRole('button', { name: 'Settings', exact: true }));
      const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
      await activateControl(page, dialog.getByRole('button', { name: /^Display/ }));
      await dialog.getByRole('radio', { name: appearance, exact: true }).check();
      await activateControl(page, dialog.getByRole('button', { name: 'Done', exact: true }));
      expect(await snapshot()).toEqual(before);
      await expect(page.locator('[data-component-id]').first()).toHaveAttribute(
        'data-component-appearance',
        appearance === 'Both' ? 'both' : appearance === 'Device icons' ? 'icons' : 'symbols',
      );
    }
    // Persistence debounces writes; observe IndexedDB rather than relying on a fixed sleep.
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const path = '/node_modules/.vite/deps/idb-keyval.js';
          const { get } = await import(path);
          const settingsPath = '/src/store/settingsStore.ts';
          const { __SETTINGS_STORAGE_KEY } = await import(settingsPath);
          return (await get(__SETTINGS_STORAGE_KEY))?.settings?.componentAppearance;
        }),
      )
      .toBe('both');
    await page.reload();
    await expect(page.locator('[data-component-id]').first()).toHaveAttribute(
      'data-component-appearance',
      'both',
    );
    await page.screenshot({ path: info.outputPath('both-light.png') });
    await openCircuitTools(page);
    await activateControl(
      page,
      page.getByRole('button', { name: 'Switch to Dark Theme', exact: true }),
    );
    await activateControl(
      page,
      page.getByRole('button', { name: 'Close circuit tools', exact: true }),
    );
    await expect(page.locator('html')).toHaveClass(/dark/);
    await page.screenshot({ path: info.outputPath('both-dark.png') });
    const shelf = await page.locator('[data-workspace-library]').boundingBox();
    expect(shelf?.x).toBe(0);
    expect(shelf?.width).toBe(phone ? 390 : 1440);
    await openCircuitTools(page);
    await activateControl(page, page.getByRole('button', { name: 'Netlist', exact: true }));
    const netlist = page.getByRole('dialog', { name: 'Connections and netlist', exact: true });
    const item = netlist.locator('[aria-label="Circuit netlist"] button').first();
    await item.focus();
    await page.keyboard.press('Enter');
    await expect(netlist).toContainText('Terminal Ports');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  });
}
