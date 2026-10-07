import { type Page, expect } from '@playwright/test';
import { test } from './helpers/paid-test';

/**
 * Diagnosis Lab end-to-end (plan §14–§22, §33, §41).
 *
 * The grading rules, scoring arithmetic and anti-guess properties are covered
 * exhaustively offline (`diagnosis/*.test.ts`, `diagnosisStore.test.ts`,
 * `scripts/stress-diagnosis.ts`). This spec covers what only a real browser
 * can prove: the panel mounts, the faulted circuit is framed where the learner
 * can actually see it, the three-state verdict surfaces, hints are budgeted,
 * and the answer never leaks into the DOM before it is earned.
 */

const panel = (page: Page) => page.locator('section[aria-label="Diagnosis Lab"]');

async function openDiagnosisLab(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByText('Diagnosis Lab', { exact: false }).first().click();
  await expect(panel(page)).toBeVisible();
}

async function startExercise(page: Page, difficulty = 'Intermediate') {
  await openDiagnosisLab(page);
  await page.getByRole('button', { name: new RegExp(difficulty) }).click();
  await expect(panel(page).getByText(/Something isn.t working correctly/i)).toBeVisible();
}

test.describe('Diagnosis Lab', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
      window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('offers three difficulties and presents a fault complaint', async ({ page }) => {
    await openDiagnosisLab(page);

    for (const label of ['Beginner', 'Intermediate', 'Advanced']) {
      await expect(page.getByRole('button', { name: new RegExp(label) })).toBeVisible();
    }

    await page.getByRole('button', { name: /Beginner/ }).click();

    // §14: the learner is told the *symptom*, then asked both questions.
    await expect(panel(page).getByText(/Something isn.t working correctly/i)).toBeVisible();
    await expect(panel(page).getByText(/WHAT IS WRONG\?/i)).toBeVisible();
    await expect(panel(page).getByText(/WHERE IS IT\?/i)).toBeVisible();
  });

  test('seeds the canvas with the faulted installation', async ({ page }) => {
    await startExercise(page);
    // The learner investigates a real circuit, not an empty canvas.
    const components = page.locator('[data-component-hitbox]');
    await expect.poll(() => components.count()).toBeGreaterThan(2);
  });

  test('frames the circuit clear of the panel (plan §33)', async ({ page }) => {
    await startExercise(page);
    await expect.poll(() => page.locator('[data-component-hitbox]').count()).toBeGreaterThan(2);

    // The canvas SVG has a fixed viewBox with `xMidYMid meet`, so the fit maths
    // has to convert pixels into user units. When that conversion is wrong the
    // circuit either hides under the panel or collapses into an unreadable
    // clump — both regressions this assertion pins down.
    const panelBox = await panel(page).boundingBox();
    expect(panelBox).not.toBeNull();
    if (!panelBox) return;

    const boxes = await page.locator('[data-component-hitbox]').evaluateAll((nodes) =>
      nodes.map((n) => {
        const r = n.getBoundingClientRect();
        return { x: r.x, y: r.y, width: r.width, height: r.height };
      }),
    );
    expect(boxes.length).toBeGreaterThan(2);

    for (const b of boxes) {
      const overlaps =
        b.x < panelBox.x + panelBox.width &&
        b.x + b.width > panelBox.x &&
        b.y < panelBox.y + panelBox.height &&
        b.y + b.height > panelBox.y;
      expect(overlaps).toBe(false);
      // Legibility guard for the original defect: double-applying the meet
      // scale rendered components at ~12px. The threshold is set well below
      // what a legitimately dense phone layout produces (~40px for an
      // 8-component circuit) so this only fires on a real collapse.
      expect(b.width).toBeGreaterThan(25);
    }
  });

  test('requires BOTH answers before a repair can be carried out (plan §15)', async ({ page }) => {
    await startExercise(page);

    const submit = panel(page).getByRole('button', { name: /Submit diagnosis/i });
    await expect(submit).toBeDisabled();

    // Choosing only the fault type is not enough.
    await panel(page).getByRole('radio').first().click();
    await expect(submit).toBeDisabled();
  });

  test('a wrong diagnosis does not end the exercise (plan §41)', async ({ page }) => {
    await startExercise(page);

    const radios = panel(page).getByRole('radio');
    await radios.first().click();
    const locations = panel(page).locator('input[type="radio"]');
    await locations.last().click();

    const submit = panel(page).getByRole('button', { name: /Submit diagnosis/i });
    await expect(submit).toBeEnabled();
    await submit.click();

    // Still investigating: the panel stays, and no completion card appears.
    await expect(panel(page)).toBeVisible();
    await expect(page.locator('[aria-label="Diagnosis complete"]')).toBeHidden();
  });

  test('reveals hints within the budget and then disables the control', async ({ page }) => {
    await startExercise(page, 'Beginner');

    const hintButton = panel(page).getByRole('button', { name: /hint/i });
    // Beginner budget is 3 (difficulty profiles).
    for (let i = 0; i < 3; i++) {
      await hintButton.click();
      await expect(panel(page).getByText(new RegExp(`HINT ${i + 1}`, 'i'))).toBeVisible();
    }
    await expect(hintButton).toBeDisabled();
  });

  test('never leaks the answer before it is earned (plan §14)', async ({ page }) => {
    await startExercise(page);

    // The brief describes what the installation is *doing*, never the fault.
    // A leak here would make the whole exercise pointless.
    const text = (await panel(page).innerText()).toLowerCase();
    const briefing = text.split('what is wrong?')[0] ?? '';
    for (const giveaway of [
      'short circuit',
      'open circuit',
      'insulation leakage',
      'reversed polarity',
    ]) {
      expect(briefing).not.toContain(giveaway);
    }
  });

  test('running the simulation does not name the fault (plan §14)', async ({ page }) => {
    // Four scenarios, each with a full simulation pass — WebKit needs more
    // than the 30 s default.
    test.setTimeout(120_000);
    // Regression: the simulator narrates every injected fault by name
    // ("TERMINAL DISCONNECT: ...", "SHORT CIRCUIT FAULT: ...") and those
    // messages were rendered in the Console panel and the fault-alert modal
    // during a Diagnosis exercise — handing over the answer that the learner
    // was simultaneously being asked to pick from a list. The previous §14
    // test only inspected the panel's own briefing, so it never saw this.
    const GIVEAWAYS = [
      'short circuit',
      'open circuit',
      'reversed polarity',
      'reverse polarity',
      'earth leakage',
      'terminal disconnect',
      'floating neutral',
      'protection bypass',
      'breaker jammed',
      'missing cpc',
    ];

    // Sweep several seeds: only some fault types trip protection, and the
    // narration differs per type. The difficulty picker disappears once a
    // scenario is live, so roll subsequent seeds with "New diagnosis exercise".
    await startExercise(page);
    for (let round = 0; round < 4; round++) {
      if (round > 0) {
        await panel(page).getByRole('button', { name: 'New diagnosis exercise' }).click();
        await expect(panel(page).getByText(/Something isn.t working correctly/i)).toBeVisible();
      }

      await page
        .getByRole('button', { name: /Run Simulation/i })
        .first()
        .click();
      const diagnostic = page.getByRole('button', { name: 'Run diagnostic', exact: true });
      const stop = page.getByRole('button', { name: 'Stop', exact: true });
      await expect(stop.or(diagnostic).first()).toBeVisible();
      if (await diagnostic.isVisible()) await diagnostic.click();
      await expect(stop).toBeVisible();
      await page.waitForTimeout(1500);

      // Expand the console so its entries are in the DOM. It is not mounted on
      // narrow viewports, hence the count guard.
      const toggle = page.getByRole('button', { name: /Console · \d+ entries/ }).first();
      if ((await toggle.count()) > 0) {
        await toggle.click({ timeout: 5000 }).catch(() => {});
        await page.waitForTimeout(200);
      }

      // Scan everything the learner can actually read, whatever the viewport:
      // the answer must not appear anywhere outside the multiple-choice list.
      const optionsText = (
        (await panel(page)
          .textContent()
          .catch(() => '')) ?? ''
      ).toLowerCase();
      const screenText = ((await page.locator('body').textContent()) ?? '').toLowerCase();
      for (const giveaway of GIVEAWAYS) {
        // The option list legitimately contains these phrases; anything beyond
        // those occurrences is a leak.
        const inOptions = optionsText.split(giveaway).length - 1;
        const onScreen = screenText.split(giveaway).length - 1;
        expect(onScreen - inOptions, `"${giveaway}" leaked outside the answer list`).toBe(0);
      }

      // Any fault-alert modal must not name the fault type either.
      const dialog = page.locator('dialog[open]');
      if (
        (await dialog.count()) > 0 &&
        (await dialog
          .first()
          .isVisible()
          .catch(() => false))
      ) {
        const modalText = ((await dialog.first().textContent()) ?? '').toLowerCase();
        for (const giveaway of GIVEAWAYS) {
          expect(modalText, `fault alert leaked "${giveaway}"`).not.toContain(giveaway);
        }
        await page.keyboard.press('Escape');
      }
      await page.getByRole('button', { name: 'Stop', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Run Simulation', exact: true })).toBeVisible();
    }
  });

  test('confirms before discarding an exercise in progress (plan §22)', async ({ page }) => {
    await startExercise(page, 'Beginner');

    // The prompt is deliberately suppressed until there is progress worth
    // losing (see `requestNew`), so spend a hint first — otherwise restarting
    // an untouched exercise would nag for no reason.
    await panel(page)
      .getByRole('button', { name: /Reveal hint/i })
      .click();
    await expect(panel(page).getByText(/HINT 1/i)).toBeVisible();

    await panel(page).getByRole('button', { name: 'New diagnosis exercise' }).click();
    await expect(panel(page).getByText(/Start another exercise\?/i)).toBeVisible();

    // Backing out must keep the current exercise alive.
    await panel(page)
      .getByRole('button', { name: /Keep investigating/ })
      .click();
    await expect(panel(page).getByText(/Start another exercise\?/i)).toBeHidden();
    await expect(panel(page).getByRole('button', { name: /Submit diagnosis/i })).toBeVisible();
  });
  /**
   * §30 "Copy Seed" / replay.
   *
   * The offline tests prove the codec round-trips and that a parsed ticket
   * rebuilds an identical scenario. What only a browser can show is that the
   * two controls are wired to each other: copy an exercise, start a different
   * one, paste the seed back, and land on the original circuit again.
   */
  test('copies a seed and replays the identical exercise (plan §30)', async ({
    page,
    context,
    browser,
    browserName,
  }) => {
    test.skip(browserName !== 'chromium', 'clipboard permissions are Chromium-only here');
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await startExercise(page, 'Beginner');
    const originalId = await panel(page)
      .locator('p', { hasText: /ES-(DIAG|RAGE)-\d+/ })
      .first()
      .innerText();

    await panel(page)
      .getByRole('button', { name: /Copy seed/i })
      .click();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    // The block §30 asks for: seed, difficulty, mode.
    expect(copied).toMatch(/Seed: \d+/);
    expect(copied).toMatch(/Difficulty: Beginner/i);
    expect(copied).toMatch(/Mode: Diagnosis/i);

    // A different exercise must genuinely differ, otherwise the replay
    // assertion below would pass on any two runs.
    await panel(page).getByRole('button', { name: 'New diagnosis exercise' }).click();
    await expect(panel(page).getByText(/Something isn.t working correctly/i)).toBeVisible();
    const otherId = await panel(page)
      .locator('p', { hasText: /ES-(DIAG|RAGE)-\d+/ })
      .first()
      .innerText();
    expect(otherId).not.toBe(originalId);

    // Replay in a clean context — separate IndexedDB, so nothing is restored
    // from the first session. This is the real §30 promise: the seed alone,
    // carried to another browser, rebuilds the identical exercise.
    const fresh = await browser.newContext();
    const replayPage = await fresh.newPage();
    await replayPage.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
      window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    await openDiagnosisLab(replayPage);
    await replayPage.getByLabel('Replay a seed').fill(copied);
    await replayPage.getByRole('button', { name: 'Replay' }).click();

    await expect(panel(replayPage).getByText(/Something isn.t working correctly/i)).toBeVisible();
    const replayedId = await panel(replayPage)
      .locator('p', { hasText: /ES-(DIAG|RAGE)-\d+/ })
      .first()
      .innerText();
    expect(replayedId).toBe(originalId);
    expect(replayedId).not.toBe(otherId);
    await fresh.close();
  });

  test('rejects text that is not a seed, without starting anything (plan §47)', async ({
    page,
  }) => {
    await openDiagnosisLab(page);
    await page.getByLabel('Replay a seed').fill('not a seed at all');
    await page.getByRole('button', { name: 'Replay' }).click();

    await expect(panel(page).getByText(/doesn.t look like a seed/i)).toBeVisible();
    // Still on the picker — no half-started exercise.
    await expect(page.getByRole('button', { name: /Beginner/ })).toBeVisible();
  });
});
