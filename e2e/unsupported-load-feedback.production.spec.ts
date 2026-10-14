import { test } from '@playwright/test';
import { exerciseUnsupportedLoadFeedback } from './helpers/unsupported-load-feedback';

for (const width of [1280, 390])
  test(`built LED model feedback uses actual placement and supply edits at ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    await exerciseUnsupportedLoadFeedback(page, `.wrangler/simulation-feedback-built-${width}`);
  });
