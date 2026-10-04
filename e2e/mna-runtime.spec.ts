import type { Circuit } from '@electrasim/domain';
import { type Page, expect } from '@playwright/test';
import { seriesFixture } from '../packages/domain/src/core/mnaFixtures';
import {
  heaterFixture,
  protectedBranchesFixture,
} from '../packages/domain/src/core/operatingPointFixtures';
import { transformerFixture } from '../packages/domain/src/core/transformerFixtures';
import {
  portableResult,
  runtimeAcceptanceCircuits,
} from '../packages/domain/src/simulation/runtimeFixtures';
import { simulate } from '../packages/domain/src/simulation/simulate';
import { test } from './helpers/paid-test';

async function openCircuit(page: Page, input: Circuit) {
  const circuit = {
    ...input,
    components: input.components.map((component, index) => ({
      ...component,
      x: 140 + (index % 3) * 280,
      y: 140 + Math.floor(index / 3) * 200,
    })),
  };
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: /^Import \/ Export/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await dialog
    .locator('textarea')
    .fill(JSON.stringify({ version: circuit.supply ? 2 : 1, exportedAt: 0, circuit }));
  await dialog.getByRole('button', { name: 'Import from paste' }).click();
  await expect(dialog).toContainText(
    `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByTitle('Zoom to fit all (F)').click();
}

async function run(page: Page) {
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = '/src/store/uiStore.ts';
        return (await import(path)).useUiStore.getState().simResult?.electrical?.status;
      }),
    )
    .toBe('converged');
}

async function inspect(page: Page, componentId: string) {
  // Opening the inspector changes the available canvas area between selections.
  await page.getByTitle('Zoom to fit all (F)').click();
  await page.locator(`[data-component-id="${componentId}"] [data-component-hitbox]`).click();
  await page.getByTitle(/^Properties & (Settings|Specs)$/).click();
  return page.locator(`[data-electrical-readings="${componentId}"]`);
}

test('the running application and inspector display calculated series measurements', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openCircuit(page, seriesFixture());
  await run(page);
  await expect(page.locator('[data-wire-id="feed"] .electrasim-wire-flow')).toHaveCount(1);
  const readings = await inspect(page, 'r0');
  const current = 12 / 12.21;
  await expect(readings.locator('[data-reading="voltage"]')).toHaveText(
    `${Number((current * 6).toFixed(4))} V`,
  );
  await expect(readings.locator('[data-reading="current"]')).toHaveText(
    `${Number(current.toFixed(4))} A`,
  );
  await expect(readings.locator('[data-reading="power"]')).toHaveText(
    `${Number((current ** 2 * 6).toFixed(4))} W`,
  );
  const actual = await page.evaluate(async () => {
    const ui = '/src/store/uiStore.ts';
    const worker = '/src/sim-worker/client.ts';
    const result = (await import(ui)).useUiStore.getState().simResult;
    return {
      engine: result.electricalContract.engineVersion,
      worker: (await import(worker)).simWorkerActive(),
      model: result.electrical.modelVersion,
      thermal: result.thermalData ?? null,
    };
  });
  expect(actual).toMatchObject({
    engine: 'mna-linear-2',
    worker: true,
    model: '1.5c.5.1',
    thermal: null,
  });
  expect(errors).toEqual([]);
});

test('confirmed supply edits re-solve a fixed heater and do not retain old power', async ({
  page,
}) => {
  const circuit = heaterFixture();
  // Document aliases exercise the toolbar transaction rather than an independent source edit.
  circuit.components[0] = { id: 's', type: 'live-terminal', x: 0, y: 0, state: {} };
  circuit.components.push({ id: 'n', type: 'neutral-terminal', x: 0, y: 0, state: {} });
  circuit.wires[1]!.toComponentId = 'n';
  circuit.wires[1]!.toPortIndex = 0;
  await openCircuit(page, circuit);
  await run(page);
  let readings = await inspect(page, 'heater');
  await expect(readings.locator('[data-reading="power"]')).toHaveText(
    `${Number(((230 / 26.59) ** 2 * 26.45).toFixed(4))} W`,
  );
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await page.getByTitle('Click to change Global Supply Voltage').click();
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply kind').selectOption('dc');
  await dialog.getByLabel('Supply voltage in volts').fill('12');
  await dialog.getByRole('button', { name: 'Apply supply change' }).click();
  await run(page);
  readings = await inspect(page, 'heater');
  await expect(readings.locator('[data-reading="power"]')).toHaveText(
    `${Number(((12 / 26.59) ** 2 * 26.45).toFixed(4))} W`,
  );
  await expect(
    page.locator('[data-tour="inspector"]').getByLabel('Power rating in watts'),
  ).toHaveValue('2000');
});

test('an isolated transformer displays separate winding and load measurements', async ({
  page,
}) => {
  await openCircuit(page, transformerFixture());
  await run(page);
  const readings = await inspect(page, 'tx');
  await expect(readings).toContainText('Primary terminal voltage:');
  await expect(readings).toContainText('Secondary terminal voltage:');
  await expect(readings).toContainText('galvanically-isolated');
  const load = await inspect(page, 'r');
  const ratio = 230 / 12;
  const loadVoltage = (6 * (230 / ratio)) / (6.14 + 0.14 / ratio ** 2);
  await expect(load.locator('[data-reading="voltage"]')).toHaveText(
    `${Number(loadVoltage.toFixed(4))} V`,
  );
});

test('an open return has live potential, zero current and no current-flow animation', async ({
  page,
}) => {
  const circuit = heaterFixture();
  circuit.wires.pop();
  await openCircuit(page, circuit);
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Circuit readiness' })
    .getByRole('button', { name: 'Run diagnostic' })
    .click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = '/src/store/uiStore.ts';
        return (await import(path)).useUiStore.getState().simResult?.wireStates?.feed;
      }),
    )
    .toMatchObject({ fromPotentialVolts: 230, toPotentialVolts: 230, carryingCurrent: false });
  const wire = page.locator('[data-wire-id="feed"]');
  await expect(wire.locator('.electrasim-wire-flow')).toHaveCount(0);
  await wire.press('Enter');
  await page.getByTitle('Simulation Telemetry & Faults', { exact: true }).click();
  await expect(page.locator('[data-tour="inspector"]')).toContainText('LIVE · ZERO CURRENT');
  await expect(page.locator('[data-wire-readings="feed"]')).toContainText(
    'From potential: 230.0000 V',
  );
});

test('branch protection shows its own current and leaves timed operation unassessed', async ({
  page,
}) => {
  await openCircuit(page, protectedBranchesFixture());
  await run(page);
  const readings = await inspect(page, 'lamp-breaker');
  await expect(readings).toContainText('Overcurrent rating (In): 1 A');
  await expect(readings).toContainText('Trip and damage: unassessed');
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  const state = await page.evaluate(async () => {
    const path = '/src/store/uiStore.ts';
    const result = (await import(path)).useUiStore.getState().simResult;
    return {
      currents: result.electrical.deviceCurrents.filter(
        (item: { componentId: string }) => item.componentId === 'lamp-breaker',
      ),
      trips: result.trippedComponents ?? [],
    };
  });
  expect(state.currents[0].currentAmps).toBeLessThan(1);
  expect(state.trips).toEqual([]);
});

test('unsupported LED measurements remain unavailable with an explicit legacy notice', async ({
  page,
}) => {
  const circuit = heaterFixture();
  circuit.components[1]!.type = 'bulb';
  circuit.components[1]!.state = {};
  await openCircuit(page, circuit);
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  const readings = await inspect(page, 'heater');
  await expect(readings).toContainText('legacy observations');
  await expect(readings.locator('[data-reading="voltage"]')).toHaveText('Unavailable');
  await expect(readings.locator('[data-reading="current"]')).toHaveText('Unavailable');
  await expect(readings.locator('[data-reading="power"]')).toHaveText('Unavailable');
});

test('all acceptance circuits agree across direct domain, real Comlink and local Hono', async ({
  page,
}) => {
  test.setTimeout(90_000);
  await openCircuit(page, seriesFixture());
  const circuits = runtimeAcceptanceCircuits();
  const browser = await page.evaluate(async (fixtures) => {
    const path = '/src/sim-worker/client.ts';
    const client = await import(path);
    const rows = [];
    for (const [name, circuit] of Object.entries(fixtures)) {
      const worker = await client.simulateAsync(circuit, { standard: 'int', appMode: 'pro' });
      const response = await fetch('/api/simulator/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuit, standard: 'int' }),
      });
      rows.push({
        name,
        status: response.status,
        server: await response.json(),
        worker: JSON.parse(
          JSON.stringify(worker, (_key, value) => (value instanceof Set ? [...value] : value)),
        ),
      });
    }
    return { rows, active: client.simWorkerActive() };
  }, circuits);
  expect(browser.active).toBe(true);
  for (const row of browser.rows) {
    expect(row.status, row.name).toBe(200);
    expect(row.worker, row.name).toEqual(
      portableResult(simulate(circuits[row.name]!, { standard: 'int', appMode: 'pro' })),
    );
    expect(row.server, row.name).toEqual(row.worker);
  }
});
