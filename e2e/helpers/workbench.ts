import { type Locator, type Page, expect } from '@playwright/test';

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 640;

export async function closePhoneProperties(page: Page) {
  const dialog = page.getByRole('dialog', { name: /Component properties|· detailed settings$/ });
  if (await dialog.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
  }
  if (!isPhone(page)) return;
  const inspector = page.locator('[data-tour="inspector"][data-phone-inspector="true"]');
  if (await inspector.isVisible()) {
    await activateControl(
      page,
      inspector.getByRole('button', { name: 'Collapse Inspector', exact: true }),
    );
    await expect(inspector).not.toBeVisible();
  }
}

export async function activateControl(page: Page, target: Locator, svg = false) {
  if (page.context().browser()?.browserType().name() !== 'webkit') {
    await target.click();
    return;
  }
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  if (!svg) {
    await target.press('Enter');
    return;
  }
  // WPE can stall waiting for stable bounds during flow animation. Verify
  // the actual hit target before dispatching the pointer without a frame wait.
  await expect
    .poll(() =>
      target.evaluate((node) => {
        const box = node.getBoundingClientRect();
        const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
        return hit !== null && node.contains(hit);
      }),
    )
    .toBe(true);
  await target.click({ force: true });
}

export async function fitCanvas(page: Page) {
  await closePhoneProperties(page);
  await activateControl(
    page,
    isPhone(page)
      ? page.getByRole('button', { name: 'Fit', exact: true })
      : page.getByTitle('Zoom to fit all (F)'),
  );
}

export function supplyTrigger(page: Page) {
  return isPhone(page)
    ? page.locator('[data-workspace-context]').getByRole('button', { name: 'Supply', exact: true })
    : page.getByTitle('Click to change Global Supply Voltage');
}

export async function openInspector(page: Page, id: string) {
  await fitCanvas(page);
  await activateControl(
    page,
    page.locator(`[data-component-id="${id}"] [data-component-hitbox]`),
    true,
  );
  const inspector = page.getByRole('complementary', { name: 'Inspector', exact: true });
  if (!(await inspector.isVisible()))
    await activateControl(page, page.getByRole('button', { name: 'Inspect', exact: true }));
  await activateControl(page, inspector.getByRole('button', { name: 'Properties', exact: true }));
  return inspector;
}

/** Existing model/repair suites exercise the detailed editor, now a separate window. */
export async function inspectComponent(page: Page, id: string) {
  const inspector = await openInspector(page, id);
  await activateControl(
    page,
    inspector.getByRole('button', { name: 'Detailed model settings', exact: true }),
  );
  return page.getByRole('dialog', { name: /· detailed settings$/ });
}

export async function openCircuitTools(page: Page) {
  const trigger = page.getByRole('button', { name: 'Labs and circuit tools', exact: true });
  if ((await trigger.getAttribute('aria-expanded')) !== 'true')
    await activateControl(page, trigger);
  return page.getByRole('region', { name: 'Circuit tools', exact: true });
}

/** Review one target draft, then apply one real circuit edit. */
export async function applyLabFault(page: Page, name: RegExp) {
  await activateControl(
    page,
    page.getByLabel('Fault Lab panel').getByRole('button', { name: /Browse fault library/ }),
  );
  await activateControl(
    page,
    page.getByRole('dialog', { name: 'Fault library', exact: true }).getByRole('button', { name }),
  );
  await activateControl(
    page,
    page
      .getByRole('dialog', { name: 'Review fault edit' })
      .getByRole('button', { name: 'Apply fault edit' }),
  );
}
