import { expect, test } from '@playwright/test';

/**
 * Smoke test: app boots and renders the locked Lab Glass · Light shell.
 * Phase 4 will add full interaction coverage (place, wire, simulate, etc.).
 */
test('first-visit welcome close control works', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.removeItem('electrasim:welcomed');
    window.localStorage.removeItem('electrasim:mobile-suitability:v1');
  });
  await page.goto('/');

  const isPhone = (page.viewportSize()?.width ?? 0) < 640;
  const suitability = page.getByRole('dialog', {
    name: 'ElectraSim works best on a larger screen',
  });
  if (isPhone) {
    await expect(suitability).toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Welcome to ElectraSim' })).toHaveCount(0);
    await suitability.getByRole('button', { name: 'Continue' }).click();
    expect(
      await page.evaluate(() => window.localStorage.getItem('electrasim:mobile-suitability:v1')),
    ).toBe('1');
  } else {
    await expect(suitability).toHaveCount(0);
  }

  const welcome = page.getByRole('dialog', { name: 'Welcome to ElectraSim' });
  await expect(welcome).toBeVisible();
  await welcome.getByRole('button', { name: 'Close welcome' }).click();

  await expect(welcome).not.toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem('electrasim:welcomed'))).toBe('1');
});

test('shows the phone suitability advisory once for a returning user', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chrome', 'Phone-only advisory behavior.');
  await page.addInitScript(() => {
    window.localStorage.setItem('electrasim:welcomed', '1');
    window.localStorage.removeItem('electrasim:mobile-suitability:v1');
  });

  await page.goto('/');
  const suitability = page.getByRole('dialog', {
    name: 'ElectraSim works best on a larger screen',
  });
  await expect(suitability).toBeVisible();
  await suitability.getByRole('button', { name: 'Continue' }).click();
  await expect(suitability).toHaveCount(0);
  await expect(page.getByRole('dialog', { name: 'Welcome to ElectraSim' })).toHaveCount(0);

  await page.reload();
  await expect(suitability).toHaveCount(0);
});

test('does not show the phone suitability advisory on tablet or desktop', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'mobile-chrome', 'Covered by the phone-only test.');
  await page.addInitScript(() => {
    window.localStorage.setItem('electrasim:welcomed', '1');
    window.localStorage.removeItem('electrasim:mobile-suitability:v1');
  });

  await page.goto('/');
  await expect(
    page.getByRole('dialog', { name: 'ElectraSim works best on a larger screen' }),
  ).toHaveCount(0);
});

test.describe('app shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
      window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
    });
  });

  test('boots and can start the simulation', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('application', { name: 'Circuit diagram' })).toBeVisible();

    const runButton = page.getByRole('button', { name: /^Run Simulation$/ });
    await expect(runButton).toBeVisible();
    await runButton.click();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();

    const viewport = page.viewportSize();
    if (viewport && viewport.width < 640) {
      await expect(page.getByRole('button', { name: 'Add' })).toBeVisible();
    } else {
      await expect(page.locator('header').getByText('ElectraSim', { exact: true })).toBeVisible();
      /*
       * The palette defaults to expanded at `lg`+ and collapsed below it, but
       * either way it is an <aside> labelled "Components" — the collapsed rail
       * renders the same word vertically. There has never been a "Components"
       * button, so assert on what actually ships.
       */
      await expect(page.locator('aside').getByText('Components', { exact: true })).toBeVisible();
    }
  });

  test('console panel is visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    await expect(page.getByText(/Console · \d+ entries/)).toBeVisible();
  });

  test('keeps selection clicks stable and supports keyboard wire rerouting', async ({ page }) => {
    await page.goto('/');

    // Pin the component by ID: selecting a component intentionally raises it
    // to the end of the SVG DOM (z-order = document order), so `.first()`
    // would re-resolve to a different element after the click.
    const componentId = await page
      .locator('[data-component-id]')
      .first()
      .getAttribute('data-component-id');
    const component = page.locator(`[data-component-id="${componentId}"]`);
    const componentBody = component.locator(':scope > g[role="button"]');
    const transformBefore = await component.getAttribute('transform');
    await componentBody.evaluate(async (node) => {
      const box = node.getBoundingClientRect();
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      node.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          buttons: 1,
          clientX: point.x,
          clientY: point.y,
          pointerId: 70,
          pointerType: 'mouse',
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          button: 0,
          buttons: 0,
          clientX: point.x,
          clientY: point.y,
          pointerId: 70,
          pointerType: 'mouse',
        }),
      );
      node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      await new Promise(requestAnimationFrame);
    });
    // A selection click must not move the component. Compare positions, not
    // transform serializations — a no-op `rotate(0 …)` segment may be dropped.
    await expect
      .poll(async () => normalizeTransform(await component.getAttribute('transform')))
      .toBe(normalizeTransform(transformBefore));

    const wire = page.getByRole('button', { name: /^Wire w-/ }).first();
    await wire.focus();
    await wire.press('r');
    await expect(page.locator('[data-circuit-canvas]')).toHaveAttribute(
      'data-reroute-active',
      /:to$/,
    );

    /*
     * Re-terminate the wire on the socket's Live port. Two things moved here:
     * the demo bench no longer ships a `fuse-*` component, and the focusable
     * port element is the expanded touch target inside the port group — the
     * `data-port-index` circle is the visual pin, with `pointer-events: none`
     * and no tabIndex, so focusing it did nothing.
     */
    const targetPort = page
      .locator('[data-component-id^="socket-"] [data-port-group="0"] [data-port-touch-target]')
      .first();
    await targetPort.focus();
    await targetPort.press('Enter');
    await expect(page.locator('[data-circuit-canvas]')).not.toHaveAttribute(
      'data-reroute-active',
      /.+/,
    );
    await expect(page.locator('[data-circuit-canvas]')).toHaveAttribute(
      'data-interaction-mode',
      'idle',
    );
  });

  test('cleans up cancelled drags and pans with touch input', async ({ page }) => {
    await page.goto('/');

    // Pin by ID — pointerdown selects the component, which raises it to the
    // end of the SVG DOM (see the selection-click test above).
    const componentId = await page
      .locator('[data-component-id]')
      .first()
      .getAttribute('data-component-id');
    const component = page.locator(`[data-component-id="${componentId}"]`);
    const transformBefore = await component.getAttribute('transform');
    await component.locator(':scope > g[role="button"]').evaluate(async (node) => {
      const box = node.getBoundingClientRect();
      const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      node.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          button: 0,
          buttons: 1,
          clientX: start.x,
          clientY: start.y,
          pointerId: 71,
          pointerType: 'mouse',
        }),
      );
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          button: -1,
          buttons: 1,
          clientX: start.x + 30,
          clientY: start.y + 20,
          pointerId: 71,
          pointerType: 'mouse',
        }),
      );
      await new Promise(requestAnimationFrame);
      window.dispatchEvent(
        new PointerEvent('pointercancel', {
          bubbles: true,
          pointerId: 71,
          pointerType: 'mouse',
        }),
      );
      await new Promise(requestAnimationFrame);
    });
    // A cancelled drag must not move the component (position compare, not
    // serialization — the no-op rotate segment may be dropped on commit).
    await expect
      .poll(async () => normalizeTransform(await component.getAttribute('transform')))
      .toBe(normalizeTransform(transformBefore));
    expect(await component.evaluate((node) => (node as SVGElement).style.translate)).toBe('');

    const world = page.locator('[data-canvas-world]');
    const panBefore = await world.getAttribute('transform');
    const touchResult = await page
      .locator('svg[aria-label="Circuit diagram"]')
      .evaluate(async (svg) => {
        const box = svg.getBoundingClientRect();
        const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        svg.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            button: 0,
            buttons: 1,
            clientX: start.x,
            clientY: start.y,
            pointerId: 72,
            pointerType: 'touch',
          }),
        );
        svg.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            button: 0,
            buttons: 1,
            clientX: start.x + 80,
            clientY: start.y + 40,
            pointerId: 73,
            pointerType: 'touch',
          }),
        );
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            button: -1,
            buttons: 1,
            clientX: start.x + 120,
            clientY: start.y + 70,
            pointerId: 73,
            pointerType: 'touch',
          }),
        );
        svg
          .querySelector('[data-port-index]')
          ?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        await new Promise(requestAnimationFrame);
        const secondaryPreview = (svg.parentElement as HTMLElement | null)?.style.transform ?? '';
        window.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            button: 0,
            buttons: 0,
            pointerId: 73,
            pointerType: 'touch',
          }),
        );
        window.dispatchEvent(
          new PointerEvent('pointermove', {
            bubbles: true,
            button: -1,
            buttons: 1,
            clientX: start.x + 36,
            clientY: start.y + 18,
            pointerId: 72,
            pointerType: 'touch',
          }),
        );
        await new Promise(requestAnimationFrame);
        window.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            button: 0,
            buttons: 0,
            clientX: start.x + 36,
            clientY: start.y + 18,
            pointerId: 72,
            pointerType: 'touch',
          }),
        );
        await new Promise(requestAnimationFrame);
        return {
          secondaryPreview,
          mode: svg.getAttribute('data-interaction-mode'),
        };
      });
    expect(touchResult).toEqual({ secondaryPreview: '', mode: 'idle' });
    await expect(world).not.toHaveAttribute('transform', panBefore ?? '');
  });
});

/**
 * Normalize an SVG `transform` attribute for position-only comparison:
 * strips a no-op `rotate(0 …)` segment (dropped on some state commits) and
 * collapses whitespace, so assertions check where the component *is*, not
 * how the string happens to be serialized.
 */
function normalizeTransform(transform: string | null): string {
  return (transform ?? '')
    .replace(/\s*rotate\(0(?:\.0+)?\s+[^)]+\)/, '')
    .replace(/\s+/g, ' ')
    .trim();
}
