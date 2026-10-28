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
  reason = 'Reviewed the published snapshot and current context.',
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

const circuit = {
  components: [{ id: 'light', type: 'bulb', x: 100, y: 100, rotation: 0, state: {} }],
  wires: [],
};
async function save(client: APIRequestContext, name = 'Private working circuit') {
  const r = await client.post('/api/circuits', {
    headers: { Origin: origin() },
    data: { name, circuit },
  });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()) as { id: string; version: number };
}
async function publish(
  client: APIRequestContext,
  s: { id: string; version: number },
  title = 'Shared teaching circuit',
) {
  const r = await client.post('/api/community/publications', {
    headers: { Origin: origin() },
    data: {
      sourceCircuitId: s.id,
      sourceVersion: s.version,
      title,
      description: 'A fixed learning snapshot.',
      tags: ['learning'],
    },
  });
  expect(r.status(), await r.text()).toBe(201);
  return (await r.json()).publication as {
    id: string;
    slug: string;
    revision: number;
    currentVersionId: string;
  };
}
async function sql(client: APIRequestContext, statements: { sql: string; args?: unknown[] }[]) {
  const r = await client.post('/api/__profiles/sql', {
    headers: { Origin: origin() },
    data: { statements },
  });
  expect(r.ok(), await r.text()).toBe(true);
}
async function choose(page: Page, id: string) {
  await page.goto(`/settings/publications/?source=${id}`);
  await expect(page.getByLabel('Publication title')).toBeVisible();
}
async function confirmPublish(page: Page, name = 'Publish circuit') {
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name, exact: true }).click();
}

test('owner publishes fixed saved versions, republishes and withdraws through the real UI', async ({
  page,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  const s = await save(page.request);
  await choose(page, s.id);
  await page.getByLabel('Publication title').fill('A lighting exercise');
  await page.getByLabel('Description', { exact: true }).fill('A fixed published version.');
  await page.getByLabel('Tags', { exact: true }).fill('lighting, learning');
  await confirmPublish(page);
  await expect(page.getByRole('status')).toContainText('Published version 1.');
  await expect(page.getByRole('heading', { name: 'Snapshot history' })).toBeVisible();
  const p = (await (await page.request.get('/api/me/publications')).json()).items[0];
  const changed = structuredClone(circuit);
  changed.components[0].x = 220;
  expect(
    (
      await page.request.patch(`/api/circuits/${s.id}`, {
        headers: { Origin: origin() },
        data: { version: 1, name: 'New private edit', circuit: changed },
      })
    ).ok(),
  ).toBe(true);
  const old = (
    await (
      await page.request.get(`/api/community/publications/${p.slug}/versions/${p.currentVersionId}`)
    ).json()
  ).version;
  expect(old.circuit.components[0].x).toBe(100);
  await page.getByRole('button', { name: 'Reload publication', exact: true }).click();
  await expect(
    page.getByText('Publishing saved circuit version 2.', { exact: false }),
  ).toBeVisible();
  await confirmPublish(page, 'Publish new version');
  await expect(page.getByRole('status')).toContainText('Published version 2.');
  await noOverflow(page);
  await screenshot(page, 'publication-owner-history');
  await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Publication unpublished');
  expect((await page.request.get(`/api/community/publications/${p.slug}`)).status()).toBe(404);
  await confirmPublish(page, 'Publish new version');
  await expect(page.getByRole('status')).toContainText('Published version 3.');
  page.once('dialog', (d) => void d.accept());
  await page.getByRole('button', { name: 'Remove publication', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Tombstone retained');
  await expect(
    page.getByText('This publication is permanently removed.', { exact: false }),
  ).toBeVisible();
});

test('stale saved revision requires reload and review before republishing', async ({ page }) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  const s = await save(page.request);
  await choose(page, s.id);
  await page.request.patch(`/api/circuits/${s.id}`, {
    headers: { Origin: origin() },
    data: { version: 1, name: 'Changed in another tab', circuit },
  });
  await confirmPublish(page);
  await expect(page.getByRole('alert')).toContainText('Saved circuit changed');
  await expect(page.getByRole('button', { name: 'Publish circuit', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Reload publication', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Publish circuit', exact: true })).toBeEnabled();
  await confirmPublish(page);
  await expect(page.getByRole('status')).toContainText('Published version 1.');
});

test('handle onboarding and expired sessions deny publishing and clear private details', async ({
  page,
}) => {
  await account(page.request);
  const s = await save(page.request);
  await choose(page, s.id);
  await expect(page.getByRole('button', { name: 'Publish circuit', exact: true })).toBeDisabled();
  await expect(page.getByText('Choose your community handle', { exact: false })).toBeVisible();
  await page.request.post('/api/auth/sign-out', { headers: { Origin: origin() }, data: {} });
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading', { name: 'Sign in to publish' })).toBeVisible();
  await expect(page.getByLabel('Publication title')).toHaveCount(0);
});

test('a publication remains withdrawable after its source is deleted', async ({ page }) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  const s = await save(page.request);
  const p = await publish(page.request, s);
  await page.request.delete(`/api/circuits/${s.id}`, {
    headers: { Origin: origin() },
    data: { version: 1 },
  });
  await page.goto('/settings/publications/');
  await page.getByRole('button', { name: 'Manage Shared teaching circuit', exact: true }).click();
  await expect(
    page.getByText('The private source circuit was deleted.', { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Snapshot history' })).toBeVisible();
  await page.getByRole('button', { name: 'Unpublish', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Publication unpublished');
  expect((await page.request.get(`/api/community/publications/${p.slug}/versions`)).status()).toBe(
    404,
  );
});

test('public profile cards, snapshot history and private reporting use real published data', async ({
  page,
  browser,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  const p = await publish(page.request, await save(page.request), 'Visible learning circuit');
  const context = await browser.newContext();
  try {
    const visitor = await context.newPage();
    await visitor.goto(`${origin()}/u/${owner.handle}`);
    await expect(visitor.getByRole('heading', { name: 'Visible learning circuit' })).toBeVisible();
    await visitor.getByRole('button', { name: 'View snapshot' }).click();
    const dialog = visitor.getByRole('dialog', { name: 'Visible learning circuit' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Version 1:', { exact: false })).toBeVisible();
    await dialog.getByLabel('Reason', { exact: true }).selectOption('Unsafe or misleading');
    await dialog.getByLabel('Details', { exact: true }).fill('Please review the circuit labels.');
    await dialog.getByRole('button', { name: 'Submit publication report' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Authentication required');
    await account(context.request, 'Reporter');
    await dialog.getByRole('button', { name: 'Submit publication report' }).click();
    await expect(dialog.getByRole('status')).toContainText('Report submitted');
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(visitor.getByRole('button', { name: 'View snapshot' })).toBeFocused();
    expect((await page.request.get(`/api/community/publications/${p.slug}`)).status()).toBe(200);
    await noOverflow(visitor);
  } finally {
    await context.close();
  }
});

test('staff inspect a published snapshot and complete hide, report outcome and restore in the shared shell', async ({
  page,
  browser,
}) => {
  const ownerContext = await browser.newContext();
  try {
    const owner = await account(ownerContext.request);
    await claim(ownerContext.request, owner.handle);
    const s = await save(ownerContext.request);
    const p = await publish(ownerContext.request, s);
    await account(page.request, 'Review staff', 'moderator');
    await page.request.post(`/api/community/publications/${p.slug}/reports`, {
      headers: { Origin: origin() },
      data: { reason: 'Unsafe or misleading', details: 'Review this published example.' },
    });
    await page.goto(`/admin/community/?section=publications#${p.id}`);
    await expect(
      page.getByRole('heading', { name: 'Shared teaching circuit', exact: true }),
    ).toBeVisible();
    await page.getByLabel('Inspect snapshot').selectOption(p.currentVersionId);
    await expect(page.getByText('Published snapshot JSON', { exact: true })).toBeVisible();
    await expect(page.locator('.publication-json')).toContainText('bulb');
    await review(page, 'Hide publication');
    await expect(
      page.getByRole('button', { name: 'Restore publication', exact: true }),
    ).toBeVisible();
    expect((await ownerContext.request.get(`/api/community/publications/${p.slug}`)).status()).toBe(
      404,
    );
    await review(
      page,
      'Dismiss report',
      'This individual report does not contain sufficient evidence.',
    );
    await expect(
      page.getByRole('button', { name: 'Restore publication', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('dismissed', { exact: true })).toBeVisible();
    const latest = (await (await ownerContext.request.get(`/api/me/publications/${p.id}`)).json())
      .publication;
    await ownerContext.request.post(`/api/community/publications/${p.id}/unpublish`, {
      headers: { Origin: origin() },
      data: { revision: latest.revision },
    });
    await page.getByRole('button', { name: 'Reload administration', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Restore publication', exact: true }),
    ).toBeVisible();
    await review(page, 'Restore publication');
    expect((await ownerContext.request.get(`/api/community/publications/${p.slug}`)).status()).toBe(
      404,
    );
    await expect(page.getByText('unpublished', { exact: true })).toBeVisible();
    await noOverflow(page);
    await screenshot(page, 'publication-staff-review');
  } finally {
    await ownerContext.close();
  }
});

test('staff conflict recovery requires a new decision and session revocation clears the snapshot', async ({
  page,
  browser,
}) => {
  const ownerContext = await browser.newContext();
  try {
    const owner = await account(ownerContext.request);
    await claim(ownerContext.request, owner.handle);
    const s = await save(ownerContext.request);
    const p = await publish(ownerContext.request, s);
    await account(page.request, 'Moderator', 'moderator');
    await page.goto(`/admin/community/?section=publications#${p.id}`);
    await expect(page.getByRole('button', { name: 'Hide publication', exact: true })).toBeVisible();
    const update = await ownerContext.request.patch(`/api/community/publications/${p.id}`, {
      headers: { Origin: origin() },
      data: { revision: p.revision, sourceVersion: 1, title: 'Owner published an update' },
    });
    expect(update.ok(), await update.text()).toBe(true);
    await page.getByRole('button', { name: 'Hide publication', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Review administrative change' });
    await dialog
      .getByLabel('Reason', { exact: true })
      .fill('This request reviews an outdated snapshot.');
    await dialog.getByRole('button', { name: 'Confirm change', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('changed');
    await expect(
      dialog.getByRole('button', { name: 'Confirm change', exact: true }),
    ).toBeDisabled();
    await dialog.getByRole('button', { name: 'Reload administration', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Owner published an update', exact: true }),
    ).toBeVisible();
    await page.request.post('/api/auth/sign-out', { headers: { Origin: origin() }, data: {} });
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Owner published an update', exact: true }),
    ).toHaveCount(0);
  } finally {
    await ownerContext.close();
  }
});

test('publication SSR metadata stays readable without JavaScript and escapes untrusted text', async ({
  page,
  browser,
}) => {
  const owner = await account(page.request);
  await claim(page.request, owner.handle);
  await publish(page.request, await save(page.request), '<script>unsafe()</script>');
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const visitor = await context.newPage();
    await visitor.goto(`${origin()}/u/${owner.handle}`);
    await expect(
      visitor.getByRole('heading', { name: '<script>unsafe()</script>', exact: true }),
    ).toBeVisible();
    expect(await visitor.locator('script').allTextContents()).not.toContain('unsafe()');
    await noOverflow(visitor);
  } finally {
    await context.close();
  }
});

test('custom read-only publication reviewers can inspect snapshots but cannot moderate or reach private circuits', async ({
  page,
  browser,
}) => {
  const ownerContext = await browser.newContext();
  try {
    const owner = await account(ownerContext.request);
    await claim(ownerContext.request, owner.handle);
    const s = await save(ownerContext.request);
    const p = await publish(ownerContext.request, s);
    const reader = await account(page.request, 'Read only reviewer');
    const role = randomUUID();
    await sql(page.request, [
      {
        sql: 'INSERT INTO admin_roles(id,name,version,updated_at) VALUES(?,?,1,1)',
        args: [role, `Snapshot reader ${role}`],
      },
      {
        sql: 'INSERT INTO admin_role_permissions VALUES(?,?)',
        args: [role, 'community.publications.read'],
      },
      { sql: 'INSERT INTO admin_user_roles VALUES(?,?)', args: [reader.id, role] },
    ]);
    await page.goto(`/admin/community/?section=publications#${p.id}`);
    await expect(
      page.getByRole('heading', { name: 'Shared teaching circuit', exact: true }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hide publication', exact: true })).toHaveCount(
      0,
    );
    await page.getByLabel('Inspect snapshot').selectOption(p.currentVersionId);
    await expect(page.locator('.publication-json')).toContainText('bulb');
    expect((await page.request.get(`/api/circuits/${s.id}`)).status()).toBe(404);
    expect((await page.request.get('/api/admin/ping')).status()).toBe(403);
    await sql(page.request, [
      { sql: 'DELETE FROM admin_user_roles WHERE user_id=?', args: [reader.id] },
      { sql: 'UPDATE admin_revision SET version=version+1 WHERE id=1' },
    ]);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.getByRole('heading', { name: 'Access denied', exact: true })).toBeVisible();
    await expect(page.locator('.publication-json')).toHaveCount(0);
  } finally {
    await ownerContext.close();
  }
});
