import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
});

test('retired Challenge Mode does not resume or replace the normal autosaved circuit', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-component-hitbox]').first()).toBeVisible();
  const original = await page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    const circuit = (await import(path)).useCircuitStore.getState();
    const snapshot = { components: circuit.components, wires: circuit.wires };
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('keyval-store', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('keyval');
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('keyval', 'readwrite');
        tx.objectStore('keyval').put(
          {
            version: 1,
            challengeId: 'first-lamp-tutorial',
            attemptId: 'retired-attempt',
            startedAt: 1,
            elapsedMs: 1,
            hintsUsed: 0,
            attempts: 0,
            savedAt: 1,
          },
          'electrasim:challenge2:active:v1',
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    // Exercise the actual autosave path, then reload.
    const persistence = '/src/store/persistence.ts';
    const saved = await (await import(persistence)).persistCircuit({
      ...snapshot,
      globalVoltage: circuit.globalVoltage,
      supply: circuit.supply,
      faults: circuit.faults,
    });
    if (!saved) throw new Error('Normal circuit persistence failed');
    return snapshot;
  });
  await page.reload();
  await expect(page.locator('[data-component-hitbox]').first()).toBeVisible();
  await expect(
    page.getByRole('button', { name: /continue challenge|resume challenge/i }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Challenge Mode/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Guided Circuits/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Diagnosis Lab/ })).toHaveCount(0);
  const restored = await page.evaluate(async () => {
    const path = '/src/store/circuitStore.ts';
    const circuit = (await import(path)).useCircuitStore.getState();
    return { components: circuit.components, wires: circuit.wires };
  });
  expect(restored).toEqual(original);
});
