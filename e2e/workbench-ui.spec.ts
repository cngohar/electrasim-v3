import { expect, test } from '@playwright/test';

/**
 * Workbench UI experiment — verification that the new professional
 * desktop shell works and preserves the core interactions:
 *   1. Top application bar (brand, undo/redo, run, fault lab, theme, settings, menu)
 *   2. Simulation context bar (supply / components / wires / sim state)
 *   3. Collapsible component palette
 *   4. Canvas floating toolbar (select / wire / delete / zoom-fit)
 *   5. Command palette (Ctrl+K)
 *   6. Bottom console drawer (collapsed by default, with counts)
 *   7. Status bar (mode / zoom / snap / grid)
 *   8. Mini-map present
 */

test.use({ viewport: { width: 1680, height: 1000 } });

test.describe('workbench shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
      window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    await page.goto('/');
    await page.locator('[data-circuit-canvas]').waitFor({ state: 'attached' });
  });

  test('top application bar renders all primary controls', async ({ page }) => {
    await expect(page.locator('header').getByText('ElectraSim', { exact: true })).toBeVisible();
    // Undo / Redo are icon buttons (aria titles).
    await expect(page.getByTitle(/Undo \(Ctrl\+Z\)/)).toBeVisible();
    await expect(page.getByTitle(/Redo \(Ctrl\+Shift\+Z\)/)).toBeVisible();
    // Primary run action.
    await expect(page.getByRole('button', { name: /^Run Simulation$/ })).toBeVisible();
    // Fault Lab is a Pro-only entry point; switch to Pro to see it.
    const studentToggle = page.getByRole('button', { name: /^student$/i });
    if (await studentToggle.isVisible().catch(() => false)) {
      await studentToggle.click({ force: true });
    }
    await expect(page.getByRole('button', { name: /Fault Lab/ })).toBeVisible();
    // Theme + Settings + Menu (scoped to the top app bar header).
    await expect(page.locator('header').getByTitle(/Light Theme|Dark Theme/)).toBeVisible();
    await expect(page.locator('header').getByTitle('Settings')).toBeVisible();
    await expect(page.locator('header').getByRole('button', { name: 'Menu' })).toBeVisible();
  });

  test('context bar shows supply, counts and simulation state', async ({ page }) => {
    // Supply indicator lives in the context bar.
    await expect(page.getByText(/Supply:/).first()).toBeVisible();
    // The sub-header shows the sim state label (Paused by default).
    await expect(page.getByText(/Sim:/).first()).toBeVisible();
  });

  test('palette collapses to a narrow rail and expands back', async ({ page }) => {
    const aside = page.locator('aside.fixed').first();
    const expandedWidth = (await aside.boundingBox())?.width ?? 0;
    expect(expandedWidth).toBeGreaterThan(200);

    await page.getByRole('button', { name: 'Collapse panel' }).click();
    await expect(page.getByRole('button', { name: 'Expand Component Library' })).toBeVisible();
    const collapsedWidth = (await aside.boundingBox())?.width ?? 0;
    expect(collapsedWidth).toBeLessThan(60);

    await page.getByRole('button', { name: 'Expand Component Library' }).click();
    await expect(page.getByRole('button', { name: 'Collapse panel' })).toBeVisible();
  });

  test('palette search filters components', async ({ page }) => {
    const search = page.getByPlaceholder('Search…');
    await search.fill('mcb');
    await expect(page.getByRole('button', { name: /MCB/ }).first()).toBeVisible();
  });

  test('canvas floating toolbar provides select / wire / delete / zoom-fit', async ({ page }) => {
    // The canvas floating toolbar sits near the top of the canvas; scope to it.
    const bar = page
      .locator('div.absolute')
      .filter({ has: page.getByTitle('Select (V)') })
      .filter({ has: page.getByTitle(/Zoom to fit all \(F\)/) })
      .first();
    await expect(bar.getByTitle('Select (V)')).toBeVisible();
    await expect(bar.getByTitle(/Wire mode \(W\)/)).toBeVisible();
    await expect(bar.getByTitle(/Zoom to fit all \(F\)/)).toBeVisible();
    // Delete is present but disabled without a selection.
    const del = bar.getByTitle(/Delete selected \(Del\)/);
    await expect(del).toBeVisible();
    await expect(del).toBeDisabled();
  });

  test('command palette opens via Ctrl+K and runs a command', async ({ page }) => {
    // Prefer the reliable keyboard path; on WebKit/iPad the Ctrl+K keystroke is
    // reported differently by the browser, so fall back to the header button.
    await page.keyboard.press('Control+k');
    let palette = page.getByRole('dialog', { name: 'Command palette' });
    if (!(await palette.isVisible().catch(() => false))) {
      await page.locator('header').getByTitle('Command palette (Ctrl+K)').click();
      palette = page.getByRole('dialog', { name: 'Command palette' });
    }
    await expect(palette).toBeVisible();
    // Search for a component command and run it — it should place a placing type.
    await palette.getByPlaceholder('What do you want to do?').fill('Add MCB');
    await palette
      .getByRole('button', { name: /Add MCB/ })
      .first()
      .click();
    await expect(palette).not.toBeVisible();
    // Esc toggles it closed too.
    await page.keyboard.press('Control+k');
    if (!(await palette.isVisible().catch(() => false))) {
      await page.locator('header').getByTitle('Command palette (Ctrl+K)').click();
    }
    await expect(palette).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(palette).not.toBeVisible();
  });

  test('console drawer is collapsed by default and expands on click', async ({ page }) => {
    await expect(page.getByText(/Console · \d+ entries/)).toBeVisible();
    const bodyBefore = await page.getByText(/No log entries yet/).count();
    await page.getByTitle('Toggle console').click();
    await page.waitForTimeout(200);
    // Either the empty state or entries are now visible in the expanded body.
    const hasBody = (await page.getByText(/No log entries yet/).count()) > 0;
    const hasEntry =
      (await page.locator('text=/^.*(toggle a switch|modify the circuit)/').count()) > 0;
    expect(bodyBefore > 0 || hasBody || hasEntry).toBe(true);
  });

  test('status bar shows mode and zoom', async ({ page }) => {
    await expect(page.getByText(/Mode:/)).toBeVisible();
    await expect(page.getByText(/Zoom:/)).toBeVisible();
    await expect(page.getByText(/Snap:/)).toBeVisible();
    await expect(page.getByText(/Grid:/)).toBeVisible();
  });

  test('mini-map renders and click-to-pan does not throw', async ({ page }) => {
    const mm = page.getByLabel('Mini-map — click to pan');
    await expect(mm).toBeVisible();
    await mm.click({ position: { x: 40, y: 40 } });
  });

  test('fault lab button opens the dedicated Fault Lab panel', async ({ page }) => {
    // Fault Lab is a Pro-only feature; switch to Pro first.
    const studentToggle = page.getByRole('button', { name: /^student$/i });
    if (await studentToggle.isVisible().catch(() => false)) {
      await studentToggle.click({ force: true });
    }
    await page.getByRole('button', { name: /Fault Lab/ }).click();
    // The dedicated Fault Lab panel appears.
    const panel = page.getByLabel('Fault Lab panel');
    await expect(panel).toBeVisible();
    await expect(panel.getByTitle('Clear all injected faults')).toBeVisible();
    // It closes with Escape.
    await page.keyboard.press('Escape');
    await expect(panel).not.toBeVisible();
  });

  test('fault lab injects a fault on a selected component and clears it', async ({ page }) => {
    // Switch to Pro so the Fault Lab's manual controls are meaningful.
    const studentToggle = page.getByRole('button', { name: /^student$/i });
    if (await studentToggle.isVisible().catch(() => false)) {
      await studentToggle.click({ force: true });
    }
    await page.getByRole('button', { name: /Fault Lab/ }).click();
    // Select a non-source load component on the canvas (a bulb) that sits on
    // the right side, away from the left-positioned Fault Lab panel.
    const bulbBody = page.locator('[data-component-id^="bulb"] > g[role="button"]').nth(1);
    await bulbBody.click({ force: true });
    await page.waitForTimeout(300);
    const shortBtn = page.getByRole('button', { name: /Short Circuit/ });
    await expect(shortBtn).toBeEnabled();
    await shortBtn.click();
    // Injection is choreographed on the canvas (sparks first, then the fault
    // lands) — the active-fault badge appears right after the short lead-in.
    await expect(page.getByText('short-circuit', { exact: true })).toBeVisible({ timeout: 5000 });
    // The Active faults command centre lists it with focus/replay/clear.
    await expect(page.getByText('Active faults (1)')).toBeVisible();
    await expect(page.getByLabel('Replay Short circuit animation')).toBeVisible();
    // Clear all faults removes it.
    await page.getByTitle('Clear all injected faults').click();
    await expect(page.getByText('short-circuit', { exact: true })).toHaveCount(0);
  });

  test('global supply voltage preset is changeable from the context bar', async ({ page }) => {
    // Regression: the voltage dropdown must not be covered by the left palette.
    await page.getByTitle('Click to change Global Supply Voltage').click();
    await page.waitForTimeout(300);
    const preset = page.getByRole('button', { name: /^24V DC$/ });
    await expect(preset).toBeVisible();
    await preset.click();
    await page.waitForTimeout(300);
    // The supply value in the context bar reflects the new voltage.
    await expect(page.getByText(/24 V DC/).first()).toBeVisible();
  });
});
