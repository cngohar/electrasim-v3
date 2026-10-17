import type { Circuit } from '@electrasim/domain';
import { normalizeCircuitDocument } from '@electrasim/domain/core/normalize';
import { type Page, expect } from '@playwright/test';
import { protectionCircuit } from '../packages/domain/src/core/protectionFixtures';
import { importProfileCircuit } from './helpers/catalogue-profiles';
import { test } from './helpers/paid-test';
import {
  activateControl,
  applyLabFault,
  fitCanvas,
  openCircuitTools,
  openInspector,
} from './helpers/workbench';

// Acceptance assertions, deliberately red at the 1.13.0 baseline. No expected-failure
// annotations: source and freshly built delivery must both pass after the fixes.
function cflCircuit(): Circuit {
  return normalizeCircuitDocument({
    globalVoltage: 230,
    components: [
      { id: 'L', type: 'live-terminal', x: 150, y: 400, state: {} },
      { id: 'N', type: 'neutral-terminal', x: 150, y: 140, state: {} },
      { id: 'CFL', type: 'bulb-cfl', x: 700, y: 400, state: {} },
    ],
    wires: [
      {
        id: 'line',
        fromComponentId: 'L',
        fromPortIndex: 0,
        toComponentId: 'CFL',
        toPortIndex: 0,
        pathKind: 'orthogonal',
        controlPoints: [],
      },
      {
        id: 'neutral',
        fromComponentId: 'N',
        fromPortIndex: 0,
        toComponentId: 'CFL',
        toPortIndex: 1,
        pathKind: 'orthogonal',
        controlPoints: [],
      },
    ],
  });
}

async function openLab(page: Page, circuit = cflCircuit(), target = 'CFL', wire = false) {
  await importProfileCircuit(page, circuit);
  if (wire) {
    await fitCanvas(page);
    await page.locator(`[data-wire-id="${target}"][data-wire-hitbox]`).press('Enter');
  } else await openInspector(page, target);
  const tools = await openCircuitTools(page);
  const mode = page.getByTitle(
    'Basic Student Mode active — click to switch to Pro Electrician Mode',
  );
  if (await mode.isVisible()) await activateControl(page, mode);
  await activateControl(page, tools.locator('[data-tour="fault-lab"]'));
  const panel = page.getByLabel('Fault Lab panel');
  await expect(panel).toBeVisible();
  return panel;
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (error) => {
    throw error;
  });
});

test('FL-01 applied card identifies the exact selected target', async ({ page }) => {
  const panel = await openLab(page);
  await applyLabFault(page, /Open Circuit Break/);
  await expect(panel.locator('[data-active-fault="open-circuit"]')).toHaveCount(1);
  await activateControl(page, panel.getByRole('button', { name: /Browse fault library/ }));
  const library = page.getByRole('dialog', { name: 'Fault library', exact: true });
  await expect(library.getByRole('button', { name: /Open Circuit Break/ })).toContainText(
    /Applied/i,
  );
});

test('FL-01 duplicate attempt explains rejection and preserves one cause', async ({ page }) => {
  const panel = await openLab(page);
  await applyLabFault(page, /Open Circuit Break/);
  await activateControl(page, panel.getByRole('button', { name: /Browse fault library/ }));
  await activateControl(
    page,
    page
      .getByRole('dialog', { name: 'Fault library', exact: true })
      .getByRole('button', { name: /Open Circuit Break/ }),
  );
  const review = page.getByRole('dialog', { name: 'Review fault edit' });
  if (await review.isVisible())
    await activateControl(page, review.getByRole('button', { name: 'Apply fault edit' }));
  await expect(panel.locator('[data-active-fault="open-circuit"]')).toHaveCount(1);
  // A prevented duplicate or rejected stale draft must have visible app feedback.
  await expect(
    page.getByText(/already applied|already exists|already active/i).first(),
  ).toBeVisible();
});

test('FL-02 first Lab command after blocked Run restores the selected target', async ({ page }) => {
  const circuit = protectionCircuit('mcb', 16);
  circuit.components.push({ id: 'outlet', type: 'socket-3pin', x: 690, y: 300, state: {} });
  circuit.components[2]!.x = 980;
  circuit.wires[1]!.toComponentId = 'outlet';
  circuit.wires[2]!.fromComponentId = 'outlet';
  const cable = circuit.wires[0]!;
  circuit.wires.push(
    { ...cable, id: 'cpc', fromPortIndex: 2, toComponentId: 'outlet', toPortIndex: 2 },
    {
      ...cable,
      id: 'load-l',
      fromComponentId: 'outlet',
      fromPortIndex: 0,
      toComponentId: 'lamp',
      toPortIndex: 0,
    },
    {
      ...cable,
      id: 'load-n',
      fromComponentId: 'lamp',
      fromPortIndex: 1,
      toComponentId: 'outlet',
      toPortIndex: 1,
    },
  );
  const panel = await openLab(page, circuit, 'outlet');
  await applyLabFault(page, /Reversed Polarity/);
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  const validation = page.getByRole('dialog', { name: 'Validation and Zs', exact: true });
  await expect(
    validation.getByRole('button', { name: 'Run anyway (teacher/demo)', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).not.toBeVisible();
  await activateControl(
    page,
    validation.getByRole('button', { name: 'Close dialog', exact: true }),
  );
  const tools = await openCircuitTools(page);
  await activateControl(page, tools.locator('[data-tour="fault-lab"]'));
  await expect(panel).toBeVisible();
  await expect(panel.locator('.fault-lab-stage [data-fault-target-diagram]')).toHaveAttribute(
    'data-fault-target-id',
    'outlet',
  );
});

async function validate(page: Page, circuit: Circuit) {
  await importProfileCircuit(page, circuit);
  await openCircuitTools(page);
  await activateControl(page, page.locator('[data-tour="validate"]'));
  const report = page.getByRole('dialog', { name: 'Validation and Zs', exact: true });
  await expect(report).toBeVisible();
  await expect(report).not.toContainText('Checking circuit');
  return report;
}

test('UI-02 terminal strip alone is never classified as a source', async ({ page }) => {
  const report = await validate(page, {
    globalVoltage: 230,
    wires: [],
    components: [{ id: 'strip', type: 'terminal-strip', x: 300, y: 300, state: {} }],
  });
  await expect(report).toContainText(/Missing Power Supply Source|No (power )?source/i);
});

test('UI-02 incomplete validation is never logged as success', async ({ page }) => {
  const report = await validate(page, {
    globalVoltage: 230,
    wires: [],
    components: [{ id: 'load', type: 'bulb-cfl', x: 300, y: 300, state: {} }],
  });
  await expect(report).toContainText('Missing Power Supply Source');
  await activateControl(page, report.getByRole('button', { name: 'Close dialog', exact: true }));
  await activateControl(page, page.getByRole('button', { name: 'Console', exact: true }));
  const entry = page
    .getByLabel('Console messages')
    .locator('.table-console-entry')
    .filter({ hasText: 'Circuit Validation:' });
  await expect(entry).toHaveCount(1);
  await expect(entry.locator('.table-log-type')).not.toHaveText('success');
});

test('FL-04 internal open leaves external conductors intact', async ({ page }) => {
  await openLab(page);
  await applyLabFault(page, /Open Circuit Break/);
  const canvas = page.getByRole('application', { name: 'Circuit diagram' });
  await expect(
    canvas.locator('[data-fault-fx="open-circuit"][data-fault-component="CFL"]'),
  ).toHaveCount(1);
  await expect(canvas.locator('[data-fault-sever-cut]')).toHaveCount(0);
});

test('FL-04 wire cut anchors to its associated bent rendered path within one pixel', async ({
  page,
}, testInfo) => {
  await openLab(page, cflCircuit(), 'neutral', true);
  await applyLabFault(page, /Open Circuit Break/);
  const canvas = page.getByRole('application', { name: 'Circuit diagram' });
  const cut = canvas.locator('[data-fault-wire="neutral"] [data-fault-sever-cut]');
  await expect(cut).toHaveCount(1);
  const distance = await cut.evaluate((node) => {
    const marker = node as SVGGElement;
    const path = document.querySelector<SVGPathElement>(
      '[data-circuit-canvas] [data-wire-id="neutral"] path.electrasim-wire-fade',
    );
    if (!path) throw new Error('Expected neutral rendered wire path is missing');
    const center = new DOMPoint(0, 0).matrixTransform(marker.getScreenCTM()!);
    const length = path.getTotalLength();
    const matrix = path.getScreenCTM()!;
    // At most 0.1 screen pixels between samples, bounding measurement error.
    const samples = Math.ceil(length * Math.hypot(matrix.a, matrix.b) * 10);
    let nearest = Number.POSITIVE_INFINITY;
    for (let i = 0; i <= samples; i++) {
      const point = path.getPointAtLength((length * i) / samples);
      const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
      nearest = Math.min(nearest, Math.hypot(center.x - screen.x, center.y - screen.y));
    }
    return nearest;
  });
  await testInfo.attach('associated-path-distance', {
    body: JSON.stringify({ wire: 'neutral', distancePx: distance }),
    contentType: 'application/json',
  });
  expect(distance).toBeLessThanOrEqual(1);
});

test('FL-03 CFL open diagnostic retains a fresh zero-current capture', async ({
  page,
}, testInfo) => {
  const panel = await openLab(page);
  const initialViewport = page.viewportSize()!;
  const notice = page.locator('[data-notification]').filter({ hasText: 'Fault Lab opened' });
  await notice.getByRole('button', { name: 'View Console' }).focus();
  const lane = page.getByRole('complementary', { name: 'Recent notifications' });
  const labWindow = page.locator('.table-dialog-panel').filter({ has: panel });
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 640, height: 780 },
    { width: 390, height: 844 },
    { width: 360, height: 740 },
  ]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(async () => {
        const a = await lane.boundingBox();
        const b = await labWindow.boundingBox();
        return !!a && !!b && (a.x + a.width <= b.x + 1 || a.y + a.height <= b.y + 1);
      })
      .toBe(true);
    expect(
      await panel.getByRole('button', { name: 'Help', exact: true }).evaluate((node) => {
        const b = node.getBoundingClientRect();
        const hit = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
        return !!hit && node.contains(hit);
      }),
    ).toBe(true);
    if (viewport.width === 360)
      await page.screenshot({ path: testInfo.outputPath('lab-notice-clearance-360.png') });
  }
  await page.setViewportSize(initialViewport);
  await applyLabFault(page, /Open Circuit Break/);
  await activateControl(page, page.getByRole('button', { name: 'Run Simulation', exact: true }));
  const readiness = page.getByRole('dialog', { name: 'Circuit readiness', exact: true });
  await expect(readiness).toBeVisible();
  await activateControl(
    page,
    readiness.getByRole('button', { name: 'Run diagnostic', exact: true }),
  );
  await expect(readiness).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Stop', exact: true })).toBeVisible();
  await expect(panel.getByText('Fresh captured response', { exact: true })).toBeVisible();
  await activateControl(page, panel.getByRole('button', { name: 'Response', exact: true }));
  await activateControl(page, panel.getByRole('tab', { name: 'Readings', exact: true }));
  await expect(panel).toContainText('0 A');
  await expect(panel).toContainText('0 W');
  await expect(panel).toContainText('230 V');
  await expect(panel.getByText(/^Circuit supply:/)).toContainText('230 V');
  await expect(panel).not.toContainText('["alias-source"');
  if (initialViewport.width <= 640) {
    const consoleTrigger = page.locator('.table-console-trigger');
    await expect(consoleTrigger.locator('.table-count')).not.toHaveCount(0);
    const a = await lane.boundingBox();
    const b = await consoleTrigger.boundingBox();
    expect(!!a && !!b && (a.x + a.width <= b.x + 1 || a.y + a.height <= b.y + 1)).toBe(true);
    expect(
      await consoleTrigger.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return !!hit && node.contains(hit);
      }),
    ).toBe(true);
  }
  await page.screenshot({
    path: testInfo.outputPath('cfl-diagnostic.png'),
    fullPage: true,
    animations: 'disabled',
  });
});

test('UI-01 real import outcome pauses on hover/focus, expires and stays in Console', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await importProfileCircuit(page, cflCircuit(), { fit: false });
  const toast = page
    .locator('[data-notification="success"]')
    .filter({ hasText: 'Imported circuit:' });
  await expect(toast).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Import and export circuit', exact: true }),
  ).not.toBeVisible();
  // Cross the boundary after closing the modal; its old pointer position can
  // already overlap the newly revealed card in mobile Chromium.
  await page.mouse.move(5, 5);
  await toast.hover();
  await expect.poll(() => toast.evaluate((node) => node.matches(':hover'))).toBe(true);
  await page.waitForTimeout(5200);
  await expect(toast).toBeVisible();
  await toast.getByRole('button', { name: 'View Console' }).focus();
  await page.mouse.move(5, 5);
  await page.waitForTimeout(5200);
  await expect(toast).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('notification-focused.png') });
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await page.keyboard.press('Escape');
  await expect(toast).not.toBeVisible({ timeout: 6500 });
  await activateControl(page, page.getByRole('button', { name: 'Console', exact: true }));
  const entry = page
    .getByLabel('Console messages')
    .locator('.table-console-entry')
    .filter({ hasText: 'Imported circuit:' });
  await expect(entry).toHaveCount(1);
  await expect(entry.locator('.table-log-type')).toHaveText('success');
});

test('UI-01 import failure and validation completion share visible severity and retained history', async ({
  page,
}) => {
  await importProfileCircuit(page, cflCircuit());
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await activateControl(page, page.getByRole('button', { name: /^Import \/ Export/ }));
  const importer = page.getByRole('dialog', { name: 'Import and export circuit', exact: true });
  await activateControl(page, importer.getByRole('button', { name: 'Import', exact: true }));
  await importer.locator('textarea').fill('');
  await activateControl(page, importer.getByRole('button', { name: 'Import from paste' }));
  await expect(importer).toContainText('Paste JSON content first.');
  await page.keyboard.press('Escape');
  const failure = page.getByRole('alert').filter({ hasText: 'Paste JSON content first.' });
  await expect(failure).toBeVisible();
  await activateControl(page, failure.getByRole('button', { name: 'View Console' }));
  await expect(page.getByLabel('Console messages')).toContainText('Paste JSON content first.');
  await activateControl(page, page.getByRole('button', { name: 'Close Console' }));
  await openCircuitTools(page);
  await activateControl(page, page.locator('[data-tour="validate"]'));
  await expect(page.locator('[data-progress="true"]')).toHaveCount(0);
  const report = page.getByRole('dialog', { name: 'Validation and Zs', exact: true });
  await expect(report).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.locator('[data-notification]').filter({ hasText: 'Circuit Validation:' }),
  ).toBeVisible();
});
