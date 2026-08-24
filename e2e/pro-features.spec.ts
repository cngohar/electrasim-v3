import { gzipSync } from 'node:zlib';
import { type Page, expect, test } from '@playwright/test';

/**
 * End-to-end coverage for the Pro-mode feature set delivered in this branch:
 *   - Specs button removed from the SubHeaderBar
 *   - Manual fault injection master toggle (Pro-only) + fault UI gating
 *   - Read-only Student standard display and independent Pro standard/plug controls
 *   - Compliance banner, audited teacher override, and persisted Simulation History
 *   - Unified routed-path Heat / Heat + V-drop diagnostic overlay
 *   - Recommended Protection badge on component properties
 */

/** A complete UK socket circuit with no upstream RCD/RCBO. It is electrically
 * runnable but has one unambiguous blocking compliance issue. */
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

async function ensureProMode(page: Page) {
  // The mode toggle always renders either "Student" (basic, emerald) or
  // "Pro" (pro, purple). If the button currently shows "Student", click it
  // to switch into Pro Electrician Mode.
  const studentToggle = page.getByRole('button', { name: /^student$/i });
  if (await studentToggle.isVisible().catch(() => false)) {
    await studentToggle.click({ force: true });
  }
  // Wait until Pro-only chrome appears (the Fault Lab button in the app bar).
  await expect(page.getByRole('button', { name: /Fault Lab/ })).toBeVisible();
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
    const faultLab = page.getByRole('button', { name: /Fault Lab/ });
    await expect(faultLab).toBeVisible();

    // Opening it arms manual fault injection and opens the dedicated panel.
    await faultLab.click();
    await expect(page.getByLabel('Fault Lab panel')).toBeVisible();

    /*
     * Select a non-source component — the Inspector Properties tab shows the
     * Manual Fault Simulation panel while armed. Target the switch by id
     * rather than by viewport coordinates: the old hardcoded point sat beyond
     * the right edge of narrower (tablet) viewports and clicked nothing.
     */
    await page
      .locator('[data-component-id="single-10"]')
      .locator(':scope > g[role="button"]')
      .click();
    await page.waitForTimeout(300);
    await expect(page.getByText('Manual Fault Simulation').first()).toBeVisible();
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

  test('standard switches voltage without overwriting the independent plug choice', async ({
    page,
  }) => {
    await ensureProMode(page);

    const trigger = page.locator('[data-standard-selector]');
    await trigger.click({ force: true });
    await expect(page.getByText('United States', { exact: true })).toBeVisible();

    // Make a deliberately non-default physical socket selection first.
    await page.getByRole('button', { name: /Schuko/ }).click();
    await expect(trigger).toHaveAttribute('aria-label', /Plug: Schuko/);

    // Changing only the rule set updates voltage/frequency while retaining
    // the explicitly chosen Schuko hardware.
    await trigger.click({ force: true });
    await page.getByRole('button', { name: /united states/i }).click();
    await expect(trigger).toHaveAttribute('aria-label', /Standard: US · Plug: Schuko/);
    await expect(page.getByText(/120\s*V\s*60\s*Hz/)).toBeVisible({ timeout: 5000 });

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

  test('compliance gate explains, overrides, audits, and persists a violation', async ({
    page,
  }) => {
    await page.goto(unprotectedSocketShareUrl(), { waitUntil: 'domcontentloaded' });
    await page.locator('[data-circuit-canvas]').waitFor({ state: 'attached' });
    await ensureProMode(page);

    await page.getByRole('button', { name: /run simulation/i }).click({ force: true });

    const banner = page.locator('[data-compliance-gate-banner]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText(/Fix 1 blocking issue to enable Run/i);
    await expect(banner).toContainText(/RCD|GFCI/i);
    // Regulatory rejection is not presented as a simulated electrical trip.
    await expect(page.getByText(/unresolved electrical fault/i)).toHaveCount(0);

    await banner.locator('[data-compliance-override]').click();
    await expect(page.getByRole('button', { name: /^stop$/i })).toBeVisible();
    await expect(banner).toHaveCount(0);

    await page
      .getByRole('button', { name: /simulation history \(audit log\)/i })
      .click({ force: true });
    const auditEntry = page.locator('[data-history-event="manual_intervention"]');
    await expect(auditEntry).toContainText(/Teacher\/demo override/i);

    // IndexedDB autosave is debounced. A reload must hydrate the audit event
    // before React renders so the history cannot flash empty or disappear.
    await page.waitForTimeout(250);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-circuit-canvas]').waitFor({ state: 'attached' });
    await page
      .getByRole('button', { name: /simulation history \(audit log\)/i })
      .click({ force: true });
    await expect(page.locator('[data-history-event="manual_intervention"]')).toContainText(
      /Teacher\/demo override/i,
    );
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

  test('recommended protection badge appears for a load in pro mode', async ({ page }) => {
    await ensureProMode(page);
    // The default seed circuit places bulbs across the canvas. Click around
    // the centre where nothing overlaps, then confirm the badge rendered.
    // We try a handful of candidate points because bulb positions vary with
    // the viewport.
    // Seed-circuit screen-space centres (derived for a 1680 px viewport).
    // motor-16 reliably renders the Recommended Protection badge; switches
    // exercise the Manual Fault Simulation panel.
    const candidates = [
      [659, 847], // motor-16
      [937, 347], // single-way switch
      [1187, 569], // push button
      [409, 208], // mcb-4
    ];
    let found = false;
    for (const [x, y] of candidates) {
      await page.mouse.click(x, y);
      await page.waitForTimeout(250);
      if (
        await page
          .locator('[data-recommended-protection]')
          .isVisible()
          .catch(() => false)
      ) {
        found = true;
        break;
      }
    }
    expect(found).toBeTruthy();
    await expect(page.getByText(/MCB Rating/).first()).toBeVisible();
  });
});
