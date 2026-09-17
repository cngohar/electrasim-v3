import { type Locator, type Page, expect, test } from '@playwright/test';

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
  await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();
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

/** Amber dashed frame + badge rendered on a tripped protection device. */
function tripMarker(page: Page, componentId: string) {
  const node = page.locator(`[data-component-id="${componentId}"]`);
  return {
    dot: node.locator('circle[fill="#f59e0b"]'),
    frame: node.locator('rect[stroke="#f59e0b"][stroke-dasharray="4 3"]'),
  };
}

const faultAlertDialog = (page: Page) =>
  page.getByRole('dialog').filter({ has: page.getByText('CIRCUIT PROTECTION TRIPPED!') });

async function dismissFaultAlert(page: Page) {
  await faultAlertDialog(page).getByRole('button', { name: 'Close modal' }).click();
  await expect(faultAlertDialog(page)).toBeHidden();
}

/** Open the Inspector → Simulation tab for the component and reset its trip. */
async function resetBreakerViaInspector(page: Page, componentId: string) {
  await hitbox(page, componentId).click();
  await page.getByRole('button', { name: 'Simulation Telemetry & Faults' }).click();
  const reset = page.getByRole('button', { name: /RESET Breaker/ });
  await expect(reset).toBeVisible();
  await expect(reset).toBeEnabled();
  await reset.click();
}

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
    test.slow(testInfo.project.name === 'tablet-safari');
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
      window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('a bolted short trips the guarding MCB; reset → re-trip → clear → clean run', async ({
    page,
  }) => {
    const mcbId = `${STAIRCASE}-mcb`;
    const bulbId = `${STAIRCASE}-bulb`;

    await loadGuide(page, STAIRCASE, 'Two-Way Staircase Light');
    await runSim(page);

    // The guide panel overlays the rightmost canvas components at tablet
    // widths; "Hide guide" is the (now non-destructive) way to free the space.
    await page.getByRole('button', { name: 'Hide guide' }).click();

    await hitbox(page, bulbId).click({ button: 'right' });
    await page.getByRole('button', { name: 'Inject Short Circuit' }).click();

    // Injection pauses the sim; re-running lets the fault operate protection.
    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(faultAlertDialog(page)).toBeVisible();

    const mcbAria = hitboxIn(page.locator(`[data-component-id="${mcbId}"]`));
    await expect(mcbAria).toHaveAttribute('aria-label', /, tripped/);
    await expect(tripMarker(page, mcbId).dot.first()).toBeVisible();
    await expect(tripMarker(page, mcbId).frame.first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeHidden();
    await dismissFaultAlert(page);

    // Resetting the breaker with the fault still injected must re-trip —
    // a real breaker reclosing onto a bolted fault does exactly this.
    await resetBreakerViaInspector(page, mcbId);
    await expect(mcbAria).not.toHaveAttribute('aria-label', /, tripped/);
    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(faultAlertDialog(page)).toBeVisible();
    await expect(mcbAria).toHaveAttribute('aria-label', /, tripped/);
    await dismissFaultAlert(page);

    // The expanded drawer covers right-side canvas components at tablet
    // widths; collapse it to reach the faulted bulb again.
    await page.getByRole('button', { name: 'Collapse Inspector' }).first().click();
    await hitbox(page, bulbId).click({ button: 'right' });
    await page.getByRole('button', { name: 'Clear Injected Fault' }).click();
    await resetBreakerViaInspector(page, mcbId);
    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();
    await expect(faultAlertDialog(page)).toBeHidden();
    await expect(mcbAria).not.toHaveAttribute('aria-label', /, tripped/);
    // Both travellers at L1 energise the lamp again (single-halo glow).
    await expect(
      page.locator(`[data-component-id="${bulbId}"]`).locator('circle[fill="#facc15"]').first(),
    ).toBeVisible();

    // Hiding the guide earlier must not have ended the challenge: the
    // floating pill brings the checklist back with progress intact. The MCB
    // is still selected with the drawer open, so the panel yields to the
    // Inspector — the drawer's own return strip closes the loop.
    await page.getByRole('button', { name: 'Show guide steps' }).click();
    await page.getByRole('button', { name: 'Close inspector and return to guide' }).click();
    await expect(page.getByRole('heading', { name: 'Two-Way Staircase Light' })).toBeVisible();
  });

  test('earth leakage trips the RCBO guarding the faulted network', async ({ page }) => {
    const rcboId = `${RCBO_TEMPLATE}-rcbo`;
    const socketId = `${RCBO_TEMPLATE}-socket`;

    await loadGuide(page, RCBO_TEMPLATE, 'RCBO-Protected Socket');
    await runSim(page);

    await hitbox(page, socketId).click({ button: 'right' });
    await page.getByRole('button', { name: 'Inject Earth Leakage / Earth Fault' }).click();

    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(faultAlertDialog(page)).toBeVisible();
    /* The guided template re-specs the RCBO to 20 A on a 2.5 mm² radial, so the
       learner-facing name is the instance rating, not the catalogue default. */
    await expect(faultAlertDialog(page)).toContainText('RCBO (20 A)');

    const rcboAria = hitboxIn(page.locator(`[data-component-id="${rcboId}"]`));
    await expect(rcboAria).toHaveAttribute('aria-label', /, tripped/);
    await dismissFaultAlert(page);

    // Recover fully: clear the fault, reset the RCBO, and the lamp relights.
    await hitbox(page, socketId).click({ button: 'right' });
    await page.getByRole('button', { name: 'Clear Injected Fault' }).click();
    await resetBreakerViaInspector(page, rcboId);
    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();
    await expect(faultAlertDialog(page)).toBeHidden();
  });

  test('smooth DC residual leakage blinds a Type A RCBO but trips it once set to Type B', async ({
    page,
  }) => {
    const rcboId = `${RCBO_TEMPLATE}-rcbo`;
    const socketId = `${RCBO_TEMPLATE}-socket`;
    const manualFaultDialog = (p: Page) =>
      p.getByRole('dialog').filter({ has: p.getByText('SMOOTH DC RESIDUAL') });

    await loadGuide(page, RCBO_TEMPLATE, 'RCBO-Protected Socket');
    await runSim(page);

    // Template default is Type A (modern baseline). A smooth DC residual
    // fault must NOT trip it — the app stops the sim and explains the
    // blinding instead (BS EN 62423 / BS 7671 Reg 531.3.3).
    await hitbox(page, socketId).click({ button: 'right' });
    await page.getByRole('button', { name: 'Inject Smooth DC Residual (EV/PV fault)' }).click();

    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(manualFaultDialog(page)).toBeVisible();
    await expect(manualFaultDialog(page)).toContainText('RCD BLINDED');
    await expect(faultAlertDialog(page)).toHaveCount(0);

    const rcboAria = hitboxIn(page.locator(`[data-component-id="${rcboId}"]`));
    await expect(rcboAria).not.toHaveAttribute('aria-label', /, tripped/);
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeHidden();
    await manualFaultDialog(page).getByRole('button', { name: 'Close modal' }).click();
    await expect(manualFaultDialog(page)).toBeHidden();

    // Re-spec the device as Type B in the Inspector — the deliberate fix a
    // BS 7671-compliant install specifies for EV/PV/VFD loads.
    await hitbox(page, rcboId).click();
    await page.getByRole('button', { name: 'Properties & Settings' }).click();
    await page.getByRole('button', { name: /SMOOTH DC/ }).click();
    await expect(page.getByText('Type B', { exact: true })).toBeVisible();

    // Same fault, same run — now the Type B device trips like an earth fault.
    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(faultAlertDialog(page)).toBeVisible();
    await expect(faultAlertDialog(page)).toContainText('RCBO (20 A)');
    await expect(rcboAria).toHaveAttribute('aria-label', /, tripped/);
    await dismissFaultAlert(page);

    // Full recovery: clear the fault, reset the RCBO, clean run.
    await page.getByRole('button', { name: 'Collapse Inspector' }).first().click();
    await hitbox(page, socketId).click({ button: 'right' });
    await page.getByRole('button', { name: 'Clear Injected Fault' }).click();
    await resetBreakerViaInspector(page, rcboId);
    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();
    await expect(faultAlertDialog(page)).toBeHidden();
    await expect(manualFaultDialog(page)).toHaveCount(0);
    await expect(rcboAria).not.toHaveAttribute('aria-label', /, tripped/);
  });

  test('an arc fault with no AFDD in the network stops the sim with the Reg 421.1.7 blind-spot modal', async ({
    page,
  }) => {
    const rcboId = `${RCBO_TEMPLATE}-rcbo`;
    const socketId = `${RCBO_TEMPLATE}-socket`;
    const arcFaultDialog = (p: Page) =>
      p.getByRole('dialog').filter({ has: p.getByText('ARC FAULT') });

    await loadGuide(page, RCBO_TEMPLATE, 'RCBO-Protected Socket');
    await runSim(page);

    // The template guards the socket with an RCBO + upstream MCB only — no
    // AFDD. BS EN 62606: arcing rides at/below load current with no earth
    // imbalance, so NOTHING may trip; the app teaches the blind spot instead.
    await hitbox(page, socketId).click({ button: 'right' });
    await page.getByRole('button', { name: 'Inject Arc Fault (series/parallel)' }).click();

    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(arcFaultDialog(page)).toBeVisible();
    await expect(arcFaultDialog(page)).toContainText('NO AFDD PROTECTION');
    await expect(faultAlertDialog(page)).toHaveCount(0);

    const rcboAria = hitboxIn(page.locator(`[data-component-id="${rcboId}"]`));
    await expect(rcboAria).not.toHaveAttribute('aria-label', /, tripped/);
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeHidden();
    // Teach the standard: the modal names the regulation behind the advice.
    await expect(arcFaultDialog(page)).toContainText('BS EN 62606');
    await arcFaultDialog(page).getByRole('button', { name: 'Close modal' }).click();
    await expect(arcFaultDialog(page)).toBeHidden();

    // Recover: clear the injected arc fault and prove a clean run.
    await hitbox(page, socketId).click({ button: 'right' });
    await page.getByRole('button', { name: 'Clear Injected Fault' }).click();
    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();
    await expect(arcFaultDialog(page)).toHaveCount(0);
    await expect(faultAlertDialog(page)).toBeHidden();
  });

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
    await page.getByRole('button', { name: 'Inject Short Circuit' }).click();
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
      page.locator(`[data-component-id="${bulbId}"]`).locator('circle[fill="#facc15"]').first(),
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
