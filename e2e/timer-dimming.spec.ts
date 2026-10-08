import type { Circuit, SimulationResult } from '@electrasim/domain';
import type { ElectricalSimulationState } from '@electrasim/domain/core/contracts';
import { type Page, expect, test } from '@playwright/test';
import {
  dimmingCircuit,
  timerCircuit,
  timerDimmingAcceptanceCircuits,
} from '../packages/domain/src/core/timerDimmingFixtures';
import { portableResult } from '../packages/domain/src/simulation/runtimeFixtures';
import { simulate } from '../packages/domain/src/simulation/simulate';
import { activateControl, inspectComponent } from './helpers/workbench';

// Generic inspector cases use the desktop surface on every browser engine.
// Explicit phone cases below retain their 390 px viewport.
test.use({ viewport: { width: 1280, height: 900 } });

async function openCircuit(page: Page, circuit: Circuit) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await activateControl(page, page.getByRole('button', { name: /^Import \/ Export/ }));
  const dialog = page.getByRole('dialog');
  await activateControl(page, dialog.getByRole('button', { name: 'Import', exact: true }));
  await dialog.locator('textarea').fill(JSON.stringify({ version: 1, exportedAt: 0, circuit }));
  await activateControl(page, dialog.getByRole('button', { name: 'Import from paste' }));
  await expect(dialog).toContainText(
    `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
  );
  await page.keyboard.press('Escape');
  await page.getByTitle('Zoom to fit all (F)').click();
}

async function inspect(page: Page, id = 'control') {
  await inspectComponent(page, id);
}

async function runtime(page: Page) {
  return page.evaluate(async () => {
    const uiPath = '/src/store/uiStore.ts';
    const clientPath = '/src/sim-worker/client.ts';
    const storePath = '/src/store/circuitStore.ts';
    const ui = (await import(uiPath)).useUiStore.getState();
    const result = ui.simResult;
    return {
      timer: result?.timerContactStates?.control,
      time: result?.simulationState?.elapsedSeconds,
      deadline: result?.simulationState?.pending.control?.atSeconds,
      trigger: result?.simulationState?.timers.control?.inputHigh,
      current: result?.componentCalculations?.lamp.currentAmps,
      power: result?.componentCalculations?.lamp.powerWatts,
      worker: (await import(clientPath)).simWorkerActive(),
      settings:
        (await import(storePath)).useCircuitStore
          .getState()
          .components.find((c: { id: string }) => c.id === 'control')?.state.timerModel ?? null,
      logs: ui.logs.map((log: { message: string }) => log.message),
    };
  });
}

test('guest dimmer slider changes the running Comlink circuit and exposes RMS readings', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openCircuit(page, dimmingCircuit());
  await inspect(page);
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  await expect
    .poll(async () => (await runtime(page)).current)
    .toBeCloseTo((230 / 230.0525) * 0.5, 8);
  expect((await runtime(page)).worker).toBe(true);
  await expect(page.locator('[data-electrical-readings="control"]')).toContainText(
    'RMS switching model',
  );
  const slider = page.getByRole('slider', { name: 'Dimmer power setting' });
  await slider.press('End');
  await expect.poll(async () => (await runtime(page)).current).toBeCloseTo(230 / 230.0525, 8);
  await slider.press('Home');
  await expect.poll(async () => Math.abs((await runtime(page)).power ?? 1)).toBe(0);
  await expect(slider).toBeEnabled();
  expect(errors).toEqual([]);
});

test('daily timer settings persist through Undo/Redo and reload, then drive exact timed contacts', async ({
  page,
}) => {
  const circuit = timerCircuit();
  circuit.components[1]!.state.timerModel = undefined;
  await openCircuit(page, circuit);
  await inspect(page);
  await page.getByLabel('Timer interval 1 start (s)', { exact: true }).fill('1');
  await page.getByLabel('Timer interval 1 end (s)', { exact: true }).fill('3');
  await activateControl(page, page.getByRole('button', { name: 'Apply timer program' }));
  await expect
    .poll(async () => (await runtime(page)).settings)
    .toMatchObject({ kind: 'schedule', windows: [{ startSeconds: 1, endSeconds: 3 }] });
  await page.keyboard.press('Control+z');
  await expect.poll(async () => (await runtime(page)).settings).toBeNull();
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(async () => (await runtime(page)).settings).toMatchObject({ kind: 'schedule' });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('keyval-store');
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          return await new Promise<string | undefined>((resolve, reject) => {
            const request = db
              .transaction('keyval')
              .objectStore('keyval')
              .get('electrasim:circuit:v1');
            request.onsuccess = () =>
              resolve(
                request.result?.circuit?.components.find((c: { id: string }) => c.id === 'control')
                  ?.state.timerModel?.kind,
              );
            request.onerror = () => reject(request.error);
          });
        } finally {
          db.close();
        }
      }),
    )
    .toBe('schedule');
  await page.reload();
  await expect
    .poll(async () => (await runtime(page)).settings)
    .toMatchObject({ windows: [{ startSeconds: 1, endSeconds: 3 }] });
  expect((await runtime(page)).time).toBeUndefined();
  await inspect(page);
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  await expect(page.getByRole('button', { name: 'Apply timer program' })).toBeDisabled();
  await expect.poll(async () => (await runtime(page)).timer, { timeout: 20000 }).toBe(true);
  expect((await runtime(page)).deadline).toBe(3);
  await expect(page.locator('[data-reading="timer-contact"]')).toHaveText('CLOSED');
  await expect.poll(async () => (await runtime(page)).timer, { timeout: 20000 }).toBe(false);
  expect(
    (await runtime(page)).logs.some((line: string) =>
      line.includes('timer opened (schedule) at 3 s'),
    ),
  ).toBe(true);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  expect((await runtime(page)).time).toBeUndefined();
});

test('countdown Trigger and Release run an interval without saving derived progress', async ({
  page,
}) => {
  const circuit = timerCircuit('countdown-timer');
  circuit.components[1]!.state.on = false;
  await openCircuit(page, circuit);
  await inspect(page);
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  await expect.poll(async () => (await runtime(page)).timer, { timeout: 20000 }).toBe(false);
  await activateControl(page, page.getByRole('button', { name: 'Trigger timer', exact: true }));
  await expect.poll(async () => (await runtime(page)).timer, { timeout: 20000 }).toBe(true);
  const deadline = (await runtime(page)).deadline;
  await activateControl(page, page.getByRole('button', { name: 'Release trigger', exact: true }));
  await expect.poll(async () => (await runtime(page)).trigger, { timeout: 20000 }).toBe(false);
  expect((await runtime(page)).deadline).toBe(deadline);
  await expect.poll(async () => (await runtime(page)).timer, { timeout: 20000 }).toBe(false);
  await activateControl(page, page.getByRole('button', { name: 'Trigger timer', exact: true }));
  await expect.poll(async () => (await runtime(page)).timer, { timeout: 20000 }).toBe(true);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  await expect.poll(async () => (await runtime(page)).deadline, { timeout: 20000 }).toBe(2);
  expect((await runtime(page)).settings).toMatchObject({ kind: 'interval', durationSeconds: 2 });
});

test('all timer families and RMS dimming replay through the real Comlink worker', async ({
  page,
}) => {
  await openCircuit(page, dimmingCircuit());
  const cases = timerDimmingAcceptanceCircuits();
  const expected = Object.entries(cases).map(([name, circuit]) => {
    let previous: SimulationResult | undefined;
    return {
      name,
      results: [0, 0.999999, 0.000001, 1, 1].map((deltaSeconds) => {
        previous = simulate(circuit, { simulationState: previous?.simulationState, deltaSeconds });
        return portableResult(previous);
      }),
    };
  });
  const actual = await page.evaluate(async (circuits) => {
    const path = '/src/sim-worker/client.ts';
    const client = await import(path);
    const cases = [];
    for (const [name, circuit] of Object.entries(circuits)) {
      let state: ElectricalSimulationState | undefined;
      const results = [];
      for (const deltaSeconds of [0, 0.999999, 0.000001, 1, 1]) {
        const result = await client.simulateAsync(circuit, {
          simulationState: state,
          deltaSeconds,
        });
        state = result.simulationState;
        results.push(
          JSON.parse(
            JSON.stringify(result, (_key, value) => (value instanceof Set ? [...value] : value)),
          ),
        );
      }
      cases.push({ name, results });
    }
    return { cases, worker: client.simWorkerActive() };
  }, cases);
  expect(actual.worker).toBe(true);
  expect(actual.cases).toEqual(expected);
});
