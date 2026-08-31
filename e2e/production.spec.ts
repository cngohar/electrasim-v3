import { expect, test } from '@playwright/test';

const HOME_TITLE = 'ElectraSim — Free Online Electrical Wiring Simulator & Circuit Trainer';
const HOME_DESCRIPTION =
  'Build, energise and fault-find real domestic wiring in your browser. 115 components, live simulation, Guided Circuits, Challenge and Diagnosis modes, fault simulation and an electrical toolbox. Free, offline-capable, no sign-up.';
const HOME_VISIBLE_KEYPHRASE = 'electrical';
const COMPARE_CANONICAL = 'https://electrasim.com/compare/';
const COMPARE_TITLE = 'ElectraSim vs Online Circuit Simulators (2026 Comparison)';
const COMPARE_DESCRIPTION =
  'Compare ElectraSim with CircuitLab, Tinkercad Circuits, EveryCircuit, Falstad and DCACLab by purpose, price, sign-up, sharing, offline use and teaching tools.';

test.describe('production Pages output', () => {
  test('renders the required homepage SEO and visible product wording', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveTitle(HOME_TITLE);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      HOME_DESCRIPTION,
    );
    await expect(page.locator('h1')).toContainText('Real electrical wiring');

    const visibleText = await page.locator('body').innerText();
    expect(visibleText.toLowerCase()).toContain(HOME_VISIBLE_KEYPHRASE);
  });

  test('serves canonical routes, security headers, and immutable assets', async ({ request }) => {
    const home = await request.get('/');
    expect(home.status()).toBe(200);
    expect(home.headers()['content-security-policy']).toContain("default-src 'self'");
    expect(home.headers()['cache-control']).toContain('no-transform');
    expect(home.headers()['x-content-type-options']).toBe('nosniff');

    const homeHtml = await home.text();
    const astroStylesheetPath = homeHtml.match(/href="(\/_astro\/[^\"]+\.css)"/)?.[1];
    const marketingScriptPath = homeHtml.match(/src="(\/js\/site-nav\.js\?v=[^"]+)"/)?.[1];
    expect(astroStylesheetPath).toBeTruthy();
    expect(marketingScriptPath).toBeTruthy();

    const app = await request.get('/app/');
    expect(app.status()).toBe(200);
    expect(app.headers()['content-security-policy']).toContain("worker-src 'self' blob:");
    expect(app.headers()['cache-control']).toContain('no-transform');

    const appHtml = await app.text();
    const scriptPath = appHtml.match(/src="(\/app\/assets\/index-[^"]+\.js)"/)?.[1];
    expect(scriptPath).toBeTruthy();

    const appAsset = await request.get(scriptPath as string);
    expect(appAsset.status()).toBe(200);
    expect(appAsset.headers()['cache-control']).toContain('immutable');

    const sw = await request.get('/app/sw.js');
    expect(sw.status()).toBe(200);
    expect(sw.headers()['cache-control']).toContain('no-store');

    const legacyRootSw = await request.get('/sw.js');
    expect(legacyRootSw.status()).toBe(200);
    expect(legacyRootSw.headers()['cache-control']).toContain('no-store');
    expect(await legacyRootSw.text()).toContain('self.registration.unregister()');

    const image = await request.get('/images/electrasim-simulator-480.avif');
    expect(image.status()).toBe(200);
    expect(image.headers()['cache-control']).toContain('max-age=86400');
    expect(image.headers()['cache-control']).toContain('stale-while-revalidate=604800');

    const marketingScript = await request.get(marketingScriptPath as string);
    expect(marketingScript.status()).toBe(200);
    const marketingCacheControl = marketingScript.headers()['cache-control'] ?? '';
    const marketingMaxAge = Number(marketingCacheControl.match(/max-age=(\d+)/)?.[1]);
    expect(marketingMaxAge).toBeGreaterThanOrEqual(3600);
    expect(marketingMaxAge).toBeLessThanOrEqual(86400);
    expect(marketingCacheControl).toContain('must-revalidate');

    const astroStylesheet = await request.get(astroStylesheetPath as string);
    expect(astroStylesheet.status()).toBe(200);
    expect(astroStylesheet.headers()['cache-control']).toContain('max-age=31536000');
    expect(astroStylesheet.headers()['cache-control']).toContain('immutable');

    const manifest = await request.get('/app/manifest.webmanifest');
    expect(manifest.status()).toBe(200);
    expect(manifest.headers()['cache-control']).toContain('max-age=0');
    expect(manifest.headers()['cache-control']).toContain('must-revalidate');

    const admin = await request.get('/admin/');
    expect(admin.status()).toBe(200);
    expect(admin.headers()['x-frame-options']).toBe('SAMEORIGIN');
    expect(admin.headers()['cache-control']).toContain('no-store');

    for (const path of ['/guide/', '/blog/', '/blog/2/', '/blog/tags/rcd/']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
    }

    const canonical = await request.get('/blog/index.html', { maxRedirects: 0 });
    expect(canonical.status()).toBe(301);
    expect(canonical.headers().location).toBe('/blog/');

    const nestedCanonical = await request.get('/blog/tags/rcd/index.html', { maxRedirects: 0 });
    expect(nestedCanonical.status()).toBe(301);
    expect(nestedCanonical.headers().location).toBe('/blog/tags/rcd/');
  });

  test('retires the legacy root worker and keeps the real product screenshot', async ({ page }) => {
    await page.goto('/compare/');
    const heroImage = page.locator('.compare-product-shot img');
    await expect(heroImage).toBeVisible();
    await expect
      .poll(() => heroImage.evaluate((image: HTMLImageElement) => image.currentSrc))
      .toContain('/images/electrasim-simulator-');

    await page.evaluate(() => {
      void navigator.serviceWorker.register('/sw.js', { scope: '/' });
    });

    await expect
      .poll(
        () =>
          page.evaluate(async () => {
            const registrations = await navigator.serviceWorker.getRegistrations();
            return registrations.filter(
              (registration) => new URL(registration.scope).pathname === '/',
            ).length;
          }),
        { timeout: 10_000 },
      )
      .toBe(0);

    await expect(heroImage).toBeVisible();
  });

  test('serves comparison SEO, structured data, and sitemap entry', async ({ page, request }) => {
    const compare = await request.get('/compare/');
    expect(compare.status()).toBe(200);
    expect(compare.headers()['content-security-policy']).toContain("default-src 'self'");
    expect(compare.headers()['cache-control']).toContain('no-transform');

    await page.goto('/compare/');
    await expect(page).toHaveTitle(COMPARE_TITLE);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', COMPARE_CANONICAL);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      COMPARE_DESCRIPTION,
    );

    const heading = page.locator('h1');
    await expect(heading).toHaveCount(1);
    await expect(heading).toBeVisible();

    type JsonLdNode = { '@type'?: string | string[]; '@graph'?: JsonLdNode[] };
    const schemas = (
      await page.locator('script[type="application/ld+json"]').allTextContents()
    ).map((content) => JSON.parse(content) as JsonLdNode);
    const schemaTypes = schemas.flatMap((schema) =>
      [schema, ...(schema['@graph'] ?? [])].flatMap((node) => {
        const type = node['@type'];
        return Array.isArray(type) ? type : type ? [type] : [];
      }),
    );
    expect(schemaTypes).toEqual(
      expect.arrayContaining(['WebPage', 'BreadcrumbList', 'ItemList', 'FAQPage']),
    );

    const sitemapIndex = await request.get('/sitemap-index.xml');
    expect(sitemapIndex.status()).toBe(200);
    const sitemapPaths = [...(await sitemapIndex.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      ([, location]) => new URL(location).pathname,
    );
    expect(sitemapPaths.length).toBeGreaterThan(0);

    const sitemapResponses = await Promise.all(sitemapPaths.map((path) => request.get(path)));
    for (const response of sitemapResponses) expect(response.status()).toBe(200);
    const sitemaps = await Promise.all(sitemapResponses.map((response) => response.text()));
    expect(sitemaps.join('\n')).toContain(`<loc>${COMPARE_CANONICAL}</loc>`);
  });

  test('renders comparison in dark mode without mobile overflow or errors', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:color-scheme', 'dark');
    });

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/compare/', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('h1')).toBeVisible();

    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      colorScheme: document.documentElement.style.colorScheme,
    }));
    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.colorScheme).toBe('dark');
    expect(errors).toEqual([]);
  });

  test('changes and persists the marketing theme across routes', async ({ page }) => {
    await page.addInitScript(() => {
      if (!window.localStorage.getItem('electrasim:color-scheme')) {
        window.localStorage.setItem('electrasim:color-scheme', 'light');
      }
    });
    await page.goto('/');

    const themeToggle = page.locator('.theme-toggle');
    await expect(themeToggle).toBeVisible();
    await expect(themeToggle).toHaveAttribute('aria-label', 'Switch to dark mode');
    await themeToggle.click();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#11161a');
    expect(await page.evaluate(() => localStorage.getItem('electrasim:color-scheme'))).toBe('dark');

    await page.goto('/blog/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('.theme-toggle')).toHaveAttribute(
      'aria-label',
      'Switch to light mode',
    );
  });

  test('opens instant search modal, filters results, and navigates via keyboard', async ({
    page,
  }) => {
    await page.goto('/');

    const searchDialog = page.locator('#site-search-dialog');
    await expect(searchDialog).not.toHaveAttribute('open', '');

    // 1. Open via keyboard shortcut (Control+K or Slash)
    await page.keyboard.press('Control+k');
    await expect(searchDialog).toHaveAttribute('open', '');

    const searchInput = page.locator('#site-search-input');
    await expect(searchInput).toBeFocused();

    // 2. Initial state shows popular quick links
    await expect(page.locator('#site-search-quicklinks')).toBeVisible();
    await expect(page.locator('#site-search-results')).toContainText('Voltage Drop Calculator');

    // 3. Type query "voltage"
    await searchInput.fill('voltage');
    await page.waitForTimeout(100);

    const firstResult = page.locator('.search-result-item').first();
    await expect(firstResult).toBeVisible();
    await expect(firstResult).toContainText('Voltage');

    // 4. Test category filter pill
    const filterTools = page.locator('.search-filter-pill[data-filter="tool"]');
    await filterTools.click();
    await expect(filterTools).toHaveClass(/active/);
    await expect(page.locator('.search-type-badge').first()).toContainText('Calculator');

    // 5. Close with Escape
    await page.keyboard.press('Escape');
    await expect(searchDialog).not.toHaveAttribute('open', '');
  });

  test('changes and persists the app theme through Settings', async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
    });
    await page.goto('/app/');

    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: /^Settings Preferences & display options$/ }).click();
    const settings = page.getByRole('dialog', { name: /Circuit Settings/ });
    await settings.getByRole('button', { name: /Display/ }).click();
    await settings.getByRole('button', { name: /Dark\s+Full dark mode/i }).click();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
    await settings.getByRole('button', { name: 'Done' }).click();

    await page.waitForTimeout(350);
    await page.reload();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);

    await page.getByRole('button', { name: 'Menu' }).click();
    await page.getByRole('button', { name: /^Documentation\b/ }).click();
    await expect(page.getByRole('heading', { name: 'ElectraSim Documentation' })).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/\bdark\b/);
  });

  test('renders the marketing site without overflow or external font requests', async ({
    page,
  }) => {
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') failures.push(message.text());
    });
    page.on('request', (request) => {
      if (/fonts\.(?:googleapis|gstatic)\.com/.test(new URL(request.url()).hostname)) {
        failures.push(`external font request: ${request.url()}`);
      }
    });

    for (const path of ['/', '/blog/', '/contact/']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    }

    await page.goto('/compare/');

    const layout = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
      imageSource:
        document.querySelector<HTMLImageElement>('.compare-product-shot img')?.currentSrc ?? '',
    }));

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.imageSource).toMatch(/electrasim-simulator-(480|800|1200)\.(avif|webp)$/);
    expect(failures).toEqual([]);
  });

  test('serves a noindex 404 with an early meta CSP', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist/');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: 'Page Not Found' })).toBeVisible();
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /\bnoindex\b/);
    await expect(page.locator('meta[http-equiv="Content-Security-Policy"]')).toHaveAttribute(
      'content',
      /default-src 'self'/,
    );
  });

  test('keeps marketing pages usable at a phone viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });

    for (const path of ['/', '/guide/', '/blog/', '/contact/']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Open menu' })).toBeVisible();

      const layout = await page.evaluate(() => {
        const heading = document.querySelector('h1')?.getBoundingClientRect();
        const navigation = document.querySelector('nav')?.getBoundingClientRect();
        return {
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: document.documentElement.clientWidth,
          heading: heading && { left: heading.left, right: heading.right, width: heading.width },
          navigation: navigation && { left: navigation.left, right: navigation.right },
        };
      });

      expect(layout.documentWidth, path).toBeLessThanOrEqual(layout.viewportWidth);
      expect(layout.heading, path).not.toBeNull();
      expect(layout.heading?.left, path).toBeGreaterThanOrEqual(0);
      expect(layout.heading?.right, path).toBeLessThanOrEqual(layout.viewportWidth);
      expect(layout.heading?.width, path).toBeGreaterThan(0);
      expect(layout.navigation?.left, path).toBeGreaterThanOrEqual(0);
      expect(layout.navigation?.right, path).toBeLessThanOrEqual(layout.viewportWidth);
    }

    await page.goto('/');
    const menuButton = page.getByRole('button', { name: 'Open menu' });
    await menuButton.click();
    await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
    await expect(
      page.locator('#nav-mobile-menu').getByRole('link', { name: 'Contact' }),
    ).toBeVisible();
  });

  test('loads the app and every lazy dialog while offline', async ({ context, page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('electrasim:welcomed', '1');
    });

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });

    await page.goto('/app/');
    await expect(page.getByRole('application', { name: 'Circuit diagram' })).toBeVisible();
    await page.getByRole('button', { name: /^Run Simulation$/ }).click();
    await expect(page.getByRole('button', { name: /^Stop$/ })).toBeVisible();
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    // Reload once online so this tab is controlled, then prove the built app
    // and its precached dialog chunks are available with no network.
    await page.reload();
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    await context.setOffline(true);

    try {
      await page.reload();
      await expect(page.getByRole('application', { name: 'Circuit diagram' })).toBeVisible();

      await page.getByRole('button', { name: 'Guides' }).click();
      await expect(page.getByRole('heading', { name: 'Guided Circuits' })).toBeVisible();
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Menu' }).click();
      await page.getByRole('button', { name: /^Settings Preferences & display options$/ }).click();
      await expect(page.getByRole('heading', { name: /Circuit Settings/ })).toBeVisible();
      await page.keyboard.press('Escape');

      await page.keyboard.press('Control+e');
      await expect(page.getByText('Import / Export', { exact: true }).first()).toBeVisible();
      await page.keyboard.press('Escape');

      await page.getByRole('button', { name: 'Menu' }).click();
      await page.getByRole('button', { name: /^Documentation\b/ }).click();
      await expect(page.getByRole('heading', { name: 'ElectraSim Documentation' })).toBeVisible();
      await page.getByRole('button', { name: 'Back to editor' }).click();

      await page.getByRole('button', { name: 'Menu' }).click();
      await page.getByRole('button', { name: /^Contact\b/ }).click();
      await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
      await page.keyboard.press('Escape');
    } finally {
      await context.setOffline(false);
    }

    expect(errors).toEqual([]);
  });
});
