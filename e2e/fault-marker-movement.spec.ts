import { readFile } from 'node:fs/promises';
import { COMP_H, FAULT_REGISTRY, createInjectedFault } from '@electrasim/domain';
import { type Page, expect } from '@playwright/test';
import { importProfileCircuit } from './helpers/catalogue-profiles';
import { type Scenario, scenarios } from './helpers/fault-scenarios';
import { test } from './helpers/paid-test';
import { activateControl, fitCanvas } from './helpers/workbench';

async function routeErrors(page: Page, scenario: Scenario) {
  return page.evaluate((scenario) => {
    const canvas = document.querySelector('[data-circuit-canvas]')!;
    const fault = canvas.querySelector(`[data-fault-fx="${scenario.fault}"]`)!;
    const pathFor = (id: string) => {
      const hit = canvas.querySelector(`[data-wire-id="${id}"]`)!;
      return hit instanceof SVGPathElement ? hit : hit.querySelector<SVGPathElement>('path')!;
    };
    const results: number[] = [];
    for (const cut of fault.querySelectorAll<SVGGElement>('[data-fault-cut-wire]')) {
      const id = cut.getAttribute('data-fault-cut-wire')!;
      const wire = scenario.circuit.wires.find((w) => w.id === id)!;
      const path = pathFor(id);
      const length = path.getTotalLength();
      const from =
        scenario.target.id === wire.fromComponentId && scenario.terminal === wire.fromPortIndex;
      const at =
        scenario.terminal === undefined
          ? length / 2
          : from
            ? Math.min(18, length / 2)
            : length - Math.min(18, length / 2);
      const point = path.getPointAtLength(at);
      const expected = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM()!);
      const actual = new DOMPoint(0, 0).matrixTransform(cut.getScreenCTM()!);
      results.push(Math.hypot(expected.x - actual.x, expected.y - actual.y));
    }
    for (const overlay of fault.querySelectorAll<SVGPathElement>('[data-fault-swap-wire]')) {
      const path = pathFor(overlay.getAttribute('data-fault-swap-wire')!);
      results.push(
        path.getAttribute('d') === overlay.getAttribute('d') ? 0 : Number.POSITIVE_INFINITY,
      );
    }
    for (const bridge of fault.querySelectorAll<SVGPathElement>('[data-fault-bypass-pole]')) {
      const ports = bridge.getAttribute('data-fault-bypass-pole')!.split(':');
      for (const [index, port] of ports.entries()) {
        const pin = canvas.querySelector<SVGCircleElement>(
          `[data-component-id="${scenario.target.id}"] [data-port-index="${port}"]`,
        )!;
        const expected = new DOMPoint(pin.cx.baseVal.value, pin.cy.baseVal.value).matrixTransform(
          pin.getScreenCTM()!,
        );
        const p = bridge.getPointAtLength(index === 0 ? 0 : bridge.getTotalLength());
        const actual = new DOMPoint(p.x, p.y).matrixTransform(bridge.getScreenCTM()!);
        results.push(Math.hypot(expected.x - actual.x, expected.y - actual.y));
      }
    }
    return results;
  }, scenario);
}

async function anchorError(page: Page, scenario: Scenario) {
  return page.evaluate(
    ({ scenario, height }) => {
      const canvas = document.querySelector('[data-circuit-canvas]')!;
      const chip = canvas.querySelector<SVGGElement>(`[data-fault-chip="${scenario.fault}"]`)!;
      const { target, terminal } = scenario;
      const wireTarget = target.type === 'wire';
      const actual = new DOMPoint(
        0,
        terminal !== undefined ? 19 : wireTarget ? 22 : height / 2 + 14,
      ).matrixTransform(chip.getScreenCTM()!);
      let expected: DOMPoint;
      if (wireTarget) {
        const hit = canvas.querySelector(`[data-wire-id="${target.id}"][data-wire-hitbox]`)!;
        const path =
          hit instanceof SVGPathElement ? hit : hit.querySelector<SVGPathElement>('path')!;
        const midpoint = path.getPointAtLength(path.getTotalLength() / 2);
        expected = new DOMPoint(midpoint.x, midpoint.y).matrixTransform(path.getScreenCTM()!);
      } else if (terminal !== undefined) {
        const pin = canvas.querySelector<SVGCircleElement>(
          `[data-component-id="${target.id}"] [data-port-index="${terminal}"]`,
        )!;
        expected = new DOMPoint(pin.cx.baseVal.value, pin.cy.baseVal.value).matrixTransform(
          pin.getScreenCTM()!,
        );
      } else {
        const body = canvas.querySelector<SVGRectElement>(
          `[data-component-id="${target.id}"] [data-component-hitbox]`,
        )!;
        const box = body.getBBox();
        expected = new DOMPoint(box.x + box.width / 2, box.y + box.height / 2).matrixTransform(
          body.getScreenCTM()!,
        );
      }
      return {
        errorPx: Math.hypot(actual.x - expected.x, actual.y - expected.y),
        actual: { x: actual.x, y: actual.y },
        expected: { x: expected.x, y: expected.y },
      };
    },
    { scenario, height: COMP_H },
  );
}

test('FL-04 all fourteen fault anchors follow live drag, release and rotation', async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  const phone = /phone|mobile/.test(testInfo.project.name);
  await page.setViewportSize({ width: phone ? 390 : 1440, height: 1000 });
  expect(scenarios.map((s) => s.fault).sort()).toEqual(Object.keys(FAULT_REGISTRY).sort());
  const results: object[] = [];
  for (const scenario of scenarios) {
    const target =
      scenario.terminal === undefined
        ? scenario.target
        : { type: 'port' as const, componentId: scenario.target.id, portIndex: scenario.terminal };
    const circuit = { ...scenario.circuit, faults: [createInjectedFault(scenario.fault, target)] };
    await importProfileCircuit(page, circuit);
    const endpoint =
      scenario.target.type === 'wire'
        ? circuit.wires.find((w) => w.id === scenario.target.id)!.fromComponentId
        : scenario.target.id;
    await fitCanvas(page);
    const body = page.locator(`[data-component-id="${endpoint}"] [data-component-hitbox]`);
    await body.press('Enter');
    await fitCanvas(page);
    const box = (await body.boundingBox())!;
    const componentNode = page.locator(`[data-component-id="${endpoint}"]`);
    const transformBeforeMove = await componentNode.getAttribute('transform');
    const before = await anchorError(page, scenario);
    const beforeRoutes = await routeErrors(page, scenario);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2 + 90, { steps: 6 });
    // Two frames let the real pointer preview and its dependent overlay commit.
    await page.evaluate(
      () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
    );
    const during = await anchorError(page, scenario);
    const duringRoutes = await routeErrors(page, scenario);
    expect(
      Math.hypot(during.expected.x - before.expected.x, during.expected.y - before.expected.y),
    ).toBeGreaterThan(10);
    await page.mouse.up();
    // Premium fault documents authorize the committed edit asynchronously. A
    // second edit must wait for that commit rather than race the access guard.
    await expect(componentNode).not.toHaveAttribute('transform', transformBeforeMove!);
    const released = await anchorError(page, scenario);
    const releasedRoutes = await routeErrors(page, scenario);
    await body.focus();
    await expect(body).toBeFocused();
    await body.press('Shift+R');
    await expect(page.locator(`[data-component-id="${endpoint}"]`)).toHaveAttribute(
      'transform',
      /rotate\(90 /,
    );
    const rotated = await anchorError(page, scenario);
    const rotatedRoutes = await routeErrors(page, scenario);
    const routes = { beforeRoutes, duringRoutes, releasedRoutes, rotatedRoutes };
    results.push({ fault: scenario.fault, before, during, released, rotated, routes });
    for (const [step, result] of Object.entries({ before, during, released, rotated }))
      expect.soft(result.errorPx, `${scenario.fault}: ${step}`).toBeLessThanOrEqual(1);
    for (const [step, errors] of Object.entries(routes))
      for (const error of errors)
        expect.soft(error, `${scenario.fault}: ${step}`).toBeLessThanOrEqual(1);
  }
  await testInfo.attach('all-type-movement', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
});

for (const pathKind of ['orthogonal', 'bezier'] as const)
  for (const dense of [false, true])
    test(`FL-04 bent ${pathKind} wire and terminal markers survive zoom and reroute (${dense ? 'dense' : 'ordinary'})`, async ({
      page,
    }, testInfo) => {
      test.setTimeout(90_000);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      for (const kind of ['wire', 'terminal'] as const) {
        const base = scenarios[kind === 'wire' ? 0 : 3]!;
        const id = kind === 'wire' ? 'load-feed' : 'cpc';
        const circuit = {
          ...base.circuit,
          components: [
            ...base.circuit.components,
            { id: 'alternate', type: 'socket-3pin', x: 850, y: 620, state: {} },
            ...(dense
              ? Array.from({ length: 80 }, (_, i) => ({
                  id: `spare-${i}`,
                  type: 'terminal-strip',
                  x: 1100 + (i % 8) * 5,
                  y: 700 + Math.floor(i / 8) * 5,
                  state: {},
                }))
              : []),
          ],
          wires: base.circuit.wires.map((w) =>
            w.id === id
              ? {
                  ...w,
                  pathKind,
                  controlPoints: [
                    { x: 460, y: 100 },
                    { x: 650, y: 500 },
                  ],
                }
              : w,
          ),
          faults: [
            createInjectedFault(
              base.fault,
              kind === 'wire'
                ? base.target
                : { type: 'port', componentId: base.target.id, portIndex: base.terminal! },
            ),
          ],
        };
        const scenario = { ...base, circuit };
        await importProfileCircuit(page, circuit);
        if (dense) await expect(page.locator('[data-dense-wire-layer]')).toHaveCount(1);
        for (const zoom of [0, 1, 2]) {
          if (zoom) await activateControl(page, page.getByTitle('Zoom in', { exact: true }));
          const errors = await routeErrors(page, scenario);
          expect(errors.length).toBeGreaterThan(0);
          for (const error of errors) expect(error).toBeLessThanOrEqual(1);
        }
        const wire = page.locator(`[data-circuit-canvas] [data-wire-id="${id}"]`);
        await wire.press('r');
        await page
          .locator(
            `[data-component-id="alternate"] [data-port-group="${kind === 'wire' ? 0 : 2}"] [data-port-touch-target]`,
          )
          .press('Enter');
        await expect(page.locator('[data-circuit-canvas]')).not.toHaveAttribute(
          'data-reroute-active',
          /.+/,
        );
        if (kind === 'wire') {
          const errors = await routeErrors(page, scenario);
          expect(errors.length).toBeGreaterThan(0);
          for (const error of errors) expect(error).toBeLessThanOrEqual(1);
        } else {
          // A terminal fault stays on the old PE terminal; it must not follow the
          // unrelated end of a wire that was explicitly re-terminated elsewhere.
          expect((await anchorError(page, scenario)).errorPx).toBeLessThanOrEqual(1);
          await expect(page.locator(`[data-fault-cut-wire="${id}"]`)).toHaveCount(0);
        }
        await page.screenshot({
          path: testInfo.outputPath(`${kind}-rerouted.png`),
          animations: 'disabled',
        });
      }
    });

test('FL-04 exported SVG retains exact static fault geometry', async ({ page }, testInfo) => {
  const base = scenarios[0]!;
  const circuit = {
    ...base.circuit,
    wires: base.circuit.wires.map((w) =>
      w.id === base.target.id
        ? {
            ...w,
            pathKind: 'orthogonal' as const,
            controlPoints: [
              { x: 480, y: 130 },
              { x: 650, y: 520 },
            ],
          }
        : w,
    ),
    faults: [createInjectedFault(base.fault, base.target)],
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await importProfileCircuit(page, circuit);
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await activateControl(page, page.getByRole('button', { name: /^Import \/ Export/ }));
  const dialog = page.getByRole('dialog', { name: 'Import and export circuit', exact: true });
  await activateControl(page, dialog.getByRole('button', { name: 'Export', exact: true }));
  const downloaded = page.waitForEvent('download');
  await activateControl(page, dialog.getByRole('button', { name: /^SVG/ }));
  await activateControl(page, dialog.getByRole('button', { name: 'Download', exact: true }));
  const download = await downloaded;
  const file = testInfo.outputPath('fault-route.svg');
  await download.saveAs(file);
  const snapshot = await page.context().newPage();
  await snapshot.setContent(await readFile(file, 'utf8'));
  const errors = await routeErrors(snapshot, { ...base, circuit });
  expect(errors).toHaveLength(1);
  expect(errors[0]).toBeLessThanOrEqual(1);
  expect(
    await snapshot
      .locator('[data-fault-fx-layer]')
      .evaluate(
        (node) =>
          node.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
      ),
  ).toBe(0);
  await snapshot.screenshot({ path: testInfo.outputPath('exported-fault.png') });
  await snapshot.close();
});
