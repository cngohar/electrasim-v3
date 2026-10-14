import { type Page, expect, test } from '@playwright/test';
import { activateControl, openCircuitTools, openInspector } from './helpers/workbench';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  await expect(page.locator('[data-circuit-canvas]')).toBeVisible();
});
const documentAt = (page: Page) =>
  page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    const { useCircuitStore, selectCircuit } = await import(path);
    return selectCircuit(useCircuitStore.getState());
  });
const selectedLoad = async (page: Page) =>
  (await documentAt(page)).components.find(
    (component: { type: string }) => component.type === 'bulb-incandescent',
  )!.id;

test('centered commands and full-width shelf leave an unobstructed canvas across sizes', async ({
  page,
}, info) => {
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 640, height: 780 },
    { width: 390, height: 844 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    const shelf = await page.locator('[data-workspace-library]').boundingBox();
    const header = await page.locator('.table-command-bar').boundingBox();
    expect(shelf?.x).toBe(0);
    expect(shelf?.width).toBe(viewport.width);
    expect((shelf?.y ?? 0) + (shelf?.height ?? 0)).toBe(viewport.height);
    expect(Math.abs(header!.x + header!.width / 2 - viewport.width / 2)).toBeLessThan(1);
    expect(header!.width).toBeLessThan(viewport.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    for (const selector of [
      '.table-command-bar button[data-tour="run"]',
      '.table-browse',
      '.table-console-trigger',
      '.table-top-right button[aria-label="Inspect"]',
    ]) {
      const target = page.locator(selector);
      await expect(target).toBeVisible();
      expect(
        await target.evaluate((node) => {
          const b = node.getBoundingClientRect();
          const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
          return hit !== null && node.contains(hit);
        }),
      ).toBe(true);
    }
    await page.screenshot({ path: info.outputPath(`workspace-${viewport.width}.png`) });
  }
});

test('Properties preserves the reference photo and Configure applies a basic draft in one Undo', async ({
  page,
}, info) => {
  const id = await selectedLoad(page);
  const inspector = await openInspector(page, id);
  const before = await documentAt(page);
  await activateControl(page, inspector.getByRole('button', { name: /Real component reference/ }));
  const photo = page.getByRole('dialog', { name: /reference photo$/ });
  await expect(photo).toBeVisible();
  await expect(photo.locator('img')).toHaveJSProperty('complete', true);
  await page.keyboard.press('Escape');
  await expect(photo).not.toBeVisible();
  await activateControl(page, inspector.getByRole('button', { name: 'Detailed model settings' }));
  const model = page.getByRole('dialog', { name: /· detailed settings$/ });
  await expect(model.locator('.table-model-content')).toContainText('Simulation readings');
  const closing = await model
    .getByRole('button', { name: 'Close dialog' })
    .evaluate(async (button: HTMLButtonElement) => {
      button.click();
      await new Promise<void>((resolve) => queueMicrotask(resolve));
      const dialog = button.closest('dialog');
      return {
        state: dialog?.getAttribute('data-surface-state'),
        title: dialog?.querySelector('h2')?.textContent,
        content: dialog?.querySelector('.table-model-content')?.textContent,
      };
    });
  expect(closing.state).toBe('closing');
  expect(closing.title).toContain('· detailed settings');
  expect(closing.content).toContain('Simulation readings');
  await activateControl(page, inspector.getByRole('button', { name: 'Configure', exact: true }));
  await inspector.getByLabel('Component label').fill('Landing lamp');
  await inspector.getByLabel('Power rating in watts').fill('40');
  expect(await documentAt(page)).toEqual(before);
  await activateControl(page, inspector.getByRole('button', { name: 'Reset draft' }));
  await expect(inspector.getByLabel('Component label')).not.toHaveValue('Landing lamp');
  await inspector.getByLabel('Component label').fill('Landing lamp');
  await inspector.getByLabel('Power rating in watts').fill('40');
  await activateControl(page, inspector.getByRole('button', { name: 'Apply settings' }));
  await expect
    .poll(
      async () =>
        (await documentAt(page)).components.find((c: { id: string }) => c.id === id)?.state
          .customPowerWatts,
    )
    .toBe(40);
  await expect(inspector.getByLabel('Component label')).toHaveValue('Landing lamp');
  await page.screenshot({ path: info.outputPath('configure.png') });
  await activateControl(page, page.getByTitle(/Undo \(/));
  expect(await documentAt(page)).toEqual(before);
});

test('quick variants retain terminal and ratings review, cancel and undo', async ({ page }) => {
  const id = await selectedLoad(page);
  const inspector = await openInspector(page, id);
  const before = await documentAt(page);
  await activateControl(page, inspector.getByRole('button', { name: 'Configure', exact: true }));
  await inspector.getByLabel('Component variant').selectOption('bulb-halogen');
  const review = page.getByRole('dialog', { name: 'Replace component variant' });
  await expect(review).toBeVisible();
  expect(await documentAt(page)).toEqual(before);
  await activateControl(page, review.getByRole('button', { name: 'Cancel', exact: true }));
  await expect(review).not.toBeVisible();
  expect(await documentAt(page)).toEqual(before);
  await inspector.getByLabel('Component variant').selectOption('bulb-halogen');
  await activateControl(page, review.getByRole('button', { name: 'Apply replacement' }));
  await expect(review).not.toBeVisible();
  await expect
    .poll(
      async () =>
        (await documentAt(page)).components.find((c: { id: string }) => c.id === id)?.type,
    )
    .toBe('bulb-halogen');
  const notice = page.locator('output').filter({ hasText: 'Replaced Incandescent' });
  await activateControl(page, notice.getByRole('button', { name: 'Undo', exact: true }));
  expect(await documentAt(page)).toEqual(before);
});

test('wire draft combines label, length, area and material with atomic Undo', async ({ page }) => {
  const before = await documentAt(page);
  const wire = before.wires[0];
  // Keyboard selection uses the same public SVG target as pointer interaction.
  await page.getByRole('button', { name: `Wire ${wire.id}`, exact: true }).press('Enter');
  const inspector = page.getByRole('complementary', { name: 'Inspector', exact: true });
  if (!(await inspector.isVisible()))
    await activateControl(page, page.getByRole('button', { name: 'Inspect', exact: true }));
  await activateControl(page, inspector.getByRole('button', { name: 'Configure', exact: true }));
  await inspector.getByLabel('Wire label').fill('Lighting feed');
  await inspector.getByLabel('Wire length in meters').fill('12');
  await inspector.getByLabel('Wire size in mm2').fill('4');
  await activateControl(page, inspector.getByRole('button', { name: 'Aluminum Al', exact: true }));
  expect(await documentAt(page)).toEqual(before);
  await activateControl(page, inspector.getByRole('button', { name: 'Apply settings' }));
  await expect
    .poll(
      async () =>
        (await documentAt(page)).wires.find((w: { id: string }) => w.id === wire.id)?.material,
    )
    .toBe('aluminum');
  const after = await documentAt(page);
  expect(after.wires.find((w: { id: string }) => w.id === wire.id)).toMatchObject({
    label: 'Lighting feed',
    lengthMeters: 12,
    customCableMm2: 4,
    material: 'aluminum',
  });
  expect(after.components).toEqual(before.components);
  await activateControl(page, page.getByTitle(/Undo \(/));
  expect(await documentAt(page)).toEqual(before);
});

test('Console has visible filters and Clear leaves faults and event history intact', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const path = '/src/store/uiStore.ts';
    const { useUiStore } = await import(path);
    useUiStore.getState().addLog('Example error', 'error');
    useUiStore.getState().addLog('Example warning', 'warning');
    useUiStore.getState().addLog('Example info', 'info');
    useUiStore.getState().addEventHistory({
      eventType: 'manual_intervention',
      description: 'Kept history',
      severity: 'info',
    });
  });
  const original = await documentAt(page);
  await activateControl(page, page.getByRole('button', { name: 'Console', exact: true }));
  const consolePanel = page.locator('[data-workspace-console]');
  await expect(consolePanel).toBeVisible();
  await activateControl(page, consolePanel.getByRole('button', { name: 'Errors', exact: true }));
  await expect(consolePanel).toContainText('Example error');
  await expect(consolePanel).not.toContainText('Example warning');
  await activateControl(page, consolePanel.getByRole('button', { name: 'Warnings', exact: true }));
  await expect(consolePanel).toContainText('Example warning');
  await activateControl(page, consolePanel.getByRole('button', { name: 'Clear', exact: true }));
  await expect(consolePanel).toContainText('No messages');
  expect(await documentAt(page)).toEqual(original);
  expect(
    await page.evaluate(async () => {
      const path = '/src/store/uiStore.ts';
      return (await import(path)).useUiStore
        .getState()
        .eventHistory.some(
          (entry: { description: string }) => entry.description === 'Kept history',
        );
    }),
  ).toBe(true);
});

test('Console stays reachable during guides without ending the walkthrough', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept());
  await page.goto('/?template=simple-lamp');
  const guide = page.locator('.table-guide');
  await expect(guide).toBeVisible();
  const consoleButton = page.getByRole('button', { name: 'Console', exact: true });
  const hit = (target: ReturnType<Page['locator']>) =>
    target.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const picked = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return picked !== null && node.contains(picked);
    });
  expect(await hit(consoleButton)).toBe(true);
  await activateControl(page, consoleButton);
  const consolePanel = page.locator('[data-workspace-console]');
  await expect(consolePanel).toBeVisible();
  expect(await hit(consolePanel.getByRole('button', { name: 'All', exact: true }))).toBe(true);
  await activateControl(page, consolePanel.getByRole('button', { name: 'Close Console' }));
  const showGuide = page.getByRole('button', { name: 'Show guide steps' });
  if (await showGuide.isVisible()) await activateControl(page, showGuide);
  expect(
    await page.evaluate(async () => {
      const path = '/src/store/uiStore.ts';
      return (await import(path)).useUiStore.getState().activeGuideId;
    }),
  ).toBe('simple-lamp');
  const end = guide.getByRole('button', { name: 'End guide', exact: true });
  expect(await hit(end)).toBe(true);
  await activateControl(page, end);
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await expect(page.getByRole('button', { name: /^Diagnosis Lab/ })).toHaveCount(0);
});

test('Inspector and Console retain exits, cancel stale closes and honor manual reduced motion', async ({
  page,
}) => {
  await activateControl(page, page.getByRole('button', { name: 'Inspect', exact: true }));
  const inspector = page.locator('.table-inspector');
  await expect(inspector).toHaveAttribute('data-surface-state', 'open');
  await inspector
    .getByRole('button', { name: 'Collapse Inspector' })
    .evaluate((button: HTMLButtonElement) => button.click());
  await expect(inspector).toHaveAttribute('data-surface-state', 'closing');
  await page
    .getByRole('button', { name: 'Inspect', exact: true })
    .evaluate((button: HTMLButtonElement) => button.click());
  await page.waitForTimeout(200);
  await expect(inspector).toBeVisible();
  await activateControl(page, page.getByRole('button', { name: 'Settings', exact: true }));
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await activateControl(page, settings.getByRole('button', { name: 'Display', exact: true }));
  await activateControl(page, settings.getByRole('button', { name: 'No animation', exact: true }));
  await activateControl(page, settings.getByRole('button', { name: 'Done', exact: true }));
  await expect(settings).not.toBeVisible();
  await activateControl(page, inspector.getByRole('button', { name: 'Collapse Inspector' }));
  await expect(inspector).toHaveCount(0);
  await activateControl(page, page.getByRole('button', { name: 'Console', exact: true }));
  const consolePanel = page.locator('[data-workspace-console]');
  await activateControl(page, consolePanel.getByRole('button', { name: 'Close Console' }));
  await expect(consolePanel).toHaveCount(0);
});

test('catalogue includes the full artwork registry and placement uses the same canvas body', async ({
  page,
}) => {
  await activateControl(page, page.getByRole('button', { name: /Browse all components|Browse$/ }));
  const catalogue = page.getByRole('dialog', { name: 'Component library' });
  await catalogue.getByLabel('Show all / fault exercise').check();
  await catalogue.getByLabel('Search components').fill('junction');
  const tile = catalogue.locator('[data-palette-type="junction-box"]');
  await expect(tile.locator('img')).toBeVisible();
  const image = await tile.locator('img').getAttribute('src');
  await activateControl(page, tile);
  await expect(catalogue).not.toBeVisible();
  const point = await page.locator('[data-circuit-canvas]').evaluate((canvas) => {
    const box = canvas.getBoundingClientRect();
    for (const [x, y] of [
      [0.3, 0.3],
      [0.45, 0.4],
      [0.6, 0.55],
      [0.3, 0.65],
    ]) {
      const point = { x: box.x + box.width * x, y: box.y + box.height * y };
      const hit = document.elementFromPoint(point.x, point.y);
      if (hit && canvas.contains(hit) && !hit.closest('[data-component-id],[data-wire-id]'))
        return point;
    }
    throw Error('No exposed canvas background for placement');
  });
  await page.mouse.click(point.x, point.y);
  await expect(page.locator('[data-device-art="junction-box"] image')).toHaveAttribute(
    'href',
    image!,
  );
});

test('context arrangement preserves multi-selection and uses direct undoable actions', async ({
  page,
}) => {
  const before = await documentAt(page);
  const ids = before.components
    .filter((c: { type: string }) =>
      ['mcb', 'single-way-switch', 'bulb-incandescent'].includes(c.type),
    )
    .map((c: { id: string }) => c.id);
  expect(ids).toHaveLength(3);
  await activateControl(page, page.getByRole('button', { name: 'Fit', exact: true }));
  for (const id of ids)
    await page
      .locator(`[data-component-id="${id}"] [data-component-hitbox]`)
      .click({ modifiers: ['Shift'] });
  const target = page.locator(`[data-component-id="${ids[2]}"] [data-component-hitbox]`);
  await target.click({ button: 'right' });
  const menu = page.locator('.table-context-menu');
  await expect(menu.getByRole('group', { name: 'Align', exact: true })).toBeVisible();
  await expect(menu.getByRole('group', { name: 'Distribute', exact: true })).toBeVisible();
  await expect(menu.getByRole('group', { name: 'Rotate', exact: true })).toBeVisible();
  await activateControl(page, menu.getByRole('button', { name: 'Align left edges', exact: true }));
  const aligned = (await documentAt(page)).components.filter((c: { id: string }) =>
    ids.includes(c.id),
  );
  expect(new Set(aligned.map((c: { x: number }) => c.x)).size).toBe(1);
  expect((await documentAt(page)).wires).toEqual(before.wires);
  await activateControl(page, page.getByTitle(/Undo \(/));
  expect(await documentAt(page)).toEqual(before);
  await target.click({ button: 'right' });
  await activateControl(
    page,
    menu.getByRole('button', { name: 'Rotate clockwise 90 degrees', exact: true }),
  );
  for (const c of (await documentAt(page)).components.filter((c: { id: string }) =>
    ids.includes(c.id),
  ))
    expect(c.rotation).toBe(90);
  expect((await documentAt(page)).wires).toEqual(before.wires);
  await activateControl(page, page.getByTitle(/Undo \(/));
  expect(await documentAt(page)).toEqual(before);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('all settings sections and file/account windows stay within the viewport', async ({
  page,
}, info) => {
  await activateControl(page, page.getByRole('button', { name: 'Settings', exact: true }));
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  for (const name of ['Editing', 'Display', 'Simulation', 'Backup', 'About']) {
    await activateControl(page, settings.getByRole('button', { name, exact: true }));
    await page.screenshot({ path: info.outputPath(`settings-${name}.png`) });
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
  await page.keyboard.press('Escape');
  await expect(settings).not.toBeVisible();
  await activateControl(page, page.getByRole('button', { name: 'Open file import and export' }));
  const files = page.getByRole('dialog', { name: 'Import and export circuit' });
  for (const name of ['Export', 'Import', 'Saved circuits']) {
    await activateControl(page, files.getByRole('button', { name, exact: true }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
  }
  await page.keyboard.press('Escape');
  const tools = await openCircuitTools(page);
  await expect(tools.getByTitle('Guided circuits')).toBeVisible();
  await expect(tools.getByRole('button', { name: 'Diagnosis Lab', exact: true })).toHaveCount(0);
});
