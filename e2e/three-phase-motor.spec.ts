import type { ElectricalSimulationState } from '@electrasim/domain/core/contracts';
import { type Page, expect } from '@playwright/test';
import {
  motorAcceptanceCircuits,
  motorCircuit,
  motorFixtureModel,
} from '../packages/domain/src/core/motorFixtures';
import { dolAcceptanceCircuits } from '../packages/domain/src/simulation/dolFixtures';
import { portableResult } from '../packages/domain/src/simulation/runtimeFixtures';
import { simulate } from '../packages/domain/src/simulation/simulate';
import { test } from './helpers/paid-test';
import { documentAt, inspect, openCircuit, run } from './helpers/three-phase';

async function runtime(page: Page) {
  return page.evaluate(async () => {
    const ui = '/src/store/uiStore.ts';
    const worker = '/src/sim-worker/client.ts';
    const result = (await import(ui)).useUiStore.getState().simResult;
    return {
      motor: result?.phasor?.motors[0]?.state,
      coil: result?.coilStates?.k,
      worker: (await import(worker)).simWorkerActive(),
      energized: result?.energizedComponents.has('motor'),
      scalar: !!result?.electrical,
      faultsCleared: result?.faultsCleared,
    };
  });
}

test('motor model editing uses explicit electrical input, Undo/Redo, restore and running locks', async ({
  page,
}) => {
  const circuit = motorCircuit();
  circuit.components[1]!.state.motorModel = undefined;
  await openCircuit(page, circuit);
  const inspector = await inspect(page, 'motor');
  const values = [
    ['Motor nominal L-L voltage (V)', '400'],
    ['Motor electrical input power (W)', '3000'],
    ['Motor frequency (Hz)', '50'],
    ['Motor minimum L-L voltage (V)', '360'],
    ['Motor maximum L-L voltage (V)', '440'],
    ['Motor maximum voltage unbalance (%)', '2'],
  ];
  for (const [label, value] of values) await inspector.getByLabel(label!).fill(value!);
  await inspector.getByRole('button', { name: 'Apply motor model' }).click();
  await expect
    .poll(async () => (await documentAt(page)).components[1]!.state.motorModel)
    .toEqual(motorFixtureModel());
  await page.locator('svg[data-circuit-canvas]').focus();
  await page.keyboard.press('Control+z');
  await expect
    .poll(async () => (await documentAt(page)).components[1]!.state.motorModel)
    .toBeUndefined();
  await page.keyboard.press('Control+y');
  await expect
    .poll(async () => (await documentAt(page)).components[1]!.state.motorModel)
    .toEqual(motorFixtureModel());
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise((resolve) => {
            const request = indexedDB.open('keyval-store');
            request.onsuccess = () => {
              const db = request.result;
              const read = db
                .transaction('keyval')
                .objectStore('keyval')
                .get('electrasim:circuit:v1');
              read.onsuccess = () => {
                db.close();
                resolve(read.result?.circuit?.components[1]?.state?.motorModel);
              };
            };
          }),
      ),
    )
    .toEqual(motorFixtureModel());
  await page.reload();
  await expect
    .poll(async () => (await documentAt(page)).components[1]?.state.motorModel)
    .toEqual(motorFixtureModel());
  await run(page);
  await inspect(page, 'motor');
  await expect(inspector.getByRole('button', { name: 'Apply motor model' })).toBeDisabled();
  await expect(inspector.locator('[data-motor-state="running"]')).toBeVisible();
  await expect(inspector.locator('[data-motor-line="0"]')).toHaveText('4.3245 A');
});

test('actual Comlink coil pickup/dropout drives all poles, motor artwork and sensed residual', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openCircuit(page, motorCircuit(true));
  await run(page);
  await expect
    .poll(() => runtime(page))
    .toEqual({
      motor: 'running',
      coil: true,
      worker: true,
      energized: true,
      scalar: false,
      faultsCleared: false,
    });
  const inspector = await inspect(page, 'k');
  await expect(inspector.locator('[data-phasor-control="k"]')).toContainText('closed');
  await expect(inspector.locator('[data-reading="residual"]')).toHaveText('0 mA');
  await expect(inspector.getByRole('button', { name: 'Apply coil model' })).toBeDisabled();
  const k = page.locator('[data-component-id="k"] [data-component-hitbox]');
  await expect(k).toHaveAttribute('aria-pressed', 'true');
  await k.press('Enter');
  await expect(k).toHaveAttribute('aria-pressed', 'true');
  await inspector.locator('[data-phasor-control="k"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: '.wrangler/phase15e2-contactor-desktop.png' });
  await page.locator('[data-component-id="control"] [data-component-hitbox]').press('Enter');
  await expect
    .poll(() => runtime(page))
    .toEqual({
      motor: 'stopped',
      coil: false,
      worker: true,
      energized: false,
      scalar: false,
      faultsCleared: false,
    });
  await expect(k).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('runtime phase loss blocks the motor despite backfeed and clearing the input restores teaching operation', async ({
  page,
}) => {
  await openCircuit(page, motorCircuit(true));
  await run(page);
  await expect.poll(async () => (await runtime(page)).motor).toBe('running');
  await page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    (await import(path)).useCircuitStore.getState().setWireFault('out1', 'open-circuit');
  });
  await expect.poll(async () => (await runtime(page)).motor).toBe('blocked');
  const inspector = await inspect(page, 'motor');
  await expect(inspector.locator('[data-motor-state="blocked"]')).toContainText(
    'L1 / missing / L3',
  );
  expect((await runtime(page)).energized).toBe(false);
  await page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    (await import(path)).useCircuitStore.getState().setWireFault('out1', undefined);
  });
  await expect.poll(async () => (await runtime(page)).motor).toBe('running');
  expect((await runtime(page)).faultsCleared).toBe(false);
});

test('phone properties show blocked sequence and lock the shared motor controls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCircuit(page, motorAcceptanceCircuits()['reversed-leads']!);
  await run(page);
  await page.evaluate(async () => {
    const path = '/src/store/electricalEditing.ts';
    (await import(path)).useElectricalEditing.setState({ inspectComponentId: 'motor' });
  });
  const dialog = page.getByRole('dialog', { name: 'Component properties' });
  await expect(dialog.locator('[data-motor-state="blocked"]')).toContainText('Sequence: ACB');
  await expect(dialog.getByRole('button', { name: 'Apply motor model' })).toBeDisabled();
  await dialog.locator('[data-motor-state="blocked"]').scrollIntoViewIfNeeded();
  await expect(dialog.locator('[data-motor-state="blocked"]')).toBeVisible();
  await page.screenshot({ path: '.wrangler/phase15e2-motor-phone.png' });
});

test('motor and delayed contactor replay match direct domain, Comlink and local Hono exactly', async ({
  page,
}) => {
  await openCircuit(page, motorCircuit());
  const cases = { ...motorAcceptanceCircuits(), ...dolAcceptanceCircuits() };
  const rows = await page.evaluate(async (circuits) => {
    const path = '/src/sim-worker/client.ts';
    const worker = await import(path);
    const rows = [];
    for (const [name, circuit] of Object.entries(circuits)) {
      let state: ElectricalSimulationState | undefined;
      for (const deltaSeconds of [0, 0.999999, 0.000001]) {
        const result = await worker.simulateAsync(circuit, {
          standard: 'int',
          appMode: 'pro',
          simulationState: state,
          deltaSeconds,
        });
        const response = await fetch('/api/simulator/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ circuit, simulationState: state, deltaSeconds }),
        });
        rows.push({
          name,
          deltaSeconds,
          status: response.status,
          server: await response.json(),
          worker: JSON.parse(
            JSON.stringify(result, (_key, value) => (value instanceof Set ? [...value] : value)),
          ),
        });
        state = result.simulationState;
      }
    }
    return rows;
  }, cases);
  let previous: ElectricalSimulationState | undefined;
  let name: string | undefined;
  for (const row of rows) {
    if (row.name !== name) {
      name = row.name;
      previous = undefined;
    }
    const result = simulate(cases[row.name]!, {
      standard: 'int',
      appMode: 'pro',
      deltaSeconds: row.deltaSeconds,
      simulationState: previous,
    });
    expect(row.status, row.name).toBe(200);
    expect(row.worker, row.name).toEqual(portableResult(result));
    expect(row.server, row.name).toEqual(row.worker);
    previous = result.simulationState;
  }
});
