import { test } from '@playwright/test';
import { exerciseUnsupportedLoadFeedback } from './helpers/unsupported-load-feedback';

test('native L/N placement, 12 V supply edit and 9 W LED wiring report unavailable simulation', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await exerciseUnsupportedLoadFeedback(page, `.wrangler/simulation-feedback-${info.project.name}`);
});
