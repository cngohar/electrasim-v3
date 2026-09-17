import { expect, test } from '@playwright/test';

/**
 * Zs / disconnection checker panel (Inspector → Circuit Safety & Validation).
 * Verifies the panel renders real computed values for a guided template and
 * reacts to the earthing-arrangement (Ze) selector.
 */

const RCBO_TEMPLATE = 'rcbo-protected-socket';

test.describe('zs check panel', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 640,
      'inspector drawer interaction is a desktop/tablet flow',
    );
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
      window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('shows per-device Zs verdicts with BS 7671 max-Zs values, reactive to Ze', async ({
    page,
  }) => {
    // `?template=` deep-links the guide straight onto the canvas (both confirm
    // prompts are auto-accepted above); the Guided Circuits picker is not
    // involved. The checklist panel is a lazily-imported chunk.
    await page.goto(`/?template=${RCBO_TEMPLATE}`);
    await expect(page.getByRole('heading', { name: 'RCBO-Protected Socket' })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: 'Circuit Safety & Validation' }).click();

    const panel = page.getByTestId('zs-check-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Zs / Disconnection Check');

    // The template's RCBO is a 20 A device on a 2.5 mm² socket radial (In ≤ Iz),
    // so the panel must name the rating it actually used and show that device's
    // A4:2026 Cmin-corrected Zs limit — not the catalogue default in the label.
    await expect(panel).toContainText('RCBO (20 A)');
    await expect(panel).toContainText('Max Zs (Type B 20A) = 2.19 Ω');
    await expect(panel.locator('[data-zs-verdict]').first()).toBeVisible();

    // TN-C-S is the default; switching to TN-S raises Ze and the computed Zs.
    const zsCell = panel.getByText(/^Zs = Ze /).first();
    await expect(zsCell).toContainText('Ze 0.35');
    await panel.getByLabel(/Earthing arrangement/).selectOption('TN-S');
    await expect(zsCell).toContainText('Ze 0.80');
  });
});
