/**
 * cable-size.spec.ts — the Cable Size Calculator in a real browser (§35).
 *
 * Runs in the **default** e2e suite (`npm run e2e`). The tool is an Astro page,
 * so it is served by the built-site preview server (port 8788) that the default
 * config starts alongside the Vite dev server — the Vite shell serves the React
 * app only and cannot serve /tools/*.
 *
 *   npm run build      # populates dist/, which the preview server serves
 *   npm run e2e
 *
 * It walks the two journeys the design is built around:
 *   1. change the load → the demand, the cable, the drop and the verdict all move;
 *   2. inspect another size → the scene redraws, the recommendation does not.
 */

import { expect, test } from '@playwright/test';

const ROUTE = '/tools/cable-size-calculator/';

/**
 * The Astro pages live on the built-site preview server, not on the Vite dev
 * server that is the default config's baseURL. Point this suite at them; when
 * the site has not been built yet the suite skips instead of failing the run.
 */
test.use({
  baseURL:
    process.env.PLAYWRIGHT_ASTRO_BASE_URL ??
    process.env.PLAYWRIGHT_BASE_URL ??
    'http://127.0.0.1:8788',
  // Everything below describes the desktop layout: on a narrow viewport the
  // inputs move into a bottom sheet (§26), which has its own test at the end.
  viewport: { width: 1440, height: 900 },
});

async function recommendedSize(page: import('@playwright/test').Page): Promise<string> {
  return ((await page.locator('#cs2-recommended-size').textContent()) ?? '').trim();
}

async function cableWidth(page: import('@playwright/test').Page): Promise<number> {
  return page
    .locator('#cs2-scene-root')
    .evaluate((el) => Number.parseFloat(getComputedStyle(el).getPropertyValue('--cable-w')));
}

function loadChip(page: import('@playwright/test').Page, id: string) {
  return page.locator(`.cs2-load-chip:has(input[value="${id}"])`);
}

test.describe('Cable Size Calculator — the run is the calculator', () => {
  // Nothing here can pass without the built Astro pages: skip loudly rather than
  // fill a fresh checkout's e2e run with connection errors.
  test.beforeAll(async ({ request, baseURL }) => {
    const ok = await request
      .get(`${baseURL}${ROUTE}`, { timeout: 5000 })
      .then((r) => r.ok())
      .catch(() => false);
    test.skip(!ok, `no built site at ${baseURL} — run \`npm run build\` first`);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('#cs2-scene-root')).toBeVisible();
  });

  test('opens on a live scenario: source, cable, load and a recommendation', async ({ page }) => {
    await expect(page).toHaveTitle(/Cable Size Calculator/i);
    await expect(page.locator('#cs2-recommended-size')).toHaveText('1.5 mm²');
    await expect(page.locator('#cs2-recommended-material')).toHaveText('Copper');
    await expect(page.locator('#cs2-recommended-badge')).toContainText('RECOMMENDED');

    // the scene carries the same numbers, not a second opinion
    await expect(page.locator('#cs2-source-volts')).toHaveText('230 V');
    await expect(page.locator('#cs2-cable-label')).toHaveText('1.5 mm² Copper');
    await expect(page.locator('#cs2-cable-sub')).toHaveText('25 m one-way');
    await expect(page.locator('#cs2-load-power')).toHaveText('100 W');
    await expect(page.locator('#cs2-out-drop-pct')).toHaveText('0.13%');
    await expect(page.locator('#cs2-out-load-v')).toHaveText('229.7 V');
    await expect(page.locator('#cs2-status-label')).toHaveText('PASS');
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-load', 'lighting');
  });

  test('the primary journey: choose a load, set the run, inspect the sizes (§35)', async ({
    page,
  }) => {
    // 1. choose the load
    await loadChip(page, 'heater').click();
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-load', 'heater');
    await expect(page.locator('#cs2-load-power')).toHaveText('3 kW');
    await expect(page.locator('#cs2-out-current')).toHaveText('13.0 A');
    await expect(page.locator('#cs2-recommended-size')).toHaveText('2.5 mm²');

    // 2. set the source and the run
    await page.locator('#cs2-voltage').fill('230');
    await page.locator('#cs2-length').fill('25');
    await expect(page.locator('#cs2-cable-sub')).toHaveText('25 m one-way');

    // 3. inspect 1.5 mm² — the cable thins and the verdict worsens
    const recommendedWidth = await cableWidth(page);
    await page.locator('.cs2-candidate[data-size="1.5"]').click();
    await expect(page.locator('#cs2-selected-size')).toHaveText('1.5 mm²');
    await expect(page.locator('#cs2-out-drop-v')).toHaveText('8.9 V');
    await expect(page.locator('#cs2-out-drop-pct')).toHaveText('3.89%');
    await expect(page.locator('#cs2-check-drop')).toHaveText('FAIL');
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-status', 'fail');
    expect(await cableWidth(page)).toBeLessThan(recommendedWidth);

    // 4. inspect 6 mm² — the cable thickens and the drop falls
    await page.locator('.cs2-candidate[data-size="6"]').click();
    await expect(page.locator('#cs2-selected-size')).toHaveText('6 mm²');
    await expect(page.locator('#cs2-out-drop-pct')).toHaveText('0.97%');
    await expect(page.locator('#cs2-check-drop')).toHaveText('PASS');
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-status', 'pass');
    expect(await cableWidth(page)).toBeGreaterThan(recommendedWidth);

    // 5. the recommendation never moved
    await expect(page.locator('#cs2-recommended-size')).toHaveText('2.5 mm²');
  });

  test('every load type draws its own scene (§35)', async ({ page }) => {
    for (const [id, power] of [
      ['lighting', '100 W'],
      ['fan', '80 W'],
      ['motor', '2.2 kW'],
      ['heater', '3 kW'],
      ['appliance', '500 W'],
    ] as const) {
      await loadChip(page, id).click();
      await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-load', id);
      await expect(page.locator('#cs2-load-power')).toHaveText(power);
    }

    // custom takes the visitor's own numbers
    await loadChip(page, 'custom').click();
    await expect(page.locator('#cs2-custom-fields')).toBeVisible();
    await page.locator('#cs2-power').fill('7200');
    await expect(page.locator('#cs2-out-current')).toHaveText('31.3 A');
    await expect(page.locator('#cs2-recommended-size')).toHaveText('6 mm²');
  });

  test('the scene is repainted, not rebuilt (§36)', async ({ page }) => {
    // tag the live nodes; a scene that re-renders would lose the tag
    await page.evaluate(() => {
      (
        document.getElementById('cs2-scene-svg') as unknown as { dataset: DOMStringMap }
      ).dataset.tag = 'original';
    });
    await loadChip(page, 'heater').click();
    await page.locator('.cs2-candidate[data-size="10"]').click();
    await page.locator('#cs2-length').fill('80');

    await expect(page.locator('#cs2-scene-svg')).toHaveAttribute('data-tag', 'original');
    await expect(page.locator('#cs2-out-drop-pct')).toHaveText('1.87%');
  });

  test('longer runs and aluminium need more copper (§25)', async ({ page }) => {
    await loadChip(page, 'heater').click();
    expect(await recommendedSize(page)).toBe('2.5 mm²');

    await page.locator('#cs2-length').fill('60');
    expect(await recommendedSize(page)).toBe('6 mm²');

    await page.locator('#cs2-length').fill('120');
    expect(await recommendedSize(page)).toBe('10 mm²');

    // same run, same load, different metal
    await page.locator('#cs2-length').fill('25');
    await page.locator('.ts-seg-btn:has(input[value="aluminium"])').click();
    expect(await recommendedSize(page)).toBe('4 mm²');
    await expect(page.locator('#cs2-recommended-material')).toHaveText('Aluminium');
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-material', 'aluminium');
  });

  test('the voltage-drop limit is a design choice, and says so', async ({ page }) => {
    await loadChip(page, 'heater').click();
    await page.locator('.ts-seg-btn:has(input[value="5"])').click();
    expect(await recommendedSize(page)).toBe('1.5 mm²');
    await expect(page.locator('#cs2-check-drop')).toHaveText('PASS');

    await page.locator('.ts-seg-btn:has(input[value="custom"])').click();
    await expect(page.locator('#cs2-limit-custom-field')).toBeVisible();
    await page.locator('#cs2-limit-custom').fill('1.5');
    expect(await recommendedSize(page)).toBe('4 mm²');

    // and the page never claims to certify anything
    await expect(page.locator('#cs2-inputs-body')).toContainText('design choice');
  });

  test('the drop-budget meter fills as the run eats the limit (§20)', async ({ page }) => {
    const budget = () =>
      page
        .locator('#cs2-scene-root')
        .evaluate((el) => Number.parseFloat(getComputedStyle(el).getPropertyValue('--budget')));

    // lighting on 1.5 mm² barely touches a 3% budget
    const easy = await budget();
    expect(easy).toBeGreaterThanOrEqual(0);
    expect(easy).toBeLessThan(0.2);

    // a 3 kW heater forced onto 1.5 mm² spends all of it and then some
    await loadChip(page, 'heater').click();
    await page.locator('.cs2-candidate[data-size="1.5"]').click();
    const spent = await budget();
    expect(spent).toBeGreaterThan(easy);
    expect(spent).toBeLessThanOrEqual(1);
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-status', 'fail');
  });

  test('AC and DC are different rules, and the form says which one is live', async ({ page }) => {
    // a motor notices the difference: AC carries reactive current, DC does not
    await loadChip(page, 'motor').click();
    const acCurrent = await page.locator('#cs2-out-current').textContent();
    await expect(page.locator('#cs2-system-note')).toContainText('cos');
    await expect(page.locator('#cs2-pf')).toBeEnabled();

    await page.locator('.ts-seg-btn:has(input[value="dc"])').click();
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-system', 'dc');
    await expect(page.locator('#cs2-source-system')).toHaveText('DC supply');
    expect(await page.locator('#cs2-out-current').textContent()).not.toBe(acCurrent);
    // power factor has no meaning on a DC run: the field is taken out of play
    await expect(page.locator('#cs2-pf')).toBeDisabled();
    await expect(page.locator('#cs2-system-note')).toContainText('no power factor');
    await expect(page.locator('#cs2-load-summary')).toContainText('PF —');
    // a DC run is a different supply, not the same supply with one field greyed
    await expect(page.locator('#cs2-voltage')).toHaveValue('48');
    await expect(page.locator('#cs2-source-plate')).toHaveText('48 V');
    // and the load is described in DC terms: a battery bank has no 1-phase motor
    await expect(page.locator('#cs2-load-note')).not.toContainText('single-phase');

    await page.locator('.ts-seg-btn:has(input[value="ac"])').click();
    await expect(page.locator('#cs2-pf')).toBeEnabled();
    await expect(page.locator('#cs2-voltage')).toHaveValue('230');
    await expect(page.locator('#cs2-source-plate')).toHaveText('230 V');
  });

  test('each system carries its own voltage ladder (§30)', async ({ page }) => {
    // AC lives at mains voltage
    await expect(page.locator('#cs2-volt-presets .cs2-volt-chip')).toHaveText([
      '120 V',
      '230 V',
      '400 V',
    ]);
    await expect(page.locator('.cs2-volt-chip[data-volts="230"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // DC lives at battery voltage, and the ladder swaps with the system
    await page.locator('.ts-seg-btn:has(input[value="dc"])').click();
    await expect(page.locator('#cs2-volt-presets .cs2-volt-chip')).toHaveText([
      '12 V',
      '24 V',
      '48 V',
      '220 V',
    ]);
    await expect(page.locator('.cs2-volt-chip[data-volts="48"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // a chip is a shortcut into the same free-form field
    await page.locator('.cs2-volt-chip[data-volts="12"]').click();
    await expect(page.locator('#cs2-voltage')).toHaveValue('12');
    await expect(page.locator('.cs2-volt-chip[data-volts="12"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.cs2-volt-chip[data-volts="48"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    // 100 W at 12 V is 8.3 A, not 0.4 A: the same lamp over the same 25 m now
    // needs 25 mm² where a 230 V run needed 1.5 mm². That contrast is the whole
    // lesson of the toggle, so it is asserted rather than assumed.
    await expect(page.locator('#cs2-out-current')).toContainText('8.3 A');
    await expect(page.locator('#cs2-recommended-size')).toHaveText('25 mm²');
    await page.locator('.cs2-volt-chip[data-volts="220"]').click();
    await expect(page.locator('#cs2-recommended-size')).toHaveText('1.5 mm²');

    // back to AC, and the ladder comes back with it
    await page.locator('.ts-seg-btn:has(input[value="ac"])').click();
    await expect(page.locator('#cs2-volt-presets .cs2-volt-chip')).toHaveText([
      '120 V',
      '230 V',
      '400 V',
    ]);
    await expect(page.locator('#cs2-voltage')).toHaveValue('230');
  });

  test('a voltage the reader typed outranks the nominal we suggest (§30)', async ({ page }) => {
    // a solar string is not on either ladder, and the toggle must not eat it
    await page.fill('#cs2-voltage', '600');
    await page.locator('.ts-seg-btn:has(input[value="dc"])').click();
    await expect(page.locator('#cs2-voltage')).toHaveValue('600');
    await page.locator('.ts-seg-btn:has(input[value="ac"])').click();
    await expect(page.locator('#cs2-voltage')).toHaveValue('600');

    // reset hands the decision back to the tool
    await page.locator('#cs2-reset').click();
    await expect(page.locator('#cs2-voltage')).toHaveValue('230');
    await page.locator('.ts-seg-btn:has(input[value="dc"])').click();
    await expect(page.locator('#cs2-voltage')).toHaveValue('48');
  });

  test('the conductor temperature is an input, and the drop follows it (§30)', async ({ page }) => {
    // 70 °C is the default because that is the temperature BS 7671's own
    // voltage-drop figures are tabulated at — a loaded cable is not a cold one
    await expect(page.locator('#cs2-temp')).toHaveValue('70');
    await expect(page.locator('.cs2-temp-chip[data-celsius="70"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    const hot = await page.locator('#cs2-out-drop-pct').textContent();

    // a cold run drops about a fifth less: ρ ∝ 1 + 0.00393 × (T − 20)
    await page.locator('.cs2-temp-chip[data-celsius="20"]').click();
    await expect(page.locator('#cs2-temp')).toHaveValue('20');
    const cold = await page.locator('#cs2-out-drop-pct').textContent();
    const ratio = Number.parseFloat(hot ?? '0') / Number.parseFloat(cold ?? '1');
    expect(ratio).toBeGreaterThan(1.15);
    expect(ratio).toBeLessThan(1.25);

    // and a hotter one drops more than either
    await page.locator('.cs2-temp-chip[data-celsius="90"]').click();
    await expect(page.locator('#cs2-temp')).toHaveValue('90');
    expect(
      Number.parseFloat((await page.locator('#cs2-out-drop-pct').textContent()) ?? '0'),
    ).toBeGreaterThan(Number.parseFloat(hot ?? '0'));

    // reset hands the temperature back to the design basis
    await page.locator('#cs2-reset').click();
    await expect(page.locator('#cs2-temp')).toHaveValue('70');
  });

  test('the scope line names the current it is warning about', async ({ page }) => {
    // the tool sizes on drop alone, so it must say so where it cannot be missed
    await expect(page.locator('#cs2-scope')).toContainText('Voltage drop only');
    await expect(page.locator('#cs2-scope-current')).toHaveText('0.4 A');

    // a heavy load on a short run passes the drop test on a conductor far too
    // small to carry it — the warning names the current it is talking about
    await loadChip(page, 'custom').click();
    await page.locator('#cs2-power').fill('10000');
    await page.locator('#cs2-length').fill('1');
    await expect(page.locator('#cs2-out-current')).toHaveText('43.5 A');
    await expect(page.locator('#cs2-scope-current')).toHaveText('43.5 A');
    await expect(page.locator('#cs2-scope')).toContainText('current-carrying capacity');
    await expect(page.locator('#cs2-scope')).toContainText('BS 7671 Appendix 4');
  });

  test('a rejected input keeps the last good run, and says it is stale', async ({ page }) => {
    const good = await page.locator('#cs2-out-drop-pct').textContent();
    await expect(page.locator('#cs2-results-container')).not.toHaveAttribute('data-stale', 'true');
    await expect(page.locator('#cs2-stale-note')).toBeHidden();

    await page.locator('#cs2-voltage').fill('99999');
    await expect(page.locator('#cs2-error-voltage')).toContainText('between 10 V and 1000 V');
    // the numbers on screen are the last run the tool could actually evaluate
    await expect(page.locator('#cs2-out-drop-pct')).toHaveText(good ?? '');
    await expect(page.locator('#cs2-results-container')).toHaveAttribute('data-stale', 'true');
    await expect(page.locator('#cs2-stale-note')).toBeVisible();

    // fix it and the staleness goes with it
    await page.locator('#cs2-voltage').fill('230');
    await expect(page.locator('#cs2-results-container')).not.toHaveAttribute('data-stale', 'true');
    await expect(page.locator('#cs2-stale-note')).toBeHidden();
  });

  test('the length slider never claims a run is shorter than it is', async ({ page }) => {
    await expect(page.locator('#cs2-length-range')).toHaveAttribute('max', '200');
    await expect(page.locator('#cs2-length-hint')).toBeHidden();

    // a run past the slider's reach widens the track rather than parking at 200
    await page.locator('#cs2-length').fill('500');
    await expect(page.locator('#cs2-length-range')).toHaveAttribute('max', '1000');
    await expect(page.locator('#cs2-length-range')).toHaveValue('500');
    await expect(page.locator('#cs2-length-hint')).toBeVisible();

    // and dragging it still drives the same value the field shows
    await page.locator('#cs2-length-range').fill('300');
    await expect(page.locator('#cs2-length')).toHaveValue('300');

    await page.locator('#cs2-length').fill('25');
    await expect(page.locator('#cs2-length-range')).toHaveAttribute('max', '200');
    await expect(page.locator('#cs2-length-range')).toHaveValue('25');
    await expect(page.locator('#cs2-length-hint')).toBeHidden();
  });

  test('the form no longer promises physics it does not run', async ({ page }) => {
    // reactance is deliberately left out; the note used to claim otherwise
    await expect(page.locator('#cs2-system-note')).not.toContainText('reactance counts');
    await expect(page.locator('#cs2-system-note')).toContainText('resistance alone');
  });

  test('choosing a load writes its numbers into the form (§23)', async ({ page }) => {
    await loadChip(page, 'heater').click();
    await expect(page.locator('#cs2-power')).toHaveValue('3000');
    await expect(page.locator('#cs2-pf')).toHaveValue('1');
    await expect(page.locator('#cs2-load-summary')).toContainText('3 kW');
    await expect(page.locator('#cs2-load-summary')).toContainText('13.0 A');

    // Custom continues from the load you were looking at, not from 500 W
    await loadChip(page, 'custom').click();
    await expect(page.locator('#cs2-custom-fields')).toBeVisible();
    await expect(page.locator('#cs2-power')).toHaveValue('3000');
    await expect(page.locator('#cs2-load-power')).toHaveText('3 kW');

    await page.locator('#cs2-power').fill('1200');
    await expect(page.locator('#cs2-load-power')).toHaveText('1.2 kW');
  });

  test('the size picker in the form and the strip are one control (§12, §20)', async ({ page }) => {
    await loadChip(page, 'heater').click();
    const select = page.locator('#cs2-size');
    await expect(select).toHaveValue('2.5');

    // the strip moves the picker
    await page.locator('.cs2-candidate[data-size="10"]').click();
    await expect(select).toHaveValue('10');
    await expect(page.locator('#cs2-selected-size')).toHaveText('10 mm²');

    // and the picker moves the strip without touching the recommendation
    await select.selectOption('1.5');
    await expect(page.locator('#cs2-selected-size')).toHaveText('1.5 mm²');
    await expect(page.locator('.cs2-candidate[data-size="1.5"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('.cs2-candidate[data-size="1.5"] [data-role="flag"]')).toHaveText(
      'INSPECTING',
    );
    await expect(page.locator('#cs2-recommended-size')).toHaveText('2.5 mm²');
  });

  test('a bad value is reported on the field that caused it', async ({ page }) => {
    const length = page.locator('#cs2-length');
    const recommended = await page.locator('#cs2-recommended-size').textContent();

    await length.fill('');
    await expect(page.locator('#cs2-error-length')).toBeVisible();
    await expect(page.locator('#cs2-error-length')).toHaveText('Cable length is required.');
    await expect(length).toHaveAttribute('aria-invalid', 'true');
    await expect(length).toHaveAttribute('aria-describedby', 'cs2-error-length');
    await expect(page.locator('#cs2-validation')).toBeVisible();
    // the tool freezes the last good answer instead of blanking itself
    await expect(page.locator('#cs2-recommended-size')).toHaveText(recommended ?? '');

    await length.fill('9999');
    await expect(page.locator('#cs2-error-length')).toContainText('between 0.5 m and 1000 m');

    await length.fill('40');
    await expect(page.locator('#cs2-error-length')).toBeHidden();
    await expect(page.locator('#cs2-validation')).toBeHidden();
    await expect(length).not.toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#cs2-cable-sub')).toHaveText('40 m one-way');
  });

  test('the form shows which control is live, and moves it when you pick another', async ({
    page,
  }) => {
    const paint = (selector: string) =>
      page.locator(selector).evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          active: el.classList.contains('active'),
          checked: !!el.querySelector('input')?.checked,
          background: style.backgroundColor,
          border: style.borderTopColor,
        };
      });

    // the AC/DC pair: the highlight has to follow the click, not the first paint
    const before = {
      ac: await paint('.ts-seg-btn:has(input[value="ac"])'),
      dc: await paint('.ts-seg-btn:has(input[value="dc"])'),
    };
    expect(before.ac.active).toBe(true);
    expect(before.dc.active).toBe(false);

    await page.locator('.ts-seg-btn:has(input[value="dc"])').click();
    // the selected look is a 150ms transition: read it once it has landed
    await page.waitForTimeout(300);
    const after = {
      ac: await paint('.ts-seg-btn:has(input[value="ac"])'),
      dc: await paint('.ts-seg-btn:has(input[value="dc"])'),
    };
    expect(after.dc.checked).toBe(true);
    expect(after.dc.active).toBe(true);
    expect(after.ac.active).toBe(false);
    expect(after.ac.checked).toBe(false);
    await page.locator('.ts-seg-btn:has(input[value="ac"])').click();

    // material and the drop limit behave the same way
    await page.locator('.ts-seg-btn:has(input[value="aluminium"])').click();
    await page.waitForTimeout(300);
    expect((await paint('.ts-seg-btn:has(input[value="aluminium"])')).active).toBe(true);
    expect((await paint('.ts-seg-btn:has(input[value="copper"])')).active).toBe(false);
    await page.locator('.ts-seg-btn:has(input[value="copper"])').click();

    await page.locator('.ts-seg-btn:has(input[value="5"])').click();
    await page.waitForTimeout(300);
    expect((await paint('.ts-seg-btn:has(input[value="5"])')).active).toBe(true);
    expect((await paint('.ts-seg-btn:has(input[value="3"])')).active).toBe(false);
    await page.locator('.ts-seg-btn:has(input[value="3"])').click();

    // the load cards too, with the pointer moved away so hover cannot fake it
    await page.mouse.move(0, 0);
    await loadChip(page, 'motor').click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(300);
    const motorSelector = '.cs2-load-chip:has(input[value="motor"])';
    const motor = await paint(motorSelector);
    const lighting = await paint('.cs2-load-chip:has(input[value="lighting"])');
    expect(motor.checked).toBe(true);
    expect(motor.active).toBe(true);
    expect(lighting.active).toBe(false);
    // The selected border arrives on a 150 ms transition. Poll it rather than
    // trusting the sleep above: a slow style recalc under load reads both chips
    // still sitting on the idle border colour.
    await expect
      .poll(async () => (await paint(motorSelector)).border, {
        message: 'the selected load chip takes its own border colour',
      })
      .not.toBe(lighting.border);
  });

  test('a laptop window docks both panels beside a full-height scene (§26)', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.waitForTimeout(400);

    // the panels dock over the scene at this size; they no longer flow below it
    await expect(page.locator('#interactive-stage')).toHaveAttribute('data-layout', 'float');

    const geometry = await page.evaluate(() => {
      const box = (id: string) => {
        const b = document.getElementById(id)!.getBoundingClientRect();
        return {
          top: Math.round(b.top),
          bottom: Math.round(b.bottom),
          left: Math.round(b.left),
          right: Math.round(b.right),
          height: Math.round(b.height),
        };
      };
      return {
        inputs: box('cs2-inputs-container'),
        results: box('cs2-results-container'),
        frame: box('scene-frame'),
        viewportH: window.innerHeight,
        viewportW: window.innerWidth,
      };
    });

    // inputs left, results right — and both wholly inside the window. This is
    // the regression: the stacked layout put the results panel 384px below the
    // fold on a 700px-tall window, so reading the answer meant scrolling past
    // the run that explains it.
    expect(geometry.inputs.right).toBeLessThan(geometry.viewportW / 2);
    expect(geometry.results.left).toBeGreaterThan(geometry.viewportW / 2);
    expect(geometry.inputs.top).toBeGreaterThanOrEqual(0);
    expect(geometry.results.top).toBeGreaterThanOrEqual(0);
    expect(geometry.inputs.bottom).toBeLessThanOrEqual(geometry.viewportH + 1);
    expect(geometry.results.bottom).toBeLessThanOrEqual(geometry.viewportH + 1);

    // the scenery gets the window, not a banner at the top of it
    expect(geometry.frame.height).toBeGreaterThan(geometry.viewportH - 130);

    // every control is the topmost thing at its own centre
    const covered = await page.evaluate(async () => {
      const controls = [
        '.ts-seg-btn:has(input[value="dc"])',
        '#cs2-voltage',
        '.cs2-load-chip:has(input[value="heater"])',
        '#cs2-size',
        '.ts-seg-btn:has(input[value="aluminium"])',
        '#cs2-length',
        '.ts-seg-btn:has(input[value="5"])',
        '#cs2-reset',
        '#cs2-share',
      ];
      const bad: string[] = [];
      for (const selector of controls) {
        const el = document.querySelector(selector);
        if (!el) {
          bad.push(`${selector} missing`);
          continue;
        }
        el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
        // scrolling is animated in this document: let it land before measuring
        await new Promise((resolve) => setTimeout(resolve, 140));
        const r = el.getBoundingClientRect();
        const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        if (!top || !(el.contains(top) || top.contains(el))) {
          bad.push(
            `${selector} covered by ${top?.tagName.toLowerCase()}.${String(top?.className).split(' ')[0]}`,
          );
        }
      }
      return bad;
    });
    expect(covered).toEqual([]);

    // folding a dock hands its width back to the run
    const span = () =>
      page.evaluate(() => {
        const svg = document.getElementById('cs2-scene-svg') as unknown as SVGSVGElement;
        const m = svg.getScreenCTM()!;
        const a = svg.createSVGPoint();
        a.x = 288;
        a.y = 352;
        const b = svg.createSVGPoint();
        b.x = 962;
        b.y = 352;
        const p = a.matrixTransform(m);
        const q = b.matrixTransform(m);
        return Math.round(Math.hypot(q.x - p.x, q.y - p.y));
      });
    const docked = await span();
    const click = (id: string) =>
      page.evaluate((sel) => (document.getElementById(sel) as HTMLButtonElement).click(), id);

    await click('cs2-collapse-inputs');
    await expect(page.locator('#cs2-collapse-inputs')).toHaveAttribute('aria-expanded', 'false');
    /*
     * Folding and unfolding a dock is a CSS transition, and WebKit overruns a
     * fixed sleep for it once workers compete for the machine. Poll the widths
     * instead of waiting a fixed 420 ms and reading whatever has landed.
     */
    await expect
      .poll(
        () =>
          page
            .locator('#cs2-inputs-container')
            .evaluate((el) => Math.round(el.getBoundingClientRect().width)),
        { message: 'a folded dock is a rail, not a panel' },
      )
      .toBeLessThan(110);
    await expect
      .poll(span, { message: 'the run grows when a dock folds away' })
      .toBeGreaterThan(docked);

    await click('cs2-collapse-inputs');
    await expect(page.locator('#cs2-collapse-inputs')).toHaveAttribute('aria-expanded', 'true');
    await expect
      .poll(async () => Math.abs((await span()) - docked), {
        message: 'unfolding the dock hands the width back',
      })
      .toBeLessThan(8);
  });

  test('the run is staged outdoors, and the weather stops with the switch (§10, §28)', async ({
    page,
  }) => {
    // scenery is part of the picture, not decoration that can silently break
    await expect(page.locator('#cs2-scene-svg .cs2-cloud')).toHaveCount(3);
    await expect(page.locator('#cs2-scene-svg .cs2-bird')).toHaveCount(3);
    await expect(page.locator('#cs2-scene-svg .cs2-posts > g')).toHaveCount(2);
    // nothing authored above the band may show: the old headline ("The cable is
    // the variable", y=104) sat outside it, so a tall narrow frame painted the
    // words straight onto the sky
    const sceneText = (await page.locator('#cs2-scene-svg text').allTextContents())
      .join(' ')
      .toLowerCase();
    expect(sceneText).not.toContain('cable is the variable');
    expect(sceneText).not.toContain('electrical run');
    await expect(page.locator('#cs2-scene-svg .cs2-stripes path')).not.toHaveCount(0);

    const drift = async () => {
      const before = await page.locator('#cs2-scene-svg .cs2-cloud').first().boundingBox();
      await page.waitForTimeout(700);
      const after = await page.locator('#cs2-scene-svg .cs2-cloud').first().boundingBox();
      return Math.abs((after?.x ?? 0) - (before?.x ?? 0));
    };
    expect(await drift()).toBeGreaterThan(1);

    // the animate switch stills the weather with everything else
    await page.locator('#cs2-animate-toggle').click();
    for (const selector of ['.cs2-cloud', '.cs2-bird', '.cs2-tuft', '.cs2-vane', '.cs2-sun-aura']) {
      const state = await page
        .locator(`#cs2-scene-svg ${selector}`)
        .first()
        .evaluate((el) => getComputedStyle(el).animationPlayState);
      expect(state, `${selector} keeps moving while the scene is paused`).toBe('paused');
    }
    expect(await drift()).toBeLessThan(1);
    await page.locator('#cs2-animate-toggle').click();
    expect(await drift()).toBeGreaterThan(1);
  });

  test('“why this size?” explains the answer, and changes with it (§19)', async ({ page }) => {
    await loadChip(page, 'heater').click();
    await expect(page.locator('#cs2-why-heading')).toHaveText('Why 2.5 mm²?');
    await expect(page.locator('#cs2-why-body')).toContainText('smallest candidate');
    await expect(page.locator('#cs2-why-body')).toContainText('3.0% limit');

    await page.locator('#cs2-length').fill('60');
    await expect(page.locator('#cs2-why-heading')).toHaveText('Why 6 mm²?');
  });

  test('a cable too small is reported as teaching, not as a disaster (§22)', async ({ page }) => {
    await loadChip(page, 'heater').click();
    await page.locator('.cs2-candidate[data-size="1.5"]').click();
    const note = (await page.locator('#cs2-status-note').textContent()) ?? '';
    expect(note).toContain('High voltage drop');
    expect(note).not.toMatch(/fire|explod|burst|burn/i);
    await expect(page.locator('#cs2-check-selection')).toHaveText('Too small for this run');
  });

  test('the comparison strip scores every candidate (§20)', async ({ page }) => {
    await loadChip(page, 'heater').click();
    // start on 1.5 mm² so the recommended size is not the one being inspected
    await page.locator('.cs2-candidate[data-size="1.5"]').click();
    await expect(page.locator('.cs2-candidate[data-size="1.5"] [data-role="status"]')).toHaveText(
      'FAIL',
    );
    await expect(page.locator('.cs2-candidate[data-size="1.5"] [data-role="flag"]')).toHaveText(
      'INSPECTING',
    );
    await expect(page.locator('.cs2-candidate[data-size="2.5"] [data-role="flag"]')).toHaveText(
      'RECOMMENDED',
    );
    await expect(page.locator('.cs2-candidate[data-size="4"] [data-role="volts"]')).toHaveText(
      '3.4 V',
    );
    await expect(page.locator('.cs2-candidate[data-size="4"] [data-role="pct"]')).toHaveText(
      '1.46%',
    );
    await expect(page.locator('#cs2-strip-rec')).toHaveText('2.5 mm²');
  });

  test('a shared link replays the scenario', async ({ page }) => {
    await page.goto(`${ROUTE}?load=heater&length=40&limit=5`);
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-load', 'heater');
    await expect(page.locator('#cs2-cable-sub')).toHaveText('40 m one-way');
    expect(await recommendedSize(page)).toBe('2.5 mm²');

    // and the live state is written back into the URL
    await loadChip(page, 'motor').click();
    await expect(page).toHaveURL(/load=motor/);
  });

  test('reset returns to the documented defaults', async ({ page }) => {
    await loadChip(page, 'heater').click();
    await page.locator('#cs2-length').fill('90');
    await page.locator('.cs2-candidate[data-size="25"]').click();

    await page.locator('#cs2-reset').click();

    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-load', 'lighting');
    await expect(page.locator('#cs2-length')).toHaveValue('25');
    await expect(page.locator('#cs2-voltage')).toHaveValue('230');
    expect(await recommendedSize(page)).toBe('1.5 mm²');
  });
});

test.describe('Cable Size Calculator — access and motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(ROUTE);
  });

  test('every control is labelled and reachable by keyboard', async ({ page }) => {
    for (const id of ['#cs2-voltage', '#cs2-length', '#cs2-length-range']) {
      await expect(page.locator(`label[for="${id.slice(1)}"]`)).toHaveCount(1);
    }

    // the load selector is a radio group: arrows move between loads
    await page.locator('input[name="cs2-load"][value="lighting"]').focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-load', 'fan');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-load', 'motor');
  });

  test('results are announced, and status is never colour-only (§21, §27)', async ({ page }) => {
    await loadChip(page, 'heater').click();
    await page.locator('.cs2-candidate[data-size="1.5"]').click();
    await expect(page.locator('#cs2-live')).toContainText('FAIL');
    await expect(page.locator('#cs2-status-label')).toHaveText('FAIL');
    await expect(page.locator('.cs2-candidate[data-size="1.5"] [data-role="status"]')).toHaveText(
      'FAIL',
    );
  });

  test('reduced motion stills the scene (§28)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload();
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('#interactive-stage')).toHaveClass(/scene-paused/);
    // the walking markers are not drawn at all, not merely paused
    await expect(page.locator('#cs2-scene-root .cs2-flow-dot').first()).toBeHidden();
    // the drawing keeps its information
    await expect(page.locator('#cs2-recommended-size')).toHaveText('1.5 mm²');
  });

  test('the docks stay inside the stage, and nothing spills onto the prose (§26)', async ({
    page,
  }) => {
    // 1024px is where the stage used to stop floating and grow with its panels.
    // It floats now — the panels dock over a full-height scene and fold — so the
    // invariant is different: the docks and the strip must stay inside the stage
    // box and must not overlap each other.
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto(ROUTE);
    await expect(page.locator('#cs2-scene-root')).toBeVisible();

    type Box = { top: number; bottom: number; left: number; right: number };
    const boxes = await page.evaluate(() => {
      const r = (sel: string) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return {
          top: Math.round(b.top),
          bottom: Math.round(b.bottom),
          left: Math.round(b.left),
          right: Math.round(b.right),
        };
      };
      return {
        stage: r('#interactive-stage'),
        inputs: r('#cs2-inputs-container'),
        results: r('#cs2-results-container'),
        strip: r('#cs2-strip'),
      };
    });
    const { stage, inputs, results, strip } = boxes as Record<
      'stage' | 'inputs' | 'results' | 'strip',
      Box
    >;

    // every dock is wholly inside the stage box
    for (const [name, box] of Object.entries({ inputs, results, strip })) {
      expect(box.top, `${name} starts inside the stage`).toBeGreaterThanOrEqual(stage.top - 1);
      expect(box.bottom, `${name} ends inside the stage`).toBeLessThanOrEqual(stage.bottom + 1);
    }

    // the comparison strip lives in the band between the docks: when it was
    // centred with a min-width, it slid under the inputs panel and the panel's
    // own legend swallowed the click meant for the first candidate
    expect(strip.left, 'strip clears the inputs dock').toBeGreaterThanOrEqual(inputs.right - 1);
    expect(strip.right, 'strip clears the results dock').toBeLessThanOrEqual(results.left + 1);

    // nothing from the stage paints over the educational prose below it
    const covered = await page.evaluate(() => {
      document.querySelector('.tool-seo-section')?.scrollIntoView({ block: 'start' });
      const seo = document.querySelector('.tool-seo-section')?.getBoundingClientRect();
      if (!seo) return false;
      const el = document.elementFromPoint(window.innerWidth / 2, seo.top + 40);
      return Boolean(el?.closest('#interactive-stage'));
    });
    expect(covered).toBe(false);

    // and no field is trapped inside a panel that is shorter than its content
    const clipped = await page.evaluate(() => {
      const panel = document.querySelector('#cs2-inputs-container') as HTMLElement | null;
      return panel ? panel.scrollHeight - panel.clientHeight : Number.NaN;
    });
    expect(clipped).toBeLessThanOrEqual(2);

    // 1024px is under the narrow threshold: two open docks would leave the run
    // a 340px band, so both start folded and the scenery gets the window
    expect(inputs.right - inputs.left, 'inputs starts as a rail').toBeLessThan(110);
    expect(results.right - results.left, 'results starts as a rail').toBeLessThan(110);

    // unfolding one gives it the room, and the strip still clears both docks
    await page.evaluate(() =>
      (document.getElementById('cs2-collapse-inputs') as HTMLButtonElement).click(),
    );
    await page.waitForTimeout(420);
    const opened = await page.evaluate(() => {
      const r = (id: string) => {
        const b = document.getElementById(id)!.getBoundingClientRect();
        return { left: Math.round(b.left), right: Math.round(b.right) };
      };
      const body = document.getElementById('cs2-inputs-body') as HTMLElement;
      const fields = [...body.querySelectorAll('input,select,button')].filter((el) => {
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0 && getComputedStyle(el).visibility !== 'hidden';
      });
      return {
        inputs: r('cs2-inputs-container'),
        results: r('cs2-results-container'),
        strip: r('cs2-strip'),
        bodyHidden: body.hidden,
        fieldCount: fields.length,
      };
    });
    expect(opened.inputs.right - opened.inputs.left).toBeGreaterThan(300);
    /*
     * The regression this replaces: collapse had two owners — the engine
     * toggled `body.hidden`, scene-stage.js toggled `data-collapsed` — with
     * independent ideas of the state. A dock that *started* folded (every
     * window under 1100px) therefore opened to an empty panel: the CSS said
     * expanded while the body was still `hidden`. One click, one state.
     */
    expect(opened.bodyHidden, 'the body is not left hidden behind the rail').toBe(false);
    expect(opened.fieldCount, 'the unfolded dock shows its fields').toBeGreaterThan(5);

    // …and the fields inside it are reachable, not merely painted: the dock body
    // is a scroll column, so a field lower down has to be scrolled to first
    await page.evaluate(() =>
      document
        .getElementById('cs2-length')!
        .scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior }),
    );
    await page.waitForTimeout(160);
    const reachable = await page.evaluate(() => {
      const length = document.getElementById('cs2-length') as HTMLElement;
      const b = length.getBoundingClientRect();
      const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
      return hit === length || length.contains(hit);
    });
    expect(reachable, 'the cable length field is clickable').toBe(true);
    expect(opened.strip.left, 'strip clears the unfolded dock').toBeGreaterThanOrEqual(
      opened.inputs.right - 1,
    );
    expect(opened.strip.right, 'strip still clears the far dock').toBeLessThanOrEqual(
      opened.results.left + 1,
    );
  });

  test('the current markers walk the cable, and the animate switch stops them', async ({
    page,
  }) => {
    // SMIL <animateMotion> cannot read a CSS variable: the period is a literal
    // attribute. Read the marker positions twice to prove they really travel.
    const dotBoxes = () =>
      page.$$eval('#cs2-scene-root .cs2-flow-dot', (dots) =>
        dots.map((dot) => {
          const box = dot.getBoundingClientRect();
          return { x: Math.round(box.left), y: Math.round(box.top) };
        }),
      );
    const travelled = async () => {
      const before = await dotBoxes();
      await page.waitForTimeout(400);
      const after = await dotBoxes();
      return before.map((p, i) => {
        const q = after[i] ?? { x: 0, y: 0 };
        return Math.hypot(q.x - p.x, q.y - p.y);
      });
    };

    await expect(page.locator('#cs2-scene-root .cs2-flow-dot')).toHaveCount(3);
    const moving = await travelled();
    expect(Math.max(...moving)).toBeGreaterThan(8);

    const toggle = page.locator('#cs2-animate-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#cs2-scene-root')).toHaveAttribute('data-motion', 'off');

    // frozen mid-stride, not removed: the run still reads as a run
    const frozen = await travelled();
    expect(Math.max(...frozen)).toBeLessThan(2);
    await expect(page.locator('#cs2-scene-root .cs2-flow-dot').first()).toBeVisible();
    // and the scenery stops with it: beacons, shimmer, fog and all
    const playState = (selector: string) =>
      page
        .locator(selector)
        .first()
        .evaluate((el) => getComputedStyle(el).animationPlayState);
    for (const selector of ['.cs2-beacon', '.cs2-cable-shimmer', '.cs2-fog ellipse']) {
      expect(await playState(selector)).toBe('paused');
    }

    await toggle.click();
    expect(Math.max(...(await travelled()))).toBeGreaterThan(8);
  });

  test('no emoji-font glyphs are rendered by the tool', async ({ page }) => {
    const offenders = await page.evaluate(() => {
      const found: string[] = [];
      const scope = document.getElementById('interactive-stage') ?? document.body;
      const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
      let node = walker.nextNode();
      while (node) {
        const text = node.nodeValue ?? '';
        if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text)) found.push(text.trim());
        node = walker.nextNode();
      }
      return found;
    });
    expect(offenders).toEqual([]);
  });
});

test.describe('Cable Size Calculator — small screens', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('keeps source → cable → load, with the inputs in a sheet (§26)', async ({ page }) => {
    await page.goto(ROUTE);

    await expect(page.locator('#interactive-stage')).toHaveAttribute('data-layout', 'drawer');
    await expect(page.locator('#cs2-mobile-bar')).toBeVisible();
    await expect(page.locator('#cs2-mobile-size')).toHaveText('1.5 mm²');

    // the scene still tells the whole story
    await expect(page.locator('#cs2-source-volts')).toHaveText('230 V');
    await expect(page.locator('#cs2-cable-label')).toHaveText('1.5 mm² Copper');
    await expect(page.locator('#cs2-load-power')).toHaveText('100 W');

    // inputs live in the sheet, not in a shrunken desktop column
    await page.locator('#cs2-mob-inputs').click();
    await expect(page.locator('#cs2-inputs-container')).toBeInViewport();
    await loadChip(page, 'heater').click();
    await expect(page.locator('#cs2-recommended-size')).toHaveText('2.5 mm²');
    await page.locator('#cs2-inputs-container .ts-sheet-close').click();
    await expect(page.locator('#cs2-inputs-container')).not.toBeInViewport();
    await expect(page.locator('#cs2-scrim')).toBeHidden();

    // the comparison strip stays reachable under the scene
    await expect(page.locator('#cs2-strip')).toBeVisible();
  });
});
