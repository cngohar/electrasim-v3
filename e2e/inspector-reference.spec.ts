import { readFileSync } from 'node:fs';
import { type Circuit, createInjectedFault } from '@electrasim/domain';
import { normalizeCircuitDocument } from '@electrasim/domain/core/normalize';
import { explicitSupplyProfile } from '@electrasim/domain/core/supplies';
import { type Page, expect } from '@playwright/test';
import { importProfileCircuit } from './helpers/catalogue-profiles';
import { test } from './helpers/paid-test';
import { activateControl, fitCanvas, openCircuitTools, openInspector } from './helpers/workbench';

function fixture(): Circuit {
  return normalizeCircuitDocument({
    globalVoltage: 230,
    components: [
      { id: 'L', type: 'live-terminal', x: 150, y: 130, state: {} },
      { id: 'N', type: 'neutral-terminal', x: 150, y: 430, state: {} },
      { id: 'heater', type: 'water-heater', x: 690, y: 330, state: { customPowerWatts: 1250 } },
    ],
    wires: [
      {
        id: 'line',
        fromComponentId: 'L',
        fromPortIndex: 0,
        toComponentId: 'heater',
        toPortIndex: 0,
        pathKind: 'orthogonal',
        controlPoints: [{ x: 500, y: 240 }],
      },
      {
        id: 'return',
        fromComponentId: 'heater',
        fromPortIndex: 1,
        toComponentId: 'N',
        toPortIndex: 0,
        controlPoints: [],
      },
    ],
  });
}
async function wireProperties(page: Page) {
  await fitCanvas(page);
  await page.locator('[data-wire-id="line"][data-wire-hitbox]').press('Enter');
  const inspector = page.getByRole('complementary', { name: 'Inspector', exact: true });
  if (!(await inspector.isVisible()))
    await activateControl(
      page,
      page.locator('.table-top-right').getByRole('button', { name: 'Inspect', exact: true }),
    );
  await activateControl(page, inspector.getByRole('button', { name: 'Properties', exact: true }));
  return inspector;
}
async function exportCircuit(page: Page) {
  await page.keyboard.press('Escape');
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await activateControl(page, page.getByRole('button', { name: /^Import \/ Export/ }));
  const dialog = page.getByRole('dialog', { name: 'Import and export circuit' });
  await activateControl(page, dialog.getByRole('button', { name: 'Export', exact: true }));
  await activateControl(page, dialog.getByRole('button', { name: /^JSON/ }));
  const download = page.waitForEvent('download');
  await activateControl(page, dialog.getByRole('button', { name: 'Download', exact: true }));
  const path = await (await download).path();
  const document = JSON.parse(readFileSync(path!, 'utf8')).circuit as Circuit;
  await page.keyboard.press('Escape');
  return document;
}

test('WR-01 AWG/Al/method draft, reset, save, Undo/Redo, reload and JSON round trip', async ({
  page,
}) => {
  const original = fixture();
  await importProfileCircuit(page, original);
  let inspector = await wireProperties(page);
  await expect(inspector.getByRole('region', { name: 'Saved wire properties' })).toContainText(
    'Copper · Cu',
  );
  await activateControl(page, inspector.getByRole('button', { name: 'Configure', exact: true }));
  await inspector.getByLabel('Conductor size units').selectOption('awg');
  await inspector.getByLabel('Wire size in AWG').selectOption('12');
  await inspector.getByLabel('Wire length in meters').fill('17');
  await inspector.getByLabel('Wire draft installation method').selectOption('B1');
  await inspector.getByLabel('Wire draft derating factor').fill('0.8');
  await activateControl(page, inspector.getByRole('button', { name: /Aluminum/ }));
  const preview = inspector.getByRole('region', { name: 'Draft values · not saved' });
  await expect(preview).toContainText('12 AWG · 3.31 mm²');
  await expect(preview).toContainText('Not assessed for this area');
  await expect(preview).toContainText('Aluminium · Al');
  await activateControl(page, inspector.getByRole('button', { name: 'Reset draft' }));
  await expect(inspector.getByLabel('Conductor size units')).toHaveValue('mm2');
  await expect(preview).toContainText('Copper · Cu');
  await inspector.getByLabel('Conductor size units').selectOption('awg');
  await inspector.getByLabel('Wire size in AWG').selectOption('12');
  await inspector.getByLabel('Wire length in meters').fill('17');
  await inspector.getByLabel('Wire draft installation method').selectOption('B1');
  await inspector.getByLabel('Wire draft derating factor').fill('0.8');
  await activateControl(page, inspector.getByRole('button', { name: /Aluminum/ }));
  await activateControl(page, inspector.getByRole('button', { name: 'Apply settings' }));
  await activateControl(page, inspector.getByRole('button', { name: 'Properties', exact: true }));
  const saved = inspector.getByRole('region', { name: 'Saved wire properties' });
  await expect(saved).toContainText('12 AWG · 3.31 mm²');
  await expect(saved).toContainText('Method B1 · Conduit');
  // 20 °C Al resistance = 0.0282 * 17 / 3.31 = 0.1448338… Ω.
  await expect(saved).toContainText('0.14483 Ω');
  await expect(saved).toContainText('Saved wire value');
  await page.keyboard.press('Control+z');
  await expect(saved).toContainText('Copper · Cu');
  await page.keyboard.press('Control+Shift+z');
  await expect(saved).toContainText('12 AWG · 3.31 mm²');
  // Ctrl+S exports JSON; reload only after the debounced autosave is durable.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<Circuit['wires'][number] | undefined>((resolve, reject) => {
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
                resolve(
                  read.result?.circuit?.wires.find((wire: { id: string }) => wire.id === 'line'),
                );
              };
            };
          }),
      ),
    )
    .toMatchObject({
      gauge: 12,
      customCableMm2: 3.31,
      material: 'aluminum',
      installationMethod: 'B1',
      deratingFactor: 0.8,
      lengthMeters: 17,
    });
  await page.reload();
  inspector = await wireProperties(page);
  await expect(inspector).toContainText('Method B1 · Conduit');
  const exported = await exportCircuit(page);
  const wire = exported.wires.find((value) => value.id === 'line');
  await expect(wire).toMatchObject({
    gauge: 12,
    material: 'aluminum',
    installationMethod: 'B1',
    deratingFactor: 0.8,
    lengthMeters: 17,
  });
  expect(wire?.customCableMm2).toBe(3.31);
  expect(wire?.controlPoints).toEqual(original.wires[0]!.controlPoints);
  await importProfileCircuit(page, exported);
  inspector = await wireProperties(page);
  await expect(inspector).toContainText('12 AWG · 3.31 mm²');
  await expect(inspector).toContainText('Not assessed for this area');
});

test('WR-01 supported metric C/B1/A summaries keep installation and capacity basis visible', async ({
  page,
}) => {
  await importProfileCircuit(page, fixture());
  const inspector = await wireProperties(page);
  await activateControl(page, inspector.getByRole('button', { name: 'Configure', exact: true }));
  for (const [method, name] of [
    ['C', 'Clipped direct'],
    ['B1', 'Conduit'],
    ['A', 'Thermal insulation'],
  ]) {
    await inspector.getByLabel('Wire draft installation method').selectOption(method!);
    await inspector.getByLabel('Wire size in mm2').fill('2.5');
    const preview = inspector.getByRole('region', { name: 'Draft values · not saved' });
    await expect(preview).toContainText(`Method ${method} · ${name}`);
    await expect(preview).toContainText('0.07 Ω');
    await expect(preview).toContainText('A estimated');
    await activateControl(page, inspector.getByRole('button', { name: 'Apply settings' }));
    await activateControl(page, inspector.getByRole('button', { name: 'Properties', exact: true }));
    await expect(inspector).toContainText(`Method ${method} · ${name}`);
    await activateControl(page, inspector.getByRole('button', { name: 'Configure', exact: true }));
  }
});

test('CT-02 Properties and Specs share selected-instance ratings and canonical terminals', async ({
  page,
}) => {
  await importProfileCircuit(page, fixture());
  const inspector = await openInspector(page, 'heater');
  const specs = inspector.getByRole('region', { name: 'Declared model specifications' });
  await expect(specs).toContainText('Selected instance');
  await expect(specs).toContainText('1250 W');
  await expect(specs).toContainText('Saved instance');
  await activateControl(page, inspector.getByRole('button', { name: /Technical specifications/ }));
  const modal = page.getByRole('dialog', { name: 'Component specifications' });
  await expect(modal.getByRole('region', { name: 'Declared model specifications' })).toContainText(
    '1250 W',
  );
  await expect(modal).not.toContainText('13.0A continuous');
  await page.keyboard.press('Escape');
  await activateControl(page, inspector.getByRole('button', { name: 'Detailed model settings' }));
  const model = page.getByRole('dialog', { name: /· detailed settings$/ });
  await expect(model.getByRole('region', { name: 'Electrical model section' })).toBeVisible();
  await expect(model.getByRole('button', { name: /rotate/i })).toHaveCount(0);
});

test('CT-01 missing supply badge opens the target; unassessed palette parts remain discoverable', async ({
  page,
}) => {
  const circuit = fixture();
  circuit.wires = [];
  circuit.globalVoltage = 12;
  circuit.supply = explicitSupplyProfile({ kind: 'dc', voltage: 12 });
  await importProfileCircuit(page, circuit);
  await activateControl(
    page,
    page.locator('[data-component-id="heater"]').getByRole('button', { name: /Supply unknown/ }),
  );
  const inspector = page.getByRole('complementary', { name: 'Inspector', exact: true });
  await expect(inspector).toContainText('1250 W');
  await page.keyboard.press('Escape');
  await activateControl(page, page.locator('.table-browse'));
  const library = page.getByRole('dialog', { name: 'Component library' });
  await library.getByLabel('Search components').fill('MCB');
  const candidate = library.locator('[data-palette-type="mcb"]');
  await expect(candidate).toBeVisible();
  await expect(candidate).toHaveAttribute('data-compatibility', 'unassessed');
  await expect(candidate).toContainText('Ratings unknown');
  await library.getByLabel('Search components').fill('LED');
  await expect(library.locator('[data-palette-type="bulb"]')).toHaveCount(0);
  await library.getByRole('checkbox', { name: /Show all/ }).check();
  const incompatible = library.locator('[data-palette-type="bulb"]');
  await expect(incompatible).toBeVisible();
  await expect(incompatible).toHaveAttribute('data-compatibility', 'incompatible');
  await expect(incompatible).toContainText('Supply mismatch');
});

test('FL-05 Help has six readable steps and multiple causes require explicit inspection', async ({
  page,
}, info) => {
  const circuit = fixture();
  circuit.faults = [
    {
      ...createInjectedFault('open-circuit', { type: 'component', id: 'heater' }),
      id: 'cause-open',
    },
    { ...createInjectedFault('arc-fault', { type: 'component', id: 'heater' }), id: 'cause-arc' },
  ];
  await importProfileCircuit(page, circuit);
  await openInspector(page, 'heater');
  const tools = await openCircuitTools(page);
  const basic = page.getByTitle(
    'Basic Student Mode active — click to switch to Pro Electrician Mode',
  );
  if (await basic.isVisible()) await activateControl(page, basic);
  await activateControl(page, tools.locator('[data-tour="fault-lab"]'));
  const panel = page.getByLabel('Fault Lab panel');
  const picker = panel.getByLabel('Inspect applied cause');
  await expect(picker).toHaveValue('');
  await expect(panel).toContainText('2 causes on this target');
  await picker.selectOption('cause-open');
  await expect(picker).toHaveValue('cause-open');
  await picker.selectOption('cause-arc');
  await expect(panel.locator('[data-run-state]')).toHaveAttribute('data-run-state', 'not-run');
  await activateControl(page, panel.getByRole('button', { name: 'Help', exact: true }));
  const help = page.getByRole('dialog').filter({ has: page.locator('.fault-lab-help-steps') });
  await expect(help.locator('li')).toHaveCount(6);
  await help.getByText('Run again to verify', { exact: true }).scrollIntoViewIfNeeded();
  await expect(help.getByText('Run again to verify', { exact: true })).toBeVisible();
  await expect(help).toContainText('turn ON deliberately');
  await page.screenshot({ path: info.outputPath('fault-help.png') });
  await page.keyboard.press('Escape');
  await expect(help).not.toBeVisible();
  await expect(panel.getByRole('button', { name: 'Help', exact: true })).toBeFocused();
});

test('UI-06 every declared family retains conditional model sections and existing controls', async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const types = [
    'space-heater',
    'bulb',
    'ceiling-fan',
    'bell',
    'motor-3phase',
    'single-way-switch',
    'fan-dimmer',
    'delay-timer',
    'mcb',
    'socket-2pin',
    'ac-mains-supply',
    'live-terminal',
    'earth-terminal',
    'kwh-meter',
    'transformer-8v',
    'spd',
    'temperature-sensor',
  ];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const circuit = normalizeCircuitDocument({
    globalVoltage: 230,
    components: types.map((type, index) => ({
      id: `family-${index}`,
      type,
      x: 150 + (index % 5) * 220,
      y: 100 + Math.floor(index / 5) * 180,
      state: {},
    })),
    wires: [],
  });
  await importProfileCircuit(page, circuit);
  for (const [index, type] of types.entries()) {
    const inspector = await openInspector(page, `family-${index}`);
    await activateControl(page, inspector.getByRole('button', { name: 'Detailed model settings' }));
    const model = page.getByRole('dialog', { name: /· detailed settings$/ });
    await expect(model.getByRole('region', { name: 'Electrical model section' })).toBeVisible();
    await expect(model.getByRole('button', { name: /rotate/i })).toHaveCount(0);
    expect(
      await model
        .locator('[data-model-section]')
        .evaluateAll((sections) =>
          sections.every((section) => (section.textContent?.trim().length ?? 0) > 20),
        ),
      type,
    ).toBe(true);
    if (['motor-3phase', 'delay-timer', 'mcb', 'bulb'].includes(type))
      await expect(model.getByRole('region', { name: 'Behaviour model section' })).toBeVisible();
    if (type === 'earth-terminal')
      await expect(model.getByRole('region', { name: 'Behaviour model section' })).toHaveCount(0);
    if (index === 0) await page.screenshot({ path: info.outputPath('model-sections.png') });
    await page.keyboard.press('Escape');
    await expect(model).not.toBeVisible();
  }
  expect(errors).toEqual([]);
});

for (const scheme of ['Light', 'Dark']) {
  test(`UI-04/05 ${scheme}: five-width wire summary, notifications and keyboard clearance`, async ({
    page,
  }, info) => {
    test.setTimeout(120000);
    await importProfileCircuit(page, fixture());
    await activateControl(page, page.getByRole('button', { name: 'Settings', exact: true }));
    const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
    await activateControl(page, settings.getByRole('button', { name: 'Display', exact: true }));
    await activateControl(page, settings.getByRole('button', { name: new RegExp(`^${scheme} `) }));
    await activateControl(page, settings.getByRole('button', { name: 'Done', exact: true }));
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 768 },
      { width: 640, height: 780 },
      { width: 390, height: 844 },
      { width: 360, height: 740 },
    ]) {
      await page.setViewportSize(viewport);
      const inspector = await wireProperties(page);
      const summary = inspector.getByRole('region', { name: 'Saved wire properties' });
      await expect(summary).toContainText('Copper · Cu');
      await expect(summary).toContainText('Method C · Clipped direct');
      expect(await summary.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
      await activateControl(
        page,
        inspector.getByRole('button', { name: 'Configure', exact: true }),
      );
      await inspector.getByLabel('Wire label').fill(`${scheme}-${viewport.width}`);
      await activateControl(page, inspector.getByRole('button', { name: 'Apply settings' }));
      await activateControl(
        page,
        inspector.getByRole('button', { name: 'Properties', exact: true }),
      );
      const notice = page
        .locator('[data-notification]')
        .filter({ hasText: 'Basic settings updated' });
      const undo = notice.getByRole('button', { name: 'Undo', exact: true });
      await undo.focus();
      await expect(undo).toBeFocused();
      expect(
        await undo.evaluate((node) => {
          const box = node.getBoundingClientRect();
          const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
          return hit !== null && node.contains(hit);
        }),
      ).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const toast = await page
        .getByRole('complementary', { name: 'Recent notifications' })
        .boundingBox();
      expect(
        (await notice.locator('.table-notification-copy').boundingBox())!.width,
      ).toBeGreaterThan(100);
      const panel = await inspector.boundingBox();
      expect(
        toast &&
          panel &&
          (toast.x + toast.width <= panel.x + 1 || toast.y + toast.height <= panel.y + 1),
      ).toBe(true);
      await page.screenshot({
        path: info.outputPath(`${scheme.toLowerCase()}-${viewport.width}.png`),
      });
      await activateControl(page, notice.getByRole('button', { name: /Dismiss/ }));
    }
  });
}
