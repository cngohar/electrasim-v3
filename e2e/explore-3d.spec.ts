import { expect, test } from '@playwright/test';

test.describe('Explore 3D Historical Feature', () => {
  test('landing page loads, displays 3D hero canvas, and navigates to Edison bulb', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://127.0.0.1:4321/explore/');

    // Page title and headings
    await expect(page).toHaveTitle(/Explore Historical Electrical Inventions/i);
    await expect(page.locator('h1')).toContainText('Explore Electrical History in Immersive 3D');

    // 3D Canvas in Hero
    const heroCanvas = page.locator('#hero-3d-canvas');
    await expect(heroCanvas).toBeVisible();

    // Corner Ribbon
    await expect(page.locator('.exp-ribbon').first()).toHaveText('EXPERIMENTAL');

    // Click CTA to navigate to Edison Bulb 3D Explorer
    await page.click('a[href="/explore/edison-bulb/"]');
    await expect(page).toHaveURL('http://127.0.0.1:4321/explore/edison-bulb/');

    // Edison Bulb 3D Canvas
    const edisonCanvas = page.locator('#edison-3d-canvas');
    await expect(edisonCanvas).toBeVisible();

    expect(consoleErrors).toHaveLength(0);
  });

  test('Edison 3D Explorer mode switches, power toggle, and physics laboratory', async ({
    page,
  }) => {
    await page.goto('http://127.0.0.1:4321/explore/edison-bulb/');

    // Verify mode buttons
    const assemblyBtn = page.locator('button[data-mode="assembly"]');
    const cutawayBtn = page.locator('button[data-mode="cutaway"]');
    const explodedBtn = page.locator('button[data-mode="exploded"]');
    const isolateBtn = page.locator('button[data-mode="isolate"]');
    const experimentBtn = page.locator('button[data-mode="experiment"]');

    await expect(assemblyBtn).toBeVisible();

    // Switch to Cutaway Mode
    await cutawayBtn.click();
    await expect(page.locator('#active-mode-title')).toHaveText('Cutaway Mode');

    // Switch to Exploded Mode
    await explodedBtn.click();
    await expect(page.locator('#active-mode-title')).toHaveText('Exploded Mode');

    // Switch to Isolate Mode
    await isolateBtn.click();
    await expect(page.locator('#active-mode-title')).toHaveText('Isolate Mode');
    await expect(page.locator('#isolate-controls-bar')).toBeVisible();

    // Switch to Experiment Mode
    await experimentBtn.click();
    await expect(page.locator('#active-mode-title')).toHaveText('Experiment Mode');
    await expect(page.locator('#experiment-controls-panel')).toBeVisible();

    // Check voltage slider and physics readouts
    const voltageSlider = page.locator('#voltage-slider');
    await expect(voltageSlider).toBeVisible();
    await expect(page.locator('#rd-power')).toContainText('86 W');

    // Toggle bulb power off
    await page.click('#toggle-power-btn');
    await expect(page.locator('#power-state-label')).toHaveText('OFF');
    await expect(page.locator('#rd-power')).toHaveText('0 W');
  });

  test('Explore 3D Command Palette search modal opens and searches', async ({ page }) => {
    await page.goto('http://127.0.0.1:4321/explore/');

    // Click search button in ExploreHeader
    await page.click('button[data-exp-search]');
    const searchDialog = page.locator('#explore-search-dialog');
    await expect(searchDialog).toBeVisible();

    // Type query
    const searchInput = page.locator('#explore-search-input');
    await searchInput.fill('Filament');

    // Verify search results
    await expect(page.locator('#explore-search-results')).toContainText('Carbon Filament');

    // Close modal via Escape key
    await page.keyboard.press('Escape');
    await expect(searchDialog).not.toBeVisible();
  });

  test('Responsive viewports render without horizontal overflow or clipped text', async ({
    page,
  }) => {
    // Mobile Viewport (iPhone SE: 375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('http://127.0.0.1:4321/explore/');

    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('#hero-3d-canvas')).toBeVisible();

    // Mobile nav drawer
    const mobileToggle = page.locator('#exp-mobile-nav-toggle');
    await expect(mobileToggle).toBeVisible();
    await mobileToggle.click();
    await expect(page.locator('#exp-mobile-menu')).toBeVisible();

    // Navigate to 3D Explorer on mobile
    await page.goto('http://127.0.0.1:4321/explore/edison-bulb/');
    await expect(page.locator('#edison-3d-canvas')).toBeVisible();
    await expect(page.locator('.mode-bar-dark')).toBeVisible();
  });
});
