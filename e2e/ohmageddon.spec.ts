import { test } from './helpers/paid-test';
/**
 * Ohmageddon Mode e2e (plan §42, §44 "Rage", §57 Ohmageddon gate).
 *
 * The domain suite proves the modifiers are correct; this proves the *user*
 * can reach them, that the §24 safety rule holds in the real UI, and that the
 * setting survives a reload through the actual IndexedDB path rather than a
 * mocked one.
 *
 * Note the deliberate absence of `page.evaluate(import(...))` store pokes:
 * under Vite dev that yields a second module instance whose mutations the UI
 * never sees. Everything here is driven through real clicks.
 */

import { expect } from '@playwright/test';

const SETTINGS_KEY = 'electrasim:settings:v2';

test.beforeEach(async ({ page }, testInfo) => {
  /*
   * Ohmageddon generates and re-simulates compound-fault scenarios, which is
   * the heaviest work in the suite. WebKit takes minutes over it, and the
   * per-test budgets below (180 s / test.slow()) only hold when the iPad
   * project has the machine to itself — widen them again there so a full
   * three-project run cannot time these out.
   */
  test.slow(testInfo.project.name === 'tablet-safari');
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
});

/** Open Settings → Simulation, where the Ohmageddon toggle lives. */
async function openSimulationSettings(page: import('@playwright/test').Page) {
  await page.locator('button[title="Settings"]').click();
  await page
    .locator('dialog')
    .getByRole('button', { name: /Simulation/ })
    .click();
}

/** Open the Diagnosis Lab through the menu overlay. */
async function openDiagnosisLab(page: import('@playwright/test').Page) {
  await page.locator('button[aria-label="Menu"]').click();
  await page.getByText('Diagnosis Lab', { exact: true }).click();
}

async function enableOhmageddon(page: import('@playwright/test').Page) {
  await openSimulationSettings(page);
  const toggle = page.getByRole('switch', { name: /Ohmageddon/i });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await page
    .locator('dialog')
    .getByRole('button', { name: /^Done$/ })
    .click();
}

test.describe('Rage 4 — compound faults (§26, §27)', () => {
  /**
   * The evidence block must track the *live* circuit, not the briefing it was
   * created with. Without this the compound tier is unsolvable in practice:
   * the learner clears the masking fault, the installation genuinely starts
   * misbehaving differently, and a frozen complaint tells them nothing
   * happened.
   *
   * Driven entirely through real clicks — the repair target is unknown to the
   * test (§14 hides it), so it walks the answer grid until the panel's own
   * repair action changes what the panel reports.
   */
  test('the reported symptom follows the real circuit as faults are cleared', async ({
    page,
  }, testInfo) => {
    test.setTimeout(testInfo.project.name === 'tablet-safari' ? 360_000 : 180_000);
    await page.goto('/');
    await enableOhmageddon(page);
    await openDiagnosisLab(page);

    const panel = page.locator('section[aria-label="Diagnosis Lab"]');
    await panel.getByText('Rage 4', { exact: false }).first().click();
    await panel
      .getByRole('button', { name: /Intermediate/i })
      .first()
      .click();

    const evidence = () =>
      panel
        .locator('div')
        .filter({ hasText: /isn.t working correctly|running correctly now/ })
        .last();

    await expect(evidence()).toBeVisible();
    const opening = await evidence().innerText();
    // A rage scenario is a rage scenario: the id proves the tier was applied.
    await expect(panel.getByText(/ES-RAGE-/)).toBeVisible();
    // F6: Rage 4 carries the optional timer. The header swaps the elapsed
    // clock for remaining time, announced as "Time remaining mm:ss".
    await expect(panel.getByLabel(/Time remaining/i)).toBeVisible();

    const types = panel.locator('input[name="diagnosis-fault-type"]');
    const locations = panel.locator('input[name="diagnosis-location"]');
    const typeCount = await types.count();
    const locationCount = await locations.count();

    let latest = opening;
    let repaired = false;
    outer: for (let l = 0; l < locationCount; l++) {
      for (let t = 0; t < typeCount; t++) {
        await types.nth(t).check();
        await locations.nth(l).check();
        const repair = panel.getByRole('button', { name: /Carry out this repair/i });
        if ((await repair.count()) === 0) continue;
        await repair.click();
        // eslint-disable-next-line playwright/no-wait-for-timeout
        await page.waitForTimeout(150);
        const now = await evidence().innerText();
        if (now !== latest) {
          latest = now;
          repaired = true;
          if (now.includes('running correctly now')) break outer;
        }
      }
    }

    // Some repair had to land, or the walk above proved nothing.
    expect(repaired, 'no repair changed the reported symptom').toBe(true);
    // Once the installation is sound the panel must say so rather than keep
    // showing a complaint the learner has already fixed.
    expect(latest).toContain('running correctly now');
    expect(latest).not.toBe(opening);
  });
});

test.describe('Ohmageddon Mode', () => {
  test('the toggle exists and defaults to OFF (§23)', async ({ page }) => {
    await page.goto('/');
    await openSimulationSettings(page);

    const toggle = page.getByRole('switch', { name: /Ohmageddon/i });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-checked', 'false');
    // §23's own warning copy must be present, not paraphrased away.
    await expect(page.getByText(/fight back/i)).toBeVisible();
  });

  test('the setting survives a reload (§42, §43)', async ({ page }) => {
    await page.goto('/');
    await enableOhmageddon(page);

    // Read the real IndexedDB record rather than trusting the rendered state.
    const readFlag = () =>
      page.evaluate(async (key) => {
        const request = indexedDB.open('keyval-store');
        return await new Promise<unknown>((resolve) => {
          request.onsuccess = () => {
            const store = request.result.transaction('keyval', 'readonly').objectStore('keyval');
            const read = store.get(key);
            read.onsuccess = () =>
              resolve(
                (read.result as { settings?: Record<string, unknown> })?.settings?.ohmageddonMode,
              );
            read.onerror = () => resolve('read-error');
          };
          request.onerror = () => resolve('open-error');
        });
      }, SETTINGS_KEY);

    // Wait for the write to actually land *before* reloading. The settings
    // store debounces by 150 ms, so reloading immediately can tear down the
    // page mid-write and the record never appears — which reads as "the
    // setting did not persist" when in truth it was never saved. Polling here
    // separates the two failures: this assertion covers "the toggle is
    // written", the one after the reload covers "the write survives".
    await expect.poll(readFlag, { timeout: 10_000 }).toBe(true);

    await page.reload();

    // Still there after a full reload, read back from real IndexedDB.
    await expect.poll(readFlag, { timeout: 10_000 }).toBe(true);

    await openSimulationSettings(page);
    await expect(page.getByRole('switch', { name: /Ohmageddon/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('rage OFF shows no Ohmageddon UI in the Diagnosis Lab (§24)', async ({ page }) => {
    await page.goto('/');
    await openDiagnosisLab(page);

    const panel = page.getByRole('region', { name: 'Diagnosis Lab' });
    await expect(panel).toBeVisible();
    // The safety rule: a normal user cannot even see the mode, let alone enter it.
    await expect(panel.getByText(/Ohmageddon/i)).toHaveCount(0);
    await expect(panel.getByRole('button', { name: /^Rage [123]$/ })).toHaveCount(0);
  });

  test('rage ON offers the tiers and labels an active exercise (§24, §27)', async ({ page }) => {
    await page.goto('/');
    await enableOhmageddon(page);
    await openDiagnosisLab(page);

    const panel = page.getByRole('region', { name: 'Diagnosis Lab' });
    await expect(panel.getByText('Ohmageddon Mode')).toBeVisible();
    await expect(panel.getByRole('button', { name: /^Rage [123]$/ })).toHaveCount(3);

    await panel.getByRole('button', { name: 'Rage 3' }).click();
    await panel.getByRole('button', { name: /Intermediate/ }).click();

    // §24: "Do not hide the fact that the mode is active."
    const active = page.getByRole('region', { name: 'Diagnosis Lab' });
    await expect(active.getByText('RAGE BAIT')).toBeVisible();
    await expect(active.getByText('Ohmageddon Ch')).toBeVisible();
    await expect(active.getByText(/Rage 3 active/)).toBeVisible();
    // §26's promise is made to the user in the product itself.
    await expect(active.getByText(/not against physics/i)).toBeVisible();
    // A rage exercise carries a rage identity (§29).
    await expect(active.getByText(/ES-RAGE-/)).toBeVisible();
  });

  test('a rage exercise still presents a real, answerable diagnosis (§28)', async ({ page }) => {
    await page.goto('/');
    await enableOhmageddon(page);
    await openDiagnosisLab(page);

    const panel = page.getByRole('region', { name: 'Diagnosis Lab' });
    await panel.getByRole('button', { name: 'Rage 1' }).click();
    await panel.getByRole('button', { name: /Beginner/ }).click();

    const active = page.getByRole('region', { name: 'Diagnosis Lab' });
    // Same Diagnose → Repair → Verify pipeline as a normal exercise.
    await expect(active.getByText('What is wrong?')).toBeVisible();
    await expect(active.getByRole('radio').first()).toBeVisible();
    await expect(active.getByRole('button', { name: /Submit diagnosis/ })).toBeDisabled();
  });

  test('turning the mode off again removes the tier picker (§24)', async ({ page }) => {
    await page.goto('/');
    await enableOhmageddon(page);
    await openDiagnosisLab(page);
    await expect(page.getByRole('button', { name: /^Rage [123]$/ })).toHaveCount(3);

    await openSimulationSettings(page);
    await page.getByRole('switch', { name: /Ohmageddon/i }).click();
    await page
      .locator('dialog')
      .getByRole('button', { name: /^Done$/ })
      .click();

    await expect(page.getByRole('button', { name: /^Rage [123]$/ })).toHaveCount(0);
  });

  /**
   * The Phase F2 gate: a Rage 3 exercise really has two faults, and the
   * learner can finish it through the ordinary one-answer form.
   *
   * The walkthrough is deliberately brute-force — try each fault type against
   * each location until the panel says the answer was right — because that is
   * the only information a real learner has. Reading the scenario out of the
   * store to "know" the answer would test the store, not the exercise, and
   * would pass even if the panel never surfaced the second fault.
   */
  test('a Rage 3 exercise takes two findings to complete (§27, §53)', async ({
    page,
  }, testInfo) => {
    test.setTimeout(testInfo.project.name === 'tablet-safari' ? 180_000 : 90_000);
    await page.goto('/');
    await enableOhmageddon(page);
    await openDiagnosisLab(page);

    const panel = page.getByRole('region', { name: 'Diagnosis Lab' });
    await panel.getByRole('button', { name: 'Rage 3' }).click();
    await panel.getByRole('button', { name: /Beginner/ }).click();

    const active = page.getByRole('region', { name: 'Diagnosis Lab' });
    // The tally only renders for a genuinely multi-fault scenario, so its
    // presence *is* the assertion that multiFault reached the user.
    const tally = active.getByText(/^Faults found: \d+ of \d+$/);
    await expect(tally).toBeVisible();
    const total = Number(((await tally.textContent()) ?? '').match(/of (\d+)/)?.[1] ?? '0');
    expect(total).toBeGreaterThanOrEqual(2);

    // §26: the learner is told there is more than one fault rather than being
    // left to think a correct repair had failed.
    await expect(active.getByText(/More than one thing is wrong here/i)).toBeVisible();

    const typeRadios = active.locator('input[name="diagnosis-fault-type"]');
    const locationRadios = active.locator('input[name="diagnosis-location"]');
    const typeCount = await typeRadios.count();
    const locationCount = await locationRadios.count();

    const found = async () =>
      Number(
        ((await active.getByText(/^Faults found: \d+ of \d+$/).textContent()) ?? '').match(
          /found: (\d+)/,
        )?.[1] ?? '0',
      );

    for (let t = 0; t < typeCount; t++) {
      for (let l = 0; l < locationCount; l++) {
        // A completed exercise swaps the panel out entirely.
        if ((await active.count()) === 0) break;
        const before = await found();
        if (before >= total) break;

        await typeRadios.nth(t).check();
        await locationRadios.nth(l).check();
        await active.getByRole('button', { name: /Carry out this repair/ }).click();
        // Paid submissions are asynchronous. Wait for the accepted server
        // version before choosing another answer; a fixed 120 ms raced the
        // previous finding's selection reset and left the repair disabled.
        const version = await page.evaluate(async () => {
          const path = '/src/store/diagnosisStore.ts';
          return (await import(path)).useDiagnosisStore.getState().serverVersion;
        });
        await active.getByRole('button', { name: /Submit diagnosis/ }).click();
        await expect
          .poll(() =>
            page.evaluate(async () => {
              const path = '/src/store/diagnosisStore.ts';
              return (await import(path)).useDiagnosisStore.getState().serverVersion;
            }),
          )
          .toBeGreaterThan(version);
      }
      if ((await active.count()) === 0) break;
      if ((await found()) >= total) break;
    }

    // Every fault named and every fault repaired => the §28 success screen.
    const done = page.getByRole('region', { name: 'Diagnosis complete' });
    await expect(done).toBeVisible({ timeout: 15_000 });
    // Plural headline, and one "correctly identified" line per fault: the
    // summary must account for every fault, not just the one that happened to
    // be named last.
    await expect(done.getByText(/found them all/i)).toBeVisible();
    await expect(done.getByText(/correctly identified/i)).toHaveCount(total);
  });

  test('the decoy never identifies itself on the canvas (§14)', async ({ page }) => {
    await page.goto('/');
    await enableOhmageddon(page);
    await openDiagnosisLab(page);

    const panel = page.getByRole('region', { name: 'Diagnosis Lab' });
    await panel.getByRole('button', { name: 'Rage 1' }).click();
    await panel.getByRole('button', { name: /Intermediate/ }).click();
    await expect(page.getByText('RAGE BAIT')).toBeVisible();

    // The canvas prints each component's id beneath it. If a red herring is
    // named "…-decoy" the answer is on screen in plain text.
    //
    // `textContent`, not `innerText`: the ids are SVG <text> nodes, and
    // `innerText` returns '' for SVG because it is defined on HTMLElement.
    // The first draft of this test used `innerText` and passed vacuously.
    const canvas = page.locator('svg[data-circuit-canvas]');
    await expect(canvas).toBeVisible();
    const canvasText = ((await canvas.textContent()) ?? '').toLowerCase();
    // Guard against a vacuous pass: the ids really must be rendered.
    expect(canvasText).toMatch(/gen-/);
    expect(canvasText).not.toMatch(/decoy|herring|rage/);
  });
});
