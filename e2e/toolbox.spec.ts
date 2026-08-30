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

  test('real-world presets open a detail dialog, then load the scenario', async ({ page }) => {
    await page.goto('/tools/voltage-drop-calculator/');

    await page.locator('[data-preset-id="ev-7kw"]').click();
    const dialog = page.locator('#vd-preset-backdrop');
    await expect(dialog).toBeVisible();
    // the dialog explains the circuit before anything is applied
    await expect(page.locator('#vd-preset-title')).toHaveText('EV charger 7 kW');
    await expect(page.locator('#vd-preset-body')).toContainText('10 mm² copper');
    await expect(page.locator('#vd-preset-body')).toContainText('1.43%');
    // nothing applied yet — the form still shows the defaults
    await expect(page.locator('#input-current')).toHaveValue('40');

    await page.locator('#vd-preset-apply').click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('#input-current')).toHaveValue('32');
    await expect(page.locator('#input-length')).toHaveValue('25');
    await expect(page.locator('#input-size')).toHaveValue('10');
    await expect(page.locator('#input-temp')).toHaveValue('70');
    // 2 × 32 A × 25 m × (0.0172 × 1.1965 / 10) Ω/m ≈ 3.29 V at the 70 °C design temp
    await expect(page.locator('#res-voltage-drop')).toHaveText('3.29 V');
    await expect(page.locator('#preset-caption')).toContainText('7 kW');
    await expect(page.locator('[data-preset-id="ev-7kw"]')).toHaveAttribute('aria-pressed', 'true');
    expect(new URL(page.url()).searchParams.get('preset')).toBe('ev-7kw');

    // reopening the active preset offers a clear escape hatch
    await page.locator('[data-preset-id="ev-7kw"]').click();
    await expect(dialog).toBeVisible();
    await expect(page.locator('#vd-preset-clear')).toBeVisible();
    await page.locator('#vd-preset-clear').click();
    await expect(dialog).toBeHidden();
    await expect(page.locator('[data-preset-id="ev-7kw"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.locator('#input-current')).toHaveValue('40');

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
          // A child of a horizontally scrollable strip (the cable comparison
          // strip, the formula tables) is meant to run past the fold: it is
          // scrolled, not cropped.
          const inScroller = (el: HTMLElement): boolean => {
            for (let p = el.parentElement; p; p = p.parentElement) {
              const overflowX = getComputedStyle(p).overflowX;
              if (overflowX === 'auto' || overflowX === 'scroll') return true;
            }
            return false;
          };
          const wide: string[] = [];
          for (const el of Array.from(document.querySelectorAll('body *'))) {
            const node = el as HTMLElement;
            const box = node.getBoundingClientRect();
            if (box.width < 2 || box.height < 2) continue;
            if (getComputedStyle(node).display === 'none') continue;
            // an element allowed to scroll inside its own wrapper is not page overflow
            if (node.closest('.seo-table-wrap') || node.closest('[style*="overflow"]')) continue;
            if (inScroller(node)) continue;
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
            // visually hidden text (live regions, sr-only headings) is clipped on
            // purpose — it exists for assistive tech, not for the eye
            if (el.classList.contains('sr-only')) continue;
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
    await expect(page.locator('#interactive-stage')).toHaveAttribute('data-layout', 'drawer');
    const handle = page.locator('#cs2-mobile-bar');
    await expect(handle).toBeVisible();
    await expect(handle.locator('#cs2-mobile-size')).not.toBeEmpty();

    const sheet = page.locator('#cs2-inputs-container');
    await expect(sheet).not.toBeInViewport();
    await handle.locator('#cs2-mob-inputs').click();
    await expect(page.locator('#cs2-scrim')).toBeVisible();
    await expect(sheet).toBeInViewport();

    const before = (await page.locator('#cs2-recommended-size').textContent())?.trim();
    await page.locator('.cs2-load-chip:has(input[value="heater"])').click();
    await expect(page.locator('#cs2-recommended-size')).not.toHaveText(before ?? '');
    await page.locator('#cs2-length').fill('120');
    await expect(page.locator('#cs2-cable-sub')).toHaveText('120 m one-way');

    // the drawer handle and the results panel have to agree
    const summary = (await page.locator('#cs2-mobile-size').textContent())?.trim() ?? '';
    const results = (await page.locator('#cs2-selected-size').textContent())?.trim() ?? '';
    expect(results).toContain(summary);

    await page.locator('#cs2-inputs-container .ts-sheet-close').click();
    await expect(page.locator('#cs2-scrim')).toBeHidden();

    await page.locator('#cs2-mob-results').click();
    await expect(page.locator('#cs2-results-container')).toBeInViewport();
    await page.locator('#cs2-results-container .ts-sheet-close').click();
    await expect(page.locator('#cs2-results-container')).not.toBeInViewport();
  });

  test('the drawer never covers the whole page, and its body scrolls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/tools/cable-size-calculator/');
    await page.locator('#cs2-mob-inputs').click();
    const metrics = await page.locator('#cs2-inputs-container').evaluate((el) => {
      const box = el.getBoundingClientRect();
      return { top: box.top, height: box.height, viewport: window.innerHeight };
    });
    // the app header stays reachable above the sheet
    expect(metrics.top).toBeGreaterThan(0);
    expect(metrics.height).toBeLessThan(metrics.viewport);

    const bodyScrolls = await page.locator('#cs2-inputs-body').evaluate((el) => ({
      overflowY: getComputedStyle(el).overflowY,
    }));
    expect(bodyScrolls.overflowY).toBe('auto');
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
