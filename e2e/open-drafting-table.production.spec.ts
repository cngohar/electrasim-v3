import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
});

for (const phone of [false, true]) {
  test.describe(phone ? 'built phone redesign' : 'built desktop redesign', () => {
    test.use({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 } });

    test('delivers the centered shell, physical artwork, photo and advanced window', async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/app/');
      const shelf = page.locator('[data-workspace-library]');
      await expect(shelf).toBeVisible();
      const bounds = await shelf.boundingBox();
      expect(bounds?.x).toBe(0);
      expect(bounds?.width).toBe(phone ? 390 : 1440);
      const header = await page.locator('.table-command-bar').boundingBox();
      expect(Math.abs(header!.x + header!.width / 2 - (phone ? 195 : 720))).toBeLessThan(1);
      await page.getByRole('button', { name: 'Fit', exact: true }).click();
      const lamp = page.locator('[data-component-id^="bulb-"]').first();
      await expect(lamp.locator('[data-device-art] image')).toBeVisible();
      await expect(lamp.locator('svg[x="68"][width="25"]')).toBeVisible();
      await lamp.locator('[data-component-hitbox]').click();
      const inspector = page.getByRole('complementary', { name: 'Inspector', exact: true });
      if (!(await inspector.isVisible()))
        await page
          .locator('.table-top-right')
          .getByRole('button', { name: 'Inspect', exact: true })
          .click();
      await expect(inspector).toBeVisible();
      for (const name of ['Properties', 'Readings', 'Configure'])
        await expect(inspector.getByRole('button', { name, exact: true })).toBeVisible();
      await inspector.getByRole('button', { name: /Real component reference/ }).click();
      const photo = page.getByRole('dialog', { name: /reference photo$/ });
      await expect
        .poll(() => photo.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
        .toBeGreaterThan(0);
      await page.keyboard.press('Escape');
      await expect(photo).not.toBeVisible();
      await inspector.getByRole('button', { name: 'Detailed model settings' }).click();
      const model = page.getByRole('dialog', { name: /· detailed settings$/ });
      await expect(model).toBeVisible();
      await expect(model.locator('.table-model-content')).toContainText('Simulation readings');
      const columns = await model
        .locator('.table-model-content > div')
        .evaluate((node) => getComputedStyle(node).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(phone ? 1 : 2);
      await expect
        .poll(() =>
          model
            .locator('.table-dialog-panel')
            .evaluate((node) => Number(getComputedStyle(node).opacity)),
        )
        .toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath('built-model.png') });
      await page.keyboard.press('Escape');
      await expect(model).not.toBeVisible();
      expect(errors).toEqual([]);
    });

    test('applies a basic draft with Undo and applies the motion preference', async ({
      page,
    }, info) => {
      await page.goto('/app/');
      await page.getByRole('button', { name: 'Fit', exact: true }).click();
      await page.locator('[data-component-id^="bulb-"] [data-component-hitbox]').first().click();
      const inspector = page.getByRole('complementary', { name: 'Inspector', exact: true });
      if (!(await inspector.isVisible()))
        await page
          .locator('.table-top-right')
          .getByRole('button', { name: 'Inspect', exact: true })
          .click();
      await inspector.getByRole('button', { name: 'Configure', exact: true }).click();
      const label = inspector.getByLabel('Component label');
      const original = await label.inputValue();
      await label.fill('Built lighting circuit');
      await inspector.getByRole('button', { name: 'Apply settings' }).click();
      await expect(label).toHaveValue('Built lighting circuit');
      await page.getByTitle(/Undo \(/).click();
      await expect(label).toHaveValue(original);
      await page.getByRole('button', { name: 'Settings', exact: true }).click();
      const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
      await settings.getByRole('button', { name: 'Display', exact: true }).click();
      await settings.getByRole('button', { name: 'No animation', exact: true }).click();
      await settings.getByRole('button', { name: 'Done', exact: true }).click();
      await inspector.getByRole('button', { name: 'Collapse Inspector' }).click();
      await expect(inspector).toHaveCount(0);
      await page.getByRole('button', { name: 'Console', exact: true }).click();
      const logs = page.locator('[data-workspace-console]');
      for (const name of ['All', 'Errors', 'Warnings', 'Info'])
        await expect(logs.getByRole('button', { name, exact: true })).toBeVisible();
      await logs.getByRole('button', { name: 'Close Console' }).click();
      await expect(logs).toHaveCount(0);
      await page.screenshot({ path: info.outputPath('built-workspace.png') });
    });

    test('catalogue placement uses the bundled physical image on the actual canvas', async ({
      page,
    }) => {
      await page.goto('/app/');
      await page.getByRole('button', { name: /Browse all components|Browse$/ }).click();
      const catalogue = page.getByRole('dialog', { name: 'Component library' });
      await catalogue.getByLabel('Show all / fault exercise').check();
      await catalogue.getByLabel('Search components').fill('junction');
      const tile = catalogue.locator('[data-palette-type="junction-box"]');
      const artwork = await tile.locator('img').getAttribute('src');
      await tile.click();
      await expect(catalogue).not.toBeVisible();
      const point = await page.locator('[data-circuit-canvas]').evaluate((canvas) => {
        const b = canvas.getBoundingClientRect();
        for (const [x, y] of [
          [0.3, 0.3],
          [0.45, 0.4],
          [0.6, 0.55],
          [0.3, 0.65],
        ]) {
          const point = { x: b.x + b.width * x!, y: b.y + b.height * y! };
          const hit = document.elementFromPoint(point.x, point.y);
          if (hit && canvas.contains(hit) && !hit.closest('[data-component-id],[data-wire-id]'))
            return point;
        }
        throw Error('No exposed canvas background for placement');
      });
      await page.mouse.click(point.x, point.y);
      await expect(page.locator('[data-device-art="junction-box"] image')).toHaveAttribute(
        'href',
        artwork!,
      );
    });
  });
}
