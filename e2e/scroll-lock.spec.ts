import { expect, test } from '@playwright/test';

// Verifies the Light Explorer scroll-lock no longer leaks site-wide.
test.describe('scroll lock scoping', () => {
  test('the homepage scrolls normally (no vertical scroll lock)', async ({ page }) => {
    await page.goto('/');
    const lock = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return {
        htmlOverflowY: html.overflowY,
        bodyOverflowY: body.overflowY,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      };
    });
    // `overflow-x: hidden` is a normal site-wide horizontal-scroll guard; the
    // vertical axis is what must stay scrollable.
    expect(lock.htmlOverflowY).not.toBe('hidden');
    expect(lock.bodyOverflowY).not.toBe('hidden');
    // the page is actually scrollable (content taller than the viewport)
    expect(lock.scrollHeight).toBeGreaterThan(lock.clientHeight);
  });

  test('a regular tool page scrolls normally too', async ({ page }) => {
    await page.goto('/tools/cable-size-calculator/');
    const lock = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement);
      return {
        htmlOverflowY: html.overflowY,
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      };
    });
    expect(lock.htmlOverflowY).not.toBe('hidden');
    expect(lock.scrollHeight).toBeGreaterThan(lock.clientHeight);
  });

  test('the explore coming-soon page scrolls normally', async ({ page }) => {
    await page.goto('/explore/');
    const lock = await page.evaluate(() => {
      const html = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      return {
        htmlOverflowY: html.overflowY,
        bodyOverflowY: body.overflowY,
        explorerRoot: Boolean(document.querySelector('.light-explorer-root')),
      };
    });
    expect(lock.explorerRoot).toBe(false);
    expect(lock.htmlOverflowY).not.toBe('hidden');
    expect(lock.bodyOverflowY).not.toBe('hidden');
  });
});
