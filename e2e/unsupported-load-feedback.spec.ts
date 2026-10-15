import { test } from '@playwright/test';
import { exerciseUnsupportedLoadFeedback } from './helpers/unsupported-load-feedback';

test('native L/N placement, 12 V off and 230 V regulated LED operation use calculated results', async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await exerciseUnsupportedLoadFeedback(page, `.wrangler/simulation-feedback-${info.project.name}`);
});
