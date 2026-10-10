import { randomUUID } from 'node:crypto';
import { type Page, expect, test } from '@playwright/test';
async function account(page: Page, role: string) {
  const email = `${randomUUID()}@admin-browser.test`;
  const response = await page.request.post('/api/auth/sign-up/email', {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { name: 'Admin browser test', email, password: 'Local-password-123!' },
  });
  expect(response.ok()).toBe(true);
  const { user } = await response.json();
  const promoted = await page.request.post('/api/__test/role', {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { role },
  });
  expect(promoted.ok()).toBe(true);
  return { id: user.id as string, email };
}
async function confirm(page: Page, reason = 'Browser lifecycle test') {
  await page.getByLabel('Reason', { exact: true }).fill(reason);
  await page.getByRole('button', { name: 'Confirm change', exact: true }).click();
  await expect(page.getByText('Change saved and audited.')).toBeVisible();
}
async function plan(page: Page) {
  const name = `Browser plan ${randomUUID()}`;
  await page.getByRole('button', { name: 'Create plan', exact: true }).click();
  await page.getByLabel('Plan name', { exact: true }).fill(name);
  await page.getByLabel('Slug', { exact: true }).fill(name.toLowerCase().replaceAll(' ', '-'));
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('active');
  await page.locator('input[name="benefit:pro_components"]').check();
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await page.getByRole('button', { name: 'Back to edit' }).click();
  await expect(page.getByLabel('Plan name', { exact: true })).toHaveValue(name);
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await confirm(page);
  return name;
}
test('real super-admin plan, grant, extend, suspend, resume, revoke and audit lifecycle', async ({
  page,
}) => {
  test.setTimeout(90000);
  const member = await account(page, 'super_admin');
  await page.goto('/admin/pro/');
  const name = await plan(page);
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  await page.getByRole('button', { name: 'Create grant', exact: true }).click();
  await page.getByLabel('Search name or email').fill(member.email);
  await page
    .getByRole('combobox', { name: 'Selected member', exact: true })
    .selectOption(member.id);
  await page
    .getByRole('combobox', { name: 'Selected plan', exact: true })
    .selectOption({ label: name });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.screenshot({
    path: `.wrangler/phase18-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await confirm(page);
  let membership = await (await page.request.get('/api/me/membership')).json();
  expect(membership.capabilities).toContain('pro_components');
  await page.getByRole('button', { name: `Edit ${member.id}`, exact: true }).click();
  await page.getByLabel('No expiry', { exact: true }).uncheck();
  await page.getByLabel('Ends at (UTC)').fill('2035-01-01T00:00');
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('suspended');
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await confirm(page);
  membership = await (await page.request.get('/api/me/membership')).json();
  expect(membership.capabilities).not.toContain('pro_components');
  await page.getByRole('button', { name: `Edit ${member.id}`, exact: true }).click();
  await page.getByRole('combobox', { name: 'Status', exact: true }).selectOption('active');
  await page.getByLabel('Ends at (UTC)').fill('2036-01-01T00:00');
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await confirm(page);
  membership = await (await page.request.get('/api/me/membership')).json();
  expect(membership.capabilities).toContain('pro_components');
  await page.getByRole('button', { name: 'Plans', exact: true }).click();
  await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
  await expect(page.getByText(/1 affected members/)).toBeVisible();
  await page.getByRole('button', { name: 'Remove record' }).click();
  await expect(page.getByText(/Archive this plan/)).toBeVisible();
  await confirm(page);
  membership = await (await page.request.get('/api/me/membership')).json();
  expect(membership.capabilities).toContain('pro_components');
  await page.getByRole('button', { name: 'Members', exact: true }).click();
  await page.getByRole('button', { name: `Edit ${member.id}`, exact: true }).click();
  await page.getByRole('button', { name: 'Revoke grant' }).click();
  await confirm(page);
  membership = await (await page.request.get('/api/me/membership')).json();
  expect(membership.capabilities).not.toContain('pro_components');
  await page.getByRole('button', { name: 'Audit', exact: true }).click();
  await expect(page.getByText(/Browser lifecycle test/).first()).toBeVisible();
});
for (const role of ['individual', 'admin', 'moderator', 'org_owner']) {
  test(`${role} denied by UI and real API`, async ({ page }) => {
    await account(page, role);
    await page.goto('/admin/pro/');
    await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create plan', exact: true })).toHaveCount(0);
    expect((await page.request.get('/api/admin/pro/plans')).status()).toBe(403);
  });
}
test('guest sign-in and expired session clear administration data', async ({ page }) => {
  const member = await account(page, 'super_admin');
  await page.context().clearCookies();
  await page.goto('/admin/pro/');
  await page.getByLabel('Email', { exact: true }).fill(member.email);
  await page.getByLabel('Password', { exact: true }).fill('Local-password-123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Create plan', exact: true })).toBeVisible();
  await page.context().clearCookies();
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create plan', exact: true })).toHaveCount(0);
});
test('stale plan edit requires reload without overwriting the winner', async ({ page }) => {
  await account(page, 'super_admin');
  await page.goto('/admin/pro/');
  const name = await plan(page);
  await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
  const plans = await (await page.request.get('/api/admin/pro/plans?limit=100')).json();
  const row = plans.items.find((item: { name: string }) => item.name === name);
  const changed = await page.request.patch(`/api/admin/pro/plans/${row.id}`, {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { version: row.version, reason: 'Concurrent update', name: `${name} winner` },
  });
  expect(changed.ok()).toBe(true);
  await page.getByLabel('Description', { exact: true }).fill('Losing edit');
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await page.getByLabel('Reason', { exact: true }).fill('Stale edit');
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.getByRole('button', { name: 'Reload record' })).toBeVisible();
  await page.getByRole('button', { name: 'Reload record' }).click();
  await expect(page.getByLabel('Plan name', { exact: true })).toHaveValue(`${name} winner`);
});

test('benefit translations survive edits and unused records delete with an audit', async ({
  page,
}) => {
  await account(page, 'super_admin');
  await page.goto('/admin/pro/');
  await page.getByRole('button', { name: 'Benefits', exact: true }).click();
  await page.getByRole('button', { name: 'Create benefit', exact: true }).click();
  const key = `browser_${randomUUID().replaceAll('-', '')}`;
  await page.getByLabel('Benefit key', { exact: true }).fill(key);
  await page.getByLabel('English name', { exact: true }).fill(key);
  await page.getByLabel('Name translations (locale-to-text JSON)').fill('{"fr":"Composants"}');
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await confirm(page);
  await page.getByRole('button', { name: `Edit ${key}`, exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  await page.getByLabel('Enabled for access').uncheck();
  await page.getByLabel('Archived from marketing').check();
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await confirm(page);
  const feature = await (await page.request.get(`/api/admin/pro/features/${key}`)).json();
  expect(feature.name.fr).toBe('Composants');
  expect(feature.enabled).toBe(false);
  expect(feature.archivedAt).not.toBeNull();
  await page.getByRole('button', { name: `Edit ${key}`, exact: true }).click();
  await page.getByRole('button', { name: 'Remove record' }).click();
  await expect(page.getByText(/Delete this unreferenced benefit/)).toBeVisible();
  await confirm(page);
  expect((await page.request.get(`/api/admin/pro/features/${key}`)).status()).toBe(404);
  const audit = await (await page.request.get(`/api/admin/pro/audit?targetId=${key}`)).json();
  expect(audit.total).toBe(3);
});

test('role removal clears an open admin screen', async ({ page }) => {
  await account(page, 'super_admin');
  await page.goto('/admin/pro/');
  await expect(page.getByRole('button', { name: 'Create plan', exact: true })).toBeVisible();
  const response = await page.request.post('/api/__test/role', {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { role: 'admin' },
  });
  expect(response.ok()).toBe(true);
  await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Create plan', exact: true })).toHaveCount(0);
});

test('focus revalidation finishes for a valid session and denies a changed role', async ({
  page,
}) => {
  await account(page, 'super_admin');
  await page.goto('/admin/pro/');
  await expect(page.getByRole('button', { name: 'Create plan', exact: true })).toBeVisible();
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/admin/ping')),
    page.evaluate(() => window.dispatchEvent(new Event('focus'))),
  ]);
  await expect(page.getByRole('button', { name: 'Create plan', exact: true })).toBeVisible();
  const response = await page.request.post('/api/__test/role', {
    headers: { Origin: 'http://127.0.0.1:3000' },
    data: { role: 'admin' },
  });
  expect(response.ok()).toBe(true);
  await Promise.all([
    page.waitForResponse((response) => response.url().endsWith('/api/admin/ping')),
    page.evaluate(() => window.dispatchEvent(new Event('focus'))),
  ]);
  await expect(page.getByRole('heading', { name: 'Access denied' })).toBeVisible();
});

test('review cannot erase plan benefits while their choices are still loading', async ({
  page,
}) => {
  await account(page, 'super_admin');
  await page.goto('/admin/pro/');
  const name = await plan(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/admin/pro/features?limit=100&offset=0', async (route) => {
    await pending;
    await route.continue();
  });
  try {
    await page.getByRole('button', { name: `Edit ${name}`, exact: true }).click();
    await expect(page.getByText('Loading benefits…')).toBeVisible();
    await page.getByRole('button', { name: 'Review change', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Wait for benefits to load before reviewing this plan.',
    );
    await expect(page.getByRole('button', { name: 'Confirm change', exact: true })).toHaveCount(0);
  } finally {
    release();
  }
  await expect(page.locator('input[name="benefit:pro_components"]')).toBeChecked();
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await confirm(page);
  const plans = await (await page.request.get('/api/admin/pro/plans?limit=100')).json();
  const row = plans.items.find((item: { name: string }) => item.name === name);
  const detail = await (await page.request.get(`/api/admin/pro/plans/${row.id}`)).json();
  expect(detail.features).toEqual([{ featureKey: 'pro_components', enabled: true, config: {} }]);
});
