import { expect } from '@playwright/test';
import { seriesFixture } from '../packages/domain/src/core/mnaFixtures';
import { consumerEvidenceFixture } from '../packages/domain/src/simulation/consumerFixtures';
import { portableResult } from '../packages/domain/src/simulation/runtimeFixtures';
import { test } from './helpers/paid-test';
import { inspect, openCircuit } from './helpers/three-phase';

test('all shipped guide consumers replay exactly through real Comlink with stale results rejected', async ({
  page,
}) => {
  await openCircuit(page, seriesFixture());
  const actual = await page.evaluate(async () => {
    const fixturePath = '/packages/domain/src/simulation/consumerFixtures.ts';
    const clientPath = '/src/sim-worker/client.ts';
    const evidencePath = '/packages/domain/src/simulationEvidence.ts';
    const readingsPath = '/packages/domain/src/simulationReadings.ts';
    const { consumerAcceptanceCircuits } = await import(fixturePath);
    const { simulateAsync, simWorkerActive } = await import(clientPath);
    const { isCurrentSimulation, hasOperationEvidence } = await import(evidencePath);
    const { readVoltage } = await import(readingsPath);
    const results = [];
    for (const [name, circuit] of Object.entries(consumerAcceptanceCircuits())) {
      const result = await simulateAsync(circuit);
      results.push({
        consumerCase: name,
        result,
        current: isCurrentSimulation(circuit, result),
        staleAccepted: isCurrentSimulation(circuit, { ...result, inputRevision: 'previous' }),
        operationAssessed: hasOperationEvidence(circuit, result),
        pair: readVoltage(
          circuit,
          result,
          { componentId: 'r0', portIndex: 0 },
          { componentId: 'r0', portIndex: 1 },
        ),
      });
    }
    return {
      worker: simWorkerActive(),
      results: JSON.parse(
        JSON.stringify(results, (_key, item) => (item instanceof Set ? [...item] : item)),
      ),
    };
  });
  expect(actual.worker).toBe(true);
  expect(actual.results).toEqual(portableResult(consumerEvidenceFixture()));
});

test('desktop analytics shows actual series power and withholds a stale reading', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openCircuit(page, seriesFixture());
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = '/src/store/uiStore.ts';
        return (await import(path)).useUiStore.getState().simResult?.electrical?.status;
      }),
    )
    .toBe('converged');
  await inspect(page, 'r0');
  await page.getByTitle('Current calculated readings').click();
  const analytics = page.getByLabel('Calculated analytics');
  await expect(analytics.locator('[data-reading="power"]')).toHaveText(
    `${Number(((12 / 12.21) ** 2 * 6).toFixed(4))} W`,
  );
  await page.evaluate(async () => {
    const path = '/src/store/uiStore.ts';
    const ui = (await import(path)).useUiStore;
    ui.setState({ simResult: { ...ui.getState().simResult, inputRevision: 'previous' } });
  });
  await expect(analytics).toContainText('Run the current circuit');
  await expect(analytics.locator('[data-reading="power"]')).toHaveText('Unavailable');
});

test('the shared Fault Lab offers a named terminal disconnect on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCircuit(page, seriesFixture());
  await page.evaluate(async () => {
    const circuitPath = '/src/store/circuitStore.ts';
    const settingsPath = '/src/store/settingsStore.ts';
    (await import(settingsPath)).useSettingsStore.getState().setSetting('appMode', 'pro');
    (await import(circuitPath)).useCircuitStore.getState().selectComponent('r0');
  });
  await page.getByRole('button', { name: 'Fault Lab', exact: true }).click();
  const panel = page.getByLabel('Fault Lab panel');
  await panel.getByLabel('Fault target terminal').selectOption('0');
  await panel.getByRole('button', { name: /Loose \/ Disconnected Terminal/ }).click();
  await expect(panel.locator('[data-active-fault="terminal-disconnect"]')).toBeVisible();
  const fault = await page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    return (await import(path)).useCircuitStore.getState().faults[0];
  });
  expect(fault.target).toEqual({ type: 'port', componentId: 'r0', portIndex: 0 });
});
