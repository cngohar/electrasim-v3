import type { Circuit } from '@electrasim/domain';
import { type Page, expect, test } from '@playwright/test';
import { damageCircuit, protectedDamageCircuit } from '../packages/domain/src/core/damageFixtures';

async function openCircuit(page: Page, circuit: Circuit) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: /^Import \/ Export/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await dialog.locator('textarea').fill(JSON.stringify({ version: 2, exportedAt: 0, circuit }));
  await dialog.getByRole('button', { name: 'Import from paste' }).click();
  await expect(dialog).toContainText(
    `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
}

async function run(page: Page) {
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  const override = page.getByRole('button', { name: 'Run anyway (teacher/demo)', exact: true });
  await expect(stop.or(override)).toBeVisible();
  if (!(await stop.isVisible())) await override.click();
  await expect(stop).toBeVisible();
}

async function settings(page: Page) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: /^Settings Preferences/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  await dialog.getByRole('button', { name: /^Simulation(?: Live visuals)?$/ }).click();
  return dialog;
}

async function snapshot(page: Page) {
  return page.evaluate(async () => {
    const storePath = '/src/store/circuitStore.ts';
    const uiPath = '/src/store/uiStore.ts';
    const c = (await import(storePath)).useCircuitStore.getState();
    const r = (await import(uiPath)).useUiStore.getState().simResult;
    return {
      components: c.components,
      wires: c.wires,
      supply: c.supply,
      faults: c.faults,
      calculations: r?.componentCalculations,
      wireCalculations: r?.wireCalculations,
      damaged: [...(r?.bustedWires ?? [])],
      errors: r?.errors,
    };
  });
}

test('damage settles with bounded overhead; toggle preserves electrical results and stop frees bodies', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openCircuit(page, damageCircuit());
  await run(page);
  const layer = page.locator('[data-matter-layer]');
  await expect(page.locator('[data-matter-target="wire:load-feed"]')).toHaveAttribute(
    'data-matter-effect',
    'damage',
    { timeout: 20000 },
  );
  await expect(layer).toHaveAttribute('data-matter-status', 'settled', { timeout: 15000 });
  await expect(layer).toHaveAttribute('data-matter-bodies', '0');
  const metrics = await layer.evaluate((el) => ({
    frames: Number(el.getAttribute('data-matter-frames')),
    meanMs: Number(el.getAttribute('data-matter-mean-ms')),
    p95Ms: Number(el.getAttribute('data-matter-p95-ms')),
  }));
  expect(metrics.frames).toBe(45);
  expect(metrics.p95Ms).toBeLessThan(4);
  await testInfo.attach('effects-overhead.json', {
    body: JSON.stringify(metrics),
    contentType: 'application/json',
  });
  await page.screenshot({ path: testInfo.outputPath('effects.png') });
  const before = await snapshot(page);
  const dialog = await settings(page);
  const toggle = dialog.getByRole('switch', { name: 'Wire and damage effects' });
  await toggle.click();
  await expect(page.locator('[data-matter-effect]')).toHaveCount(0);
  expect(await snapshot(page)).toEqual(before);
  await toggle.click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('[data-matter-target="wire:load-feed"]')).toBeVisible();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(layer).toHaveAttribute('data-matter-status', 'static');
  await expect(layer).toHaveAttribute('data-matter-bodies', '0');
  await expect(page.locator('[data-busted-wire-indicator]')).toBeVisible();
});

test('phone reduced motion retains damage cues and persists the effects preference', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openCircuit(page, damageCircuit());
  await run(page);
  const layer = page.locator('[data-matter-layer]');
  await expect(page.locator('[data-matter-target="wire:load-feed"]')).toHaveAttribute(
    'data-matter-effect',
    'damage',
    { timeout: 20000 },
  );
  await expect(layer).toHaveAttribute('data-matter-status', 'static');
  await expect(layer).toHaveAttribute('data-matter-bodies', '0');
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  const dialog = await settings(page);
  await dialog.getByRole('switch', { name: 'Wire and damage effects' }).click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  // Persistence writes are debounced; wait for IndexedDB before reloading.
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const path = '/src/store/settingsStore.ts';
        return (await import(path)).useSettingsStore.getState().physicsEffects;
      }),
    )
    .toBe(false);
  await page.waitForTimeout(600);
  await page.reload();
  const restored = await settings(page);
  await expect(restored.getByRole('switch', { name: 'Wire and damage effects' })).not.toBeChecked();
});

test('ordinary trip has no destruction; offscreen stress sleeps and reappears on return', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await openCircuit(page, protectedDamageCircuit());
  await run(page);
  await expect
    .poll(async () =>
      page.evaluate(async () => {
        const path = '/src/store/uiStore.ts';
        return (await import(path)).useUiStore.getState().simResult?.simulationState?.protection
          ?.control?.tripped
          ? 1
          : 0;
      }),
    )
    .toBeGreaterThan(0);
  await expect(page.locator('[data-matter-effect="damage"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  const slow = damageCircuit();
  slow.wires[1].damageModel!.withstandAmpSquaredSeconds = 10000;
  await openCircuit(page, slow);
  await run(page);
  const layer = page.locator('[data-matter-layer]');
  await expect(page.locator('[data-matter-effect="overload"]')).toBeVisible();
  await page.evaluate(async () => {
    const path = '/src/store/viewportStore.ts';
    (await import(path)).useViewportStore.getState().setPan({ x: -100000, y: -100000 });
  });
  await expect(layer).toHaveAttribute('data-matter-status', 'static');
  await expect(layer).toHaveAttribute('data-matter-bodies', '0');
  await expect(page.locator('[data-matter-effect="overload"]')).not.toBeVisible();
  await page.getByRole('button', { name: 'Fit', exact: true }).click();
  await expect(page.locator('[data-matter-effect="overload"]')).toBeVisible();
});

test('dense 200-component/400-wire canvas keeps effects static with unchanged circuit data', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  const circuit = damageCircuit();
  for (let i = 3; i < 200; i++)
    circuit.components.push({
      id: `load-${i}`,
      type: 'bulb-incandescent',
      x: 100 + (i % 15) * 100,
      y: 100 + Math.floor(i / 15) * 100,
      state: {},
    });
  while (circuit.wires.length < 400) {
    const index = circuit.wires.length;
    circuit.wires.push({
      ...circuit.wires[1],
      id: `extra-${index}`,
      toComponentId: `load-${3 + (index % 197)}`,
      pathKind: 'bezier',
      controlPoints: [],
      isBusted: true,
    });
  }
  await openCircuit(page, circuit);
  const before = await snapshot(page);
  const layer = page.locator('[data-matter-layer]');
  await expect(page.locator('[data-circuit-canvas]')).toHaveAttribute(
    'data-reduced-effects',
    'true',
  );
  await expect(layer).toHaveAttribute('data-matter-status', 'static');
  await expect(layer).toHaveAttribute('data-matter-bodies', '0');
  const measurements = await page.evaluate(async () => {
    const intervals: number[] = [];
    let previous = performance.now();
    for (let i = 0; i < 45; i++) {
      const now = await new Promise<number>((resolve) => requestAnimationFrame(resolve));
      intervals.push(now - previous);
      previous = now;
    }
    intervals.sort((a, b) => a - b);
    return {
      idleFrameP95Ms: intervals[Math.ceil(intervals.length * 0.95) - 1],
      components: 200,
      wires: 400,
      animatedBodies: 0,
    };
  });
  await testInfo.attach('dense-effects.json', {
    body: JSON.stringify(measurements),
    contentType: 'application/json',
  });
  expect(await snapshot(page)).toEqual(before);
});
