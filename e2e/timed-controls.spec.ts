import type { Circuit, SimulationResult } from '@electrasim/domain';
import type { ElectricalSimulationState } from '@electrasim/domain/core/contracts';
import { type Page, expect, test } from '@playwright/test';
import { controlCircuit, setControlSwitch } from '../packages/domain/src/core/controlFixtures';
import { portableResult } from '../packages/domain/src/simulation/runtimeFixtures';
import { simulate } from '../packages/domain/src/simulation/simulate';

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

async function inspectRelay(page: Page) {
  await page.getByTitle('Zoom to fit all (F)').click();
  await page.locator('[data-component-id="relay"] [data-component-hitbox]').click();
  await page.getByTitle(/^Properties & (Settings|Specs)$/).click();
}

async function runtime(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/store/uiStore.ts';
    const client = '/src/sim-worker/client.ts';
    const result = (await import(path)).useUiStore.getState().simResult;
    return {
      coil: result?.coilStates?.relay,
      no: result?.energizedComponents.has('no'),
      nc: result?.energizedComponents.has('nc'),
      time: result?.simulationState?.elapsedSeconds,
      current: result?.componentCalculations?.relay.currentAmps,
      worker: (await import(client)).simWorkerActive(),
      engine: result?.electrical?.engineVersion,
    };
  });
}

test('guest Run advances a declared coil through Comlink, displays current, drops out and resets', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openCircuit(
    page,
    setControlSwitch(controlCircuit({ onDelaySeconds: 0.3, offDelaySeconds: 0.2 }), false),
  );
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await expect.poll(async () => (await runtime(page)).coil).toBe(false);
  await page.locator('[data-component-id="switch"] [data-component-hitbox]').press('Enter');
  await expect.poll(async () => (await runtime(page)).coil).toBe(true);
  const on = await runtime(page);
  expect(on).toMatchObject({ no: true, nc: false, worker: true, engine: 'mna-controls-2' });
  expect(on.current).toBeCloseTo(12 / (144 + 3 * 0.0175), 8);
  await inspectRelay(page);
  await expect(page.getByRole('button', { name: 'Apply coil model' })).toBeDisabled();
  await expect(
    page.locator('[data-electrical-readings="relay"] [data-reading="current"]'),
  ).toHaveText('0.0833 A');
  await page.getByTitle('Zoom to fit all (F)').click();
  await page.locator('[data-component-id="switch"] [data-component-hitbox]').press('Enter');
  await expect.poll(async () => (await runtime(page)).coil).toBe(false);
  expect(await runtime(page)).toMatchObject({ no: false, nc: true });
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect.poll(async () => (await runtime(page)).time).toBeUndefined();
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await expect.poll(async () => (await runtime(page)).coil).toBe(false);
  expect((await runtime(page)).time).toBeLessThan(0.5);
  expect(errors).toEqual([]);
});

test('explicit coil settings support Apply, Undo/Redo and reload without persisting timer state', async ({
  page,
}) => {
  const circuit = controlCircuit();
  circuit.components.find((c) => c.id === 'relay')!.state.coilModel = undefined;
  await openCircuit(page, circuit);
  await inspectRelay(page);
  await page.getByLabel('Coil nominal voltage (V)', { exact: true }).fill('12');
  await page.getByLabel('Coil nominal real power (W)', { exact: true }).fill('1');
  await page.getByLabel('Coil on delay (s)', { exact: true }).fill('1');
  await page.getByLabel('Coil off delay (s)', { exact: true }).fill('0.25');
  await page.getByRole('button', { name: 'Apply coil model' }).click();
  const settings = () =>
    page.evaluate(async () => {
      const path = '/src/store/circuitStore.ts';
      return (
        (await import(path)).useCircuitStore
          .getState()
          .components.find((c: { id: string }) => c.id === 'relay')?.state.coilModel ?? null
      );
    });
  await expect.poll(settings).toMatchObject({
    version: 1,
    supply: { kind: 'dc', voltage: 12 },
    nominalPowerWatts: 1,
    onDelaySeconds: 1,
    offDelaySeconds: 0.25,
  });
  await page.keyboard.press('Control+z');
  await expect.poll(settings).toBeNull();
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(settings).toMatchObject({ supply: { voltage: 12 } });
  // Wait on the real IndexedDB persistence module, not just in-memory state.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('keyval-store');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          return await new Promise<number | undefined>((resolve, reject) => {
            const request = db
              .transaction('keyval')
              .objectStore('keyval')
              .get('electrasim:circuit:v1');
            request.onsuccess = () =>
              resolve(
                request.result?.circuit?.components.find((c: { id: string }) => c.id === 'relay')
                  ?.state.coilModel?.nominalPowerWatts,
              );
            request.onerror = () => reject(request.error);
          });
        } finally {
          db.close();
        }
      }),
    )
    .toBe(1);
  await page.reload();
  await expect.poll(settings).toMatchObject({ nominalPowerWatts: 1, onDelaySeconds: 1 });
  expect((await runtime(page)).time).toBeUndefined();
});

test('real Comlink preserves deterministic step, replay and final measurements', async ({
  page,
}) => {
  await openCircuit(page, controlCircuit());
  const circuit = controlCircuit();
  const inputs = [
    { circuit, deltaSeconds: 0 },
    { circuit, deltaSeconds: 0.999 },
    { circuit, deltaSeconds: 0.001 },
    { circuit: setControlSwitch(circuit, false), deltaSeconds: 0.25 },
  ];
  let previous: SimulationResult | undefined;
  const expected = inputs.map((input) => {
    previous = simulate(input.circuit, {
      simulationState: previous?.simulationState,
      deltaSeconds: input.deltaSeconds,
    });
    return portableResult(previous);
  });
  const actual = await page.evaluate(async (steps) => {
    const path = '/src/sim-worker/client.ts';
    const client = await import(path);
    const results = [];
    let state: ElectricalSimulationState | undefined;
    for (const step of steps) {
      const result = await client.simulateAsync(step.circuit, {
        simulationState: state,
        deltaSeconds: step.deltaSeconds,
      });
      state = result.simulationState;
      results.push(
        JSON.parse(
          JSON.stringify(result, (_key, value) => (value instanceof Set ? [...value] : value)),
        ),
      );
    }
    return { results, worker: client.simWorkerActive() };
  }, inputs);
  expect(actual.worker).toBe(true);
  expect(actual.results).toEqual(expected);
});
