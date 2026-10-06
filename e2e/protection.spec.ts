import type { Circuit } from '@electrasim/domain';
import { type Page, expect, test } from '@playwright/test';
import {
  protectionCircuit,
  rcdBalancedCircuit,
} from '../packages/domain/src/core/protectionFixtures';

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
  await dialog.locator('textarea').fill(JSON.stringify({ version: 1, exportedAt: 0, circuit }));
  await dialog.getByRole('button', { name: 'Import from paste' }).click();
  await expect(dialog).toContainText(
    `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
  );
  await page.keyboard.press('Escape');
  await page.getByTitle('Zoom to fit all (F)').click();
}

async function runtime(page: Page) {
  return page.evaluate(async () => {
    const uiPath = '/src/store/uiStore.ts';
    const clientPath = '/src/sim-worker/client.ts';
    const storePath = '/src/store/circuitStore.ts';
    const ui = (await import(uiPath)).useUiStore.getState();
    const result = ui.simResult;
    return {
      contact: result?.protectionContactStates?.control,
      time: result?.simulationState?.elapsedSeconds,
      tripped: result?.simulationState?.protection?.control?.tripped ?? null,
      reason: result?.simulationState?.protection?.control?.reason ?? null,
      lamp: result?.componentCalculations?.lamp?.currentAmps,
      worker: (await import(clientPath)).simWorkerActive(),
      settings:
        (await import(storePath)).useCircuitStore
          .getState()
          .components.find((c: { id: string }) => c.id === 'control')?.state.protectionModel ??
        null,
      logs: ui.logs.map((log: { message: string }) => log.message),
    };
  });
}

async function inspectControl(page: Page) {
  await page.getByTitle('Zoom to fit all (F)').click();
  await page.locator('[data-component-id="control"] [data-component-hitbox]').click();
  await page.getByTitle(/^Properties & (Settings|Specs)$/).click();
}

test('guest MCB trips instantaneously through the real Comlink worker', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openCircuit(page, protectionCircuit('mcb', 0.5));
  await inspectControl(page);
  await expect(page.getByRole('button', { name: 'Apply protection model' })).toBeEnabled();
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Apply protection model' })).toBeDisabled();
  await expect
    .poll(
      async () =>
        (await runtime(page)).logs.some((l: string) =>
          l.includes('protection tripped (short-circuit)'),
        ),
      { timeout: 20000 },
    )
    .toBe(true);
  await expect.poll(async () => (await runtime(page)).contact, { timeout: 20000 }).toBe(false);
  expect((await runtime(page)).tripped).toBe(true);
  expect((await runtime(page)).reason).toBe('short-circuit');
  expect((await runtime(page)).worker).toBe(true);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  expect((await runtime(page)).time).toBeUndefined();
  await expect.poll(async () => (await runtime(page)).settings).not.toBeNull();
  expect(errors).toEqual([]);
});

test('guest fuse melts on its declared I2t budget and reports the thermal trip', async ({
  page,
}) => {
  await openCircuit(page, protectionCircuit('fuse', 1));
  await inspectControl(page);
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await expect
    .poll(
      async () =>
        (await runtime(page)).logs.some((l: string) =>
          l.includes('fuse operated; replacement required'),
        ),
      { timeout: 20000 },
    )
    .toBe(true);
  await expect.poll(async () => (await runtime(page)).contact, { timeout: 20000 }).toBe(false);
  expect((await runtime(page)).reason).toBe('overload');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
});

test('a balanced two-pole RCD never trips', async ({ page }) => {
  await openCircuit(page, rcdBalancedCircuit());
  await page.locator(`[data-component-id="control"] [data-component-hitbox]`).click();
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await expect.poll(async () => (await runtime(page)).time, { timeout: 20000 }).toBeGreaterThan(1);
  expect((await runtime(page)).contact).toBe(true);
  expect((await runtime(page)).tripped).toBe(false);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
});
