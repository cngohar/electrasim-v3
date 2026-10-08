import { readFile } from 'node:fs/promises';
import type { Circuit } from '@electrasim/domain';
import { explicitSupplyProfile } from '@electrasim/domain/core/supplies';
import { type Page, expect, test } from '@playwright/test';
import { component as C, wire as W } from '../packages/domain/src/simulation/auditFixtures';

// This flow exercises the desktop context bar; phone supply editing has its
// own visible-Supply-button coverage in electrical-editing.spec.ts.
test.use({ viewport: { width: 1280, height: 900 } });

async function openCircuit(page: Page, circuit: Circuit) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Run Simulation$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: /^Import \/ Export/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^Import$/ }).click();
  await dialog.locator('textarea').fill(JSON.stringify({ version: 2, exportedAt: 0, circuit }));
  await dialog.getByRole('button', { name: 'Import from paste' }).click();
  await expect(
    dialog.getByText(
      `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
      { exact: true },
    ),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
}

function heaterCircuit(): Circuit {
  return {
    supply: explicitSupplyProfile({ kind: 'ac-single-phase', voltage: 230, frequencyHz: 60 }),
    globalVoltage: 230,
    components: [
      C('l', 'live-terminal'),
      C('n', 'neutral-terminal'),
      C('pe', 'earth-terminal'),
      C('heater', 'space-heater', { customVoltage: 230, customPowerWatts: 2000 }),
      C('independent', 'ac-mains-supply', {
        sourceProfile: explicitSupplyProfile({
          kind: 'ac-single-phase',
          voltage: 120,
          frequencyHz: 50,
        }),
      }),
    ],
    wires: [W('feed', 'l', 0, 'heater', 0), W('return', 'heater', 1, 'n', 0)],
    faults: [
      {
        id: 'open-return',
        type: 'open-circuit',
        category: 'conductor',
        target: { type: 'wire', id: 'return' },
        createdAt: 0,
      },
    ],
  };
}

test('supply profiles survive real import, voltage edit, undo/redo, download and IndexedDB reload', async ({
  page,
}) => {
  const original = heaterCircuit();
  await openCircuit(page, original);
  const supply = page.getByTitle('Click to change Global Supply Voltage');
  await expect(supply).toContainText('230 V AC 60 Hz');
  await supply.click();
  await page
    .getByRole('dialog', { name: 'Change supply' })
    .getByRole('button', { name: '24 V', exact: true })
    .click();
  await expect(supply).toContainText('230 V AC 60 Hz');
  await page.getByRole('button', { name: 'Apply supply change' }).click();
  await expect(supply).toContainText('24 V AC 60 Hz');
  await page.keyboard.press('Control+z');
  await expect(supply).toContainText('230 V AC 60 Hz');
  await page.keyboard.press('Control+y');
  await expect(supply).toContainText('24 V AC 60 Hz');
  const download = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  const file = await download;
  const filePath = await file.path();
  expect(filePath).not.toBeNull();
  const exported = JSON.parse(await readFile(filePath!, 'utf8')) as {
    version: number;
    circuit: Circuit;
  };
  expect(exported.version).toBe(2);
  expect(exported.circuit.supply?.model).toEqual({
    kind: 'ac-single-phase',
    voltage: 24,
    frequencyHz: 60,
  });
  for (const id of ['heater', 'pe', 'independent'])
    expect(exported.circuit.components.find((c) => c.id === id)).toEqual(
      original.components.find((c) => c.id === id),
    );
  expect(exported.circuit.wires).toEqual(original.wires);
  expect(exported.circuit.faults).toEqual(original.faults);
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
            request.onsuccess = () => resolve(request.result?.circuit?.supply?.model?.voltage);
            request.onerror = () => reject(request.error);
          });
        } finally {
          db.close();
        }
      }),
    )
    .toBe(24);
  await page.reload();
  await expect(page.getByTitle('Click to change Global Supply Voltage')).toContainText(
    '24 V AC 60 Hz',
  );
});

test('a saved DC supply is preserved and solved identically through actual Comlink and local Hono', async ({
  page,
}) => {
  const circuit: Circuit = {
    supply: explicitSupplyProfile({ kind: 'dc', voltage: 48 }),
    globalVoltage: 48,
    components: [C('l', 'live-terminal'), C('n', 'neutral-terminal'), C('heater', 'space-heater')],
    wires: [W('feed', 'l', 0, 'heater', 0), W('return', 'heater', 1, 'n', 0)],
  };
  await openCircuit(page, circuit);
  await expect(page.getByTitle('Click to change Global Supply Voltage')).toContainText('48 V DC');
  await page.getByRole('button', { name: /^Run Simulation$/ }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const uiPath = '/src/store/uiStore.ts';
        const workerPath = '/src/sim-worker/client.ts';
        const result = (await import(uiPath)).useUiStore.getState().simResult;
        return {
          status: result?.electricalContract?.status,
          worker: (await import(workerPath)).simWorkerActive(),
        };
      }),
    )
    .toEqual({ status: 'converged', worker: true });
  const results = await page.evaluate(async () => {
    const uiPath = '/src/store/uiStore.ts';
    const storePath = '/src/store/circuitStore.ts';
    const actionsPath = '/src/store/circuitActions.ts';
    const store = (await import(storePath)).useCircuitStore.getState();
    const current = (await import(actionsPath)).selectCircuit(store);
    const response = await fetch('/api/simulator/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ circuit: current }),
    });
    return {
      status: response.status,
      server: await response.json(),
      browser: JSON.parse(
        JSON.stringify((await import(uiPath)).useUiStore.getState().simResult, (_key, value) =>
          value instanceof Set ? [...value] : value,
        ),
      ),
      circuit: current,
    };
  });
  expect(results.status).toBe(200);
  expect(results.server).toEqual(results.browser);
  const current = 48 / (26.45 + 0.14);
  expect(results.browser.componentCalculations.heater.currentAmps).toBeCloseTo(current, 9);
  expect(results.browser.componentCalculations.heater.voltage).toBeCloseTo(current * 26.45, 9);
  expect(results.browser.componentCalculations.heater.powerWatts).toBeCloseTo(
    current ** 2 * 26.45,
    9,
  );
  expect(results.browser.faultsCleared).toBe(true);
  expect(results.browser.electrical.operation).not.toBe('operating');
  expect(results.circuit.supply).toEqual(circuit.supply);
  expect(results.circuit.components).toEqual(circuit.components);
});
