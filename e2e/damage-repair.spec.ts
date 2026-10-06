import { readFile } from 'node:fs/promises';
import type { Circuit } from '@electrasim/domain';
import { ELECTRICAL_MODEL_VERSION } from '@electrasim/domain/core/contracts';
import { type Page, expect, test } from '@playwright/test';
import { damageCircuit } from '../packages/domain/src/core/damageFixtures';
import { protectionCircuit } from '../packages/domain/src/core/protectionFixtures';

test.use({ reducedMotion: 'reduce' });

async function openCircuit(page: Page, circuit: Circuit) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: /^Import \/ Export/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await dialog.locator('textarea').fill(JSON.stringify({ version: 2, exportedAt: 0, circuit }));
  await dialog.getByRole('button', { name: 'Import from paste' }).click();
  await expect(dialog).toContainText(
    `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page
    .getByTitle('Basic Student Mode active — click to switch to Pro Electrician Mode')
    .click();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
}

async function faultPanel(page: Page) {
  const panel = page.getByLabel('Fault Lab panel');
  if (!(await panel.isVisible())) {
    const name =
      (page.viewportSize()?.width ?? 1280) < 640
        ? 'Fault Lab'
        : 'Fault Lab (manual fault injection)';
    await page.getByRole('button', { name, exact: true }).click();
  }
  await expect(panel.getByLabel('Fault repair and reset')).toBeVisible();
  return panel;
}

async function runtime(page: Page) {
  return page.evaluate(async () => {
    const uiPath = '/src/store/uiStore.ts';
    const storePath = '/src/store/circuitStore.ts';
    const clientPath = '/src/sim-worker/client.ts';
    const ui = (await import(uiPath)).useUiStore.getState();
    const circuit = (await import(storePath)).useCircuitStore.getState();
    return {
      running: ui.simRunning,
      time: ui.simResult?.simulationState?.elapsedSeconds,
      watts: ui.simResult?.componentCalculations?.lamp?.powerWatts,
      tripped: ui.simResult?.simulationState?.protection?.control?.tripped,
      wires: circuit.wires,
      components: circuit.components,
      faults: circuit.faults,
      history: ui.eventHistory,
      logs: ui.logs.map((l: { message: string }) => l.message),
      worker: (await import(clientPath)).simWorkerActive(),
    };
  });
}

async function run(page: Page, diagnostic = false) {
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  if (diagnostic) {
    await page
      .getByRole('dialog', { name: 'Circuit readiness' })
      .getByRole('button', { name: 'Run diagnostic', exact: true })
      .click();
  }
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  const override = page.getByRole('button', { name: 'Run anyway (teacher/demo)', exact: true });
  await expect(stop.or(override)).toBeVisible();
  if (!(await stop.isVisible())) await override.click();
  await expect(stop).toBeVisible();
}

test('guest cable damage persists through fault clearing and replacement preserves an injected break', async ({
  page,
}) => {
  // Two simulation cycles plus import/export can exceed the default 30 s on a
  // cold dev server. Keep each behavior's existing polling deadline intact.
  test.setTimeout(60_000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openCircuit(page, damageCircuit());
  // Keyboard activation selects this wire even where the SVG paths overlap.
  const wire = page.locator('[data-wire-hitbox][data-wire-id="load-feed"]');
  await wire.press('Enter');
  await expect(wire).toHaveAttribute('aria-pressed', 'true');
  let panel = await faultPanel(page);
  await expect(panel.getByRole('button', { name: 'Apply damage model' })).toBeEnabled();
  await run(page);
  await expect
    .poll(
      async () =>
        (await runtime(page)).wires.find((w: { id: string }) => w.id === 'load-feed')?.isBusted,
      { timeout: 20000 },
    )
    .toBe(true);
  panel = await faultPanel(page);
  await expect(panel.getByRole('button', { name: 'Apply damage model' })).toBeDisabled();
  await expect(
    panel.getByRole('button', { name: 'Replace wire #load-fee', exact: true }),
  ).toBeDisabled();
  await panel.getByTitle('Clear all injected faults', { exact: true }).click();
  expect(
    (await runtime(page)).wires.find((w: { id: string }) => w.id === 'load-feed')?.isBusted,
  ).toBe(true);
  expect((await runtime(page)).worker).toBe(true);
  await panel.getByRole('button', { name: /^Open Circuit/ }).click();
  await expect.poll(async () => (await runtime(page)).faults.length).toBe(1);
  const injectedFaults = (await runtime(page)).faults;
  expect(injectedFaults[0]).toMatchObject({
    type: 'open-circuit',
    target: { type: 'wire', id: 'load-feed' },
  });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  const download = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  const file = await download;
  const saved = JSON.parse(await readFile((await file.path())!, 'utf8')) as { circuit: Circuit };
  expect(saved.circuit.wires.find((w) => w.id === 'load-feed')).toMatchObject({
    isBusted: true,
    damageModel: { kind: 'overcurrent' },
  });
  expect('simulationState' in saved.circuit).toBe(false);
  await panel.getByRole('button', { name: 'Replace wire #load-fee', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await runtime(page)).wires.find((w: { id: string }) => w.id === 'load-feed')?.isBusted,
    )
    .toBe(false);
  expect((await runtime(page)).faults).toEqual(injectedFaults);
  await run(page, true);
  await expect.poll(async () => (await runtime(page)).watts, { timeout: 20000 }).toBe(0);
  panel = await faultPanel(page);
  await panel.getByTitle('Clear all injected faults', { exact: true }).click();
  await expect
    .poll(
      async () =>
        (await runtime(page)).wires.find((w: { id: string }) => w.id === 'load-feed')?.isBusted,
      { timeout: 20000 },
    )
    .toBe(true);
  expect(
    (await runtime(page)).history.filter(
      (e: { eventType: string }) => e.eventType === 'wire_melted',
    ),
  ).toHaveLength(2);
  expect(errors).toEqual([]);
});

test('guest edits a voltage damage budget and sees one measured event through Comlink', async ({
  page,
}) => {
  await openCircuit(page, damageCircuit('device-voltage'));
  await page.locator('[data-component-id="lamp"] [data-component-hitbox]').click();
  let panel = await faultPanel(page);
  await panel.getByLabel('Damage stress budget', { exact: true }).fill('3000');
  await panel.getByRole('button', { name: 'Apply damage model' }).click();
  await run(page);
  await expect
    .poll(
      async () =>
        (await runtime(page)).components.find((c: { id: string }) => c.id === 'lamp')?.state
          .isBlown,
      { timeout: 20000 },
    )
    .toBe(true);
  panel = await faultPanel(page);
  await expect(panel.getByLabel('Damage model and readings')).toContainText(
    'Open — replacement required.',
  );
  const state = await runtime(page);
  const history = state.history.filter(
    (e: { eventType: string }) => e.eventType === 'component_blown',
  );
  expect(history).toHaveLength(1);
  expect(history[0].details.voltage).toBeGreaterThan(229);
  expect(history[0].details.voltage).toBeLessThan(230);
  expect(history[0].details.modelVersion).toBe(ELECTRICAL_MODEL_VERSION);
  expect(state.worker).toBe(true);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await panel.getByRole('button', { name: 'Replace all damaged items' }).click();
  await expect
    .poll(
      async () =>
        (await runtime(page)).components.find((c: { id: string }) => c.id === 'lamp')?.state
          .isBlown,
    )
    .toBe(false);
  expect(
    (await runtime(page)).components.find((c: { id: string }) => c.id === 'lamp')?.state.damageModel
      .withstandVoltSquaredSeconds,
  ).toBe(3000);
});

test('a timed short trips without destruction; clearing and resetting restores operation', async ({
  page,
}) => {
  await openCircuit(page, protectionCircuit('mcb', 16));
  await page.locator('[data-component-id="lamp"] [data-component-hitbox]').click();
  await run(page);
  await expect.poll(async () => (await runtime(page)).time, { timeout: 20000 }).toBeGreaterThan(0);
  let panel = await faultPanel(page);
  await panel.getByRole('button', { name: /^Short Circuit/ }).click();
  await expect.poll(async () => (await runtime(page)).tripped, { timeout: 20000 }).toBe(true);
  await panel.getByTitle('Clear all injected faults', { exact: true }).click();
  await expect.poll(async () => (await runtime(page)).faults.length).toBe(0);
  expect((await runtime(page)).tripped).toBe(true);
  await panel.getByRole('button', { name: /^Reset .* to OFF$/ }).click();
  await expect.poll(async () => (await runtime(page)).tripped, { timeout: 20000 }).toBe(false);
  await page.locator('[data-component-id="control"] [data-component-hitbox]').click();
  await page.getByTitle(/^Properties & (Settings|Specs)$/).click();
  await page.getByRole('button', { name: 'OPEN (OFF)', exact: true }).click();
  await expect
    .poll(async () => (await runtime(page)).watts, { timeout: 20000 })
    .toBeGreaterThan(990);
  expect(
    (await runtime(page)).components.some((c: { state: { isBlown?: boolean } }) => c.state.isBlown),
  ).toBe(false);
  panel = await faultPanel(page);
  await expect(panel.getByRole('button', { name: 'Replace all damaged items' })).toHaveCount(0);
});

test('damage settings remain usable on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCircuit(page, damageCircuit('device-current'));
  await page.locator('[data-component-id="lamp"] [data-component-hitbox]').click();
  const panel = await faultPanel(page);
  await panel.getByLabel('Damage threshold', { exact: true }).fill('3');
  await panel.getByLabel('Damage stress budget', { exact: true }).fill('20');
  await panel.getByRole('button', { name: 'Apply damage model' }).click();
  await expect
    .poll(
      async () =>
        (await runtime(page)).components.find((c: { id: string }) => c.id === 'lamp')?.state
          .damageModel.continuousCurrentAmps,
    )
    .toBe(3);
  expect(
    (await runtime(page)).components.find((c: { id: string }) => c.id === 'lamp')?.state.damageModel
      .withstandAmpSquaredSeconds,
  ).toBe(20);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true);
  await panel.getByRole('button', { name: 'Apply damage model' }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: test.info().outputPath('damage-settings-phone.png') });
  await page
    .getByRole('dialog', { name: 'Fault Lab', exact: true })
    .getByRole('button', { name: 'Close dialog', exact: true })
    .click();
  await expect(page.getByRole('button', { name: 'Fault Lab', exact: true })).toBeFocused();
  await page
    .getByTitle('Pro Electrician Mode active — click to switch to Basic Student Mode')
    .click();
  await expect(page.getByRole('button', { name: 'Fault Lab', exact: true })).toHaveCount(0);
});
