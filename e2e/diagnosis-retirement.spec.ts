import { expect, test } from '@playwright/test';
import { activateControl, openCircuitTools } from './helpers/workbench';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
});

test('Diagnosis records remain untouched and cannot resume over the normal saved circuit', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('[data-component-hitbox]').first()).toBeVisible();
  const original = await page.evaluate(async () => {
    const circuitPath = '/src/store/circuitStore.ts';
    const persistencePath = '/src/store/persistence.ts';
    const { useCircuitStore, selectCircuit } = await import(circuitPath);
    const first = useCircuitStore.getState().components[0];
    await useCircuitStore.getState().moveComponent(first.id, first.x + 41, first.y + 23);
    const circuit = selectCircuit(useCircuitStore.getState());
    await (await import(persistencePath)).persistCircuit(circuit);
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
            seed: 42,
            marker: 'keep-active',
            scenario: { faultedCircuit: { components: [], wires: [] } },
          },
          'electrasim:diagnosis:active:v1',
        );
        tx.objectStore('keyval').put(
          { completed: 7, marker: 'keep-stats' },
          'electrasim:diagnosis:stats:v1',
        );
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
    });
    return circuit;
  });
  await page.reload();
  await expect(page.locator('[data-component-hitbox]').first()).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const path = '/src/store/circuitStore.ts';
        const { useCircuitStore, selectCircuit } = await import(path);
        return selectCircuit(useCircuitStore.getState());
      }),
    )
    .toEqual(original);
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await expect(page.getByRole('button', { name: /^Diagnosis Lab/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Fault Lab/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await openCircuitTools(page);
  await expect(page.getByRole('button', { name: 'Diagnosis Lab', exact: true })).toHaveCount(0);
  const records = await page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('keyval-store', 1);
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction('keyval', 'readonly');
          const active = tx.objectStore('keyval').get('electrasim:diagnosis:active:v1');
          const stats = tx.objectStore('keyval').get('electrasim:diagnosis:stats:v1');
          tx.oncomplete = () => {
            resolve({ active: active.result, stats: stats.result });
            db.close();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
  );
  expect(records).toEqual({
    active: {
      version: 1,
      seed: 42,
      marker: 'keep-active',
      scenario: { faultedCircuit: { components: [], wires: [] } },
    },
    stats: { completed: 7, marker: 'keep-stats' },
  });
});

test('retired Diagnosis API endpoints return 404 on the local Worker', async ({ page }) => {
  await page.goto('/');
  for (const path of ['/api/diagnosis/attempts', '/api/diagnosis/attempts/preserved']) {
    expect((await page.request.get(path)).status()).toBe(404);
    expect(
      (
        await page.request.post(path, { data: {}, headers: { Origin: new URL(page.url()).origin } })
      ).status(),
    ).toBe(404);
  }
});
