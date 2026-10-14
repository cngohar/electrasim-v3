import { type Page, expect, test } from '@playwright/test';
import { activateControl, openCircuitTools } from './helpers/workbench';

test.use({ viewport: { width: 1680, height: 1000 } });
const faultLabToggle = (page: Page) => page.getByTitle(/^Toggle the Fault Lab/);
async function selectPro(page: Page) {
  await openCircuitTools(page);
  const basic = page.getByTitle(/^Basic Student Mode active/);
  if (await basic.isVisible()) await activateControl(page, basic);
  await expect(faultLabToggle(page)).toBeVisible();
}

test.describe('Open Drafting Table workbench', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('electrasim:welcomed', '1');
      localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    await page.goto('/');
    await expect(page.locator('[data-circuit-canvas]')).toBeVisible();
  });
  test('primary commands and secondary tools are reachable without crowding the header', async ({
    page,
  }) => {
    const header = page.locator('.table-command-bar');
    await expect(header.getByRole('button', { name: 'Run Simulation', exact: true })).toBeVisible();
    await expect(header.getByTitle(/Undo \(/)).toBeVisible();
    await expect(header.getByTitle(/Redo \(/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Inspect', exact: true })).toBeVisible();
    const tools = await openCircuitTools(page);
    await expect(tools.getByTitle('Guided circuits')).toBeVisible();
    await expect(tools.getByTitle(/Validate circuit/)).toBeVisible();
    await expect(tools.locator('[data-standard-selector]')).toBeVisible();
    await expect(tools.getByTitle(/Switch to Dark Theme|Switch to Light Theme/)).toBeVisible();
  });
  test('tablet standard and mode choices retain unobstructed hit targets', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1194 });
    await openCircuitTools(page);
    for (const mode of ['basic', 'pro']) {
      const toggle = page.locator('[data-tour="mode-toggle"]');
      for (const target of [toggle, page.locator('[data-standard-selector]')])
        expect(
          await target.evaluate((node) => {
            const b = node.getBoundingClientRect();
            const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
            return hit !== null && node.contains(hit);
          }),
        ).toBe(true);
      if (mode === 'basic') await activateControl(page, toggle);
    }
  });
  test('component shelf collapses vertically and keeps its full width', async ({ page }) => {
    const shelf = page.locator('[data-workspace-library]');
    const before = await shelf.boundingBox();
    await activateControl(page, page.getByRole('button', { name: 'Collapse component shelf' }));
    const after = await shelf.boundingBox();
    expect(after!.width).toBe(before!.width);
    expect(after!.height).toBeLessThan(before!.height);
    await activateControl(page, page.getByRole('button', { name: 'Expand Component Library' }));
    await expect(page.getByRole('button', { name: 'Collapse component shelf' })).toBeVisible();
  });
  test('catalogue search exposes compatibility and retains regional placement controls', async ({
    page,
  }) => {
    await activateControl(page, page.getByRole('button', { name: 'Browse all components' }));
    const library = page.getByRole('dialog', { name: 'Component library' });
    await library.getByLabel('Show all / fault exercise').check();
    await library.getByLabel('Search components').fill('mcb');
    await expect(library.locator('[data-palette-type="mcb"]')).toBeVisible();
    await expect(library.getByLabel('Placement supply', { exact: true })).toBeVisible();
  });
  test('canvas commands reuse select, wire, trace, delete and fit actions', async ({ page }) => {
    const bar = page.locator('[data-workspace-tools]');
    await expect(bar.getByTitle('Select (V)')).toBeVisible();
    await activateControl(page, bar.getByTitle(/Wire mode \(W\)/));
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const path = '/src/store/uiStore.ts';
          return (await import(path)).useUiStore.getState().mode;
        }),
      )
      .toBe('wiring');
    await activateControl(page, bar.getByTitle('Select (V)'));
    await expect(bar.getByTitle(/Delete selected \(Del\)/)).toBeDisabled();
    await expect(bar.getByTitle(/Trace Circuit Path/)).toBeVisible();
    await activateControl(page, bar.getByTitle('Zoom to fit all (F)'));
  });
  test('command search opens by keyboard and remains reachable through the menu', async ({
    page,
  }) => {
    // Use the shortcut advertised for this device, with a canvas command focused.
    await page.getByTitle('Select (V)').focus();
    const modifier = await page.evaluate(() =>
      /mac|iphone|ipad|ipod/i.test(`${navigator.platform} ${navigator.userAgent}`)
        ? 'Meta'
        : 'Control',
    );
    await page.keyboard.press(`${modifier}+k`);
    const search = page.getByRole('dialog', { name: 'Command palette' });
    await expect(search).toBeVisible();
    await search.getByLabel('Show all / fault exercise').check();
    await search.getByPlaceholder('What do you want to do?').fill('Add MCB');
    await activateControl(page, search.getByRole('button', { name: /Add MCB/ }).first());
    await expect(search).not.toBeVisible();
    await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
    await activateControl(page, page.getByRole('button', { name: /Command palette/ }));
    await expect(search).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(search).not.toBeVisible();
  });
  test('zoom and minimap remain usable; grid and snapping remain in preferences', async ({
    page,
  }) => {
    await expect(page.getByRole('button', { name: 'Zoom in', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Zoom out', exact: true })).toBeVisible();
    const map = page.getByLabel('Mini-map — click to pan');
    await expect(map).toBeVisible();
    await map.click({ position: { x: 40, y: 40 } });
    await activateControl(page, page.getByRole('button', { name: 'Settings', exact: true }));
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
    await expect(settings.getByRole('switch', { name: /Snap/ })).toBeVisible();
    await activateControl(page, settings.getByRole('button', { name: 'Display', exact: true }));
    await expect(settings.getByRole('switch', { name: /grid/i })).toBeVisible();
  });
  test('Fault Lab stays modeless so a canvas target can be selected', async ({ page }) => {
    await selectPro(page);
    const access = page.getByLabel('Membership and recovery');
    if (await access.isVisible()) {
      const dismiss = access.getByRole('button', { name: 'Dismiss', exact: true });
      if (await dismiss.isVisible()) await activateControl(page, dismiss);
    }
    await openCircuitTools(page);
    await activateControl(page, faultLabToggle(page));
    const panel = page.getByLabel('Fault Lab panel');
    await expect(panel).toBeVisible();
    await activateControl(page, page.getByTitle('Zoom to fit all (F)'));
    const target = page.locator('[data-component-id^="bulb-"] [data-component-hitbox]').first();
    await activateControl(page, target, true);
    await expect(panel.getByRole('button', { name: /Short Circuit/ })).toBeEnabled();
    await expect(page.getByRole('dialog', { name: 'Fault Lab', exact: true })).not.toHaveAttribute(
      'aria-modal',
      'true',
    );
    await activateControl(page, page.getByRole('button', { name: 'Inspect', exact: true }));
    await expect(panel).not.toBeVisible();
    const inspector = page.getByRole('complementary', { name: 'Inspector', exact: true });
    await expect(inspector.getByRole('button', { name: 'Detailed model settings' })).toBeVisible();
    await openCircuitTools(page);
    await activateControl(page, faultLabToggle(page));
    await expect(panel).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
  });
  test('Fault Lab injects and clears through its active-fault list', async ({ page }) => {
    await selectPro(page);
    const access = page.getByLabel('Membership and recovery');
    if (await access.isVisible()) {
      const dismiss = access.getByRole('button', { name: 'Dismiss', exact: true });
      if (await dismiss.isVisible()) await activateControl(page, dismiss);
    }
    await openCircuitTools(page);
    await activateControl(page, faultLabToggle(page));
    await activateControl(page, page.getByTitle('Zoom to fit all (F)'));
    await activateControl(
      page,
      page.locator('[data-component-id^="bulb-"] [data-component-hitbox]').first(),
      true,
    );
    const panel = page.getByLabel('Fault Lab panel');
    await activateControl(page, panel.getByRole('button', { name: /Short Circuit/ }));
    await expect(panel.getByText('Active faults (1)')).toBeVisible();
    await expect(panel.getByLabel('Replay Short circuit animation')).toBeVisible();
    await activateControl(
      page,
      panel.getByRole('button', {
        name: 'Clear all injected faults from the active list',
        exact: true,
      }),
    );
    await expect(panel.getByText('Active faults (1)')).toHaveCount(0);
  });
  test('supply presets stage a reviewed change without covering the trigger', async ({ page }) => {
    const trigger = page.getByTitle('Click to change Global Supply Voltage');
    await activateControl(page, trigger);
    const dialog = page.getByRole('dialog', { name: 'Change supply' });
    await activateControl(page, dialog.getByRole('button', { name: '24 V', exact: true }));
    await expect(trigger).toContainText('230 V AC 50 Hz');
    await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toContainText('24 V AC 50 Hz');
  });
});
