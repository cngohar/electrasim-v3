import { type Locator, type Page, expect } from '@playwright/test';

export const isPhone = (page: Page) => (page.viewportSize()?.width ?? 1280) < 640;

export async function closePhoneProperties(page: Page) {
  if (!isPhone(page)) return;
  const dialog = page.getByRole('dialog', { name: 'Component properties', exact: true });
  if (await dialog.isVisible()) {
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
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
    ? page.getByRole('button', { name: 'Supply', exact: true })
    : page.getByTitle('Click to change Global Supply Voltage');
}

export async function inspectComponent(page: Page, id: string) {
  await fitCanvas(page);
  await activateControl(
    page,
    page.locator(`[data-component-id="${id}"] [data-component-hitbox]`),
    true,
  );
  await activateControl(
    page,
    isPhone(page)
      ? page.getByRole('button', { name: 'Inspect', exact: true })
      : page.getByTitle(/^Properties & (Settings|Specs)$/),
  );
  return isPhone(page)
    ? page.getByRole('dialog', { name: 'Component properties', exact: true })
    : page.locator('[data-tour="inspector"]');
}
