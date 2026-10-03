import { readFile } from 'node:fs/promises';
import type { Circuit } from '@electrasim/domain';
import { explicitSupplyProfile } from '@electrasim/domain/core/supplies';
import { type Page, expect, test } from '@playwright/test';
import { component as C, wire as W } from '../packages/domain/src/simulation/auditFixtures';

async function importWireCircuit(page: Page, dc = false) {
  const circuit: Circuit = {
    supply: explicitSupplyProfile(
      dc ? { kind: 'dc', voltage: 12 } : { kind: 'ac-single-phase', voltage: 230, frequencyHz: 50 },
    ),
    components: [
      { ...C('l', 'live-terminal'), x: 80, y: 160 },
      { ...C('n', 'neutral-terminal'), x: 80, y: 340 },
      { ...C('heater', 'space-heater', { customCableMm2: 1 }), x: 480, y: 160 },
    ],
    wires: [{ ...W('feed', 'l', 0, 'heater', 0), gauge: 16 }, W('return', 'heater', 1, 'n', 0)],
  };
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
  await expect(dialog.getByText('Loaded 3 components, 2 wires.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('[data-wire-hitbox][data-wire-id="feed"]').click({ force: true });
  await page.getByTitle(/^Properties & (Settings|Specs)$/).click();
  await expect(page.locator('[data-tour="inspector"]')).toContainText('Wire #feed');
  return circuit;
}

test('wire inspector preserves AWG physical size through metric edits, undo/redo and export', async ({
  page,
}) => {
  await importWireCircuit(page);
  const inspector = page.locator('[data-tour="inspector"]');
  await expect(inspector).toContainText('1.31 mm²');
  await expect(inspector).toContainText('Size source: saved AWG');
  await expect(inspector).toContainText('Capacity unassessed');
  await inspector.getByRole('button', { name: '6mm²', exact: true }).click();
  await expect(inspector).toContainText('6 mm²');
  await expect(inspector).toContainText('Size source: wire setting');
  await page.keyboard.press('Control+z');
  await expect(inspector).toContainText('1.31 mm²');
  await expect(inspector).toContainText('Size source: saved AWG');
  await page.keyboard.press('Control+y');
  await expect(inspector).toContainText('6 mm²');
  const download = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  const file = await download;
  const exported = JSON.parse(await readFile((await file.path())!, 'utf8')) as { circuit: Circuit };
  const feed = exported.circuit.wires.find((wire) => wire.id === 'feed');
  expect(feed?.customCableMm2).toBe(6);
  expect(feed?.gauge).toBeUndefined();
  expect(
    exported.circuit.components.find((component) => component.id === 'heater')?.state
      .customCableMm2,
  ).toBe(1);
  await inspector.getByRole('button', { name: '12 AWG', exact: true }).click();
  await expect(inspector).toContainText('3.31 mm²');
});

test('unavailable wire simulation shows no fabricated zero current, resistance or ampacity', async ({
  page,
}) => {
  await importWireCircuit(page, true);
  await page.getByTitle('Simulation Telemetry & Faults', { exact: true }).click();
  const inspector = page.locator('[data-tour="inspector"]');
  await expect(inspector.getByText('Unavailable', { exact: true })).toHaveCount(4);
  await page.getByRole('button', { name: /^Run Simulation$/ }).click();
  await expect(inspector.getByText('UNASSESSED', { exact: true })).toBeVisible();
  await expect(inspector.getByText('Unavailable', { exact: true })).toHaveCount(4);
  await expect(inspector).not.toContainText('0.050 Ω');
  await expect(inspector).not.toContainText('20 A');
});
