import type { Circuit } from '@electrasim/domain';
import { expect, test } from '@playwright/test';
import {
  threePhaseAcceptanceCircuits,
  threePhaseStarFixture,
} from '../packages/domain/src/core/threePhaseFixtures';
import { portableResult } from '../packages/domain/src/simulation/runtimeFixtures';
import { simulate } from '../packages/domain/src/simulation/simulate';
import { test as paidTest } from './helpers/paid-test';
import { documentAt, inspect, openCircuit, run } from './helpers/three-phase';
import { activateControl } from './helpers/workbench';

// Generic inspector cases use the desktop surface on every browser engine.
// Explicit phone cases below retain their 390 px viewport.
test.use({ viewport: { width: 1280, height: 900 } });

test('guest palette placement has five canonical phase terminals and independent saved defaults', async ({
  page,
}) => {
  await openCircuit(page, { components: [], wires: [] });
  const palette = page.locator('[data-tour="palette"]');
  await palette.getByPlaceholder('Search…', { exact: true }).fill('Three-phase AC');
  await palette.locator('[data-palette-type="ac-three-phase-supply"]').first().click();
  await page.locator('svg[data-circuit-canvas]').click({ position: { x: 350, y: 250 } });
  const circuit = await documentAt(page);
  expect(circuit.components).toHaveLength(1);
  const source = circuit.components[0]!;
  expect(source.type).toBe('ac-three-phase-supply');
  expect(source.state.sourceProfile?.model).toEqual({
    kind: 'ac-three-phase',
    voltage: 230,
    frequencyHz: 50,
    sequence: 'abc',
  });
  await expect(
    page.locator(`[data-component-id="${source.id}"] [data-device-art="ac-three-phase-supply"]`),
  ).toBeVisible();
});

test('confirmed L-L and sequence edits cancel, apply and Undo without rewriting independent sources or faults', async ({
  page,
}) => {
  const input = threePhaseAcceptanceCircuits().independent!;
  input.wires[0]!.fault = 'open-circuit';
  await openCircuit(page, input);
  const before = await documentAt(page);
  const inspector = await inspect(page, 's');
  await activateControl(page, inspector.getByRole('button', { name: 'Edit supply…' }));
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Line-to-line voltage in volts').fill('400');
  await dialog.getByLabel('Phase sequence', { exact: true }).selectOption('acb');
  await dialog.getByLabel('Supply frequency in hertz').fill('60');
  expect(await documentAt(page)).toEqual(before);
  await activateControl(page, dialog.getByRole('button', { name: 'Cancel', exact: true }));
  expect(await documentAt(page)).toEqual(before);
  await activateControl(page, inspector.getByRole('button', { name: 'Edit supply…' }));
  await expect(dialog.getByLabel('Phase sequence', { exact: true })).toHaveValue('abc');
  await dialog.getByLabel('Line-to-line voltage in volts').fill('400');
  await dialog.getByLabel('Phase sequence', { exact: true }).selectOption('acb');
  await dialog.getByLabel('Supply frequency in hertz').fill('60');
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  await expect(dialog).not.toBeVisible();
  const after = await documentAt(page);
  expect(after.components[0]!.state.sourceProfile?.model).toEqual({
    kind: 'ac-three-phase',
    voltage: 400 / Math.sqrt(3),
    frequencyHz: 60,
    sequence: 'acb',
  });
  expect(after.components.slice(1)).toEqual(before.components.slice(1));
  expect(after.wires).toEqual(before.wires);
  await expect(
    page.locator('[data-device-art="ac-three-phase-supply"] [data-device-rating]'),
  ).toContainText('ACB');
  const notice = page.locator('output').filter({ hasText: 'Supply changed from' });
  await activateControl(page, notice.getByRole('button', { name: 'Undo', exact: true }));
  expect(await documentAt(page)).toEqual(before);
  await page.keyboard.press('Control+y');
  expect(await documentAt(page)).toEqual(after);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<Circuit>((resolve, reject) => {
            const open = indexedDB.open('keyval-store');
            open.onerror = () => reject(open.error);
            open.onsuccess = () => {
              const db = open.result;
              const read = db
                .transaction('keyval')
                .objectStore('keyval')
                .get('electrasim:circuit:v1');
              read.onerror = () => {
                db.close();
                reject(read.error);
              };
              read.onsuccess = () => {
                db.close();
                resolve(read.result?.circuit);
              };
            };
          }),
      ),
    )
    .toEqual(after);
  await page.reload();
  await expect.poll(() => documentAt(page)).toEqual(after);
});

test('real Comlink run displays L-N, L-L, neutral cancellation and finite wire loss with configuration locked', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openCircuit(page, threePhaseStarFixture());
  await run(page);
  const inspector = await inspect(page, 's');
  await expect(
    inspector.locator('[data-phase-reading="L2-N"] [data-reading="voltage"]'),
  ).toHaveText('230 V');
  await expect(inspector.locator('[data-voltage-pair="L1-L2"]')).toHaveText('398.3717 V');
  await expect(inspector.locator('[data-reading="neutral-current"]')).toHaveText('0 A');
  await page.screenshot({ path: '.wrangler/phase15e1-source-desktop.png' });
  await expect(inspector.getByRole('button', { name: 'Edit supply…' })).toBeDisabled();
  await inspect(page, 'r1');
  await expect(inspector.locator('[data-reading="current"]')).toHaveText('9.9395 A');
  await page.evaluate(async () => {
    const cs = '/src/store/circuitStore.ts';
    const ui = '/src/store/uiStore.ts';
    (await import(cs)).useCircuitStore.getState().selectComponent(null);
    (await import(cs)).useCircuitStore.getState().selectWire('feed1');
    (await import(ui)).useUiStore.getState().setActiveInspectorTab('simulation');
  });
  await expect(page.locator('[data-phasor-wire="feed1"] [data-reading="power"]')).toHaveText(
    '6.9156 W',
  );
  const runtime = await page.evaluate(async () => {
    const ui = '/src/store/uiStore.ts';
    const worker = '/src/sim-worker/client.ts';
    const result = (await import(ui)).useUiStore.getState().simResult;
    return {
      worker: (await import(worker)).simWorkerActive(),
      scalar: result.electrical ?? null,
      faultsCleared: result.faultsCleared,
    };
  });
  expect(runtime).toEqual({ worker: true, scalar: null, faultsCleared: false });
  expect(errors).toEqual([]);
});

test('phone source properties use the same voltage and sequence confirmation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCircuit(page, threePhaseStarFixture());
  await page.evaluate(async () => {
    const path = '/src/store/electricalEditing.ts';
    (await import(path)).useElectricalEditing.setState({ inspectComponentId: 's' });
  });
  await page
    .getByRole('dialog', { name: 'Component properties' })
    .getByRole('button', { name: 'Edit supply…' })
    .click();
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply voltage in volts').fill('120');
  await dialog.getByLabel('Phase sequence', { exact: true }).selectOption('acb');
  await page.screenshot({ path: '.wrangler/phase15e1-source-phone.png' });
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  await expect(dialog).not.toBeVisible();
  expect((await documentAt(page)).components[0]!.state.sourceProfile?.model).toMatchObject({
    voltage: 120,
    sequence: 'acb',
  });
});

paidTest(
  'catalogue phasor results match direct domain, real Comlink and localhost Hono including unsupported motor cases',
  async ({ page }) => {
    await openCircuit(page, threePhaseStarFixture());
    const circuits = threePhaseAcceptanceCircuits();
    const rows = await page.evaluate(async (cases) => {
      const path = '/src/sim-worker/client.ts';
      const worker = await import(path);
      const rows = [];
      for (const [name, circuit] of Object.entries(cases)) {
        const result = await worker.simulateAsync(circuit, { standard: 'int', appMode: 'pro' });
        const response = await fetch('/api/simulator/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ circuit }),
        });
        rows.push({
          name,
          status: response.status,
          server: await response.json(),
          worker: JSON.parse(
            JSON.stringify(result, (_key, value) => (value instanceof Set ? [...value] : value)),
          ),
        });
      }
      return rows;
    }, circuits);
    for (const row of rows) {
      expect(row.status, row.name).toBe(200);
      expect(row.worker, row.name).toEqual(
        portableResult(simulate(circuits[row.name]!, { standard: 'int', appMode: 'pro' })),
      );
      expect(row.server, row.name).toEqual(row.worker);
    }
  },
);
