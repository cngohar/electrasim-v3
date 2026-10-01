/** Real Chromium against Vite + isolated local Worker. No API route mocks. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createWriteStream, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import type { Circuit } from '@electrasim/domain';
import { chromium, expect } from '@playwright/test';
import { localTestUrl } from './local-test-url';

export async function runSimulatorBrowser(options: {
  origin: string;
  persist: string;
  email: string;
  circuit: Circuit;
  revoke: () => Promise<void>;
}) {
  const workerOrigin = localTestUrl(options.origin, '', 'simulator worker');
  const port = await new Promise<number>((resolve) => {
    const server = createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      assert(addr && typeof addr !== 'string');
      server.close(() => resolve(addr.port));
    });
  });
  const origin = `http://127.0.0.1:${port}`;
  const log = createWriteStream(`${options.persist}/vite.log`);
  const vite = spawn(
    'bun',
    ['x', 'vite', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    {
      env: { ...process.env, DISABLE_HMR: 'true', LOCAL_WORKER_PORT: new URL(workerOrigin).port },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  vite.stdout.pipe(log);
  vite.stderr.pipe(log);
  const stopped = new Promise<void>((done) => vite.on('exit', () => done()));
  const browser = await chromium.launch({ headless: true });
  try {
    const deadline = Date.now() + 40_000;
    while (true) {
      try {
        if ((await fetch(origin)).ok) break;
      } catch {}
      if (Date.now() > deadline) throw new Error('Local browser server did not start');
      await new Promise((r) => setTimeout(r, 100));
    }
    const guest = await browser.newContext();
    await guest.addInitScript(() => {
      localStorage.setItem('electrasim:welcomed', '1');
      localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    const page = await guest.newPage();
    page.setDefaultTimeout(15000);
    page.on('pageerror', (error) => console.error('Guest browser error:', error.message));
    await page.goto(origin);
    await page
      .waitForFunction(() => document.querySelector('button[aria-label="Menu"]'), {
        timeout: 15000,
      })
      .catch(async (error) => {
        await page.screenshot({ path: `${options.persist}/guest-failure.png` });
        writeFileSync(`${options.persist}/guest-failure.html`, await page.content());
        throw error;
      });
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    await page.getByText('Diagnosis Lab', { exact: false }).first().click();
    await page.getByRole('button', { name: /Intermediate/ }).click();
    await expect(
      page
        .locator('section[aria-label="Diagnosis Lab"]')
        .getByText(/Something isn.t working correctly/i),
    ).toBeVisible();
    // Load the modules while online, then complete the actual guest exercise offline.
    await page.evaluate(async () => {
      const d = '/src/store/diagnosisStore.ts';
      const c = '/src/store/circuitStore.ts';
      await import(d);
      await import(c);
    });
    await guest.setOffline(true);
    const verdict = await page.evaluate(async () => {
      const diagnosisPath = '/src/store/diagnosisStore.ts';
      const circuitPath = '/src/store/circuitStore.ts';
      const { useDiagnosisStore } = await import(diagnosisPath);
      const { useCircuitStore } = await import(circuitPath);
      const state = useDiagnosisStore.getState();
      const fault = state.scenario.faults[0];
      useCircuitStore.getState().removeFault(fault.fault.id);
      state.selectFaultType(fault.fault.type);
      state.selectLocation(fault.locationKey);
      return state.submit()?.verdict;
    });
    assert.equal(verdict, 'success');
    await guest.close();

    const context = await browser.newContext();
    await context.addInitScript(() => {
      localStorage.setItem('electrasim:welcomed', '1');
      localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    const paidPage = await context.newPage();
    paidPage.setDefaultTimeout(15000);
    const errors: string[] = [];
    paidPage.on('pageerror', (e) => errors.push(e.message));
    await paidPage.goto(origin);
    await paidPage.getByRole('button', { name: 'Menu', exact: true }).click();
    await paidPage.getByText('Import / Export', { exact: true }).click();
    await paidPage.getByRole('button', { name: 'Saved circuits', exact: true }).click();
    await paidPage.getByLabel('Email', { exact: true }).fill(options.email);
    await paidPage.getByLabel('Password', { exact: true }).fill('Local-test-password-123!');
    await paidPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(paidPage.getByRole('button', { name: 'Sign out', exact: true })).toBeVisible();
    await paidPage.evaluate(async (circuit) => {
      const path = '/src/store/circuitStore.ts';
      const { useCircuitStore } = await import(path);
      useCircuitStore.getState().setCircuit(circuit);
    }, options.circuit);
    await paidPage.getByLabel('Circuit name', { exact: true }).fill('Browser saved premium');
    await paidPage.getByRole('button', { name: 'Save new circuit', exact: true }).click();
    await expect(paidPage.getByText('Circuit saved.', { exact: true })).toBeVisible();
    await paidPage.getByRole('button', { name: 'Close', exact: true }).last().click();
    // Paid placement, duplication and an edit all cross the real authorization endpoint.
    await paidPage.evaluate(async () => {
      const path = '/src/store/circuitStore.ts';
      const { useCircuitStore } = await import(path);
      useCircuitStore.getState().moveComponent('pro', 350, 100);
    });
    await expect
      .poll(() =>
        paidPage.evaluate(async () => {
          const path = '/src/store/circuitStore.ts';
          return (await import(path)).useCircuitStore
            .getState()
            .components.find((c: { id: string }) => c.id === 'pro').x;
        }),
      )
      .toBe(350);
    // Returning from the canvas must retain the saved document and its version.
    await paidPage.keyboard.press('Control+e');
    await paidPage.getByRole('button', { name: 'Saved circuits', exact: true }).click();
    await expect(paidPage.getByLabel('Circuit name', { exact: true })).toHaveValue(
      'Browser saved premium',
    );
    await paidPage.getByRole('button', { name: 'Update saved circuit', exact: true }).click();
    await expect(
      paidPage.getByText('Browser saved premium · version 2', { exact: true }),
    ).toBeVisible();
    const stored = await paidPage.evaluate(async () => {
      const list = await (await fetch('/api/circuits')).json();
      const doc = list.items.find(
        (item: { name: string }) => item.name === 'Browser saved premium',
      );
      return (await fetch(`/api/circuits/${doc.id}`)).json();
    });
    assert.equal(stored.version, 2);
    assert.equal(stored.circuit.components.find((c: { id: string }) => c.id === 'pro').x, 350);
    // Tab switches must retain the new version for a subsequent update too.
    await paidPage.getByRole('button', { name: 'Export', exact: true }).click();
    await paidPage.getByRole('button', { name: 'Saved circuits', exact: true }).click();
    await paidPage.getByRole('button', { name: 'Update saved circuit', exact: true }).click();
    await expect(
      paidPage.getByText('Browser saved premium · version 3', { exact: true }),
    ).toBeVisible();
    await paidPage.getByRole('button', { name: 'Close', exact: true }).last().click();
    await paidPage.evaluate(async () => {
      const path = '/src/store/diagnosisStore.ts';
      await (await import(path)).useDiagnosisStore.getState().start('advanced', 42);
    });
    const attemptId = await paidPage.evaluate(async () => {
      const path = '/src/store/diagnosisStore.ts';
      return (await import(path)).useDiagnosisStore.getState().serverAttemptId;
    });
    assert(attemptId);
    // Completion is accepted by the Worker, leaves the active IDB record and
    // contributes to stats exactly once before the next exercise starts.
    const faultCount = await paidPage.evaluate(async () => {
      const d = '/src/store/diagnosisStore.ts';
      const c = '/src/store/circuitStore.ts';
      const state = (await import(d)).useDiagnosisStore.getState();
      (await import(c)).useCircuitStore.getState().setCircuit(state.scenario.healthyCircuit);
      return state.scenario.faults.length;
    });
    for (let i = 0; i < faultCount; i++) {
      const version = await paidPage.evaluate(async (index) => {
        const path = '/src/store/diagnosisStore.ts';
        const state = (await import(path)).useDiagnosisStore.getState();
        const fault = state.scenario.faults[index];
        state.selectFaultType(fault.fault.type);
        state.selectLocation(fault.locationKey);
        state.submit();
        return state.serverVersion;
      }, i);
      await expect
        .poll(() =>
          paidPage.evaluate(async () => {
            const path = '/src/store/diagnosisStore.ts';
            return (await import(path)).useDiagnosisStore.getState().serverVersion;
          }),
        )
        .toBeGreaterThan(version);
    }
    await expect
      .poll(() =>
        paidPage.evaluate(async () => {
          const path = '/src/store/diagnosisStore.ts';
          return (await import(path)).useDiagnosisStore.getState().stats?.completed;
        }),
      )
      .toBe(1);
    assert.equal(
      await paidPage.evaluate(async () => {
        const path = '/src/store/diagnosisStore.ts';
        const store = (await import(path)).useDiagnosisStore;
        store.getState().exit();
        return store.getState().resume();
      }),
      false,
    );
    await paidPage.evaluate(async () => {
      const path = '/src/store/diagnosisStore.ts';
      await (await import(path)).useDiagnosisStore.getState().start('advanced', 43);
    });
    await options.revoke();
    const before = await paidPage.evaluate(async () => {
      const path = '/src/store/circuitStore.ts';
      const store = (await import(path)).useCircuitStore;
      const before = JSON.stringify({
        components: store.getState().components,
        faults: store.getState().faults,
      });
      store.getState().moveComponent(store.getState().components[0].id, 777, 888);
      return before;
    });
    await expect(
      paidPage.getByRole('complementary', { name: 'Membership and recovery' }),
    ).toBeVisible();
    await expect
      .poll(() =>
        paidPage.evaluate(async () => {
          const path = '/src/store/simulatorAccess.ts';
          return (await import(path)).useSimulatorAccess.getState().pending;
        }),
      )
      .toBe(0);
    assert.equal(
      await paidPage.evaluate(async () => {
        const path = '/src/store/circuitStore.ts';
        const state = (await import(path)).useCircuitStore.getState();
        return JSON.stringify({ components: state.components, faults: state.faults });
      }),
      before,
    );
    // Reloading a revoked exercise must retain the original document and repairs.
    await paidPage.reload();
    await expect(paidPage.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
    assert.equal(
      await paidPage.evaluate(async () => {
        const path = '/src/store/diagnosisStore.ts';
        return (await import(path)).useDiagnosisStore.getState().resume();
      }),
      true,
    );
    assert.deepEqual(
      await paidPage.evaluate(async () => {
        const d = '/src/store/diagnosisStore.ts';
        const c = '/src/store/circuitStore.ts';
        const state = (await import(c)).useCircuitStore.getState();
        return {
          blocked: (await import(d)).useDiagnosisStore.getState().accessBlocked,
          document: JSON.stringify({ components: state.components, faults: state.faults }),
        };
      }),
      { blocked: true, document: before },
    );
    const download = paidPage.waitForEvent('download');
    await paidPage.getByRole('button', { name: 'Export original', exact: true }).click();
    await (await download).saveAs(`${options.persist}/premium-backup.electrasim.json`);
    await paidPage.getByRole('button', { name: 'Create basic copy', exact: true }).click();
    const checks = paidPage
      .getByRole('complementary', { name: 'Membership and recovery' })
      .getByRole('checkbox');
    for (let i = 0; i < (await checks.count()); i++) await checks.nth(i).check();
    await paidPage
      .getByRole('button', { name: 'Back up original and open basic copy', exact: true })
      .click();
    await expect(
      paidPage.getByText(
        'Basic copy opened. The original backup is available under Saved circuits.',
        { exact: true },
      ),
    ).toBeVisible();
    await paidPage.screenshot({ path: `${options.persist}/basic-copy.png` });
    assert.deepEqual(errors, []);
    await context.close();
  } finally {
    await browser.close();
    vite.kill('SIGTERM');
    await stopped;
    log.end();
  }
}
