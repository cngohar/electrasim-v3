import type { Circuit } from '@electrasim/domain';
import { type Page, expect, test } from '@playwright/test';
import {
  component as C,
  wire as W,
  protectedLoad,
} from '../packages/domain/src/simulation/auditFixtures';

async function importCircuit(page: Page, circuit: Circuit) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Run Simulation$/ })).toBeVisible();
  await page.keyboard.press('Control+e');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /^Import$/ }).click();
  await dialog.locator('textarea').fill(JSON.stringify({ version: 1, exportedAt: 0, circuit }));
  await dialog.getByRole('button', { name: 'Import from paste' }).click();
  await expect(
    dialog.getByText(
      `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
      { exact: true },
    ),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('f');
}

test('N23: a guest declared high-current trip through Comlink stays resettable', async ({
  page,
}) => {
  const circuit = protectedLoad('mcb', 7400, 4);
  circuit.components.find((c) => c.id === 'device')!.state.protectionModel = {
    version: 1,
    kind: 'mcb',
    ratedCurrentAmps: 4,
    curve: 'B',
  };
  circuit.components.forEach((c, i) => {
    c.x = 220 + i * 180;
    c.y = i === 1 ? 440 : 220;
  });
  await importCircuit(page, circuit);
  await page.getByRole('button', { name: /^Run Simulation$/ }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const storePath = '/src/store/circuitStore.ts';
        const workerPath = '/src/sim-worker/client.ts';
        const uiPath = '/src/store/uiStore.ts';
        const result = (await import(uiPath)).useUiStore.getState().simResult;
        const component = (await import(storePath)).useCircuitStore
          .getState()
          .components.find((c: { id: string }) => c.id === 'device');
        return {
          tripped: result?.simulationState?.protection?.device?.tripped === true,
          persistedTrip: component?.state.isTripped === true,
          damaged: component?.state.isBlown === true,
          worker: (await import(workerPath)).simWorkerActive(),
        };
      }),
    )
    .toEqual({ tripped: true, persistedTrip: false, damaged: false, worker: true });
});

test('N12: an unmodeled transformer secondary load preserves the drawing and withholds measurements', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'The floating inspector is a desktop interface.');
  const circuit: Circuit = {
    components: [
      C('l', 'live-terminal'),
      C('n', 'neutral-terminal'),
      C('transformer', 'transformer-12v'),
      C('lamp', 'bulb'),
    ],
    wires: [
      W('primary-l', 'l', 0, 'transformer', 0),
      W('primary-n', 'n', 0, 'transformer', 1),
      W('secondary-l', 'transformer', 2, 'lamp', 0),
      W('secondary-n', 'lamp', 1, 'transformer', 3),
    ],
  };
  circuit.components.forEach((c, i) => {
    c.x = 240 + i * 180;
    c.y = i === 1 ? 440 : 220;
  });
  await importCircuit(page, circuit);
  await page.getByRole('button', { name: /^Run Simulation$/ }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const uiPath = '/src/store/uiStore.ts';
        const storePath = '/src/store/circuitStore.ts';
        const result = (await import(uiPath)).useUiStore.getState().simResult;
        const circuit = (await import(storePath)).useCircuitStore.getState();
        return {
          code: result?.modelLimitations?.[0]?.code,
          measurements: result?.componentCalculations ?? null,
          energized: result?.energizedComponents.size,
          components: circuit.components.length,
          damaged: circuit.components.some(
            (c: { state: { isBlown?: boolean } }) => c.state.isBlown,
          ),
        };
      }),
    )
    .toEqual({
      code: 'load-model',
      measurements: null,
      energized: 0,
      components: 4,
      damaged: false,
    });
  await page.locator('[data-component-id="transformer"] [data-component-hitbox]').click();
  await page.getByTitle(/^Properties & (Settings|Specs)$/).click();
  const inspector = page.locator('[data-tour="inspector"]');
  await expect(inspector.locator('[data-reading="voltage"]')).toHaveText('Unavailable');
  await expect(inspector.locator('[data-reading="current"]')).toHaveText('Unavailable');
  await expect(inspector.locator('[data-reading="power"]')).toHaveText('Unavailable');
  // Read the actual backup serializer after the run; no destructive projection is allowed.
  const exported = await page.evaluate(async () => {
    const storePath = '/src/store/circuitStore.ts';
    const formatPath = '/src/lib/export/circuitFormat.ts';
    const store = (await import(storePath)).useCircuitStore.getState();
    return (await import(formatPath)).exportJSON({
      components: store.components,
      wires: store.wires,
    });
  });
  expect(JSON.parse(exported).circuit.components.map((c: { id: string }) => c.id)).toEqual([
    'l',
    'n',
    'transformer',
    'lamp',
  ]);
});
