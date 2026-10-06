import type { Circuit } from '@electrasim/domain';
import { type Page, expect } from '@playwright/test';

export async function openCircuit(page: Page, input: Circuit) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto('/');
  const circuit = {
    ...input,
    components: input.components.map((c, i) => ({
      ...c,
      x: 140 + (i % 3) * 280,
      y: 140 + Math.floor(i / 3) * 200,
    })),
  };
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: /^Import \/ Export/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Import', exact: true }).click();
  await dialog
    .locator('textarea')
    .fill(JSON.stringify({ version: circuit.supply ? 2 : 1, exportedAt: 0, circuit }));
  await dialog.getByRole('button', { name: 'Import from paste' }).click();
  await expect(dialog).toContainText(
    `Loaded ${circuit.components.length} components, ${circuit.wires.length} wires.`,
  );
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
}

export async function documentAt(page: Page): Promise<Circuit> {
  return page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    const { useCircuitStore, selectCircuit } = await import(path);
    return selectCircuit(useCircuitStore.getState());
  });
}
export async function inspect(page: Page, id: string) {
  await page.getByTitle('Zoom to fit all (F)').click();
  await page.locator(`[data-component-id="${id}"] [data-component-hitbox]`).click();
  await page.getByTitle(/^Properties & (Settings|Specs)$/).click();
  return page.locator('[data-tour="inspector"]');
}
export async function run(page: Page) {
  await page.getByRole('button', { name: 'Run Simulation', exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = '/src/store/uiStore.ts';
        return (await import(path)).useUiStore.getState().simResult?.phasor?.status;
      }),
    )
    .toBe('converged');
}
