import { type Locator, type Page, expect } from '@playwright/test';
import { test } from './helpers/paid-test';
import { fitCanvas } from './helpers/workbench';

/**
 * Fault-injection → protection-trip → reset flows, plus the editing
 * fundamentals (delete+confirm+undo, copy/paste, fault undo, JSON export)
 * that the original smoke/guide specs never exercised. Every assertion here
 * encodes behaviour first verified live in the browser.
 */

const STAIRCASE = 'two-way-staircase-light';
const RCBO_TEMPLATE = 'rcbo-protected-socket';

/** Component hitbox inside its positioned canvas node. */
function hitbox(page: Page, componentId: string): Locator {
  return page.locator(`[data-component-id="${componentId}"] > g[role="button"]`);
}

function hitboxIn(node: Locator): Locator {
  return node.locator('> g[role="button"]');
}

/**
 * Fault injection is Pro-only, so every guide here is loaded into Pro mode.
 *
 * The switch does NOT go through the sub-header mode toggle: at tablet widths
 * the header's left zone is sized to its own content (`justify-self-start` in a
 * `1fr` track) and overflows on top of the centre cluster, so a click aimed at
 * the toggle lands on the active-standard chip instead. The chip is the topmost
 * element on every viewport and its "Locked in Student mode" popover offers the
 * same switch, so drive it from there.
 */
async function ensureProMode(page: Page) {
  const studentToggle = page.getByRole('button', { name: /^student$/i });
  if (!(await studentToggle.isVisible().catch(() => false))) return;
  await page.locator('[data-standard-selector][data-standard-readonly]').click();
  await page.getByRole('button', { name: 'Switch to Pro mode' }).click();
  await expect(studentToggle).toBeHidden();
}

async function loadGuide(page: Page, templateId: string, title: string) {
  /*
   * `?template=<id>` deep-links the guide straight onto the canvas — it does
   * not open the Guided Circuits picker. Both `window.confirm` prompts (the
   * deep-link one and the loader's own) are auto-accepted in `beforeEach`. The
   * checklist panel is a lazily-imported chunk, hence the generous timeout.
   */
  await page.goto(`/?template=${templateId}`);
  await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 });
  await ensureProMode(page);
  await collapsePalette(page);
}

async function runSim(page: Page) {
  await page.getByRole('button', { name: /^Run Simulation$/ }).click();
  const stop = page.getByRole('button', { name: /^Stop$/ });
  const review = page.getByRole('dialog', { name: 'Circuit readiness' });
  const override = page.getByRole('button', { name: 'Run anyway (teacher/demo)', exact: true });
  await expect
    .poll(
      async () =>
        (await stop.isVisible()) || (await review.isVisible()) || (await override.isVisible()),
    )
    .toBe(true);
  if (!(await stop.isVisible())) {
    if (await override.isVisible()) await override.click();
    else await review.getByRole('button', { name: 'Run diagnostic', exact: true }).click();
  }
  await expect(stop).toBeVisible();
}

/**
 * Below `lg` the component palette is a fixed overlay pinned over the left of
 * the canvas rather than a column beside it, so it swallows clicks aimed at
 * components underneath. Desktop opens with it expanded and wide enough not to
 * matter; tablet does not. Collapsing it first is the same accommodation the
 * guide drawer and inspector already get, and it is a no-op when the palette
 * is already collapsed.
 */
async function collapsePalette(page: Page) {
  const collapse = page.getByRole('button', { name: 'Collapse panel' });
  if (
    await collapse
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await collapse.first().click();
    await expect(collapse.first()).toBeHidden();
  }
}

const faultAlertDialog = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByText('CIRCUIT PROTECTION TRIPPED!') });

test.describe('faults & editing', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      (page.viewportSize()?.width ?? 0) < 640,
      'fault injection uses the context menu, which has no phone affordance',
    );
    /*
     * WebKit walks the fault choreography far slower than Chromium. The full
     * trip → reset → re-trip → clear → clean-run flows sit at ~23 s solo on the
     * iPad project, so they blow the 30 s budget the moment workers compete for
     * the CPU. Widen the budget there rather than trimming the coverage.
     */
    // Phase 1.5 also adds real membership round trips to protected mutations.
    test.setTimeout(testInfo.project.name === 'tablet-safari' ? 90_000 : 60_000);
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
      window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    page.on('dialog', (dialog) => dialog.accept());
  });

  for (const scenario of [
    {
      type: 'short-circuit',
      menu: /^Inject Short Circuit/,
      guide: STAIRCASE,
      title: 'Two-Way Staircase Light',
      target: `${STAIRCASE}-bulb`,
    },
    {
      type: 'earth-fault',
      menu: /^Inject Earth Fault/,
      guide: RCBO_TEMPLATE,
      title: 'RCBO-Protected Socket',
      target: `${RCBO_TEMPLATE}-socket`,
    },
    {
      type: 'smooth-dc-residual',
      menu: /^Inject Smooth DC Residual/,
      guide: RCBO_TEMPLATE,
      title: 'RCBO-Protected Socket',
      target: `${RCBO_TEMPLATE}-socket`,
    },
    {
      type: 'arc-fault',
      menu: /^Inject Arc Fault/,
      guide: RCBO_TEMPLATE,
      title: 'RCBO-Protected Socket',
      target: `${RCBO_TEMPLATE}-socket`,
    },
  ]) {
    test(`${scenario.type}: context-menu injection retains model coverage without persisting an unassessed trip`, async ({
      page,
    }) => {
      await loadGuide(page, scenario.guide, scenario.title);
      await page.getByRole('button', { name: 'Hide guide' }).click();
      await fitCanvas(page);
      await hitbox(page, scenario.target).click({ button: 'right' });
      await page.getByRole('button', { name: scenario.menu }).click();
      await runSim(page);
      await expect
        .poll(() =>
          page.evaluate(async () => {
            const path = '/src/store/uiStore.ts';
            return (await import(path)).useUiStore.getState().simResult?.electricalContract?.status;
          }),
        )
        .toBe(
          ['arc-fault', 'smooth-dc-residual'].includes(scenario.type) ? 'unsupported' : 'converged',
        );
      const observed = await page.evaluate(async () => {
        const storePath = '/src/store/circuitStore.ts';
        const uiPath = '/src/store/uiStore.ts';
        const evidencePath = '/packages/domain/src/simulationEvidence.ts';
        const circuit = (await import(storePath)).useCircuitStore.getState();
        const result = (await import(uiPath)).useUiStore.getState().simResult;
        return {
          faulty: circuit.faults.map((f: { type: string }) => f.type),
          tripped: circuit.components.some(
            (c: { state: { isTripped?: boolean; isBlown?: boolean } }) =>
              c.state.isTripped || c.state.isBlown,
          ),
          assessed: (await import(evidencePath)).hasOperationEvidence(circuit, result),
          cleared: result?.faultsCleared,
        };
      });
      expect(observed.faulty).toContain(scenario.type);
      expect(observed.tripped).toBe(false);
      expect(observed.assessed).toBe(!['arc-fault', 'smooth-dc-residual'].includes(scenario.type));
      expect(observed.cleared).toBe(false);
      await expect(faultAlertDialog(page)).toBeHidden();
      await page.getByRole('button', { name: 'Stop', exact: true }).click();
      await fitCanvas(page);
      await hitbox(page, scenario.target).click({ button: 'right' });
      await page.getByRole('button', { name: 'Clear Injected Fault' }).click();
      await runSim(page);
      await expect(faultAlertDialog(page)).toBeHidden();
    });
  }

  test('deleting a component asks for confirmation and Ctrl+Z restores it', async ({ page }) => {
    const bulbId = `${STAIRCASE}-bulb`;
    await loadGuide(page, STAIRCASE, 'Two-Way Staircase Light');
    await page.getByRole('button', { name: 'Hide guide' }).click();

    await hitbox(page, bulbId).click({ button: 'right' });
    await page.getByRole('button', { name: 'Delete Component' }).click();
    const confirm = page.getByRole('dialog');
    await expect(confirm).toContainText('Delete this component?');
    await confirm.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.locator(`[data-component-id="${bulbId}"]`)).toHaveCount(0);

    // Editor shortcuts deliberately stand down while focus sits inside a
    // dialog, and the modal plays a 200 ms exit transition after confirming —
    // so wait for it to unmount before reaching for Ctrl+Z.
    await expect(confirm).toHaveCount(0);
    await page.keyboard.press('Control+z');
    await expect(page.locator(`[data-component-id="${bulbId}"]`)).toHaveCount(1);
  });

  test('Ctrl+Z removes an injected fault — no invisible ghost faults keep tripping', async ({
    page,
  }) => {
    const mcbId = `${STAIRCASE}-mcb`;
    const bulbId = `${STAIRCASE}-bulb`;
    await loadGuide(page, STAIRCASE, 'Two-Way Staircase Light');
    await page.getByRole('button', { name: 'Hide guide' }).click();

    await hitbox(page, bulbId).click({ button: 'right' });
    await page.getByRole('button', { name: /^Inject Short Circuit/ }).click();
    // Fault badge renders on the faulted component (red dashed fault frame).
    const bulbNode = page.locator(`[data-component-id="${bulbId}"]`);
    await expect(bulbNode.locator('rect[stroke-dasharray="4 3"]').first()).toBeVisible();

    await page.keyboard.press('Control+z');
    await expect(bulbNode.locator('rect[stroke-dasharray="4 3"]')).toHaveCount(0);

    // The undo must clear the scenario array too. Gate on the lamp actually
    // relighting first — asserting "no alert" immediately would race the
    // worker and could pass before a ghost-fault trip lands.
    await runSim(page);
    await expect(
      page
        .locator(`[data-component-id="${bulbId}"]`)
        .locator('.electrasim-incandescent-startup')
        .first(),
    ).toBeVisible();
    await expect(faultAlertDialog(page)).toBeHidden();
    await expect(hitboxIn(page.locator(`[data-component-id="${mcbId}"]`))).not.toHaveAttribute(
      'aria-label',
      /, tripped/,
    );
  });

  test('copy/paste duplicates the selected component and undo removes it', async ({ page }) => {
    const bulbId = `${STAIRCASE}-bulb`;
    await loadGuide(page, STAIRCASE, 'Two-Way Staircase Light');

    const statusPill = page.getByText(/6\s*comps\s*•\s*6\s*wires/);
    await expect(statusPill).toBeVisible();
    await page.getByRole('button', { name: 'Hide guide' }).click();

    await hitbox(page, bulbId).click();
    await page.keyboard.press('Control+c');
    await page.keyboard.press('Control+v');
    await expect(page.getByText(/7\s*comps\s*•\s*6\s*wires/)).toBeVisible();

    await page.keyboard.press('Control+z');
    await expect(statusPill).toBeVisible();
  });

  test('mini EIC downloads a printable BS 7671 Appendix-6-style certificate', async ({ page }) => {
    await loadGuide(page, RCBO_TEMPLATE, 'RCBO-Protected Socket');

    await page.keyboard.press('Control+e');
    const modal = page.getByRole('dialog');
    await modal.getByRole('button', { name: /Mini EIC/ }).click();
    await expect(modal.getByText('Save Circuit As')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await modal.getByRole('button', { name: /Download/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.eic\.html$/);

    const { readFileSync } = await import('node:fs');
    const html = readFileSync((await download.path()) as string, 'utf8');
    expect(html).toContain('MINI ELECTRICAL INSTALLATION CERTIFICATE');
    expect(html).toContain('BS 7671 Appendix 6');
    expect(html).toContain('RCBO (20 A)');
    expect(html).toContain('Max Zs Ω');
    expect(html).toContain('window.print()');
    await expect(modal.getByText(/Mini EIC exported as/)).toBeVisible();
  });

  test('JSON export downloads the circuit through the filename prompt', async ({ page }) => {
    await loadGuide(page, STAIRCASE, 'Two-Way Staircase Light');

    await page.keyboard.press('Control+e');
    const modal = page.getByRole('dialog');
    await expect(modal.getByText('Import / Export', { exact: true })).toBeVisible();

    await modal.getByRole('button', { name: /^JSON/ }).click();
    await expect(modal.getByText('Save Circuit As')).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await modal.getByRole('button', { name: /Download/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.electrasim\.json$/);

    await expect(modal.getByText(/JSON exported as/)).toBeVisible();
  });
});
