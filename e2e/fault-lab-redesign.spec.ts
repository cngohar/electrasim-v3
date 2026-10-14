import { type Page, expect } from '@playwright/test';
import { seriesFixture } from '../packages/domain/src/core/mnaFixtures';
import { protectionCircuit } from '../packages/domain/src/core/protectionFixtures';
import { test } from './helpers/paid-test';
import { documentAt, openCircuit } from './helpers/three-phase';
import { activateControl, openCircuitTools, openInspector } from './helpers/workbench';

async function openLab(page: Page, target = 'r0') {
  await openInspector(page, target);
  await openCircuitTools(page);
  const mode = page.getByTitle(
    'Basic Student Mode active — click to switch to Pro Electrician Mode',
  );
  if (await mode.isVisible()) await activateControl(page, mode);
  await activateControl(page, page.locator('[data-tour="fault-lab"]'));
  return page.getByLabel('Fault Lab panel');
}
async function draft(page: Page, type: RegExp) {
  const panel = page.getByLabel('Fault Lab panel');
  await activateControl(page, panel.getByRole('button', { name: /Browse fault library/ }));
  await activateControl(
    page,
    page
      .getByRole('dialog', { name: 'Fault library', exact: true })
      .getByRole('button', { name: type }),
  );
  return page.getByRole('dialog', { name: 'Review fault edit' });
}
async function runFresh(page: Page) {
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  const readiness = page.getByRole('dialog', { name: 'Circuit readiness' });
  await expect
    .poll(
      async () =>
        (await readiness.isVisible()) ||
        (await page.getByRole('button', { name: 'Stop', exact: true }).isVisible()) ||
        (await page
          .getByRole('button', { name: 'Run anyway (teacher/demo)', exact: true })
          .isVisible()),
    )
    .toBe(true);
  if (await readiness.isVisible())
    await activateControl(
      page,
      readiness.getByRole('button', { name: 'Run diagnostic', exact: true }),
    );
  const override = page.getByRole('button', { name: 'Run anyway (teacher/demo)', exact: true });
  if (await override.isVisible()) await activateControl(page, override);
  await expect(
    page.getByLabel('Fault Lab panel').getByText('Fresh captured response', { exact: true }),
  ).toBeVisible();
}

test('reviewed Apply, fresh capture and playback keep edits and presentation separate', async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await openCircuit(page, seriesFixture());
  const panel = await openLab(page);
  const before = await documentAt(page);
  const review = await draft(page, /Open Circuit Break/);
  await activateControl(page, review.getByRole('button', { name: 'Cancel', exact: true }));
  expect(await documentAt(page)).toEqual(before);
  await runFresh(page);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  await activateControl(
    page,
    (await draft(page, /Open Circuit Break/)).getByRole('button', { name: 'Apply fault edit' }),
  );
  await expect(panel.locator('[data-active-fault="open-circuit"]')).toBeVisible();
  await expect(panel.getByText(/Stale response/)).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Play', exact: true })).toBeDisabled();
  await runFresh(page);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  const captured = await documentAt(page);
  await activateControl(page, panel.getByRole('button', { name: 'Response', exact: true }));
  await panel.getByLabel('Playback speed').selectOption('2');
  await activateControl(page, panel.getByRole('button', { name: 'Replay', exact: true }));
  await activateControl(page, panel.getByRole('button', { name: 'Compare previous', exact: true }));
  expect(await documentAt(page)).toEqual(captured);
  await activateControl(page, panel.getByRole('tab', { name: 'Readings', exact: true }));
  await expect(panel.getByText('Source branches')).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Fault Lab', exact: true })).not.toHaveAttribute(
    'aria-modal',
    'true',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  const viewport = page.viewportSize()!;
  const shelf = await page.locator('[data-workspace-library]').boundingBox();
  const bounds = await page.locator('.table-dialog-panel').filter({ has: panel }).boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThan(shelf!.y);
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  await page.screenshot({ path: `.wrangler/phase111-${info.project.name}.png`, fullPage: true });
  await activateControl(page, panel.getByRole('button', { name: 'Console', exact: true }));
  const consolePanel = page.getByLabel('Console messages');
  await activateControl(page, consolePanel.getByRole('button', { name: 'Warnings', exact: true }));
  const focus = consolePanel.getByRole('button', {
    name: /^Focus target for Applied Open Circuit Break/,
  });
  await expect(focus).toBeVisible();
  await page.locator('[data-component-id="r1"] [data-component-hitbox]').press('Enter');
  await activateControl(page, focus);
  await expect(page.locator('[data-component-id="r0"] [data-component-hitbox]')).toHaveAttribute(
    'aria-label',
    /selected/,
  );
});

test('named terminal drafting preserves topology and the no-photo wire reference is honest', async ({
  page,
}) => {
  await openCircuit(page, seriesFixture());
  const panel = await openLab(page);
  const before = await documentAt(page);
  await panel.getByLabel('Fault target terminal').selectOption('0');
  await activateControl(
    page,
    (await draft(page, /Loose \/ Disconnected Terminal/)).getByRole('button', {
      name: 'Apply fault edit',
    }),
  );
  await expect(panel.locator('[data-active-fault="terminal-disconnect"]')).toBeVisible();
  const after = await documentAt(page);
  expect(after.faults?.[0]?.target).toEqual({ type: 'port', componentId: 'r0', portIndex: 0 });
  expect(after.wires).toEqual(before.wires);
  expect(after.components).toEqual(before.components);
  await activateControl(
    page,
    panel.getByRole('button', {
      name: 'Clear all injected faults from the active list',
      exact: true,
    }),
  );
  await expect(panel.locator('[data-active-fault]')).toHaveCount(0);
});

test('protected short presents the recorded trip and keeps cause clearing separate from reset and ON', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await openCircuit(page, protectionCircuit('mcb', 16));
  const panel = await openLab(page, 'lamp');
  await runFresh(page);
  await activateControl(
    page,
    (await draft(page, /Dead Short Circuit/)).getByRole('button', { name: 'Apply fault edit' }),
  );
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = '/src/store/uiStore.ts';
        return (await import(path)).useUiStore.getState().simResult?.simulationState?.protection
          ?.control?.tripped;
      }),
    )
    .toBe(true);
  await activateControl(page, panel.getByRole('tab', { name: 'Readings', exact: true }));
  await expect(panel.getByText(/protection-trip at .* s simulated time/)).toBeVisible();
  await activateControl(
    page,
    panel.getByRole('button', {
      name: 'Clear all injected faults from the active list',
      exact: true,
    }),
  );
  await activateControl(page, panel.getByRole('tab', { name: 'Repair', exact: true }));
  const reset = panel.getByRole('button', { name: /^Reset .* to OFF$/ });
  await expect(reset).toBeVisible();
  await activateControl(page, reset);
  await expect
    .poll(() =>
      documentAt(page).then((c) => c.components.find((item) => item.id === 'control')?.state.on),
    )
    .toBe(false);
  await expect(panel.getByRole('button', { name: /^Switch .* ON$/ })).toBeVisible();
});
