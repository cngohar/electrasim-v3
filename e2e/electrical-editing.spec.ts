import { readFile } from 'node:fs/promises';
import type { Circuit } from '@electrasim/domain';
import { type Page, expect, test } from '@playwright/test';
import { editingCircuit, variantCircuit } from '../packages/domain/src/core/editingFixtures';
import { component as C, wire as W } from '../packages/domain/src/simulation/auditFixtures';
import { activateControl, inspectComponent } from './helpers/workbench';

// The desktop toolbar/palette/analytics workflow is checked on every engine.
// The explicit phone case below checks its Supply/Review confirmation controls.
test.beforeEach(async ({ page }, testInfo) => {
  if (!testInfo.title.startsWith('phone '))
    await page.setViewportSize({ width: 1280, height: 900 });
});

async function openCircuit(page: Page, circuit: Circuit) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Run Simulation', exact: true })).toBeVisible();
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await activateControl(page, page.getByRole('button', { name: /^Import \/ Export/ }));
  const dialog = page.getByRole('dialog');
  await activateControl(page, dialog.getByRole('button', { name: 'Import', exact: true }));
  await dialog
    .locator('textarea')
    .fill(JSON.stringify({ version: circuit.supply ? 2 : 1, exportedAt: 0, circuit }));
  await activateControl(page, dialog.getByRole('button', { name: 'Import from paste' }));
  await expect(
    dialog.getByText(
      `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
      { exact: true },
    ),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
}

async function documentAt(page: Page): Promise<Circuit> {
  return page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    const { useCircuitStore, selectCircuit } = await import(path);
    return selectCircuit(useCircuitStore.getState());
  });
}

async function inspect(page: Page, id: string) {
  return inspectComponent(page, id);
}

test('supply dialog stages, cancels, restores focus and applies one coherent Undo/Redo transaction', async ({
  page,
}) => {
  await openCircuit(page, editingCircuit());
  const original = await documentAt(page);
  const trigger = page.getByTitle('Click to change Global Supply Voltage');
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply voltage in volts').fill('12');
  expect(await documentAt(page)).toEqual(original);
  await activateControl(page, dialog.getByRole('button', { name: 'Cancel', exact: true }));
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await activateControl(page, dialog.getByRole('button', { name: '24 V', exact: true }));
  await page.keyboard.press('Escape');
  expect(await documentAt(page)).toEqual(original);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await activateControl(page, dialog.getByRole('button', { name: '12 V', exact: true }));
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  await expect(trigger).toContainText('12 V AC 50 Hz');
  const after = await documentAt(page);
  for (const id of ['heater', 'independent', 'other-load', 'pe'])
    expect(after.components.find((c) => c.id === id)).toEqual(
      original.components.find((c) => c.id === id),
    );
  expect(after.wires).toEqual(original.wires);
  const notice = page.locator('output').filter({ hasText: 'Supply changed from' });
  await expect(notice).toContainText('components need review');
  await activateControl(page, notice.getByRole('button', { name: 'Undo', exact: true }));
  await expect(trigger).toContainText('230 V AC 50 Hz');
  expect(await documentAt(page)).toEqual(original);
  await page.keyboard.press('Control+y');
  expect(await documentAt(page)).toEqual(after);
  const download = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  const file = await download;
  expect(JSON.parse(await readFile((await file.path())!, 'utf8')).circuit).toEqual(after);
});

test('AC/DC changes preserve independent sources and the inspector edits only its named source', async ({
  page,
}) => {
  await openCircuit(page, editingCircuit());
  await page.getByTitle('Click to change Global Supply Voltage').click();
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply kind').selectOption('dc');
  await dialog.getByLabel('Supply voltage in volts').fill('48');
  await expect(dialog).toContainText('PE remains protective earth');
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  expect((await documentAt(page)).supply?.model).toEqual({ kind: 'dc', voltage: 48 });
  const inspector = await inspect(page, 'independent');
  await expect(inspector).toContainText('Independent source output');
  await activateControl(page, inspector.getByRole('button', { name: 'Edit supply…' }));
  await expect(dialog).toContainText('12 V AC 60 Hz');
  await dialog.getByLabel('Supply kind').selectOption('dc');
  await expect(dialog.getByRole('button', { name: 'Apply supply change' })).toBeDisabled();
  await expect(dialog).toContainText('different physical AC/DC interface');
  await dialog.getByLabel('Supply kind').selectOption('ac-single-phase');
  await dialog.getByLabel('Supply voltage in volts').fill('24');
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  const after = await documentAt(page);
  expect(after.supply?.model).toEqual({ kind: 'dc', voltage: 48 });
  expect(after.components.find((c) => c.id === 'independent')?.state.sourceProfile?.model).toEqual({
    kind: 'ac-single-phase',
    voltage: 24,
    frequencyHz: 60,
  });
  expect(after.components.find((c) => c.id === 'heater')?.state.customVoltage).toBe(230);
  await inspect(page, 'pe');
  await expect(inspector).toContainText('Protective earth reference');
  await expect(inspector.getByRole('button', { name: 'Edit supply…' })).toHaveCount(0);
  await expect(inspector.getByLabel('Battery chemistry')).toHaveCount(0);
  await inspect(page, 'heater');
  await expect(inspector.getByLabel('Power rating in watts')).toHaveValue('2000');
  await expect(inspector.getByLabel('Operating voltage in volts')).toHaveValue('230');
  await expect(inspector.getByRole('button', { name: 'Edit supply…' })).toHaveCount(0);
});

test('preview refreshes on document revision and its notice never undoes a later edit', async ({
  page,
}) => {
  await openCircuit(page, editingCircuit());
  await page.getByTitle('Click to change Global Supply Voltage').click();
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply voltage in volts').fill('12');
  await page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    (await import(path)).useCircuitStore.getState().moveComponent('heater', 540, 250);
  });
  await expect(dialog).toContainText('preview has been refreshed');
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  expect((await documentAt(page)).components.find((c) => c.id === 'heater')?.x).toBe(540);
  await page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    (await import(path)).useCircuitStore.getState().moveComponent('heater', 560, 250);
  });
  const notice = page.locator('output').filter({ hasText: 'Supply changed from' });
  await expect(notice.getByRole('button', { name: 'Undo', exact: true })).toBeDisabled();
  await activateControl(page, notice.getByRole('button', { name: 'Review' }));
  await expect(page.getByRole('dialog', { name: 'Circuit readiness' })).toContainText(
    'declared ratings',
  );
});

test('Run distinguishes empty, missing supply, no-load, open, partial, short and conflicting sources', async ({
  page,
}) => {
  test.setTimeout(90_000);
  const supply = [C('l', 'live-terminal'), C('n', 'neutral-terminal')];
  const cases: [string, Circuit][] = [
    ['empty', { components: [], wires: [] }],
    ['no-source', { components: [C('heater', 'space-heater')], wires: [] }],
    ['no-load', { components: supply, wires: [] }],
    [
      'open',
      {
        components: [...supply, C('heater', 'space-heater')],
        wires: [W('feed', 'l', 0, 'heater', 0)],
      },
    ],
    [
      'partial',
      {
        components: [...supply, C('heater', 'space-heater'), C('other', 'space-heater')],
        wires: [W('feed', 'l', 0, 'heater', 0), W('return', 'heater', 1, 'n', 0)],
      },
    ],
    ['short', { components: supply, wires: [W('short', 'l', 0, 'n', 0)] }],
    [
      'invalid',
      {
        components: [
          ...supply,
          C('other', 'live-terminal', { customVoltage: 12 }),
          C('conflict', 'live-terminal', { customVoltage: 24 }),
        ],
        wires: [],
      },
    ],
  ];
  for (const [topology, circuit] of cases) {
    await openCircuit(page, circuit);
    await expect(page.locator(`[data-readiness-status="${topology}"]`)).toBeVisible();
    const run = page.getByRole('button', { name: 'Run Simulation', exact: true });
    if (['empty', 'no-source', 'invalid'].includes(topology)) {
      await expect(run).toBeDisabled();
      await page.keyboard.press('Space');
      await expect(page.getByRole('dialog', { name: 'Circuit readiness' })).toBeVisible();
    } else if (topology === 'open' || topology === 'no-load') {
      await run.click();
      const review = page.getByRole('dialog', { name: 'Circuit readiness' });
      await expect(review).toBeVisible();
      await expect(review).toContainText('live conductor can carry zero current');
      await activateControl(page, review.getByRole('button', { name: 'Run diagnostic' }));
      await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
    }
    await expect(page.getByText('Healthy', { exact: true })).toHaveCount(0);
  }
});

test('palette, command suggestions and placed components share compatibility without removing imported parts', async ({
  page,
}) => {
  const circuit = editingCircuit();
  circuit.components.push({ ...C('led', 'bulb'), x: 700, y: 460 });
  await openCircuit(page, circuit);
  const palette = page.locator('[data-tour="palette"]');
  await expect(palette.locator('[data-palette-type="bulb"]')).toHaveCount(0);
  await expect(palette.locator('[data-palette-type="dc-battery-12v"]')).toBeVisible();
  await expect(
    page.locator('[data-component-id="led"][data-compatibility="unassessed"]'),
  ).toBeVisible();
  await palette.getByLabel('Show all / fault exercise').check();
  await expect(
    palette.locator('[data-palette-type="bulb"][data-compatibility="unassessed"]').first(),
  ).toBeVisible();
  await palette.getByLabel('Placement supply').selectOption('independent');
  await expect(palette).toContainText('12 V AC 60 Hz');
  await page.getByTitle('Click to change Global Supply Voltage').click();
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply kind').selectOption('dc');
  await dialog.getByLabel('Supply voltage in volts').fill('12');
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  await palette.getByLabel('Placement supply').selectOption('');
  await expect(
    palette.locator('[data-palette-type="bulb"][data-compatibility="incompatible"]').first(),
  ).toBeVisible();
  expect((await documentAt(page)).components.some((c) => c.id === 'led')).toBe(true);
  await page.keyboard.press('Control+k');
  const command = page.getByRole('dialog', { name: 'Command palette' });
  await command.getByLabel('Show all / fault exercise').uncheck();
  await command.getByPlaceholder('What do you want to do?').fill('bulb');
  await expect(command.getByRole('button', { name: /Add LED Bulb/ })).toHaveCount(0);
  await command.getByLabel('Show all / fault exercise').check();
  await expect(command.getByRole('button', { name: /Add LED Bulb/ }).first()).toContainText(
    'Incompatible supply',
  );
});

test('variant confirmation maps MCB output to RCCB L-out and preserves a port fault through undo', async ({
  page,
}) => {
  const circuit = variantCircuit();
  circuit.components.at(-1)!.state.fault = undefined;
  circuit.components.at(-1)!.x = 600;
  circuit.components.at(-1)!.y = 380;
  await openCircuit(page, circuit);
  const original = await documentAt(page);
  const inspector = await inspect(page, 'breaker');
  await activateControl(
    page,
    inspector.getByRole('button', { name: 'RCD / RCCB (80A 30mA)', exact: true }),
  );
  const dialog = page.getByRole('dialog', { name: 'Replace component variant' });
  await expect(dialog).toContainText('L-out: terminal 2 → 3');
  await expect(dialog).toContainText('N-in, N-out');
  expect(await documentAt(page)).toEqual(original);
  await activateControl(page, dialog.getByRole('button', { name: 'Apply replacement' }));
  const after = await documentAt(page);
  expect(after.wires.find((w) => w.id === 'breaker-out')?.fromPortIndex).toBe(2);
  expect(after.faults?.[0]?.target).toMatchObject({ portIndex: 2 });
  expect(after.components.find((c) => c.id === 'breaker')?.state.customVoltage).toBeUndefined();
  await page.keyboard.press('Control+z');
  expect(await documentAt(page)).toEqual(original);
});

test('running and graded attempts lock configuration while supported runtime switches remain usable', async ({
  page,
}) => {
  await openCircuit(page, editingCircuit());
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await expect(
    page.getByTitle('Stop the simulation to change electrical configuration.'),
  ).toBeDisabled();
  const inspector = await inspect(page, 'switch');
  await activateControl(page, inspector.getByRole('button', { name: 'CLOSED (ON)', exact: true }));
  await expect(inspector.getByRole('button', { name: 'OPEN (OFF)', exact: true })).toBeVisible();
  const before = await documentAt(page);
  await page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    const store = (await import(path)).useCircuitStore.getState();
    store.updateComponentType('heater', 'water-heater');
    store.updateComponentState('independent', { customVoltage: 48 });
  });
  expect(await documentAt(page)).toEqual(before);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  await page.evaluate(async () => {
    const path = '/src/store/uiStore.ts';
    (await import(path)).useUiStore.setState({ challengeAttemptId: 'local-graded-test' });
  });
  await expect(
    page.getByTitle(/Supply and device configuration are locked during this exercise/),
  ).toBeDisabled();
});

test('phone supply and readiness controls use the same confirmation flow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openCircuit(page, editingCircuit());
  await activateControl(page, page.getByRole('button', { name: 'Supply', exact: true }));
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply kind').selectOption('dc');
  await activateControl(page, dialog.getByRole('button', { name: '24 V', exact: true }));
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  expect((await documentAt(page)).supply?.model).toEqual({ kind: 'dc', voltage: 24 });
  await activateControl(page, page.getByRole('button', { name: 'Review', exact: true }).last());
  await expect(page.getByRole('dialog', { name: 'Circuit readiness' })).toContainText(
    'declared ratings',
  );
});

test('a delayed real Comlink response cannot replace results after a confirmed supply change', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as { electricalReplies: (() => void)[] };
    state.electricalReplies = [];
    const add = Worker.prototype.addEventListener;
    Worker.prototype.addEventListener = function (
      this: Worker,
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ) {
      if (type === 'message' && typeof listener === 'function') {
        add.call(
          this,
          type,
          (event) => state.electricalReplies.push(() => listener.call(this, event)),
          options,
        );
      } else if (listener) add.call(this, type, listener, options);
    };
  });
  const circuit = editingCircuit();
  circuit.components = circuit.components.filter((c) => ['l', 'n', 'heater'].includes(c.id));
  circuit.wires = circuit.wires.filter((w) => ['feed', 'return'].includes(w.id));
  await openCircuit(page, circuit);
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  const queued = () =>
    page.evaluate(
      () => (window as unknown as { electricalReplies: (() => void)[] }).electricalReplies.length,
    );
  await expect.poll(queued).toBe(1);
  await activateControl(page, page.getByRole('button', { name: 'Stop', exact: true }));
  await page.getByTitle('Click to change Global Supply Voltage').click();
  const dialog = page.getByRole('dialog', { name: 'Change supply' });
  await dialog.getByLabel('Supply kind').selectOption('dc');
  await activateControl(page, dialog.getByRole('button', { name: '12 V', exact: true }));
  await activateControl(page, dialog.getByRole('button', { name: 'Apply supply change' }));
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  await expect.poll(queued).toBe(2);
  await page.evaluate(() =>
    (window as unknown as { electricalReplies: (() => void)[] }).electricalReplies.pop()!(),
  );
  const reading = () =>
    page.evaluate(async () => {
      const path = '/src/store/uiStore.ts';
      const result = (await import(path)).useUiStore.getState().simResult;
      return {
        status: result?.electricalContract?.status,
        load: result?.componentCalculations?.heater,
      };
    });
  const dcCurrent = 12 / (26.45 + 0.14);
  await expect.poll(async () => (await reading()).load?.currentAmps).toBeCloseTo(dcCurrent, 9);
  const accepted = await reading();
  expect(accepted.status).toBe('converged');
  expect(accepted.load?.powerWatts).toBeCloseTo(dcCurrent ** 2 * 26.45, 9);
  await page.evaluate(async () => {
    (window as unknown as { electricalReplies: (() => void)[] }).electricalReplies.shift()!();
    await new Promise(requestAnimationFrame);
  });
  // Both responses now converge; retain the newer 12 V measurements rather
  // than merely comparing a status that is shared with the obsolete 230 V run.
  expect(await reading()).toEqual(accepted);
  expect((await documentAt(page)).supply?.model).toEqual({ kind: 'dc', voltage: 12 });
  await page.getByTitle('Current calculated readings', { exact: true }).click();
  await expect(page.locator('[data-tour="inspector"]')).toContainText(
    'Waveform, power factor, temperature and accumulated energy measurements remain unavailable.',
  );
});
