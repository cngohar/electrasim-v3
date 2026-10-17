import { FAULT_REGISTRY } from '@electrasim/domain';
import { expect } from '@playwright/test';
import { importProfileCircuit } from './helpers/catalogue-profiles';
import { faultCardNames, scenarios } from './helpers/fault-scenarios';
import { test } from './helpers/paid-test';
import { activateControl, fitCanvas, openCircuitTools, openInspector } from './helpers/workbench';

const unavailable = new Set([
  'switched-neutral',
  'live-to-earth',
  'smooth-dc-residual',
  'arc-fault',
]);
const gated = new Set(['reverse-polarity', 'short-circuit']);
if (scenarios.length !== Object.keys(FAULT_REGISTRY).length)
  throw new Error('Fault registry/scenario drift');

for (const scenario of scenarios)
  test(`FL-01–03 ${scenario.fault}: cancel, apply, duplicate, Run, clear, Undo/Redo and reapply`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    await importProfileCircuit(page, scenario.circuit);
    if (scenario.target.type === 'wire') {
      await fitCanvas(page);
      await page.locator(`[data-wire-id="${scenario.target.id}"]`).press('Enter');
    } else await openInspector(page, scenario.target.id);
    const tools = await openCircuitTools(page);
    const basic = page.getByTitle(
      'Basic Student Mode active — click to switch to Pro Electrician Mode',
    );
    if (await basic.isVisible()) await activateControl(page, basic);
    await activateControl(page, tools.locator('[data-tour="fault-lab"]'));
    const panel = page.getByLabel('Fault Lab panel');
    await expect(panel).toBeVisible();
    if (scenario.terminal !== undefined)
      await panel.getByLabel('Fault target terminal').selectOption(String(scenario.terminal));
    const choose = async () => {
      await activateControl(page, panel.getByRole('button', { name: /Browse fault library/ }));
      const library = page.getByRole('dialog', { name: 'Fault library', exact: true });
      const card = library.getByRole('button', { name: faultCardNames[scenario.fault] });
      return { library, card };
    };
    const first = await choose();
    await activateControl(page, first.card);
    const review = page.getByRole('dialog', { name: 'Review fault edit', exact: true });
    await expect(review.locator('[data-fault-target-diagram]')).toHaveAttribute(
      'data-fault-target-id',
      scenario.target.id,
    );
    await activateControl(page, review.getByRole('button', { name: 'Cancel', exact: true }));
    await expect(panel.locator('[data-active-fault]')).toHaveCount(0);
    const next = await choose();
    await activateControl(page, next.card);
    await activateControl(page, review.getByRole('button', { name: 'Apply fault edit' }));
    await expect(panel.locator(`[data-active-fault="${scenario.fault}"]`)).toHaveCount(1);
    const applied = await choose();
    await expect(applied.card).toContainText('Applied');
    await activateControl(page, applied.card);
    await expect(review).not.toBeVisible();
    await expect(
      page.locator('[data-notification]').filter({ hasText: 'already applied' }),
    ).toBeVisible();
    await expect(panel.locator('[data-active-fault]')).toHaveCount(1);

    await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
    const readiness = page.getByRole('dialog', { name: 'Circuit readiness', exact: true });
    const validation = page.getByRole('dialog', { name: 'Validation and Zs', exact: true });
    await expect
      .poll(
        async () =>
          (await readiness.isVisible()) ||
          (await validation.isVisible()) ||
          (await page.getByRole('button', { name: 'Stop', exact: true }).isVisible()),
      )
      .toBe(true);
    if (await readiness.isVisible())
      await activateControl(
        page,
        readiness.getByRole('button', { name: /^Run diagnostic$|^Run with findings$/ }),
      );
    if (gated.has(scenario.fault)) {
      await expect(
        validation.getByRole('button', { name: 'Run anyway (teacher/demo)', exact: true }),
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Stop', exact: true })).not.toBeVisible();
      await activateControl(
        page,
        validation.getByRole('button', { name: 'Return to Fault Lab', exact: true }),
      );
      await expect(panel.locator('[data-run-state="blocked"]')).toBeVisible();
      await activateControl(
        page,
        page.getByRole('button', { name: 'Run Simulation', exact: true }),
      );
      await activateControl(
        page,
        validation.getByRole('button', { name: 'Run anyway (teacher/demo)', exact: true }),
      );
      const alert = page.getByRole('dialog', { name: 'Electrical fault alert', exact: true });
      if (await alert.isVisible())
        await activateControl(
          page,
          alert.getByRole('button', { name: 'Close modal', exact: true }),
        );
      await activateControl(
        page,
        validation.getByRole('button', { name: 'Return to Fault Lab', exact: true }),
      );
    }
    await expect(panel).toBeVisible();
    await expect(
      panel.locator(
        `[data-run-state="${unavailable.has(scenario.fault) ? 'unavailable' : 'captured'}"]`,
      ),
    ).toBeVisible({ timeout: 15_000 });
    if (scenario.terminal !== undefined)
      await expect(panel.getByLabel('Fault target terminal')).toHaveValue(
        String(scenario.terminal),
      );
    await page.screenshot({ path: testInfo.outputPath('run-state.png'), animations: 'disabled' });
    const stop = page.getByRole('button', { name: 'Stop', exact: true });
    if (await stop.isVisible()) await activateControl(page, stop);
    const alert = page.getByRole('dialog', { name: 'Electrical fault alert', exact: true });
    if (await alert.isVisible())
      await activateControl(page, alert.getByRole('button', { name: 'Close modal', exact: true }));
    await activateControl(
      page,
      panel.locator('[data-active-fault]').getByRole('button', {
        name: `Clear ${FAULT_REGISTRY[scenario.fault].label}`,
        exact: true,
      }),
    );
    await expect(panel.locator('[data-active-fault]')).toHaveCount(0);
    await expect(page.locator('[data-circuit-canvas] [data-fault-fx]')).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(panel.locator('[data-active-fault]')).toHaveCount(1);
    await page.keyboard.press('Control+Shift+z');
    await expect(panel.locator('[data-active-fault]')).toHaveCount(0);
    const reapply = await choose();
    await expect(reapply.card).not.toContainText('Applied');
    await activateControl(page, reapply.card);
    await activateControl(page, review.getByRole('button', { name: 'Apply fault edit' }));
    await expect(panel.locator('[data-active-fault]')).toHaveCount(1);
  });
