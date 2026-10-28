import { randomUUID } from 'node:crypto';
import { type APIRequestContext, type Page, expect, test } from '@playwright/test';

const id = 'intermediate-switch';
const origin = () => new URL(test.info().project.use.baseURL as string).origin;
async function account(client: APIRequestContext, role = 'super_admin') {
  const response = await client.post('/api/auth/sign-up/email', {
    headers: { Origin: origin() },
    data: {
      name: 'Component reviewer',
      email: `${randomUUID()}@component-admin.test`,
      password: 'Local-password-123!',
    },
  });
  expect(response.ok()).toBe(true);
  if (role !== 'individual')
    expect(
      (
        await client.post('/api/__test/role', { headers: { Origin: origin() }, data: { role } })
      ).ok(),
    ).toBe(true);
}
async function setAccess(client: APIRequestContext, access: 'free' | 'pro') {
  const response = await client.get(`/api/admin/components/${id}`);
  expect(response.ok()).toBe(true);
  const detail = await response.json();
  if (detail.component.access === access) return;
  const result = await client.patch(`/api/admin/components/${id}/access`, {
    headers: { Origin: origin() },
    data: {
      version: detail.version,
      policyRevision: detail.policyRevision,
      access,
      reason: 'Local browser policy fixture',
    },
  });
  expect(result.ok(), await result.text()).toBe(true);
}
const review = (page: Page) =>
  page.getByRole('dialog', { name: 'Review component access', exact: true });
async function search(page: Page, query: string) {
  await page.getByLabel('Search components', { exact: true }).fill(query);
  await page.getByRole('button', { name: 'Search catalogue', exact: true }).click();
}
async function detail(page: Page) {
  // A reload has already mounted this page in the role/session cases. Navigate
  // its hash directly instead of starting another native navigation during load.
  if (new URL(page.url()).pathname === '/admin/components/') {
    await page.evaluate((componentId) => {
      window.location.hash = componentId;
    }, id);
  } else {
    await page.goto(`/admin/components/#${id}`);
  }
  await expect(
    page.getByRole('heading', { name: 'Intermediate Switch', exact: true }),
  ).toBeVisible();
}
async function noOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
}
test.beforeEach(async ({ request }) => {
  await account(request);
  await setAccess(request, 'pro');
});
test.afterEach(async ({ request }) => {
  await setAccess(request, 'pro');
});

test('canonical catalogue filters, pagination, empty search and protected Basic detail', async ({
  page,
}) => {
  await account(page.request);
  await page.goto('/admin/');
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole('navigation', { name: 'Administration' })
    .getByRole('link', { name: 'Components', exact: true })
    .click();
  await expect(
    page.getByText(/116 components · 75 protected Basic · policy revision/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Next components', exact: true }).click();
  await expect(
    page.getByText('116 matching components · page 2 of 10', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Component access filter', exact: true })
    .selectOption('protected');
  await expect(
    page.getByText('75 matching components · page 1 of 7', { exact: true }),
  ).toBeVisible();
  await page
    .getByRole('combobox', { name: 'Component access filter', exact: true })
    .selectOption('pro');
  await expect(
    page.getByText('41 matching components · page 1 of 4', { exact: true }),
  ).toBeVisible();
  const category = await page
    .getByRole('combobox', { name: 'Component category', exact: true })
    .locator('option')
    .nth(1)
    .getAttribute('value');
  // Native options without explicit values use their text content.
  const categoryValue =
    category ??
    (await page
      .getByRole('combobox', { name: 'Component category', exact: true })
      .locator('option')
      .nth(1)
      .innerText());
  await page
    .getByRole('combobox', { name: 'Component access filter', exact: true })
    .selectOption('all');
  await page
    .getByRole('combobox', { name: 'Component category', exact: true })
    .selectOption(categoryValue);
  await expect(page.getByRole('row').nth(1)).toContainText(categoryValue);
  await page.getByRole('combobox', { name: 'Component category', exact: true }).selectOption('');
  await search(page, 'not-a-canonical-component');
  await expect(page.getByText('No matching components', { exact: true })).toBeVisible();
  await search(page, 'single-way-switch');
  await page.getByRole('link', { name: 'View Single-way Switch', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Single-way Switch', exact: true })).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Basic access locked', exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole('button', { name: /Review .*access|Review Pro requirement/ }),
  ).toHaveCount(0);
  await expect(page.getByText('Saved circuit count: Unavailable', { exact: true })).toBeVisible();
  await expect(page.getByText('Public content count: Unavailable', { exact: true })).toBeVisible();
  await noOverflow(page);
  await page.getByRole('button', { name: 'All components', exact: true }).click();
  await expect(page.getByLabel('Search components', { exact: true })).toBeFocused();
  await expect(
    page.getByText('1 matching components · page 1 of 1', { exact: true }),
  ).toBeVisible();
});

test('reasoned Pro to Free to Pro changes retain history, selection and keyboard focus', async ({
  page,
}) => {
  const firstReason = `First local browser access review ${randomUUID()}`;
  const restoreReason = `Restore Pro after local browser review ${randomUUID()}`;
  await account(page.request);
  await page.goto('/admin/components/');
  await search(page, id);
  await page.getByRole('link', { name: 'View Intermediate Switch', exact: true }).click();
  const open = page.getByRole('button', { name: 'Review free access', exact: true });
  await open.click();
  await expect(review(page).getByLabel('Reason', { exact: true })).toBeFocused();
  await expect(
    review(page).getByRole('button', { name: 'Confirm access change', exact: true }),
  ).toBeDisabled();
  await review(page).getByLabel('Reason', { exact: true }).fill('   ');
  await expect(
    review(page).getByRole('button', { name: 'Confirm access change', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(open).toBeFocused();
  await expect(review(page)).toHaveCount(0);
  expect(
    (await (await page.request.get(`/api/admin/components/${id}`)).json()).component.access,
  ).toBe('pro');
  await open.click();
  await review(page).getByLabel('Reason', { exact: true }).fill(firstReason);
  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'PATCH' && request.url().endsWith(`/${id}/access`)) writes++;
  });
  let releaseSave!: () => void;
  const heldSave = new Promise<void>((resolve) => {
    releaseSave = resolve;
  });
  let savedOnServer!: () => void;
  const received = new Promise<void>((resolve) => {
    savedOnServer = resolve;
  });
  await page.route(
    `**/api/admin/components/${id}/access`,
    async (route) => {
      const response = await route.fetch();
      savedOnServer();
      await heldSave;
      await route.fulfill({ response });
    },
    { times: 1 },
  );
  await review(page).getByRole('button', { name: 'Confirm access change', exact: true }).click();
  await received;
  await expect(
    review(page).getByRole('button', { name: 'Confirm access change', exact: true }),
  ).toBeDisabled();
  await review(page)
    .locator('form')
    .evaluate((form) => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
  releaseSave();
  await expect(
    page.getByText('Component access saved and audited.', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Review Pro requirement', exact: true }),
  ).toBeVisible();
  expect(writes).toBe(1);
  await expect(
    page.getByRole('heading', { name: 'Intermediate Switch', exact: true }),
  ).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`/admin/components/#${id}$`));
  await expect(page.getByText(`Reason: ${firstReason}`, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Review Pro requirement', exact: true }).click();
  await expect(review(page)).toContainText('no component is removed');
  await review(page).getByLabel('Reason', { exact: true }).fill(restoreReason);
  await review(page).getByRole('button', { name: 'Confirm access change', exact: true }).click();
  await expect(open).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Intermediate Switch', exact: true }),
  ).toBeFocused();
  await expect(page.getByText(`Reason: ${restoreReason}`, { exact: true })).toBeVisible();
  await expect(page.getByText(`Reason: ${firstReason}`, { exact: true })).toBeVisible();
  await page
    .locator('.history-entry')
    .first()
    .getByText('Before and after', { exact: true })
    .click();
  await expect(page.locator('.history-entry').first().locator('pre')).toContainText(
    'policyRevision',
  );
  await noOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: test.info().outputPath('component-detail.png'), fullPage: true });
});

test('concurrent real policy change blocks stale review and requires fresh values and reason', async ({
  page,
  request,
}) => {
  await account(page.request);
  await detail(page);
  await page.getByRole('button', { name: 'Review free access', exact: true }).click();
  await review(page).getByLabel('Reason', { exact: true }).fill('Stale reason must not replay');
  await setAccess(request, 'free');
  await review(page).getByRole('button', { name: 'Confirm access change', exact: true }).click();
  await expect(review(page).getByRole('alert')).toContainText(/changed|reload/i);
  await expect(
    review(page).getByRole('button', { name: 'Confirm access change', exact: true }),
  ).toBeDisabled();
  await review(page).getByRole('button', { name: 'Back to component', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Review free access', exact: true }),
  ).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Reload the current policy');
  await page.getByRole('button', { name: 'Reload current policy', exact: true }).click();
  await expect(review(page)).toHaveCount(0);
  await page.getByRole('button', { name: 'Review Pro requirement', exact: true }).click();
  await expect(review(page).getByLabel('Reason', { exact: true })).toHaveValue('');
  await review(page).getByLabel('Reason', { exact: true }).fill('Fresh conflict recovery review');
  await review(page).getByRole('button', { name: 'Confirm access change', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Review free access', exact: true })).toBeVisible();
  const record = await (await page.request.get(`/api/admin/components/${id}`)).json();
  expect(
    record.history.some(
      (event: { reason: string }) => event.reason === 'Stale reason must not replay',
    ),
  ).toBe(false);
  expect(record.history[0].reason).toBe('Fresh conflict recovery review');
});

test('ordinary staff direct URL and API denial, revoked reviewer and expired session clear protected data', async ({
  page,
}) => {
  await account(page.request, 'admin');
  await page.goto('/admin/components/');
  await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Components', exact: true })).toHaveCount(0);
  expect((await page.request.get('/api/admin/components')).status()).toBe(403);
  await page.request.post('/api/__test/role', {
    headers: { Origin: origin() },
    data: { role: 'super_admin' },
  });
  await page.reload();
  await detail(page);
  await page.getByRole('button', { name: 'Review free access', exact: true }).click();
  await review(page).getByLabel('Reason', { exact: true }).fill('Revoked reviewer must not write');
  await page.request.post('/api/__test/role', {
    headers: { Origin: origin() },
    data: { role: 'admin' },
  });
  await review(page).getByRole('button', { name: 'Confirm access change', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
  await expect(review(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Intermediate Switch', exact: true })).toHaveCount(
    0,
  );
  await page.request.post('/api/__test/role', {
    headers: { Origin: origin() },
    data: { role: 'super_admin' },
  });
  await page.reload();
  await detail(page);
  await page.getByRole('button', { name: 'Review free access', exact: true }).click();
  await review(page).getByLabel('Reason', { exact: true }).fill('Expired session must not write');
  await page.request.post('/api/auth/sign-out', { headers: { Origin: origin() }, data: {} });
  await review(page).getByRole('button', { name: 'Confirm access change', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(review(page)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Intermediate Switch', exact: true })).toHaveCount(
    0,
  );
});

test('loading, server failure retry, unknown component and obsolete response recovery', async ({
  page,
}) => {
  await account(page.request);
  // Transport controls only: successful payloads still come from actual handlers/D1.
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let entered!: () => void;
  const seen = new Promise<void>((resolve) => {
    entered = resolve;
  });
  await page.route(
    '**/api/admin/components?**',
    async (route) => {
      entered();
      await waiting;
      await route.continue();
    },
    { times: 1 },
  );
  await page.goto('/admin/components/');
  await seen;
  await expect(page.getByText('Loading component catalogue…', { exact: true })).toBeVisible();
  release();
  await expect(page.getByText(/116 components · 75 protected Basic/)).toBeVisible();
  await page.route(
    '**/api/admin/components?**',
    (route) => route.fulfill({ status: 503, json: { error: 'Catalogue storage unavailable' } }),
    { times: 1 },
  );
  await search(page, 'switch');
  await expect(page.getByRole('alert')).toHaveText('Catalogue storage unavailable');
  await expect(page.getByRole('heading', { name: 'Component access', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Component access', exact: true })).toBeVisible();
  await page.goto('/admin/components/#unknown-component');
  await expect(
    page.getByRole('heading', { name: 'Component unavailable', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'All components', exact: true }).click();
  let releaseOld!: () => void;
  const old = new Promise<void>((resolve) => {
    releaseOld = resolve;
  });
  let oldEntered!: () => void;
  const oldSeen = new Promise<void>((resolve) => {
    oldEntered = resolve;
  });
  await page.route(
    `**/api/admin/components/${id}`,
    async (route) => {
      const response = await route.fetch();
      oldEntered();
      await old;
      await route.fulfill({ response });
    },
    { times: 1 },
  );
  await page.evaluate((value) => {
    window.location.hash = value;
  }, id);
  await oldSeen;
  await expect(page.getByText('Loading component detail…', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    window.location.hash = 'single-way-switch';
  });
  await expect(page.getByRole('heading', { name: 'Single-way Switch', exact: true })).toBeVisible();
  releaseOld();
  await expect(page.getByRole('heading', { name: 'Single-way Switch', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Intermediate Switch', exact: true })).toHaveCount(
    0,
  );
  await noOverflow(page);
});
