import { randomUUID } from 'node:crypto';
import { type APIRequestContext, type Page, expect, test } from '@playwright/test';
import type { Profile } from '../src/community/profile-policy';
const origin = () => new URL(test.info().project.use.baseURL as string).origin;
const password = 'Local-password-123!';
const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const violations: string[] = [];
    (window as Window & { profileCsp?: string[] }).profileCsp = violations;
    document.addEventListener('securitypolicyviolation', (event) =>
      violations.push(event.violatedDirective),
    );
  });
});
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
  if (!page.isClosed())
    expect(
      await page.evaluate(() => (window as Window & { profileCsp?: string[] }).profileCsp ?? []),
    ).toEqual([]);
});
async function account(client: APIRequestContext, name = 'Maya Chen', role = 'individual') {
  const email = `${randomUUID()}@profiles-browser.test`;
  const response = await client.post('/api/auth/sign-up/email', {
    headers: { Origin: origin() },
    data: { name, email, password },
  });
  expect(response.ok(), await response.text()).toBe(true);
  const data = await response.json();
  if (role !== 'individual')
    expect(
      (
        await client.post('/api/__test/role', { headers: { Origin: origin() }, data: { role } })
      ).ok(),
    ).toBe(true);
  return {
    id: data.user.id as string,
    email,
    handle: `p_${randomUUID().replaceAll('-', '').slice(0, 14)}`,
  };
}
async function profile(client: APIRequestContext) {
  const response = await client.get('/api/me/profile');
  expect(response.ok()).toBe(true);
  return (await response.json()).profile as Profile;
}
function fields(p: Profile, patch: Partial<Profile> = {}) {
  return {
    revision: p.revision,
    displayName: p.displayName,
    handle: p.handle,
    bio: p.bio,
    institution: p.institution,
    level: p.level,
    visibility: p.visibility,
    showInstitution: p.showInstitution,
    showLevel: p.showLevel,
    allowForks: p.allowForks,
    ...patch,
  };
}
async function edit(client: APIRequestContext, patch: Partial<Profile>) {
  const response = await client.patch('/api/me/profile', {
    headers: { Origin: origin() },
    data: fields(await profile(client), patch),
  });
  expect(response.ok(), await response.text()).toBe(true);
  return (await response.json()).profile as Profile;
}
async function claim(
  client: APIRequestContext,
  handle: string,
  visibility: 'public' | 'private' = 'public',
) {
  return edit(client, {
    handle,
    visibility,
    bio: 'Learning practical motor controls.',
    institution: 'Private Northbridge Institute',
    level: 'Educator',
  });
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
async function review(
  page: Page,
  action: string,
  reason = 'Reviewed the current public profile and context.',
) {
  await page.getByRole('button', { name: action, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Review administrative change' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Reason', { exact: true }).fill(reason);
  await dialog.getByRole('button', { name: 'Confirm change', exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
async function screenshot(page: Page, name: string) {
  if (test.info().project.name.includes('safari')) return;
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
    caret: 'initial',
  });
}

test('owner onboarding confirms permanent handle and starts private with optional details hidden', async ({
  page,
}) => {
  const owner = await account(page.request);
  await page.goto('/settings/profile/');
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Private profile' })).toBeChecked();
  await expect(page.getByLabel('Show my institution')).not.toBeChecked();
  await page.getByLabel('Handle', { exact: false }).fill('admin');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('reserved');
  await page.getByLabel('Handle', { exact: false }).fill(owner.handle);
  await page.getByLabel('Bio', { exact: false }).fill('Learning through practical circuit work.');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  const modal = page.getByRole('dialog', { name: `Claim @${owner.handle}?` });
  await expect(modal).toBeVisible();
  await modal.getByRole('button', { name: 'Keep editing' }).click();
  await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.getByRole('button', { name: 'Claim handle & save' }).click();
  await expect(page.getByRole('status')).toContainText('Profile saved');
  await expect(page.getByLabel('Handle', { exact: false })).toHaveAttribute('readonly', '');
  await noOverflow(page);
  await screenshot(page, 'owner-settings');
  await page.getByRole('link', { name: 'View profile', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Maya');
});

test('public profile is real SSR without JavaScript and optional fields stay private', async ({
  page,
  browser,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  await edit(page.request, { bio: 'Plain <script>alert(1)</script> biography.' });
  const anonymous = await browser.newContext({ javaScriptEnabled: false });
  try {
    const view = await anonymous.newPage();
    const response = await view.goto(`${origin()}/u/${owner.handle}`);
    expect(response?.status()).toBe(200);
    await expect(view.getByRole('heading', { name: 'Maya Chen', exact: true })).toBeVisible();
    await expect(view.locator('main')).not.toContainText('Private Northbridge');
    await expect(view.locator('.profile-bio').first()).toContainText('<script>');
    await expect(view.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${origin()}/u/${owner.handle}`,
    );
    const schema = JSON.parse(
      (await view.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    expect(schema.name).toBe('Maya Chen');
    expect(schema.affiliation).toBeUndefined();
    expect(await view.locator('script[src*="/app/assets/"]').count()).toBe(0);
    await noOverflow(view);
  } finally {
    await anonymous.close();
  }
  await page.goto(`/u/${owner.handle}`);
  await expect(page.getByRole('link', { name: 'Edit your profile', exact: false })).toBeVisible();
  await page.getByRole('tab', { name: 'About', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A little about Maya' })).toBeVisible();
  await page.getByRole('tab', { name: 'About', exact: true }).focus();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Circuits', exact: false })).toBeFocused();
  await noOverflow(page);
  await screenshot(page, 'public-profile');
});

test('avatar saves independently, preserves pending text and private/public URLs follow visibility', async ({
  page,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  await page.goto('/settings/profile/');
  await page.getByLabel('Bio', { exact: false }).fill('An unsaved introduction.');
  await page.locator('#photo').setInputFiles({
    name: 'invalid.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(page.getByRole('alert')).toContainText('Choose a JPG');
  // Browser canvas emits a valid static PNG; the server validates container/CRC/dimensions/scanlines.
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#326d69';
    context.fillRect(0, 0, 32, 32);
    return Array.from(
      new Uint8Array(
        await (
          await new Promise<Blob>((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'))
        ).arrayBuffer(),
      ),
    );
  });
  await page
    .locator('#photo')
    .setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from(bytes) });
  await expect(page.getByRole('status')).toContainText('Photo saved');
  await expect(page.getByLabel('Bio', { exact: false })).toHaveValue('An unsaved introduction.');
  await expect(page.locator('.avatar-editor img')).toBeVisible();
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await page.getByRole('radio', { name: 'Private profile' }).check();
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Profile saved');
  expect((await page.request.get(`/api/community/users/${owner.handle}/avatar`)).status()).toBe(
    404,
  );
  await page.getByRole('button', { name: 'Remove photo', exact: true }).click();
  await expect(page.locator('.avatar-editor img')).toHaveCount(0);
  await expect(page.getByRole('status')).toContainText('Photo removed');
});

test('member report appears in staff screens; hide, owner edits, restore and report outcome remain separate', async ({
  page,
  browser,
}) => {
  // Three isolated sign-ins, report submission and two moderation decisions share this case.
  test.setTimeout(60000);
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  const reviewerContext = await browser.newContext({ baseURL: origin() });
  const memberContext = await browser.newContext({ baseURL: origin() });
  try {
    await account(reviewerContext.request, 'Alex Morgan', 'moderator');
    const staff = await reviewerContext.newPage();
    const member = await memberContext.newPage();
    await member.goto(`/u/${owner.handle}`);
    await member.getByRole('button', { name: 'Report profile', exact: true }).click();
    await expect(
      member.getByRole('heading', { name: 'Sign in to report a profile' }),
    ).toBeVisible();
    await member.keyboard.press('Escape');
    await account(member.request, 'Sample reporter');
    await member.getByRole('button', { name: 'Report profile', exact: true }).click();
    await member.getByLabel('Reason', { exact: true }).selectOption('Spam');
    await member
      .getByLabel('Details', { exact: true })
      .fill('Please review this promotional identity.');
    await member.getByRole('button', { name: 'Submit report' }).click();
    await expect(member.getByRole('status')).toContainText('Report submitted');
    await staff.goto(`/admin/community/#${owner.id}`);
    await expect(staff.getByRole('heading', { name: 'Maya Chen', exact: true })).toBeVisible();
    await expect(
      staff.getByText('Please review this promotional identity.', { exact: true }),
    ).toBeVisible();
    await noOverflow(staff);
    await screenshot(staff, 'staff-profile');
    await review(staff, 'Hide profile');
    await expect(staff.getByRole('button', { name: 'Restore profile' })).toBeVisible();
    await page.goto('/settings/profile/');
    await expect(page.getByRole('alert').or(page.locator('.notice.red'))).toContainText('hidden');
    await page.getByLabel('Bio', { exact: false }).fill('Owner updated this hidden profile.');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await member.reload();
    await expect(member.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
    await staff.getByRole('button', { name: 'Reload administration', exact: true }).click();
    await review(staff, 'Dismiss report', 'Insufficient evidence in this specific report.');
    await expect(staff.getByRole('button', { name: 'Restore profile' })).toBeVisible();
    await review(staff, 'Restore profile');
    await member.reload();
    await expect(member.getByRole('heading', { name: 'Maya Chen', exact: true })).toBeVisible();
    await expect(member.locator('.profile-bio').first()).toContainText('Owner updated');
    await staff.getByRole('link', { name: 'Back to profiles & reports' }).click();
    await staff.getByLabel('Search profiles').fill('Maya');
    await expect(staff.locator('.community-list')).toContainText('Maya Chen');
    await staff.getByRole('button', { name: 'Profile reports', exact: true }).click();
    await staff.getByLabel('Report status').selectOption('dismissed');
    await expect(staff.locator('.community-list')).toContainText('Spam');
    await noOverflow(staff);
  } finally {
    await reviewerContext.close();
    await memberContext.close();
  }
});

test('concurrent owner edits lock saving until explicit reload and a fresh staff review', async ({
  page,
  browser,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  await page.goto('/settings/profile/');
  await page.getByLabel('Bio', { exact: false }).fill('Local unsaved edit.');
  await edit(page.request, { bio: 'Competing edit committed first.' });
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload current profile' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save profile', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reload current profile' }).click();
  await expect(page.getByLabel('Bio', { exact: false })).toHaveValue(
    'Competing edit committed first.',
  );
  const staffContext = await browser.newContext({ baseURL: origin() });
  try {
    await account(staffContext.request, 'Alex Morgan', 'moderator');
    const staff = await staffContext.newPage();
    await staff.goto(`/admin/community/#${owner.id}`);
    await staff.getByRole('button', { name: 'Hide profile', exact: true }).click();
    const dialog = staff.getByRole('dialog', { name: 'Review administrative change' });
    await dialog
      .getByLabel('Reason', { exact: true })
      .fill('Old review reason must not be reused.');
    await edit(page.request, { bio: 'Changed again during moderation review.' });
    await dialog.getByRole('button', { name: 'Confirm change' }).click();
    await expect(dialog.getByRole('alert')).toContainText('changed');
    await expect(dialog.getByRole('button', { name: 'Confirm change' })).toBeDisabled();
    await dialog.getByRole('button', { name: 'Back to edit' }).click();
    await expect(staff.getByRole('button', { name: 'Hide profile', exact: true })).toBeDisabled();
    await staff.getByRole('button', { name: 'Reload administration', exact: true }).click();
    await staff.getByRole('button', { name: 'Hide profile', exact: true }).click();
    await expect(staff.getByRole('dialog').getByLabel('Reason', { exact: true })).toHaveValue('');
    await staff.keyboard.press('Escape');
  } finally {
    await staffContext.close();
  }
});

test('staff removal remains unavailable after owner edits; ordinary accounts cannot open staff screens', async ({
  page,
  browser,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  await page.goto('/admin/community/');
  await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Learning practical motor controls');
  const staffContext = await browser.newContext({ baseURL: origin() });
  try {
    await account(staffContext.request, 'Alex Morgan', 'moderator');
    const staff = await staffContext.newPage();
    await staff.goto(`/admin/community/#${owner.id}`);
    await review(staff, 'Remove profile');
    await expect(staff.getByRole('button', { name: 'Restore profile' })).toHaveCount(0);
    await expect(staff.locator('main')).toContainText('Tombstone retained');
    await edit(page.request, { bio: 'Owner edit after removal' });
    await page.goto(`/u/${owner.handle}`);
    await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
    await expect(page.locator('main')).not.toContainText('Owner edit after removal');
  } finally {
    await staffContext.close();
  }
});

test('expired owner session clears private drafts and sign-in returns to authenticated editing', async ({
  page,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  await page.goto('/settings/profile/');
  await page.getByLabel('Bio', { exact: false }).fill('Sensitive unsaved profile draft.');
  expect(
    (
      await page.request.post('/api/auth/sign-out', { headers: { Origin: origin() }, data: {} })
    ).ok(),
  ).toBe(true);
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Sensitive unsaved');
  await page.getByLabel('Email', { exact: true }).fill(owner.email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Make yourself at home.' })).toBeVisible();
  await expect(page.getByLabel('Bio', { exact: false })).toHaveValue(
    'Learning practical motor controls.',
  );
});

test('owner loading, failed save and service retry never present an unsaved profile as saved', async ({
  page,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/me/profile', async (route) => {
    if (route.request().method() === 'GET') {
      await wait;
      await route.continue();
    } else await route.continue();
  });
  await page.goto('/settings/profile/');
  await expect(page.getByText('Loading your profile…')).toBeVisible();
  release();
  await expect(page.getByLabel('Bio', { exact: false })).toBeVisible();
  await page.unroute('**/api/me/profile');
  await page.route('**/api/me/profile', async (route) => {
    if (route.request().method() === 'PATCH')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Local test service interruption' }),
      });
    else await route.continue();
  });
  await page.getByLabel('Bio', { exact: false }).fill('This must not appear as saved.');
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Profile unavailable', exact: true }),
  ).toBeVisible();
  await expect(page.locator('main')).not.toContainText('This must not appear as saved.');
  await page.unroute('**/api/me/profile');
  await page.getByRole('button', { name: 'Check access again' }).click();
  await expect(page.getByLabel('Bio', { exact: false })).toHaveValue(
    'Learning practical motor controls.',
  );
});

test('read-only staff can inspect reports without moderation actions; revoked access clears the profile', async ({
  page,
  browser,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  const staffContext = await browser.newContext({ baseURL: origin() });
  try {
    const reader = await account(staffContext.request, 'Read-only reviewer');
    const role = `reader-${randomUUID()}`;
    expect(
      (
        await page.request.post('/api/__profiles/sql', {
          headers: { Origin: origin() },
          data: {
            statements: [
              {
                sql: 'INSERT INTO admin_roles(id,name,version,updated_at) VALUES(?,?,1,1)',
                args: [role, role],
              },
              {
                sql: 'INSERT INTO admin_role_permissions VALUES(?,?)',
                args: [role, 'community.profiles.read'],
              },
              {
                sql: 'INSERT INTO admin_role_permissions VALUES(?,?)',
                args: [role, 'community.reports.read'],
              },
              { sql: 'INSERT INTO admin_user_roles VALUES(?,?)', args: [reader.id, role] },
            ],
          },
        })
      ).ok(),
    ).toBe(true);
    const staff = await staffContext.newPage();
    await staff.goto(`/admin/community/#${owner.id}`);
    await expect(staff.getByRole('heading', { name: 'Maya Chen', exact: true })).toBeVisible();
    await expect(staff.getByRole('button', { name: 'Hide profile', exact: true })).toHaveCount(0);
    await expect(staff.getByRole('heading', { name: 'Profile action history' })).toHaveCount(0);
    expect(
      (
        await staff.request.post('/api/auth/sign-out', { headers: { Origin: origin() }, data: {} })
      ).ok(),
    ).toBe(true);
    await staff.getByRole('button', { name: 'Reload administration', exact: true }).click();
    await expect(staff.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(staff.locator('main')).not.toContainText('Maya Chen');
  } finally {
    await staffContext.close();
  }
});

test('pending owner saves cannot repeat; an obsolete private response cannot replace a reload', async ({
  page,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  await page.goto('/settings/profile/');
  await page.getByLabel('Bio', { exact: false }).fill('One deliberate save.');
  let calls = 0;
  let release: () => void = () => {};
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/api/me/profile', async (route) => {
    if (route.request().method() === 'PATCH') {
      calls++;
      await wait;
    }
    await route.continue();
  });
  await page.getByRole('button', { name: 'Save profile', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  await page.locator('form.panel').evaluate((form) => (form as HTMLFormElement).requestSubmit());
  expect(calls).toBe(1);
  release();
  await expect(page.getByRole('status')).toContainText('Profile saved');
  await page.unroute('**/api/me/profile');
  // Deliver an older response after a full navigation; the disposed component ignores it.
  const old = await profile(page.request);
  let delayed: () => void = () => {};
  const pause = new Promise<void>((resolve) => {
    delayed = resolve;
  });
  await page.route('**/api/me/profile', async (route) => {
    if (route.request().method() === 'GET') {
      await pause;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ profile: { ...old, bio: 'Obsolete private response' } }),
      });
    } else await route.continue();
  });
  await page.reload();
  await expect(page.getByText('Loading your profile…')).toBeVisible();
  await page.goto(`/u/${owner.handle}`);
  delayed();
  await expect(page.getByRole('heading', { name: 'Maya Chen', exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('Obsolete private response');
  await page.unroute('**/api/me/profile');
});
