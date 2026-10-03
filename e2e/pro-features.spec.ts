import { gzipSync } from 'node:zlib';
import { type Page, expect } from '@playwright/test';
import { test } from './helpers/paid-test';

/**
 * End-to-end coverage for the Pro-mode feature set delivered in this branch:
 *   - Specs button removed from the SubHeaderBar
 *   - Manual fault injection master toggle (Pro-only) + fault UI gating
 *   - Read-only Student standard display and independent Pro standard/plug controls
 *   - Compliance banner, audited teacher override, and persisted Simulation History
 *   - Unified routed-path Heat / Heat + V-drop diagnostic overlay
 *   - Capability/nameplate findings and explicit measurement limits
 */

/** A complete UK socket circuit with no upstream RCD/RCBO. It is electrically
 * runnable and needs residual-protection advice. */
function unprotectedSocketShareUrl(): string {
  const payload = {
    version: 1,
    exportedAt: 0,
    circuit: {
      globalVoltage: 230,
      components: [
        { id: 'source', type: 'ac-mains-supply', x: 300, y: 350, state: { on: true } },
        { id: 'socket', type: 'socket-3pin', x: 650, y: 350, state: { on: true } },
      ],
      wires: [
        {
          id: 'wire-live',
          fromComponentId: 'source',
          fromPortIndex: 0,
          toComponentId: 'socket',
          toPortIndex: 0,
          controlPoints: [],
          lengthMeters: 1,
          customCableMm2: 10,
        },
        {
          id: 'wire-neutral',
          fromComponentId: 'source',
          fromPortIndex: 1,
          toComponentId: 'socket',
          toPortIndex: 1,
          controlPoints: [],
          lengthMeters: 1,
          customCableMm2: 10,
        },
        {
          id: 'wire-earth',
          fromComponentId: 'source',
          fromPortIndex: 2,
          toComponentId: 'socket',
          toPortIndex: 2,
          controlPoints: [],
          lengthMeters: 1,
          customCableMm2: 10,
        },
      ],
    },
  };
  const encoded = gzipSync(JSON.stringify(payload)).toString('base64');
  // The query marker forces a document navigation when this is opened after
  // beforeEach has already loaded `/`; a hash-only navigation would not rerun
  // startup share decoding.
  return `/?e2e=pro-compliance#c=${encodeURIComponent(encoded)}`;
}

// Use a wide viewport so the right-hand inspector (≈320 px) and left palette
// don't overlap the canvas bulbs we need to click in the tests.
test.use({ viewport: { width: 1680, height: 1000 } });

/**
 * The sub-header Fault Lab toggle. Matching on the accessible name is ambiguous
 * in Pro mode — the Inspector also owns a "Fault Lab (manual fault injection)"
 * tab — and the toggle's own name grows an "Active" suffix once armed, so key
 * off the tooltip, which is stable and unique to the bar.
 */
const faultLabToggle = (page: Page) => page.getByTitle(/^Toggle the Fault Lab/);

async function ensureProMode(page: Page) {
  // The mode toggle always renders either "Student" (basic, emerald) or
  // "Pro" (pro, purple). If the button currently shows "Student", click it
  // to switch into Pro Electrician Mode.
  const studentToggle = page.getByRole('button', { name: /^student$/i });
  if (await studentToggle.isVisible().catch(() => false)) {
    await studentToggle.click({ force: true });
  }
  // Wait until Pro-only chrome appears (the Fault Lab button in the app bar).
  await expect(faultLabToggle(page)).toBeVisible();
}

test.describe('Dual standard & pro features', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mark first-visit modals as already welcomed so the welcome dialog and
    // mobile suitability interstitials never intercept clicks.
    await context.addInitScript(() => {
      try {
        window.localStorage.setItem('electrasim:welcomed', '1');
        window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
      } catch {
        /* storage may be unavailable in some environments */
      }
    });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // Wait for the canvas to mount before interacting.
    await page.locator('[data-circuit-canvas]').waitFor({ state: 'attached' });
    // Expand the right-hand inspector so property / fault controls are
    // reachable without each test having to open it first.
    const expand = page
      .locator('aside.fixed.right-0')
      .getByRole('button', { name: /expand inspector panel/i });
    if (await expand.isVisible().catch(() => false)) {
      await expand.click({ force: true });
      await page.waitForTimeout(300);
    }
  });

  test('hides the "? Specs" quick button from the sub header bar', async ({ page }) => {
    await ensureProMode(page);
    // The removed "? Specs" button was part of the selected-component
    // cluster. After the change the literal label must not exist anywhere.
    await expect(page.getByText('? Specs', { exact: true })).toHaveCount(0);
  });

  test('Fault Lab is Pro-only and arms the manual fault UI', async ({ page }) => {
    await ensureProMode(page);

    // The Fault Lab button is the single dedicated fault entry point (the old
    // sub-header "Faults" master toggle was removed as redundant).
    const faultLab = faultLabToggle(page);
    await expect(faultLab).toBeVisible();

    // Fault mode now lives in the Inspector: opening it arms manual fault
    // injection and snaps the Inspector straight onto the Fault Lab tab.
    await faultLab.click();
    await expect(page.getByLabel('Fault Lab panel')).toBeVisible();

    /*
     * Select a non-source component — the Fault Lab tab offers live fault
     * buttons with canvas animations (the old "Manual Fault Simulation"
     * block in Properties is gone). Target the switch by id rather than by
     * viewport coordinates: the old hardcoded point sat beyond the right
     * edge of narrower (tablet) viewports and clicked nothing. `two-5` is the
     * first staircase switch of the Pro demo bench, and a switch target is
     * what surfaces the switch-scoped "Switched Neutral" fault below.
     */
    await page.locator('[data-component-id="two-5"]').locator(':scope > g[role="button"]').click();
    await page.waitForTimeout(300);
    const panel = page.getByLabel('Fault Lab panel');
    await expect(panel.getByRole('button', { name: /Short Circuit/ })).toBeEnabled();
    await expect(panel.getByRole('button', { name: /Switched Neutral/ })).toBeVisible();
    // Threshold overrides moved here too.
    await expect(panel.getByText('Threshold Overrides')).toBeVisible();
  });

  test('student mode hides Fault Lab and shows its active standard read-only', async ({ page }) => {
    // Switch to Student mode (a visible Pro toggle means persisted settings
    // started this test in Pro).
    const proToggle = page.getByRole('button', { name: /^pro$/i });
    if (await proToggle.isVisible().catch(() => false)) {
      await proToggle.click({ force: true });
    }
    await expect(page.getByRole('button', { name: /^student$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Fault Lab/ })).toHaveCount(0);

    const standard = page.locator('[data-standard-selector][data-standard-readonly]');
    await expect(standard).toBeVisible();
    // Fresh installs default to the neutral International 230 V preset.
    await expect(standard).toContainText('Intl');
    await expect(standard.locator('[data-standard-citation]')).toContainText('IEC 60364');
    // Student can see the governing rules, but cannot open either selector.
    await expect(page.getByRole('button', { name: /Standard: .* Plug: / })).toHaveCount(0);
  });

  test('standard selection preserves the saved supply and independent plug choice', async ({
    page,
  }) => {
    await ensureProMode(page);

    const trigger = page.locator('[data-standard-selector]');
    await trigger.click({ force: true });
    await expect(page.getByText('United States', { exact: true })).toBeVisible();

    // Make a deliberately non-default physical socket selection first.
    await page.getByRole('button', { name: /Schuko/ }).click();
    await expect(trigger).toHaveAttribute('aria-label', /Plug: Schuko/);

    // Standard metadata describes its nominal supply; selecting it does not
    // rewrite the drawing's supply or the explicitly chosen Schuko hardware.
    await trigger.click({ force: true });
    await page.getByRole('button', { name: /united states/i }).click();
    await expect(trigger).toHaveAttribute('aria-label', /Standard: US · Plug: Schuko/);
    await expect(page.getByTitle('Click to change Global Supply Voltage')).toContainText(
      '230 V AC 50 Hz',
    );
    await trigger.click();
    const selectedStandard = page.getByRole('button', { name: /united states/i });
    await expect(selectedStandard).toHaveAttribute('aria-pressed', 'true');
    await expect(selectedStandard).toContainText('120V');
    await expect(selectedStandard).toContainText('60Hz');
    await trigger.click();

    await page.getByLabel('Show all / fault exercise').check();
    const essentials = page.locator('[data-standard-recommendations="us"]');
    await expect(essentials).toBeVisible();
    // US essentials are NEC-flavoured: plain breaker (no IEC curve types),
    // GFCI receptacle (210.8), AFCI protection (210.12) — plus the chosen
    // regional socket.
    await expect(essentials.locator('[data-palette-type="mcb"]')).toBeVisible();
    await expect(essentials.locator('[data-palette-type="afdd"]')).toBeVisible();
    await expect(essentials.locator('[data-palette-type="socket-gfci"]')).toBeVisible();
    await expect(essentials.locator('[data-palette-type="socket-schuko"]')).toBeVisible();
  });

  test('keeps residual safety advice visible without treating an approximate scan as a regulatory block', async ({
    page,
  }) => {
    await page.goto(unprotectedSocketShareUrl(), { waitUntil: 'domcontentloaded' });
    await page.locator('[data-circuit-canvas]').waitFor({ state: 'attached' });
    await ensureProMode(page);
    await page.getByRole('button', { name: /run simulation/i }).click({ force: true });
    const review = page.getByRole('dialog', { name: 'Circuit readiness' });
    await expect(review).toContainText('No load');
    await review.getByRole('button', { name: 'Run diagnostic' }).click();
    await expect(page.getByRole('button', { name: /^stop$/i })).toBeVisible();
    await expect(page.locator('[data-compliance-gate-banner]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Validate', exact: true }).click();
    await expect(page.getByText(/No residual protection found for/).first()).toBeVisible();
    await expect(page.getByText(/Regulation Compliance/)).toHaveCount(0);
  });

  test('simulation history tab is visible in pro inspector', async ({ page }) => {
    await ensureProMode(page);
    // Expand the inspector if collapsed.
    const expand = page.getByRole('button', { name: /expand inspector panel/i });
    if (await expand.isVisible().catch(() => false)) {
      await expand.click({ force: true });
    }
    const historyTab = page.getByRole('button', {
      name: /simulation history \(audit log\)/i,
    });
    await expect(historyTab).toBeVisible();
    await historyTab.click({ force: true });
    await expect(page.getByText('Simulation History').first()).toBeVisible();
  });

  test('diagnostic control cycles heat and heat-plus-voltage-drop modes', async ({ page }) => {
    await ensureProMode(page);
    const button = page.getByRole('button', { name: /Diagnostic overlay:/i });
    await expect(button).toContainText('Off');

    await button.click({ force: true });
    await expect(button).toContainText('Heat only');
    await expect(
      page.locator('[data-stress-zone-overlay][data-diagnostic-overlay-mode="heat"]'),
    ).toBeAttached();

    await button.click({ force: true });
    await expect(button).toContainText('Heat + V-drop');
    await expect(
      page.locator('[data-stress-zone-overlay][data-diagnostic-overlay-mode="heat-vdrop"]'),
    ).toBeAttached();

    await button.click({ force: true });
    await expect(button).toContainText('Off');
    await expect(page.locator('[data-stress-zone-overlay]')).toHaveCount(0);
  });

  test('load inspector separates nameplate settings from unassessed operation and measurements', async ({
    page,
  }) => {
    await ensureProMode(page);
    await page.getByTitle('Zoom to fit all (F)').click();
    await page.locator('[data-component-id="motor-12"] [data-component-hitbox]').click();
    await page.getByTitle(/^Properties & (Settings|Specs)$/).click();
    const inspector = page.locator('[data-tour="inspector"]');
    await expect(inspector.getByRole('heading', { name: 'Load design / nameplate' })).toBeVisible();
    await expect(inspector.getByLabel('Power rating in watts')).toBeVisible();
    await expect(inspector.getByLabel('Operating voltage in volts')).toBeVisible();
    await expect(inspector.locator('[data-component-compatibility="unassessed"]')).toBeVisible();
    await expect(inspector).toContainText('Operating load law is unassessed.');
    await expect(inspector).toContainText('Terminal-pair voltage: unavailable');
    await expect(inspector.locator('[data-recommended-protection]')).toHaveCount(0);
    await page.getByTitle('Waveform Oscilloscope').click();
    await expect(inspector).toContainText('Waveform and energy measurements unavailable');
  });
});
