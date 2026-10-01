import type { Circuit, WireInstance } from '@electrasim/domain';
import { expect, test } from '@playwright/test';

const wire = (id: string, from: string, port: number, to: string, end: number): WireInstance => ({
  id,
  fromComponentId: from,
  fromPortIndex: port,
  toComponentId: to,
  toPortIndex: end,
  controlPoints: [],
});
const circuit: Circuit = {
  components: [
    ['live', 'live-terminal', 280, 220],
    ['neutral', 'neutral-terminal', 280, 540],
    ['control', 'single-way-switch', 460, 220],
    ['relay', 'relay-spdt', 650, 330],
    ['no', 'bulb', 880, 220],
    ['nc', 'bulb', 880, 540],
  ].map(([id, type, x, y]) => ({
    id: String(id),
    type: String(type),
    x: Number(x),
    y: Number(y),
    state: { on: false },
  })),
  wires: [
    wire('contact-feed', 'live', 0, 'relay', 2),
    wire('coil-feed', 'live', 0, 'control', 0),
    wire('coil-switch', 'control', 1, 'relay', 0),
    wire('coil-return', 'relay', 1, 'neutral', 0),
    wire('no-feed', 'relay', 3, 'no', 0),
    wire('nc-feed', 'relay', 4, 'nc', 0),
    wire('no-return', 'no', 1, 'neutral', 0),
    wire('nc-return', 'nc', 1, 'neutral', 0),
  ],
};

test('guest relay coil transfers NO/NC through the simulation worker and drops out', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^Run Simulation$/ })).toBeVisible();
  await page.keyboard.press('Control+e');
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: /^Import$/ }).click();
  await modal.locator('textarea').fill(JSON.stringify({ version: 1, exportedAt: 0, circuit }));
  await modal.getByRole('button', { name: 'Import from paste' }).click();
  await expect(modal.getByText('Loaded 6 components, 8 wires.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('f');
  await page.getByRole('button', { name: /^Run Simulation$/ }).click();
  const relay = page.locator('[data-component-id="relay"] [data-component-hitbox]');
  const control = page.locator('[data-component-id="control"] [data-component-hitbox]');
  const result = () =>
    page.evaluate(async () => {
      const ui = '/src/store/uiStore.ts';
      const client = '/src/sim-worker/client.ts';
      const state = (await import(ui)).useUiStore.getState().simResult;
      return {
        coil: state?.coilStates?.relay,
        no: state?.energizedComponents.has('no'),
        nc: state?.energizedComponents.has('nc'),
        worker: (await import(client)).simWorkerActive(),
      };
    });
  await expect.poll(result).toEqual({ coil: false, no: false, nc: true, worker: true });
  await expect(relay).toHaveAttribute('aria-pressed', 'false');
  await control.press('Enter');
  await expect.poll(result).toEqual({ coil: true, no: true, nc: false, worker: true });
  await expect(relay).toHaveAttribute('aria-pressed', 'true');
  // Wired coils derive their state; keyboard activation cannot override the solver.
  await relay.press('Enter');
  await expect(relay).toHaveAttribute('aria-pressed', 'true');
  await control.press('Enter');
  await expect.poll(result).toEqual({ coil: false, no: false, nc: true, worker: true });
  await expect(relay).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});
