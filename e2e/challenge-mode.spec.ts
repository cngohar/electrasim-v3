import { type Page, expect } from '@playwright/test';
import { test } from './helpers/paid-test';

/**
 * Challenge Mode end-to-end (plan §38).
 *
 * The declarative challenges are covered exhaustively by unit suites; this
 * spec proves what only a browser can: the first-time Mission 0 offer, the
 * Learn hub, a challenge starting from a blank canvas, Check Circuit feedback,
 * completion, safe exit, and reload resume.
 */

const panel = (page: Page) => page.locator('section[aria-label="Challenge Mode"]');
const completePanel = (page: Page) => page.locator('section[aria-label="Challenge complete"]');

async function openChallengeMode(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await page.getByText('Challenge Mode', { exact: false }).first().click();
  await expect(page.getByRole('heading', { name: 'How Challenge Mode works' })).toBeVisible();
  await page.getByRole('button', { name: 'Start Challenge Mode' }).click();
  await expect(page.getByRole('heading', { name: 'How Challenge Mode works' })).toBeHidden();
  const missionOffer = page.getByRole('heading', { name: 'Start with a quick mission?' });
  /*
   * The first-run Mission 0 offer is raised from an effect that waits on the
   * persisted-progress load, so it lands a beat *after* the explainer closes.
   * A one-shot `isVisible()` probe raced it and left the offer's modal backdrop
   * swallowing the first click aimed at the Learn hub behind it.
   */
  await expect(missionOffer).toBeVisible();
  await page.getByRole('button', { name: 'Skip to Challenges' }).click();
  // `toBeHidden` also outlasts the modal's 200 ms exit transition, so the
  // backdrop is gone before the caller clicks anything underneath it.
  await expect(missionOffer).toBeHidden();
  await expect(panel(page)).toBeVisible();
  // The menu item's action closes the overlay; assert the overlay panel is
  // inert before moving on (phones: z-[70] above every docked panel).
  await expect
    .poll(() =>
      page.locator('div.fixed.left-1\\/2.top-1\\/2.z-\\[70\\]').first().getAttribute('aria-hidden'),
    )
    .toBe('true');
}

async function startChallenge(page: Page, title: string) {
  await openChallengeMode(page);
  // Each card contains the title and one Start/Retry button; locate the
  // button inside the same card container.
  const card = panel(page).locator('div.rounded-xl').filter({ hasText: title }).first();
  await card.getByRole('button', { name: /^(Start|Retry Challenge|Retry)$/ }).click();
  await expect(panel(page).getByRole('heading', { name: title })).toBeVisible();
}

/** Show the panel again when the phone pill is up. */
async function showPanel(page: Page) {
  const pill = page.getByRole('button', { name: 'Show challenge panel' }).first();
  if (await pill.isVisible().catch(() => false)) {
    await pill.click({ force: true });
    await expect(pill).toBeHidden();
  }
}

/** Hide the panel to a pill on phones, so the canvas is reachable (§19). */
async function hidePanel(page: Page) {
  const hide = page.getByRole('button', { name: 'Hide challenge panel' }).first();
  if (await hide.isVisible().catch(() => false)) await hide.click();
}

/**
 * Convert canvas user units (the 1200x720 viewBox) into client coordinates,
 * applying the same `preserveAspectRatio="xMidYMid meet"` letterboxing the
 * renderer applies. Playwright clicks in client space, so placements land
 * exactly on the intended canvas grid points.
 */
async function canvasPoint(
  page: Page,
  canvasX: number,
  canvasY: number,
): Promise<{ x: number; y: number }> {
  const svg = page.locator('[data-circuit-canvas]');
  const box = (await svg.boundingBox())!;
  const scale = Math.min(box.width / 1200, box.height / 720);
  const offX = (box.width - 1200 * scale) / 2;
  const offY = (box.height - 720 * scale) / 2;
  return { x: box.x + offX + canvasX * scale, y: box.y + offY + canvasY * scale };
}

/** Placement grid (canvas units) — clear of the palette dock and challenge panel. */
const PLACEMENT_SPOTS: [number, number][] = [
  [420, 150],
  [560, 150],
  [420, 290],
  [560, 290],
  [700, 150],
  [420, 430],
  [700, 290],
];

let placeCounter = 0;
async function placeComponent(page: Page, type: string) {
  // Phones: palette is a bottom sheet opened by the dock's Add button.
  // Tablet: palette is a collapsible side drawer with an expand control.
  const tile = page.locator(`[data-palette-type="${type}"]`).first();
  const wasVisible = await tile.isVisible().catch(() => false);
  if (!wasVisible) {
    const addButton = page.getByRole('button', { name: 'Add' }).first();
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
    } else {
      const expand = page.getByRole('button', { name: 'Expand Component Library' }).first();
      if (await expand.isVisible().catch(() => false)) await expand.click();
    }
    await expect(tile).toBeVisible();
  }
  await tile.click();
  // On phones the sheet stays open over the canvas; close it so the canvas
  // can receive the placement click.
  const close = page.getByRole('button', { name: 'Close palette' }).first();
  if (await close.isVisible().catch(() => false)) await close.click();

  const spot = PLACEMENT_SPOTS[placeCounter] ?? [420, 150];
  placeCounter += 1;
  const point = await canvasPoint(page, spot[0], spot[1]);
  await page.mouse.click(point.x, point.y);
  await expect(page.locator(`[data-component-type="${type}"]`).first()).toBeVisible();
}

/**
 * Click two ports to wire them (port-click-port FSM). Ports are real buttons
 * (tabIndex=0, Enter activates), so keyboard activation sidesteps panel
 * occlusion entirely — the same pattern smoke.spec.ts uses for rerouting.
 *
 * The focusable element is the expanded touch target (`data-port-touch-target`)
 * inside the port group, NOT the `data-port-index` circle — that one is the
 * visual pin and carries `pointer-events: none` with no tabIndex, so focusing
 * it silently did nothing and no wire was ever drawn.
 */
function port(page: Page, type: string, index: number) {
  const prefix = type.split('-')[0];
  return page
    .locator(
      `[data-component-id^="${prefix}-"] [data-port-group="${index}"] [data-port-touch-target]`,
    )
    .first();
}

async function wirePorts(
  page: Page,
  fromType: string,
  fromPort: number,
  toType: string,
  toPort: number,
) {
  const from = port(page, fromType, fromPort);
  const to = port(page, toType, toPort);
  await from.focus();
  await from.press('Enter');
  await to.focus();
  await to.press('Enter');
}

test.describe('Challenge Mode', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    placeCounter = 0;
    /*
     * The build-and-check challenges place five components, wire four pairs and
     * run the evaluator — around 25 s on WebKit even when it has the machine to
     * itself, which overruns the 30 s budget as soon as workers compete. Widen
     * the budget on the iPad project rather than thinning the coverage.
     */
    test.slow(testInfo.project.name === 'tablet-safari');
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
      window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
    page.on('dialog', (dialog) => dialog.accept());
  });

  test('offers Mission 0 after the Challenge Mode explainer', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByText('Challenge Mode', { exact: false }).first().click();
    await page.getByRole('button', { name: 'Start Challenge Mode' }).click();
    await expect(page.getByRole('heading', { name: 'Start with a quick mission?' })).toBeVisible();
    await expect(page.getByText(/Mission 0: Light Your First Lamp/)).toBeVisible();
  });

  test('shows the Learn hub with three challenge cards', async ({ page }) => {
    await openChallengeMode(page);

    for (const title of [
      'Build a Protected Lamp',
      'Wire a Push-Button Doorbell',
      'Protect a Socket with an RCBO',
    ]) {
      await expect(panel(page).getByText(title)).toBeVisible();
    }
    // No game mechanics (plan §17).
    await expect(panel(page).getByText(/XP|coins|stars/i)).toBeHidden();
  });

  test('pauses and resumes a live challenge without losing its timer segment', async ({ page }) => {
    await startChallenge(page, 'Build a Protected Lamp');

    await page.getByRole('button', { name: 'Pause challenge' }).click();
    await expect(page.getByLabel('Challenge paused')).toBeVisible();
    await expect(page.locator('[data-circuit-canvas]')).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('button', { name: 'Resume challenge' }).first()).toBeVisible();

    await page.getByRole('button', { name: 'Resume challenge' }).first().click();
    await expect(page.getByLabel('Challenge paused')).toBeHidden();
    await expect(page.locator('[data-circuit-canvas]')).toHaveAttribute('aria-disabled', 'false');
  });

  test('Protected Lamp: starts blank, gives feedback, completes (plan §23, §38-1)', async ({
    page,
  }) => {
    await startChallenge(page, 'Build a Protected Lamp');

    // The starter is a blank canvas (plan §23).
    await expect.poll(() => page.locator('[data-component-id]').count()).toBe(0);

    // Check on an empty canvas gives HIGH-LEVEL, outcome-based guidance —
    // never the construction recipe (UX correction plan §6, §9).
    await panel(page)
      .getByRole('button', { name: /Check circuit/ })
      .click();
    await expect(panel(page).getByText('Your circuit is not ready to operate yet.')).toBeVisible();
    await expect(
      panel(page).getByText('The lighting circuit is not yet protected by an MCB.').first(),
    ).toBeVisible();
    // The outcome requirements are shown, not a "Place a Live supply terminal"
    // style construction checklist. Match exactly: the feedback paragraphs
    // quote the same wording ("…is not yet protected by an MCB."), so a
    // substring match would resolve to several nodes.
    for (const requirement of [
      'Protected by an MCB',
      'Switch controls the lamp',
      'Complete return path',
      'Lamp operates correctly',
    ]) {
      await expect(panel(page).getByText(requirement, { exact: true })).toBeVisible();
    }
    await expect(panel(page).getByText(/All steps/i)).toBeHidden();
    await expect(panel(page).getByText(/Place a Live supply terminal/i)).toBeHidden();

    // §19: hide the sheet so the canvas is reachable, then build the answer.
    await hidePanel(page);
    await placeComponent(page, 'live-terminal');
    await placeComponent(page, 'neutral-terminal');
    await placeComponent(page, 'mcb');
    await placeComponent(page, 'single-way-switch');
    await placeComponent(page, 'bulb');

    // The single-way switch starts off; close it so the lamp can light.
    // Keyboard activation works on every engine (tablet Safari's dblclick is
    // unreliable on SVG hitboxes) — same pattern the staircase spec uses.
    const sw = page.locator('[data-component-type="single-way-switch"]').first();
    await sw.focus();
    await sw.press('Enter');
    await expect(sw).toHaveAttribute('aria-pressed', 'true');

    await wirePorts(page, 'live-terminal', 0, 'mcb', 0);
    await wirePorts(page, 'mcb', 1, 'single-way-switch', 0);
    await wirePorts(page, 'single-way-switch', 1, 'bulb', 0);
    await wirePorts(page, 'neutral-terminal', 0, 'bulb', 1);

    // Bring the panel back and check.
    await showPanel(page);
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));
    await expect(panel(page).getByRole('button', { name: /Check circuit/ })).toBeVisible({
      timeout: 10_000,
    });
    expect(errors).toEqual([]);
    await panel(page)
      .getByRole('button', { name: /Check circuit/ })
      .click();
    await expect(completePanel(page).getByText(/COMPLETE!/i)).toBeVisible();
    await expect(completePanel(page).getByText(/protection, switching/i)).toBeVisible();
  });

  test('exit restores the normal circuit exactly (plan §13, §38-2)', async ({ page }) => {
    // Build a distinctive normal circuit first via a guide.
    await page.goto('/');
    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByText('Guided Circuits', { exact: false }).first().click();
    const guide = page
      .getByRole('article')
      .filter({ has: page.getByRole('heading', { name: 'Simple Protected Lamp' }) })
      .first();
    await guide.getByRole('button', { name: 'Load guide' }).click();
    const normalCount = await page.locator('[data-component-id]').count();
    await page
      .getByRole('button', { name: 'Hide guide' })
      .click()
      .catch(() => {});

    // Enter a challenge, then exit.
    await startChallenge(page, 'Build a Protected Lamp');
    await showPanel(page);
    await panel(page)
      .getByRole('button', { name: /Exit challenge/ })
      .click();
    await expect(page.getByRole('heading', { name: /End Challenge Mode/i })).toBeVisible();
    // WebKit's stability check can stall on the modal's exit animation;
    // force-click past the transient state (the store action is synchronous).
    await page.getByRole('button', { name: 'Restore Saved Circuit' }).click({ force: true });

    // The normal circuit is back, byte-for-byte.
    await expect.poll(() => page.locator('[data-component-id]').count()).toBe(normalCount);
    await expect(panel(page)).toBeHidden();
  });

  test('reload during a challenge offers Continue vs Return (plan §14, §38-3)', async ({
    page,
  }) => {
    await startChallenge(page, 'Build a Protected Lamp');
    await placeComponent(page, 'bulb');
    // Let the 250 ms debounced autosave flush to the challenge workspace.
    await page.waitForTimeout(500);

    await page.reload();
    await expect(page.getByRole('heading', { name: /Continue Challenge/i })).toBeVisible();
    await page.getByRole('button', { name: 'Continue Challenge' }).click();

    await expect(
      panel(page).getByRole('heading', { name: 'Build a Protected Lamp' }),
    ).toBeVisible();
    await expect(page.locator('[data-component-type="bulb"]').first()).toBeVisible();
  });

  test('Doorbell: wiring through the momentary button completes (plan §24, §38-4)', async ({
    page,
  }) => {
    await startChallenge(page, 'Wire a Push-Button Doorbell');
    await hidePanel(page);

    await placeComponent(page, 'live-terminal');
    await placeComponent(page, 'neutral-terminal');
    await placeComponent(page, 'mcb');
    await placeComponent(page, 'push-button');
    await placeComponent(page, 'bell');

    await wirePorts(page, 'live-terminal', 0, 'mcb', 0);
    await wirePorts(page, 'mcb', 1, 'push-button', 0);
    await wirePorts(page, 'push-button', 1, 'bell', 0);
    await wirePorts(page, 'neutral-terminal', 0, 'bell', 1);

    // Bring the panel back and check.
    await showPanel(page);
    await expect(panel(page).getByRole('button', { name: /Check circuit/ })).toBeVisible();
    // Check Circuit runs the functional rules: with the button released the
    // bell is off AND with it pressed the bell is on — only the momentary
    // topology satisfies both, so this completes.
    await panel(page)
      .getByRole('button', { name: /Check circuit/ })
      .click();
    await expect(completePanel(page).getByText(/COMPLETE!/i)).toBeVisible();
    // The panel now explains the momentary contact twice — the "you used…"
    // verdict and a standing teaching note — so take the first match.
    await expect(
      completePanel(page)
        .getByText(/momentary contact/i)
        .first(),
    ).toBeVisible();
  });

  test('RCBO: missing earth is rejected (plan §25, §38-6)', async ({ page }) => {
    await startChallenge(page, 'Protect a Socket with an RCBO');
    await hidePanel(page);

    await placeComponent(page, 'live-terminal');
    await placeComponent(page, 'neutral-terminal');
    await placeComponent(page, 'rcbo');
    await placeComponent(page, 'socket-3pin');

    await wirePorts(page, 'live-terminal', 0, 'rcbo', 0);
    await wirePorts(page, 'neutral-terminal', 0, 'rcbo', 1);
    await wirePorts(page, 'rcbo', 2, 'socket-3pin', 0);
    await wirePorts(page, 'rcbo', 3, 'socket-3pin', 1);
    // Earth deliberately left off.

    // Bring the panel back and check.
    await showPanel(page);
    await expect(panel(page).getByRole('button', { name: /Check circuit/ })).toBeVisible();
    await panel(page)
      .getByRole('button', { name: /Check circuit/ })
      .click();
    // High-level, non-recipe feedback about the missing Earth (UX plan §9, §10).
    await expect(
      panel(page)
        .getByText(
          'The socket is not fully supplied — check the Live, Neutral and Earth connections.',
        )
        .first(),
    ).toBeVisible();
    await expect(panel(page).getByText(/No Earth terminal on the canvas yet./i)).toBeHidden();
    await expect(panel(page).getByText(/COMPLETE!/i)).toBeHidden();
  });
});
