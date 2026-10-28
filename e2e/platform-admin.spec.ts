import { randomUUID } from 'node:crypto';
import { type APIRequestContext, type Page, expect, test } from '@playwright/test';
import { seriesFixture } from '../packages/domain/src/core/mnaFixtures';
import { adminRegistry } from '../src/platform/registry';

type Account = { id: string; email: string; name: string };
const origin = () => new URL(test.info().project.use.baseURL as string).origin;
async function account(client: APIRequestContext, role = 'super_admin'): Promise<Account> {
  const name = `Operator ${randomUUID()}`;
  const email = `${randomUUID()}@platform-browser.test`;
  const response = await client.post('/api/auth/sign-up/email', {
    headers: { Origin: origin() },
    data: { name, email, password: 'Local-password-123!' },
  });
  expect(response.ok()).toBe(true);
  const { user } = await response.json();
  if (role !== 'individual')
    expect(
      (
        await client.post('/api/__test/role', { headers: { Origin: origin() }, data: { role } })
      ).ok(),
    ).toBe(true);
  return { id: user.id, email, name };
}
async function change(
  client: APIRequestContext,
  path: string,
  data: Record<string, unknown>,
  method = 'POST',
) {
  const access = await client.get('/api/admin/access');
  expect(access.ok()).toBe(true);
  const { version } = await access.json();
  const response = await client.fetch(`/api/admin/${path}`, {
    method,
    headers: { Origin: origin() },
    data: { version, reason: 'Browser foundation acceptance', ...data },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return response;
}
async function confirm(page: Page, reason = 'Browser foundation acceptance') {
  const dialog = page.getByRole('dialog', { name: 'Review administrative change', exact: true });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Reason', { exact: true }).fill(reason);
  await dialog.getByRole('button', { name: 'Confirm change', exact: true }).click();
  await expect(page.getByText('Change saved and audited.', { exact: true })).toBeVisible();
  await expect(dialog).toHaveCount(0);
}
async function openUser(page: Page, person: Account, tab = 'Overview') {
  await page.goto('/admin/users/');
  await page.getByLabel('Search ID, name or email prefix').fill(person.email);
  await page.getByRole('button', { name: 'Search users', exact: true }).click();
  await page.getByRole('button', { name: `View ${person.name}`, exact: true }).click();
  await expect(page.getByRole('heading', { name: person.name, exact: true })).toBeVisible();
  if (tab !== 'Overview')
    await page
      .getByRole('tab', { name: tab === 'Access' ? 'Access & roles' : tab, exact: true })
      .click();
}
// Restore code-owned system defaults through the real protected API. Each case
// has a separate browser context and unique accounts; no manual SQL is needed.
test.beforeEach(async ({ request }) => {
  await account(request);
  const policy = Object.fromEntries(
    (['moderator', 'admin'] as const).map((role) => [
      role,
      [...adminRegistry.permissions.values()]
        .filter((p) => p.defaults.includes(role))
        .map((p) => p.key),
    ]),
  );
  await change(request, 'permissions', { policy }, 'PATCH');
});

test('permission-filtered moderator navigation, direct denials, read-only settings and standards', async ({
  page,
}) => {
  await account(page.request, 'moderator');
  await page.goto('/admin/');
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  const nav = page.getByRole('navigation', { name: 'Administration', exact: true });
  await expect(nav.getByRole('link', { name: 'Settings', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Memberships', exact: true })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Read-only access', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Auto-hide threshold', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Review settings', exact: true })).toHaveCount(0);
  await page.goto('/admin/users/');
  await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
  expect((await page.request.get('/api/admin/users')).status()).toBe(403);
  expect((await page.request.get('/api/admin/pro/plans')).status()).toBe(403);
  await page.goto('/admin/standards/');
  await expect(
    page.getByRole('heading', { name: 'Standards reference', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: /edit|save/i })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});

test('custom role create, review/back, assignment, archive and revocation through real screens', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await account(page.request);
  const target = await account(request, 'individual');
  const roleName = `Reviewer ${randomUUID()}`;
  await page.goto('/admin/permissions/');
  await page.getByRole('button', { name: 'Create custom role', exact: true }).click();
  const create = page.getByRole('dialog', { name: 'Create custom role', exact: true });
  await create.getByLabel('Role name', { exact: true }).fill(roleName);
  await create.getByRole('checkbox', { name: 'Read community settings', exact: true }).check();
  await create.getByRole('button', { name: 'Review new role', exact: true }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Review administrative change', exact: true })
      .getByLabel('Reason', { exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('dialog', { name: 'Review administrative change', exact: true }),
  ).toHaveCount(0);
  await expect(create.getByLabel('Role name', { exact: true })).toHaveValue(roleName);
  await create.getByRole('button', { name: 'Review new role', exact: true }).click();
  await confirm(page);
  await expect(page.getByRole('button', { name: `Edit ${roleName}`, exact: true })).toBeVisible();
  await openUser(page, target, 'Access');
  await page.getByRole('checkbox', { name: roleName, exact: true }).check();
  await page.getByRole('button', { name: 'Review staff roles', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('community.settings.read');
  await confirm(page);
  expect((await request.get('/api/admin/access')).status()).toBe(200);
  expect((await request.get('/api/admin/pro/plans')).status()).toBe(403);
  await page.goto('/admin/permissions/');
  await page.getByRole('button', { name: `Edit ${roleName}`, exact: true }).click();
  await page.getByLabel('Archive role', { exact: true }).check();
  await page.getByRole('button', { name: 'Review role change', exact: true }).click();
  await confirm(page);
  expect((await request.get('/api/admin/access')).status()).toBe(403);
  await page.getByRole('button', { name: `Edit ${roleName}`, exact: true }).click();
  await page.getByLabel('Archive role', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Review role change', exact: true }).click();
  await confirm(page);
  expect((await request.get('/api/admin/access')).status()).toBe(200);
  await openUser(page, target, 'Access');
  await page.getByRole('checkbox', { name: roleName, exact: true }).uncheck();
  await page.getByRole('button', { name: 'Review staff roles', exact: true }).click();
  await confirm(page);
  expect((await request.get('/api/admin/access')).status()).toBe(403);
});

test('system permission matrix changes effective access without delegating protected powers', async ({
  page,
  request,
}) => {
  await account(page.request);
  await account(request, 'moderator');
  await page.goto('/admin/permissions/');
  await expect(
    page.getByRole('heading', { name: 'Protected super-admin actions', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('checkbox', {
      name: 'Manage paid plans, grants and membership audit',
      exact: true,
    }),
  ).toHaveCount(0);
  const mod = page;
  await mod
    .getByRole('checkbox', {
      name: 'Moderator permissions: Search users and view contact details',
      exact: true,
    })
    .check();
  await page.getByRole('button', { name: 'Review permission matrix', exact: true }).click();
  await confirm(page);
  expect((await request.get('/api/admin/users')).status()).toBe(200);
  expect((await request.get('/api/admin/pro/plans')).status()).toBe(403);
  await mod
    .getByRole('checkbox', {
      name: 'Moderator permissions: Search users and view contact details',
      exact: true,
    })
    .uncheck();
  await page.getByRole('button', { name: 'Review permission matrix', exact: true }).click();
  await confirm(page);
  expect((await request.get('/api/admin/users')).status()).toBe(403);
});

test('community restriction, revoke, platform suspension and restore preserve private work and grants', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await account(page.request);
  const target = await account(request, 'individual');
  expect(
    (
      await request.post('/api/__test/paid-membership', { headers: { Origin: origin() }, data: {} })
    ).status(),
  ).toBe(201);
  expect(
    (
      await request.post('/api/circuits', {
        headers: { Origin: origin() },
        data: { name: 'Private browser circuit', circuit: seriesFixture() },
      })
    ).status(),
  ).toBe(201);
  await openUser(page, target);
  await page.getByRole('button', { name: 'Review community restriction', exact: true }).click();
  await confirm(page, 'Community browser restriction');
  expect((await (await request.get('/api/me/community-status')).json()).restriction.reason).toBe(
    'Community browser restriction',
  );
  expect((await request.get('/api/circuits')).status()).toBe(200);
  expect((await (await request.get('/api/me/membership')).json()).capabilities).toContain(
    'pro_components',
  );
  await openUser(page, target);
  await page.getByRole('button', { name: 'Review restriction revocation', exact: true }).click();
  await confirm(page);
  expect((await (await request.get('/api/me/community-status')).json()).restriction).toBeNull();
  await openUser(page, target);
  await page.getByRole('button', { name: 'Review platform suspension', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('All active sessions will be revoked');
  await confirm(page);
  expect((await request.get('/api/circuits')).status()).toBe(401);
  expect(
    (
      await request.post('/api/auth/sign-in/email', {
        headers: { Origin: origin() },
        data: { email: target.email, password: 'Local-password-123!' },
      })
    ).status(),
  ).toBe(403);
  await openUser(page, target);
  await page.getByRole('button', { name: 'Review account restoration', exact: true }).click();
  await confirm(page);
  expect((await request.get('/api/circuits')).status()).toBe(401);
  expect(
    (
      await request.post('/api/auth/sign-in/email', {
        headers: { Origin: origin() },
        data: { email: target.email, password: 'Local-password-123!' },
      })
    ).status(),
  ).toBe(200);
  expect(
    (await (await request.get('/api/circuits')).json()).items.some(
      (item: { name: string }) => item.name === 'Private browser circuit',
    ),
  ).toBe(true);
  expect((await (await request.get('/api/me/membership')).json()).capabilities).toContain(
    'pro_components',
  );
});

test('settings conflict requires reload; typed edits and audit filters show the committed outcome', async ({
  page,
}) => {
  const auditReason = `Visible browser audit ${randomUUID()}`;
  await account(page.request);
  await page.goto('/admin/settings/');
  await expect(page.getByLabel('Reports per day', { exact: true })).toBeVisible();
  const current = (await (await page.request.get('/api/admin/settings/community')).json()).values;
  const winner = current.reportsPerDay === 17 ? 18 : 17;
  await page.getByLabel('Writes per minute', { exact: true }).fill('40');
  await change(
    page.request,
    'settings/community',
    { values: { ...current, reportsPerDay: winner } },
    'PATCH',
  );
  await page.getByRole('button', { name: 'Review settings', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Reason', { exact: true }).fill('Stale browser edit');
  await dialog.getByRole('button', { name: 'Confirm change', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Administration changed');
  await expect(dialog.getByRole('button', { name: 'Confirm change', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Reload administration', exact: true }).click();
  await expect(page.getByLabel('Reports per day', { exact: true })).toHaveValue(String(winner));
  await expect(page.getByLabel('Writes per minute', { exact: true })).toHaveValue(
    String(current.writesPerMinute),
  );
  await page
    .getByRole('textbox', { name: 'Banned words (one per line)', exact: true })
    .fill('  SAMPLE  ');
  await page.getByLabel('Pre-moderation', { exact: true }).check();
  await page.getByRole('button', { name: 'Review settings', exact: true }).click();
  await confirm(page, auditReason);
  await expect(
    page.getByRole('textbox', { name: 'Banned words (one per line)', exact: true }),
  ).toHaveValue('sample');
  await page.goto('/admin/audit/');
  await page.getByLabel('Action', { exact: true }).fill('community.settings.update');
  await page.getByRole('button', { name: 'Filter audit', exact: true }).click();
  await expect(page.getByText(auditReason, { exact: true })).toBeVisible();
  const entry = page.getByRole('row').filter({ has: page.getByText(auditReason, { exact: true }) });
  await entry.getByText('View change', { exact: true }).click();
  await expect(entry.locator('pre').last()).toContainText('sample');
});

test('role revocation and session expiry clear private details on focus', async ({
  page,
  request,
}) => {
  const staff = await account(page.request, 'admin');
  await openUser(page, staff);
  const heading = page.getByRole('heading', { name: staff.name, exact: true });
  await expect(heading).toBeVisible();
  await change(request, `users/${staff.id}/roles`, { globalRole: 'individual', roleIds: [] });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
  await expect(heading).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Administration', exact: true })).toHaveCount(
    0,
  );
  expect(
    (
      await page.request.post('/api/__test/role', {
        headers: { Origin: origin() },
        data: { role: 'admin' },
      })
    ).ok(),
  ).toBe(true);
  await page.goto('/admin/users/');
  await expect(page.getByLabel('Search ID, name or email prefix')).toBeVisible();
  expect(
    (
      await page.request.post('/api/auth/sign-out', { headers: { Origin: origin() }, data: {} })
    ).ok(),
  ).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByLabel('Search ID, name or email prefix')).toHaveCount(0);
});

test('late private response cannot restore details after access is revoked', async ({
  page,
  request,
}) => {
  const staff = await account(page.request, 'admin');
  let release = () => {};
  const hold = new Promise<void>((done) => {
    release = done;
  });
  let received = () => {};
  const intercepted = new Promise<void>((done) => {
    received = done;
  });
  await page.route(`**/api/admin/users/${staff.id}`, async (route) => {
    const response = await route.fetch();
    received();
    await hold;
    await route.fulfill({ response });
  });
  await page.goto('/admin/users/');
  await page.getByLabel('Search ID, name or email prefix').fill(staff.email);
  await page.getByRole('button', { name: 'Search users', exact: true }).click();
  await page.getByRole('button', { name: `View ${staff.name}`, exact: true }).click();
  await intercepted;
  await change(request, `users/${staff.id}/roles`, { globalRole: 'individual', roleIds: [] });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
  release();
  await expect(page.getByRole('heading', { name: staff.name, exact: true })).toHaveCount(0);
  await expect(page.getByText(staff.email, { exact: true })).toHaveCount(0);
});

test('loading, storage failure, empty search, keyboard review and phone layout recover', async ({
  page,
}) => {
  await account(page.request);
  await page.route('**/api/admin/users?*', (route) =>
    route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Test storage unavailable' }),
    }),
  );
  await page.goto('/admin/users/');
  await expect(page.getByRole('alert')).toContainText('Test storage unavailable');
  await expect(page.getByLabel('Search ID, name or email prefix')).toHaveCount(0);
  await page.unroute('**/api/admin/users?*');
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await page.getByLabel('Search ID, name or email prefix').fill(`missing-${randomUUID()}`);
  await page.getByRole('button', { name: 'Search users', exact: true }).click();
  await expect(page.getByText('No matching users.', { exact: true })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `.wrangler/platform-admin-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test('explicit super-admin provisioning, protected membership navigation and audit remain available', async ({
  page,
  request,
}) => {
  await account(page.request);
  const target = await account(request, 'individual');
  await openUser(page, target, 'Access');
  await page
    .getByRole('combobox', { name: 'System role', exact: true })
    .selectOption('super_admin');
  await page.getByRole('button', { name: 'Review staff roles', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Provision super admin');
  await dialog
    .getByRole('checkbox', { name: 'I understand this grants super-admin authority.', exact: true })
    .check();
  await confirm(page);
  expect((await request.get('/api/admin/pro/plans')).status()).toBe(200);
  const menu = page.getByRole('button', { name: 'Open navigation', exact: true });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole('navigation', { name: 'Administration', exact: true })
    .getByRole('link', { name: 'Memberships', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Memberships', exact: true })).toBeVisible();
  await page.goto('/admin/');
  await expect(
    page.getByRole('heading', { name: 'Workspace overview', exact: true }),
  ).toBeVisible();
});

test('guest sign-in retains typed credentials across focus changes and signs out cleanly', async ({
  page,
  request,
}) => {
  const user = await account(request);
  await page.goto('/admin/');
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await page.getByLabel('Email', { exact: true }).fill(user.email);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue(user.email);
  await page.getByLabel('Password', { exact: true }).fill('Local-password-123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Workspace overview', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Administration', exact: true })).toHaveCount(
    0,
  );
});

test('approved shell, directory filters, quick view, dedicated route reload and command search use real accounts', async ({
  page,
  request,
}) => {
  await account(page.request);
  const target = await account(request, 'individual');
  await page.goto('/admin/');
  await expect(
    page.getByRole('heading', { name: 'Workspace overview', exact: true }),
  ).toBeVisible();
  await expect(page.getByText('SAMPLE DATA', { exact: true })).toHaveCount(0);
  await page.goto('/admin/users/');
  await page.getByLabel('Search ID, name or email prefix').fill(target.email);
  await page.getByRole('combobox', { name: 'System role', exact: true }).selectOption('individual');
  await page.getByRole('combobox', { name: 'Account status', exact: true }).selectOption('active');
  await page.getByRole('button', { name: 'Search users', exact: true }).click();
  const row = page.getByRole('row').filter({ hasText: target.email });
  await expect(row).toContainText('Individual');
  await row.getByRole('button', { name: `Quick view for ${target.name}`, exact: true }).click();
  const drawer = page.getByRole('dialog', { name: target.name, exact: true });
  await expect(drawer).toContainText(target.id);
  await drawer.getByRole('link', { name: 'Open full profile', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/users/#${target.id}$`));
  await expect(page.getByRole('heading', { name: target.name, exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(
    await page
      .getByRole('tab', { name: 'Overview', exact: true })
      .evaluate((element) => getComputedStyle(element).borderRadius),
  ).toBe('0px');
  await expect(page.getByRole('tab', { name: 'Access & roles', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Memberships', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Activity', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Overview', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Access & roles', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await page.reload();
  await expect(page.getByRole('heading', { name: target.name, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Memberships', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Membership history', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Search workspace', exact: true });
  await search
    .getByRole('textbox', { name: 'Search pages and accounts', exact: true })
    .fill(target.email);
  await expect(search.getByRole('link').filter({ hasText: target.email })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(search).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Search workspace', exact: true })).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
  if (!test.info().project.name.includes('safari'))
    await page.screenshot({
      path: `.wrangler/admin-integrated-${test.info().project.name}.png`,
      fullPage: true,
    });
  await page.goto('/admin/standards/');
  await expect(
    page.getByRole('heading', { name: 'Standards reference', exact: true }),
  ).toBeVisible();
  await expect(page.locator('.standards-grid')).toHaveCount(1);
  await expect(page.locator('.standard-card')).toHaveCount(4);
  if (test.info().project.name === 'chromium')
    await page.screenshot({ path: '.wrangler/admin-parity-standards.png', fullPage: true });
  await page.goto('/admin/settings/');
  await expect(page.locator('.settings-layout')).toBeVisible();
  await expect(page.locator('.settings-form')).toBeVisible();
  if (test.info().project.name === 'chromium')
    await page.screenshot({
      path: '.wrangler/admin-parity-community-settings.png',
      fullPage: true,
    });
  await page.goto('/admin/pro/');
  await expect(
    page.getByRole('tablist', { name: 'Membership sections', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Plans/ })).toBeVisible();
  await expect(page.getByText('Loading…', { exact: true })).toHaveCount(0);
  const membershipHeading = page.locator('.page-heading');
  await expect(
    membershipHeading.getByRole('button', { name: 'Assign membership', exact: true }),
  ).toBeVisible();
  await expect(
    membershipHeading.getByRole('button', { name: 'Create membership plan', exact: true }),
  ).toBeVisible();
  await expect(
    page.locator('.membership-summary').getByRole('button', { name: 'Create membership plan' }),
  ).toHaveCount(0);
  if (test.info().project.name === 'chromium')
    await page.screenshot({ path: '.wrangler/admin-parity-memberships.png', fullPage: true });
});

test('dedicated user membership assignment and grant deep links use protected real storage', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await account(page.request);
  const target = await account(request, 'individual');
  const suffix = randomUUID();
  const planName = `Integrated monthly ${suffix}`;
  const created = await page.request.post('/api/admin/pro/plans', {
    headers: { Origin: origin() },
    data: {
      slug: `integrated-${suffix}`,
      name: planName,
      description: 'Integrated learning access',
      noExpiry: false,
      durationDays: 30,
      status: 'active',
      features: [{ featureKey: 'pro_components', enabled: true, config: {} }],
      reason: 'Integration browser setup',
    },
  });
  expect(created.status()).toBe(201);
  await page.goto(`/admin/users/#${target.id}`);
  await page.getByRole('tab', { name: 'Memberships', exact: true }).click();
  await page.getByRole('link', { name: 'Assign membership', exact: true }).click();
  await expect(page.locator('input[name=userId]')).toHaveValue(target.id);
  await page
    .getByRole('combobox', { name: 'Selected plan', exact: true })
    .selectOption({ label: planName });
  await expect(page.getByLabel('No expiry', { exact: true })).not.toBeChecked();
  await expect(page.getByLabel('Ends at (UTC)', { exact: true })).not.toHaveValue('');
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await expect(page.getByRole('definition').filter({ hasText: target.id })).toBeVisible();
  await page
    .getByLabel('Reason', { exact: true })
    .fill('Assign real monthly access from the user page.');
  await page.getByRole('button', { name: 'Confirm change', exact: true }).click();
  await expect(page.getByText('Change saved and audited.', { exact: true })).toBeVisible();
  expect((await (await request.get('/api/me/membership')).json()).capabilities).toContain(
    'pro_components',
  );
  await page.goto(`/admin/users/#${target.id}`);
  await page.getByRole('tab', { name: 'Memberships', exact: true }).click();
  const grant = page.getByRole('row').filter({ hasText: planName });
  await expect(grant).toContainText('active');
  await grant.getByRole('link', { name: 'Manage grant', exact: true }).click();
  await expect(page.getByRole('combobox', { name: 'Status', exact: true })).toHaveValue('active');
  await expect(page.getByText(`Member ${target.id}`, { exact: false })).toBeVisible();
});

test('ordinary staff command search and dedicated user routes preserve permission and membership boundaries', async ({
  page,
  request,
}) => {
  await account(page.request, 'moderator');
  const target = await account(request, 'individual');
  const directoryCalls: string[] = [];
  page.on('request', (req) => {
    if (new URL(req.url()).pathname === '/api/admin/users') directoryCalls.push(req.url());
  });
  await page.goto('/admin/');
  await expect(
    page.getByRole('heading', { name: 'Workspace overview', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent users', exact: true })).toHaveCount(0);
  await page.keyboard.press('Control+k');
  const search = page.getByRole('dialog', { name: 'Search workspace', exact: true });
  await search
    .getByRole('textbox', { name: 'Search pages and accounts', exact: true })
    .fill(target.email);
  await expect(search.getByText('No matching pages or accounts.', { exact: true })).toBeVisible();
  expect(directoryCalls).toEqual([]);
  await page.keyboard.press('Escape');
  await page.goto(`/admin/users/#${target.id}`);
  await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
  await expect(page.getByText(target.email, { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Membership history', exact: true })).toHaveCount(
    0,
  );
  expect((await page.request.get(`/api/admin/pro/memberships?userId=${target.id}`)).status()).toBe(
    403,
  );
});

test('approved drawer, role matrix, plan preview and account activity use real protected records', async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await account(page.request);
  const target = await account(request, 'individual');
  await change(page.request, `users/${target.id}/community-restrictions`, { endsAt: null });
  const suffix = randomUUID();
  const planName = `Parity plan ${suffix}`;
  const slug = `parity-${suffix}`;
  const created = await page.request.post('/api/admin/pro/plans', {
    headers: { Origin: origin() },
    data: {
      name: planName,
      slug,
      description: 'Real membership preview',
      status: 'active',
      noExpiry: false,
      durationDays: 30,
      features: [{ featureKey: 'pro_components', enabled: true, config: {} }],
      reason: 'Design parity fixture',
    },
  });
  expect(created.status()).toBe(201);
  const plan = await created.json();
  const grant = await page.request.post('/api/admin/pro/memberships', {
    headers: { Origin: origin() },
    data: {
      userId: target.id,
      planId: plan.id,
      status: 'active',
      startsAt: Date.now() - 1000,
      endsAt: Date.now() + 30 * 86400000,
      noExpiry: false,
      reason: 'Design parity fixture',
    },
  });
  expect(grant.status()).toBe(201);
  await page.goto('/admin/pro/');
  const card = page.locator('.plan-card').filter({ hasText: planName });
  await expect(card).toContainText('Pro components');
  await expect(card).toContainText('1 active member');
  await expect(card).toContainText(slug);
  await card.getByRole('button', { name: /Manage plan/ }).click();
  const preview = page.getByRole('article', { name: 'Membership plan preview' });
  await expect(preview).toContainText(planName);
  await expect(preview).toContainText('Pro components');
  await page.getByLabel('Description', { exact: true }).fill('Updated live preview');
  await expect(preview).toContainText('Updated live preview');
  await page.getByRole('button', { name: 'Review change', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Review membership change' })).toBeVisible();
  await page.getByRole('button', { name: 'Back to edit', exact: true }).click();
  await expect(page.getByLabel('Description', { exact: true })).toHaveValue('Updated live preview');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await openUser(page, target);
  await expect(
    page.getByRole('heading', { name: 'Latest account activity', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Membership overview', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Quick view', exact: true }).click();
  const drawer = page.getByRole('dialog', { name: target.name, exact: true });
  await expect(drawer.getByRole('tab', { name: 'Account overview', exact: true })).toBeVisible();
  expect(
    await drawer
      .getByRole('tab', { name: 'Account overview', exact: true })
      .evaluate((element) => getComputedStyle(element).borderRadius),
  ).toBe('0px');
  await expect(drawer).toContainText(planName);
  await drawer.getByRole('tab', { name: 'Access & roles', exact: true }).click();
  await expect(
    drawer.getByRole('button', { name: 'Review staff roles', exact: true }),
  ).toBeVisible();
  await drawer.getByRole('tab', { name: 'Activity', exact: true }).click();
  await expect(drawer).toContainText('Browser foundation acceptance');
  await drawer.getByText('Before and after', { exact: true }).click();
  await expect(drawer.locator('pre').last()).toContainText('endsAt');
  await drawer.getByRole('button', { name: 'Close account', exact: true }).click();
  await page.goto('/admin/permissions/');
  const matrix = page
    .getByRole('table')
    .filter({ has: page.getByRole('columnheader', { name: 'Super admin', exact: true }) });
  await expect(matrix.getByRole('columnheader', { name: 'Moderator', exact: true })).toBeVisible();
  await expect(
    matrix.getByRole('checkbox', {
      name: 'Moderator permissions: Read community settings',
      exact: true,
    }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Create custom role', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Create custom role', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close role editor', exact: true }).click();
  await page.goto('/admin/standards/');
  await expect(page.locator('.standard-card')).toHaveCount(4);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    )
    .toBe(true);
});
