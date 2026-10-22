import { readFile } from 'node:fs/promises';
import { type Page, expect, test } from '@playwright/test';
import { activateControl } from './helpers/workbench';

async function loadCanvas(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto(
    test.info().config.metadata.delivery === 'built'
      ? '/app/?e2e=canvas-base'
      : '/?e2e=canvas-base',
  );
  // Use an interactive control for setup instead of dispatching a shortcut
  // while the freshly mounted editor may still be registering its effects.
  await page.getByRole('button', { name: 'Menu', exact: true }).click();
  await page.getByRole('button', { name: /^Import \/ Export/ }).click();
  const modal = page.getByRole('dialog');
  await modal.getByRole('button', { name: /^Import$/ }).click();
  await modal.locator('textarea').fill(
    JSON.stringify({
      version: 1,
      exportedAt: 0,
      circuit: {
        components: ['mcb', 'single-way-switch', 'bulb', 'socket-3pin', 'contactor', 'motor'].map(
          (type, i) => ({
            id: `device-${i}`,
            type,
            x: 360 + (i % 3) * 220,
            y: 270 + Math.floor(i / 3) * 200,
            rotation: i === 5 ? 90 : 0,
            state: { on: true, ...(i === 0 ? { customMaxAmps: 6 } : {}) },
          }),
        ),
        wires: [],
      },
    }),
  );
  await modal.getByRole('button', { name: 'Import from paste' }).click();
  await expect(modal.getByText('Loaded 6 components, 0 wires.', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(modal).toHaveCount(0);
  await page.keyboard.press('f');
}

test('physical artwork retains keyboard wiring and rotation after a cancelled drag', async ({
  page,
}, info) => {
  await loadCanvas(page);
  await expect(page.locator('[data-device-art]')).toHaveCount(6);
  await expect(page.locator('[data-device-rating]').first()).toHaveText('B6 A');
  const rocker = page.locator('[data-component-id="device-1"] [data-component-hitbox]');
  await rocker.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-device-art="single-way-switch"]')).toHaveAttribute(
    'data-device-state',
    'off',
  );
  for (const [device, port] of [
    ['device-0', 1],
    ['device-1', 0],
  ] as const) {
    await page
      .locator(
        `[data-component-id="${device}"] [data-port-group="${port}"] [data-port-touch-target]`,
      )
      .focus();
    await page.keyboard.press('Enter');
  }
  await expect(page.locator('[data-wire-id]')).toHaveCount(1);
  const motor = page.locator('[data-component-id="device-5"]');
  const before = await motor.getAttribute('transform');
  await motor.locator('[data-component-hitbox]').evaluate(async (node) => {
    const box = node.getBoundingClientRect();
    const props = {
      bubbles: true,
      button: 0,
      buttons: 1,
      pointerId: 81,
      pointerType: 'mouse',
      clientX: box.x + box.width / 2,
      clientY: box.y + box.height / 2,
    };
    node.dispatchEvent(new PointerEvent('pointerdown', props));
    window.dispatchEvent(
      new PointerEvent('pointermove', { ...props, button: -1, clientX: props.clientX + 60 }),
    );
    await new Promise(requestAnimationFrame);
    window.dispatchEvent(new PointerEvent('pointercancel', props));
  });
  await expect(motor).toHaveAttribute('transform', before!);
  await expect(page.locator('[data-circuit-canvas]')).not.toHaveAttribute('data-canvas-gesture');
  await page.keyboard.press('Escape');
  await page.keyboard.press('f');
  await page.screenshot({ path: info.outputPath('canvas-devices.png') });
});

test('fits rotated devices into the visible canvas on desktop and phone', async ({ page }) => {
  await loadCanvas(page);
  const canvas = page.locator('[data-circuit-canvas]');
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  for (const device of await page.locator('[data-component-id]').all()) {
    const box = await device.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(bounds!.x);
    expect(box!.y).toBeGreaterThanOrEqual(bounds!.y);
    expect(box!.x + box!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(bounds!.y + bounds!.height);
  }
  // Floating panels must not cover the fitted device bodies.
  await expect
    .poll(() =>
      page.evaluate(() => {
        const panels = Array.from(
          document.querySelectorAll(
            '[data-canvas-occluder], [data-tour="palette"], [data-tour="inspector"]',
          ),
        ).map((el) => el.getBoundingClientRect());
        return Array.from(document.querySelectorAll('[data-component-id]'))
          .filter((el) => {
            const b = el.getBoundingClientRect();
            return panels.some(
              (p) =>
                p.width &&
                p.height &&
                b.left < p.right &&
                b.right > p.left &&
                b.top < p.bottom &&
                b.bottom > p.top,
            );
          })
          .map((el) => el.getAttribute('data-component-id'));
      }),
    )
    .toEqual([]);
  const view = await page.locator('[data-canvas-world]').getAttribute('transform');
  const fit = page.getByRole('button', { name: 'Zoom to fit all (F)', exact: true });
  if (await fit.isVisible()) {
    await fit.click();
    await expect(page.locator('[data-canvas-world]')).toHaveAttribute('transform', view!);
  }
});

test('SVG and PNG downloads retain device artwork and canvas theme', async ({ page }, info) => {
  await loadCanvas(page);
  await page.keyboard.press('Control+e');
  const modal = page.getByRole('dialog');
  await activateControl(page, modal.getByRole('button', { name: 'Export', exact: true }));
  for (const format of ['SVG', 'PNG']) {
    await activateControl(page, modal.getByRole('button', { name: new RegExp(`^${format}`) }));
    const downloading = page.waitForEvent('download');
    await activateControl(page, modal.getByRole('button', { name: /Download/ }));
    const download = await downloading;
    const path = info.outputPath(`canvas-export.${format.toLowerCase()}`);
    await download.saveAs(path);
    const data = await readFile(path);
    if (format === 'SVG') {
      expect(data.toString()).toContain('--canvas-text:');
      expect(data.toString().match(/data-device-art=/g)).toHaveLength(6);
      expect(data.toString()).toContain('data:image/svg+xml');
    } else {
      expect(data.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(data.readUInt32BE(16)).toBe(2400);
      expect(data.readUInt32BE(20)).toBe(1440);
    }
  }
});

test('dark theme and reduced motion apply to the device canvas', async ({ page }, info) => {
  await loadCanvas(page);
  const svg = page.locator('[data-circuit-canvas]');
  const light = await svg.evaluate((el) => getComputedStyle(el).getPropertyValue('--canvas-text'));
  await activateControl(page, page.getByRole('button', { name: 'Settings', exact: true }));
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  await activateControl(page, settings.getByRole('button', { name: 'Display', exact: true }));
  await activateControl(page, settings.getByRole('button', { name: /Dark Full dark mode/ }));
  await page.keyboard.press('Escape');
  await expect(settings).not.toBeVisible();
  await expect
    .poll(() => svg.evaluate((el) => getComputedStyle(el).getPropertyValue('--canvas-text')))
    .not.toBe(light);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('[data-device-art]')).toHaveCount(6);
  expect(
    await svg.evaluate(
      (el) => el.getAnimations({ subtree: true }).filter((a) => a.playState === 'running').length,
    ),
  ).toBe(0);
  await page.screenshot({ path: info.outputPath('canvas-dark.png') });
});

test('grid paint stays aligned through zoom, pan and cancellation', async ({ page }, info) => {
  await loadCanvas(page);
  const canvas = page.locator('[data-circuit-canvas]');
  const comparePaint = async () => {
    const result = await canvas.evaluate(async (node) => {
      const actual = node.cloneNode(true) as SVGSVGElement;
      actual.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      actual.setAttribute('width', '600');
      actual.setAttribute('height', '360');
      const expected = actual.cloneNode(true) as SVGSVGElement;
      const grid = expected.querySelector('[data-canvas-grid]')!;
      const world = expected.querySelector('[data-canvas-world]')!;
      // Independent reference: the original world-space grid covers nine viewports.
      // Match its visible paint without retaining its oversized raster bounds.
      const [, , width, height] = expected.getAttribute('viewBox')!.split(/\s+/).map(Number);
      grid.setAttribute('x', String(-width! * 4));
      grid.setAttribute('y', String(-height! * 4));
      grid.setAttribute('width', String(width! * 9));
      grid.setAttribute('height', String(height! * 9));
      world.prepend(grid);
      expected.querySelector('[data-canvas-grid-pattern]')!.removeAttribute('patternTransform');
      const paint = async (svg: SVGSVGElement) => {
        const image = new Image();
        const url = URL.createObjectURL(
          new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }),
        );
        try {
          image.src = url;
          await image.decode();
          const buffer = document.createElement('canvas');
          buffer.width = 600;
          buffer.height = 360;
          const context = buffer.getContext('2d')!;
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, 600, 360).data;
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      const a = await paint(actual);
      const b = await paint(expected);
      let differentPixels = 0;
      for (let i = 0; i < a.length; i += 4)
        if ([0, 1, 2, 3].some((channel) => Math.abs(a[i + channel]! - b[i + channel]!) > 4))
          differentPixels++;
      return { differentPixels, pixels: a.length / 4 };
    });
    await info.attach('grid-paint-comparison.json', {
      body: Buffer.from(JSON.stringify(result)),
      contentType: 'application/json',
    });
    expect(result.differentPixels / result.pixels).toBeLessThan(0.01);
  };
  await comparePaint();
  await canvas.evaluate(async (node) => {
    const box = node.getBoundingClientRect();
    node.dispatchEvent(
      new WheelEvent('wheel', {
        bubbles: true,
        cancelable: true,
        deltaY: -100,
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
      }),
    );
    await new Promise(requestAnimationFrame);
  });
  await expect(canvas).not.toHaveAttribute('data-canvas-gesture');
  await comparePaint();
  for (const finish of ['pointerup', 'pointercancel']) {
    await canvas.evaluate(async (node, finish) => {
      const box = node.getBoundingClientRect();
      const props = {
        bubbles: true,
        button: 1,
        buttons: 4,
        pointerId: 91,
        pointerType: 'mouse',
        clientX: box.x + box.width / 2,
        clientY: box.y + box.height / 2,
      };
      node.dispatchEvent(new PointerEvent('pointerdown', props));
      window.dispatchEvent(
        new PointerEvent('pointermove', {
          ...props,
          clientX: props.clientX + 85,
          clientY: props.clientY + 30,
        }),
      );
      await new Promise(requestAnimationFrame);
      window.dispatchEvent(new PointerEvent(finish, props));
      await new Promise(requestAnimationFrame);
    }, finish);
    await expect(canvas).not.toHaveAttribute('data-canvas-gesture');
    await comparePaint();
  }
});
