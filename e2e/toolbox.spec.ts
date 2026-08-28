import { expect, test } from '@playwright/test';

test.describe('Electrical Toolbox & Voltage Drop Calculator', () => {
  test('Toolbox hub loads and displays available tools', async ({ page }) => {
    await page.goto('/tools/');

    await expect(page).toHaveTitle(/Electrical Toolbox/i);
    await expect(page.locator('h1')).toContainText('Interactive Electrical Calculators');

    // Voltage drop card should be available
    const voltageCard = page.locator('.tool-card.tool-active').first();
    await expect(voltageCard).toBeVisible();
    await expect(voltageCard.locator('h2')).toContainText('Voltage Drop Calculator');

    // Clicking launch navigates to tool
    await voltageCard.locator('a.btn-tool-launch').click();
    await expect(page).toHaveURL(/\/tools\/voltage-drop-calculator\/?/);
  });

  test('Voltage Drop Calculator interactive workspace on desktop', async ({ page }) => {
    await page.goto('/tools/voltage-drop-calculator/');

    // Page title and SEO
    await expect(page).toHaveTitle(/Voltage Drop Calculator/i);

    // Initial default values in results panel
    const sourceVolt = page.locator('#res-source-voltage');
    const loadVolt = page.locator('#res-load-voltage');
    const dropVolt = page.locator('#res-voltage-drop');
    const dropPct = page.locator('#res-drop-percent');

    await expect(sourceVolt).toHaveText('230 V');
    await expect(loadVolt).toHaveText('223.7 V');
    await expect(dropVolt).toHaveText('6.33 V');
    await expect(dropPct).toHaveText('2.75%');

    // Scene SVG labels
    await expect(page.locator('#source-voltage-label')).toHaveText('230 V');
    await expect(page.locator('#load-voltage-label')).toHaveText('223.7 V');
    await expect(page.locator('#drop-callout-text')).toContainText('6.33 V (2.75%)');

    // Change cable length from 50 to 100m
    const inputLength = page.locator('#input-length');
    await inputLength.fill('100');

    // Voltage drop should double (~12.66 V, 5.50% - Excessive severity)
    await expect(dropVolt).toHaveText('12.66 V');
    await expect(dropPct).toHaveText('5.50%');
    await expect(loadVolt).toHaveText('217.3 V');
    await expect(page.locator('#status-title')).toHaveText('Excessive');

    // Change cable size to 25 mm² to bring drop back down
    const inputSize = page.locator('#input-size');
    await inputSize.fill('25');

    await expect(dropVolt).toHaveText('5.06 V');
    await expect(dropPct).toHaveText('2.20%');
    await expect(page.locator('#status-title')).toHaveText('Good');

    // Test Reset button
    const btnReset = page.locator('#btn-reset-view');
    await btnReset.click();

    // Verify defaults restored
    await expect(dropVolt).toHaveText('6.33 V');
    await expect(dropPct).toHaveText('2.75%');
    await expect(inputLength).toHaveValue('50');
    await expect(inputSize).toHaveValue('10');
  });

  test('Validation error handling, friendly error notices, and autofix restoration', async ({
    page,
  }) => {
    await page.goto('/tools/voltage-drop-calculator/');

    const inputSize = page.locator('#input-size');
    const wrapSize = page.locator('#wrap-size');
    const errSize = page.locator('#err-size');
    const errorNoticeCard = page.locator('#error-notice-card');
    const dropCallout = page.locator('#drop-callout-text');

    // Enter an invalid cable size (0.1 mm² - below 0.5 minimum)
    await inputSize.fill('0.1');
    // the tool judges a field when you leave it, not while you type in it, so a
    // half-written value never flashes red: tab out before expecting the verdict
    await inputSize.blur();

    // Field should display red error border and friendly message
    await expect(wrapSize).toHaveClass(/has-error/);
    await expect(errSize).toBeVisible();
    await expect(errSize).toContainText('Minimum conductor size is 0.5 mm²');

    // Results panel should display error notice card
    await expect(errorNoticeCard).toBeVisible();
    await expect(page.locator('#error-notice-list')).toContainText(
      'Cable cross-section is too small',
    );
    await expect(dropCallout).toContainText('Check Inputs');

    // Click "Restore Standard Values" (Autofix button)
    const btnAutofix = page.locator('#btn-autofix-inputs');
    await expect(btnAutofix).toBeVisible();
    await btnAutofix.click();

    // Errors should be dismissed and defaults restored
    await expect(wrapSize).not.toHaveClass(/has-error/);
    await expect(errSize).toBeHidden();
    await expect(errorNoticeCard).toBeHidden();
    await expect(inputSize).toHaveValue('10');
    await expect(dropCallout).toContainText('6.33 V (2.75%)');
  });

  test('Tool SEO, Structured Data Graph and FAQs are complete', async ({ page }) => {
    await page.goto('/tools/voltage-drop-calculator/');

    // Meta verification
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute(
      'href',
      'https://electrasim.com/tools/voltage-drop-calculator/',
    );

    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /voltage drop/i);

    const metaKeywords = page.locator('meta[name="keywords"]');
    await expect(metaKeywords).toHaveAttribute('content', /BS 7671/i);

    // Schema.org JSON-LD Verification
    const jsonLdScript = page.locator('script[type="application/ld+json"]').first();
    const jsonLdText = await jsonLdScript.textContent();
    expect(jsonLdText).toBeTruthy();

    const graphObj = JSON.parse(jsonLdText || '{}');
    expect(graphObj['@context']).toBe('https://schema.org');
    expect(Array.isArray(graphObj['@graph'])).toBe(true);

    const types = (graphObj['@graph'] as Array<Record<string, unknown>>).map(
      (item) => item['@type'],
    );
    expect(types).toContain('WebApplication');
    expect(types).toContain('BreadcrumbList');
    expect(types).toContain('FAQPage');
    expect(types).toContain('HowTo');

    // Educational Guide Section is visible
    const guideSection = page.locator('#educational-guide');
    await expect(guideSection).toBeVisible();

    // FAQ Accordion interaction
    const firstFaq = page.locator('.faq-item').first();
    await expect(firstFaq).toBeVisible();
    await firstFaq.locator('summary').click();
    await expect(firstFaq).toHaveAttribute('open', '');

    // Simulator CTA link
    const simCta = page.locator('.btn-launch-sim');
    await expect(simCta).toHaveAttribute('href', '/app/');
  });

  test('Command palette keyboard shortcuts (Shift+Space) and navigation', async ({ page }) => {
    await page.goto('/tools/voltage-drop-calculator/');

    const cmdBackdrop = page.locator('#cmd-palette-backdrop');
    await expect(cmdBackdrop).toBeHidden();

    // Press Shift + Space
    await page.keyboard.press('Shift+Space');
    await expect(cmdBackdrop).toBeVisible();

    // Type search query
    const cmdInput = page.locator('#cmd-palette-input');
    await cmdInput.fill('reset');

    // Filtered item should be visible
    const resetItem = page.locator('.cmd-item[data-action="reset"]');
    await expect(resetItem).toBeVisible();

    // Escape closes palette
    await page.keyboard.press('Escape');
    await expect(cmdBackdrop).toBeHidden();
  });

  test('Help modal opens with equations and closes with Escape or button', async ({ page }) => {
    await page.goto('/tools/voltage-drop-calculator/');

    const helpBackdrop = page.locator('#tool-help-backdrop');
    await expect(helpBackdrop).toBeHidden();

    // Click Help button
    await page.locator('#tool-help-btn').click();
    await expect(helpBackdrop).toBeVisible();
    await expect(page.locator('#help-modal-title')).toHaveText('How Voltage Drop Works');

    // Click Got It
    await page.locator('#tool-help-confirm').click();
    await expect(helpBackdrop).toBeHidden();
  });

  test('Theme toggle switches between light and dark mode', async ({ page }) => {
    await page.goto('/tools/voltage-drop-calculator/');

    const html = page.locator('html');

    // Click theme toggle
    await page.locator('#tool-theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // Toggle back to light
    await page.locator('#tool-theme-toggle').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('Mobile responsive bottom sheet controls and layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/tools/voltage-drop-calculator/');

    // Mobile bottom bar should be visible
    const mobileBottomBar = page.locator('#mobile-bottom-bar');
    await expect(mobileBottomBar).toBeVisible();

    // Click Configure Inputs
    await page.locator('#btn-mobile-open-inputs').click();

    const inputsContainer = page.locator('#inputs-panel-container');
    await expect(inputsContainer).toHaveClass(/open/);

    // Scrim should be visible
    const scrim = page.locator('#inputs-panel-scrim');
    await expect(scrim).toBeVisible();

    // Clicking scrim closes drawer
    await scrim.click();
    await expect(inputsContainer).not.toHaveClass(/open/);
  });

  // ─── Scenery must fill the stage at every aspect ratio ───────────────
  // The scene used to be a fixed 1440×810 box scaled to *fit*, which on wide
  // and ultrawide monitors left flat page colour down both sides of the
  // landscape. The SVG now carries a live viewBox fitted to the stage.
  const stages: Array<{ label: string; width: number; height: number }> = [
    { label: 'small laptop', width: 1366, height: 768 },
    { label: 'full HD', width: 1920, height: 1080 },
    { label: '2K', width: 2560, height: 1440 },
    { label: 'ultrawide 21:9', width: 3440, height: 1440 },
    { label: 'phone portrait', width: 390, height: 844 },
    { label: 'phone landscape', width: 844, height: 390 },
    { label: 'tablet portrait', width: 768, height: 1024 },
  ];
  for (const { label, width, height } of stages) {
    test(`scene covers the whole stage on ${label} (${width}×${height})`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/tools/voltage-drop-calculator/');

      // the scene frame is what the fit targets: the whole stage while panels
      // float beside the art, a banner once the layout stacks for a small window
      const frame = page.locator('#scene-frame');
      await expect(frame).toBeVisible();
      const frameBox = await frame.boundingBox();
      const svgBox = await page.locator('#voltage-drop-svg').boundingBox();
      expect(frameBox).not.toBeNull();
      expect(svgBox).not.toBeNull();
      // within a pixel of rounding: no letterboxing, no clipped scenery
      expect(Math.abs(svgBox!.width - frameBox!.width)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(svgBox!.height - frameBox!.height)).toBeLessThanOrEqual(1.5);

      // the viewBox carries the frame's aspect ratio (the fit is exact, not a
      // contain-fit that would leave page colour at the sides)
      const viewBox = (await page.locator('#voltage-drop-svg').getAttribute('viewBox')) ?? '';
      const [vbX, vbY, vbW, vbH] = viewBox.split(/\s+/).map(Number);
      expect(vbW / vbH).toBeCloseTo(frameBox!.width / frameBox!.height, 1);
      // the informative region (x 250..1310 of the 1440 canvas) is always inside
      // the view — neither edge of the story is cropped — and with spare width the
      // view grows past the authored canvas instead of leaving a flat band
      expect(vbW).toBeGreaterThanOrEqual(1060 * 0.99);
      expect(vbW).toBeLessThanOrEqual(1440 * 2.6);
      // the sky/ground backdrop is painted far past the view on every edge
      expect(vbX).toBeGreaterThan(-4000);
      expect(vbY).toBeGreaterThan(-4000);
      expect(vbX + vbW).toBeLessThan(4000);
      expect(vbY + vbH).toBeLessThan(4000);
    });
  }

  test('real-world presets load a scenario and travel in the shared URL', async ({ page }) => {
    await page.goto('/tools/voltage-drop-calculator/');

    await page.locator('[data-preset-id="ev-7kw"]').click();
    await expect(page.locator('#input-current')).toHaveValue('32');
    await expect(page.locator('#input-length')).toHaveValue('25');
    await expect(page.locator('#input-size')).toHaveValue('10');
    await expect(page.locator('#input-temp')).toHaveValue('70');
    // 2 × 32 A × 25 m × (0.0172 × 1.1965 / 10) Ω/m ≈ 3.29 V at the 70 °C design temp
    await expect(page.locator('#res-voltage-drop')).toHaveText('3.29 V');
    await expect(page.locator('#preset-caption')).toContainText('7 kW');
    await expect(page.locator('[data-preset-id="ev-7kw"]')).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).searchParams.get('preset')).toBe('ev-7kw');

    // a shared link replays the scenario, including the failing long shed run
    await page.goto('/tools/voltage-drop-calculator/?preset=long-shed');
    await expect(page.locator('#input-length')).toHaveValue('85');
    await expect(page.locator('#status-title')).toHaveText('Excessive');
    await expect(page.locator('#res-drop-percent')).toHaveText('9.25%');
  });

  test('Advanced Options fields stay reachable instead of hiding under Calculate', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 700 });
    await page.goto('/tools/voltage-drop-calculator/');

    await page.locator('#btn-advanced-toggle').click();
    await expect(page.locator('#advanced-body')).toBeVisible();
    await expect(page.locator('#btn-advanced-toggle')).toHaveAttribute('aria-expanded', 'true');

    // the body scrolls; the button is pinned outside it
    const overflowY = await page
      .locator('#inputs-body')
      .evaluate((el) => getComputedStyle(el).overflowY);
    expect(['auto', 'scroll']).toContain(overflowY);

    await page.locator('#reactance-group').scrollIntoViewIfNeeded();
    const switchBox = await page.locator('#switch-reactance').boundingBox();
    const footerBox = await page.locator('#inputs-panel .panel-footer').boundingBox();
    expect(switchBox).not.toBeNull();
    expect(footerBox).not.toBeNull();
    // reactance row must clear the pinned Calculate footer
    expect(switchBox!.y + switchBox!.height).toBeLessThanOrEqual(footerBox!.y + 1);
  });

  test('Calculate keeps readable contrast while hovered', async ({ page }) => {
    await page.goto('/tools/voltage-drop-calculator/');
    const btn = page.locator('#btn-calculate');

    const read = () =>
      btn.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, color: cs.color };
      });

    const idle = await read();
    await btn.hover();
    // the recolour is a 150 ms transition: sample it once settled
    await page.waitForTimeout(280);
    const hovered = await read();

    // regression: the old rule referenced an undefined --blue-h token, so the
    // surface fell back to transparent and white text sat on the panel
    for (const state of [idle, hovered]) {
      expect(state.bg).not.toBe('rgba(0, 0, 0, 0)');
      expect(state.color).toBe('rgb(255, 255, 255)');
      const parts = state.bg.match(/[\d.]+/g)?.map(Number) ?? [];
      const luminance = (0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]) / 255;
      expect(luminance).toBeLessThan(0.55);
    }
    expect(hovered.bg).not.toBe(idle.bg);
  });

  test('the rendered page contains no emoji-font glyphs', async ({ page }) => {
    await page.goto('/tools/voltage-drop-calculator/');
    const offenders = await page.evaluate(() => {
      // pictographs that would be drawn by the visitor's emoji font
      // pictographs that would be drawn by the visitor's emoji font (the
      // variation selector is matched outside the class: inside it, it reads as
      // a single "emoji + VS16" grapheme and silently under-matches)
      const isEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]|\u{FE0F}/u;
      // typographic marks (text presentation, no emoji font involved) are fine
      const allowed = new Set(['✓', '✕', '•', '▾', '→', '←', '↑', '↓', '›', '‹', '─', '│']);
      const found: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (const ch of node.textContent ?? '') {
          if (isEmoji.test(ch) && !allowed.has(ch)) found.push(ch);
        }
      }
      return found;
    });
    expect(offenders).toEqual([]);
  });
});

test.describe('Cable Size Calculator — cutaway scene', () => {
  test('the cutaway fills its frame at every viewport', async ({ page }) => {
    for (const { width, height } of [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 3440, height: 1440 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto('/tools/cable-size-calculator/');
      const frameBox = await page.locator('#scene-frame').evaluate((el) => ({
        // the frame's *content* box: in the banner layout it carries a 1px border
        // and the SVG fills the content box, so a boundingBox() compare is 2px out
        width: el.clientWidth,
        height: el.clientHeight,
      }));
      const svgBox = await page.locator('#cs-cutaway-svg').boundingBox();
      expect(frameBox).not.toBeNull();
      expect(svgBox).not.toBeNull();
      expect(Math.abs(svgBox!.width - frameBox!.width)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(svgBox!.height - frameBox!.height)).toBeLessThanOrEqual(1.5);

      // the fitted viewBox carries the frame's aspect ratio (no letterboxing),
      // and the backdrop is painted well past the view on every edge
      const viewBox = (await page.locator('#cs-cutaway-svg').getAttribute('viewBox')) ?? '';
      const [vbX, vbY, vbW, vbH] = viewBox.split(/\s+/).map(Number);
      expect(vbW / vbH).toBeCloseTo(frameBox!.width / frameBox!.height, 1);
      expect(vbX).toBeGreaterThan(-4000);
      expect(vbY).toBeGreaterThan(-4000);
      expect(vbX + vbW).toBeLessThan(4000);
      expect(vbY + vbH).toBeLessThan(4000);
    }
  });

  test('changing the installation method moves both the answer and the scene', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    const size = page.locator('#cs-out-size');
    const clipped = (await size.textContent())?.trim();

    await page.locator('[data-cs-group="method"] [data-cs-value="A"]').click();
    await expect(page.locator('#cs-scene-root')).toHaveAttribute('data-method', 'A');
    await expect(page.locator('#cs-install-method')).toHaveValue('A');
    const enclosed = (await size.textContent())?.trim();
    // Method A sheds heat worse than Method C, so the same circuit needs more copper
    expect(Number(enclosed)).toBeGreaterThan(Number(clipped));

    // the insulation plate the scene reveals is the teaching moment
    await page.locator('[data-cs-group="insulation"] [data-cs-value="200"]').click();
    await expect(page.locator('#cs-scene-root')).toHaveAttribute('data-insulation', '200');
    await expect(page.locator('#cs-factor-ci')).not.toHaveText('1.00');
  });

  test('sliders drive heat, grouping and the gauge together', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    const temp = page.locator('#cs-temp');
    await temp.fill('52');
    await expect(page.locator('#cs-scene-root')).toHaveAttribute('data-ambient', 'hot');
    await expect(page.locator('#cs-temp-out')).toHaveText('52 °C');

    await page.locator('#cs-grouping').fill('6');
    await expect(page.locator('#cs-scene-root')).toHaveAttribute('data-neighbours', '5');
    await expect(page.locator('#cs-grouping-out')).toHaveText('6 circuits');

    // the gauge reads 0..1 fractions from the engine, not hard-coded widths
    const style = (await page.locator('#cs-gauge').getAttribute('style')) ?? '';
    expect(style).toContain('--gauge:');
    expect(style).toContain('--load-mark:');
    expect(style).toContain('--need-mark:');
  });

  test('the crossover chart and size ladder follow the circuit', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    const dropPath = page.locator('.cs-line--drop');
    const thermalPath = page.locator('.cs-line--thermal');
    const dropBefore = await dropPath.getAttribute('d');
    const thermalBefore = await thermalPath.getAttribute('d');
    const rungBefore = Number(await page.locator('.cs-rung.is-selected').getAttribute('data-size'));

    // the chart is indexed by run length, so the *current* length moves the
    // ladder, while a heavier load redraws both gates and the crossover point
    await page.locator('#cs-length').fill('150');
    const rungAfter = Number(await page.locator('.cs-rung.is-selected').getAttribute('data-size'));
    expect(rungAfter).toBeGreaterThan(rungBefore);
    // every rung below the answer is marked as insufficient
    await expect(page.locator('.cs-rung.is-short').first()).toBeVisible();

    await page.locator('#cs-power').fill('22');
    expect(await dropPath.getAttribute('d')).not.toBe(dropBefore);
    expect(await thermalPath.getAttribute('d')).not.toBe(thermalBefore);
    await expect(page.locator('.cs-cross')).toBeVisible();
  });

  test('“why this size?” explains the derating as a factor chain', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    const pop = page.locator('#cs-why-pop');
    await expect(pop).toBeHidden();
    await page.locator('#cs-why-btn').click();
    await expect(pop).toBeVisible();
    await expect(pop.locator('.cs-bar').first()).toBeVisible();
    await expect(page.locator('#cs-why-btn')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#cs-why-text')).toContainText(/multiplied together that is/i);

    await page.keyboard.press('Escape');
    await expect(pop).toBeHidden();
  });

  test('presets set a whole scenario, not just the load', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    // a chip opens the card first; the card is what applies the circuit
    await page.locator('[data-preset="lighting"]').click();
    await expect(page.locator('#cs-preset-backdrop')).toBeVisible();
    await page.locator('#cs-preset-apply').click();
    await expect(page.locator('#cs-install-method')).toHaveValue('A');
    await expect(page.locator('#cs-insulation')).toHaveValue('200');
    await expect(page.locator('#cs-circuit-type')).toHaveValue('lighting');
    await expect(page.locator('#cs-scene-root')).toHaveAttribute('data-insulation', '200');
    // lighting budget: the 3% ceiling is what the drop chips quote
    await expect(page.locator('#cs-chip-ceiling')).toHaveText('3%');
  });

  test('the BS 3036 fuse factor is applied, not decorative', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    const it = page.locator('#cs-out-it');
    const before = await it.textContent();
    await page.locator('#cs-fuse-cc').check();
    const after = await it.textContent();
    expect(Number(after?.replace(' A', ''))).toBeGreaterThan(Number(before?.replace(' A', '')));
  });

  test('the optional 3D view is opt-in and never breaks the 2D stage', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto('/tools/cable-size-calculator/');

    const toggle = page.locator('#cs-3d-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');

    // Either the WebGL view comes up, or the scene says it could not and keeps the
    // SVG. Poll for whichever happens instead of sampling at a fixed moment: the
    // 3D chunk is loaded on demand, so a dev server that has to transform `three`
    // on first request is legitimately slower than a built site.
    const layer = page.locator('#cs-3d-layer');
    const status = page.locator('#cs-3d-status');
    await expect
      .poll(
        async () =>
          (await layer.isVisible().catch(() => false)) ||
          /unavailable|could not be (loaded|fetched)|WebGL/i.test(
            (await status.textContent().catch(() => '')) ?? '',
          ),
        { timeout: 25_000, message: 'the 3D layer neither appeared nor explained itself' },
      )
      .toBe(true);

    await toggle.click();
    await expect(page.locator('#cs-cutaway-svg')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('the cable page renders no emoji-font glyphs', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    const offenders = await page.evaluate(() => {
      // pictographs that would be drawn by the visitor's emoji font (the
      // variation selector is matched outside the class: inside it, it reads as
      // a single "emoji + VS16" grapheme and silently under-matches)
      const isEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}]|\u{FE0F}/u;
      const allowed = new Set(['✓', '✕', '•', '▾', '→', '←', '↑', '↓', '›', '‹', '─', '│']);
      const found: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (const ch of node.textContent ?? '') {
          if (isEmoji.test(ch) && !allowed.has(ch)) found.push(ch);
        }
      }
      return found;
    });
    expect(offenders).toEqual([]);
  });

  test('the shared toolbox chrome works on this page too', async ({ page }) => {
    // the drawer, palette and help dialog used to be wired inside the
    // voltage-drop engine only, so on every other tool they were dead furniture
    await page.goto('/tools/cable-size-calculator/');

    await expect(page.locator('#cmd-palette-backdrop')).toBeHidden();
    await page.keyboard.press('Shift+Space');
    await expect(page.locator('#cmd-palette-backdrop')).toBeVisible();
    await page.locator('#cmd-palette-input').fill('help');
    await expect(page.locator('.cmd-item[data-action="help"]')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page.locator('#tool-help-dialog')).toBeVisible();
    // the help content belongs to this tool, not to voltage drop
    await expect(page.locator('#help-modal-title')).toHaveText('How Cable Sizing Works');
    await page.keyboard.press('Escape');
    await expect(page.locator('#tool-help-backdrop')).toBeHidden();

    await page.locator('#tool-drawer-btn').click();
    await expect(page.locator('#tool-drawer-menu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#tool-drawer-menu')).toBeHidden();
  });

  test('shared links replay the whole scenario including the scene', async ({ page }) => {
    await page.goto(
      '/tools/cable-size-calculator/?method=A&insulation=100&temp=45&grouping=4&power=6&length=60',
    );
    await expect(page.locator('#cs-install-method')).toHaveValue('A');
    await expect(page.locator('#cs-insulation')).toHaveValue('100');
    await expect(page.locator('#cs-scene-root')).toHaveAttribute('data-method', 'A');
    await expect(page.locator('#cs-scene-root')).toHaveAttribute('data-insulation', '100');
    await expect(page.locator('#cs-scene-root')).toHaveAttribute('data-ambient', 'hot');
    const size = Number((await page.locator('#cs-out-size').textContent())?.trim());
    expect(Number.isFinite(size)).toBe(true);
    expect(size).toBeGreaterThanOrEqual(10);
  });

  test('panels never sit on top of the drawing or get clipped by the stage', async ({ page }) => {
    await page.setViewportSize({ width: 1900, height: 1040 });
    await page.goto('/tools/cable-size-calculator/');

    const frame = (await page.locator('#scene-frame').boundingBox())!;
    const inputs = (await page.locator('#cs-inputs-container').boundingBox())!;
    const results = (await page.locator('#cs-results-container').boundingBox())!;
    // each panel is inside the frame vertically — nothing sliced off at the bottom
    expect(inputs.y).toBeGreaterThanOrEqual(frame.y - 1);
    expect(inputs.y + inputs.height).toBeLessThanOrEqual(frame.y + frame.height + 1);
    expect(results.y + results.height).toBeLessThanOrEqual(frame.y + frame.height + 1);

    // and the informative part of the artwork stays between them
    const band = await page.evaluate(() => {
      const svg = document.getElementById('cs-cutaway-svg');
      const [x, , w] = (svg?.getAttribute('viewBox') ?? '0 0 1280 760').split(/\s+/).map(Number);
      const scale = svg ? svg.getBoundingClientRect().width / w : 1;
      return {
        left: (292 - x) * scale,
        right: (1032 - x) * scale,
        width: svg?.getBoundingClientRect().width ?? 0,
      };
    });
    expect(band.left).toBeGreaterThanOrEqual(inputs.width + 8);
    expect(band.right).toBeLessThanOrEqual(band.width - results.width - 8);
  });

  test('the inputs never hide behind the footer, in either layout', async ({ page }) => {
    for (const size of [
      { width: 1600, height: 1000 },
      { width: 1280, height: 1040 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await page.goto('/tools/cable-size-calculator/');
      const stage = await page.locator('#interactive-stage').getAttribute('data-layout');
      if (stage === 'drawer') await page.locator('#cs-mob-inputs').click();
      const body = page.locator('#cs-inputs-body');
      await expect(body).toBeVisible();
      const metrics = await body.evaluate((el) => ({
        scrollable: el.scrollHeight - el.clientHeight,
        overflowY: getComputedStyle(el).overflowY,
        panelOverflow: getComputedStyle(el.closest('.ts-panel') as HTMLElement).overflow,
      }));
      // floating, or folded into a sheet: the panel body scrolls. Stacked into the
      // page flow: the page scrolls instead — that is the point of the layout.
      if (stage === 'float' || stage === 'drawer') {
        expect(['auto', 'scroll']).toContain(metrics.overflowY);
      }
      // the panel clips at its own rounded edge, never mid-stage
      expect(metrics.panelOverflow).toContain('hidden');
      // scroll the *control*, not the scroll container, so the nearest scrollable
      // ancestor (the sheet body, or the page in the stacked layout) does the work
      await page.locator('#cs-fuse-cc').scrollIntoViewIfNeeded();
      await expect(page.locator('#cs-fuse-cc')).toBeInViewport();
      void metrics.scrollable;
    }
  });
});

test.describe('Cable Size Calculator — the run, the drawer, and preset cards', () => {
  test('every control in the inputs panel responds (the method chips once did not)', async ({
    page,
  }) => {
    // Regression: the pickers and the scene shared the `data-method` /
    // `data-insulation` attributes, so the engine bound its click listener to the
    // scene instead of the row of chips and nothing on the page reacted.
    await page.goto('/tools/cable-size-calculator/');
    const size = page.locator('#cs-out-size');
    const before = Number(await size.textContent());

    for (const method of ['A', 'B', 'D', 'E', 'C']) {
      await page.locator(`[data-cs-group="method"] [data-cs-value="${method}"]`).click();
      await expect(page.locator('#cs-install-method')).toHaveValue(method);
      await expect(page.locator('#cs-scene-root')).toHaveAttribute('data-method', method);
      await expect(
        page.locator(`[data-cs-group="method"] [data-cs-value="${method}"]`),
      ).toHaveClass(/active/);
    }
    expect(Number(await size.textContent())).toBeCloseTo(before, 1);

    // the insulation segmented control is the other group that used to be inert
    await page.locator('[data-cs-group="insulation"] [data-cs-value="200"]').click();
    await expect(page.locator('#cs-insulation')).toHaveValue('200');
    await expect(page.locator('#cs-factor-ci')).not.toHaveText('1.00');

    // and the supply-system group still works (it never collided)
    await page.locator('[data-cs-group="system"] [data-cs-value="three-phase"]').click();
    await expect(page.locator('#cs-system-type')).toHaveValue('three-phase');
  });

  test('the drawn run changes shape with the method and hangs further as the run grows', async ({
    page,
  }) => {
    await page.goto('/tools/cable-size-calculator/');
    const run = page.locator('#cs-run-path');
    const flat = await run.getAttribute('d');

    await page.locator('[data-cs-group="method"] [data-cs-value="A"]').click();
    const loft = await run.getAttribute('d');
    expect(loft).not.toBe(flat);

    await page.locator('[data-cs-group="method"] [data-cs-value="D"]').click();
    const trench = await run.getAttribute('d');
    expect(trench).not.toBe(loft);

    const geometry = () =>
      page.locator('#cs-scene-root').evaluate((el) => ({
        size: getComputedStyle(el).getPropertyValue('--size').trim(),
        sag: getComputedStyle(el).getPropertyValue('--sag').trim(),
        delivered: getComputedStyle(el).getPropertyValue('--delivered').trim(),
        run: document.getElementById('cs-run-path')?.getAttribute('d') ?? '',
      }));
    await page.locator('[data-cs-group="method"] [data-cs-value="C"]').click();
    const short = await geometry();
    await page.locator('#cs-length').fill('150');
    const long = await geometry();
    // length moves the sag and the copper; the appliance is then fed less than nominal
    expect(Number(long.sag)).toBeGreaterThan(Number(short.sag));
    expect(long.run).not.toBe(short.run);
    expect(Number(long.size)).toBeGreaterThan(Number(short.size));
    expect(Number(long.delivered)).toBeLessThan(1);
  });

  test('the scene says what the numbers say — no stale captions', async ({ page }) => {
    await page.goto(
      '/tools/cable-size-calculator/?method=A&insulation=200&grouping=6&temp=50&power=14&length=60',
    );
    const texts = await page.evaluate(() => {
      const t = (id: string) => document.getElementById(id)?.textContent?.trim() ?? '';
      return {
        cable: t('cs-tag-cable'),
        dim: t('cs-tag-dim'),
        source: t('cs-tag-source'),
        load: t('cs-tag-load'),
        device: t('cs-tag-device'),
        gate: t('cs-tag-gate'),
        gateDrop: t('cs-tag-gate-drop'),
        iz: t('cs-tag-iz'),
        outSize: t('cs-out-size'),
        outPct: t('cs-out-vdrop-pct'),
      };
    });
    expect(texts.cable).toContain('60 m');
    expect(texts.dim).toBe('60 m one-way');
    expect(texts.source).toBe('230 V 1-Φ');
    expect(texts.outSize).not.toBe('');
    expect(texts.cable).toContain(`${texts.outSize} mm²`);
    expect(texts.load).toContain(texts.outPct.replace('%', ''));
    expect(texts.gateDrop).toContain(texts.outPct.replace('%', ''));
    expect(/MCB|fuse/.test(texts.device)).toBe(true);
    expect(/decides/.test(texts.gate)).toBe(true);
    expect(/Iz .* It /.test(texts.iz)).toBe(true);
  });

  test('a preset chip shows its real-world card before it changes anything', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    const sizeBefore = await page.locator('#cs-out-size').textContent();
    await page.locator('[data-preset="shower"]').click();
    const card = page.locator('#cs-preset-backdrop');
    await expect(card).toBeVisible();
    await expect(page.locator('#cs-preset-title')).toHaveText('8.5 kW shower');
    await expect(card.locator('.cs-preset-where')).toContainText('14 m');
    await expect(card.locator('.cs-preset-facts dt').first()).toHaveText('Connected load');
    // the card is prose plus figures, and opening it never touched the calculator
    expect(await page.locator('#cs-out-size').textContent()).toBe(sizeBefore);

    expect(await card.locator('.cs-preset-checks li').count()).toBeGreaterThanOrEqual(3);
    await expect(card.locator('.cs-preset-refs')).toContainText(/BS 7671|IEC 60364/);

    await page.locator('#cs-preset-apply').click();
    await expect(card).toBeHidden();
    await expect(page.locator('#cs-install-method')).toHaveValue('C');
    await expect(page.locator('#cs-length')).toHaveValue('14');
    await expect(page.locator('[data-preset="shower"]')).toHaveAttribute('aria-pressed', 'true');

    // editing any field means it is no longer the preset
    await page.locator('#cs-power').fill('9.5');
    await expect(page.locator('[data-preset="shower"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('every preset applies, and none of them disagrees with the panel', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    const ids = await page
      .locator('[data-preset]')
      .evaluateAll((els) => els.map((el) => el.getAttribute('data-preset')));
    expect(ids.length).toBeGreaterThanOrEqual(6);
    for (const id of ids) {
      await page.locator(`[data-preset="${id}"]`).click();
      await expect(page.locator('#cs-preset-backdrop')).toBeVisible();
      const facts = await page.locator('#cs-preset-body .cs-preset-facts dd').allTextContents();
      await page.locator('#cs-preset-apply').click();
      const size = (await page.locator('#cs-out-size').textContent())?.trim() ?? '';
      // the card quotes the answer the calculator then produces
      expect(facts.join(' ')).toContain(size);
      expect(size).not.toBe('');
      await expect(page.locator('#cs-preset-backdrop')).toBeHidden();
    }
  });
});

test.describe('Tool pages — small screens, where the panels live in a drawer', () => {
  const PAGES = [
    '/tools/cable-size-calculator/',
    '/tools/voltage-drop-calculator/',
    '/tools/max-zs-calculator/',
    '/tools/us/voltage-drop-calculator/',
  ];
  const SIZES = [
    { width: 360, height: 640 },
    { width: 390, height: 844 },
    { width: 414, height: 896 },
    { width: 600, height: 829 },
    { width: 768, height: 1024 },
    { width: 1024, height: 700 },
    { width: 1366, height: 768 },
  ];

  for (const path of PAGES) {
    for (const size of SIZES) {
      test(`no horizontal cropping on ${path} at ${size.width}×${size.height}`, async ({
        page,
      }) => {
        await page.setViewportSize(size);
        await page.goto(path);
        const report = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const wide: string[] = [];
          for (const el of Array.from(document.querySelectorAll('body *'))) {
            const node = el as HTMLElement;
            const box = node.getBoundingClientRect();
            if (box.width < 2 || box.height < 2) continue;
            if (getComputedStyle(node).display === 'none') continue;
            // an element allowed to scroll inside its own wrapper is not page overflow
            if (node.closest('.seo-table-wrap') || node.closest('[style*="overflow"]')) continue;
            if (node instanceof SVGElement) continue;
            if (box.right > vw + 1.5) {
              wide.push(`${node.tagName.toLowerCase()}.${String(node.className).split(' ')[0]}`);
            }
          }
          // any element clipping its own text is a cropping bug, however small
          const clipped: string[] = [];
          for (const node of Array.from(
            document.querySelectorAll('p, h2, h3, h4, li, code, dd, dt'),
          )) {
            const el = node as HTMLElement;
            if (el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'auto') {
              clipped.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]}`);
            }
          }
          return {
            pageOverflow: document.documentElement.scrollWidth - vw,
            wide: wide.slice(0, 8),
            clipped: clipped.slice(0, 8),
          };
        });
        expect(report.pageOverflow).toBeLessThanOrEqual(0);
        expect(report.wide).toEqual([]);
        expect(report.clipped).toEqual([]);
      });
    }
  }

  test('the formula blocks wrap instead of running off the card', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/cable-size-calculator/');
    const codes = page.locator('.seo-formula-card code');
    expect(await codes.count()).toBeGreaterThan(2);
    for (let i = 0; i < (await codes.count()); i += 1) {
      const box = codes.nth(i);
      await box.scrollIntoViewIfNeeded();
      const metrics = await box.evaluate((el) => ({
        scrollW: el.scrollWidth,
        clientW: el.clientWidth,
        wrap: getComputedStyle(el).whiteSpace,
      }));
      expect(metrics.wrap).toBe('pre-wrap');
      expect(metrics.scrollW).toBeLessThanOrEqual(metrics.clientW + 1);
    }
  });

  test('the phone drawer opens, takes input, and hands the scene back', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/cable-size-calculator/');

    // the layout mode is chosen by the shared runtime, not by a media query that
    // can disagree with the JS
    await expect(page.locator('#interactive-stage')).toHaveAttribute('data-layout', 'drawer');
    const handle = page.locator('#cs-mobile-bar');
    await expect(handle).toBeVisible();
    await expect(handle.locator('#cs-mobile-size')).not.toBeEmpty();

    const sheet = page.locator('#cs-inputs-container');
    // closed: off-canvas, so the scene owns the screen
    await expect(sheet).not.toBeInViewport();

    await handle.locator('#cs-mob-inputs').click();
    await expect(sheet).toBeInViewport();
    await expect(page.locator('#cs-scrim')).toBeVisible();

    // a control inside the drawer is clickable, and it moves the answer
    const before = Number(await page.locator('#cs-out-size').textContent());
    await page.locator('[data-cs-group="method"] [data-cs-value="A"]').click();
    expect(Number(await page.locator('#cs-out-size').textContent())).not.toBe(before);
    await page.locator('#cs-length').fill('120');
    await expect(page.locator('#cs-length-out')).toHaveText('120 m');

    // the handle keeps reporting the verdict while the drawer is shut
    const summary = (await page.locator('#cs-mobile-size').textContent())?.trim() ?? '';
    const results = (await page.locator('#cs-out-size').textContent())?.trim() ?? '';
    expect(summary).toContain(results);

    await page.locator('#cs-inputs-container .ts-sheet-close').click();
    await expect(sheet).not.toBeInViewport();
    await expect(page.locator('#cs-scrim')).toBeHidden();

    // Escape works too, and the results drawer opens on its own
    await page.locator('#cs-mob-results').click();
    await expect(page.locator('#cs-results-container')).toBeInViewport();
    await page.keyboard.press('Escape');
    await expect(page.locator('#cs-results-container')).not.toBeInViewport();
  });

  test('the drawer never covers the whole page, and its body scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/cable-size-calculator/');
    await page.locator('#cs-mob-inputs').click();
    const metrics = await page.locator('#cs-inputs-container').evaluate((el) => {
      const box = el.getBoundingClientRect();
      const body = el.querySelector('.ts-panel-body') as HTMLElement;
      const header = document.querySelector('.tool-app-header')?.getBoundingClientRect();
      return {
        top: box.top,
        height: box.height,
        viewport: window.innerHeight,
        headerVisible: (header?.bottom ?? 0) <= box.top + 1,
        bodyScrolls: ['auto', 'scroll'].includes(getComputedStyle(body).overflowY),
      };
    });
    // the app header stays usable above the sheet, and the sheet stops short of it
    expect(metrics.headerVisible).toBe(true);
    expect(metrics.top).toBeGreaterThanOrEqual(0);
    expect(metrics.height).toBeLessThanOrEqual(metrics.viewport);
    expect(metrics.bodyScrolls).toBe(true);
  });

  test('the voltage-drop drawer is reachable too (it used to sit under the prose)', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/voltage-drop-calculator/');
    const bar = page.locator('#mobile-bottom-bar');
    await expect(bar).toBeVisible();
    // hit-testable: it was once painted, positioned and *covered* by the SEO section
    await bar.locator('#btn-mobile-open-inputs').click();
    await expect(page.locator('#inputs-panel-container')).toBeInViewport();
    await page.locator('#inputs-panel-scrim').click();
    await expect(page.locator('#inputs-panel-container')).not.toBeInViewport();
  });
});
