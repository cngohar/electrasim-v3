import { expect, test } from '@playwright/test';
import { damageCircuit } from '../packages/domain/src/core/damageFixtures';
import { activateControl, openCircuitTools, openInspector } from './helpers/workbench';

for (const width of [1280, 390])
  test(`built Fault Lab draft, capture and separate clear work at ${width}px`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => {
      localStorage.setItem('electrasim:welcomed', '1');
      localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('/app/');
    await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
    await activateControl(page, page.getByRole('button', { name: /^Import \/ Export/ }));
    const importer = page.getByRole('dialog');
    await activateControl(page, importer.getByRole('button', { name: 'Import', exact: true }));
    const base = damageCircuit();
    const circuit = {
      ...base,
      components: base.components.map((component, index) => ({
        ...component,
        x: 140 + index * 280,
        y: 180,
      })),
    };
    await importer.locator('textarea').fill(JSON.stringify({ version: 2, exportedAt: 0, circuit }));
    await activateControl(page, importer.getByRole('button', { name: 'Import from paste' }));
    await expect(importer).toContainText('Loaded 3 components, 3 wires.');
    await page.keyboard.press('Escape');
    await openInspector(page, 'lamp');
    await openCircuitTools(page);
    await activateControl(
      page,
      page.getByTitle('Basic Student Mode active — click to switch to Pro Electrician Mode'),
    );
    await activateControl(page, page.locator('[data-tour="fault-lab"]'));
    const panel = page.getByLabel('Fault Lab panel');
    await expect(panel.getByText('Follow the failure.')).toBeVisible();
    await activateControl(page, panel.getByRole('button', { name: /Browse fault library/ }));
    const catalogue = page.getByRole('dialog', { name: 'Fault library', exact: true });
    await expect(catalogue.locator('.fault-lab-library button')).toHaveCount(14);
    await activateControl(page, catalogue.getByRole('button', { name: /Open Circuit Break/ }));
    const review = page.getByRole('dialog', { name: 'Review fault edit' });
    await expect(review.locator('[data-fault-target-diagram]')).toHaveAttribute(
      'data-fault-target-id',
      'lamp',
    );
    await activateControl(page, review.getByRole('button', { name: 'Apply fault edit' }));
    await expect(panel.locator('[data-active-fault="open-circuit"]')).toBeVisible();
    await expect(panel.locator('.fault-lab-stage [data-fault-target-diagram]')).toHaveAttribute(
      'data-fault-target-id',
      'lamp',
    );
    const canvas = page.getByRole('application', { name: 'Circuit diagram' });
    await expect(canvas.locator('[data-fault-fx="open-circuit"]')).toHaveCount(1);
    const badgeDrift = await canvas.locator('[data-fault-chip="open-circuit"]').evaluate((node) => {
      const chip = node as SVGGElement;
      const parent = chip.parentElement as unknown as SVGGElement;
      const placement = chip.transform.baseVal.consolidate()!.matrix;
      const expected = new DOMPoint(placement.e, placement.f).matrixTransform(
        parent.getScreenCTM()!,
      );
      const actual = new DOMPoint(0, 0).matrixTransform(chip.getScreenCTM()!);
      return Math.hypot(expected.x - actual.x, expected.y - actual.y);
    });
    expect(badgeDrift).toBeLessThan(1);
    await activateControl(page, panel.getByRole('button', { name: 'Circuit', exact: true }));
    const overview = panel.getByRole('img', { name: 'Current circuit topology overview' });
    await expect(overview).toBeVisible();
    await expect(overview.locator('[data-component-symbol]')).toHaveCount(
      circuit.components.length,
    );
    await expect(overview.locator('[data-fault-overview-wire]')).toHaveCount(circuit.wires.length);
    await expect(overview.locator('[data-fault-fx="open-circuit"]')).toHaveCount(1);
    await activateControl(page, panel.getByRole('button', { name: 'Inside', exact: true }));
    await expect(panel.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
    await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
    await activateControl(
      page,
      page
        .getByRole('dialog', { name: 'Circuit readiness' })
        .getByRole('button', { name: 'Run diagnostic' }),
    );
    await expect(panel.getByText('Fresh captured response', { exact: true })).toBeVisible();
    await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
    await activateControl(page, panel.getByRole('button', { name: 'Response', exact: true }));
    await activateControl(page, panel.getByRole('button', { name: 'Replay', exact: true }));
    await activateControl(
      page,
      panel.getByRole('button', {
        name: 'Clear all injected faults from the active list',
        exact: true,
      }),
    );
    await expect(panel.locator('[data-active-fault]')).toHaveCount(0);
    await expect(canvas.locator('[data-fault-fx]')).toHaveCount(0);
    await expect(panel.locator('[data-fault-application-state="applied"]')).toHaveCount(0);
    await expect(panel.getByText(/Stale response/)).toBeVisible();
    expect(errors).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page
      .locator('.table-dialog-panel')
      .filter({ has: panel })
      .evaluate((node) => {
        node.scrollTop = 0;
      });
    await page.screenshot({ path: `.wrangler/phase111-built-${width}.png`, fullPage: true });
    await activateControl(page, panel.getByRole('button', { name: 'Console', exact: true }));
    const consolePanel = page.getByLabel('Console messages');
    await activateControl(
      page,
      consolePanel.getByRole('button', { name: 'Warnings', exact: true }),
    );
    await activateControl(
      page,
      consolePanel.getByRole('button', { name: /^Focus target for Applied Open Circuit Break/ }),
    );
    await expect(consolePanel).not.toBeVisible();
    await expect(
      page.locator('[data-component-id="lamp"] [data-component-hitbox]'),
    ).toHaveAttribute('aria-label', /selected/);
  });
