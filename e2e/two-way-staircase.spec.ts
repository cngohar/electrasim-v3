import { type Locator, type Page, expect, test } from '@playwright/test';

const templateId = 'two-way-staircase-light';

test.describe('Two-Way Staircase guide', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
      window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
  });

  test('lets either switch reverse the lamp across all four traveller combinations', async ({
    page,
  }) => {
    page.on('dialog', (dialog) => dialog.accept());
    const isPhone = (page.viewportSize()?.width ?? 0) < 640;

    // `?template=` is a deep link that confirms, then drops the guide straight
    // onto the canvas — it does not open the Guided Circuits picker. Both
    // `window.confirm` prompts are auto-accepted by the handler above.
    await page.goto(`/?template=${templateId}`);

    const guideHeading = page.getByRole('heading', { name: 'Two-Way Staircase Light' });
    const switchA = switchControl(page.locator(`[data-component-id="${templateId}-switch-a"]`));
    const switchB = switchControl(page.locator(`[data-component-id="${templateId}-switch-b"]`));
    const bulb = page.locator(`[data-component-id="${templateId}-bulb"]`);
    // StatusPill (current design): "6 comps • 6 wires • N energized".
    const status = page.getByText(/6\s*comps\s*•\s*6\s*wires\s*•\s*\d+\s*energized/);

    // The checklist panel is a lazily-imported chunk.
    await expect(guideHeading).toBeVisible({ timeout: 15_000 });
    await expectSwitchPosition(switchA, 'L1');
    await expectSwitchPosition(switchB, 'L1');
    await assertTerminalLabels(page, 'switch-a');
    await assertTerminalLabels(page, 'switch-b');
    if (!isPhone) {
      await switchA.hover();
      await expect(page.getByText('Ports: COM · L1 · L2', { exact: true })).toBeVisible();
    }

    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();

    if (isPhone) {
      // On phones the guide sheet overlays the lower canvas (where the
      // staircase switches sit); "Hide guide" is the intended way to free
      // the canvas for component interaction.
      await page.getByRole('button', { name: 'Hide guide' }).click();
    }

    // L1/L1: both switches select the same traveller, so the lamp is energised.
    await expectLampState(status, bulb, true, isPhone);

    // L2/L1: changing either switch breaks the matching traveller path.
    await switchA.dblclick();
    await expectSwitchPosition(switchA, 'L2');
    await expectSwitchPosition(switchB, 'L1');
    await expectLampState(status, bulb, false, isPhone);
    if (!isPhone) {
      await expect(guideHeading).toBeHidden();
      await expect(page.getByText('Inspector', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Close inspector and return to guide' }).click();
      await expect(guideHeading).toBeVisible();
    }

    // L2/L2: operating the other switch restores the path on the second traveller.
    await switchB.dblclick();
    await expectSwitchPosition(switchA, 'L2');
    await expectSwitchPosition(switchB, 'L2');
    await expectLampState(status, bulb, true, isPhone);

    // L1/L2: changing the first switch again breaks the matching path.
    await switchA.dblclick();
    await expectSwitchPosition(switchA, 'L1');
    await expectSwitchPosition(switchB, 'L2');
    await expectLampState(status, bulb, false, isPhone);
  });
});

function switchControl(component: Locator): Locator {
  return component.locator(':scope > g[role="button"]');
}

async function assertTerminalLabels(page: Page, switchSuffix: string): Promise<void> {
  const componentId = `${templateId}-${switchSuffix}`;
  const component = page.locator(`[data-component-id="${componentId}"]`);

  for (const terminal of ['COM', 'L1', 'L2']) {
    await expect(component.locator(`[data-port-label="${terminal}"]`)).toHaveText(terminal);
    await expect(component.locator(`[data-port-label="${terminal}"]`)).toBeVisible();
    await expect(
      component.getByRole('button', {
        name: `${terminal} port on Two-way Switch ${componentId}`,
        exact: true,
      }),
    ).toHaveCount(1);
  }
}

async function expectSwitchPosition(control: Locator, position: 'L1' | 'L2'): Promise<void> {
  await expect(control).toHaveAttribute('aria-pressed', position === 'L1' ? 'true' : 'false');
  await expect(control).toHaveAttribute('aria-label', new RegExp(`, position ${position}$`));
}

async function expectLampState(
  status: Locator,
  bulb: Locator,
  energised: boolean,
  isPhone: boolean,
): Promise<void> {
  // The status pill is hidden below the `md` breakpoint, so assert its text only
  // on larger screens; the bulb render is the cross-viewport functional check.
  if (!isPhone) {
    await expect(status).toHaveText(
      new RegExp(`6\\s*comps\\s*•\\s*6\\s*wires\\s*•\\s*${energised ? 1 : 0}\\s*energized`),
    );
  }
  // An energised bulb renders exactly one #facc15 outer glow halo (r=22) plus
  // inner #fde047/white highlight circles per the current component design.
  await expect(bulb.locator('circle[fill="#facc15"]')).toHaveCount(energised ? 1 : 0);
}
