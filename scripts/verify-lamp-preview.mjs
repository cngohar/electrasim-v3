import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from '@playwright/test';

const assets = new URL('../docs/design/lamp-driver/', import.meta.url);
const captures = new URL('../.wrangler/phase112-profile-preview/', import.meta.url);
await mkdir(captures, { recursive: true });
const contentTypes = {
  'index.html': 'text/html; charset=utf-8',
  'preview.css': 'text/css; charset=utf-8',
  'preview.mjs': 'text/javascript; charset=utf-8',
  'reference.mjs': 'text/javascript; charset=utf-8',
};
const server = createServer(async (request, response) => {
  const name = new URL(request.url, 'http://127.0.0.1').pathname.slice(1) || 'index.html';
  if (!Object.hasOwn(contentTypes, name)) {
    response.writeHead(404).end();
    return;
  }
  try {
    const data = await readFile(new URL(name, assets));
    response.writeHead(200, { 'Content-Type': contentTypes[name] });
    response.end(data);
  } catch {
    response.writeHead(500).end();
  }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const url = `http://127.0.0.1:${server.address().port}/`;
let cases = 0;
try {
  for (const { name, browserType, viewport, touch } of [
    {
      name: 'desktop',
      browserType: chromium,
      viewport: { width: 1280, height: 1000 },
      touch: false,
    },
    { name: 'phone', browserType: chromium, viewport: { width: 390, height: 844 }, touch: true },
    { name: 'tablet', browserType: webkit, viewport: { width: 820, height: 1180 }, touch: true },
  ]) {
    const browser = await browserType.launch();
    try {
      const page = await browser.newPage({ viewport, hasTouch: touch });
      const errors = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto(url);
      await page.waitForFunction(() =>
        document.querySelector('#current').textContent.includes('0.039131'),
      );
      const capture = async (state) => {
        await page.screenshot({
          path: fileURLToPath(new URL(`${name}-${state}.png`, captures)),
          fullPage: true,
        });
      };
      assert.equal(await page.locator('#power').textContent(), '9.000 W');
      assert.equal(await page.locator('#terminal-volts').textContent(), '229.995 V');
      await capture('230v');
      await page.getByRole('button', { name: '12 V', exact: true }).click();
      assert.equal(await page.locator('#state').textContent(), 'Off · below operating voltage');
      assert.equal(await page.locator('#current').textContent(), '0.000000 A');
      assert.equal(await page.locator('#terminal-volts').textContent(), '12.000 V');
      await capture('12v');
      await page.getByRole('button', { name: '280 V', exact: true }).click();
      assert.equal(await page.locator('#state').textContent(), 'Off · above operating voltage');
      await page.getByRole('button', { name: '230 V', exact: true }).click();
      for (const [type, watts] of [
        ['bulb', 9],
        ['bulb-cfl', 15],
        ['bulb-smart-rgb', 10],
        ['led-downlight', 12],
        ['tube-light', 36],
      ]) {
        await page.getByLabel('Lamp', { exact: true }).selectOption(type);
        assert.equal(await page.locator('#state').textContent(), 'On');
        assert.equal(await page.locator('#power').textContent(), `${watts.toFixed(3)} W`);
      }
      await page.getByLabel('Lamp', { exact: true }).selectOption('bulb');
      await page.getByLabel('Nominal voltage (V)').fill('12');
      assert.equal(await page.locator('#minimum-volts').inputValue(), '10.8');
      assert.equal(await page.locator('#maximum-volts').inputValue(), '13.2');
      await page.getByLabel('Nominal voltage (V)').fill('230');
      await page.getByLabel('Return connected').uncheck();
      assert.equal(await page.locator('#terminal-volts').textContent(), 'Unavailable');
      assert.equal(await page.locator('#power').textContent(), '0.000 W');
      await page.getByLabel('Return connected').check();
      await page.getByLabel('Reference circuit loop resistance (Ω)').fill('2000');
      assert.equal(await page.locator('#state').textContent(), 'Operating point unavailable');
      assert.equal(await page.locator('#current').textContent(), 'Unavailable');
      await capture('unavailable');
      await page.getByLabel('Reference circuit loop resistance (Ω)').fill('0.14');
      await page.getByLabel('Minimum operating (V)').fill('240');
      assert.equal(await page.locator('#state').textContent(), 'Check profile values');
      await page.getByLabel('Minimum operating (V)').fill('207');
      await page.getByLabel('Nominal voltage (V)').fill('260');
      assert.equal(await page.locator('#minimum-volts').inputValue(), '207');
      assert.equal(await page.locator('#maximum-volts').inputValue(), '253');
      assert.equal(await page.locator('#state').textContent(), 'Check profile values');
      await page.getByLabel('Nominal voltage (V)').fill('230');
      await page.getByRole('button', { name: 'Review profile values' }).click();
      assert.equal(await page.locator('#profile-detail').getAttribute('open'), '');
      const profile = JSON.parse(await page.locator('#profile-json').textContent());
      assert.equal(profile.inputPowerWatts, 9);
      assert.equal(profile.provenance.kind, 'teaching-assumption');
      assert.equal(profile.dimming, 'unassessed');
      assert.equal(profile.operatingRangeOrigin, 'instance');
      assert.deepEqual(profile.provenance.overrides, ['nominalVoltage', 'operatingVoltageRange']);
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        true,
      );
      assert.deepEqual(errors, []);
      cases++;
      console.log(
        `${name}: native presets, five lamp powers, open return, unavailable, invalid settings and contract review passed`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
}
console.log(
  `${cases} standalone preview workflows passed; no production solver/browser acceptance implied`,
);
