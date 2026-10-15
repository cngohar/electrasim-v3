import { COMPONENT_DEFS } from '@electrasim/domain/components';
import { catalogueProfileKind, isLampType } from '@electrasim/domain/core/catalogueProfiles';
import type { Circuit } from '@electrasim/domain/types';
import { expect } from '@playwright/test';
import {
  autoTransformerFixture,
  catalogueProfileAcceptanceCircuits,
  ntcDividerFixture,
  profileLoadFixture,
  pvFixture,
  spdFixture,
} from '../packages/domain/src/core/catalogueProfileFixtures';
import { portableResult } from '../packages/domain/src/simulation/runtimeFixtures';
import { simulate } from '../packages/domain/src/simulation/simulate';
import {
  assertProfileReadings,
  importProfileCircuit,
  inspectProfileComponent,
  runProfileCircuit,
  setProfileSupply,
} from './helpers/catalogue-profiles';
import { test } from './helpers/paid-test';
import { activateControl, closePhoneProperties, fitCanvas } from './helpers/workbench';

const lamps = Object.keys(COMPONENT_DEFS).filter(isLampType);
const motors = [
  'ceiling-fan',
  'extractor-fan',
  'industrial-exhaust-fan',
  'table-fan',
  'motor',
  'water-pump',
];
const appliances = Object.keys(COMPONENT_DEFS).filter(
  (t) => catalogueProfileKind(t) === 'appliance' && !motors.includes(t),
);
function groupCircuit(types: string[]): Circuit {
  return {
    globalVoltage: 230,
    components: [
      { id: 'live', type: 'live-terminal', x: 100, y: 100, state: {} },
      { id: 'neutral', type: 'neutral-terminal', x: 100, y: 300, state: {} },
      ...types.map((type, i) => ({
        id: type,
        type,
        x: 350 + (i % 5) * 200,
        y: 100 + Math.floor(i / 5) * 200,
        state: {},
      })),
    ],
    wires: types.flatMap((type) => [
      {
        id: `${type}-feed`,
        fromComponentId: 'live',
        fromPortIndex: 0,
        toComponentId: type,
        toPortIndex: 0,
        controlPoints: [],
      },
      {
        id: `${type}-return`,
        fromComponentId: type,
        fromPortIndex: 1,
        toComponentId: 'neutral',
        toPortIndex: 0,
        controlPoints: [],
      },
    ]),
  };
}
for (const [family, types] of [
  ['lamps', lamps],
  ['motors', motors],
  ['appliances', appliances],
] as const) {
  test(`${family}: each catalogue entry renders solved readings and its declared running/standby state`, async ({
    page,
  }, testInfo) => {
    test.setTimeout(180_000);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const circuit = groupCircuit([...types]);
    const expected = simulate(circuit);
    expect(expected.electrical?.status).toBe('converged');
    await importProfileCircuit(page, circuit);
    await runProfileCircuit(page);
    for (const id of types) {
      await assertProfileReadings(page, id, expected.componentCalculations![id]!);
      await expect(
        page.locator(`[data-component-id="${id}"][data-component-appearance]`),
      ).toHaveAttribute('data-component-energized', String(expected.energizedComponents.has(id)));
      await page.keyboard.press('Escape');
    }
    await fitCanvas(page);
    await page.screenshot({
      path: `.wrangler/phase112-${testInfo.project.name}-${family}-working.png`,
      fullPage: true,
    });
    await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
    await setProfileSupply(page, 12);
    await runProfileCircuit(page);
    for (const id of types) {
      const panel = await inspectProfileComponent(page, id);
      const low = simulate({ ...circuit, globalVoltage: 12 });
      await expect(panel.locator('[data-reading="power"]')).toHaveText(
        `${Number(low.componentCalculations![id]!.powerWatts!.toFixed(4))} W`,
      );
      await expect(
        page.locator(`[data-component-id="${id}"][data-component-appearance]`),
      ).toHaveAttribute('data-component-energized', 'false');
      await page.keyboard.press('Escape');
    }
    await fitCanvas(page);
    await page.screenshot({
      path: `.wrangler/phase112-${testInfo.project.name}-${family}-12v.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}
for (const [family, fixture, id] of [
  ['pv', pvFixture, 'pv'],
  ['ntc', ntcDividerFixture, 'load'],
  ['spd', spdFixture, 'load'],
  ['autotransformer', autoTransformerFixture, 'auto'],
] as const) {
  test(`${family}: ordinary import, Run and detailed profile inspection`, async ({
    page,
  }, testInfo) => {
    const circuit = fixture();
    circuit.components.forEach((c, i) => {
      c.x = 150 + i * 250;
      c.y = 200;
    });
    const expected = simulate(circuit);
    await importProfileCircuit(page, circuit);
    await runProfileCircuit(page);
    const panel = await inspectProfileComponent(page, id);
    await expect(panel.locator('[data-catalogue-model]')).toBeVisible();
    if (family === 'autotransformer') {
      await expect(panel).toContainText('shared-common');
      await expect(panel).toContainText('This model does not provide isolation.');
    } else await assertProfileReadingsAfterOpen();
    async function assertProfileReadingsAfterOpen() {
      const point = expected.componentCalculations![id]!;
      await expect(panel.locator('[data-reading="power"]')).toHaveText(
        `${Number(point.powerWatts!.toFixed(4))} W`,
      );
    }
    await page.keyboard.press('Escape');
    await fitCanvas(page);
    await page.screenshot({
      path: `.wrangler/phase112-${testInfo.project.name}-${family}-working.png`,
      fullPage: true,
    });
  });
}
test('profile edits change mode and power, reject invalid values and survive Undo/Redo and reload', async ({
  page,
}) => {
  const c = profileLoadFixture('washing-machine');
  c.components.forEach((x, i) => {
    x.x = 150 + i * 350;
    x.y = 200;
  });
  await importProfileCircuit(page, c);
  await runProfileCircuit(page);
  await closePhoneProperties(page);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  let panel = await inspectProfileComponent(page, 'load');
  await panel.getByLabel('Operating mode', { exact: true }).selectOption('standby');
  await activateControl(
    page,
    panel.getByRole('button', { name: 'Apply electrical profile', exact: true }),
  );
  await page.keyboard.press('Escape');
  await closePhoneProperties(page);
  await runProfileCircuit(page);
  panel = await inspectProfileComponent(page, 'load');
  await expect(panel.locator('[data-reading="power"]')).toHaveText('1 W');
  await expect(
    page.locator('[data-component-id="load"][data-component-appearance]'),
  ).toHaveAttribute('data-component-energized', 'false');
  await page.keyboard.press('Escape');
  await closePhoneProperties(page);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  panel = await inspectProfileComponent(page, 'load');
  await panel.getByLabel('Profile electrical input power (W)').fill('-2');
  await activateControl(
    page,
    panel.getByRole('button', { name: 'Apply electrical profile', exact: true }),
  );
  expect(
    await panel
      .getByLabel('Profile electrical input power (W)')
      .evaluate((input: HTMLInputElement) => input.validity.valid),
  ).toBe(false);
  await page.keyboard.press('Escape');
  await closePhoneProperties(page);
  await page.locator('[data-circuit-canvas]').focus();
  await page.keyboard.press('Control+z');
  await runProfileCircuit(page);
  panel = await inspectProfileComponent(page, 'load');
  await expect(panel.locator('[data-reading="power"]')).not.toHaveText('1 W');
  await page.keyboard.press('Escape');
  await closePhoneProperties(page);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  await page.locator('[data-circuit-canvas]').focus();
  await page.keyboard.press('Control+y');
  await runProfileCircuit(page);
  panel = await inspectProfileComponent(page, 'load');
  await expect(panel.locator('[data-reading="power"]')).toHaveText('1 W');
  await page.keyboard.press('Escape');
  await closePhoneProperties(page);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  await page.reload();
  await runProfileCircuit(page);
  panel = await inspectProfileComponent(page, 'load');
  await expect(panel.locator('[data-reading="power"]')).toHaveText('1 W');
});
test('all catalogue profile cases agree across direct, real Comlink and local Hono', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.config.metadata.delivery === 'built',
    'The source suite compares the full direct/Comlink/Hono contract; built workflows verify delivered measurements.',
  );
  test.setTimeout(180_000);
  await importProfileCircuit(page, profileLoadFixture());
  const fixtures = catalogueProfileAcceptanceCircuits();
  const rows = await page.evaluate(async (fixtures) => {
    const path = '/src/sim-worker/client.ts';
    const client = await import(path);
    const rows = [];
    for (const [name, circuit] of Object.entries(fixtures)) {
      const result = await client.simulateAsync(circuit, { standard: 'int', appMode: 'pro' });
      const response = await fetch('/api/simulator/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ circuit, standard: 'int' }),
      });
      rows.push({
        name,
        status: response.status,
        worker: JSON.parse(
          JSON.stringify(result, (_key, value) => (value instanceof Set ? [...value] : value)),
        ),
        server: await response.json(),
      });
    }
    return { rows, active: client.simWorkerActive() };
  }, fixtures);
  expect(rows.active).toBe(true);
  for (const row of rows.rows) {
    expect(row.status, row.name).toBe(200);
    expect(row.worker, row.name).toEqual(
      portableResult(simulate(fixtures[row.name]!, { standard: 'int', appMode: 'pro' })),
    );
    expect(row.server, row.name).toEqual(row.worker);
  }
});

test('an ordinary three-phase motor placement has a discoverable editable setup and runs after wiring', async ({
  page,
}) => {
  test.setTimeout(90000);
  const fixture = profileLoadFixture();
  fixture.components = [
    {
      id: 's',
      type: 'ac-three-phase-supply',
      x: 150,
      y: 200,
      state: {
        sourceProfile: {
          version: 1,
          provenance: { voltage: 'explicit', frequency: 'explicit' },
          model: { kind: 'ac-three-phase', voltage: 230, frequencyHz: 50, sequence: 'abc' },
        },
      },
    },
  ];
  fixture.wires = [];
  await importProfileCircuit(page, fixture);
  // A one-component Fit reaches 400%; make room beside the source on phones.
  for (let step = 0; step < 6; step++)
    await activateControl(page, page.getByRole('button', { name: 'Zoom out', exact: true }));
  await activateControl(page, page.getByRole('button', { name: /Browse all components|Browse$/ }));
  const library = page.getByRole('dialog', { name: 'Component library' });
  await library.getByLabel('Show all / fault exercise').check();
  await library.getByLabel('Search components').fill('3-phase');
  await activateControl(page, library.locator('[data-palette-type="motor-3phase"]').first());
  await expect(library).not.toBeVisible();
  const canvas = await page.locator('[data-circuit-canvas]').boundingBox();
  await page.mouse.click(canvas!.x + canvas!.width * 0.8, canvas!.y + canvas!.height * 0.35);
  const motor = page.locator('[data-component-id][data-component-appearance]').filter({
    has: page.locator('[data-device-art="motor-3phase"],[data-component-symbol="motor-3phase"]'),
  });
  await expect(motor).toHaveCount(1);
  const id = (await motor.getAttribute('data-component-id'))!;
  let panel = await inspectProfileComponent(page, id);
  await expect(panel).toContainText('Electrical setup required');
  await activateControl(
    page,
    panel.getByRole('button', { name: 'Use editable teaching setup', exact: true }),
  );
  await expect(panel.getByLabel('Motor electrical input power (W)')).toHaveValue('3000');
  await page.keyboard.press('Escape');
  await fitCanvas(page);
  for (const port of [0, 1, 2]) {
    await page
      .locator(
        `[data-component-id="s"][data-component-appearance] [data-port-group="${port}"] [data-port-touch-target]`,
      )
      .press('Enter');
    await motor.locator(`[data-port-group="${port}"] [data-port-touch-target]`).press('Enter');
    await expect(page.locator('[data-wire-hitbox]')).toHaveCount(port + 1);
  }
  await runProfileCircuit(page);
  panel = await inspectProfileComponent(page, id);
  await expect(panel.locator('[data-motor-state="running"]')).toBeVisible();
});
