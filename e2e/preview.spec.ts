import { randomUUID } from 'node:crypto';
import { type APIRequestContext, type Page, expect, test } from '@playwright/test';
import { previewCircuit as circuit } from '../scripts/fixtures/preview-circuit';
import type { Profile } from '../src/community/profile-policy';
const origin = () => new URL(test.info().project.use.baseURL as string).origin;
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const list: string[] = [];
  errors.set(page, list);
  page.on('pageerror', (error) => list.push(error.message));
  await page.addInitScript(() => {
    (window as Window & { previewCsp?: string[] }).previewCsp = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      (window as Window & { previewCsp?: string[] }).previewCsp!.push(event.violatedDirective),
    );
  });
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
  if (!page.isClosed())
    expect(
      await page.evaluate(() => (window as Window & { previewCsp?: string[] }).previewCsp ?? []),
    ).toEqual([]);
});
async function post(client: APIRequestContext, path: string, data: unknown) {
  const response = await client.post(path, { headers: { Origin: origin() }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}
async function account(client: APIRequestContext, role = 'individual') {
  const data = await post(client, '/api/auth/sign-up/email', {
    name: 'Maya Chen',
    email: `${randomUUID()}@preview-browser.test`,
    password: 'Local-password-123!',
  });
  if (role !== 'individual') await post(client, '/api/__test/role', { role });
  const p = (await (await client.get('/api/me/profile')).json()).profile as Profile;
  const handle = `pv_${randomUUID().replaceAll('-', '').slice(0, 14)}`;
  const response = await client.patch('/api/me/profile', {
    headers: { Origin: origin() },
    data: {
      revision: p.revision,
      handle,
      displayName: 'Maya Chen',
      bio: 'Building practical circuits.',
      institution: '',
      level: '',
      visibility: 'public',
      showInstitution: false,
      showLevel: false,
      allowForks: true,
    },
  });
  expect(response.ok(), await response.text()).toBe(true);
  return { id: data.user.id as string, handle };
}
async function publication(
  client: APIRequestContext,
  premium = false,
  title = 'Workshop lighting',
) {
  const source = await post(client, '/api/circuits', {
    name: 'Private owner draft',
    circuit: circuit(premium),
  });
  const { publication: p } = await post(client, '/api/community/publications', {
    sourceCircuitId: source.id,
    sourceVersion: 1,
    title,
    description: 'A fixed public schematic for learning.',
    tags: ['lighting', 'learning'],
  });
  return {
    p: p as { id: string; slug: string; revision: number; currentVersionId: string },
    source,
  };
}
async function sql(client: APIRequestContext, statements: { sql: string; args?: unknown[] }[]) {
  return post(client, '/api/__profiles/sql', { statements });
}
async function enable(page: Page) {
  await page.getByRole('button', { name: 'Enable interactive preview' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Interactive preview ready' }),
  ).toBeVisible();
}
async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}
async function screenshot(page: Page, name: string) {
  if (test.info().project.name.includes('safari')) return;
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

test('anonymous no-JS detail includes the actual schematic, attribution, metadata and version links', async ({
  browser,
  page,
}) => {
  const request = page.request;
  await account(request);
  const { p } = await publication(request);
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: page.viewportSize() ?? undefined,
  });
  const nojs = await context.newPage();
  const response = await nojs.goto(`${origin()}/c/${p.slug}`);
  expect(response?.status()).toBe(200);
  await expect(nojs.getByRole('heading', { name: 'Workshop lighting', exact: true })).toBeVisible();
  await expect(nojs.getByRole('img', { name: 'Workshop lighting', exact: true })).toBeVisible();
  expect(await nojs.locator('[data-component-id]').count()).toBe(3);
  await expect(nojs.getByRole('link', { name: 'Version 1 · Workshop lighting' })).toBeVisible();
  const json = await nojs.locator('script[type="application/ld+json"]').textContent();
  expect(JSON.parse(json!).name).toBe('Workshop lighting');
  expect(await nojs.locator('link[rel=canonical]').getAttribute('href')).toBe(
    `${origin()}/c/${p.slug}`,
  );
  await noOverflow(nojs);
  await screenshot(nojs, 'detail-no-js');
  await context.close();
});
test('preview loads lazily, supports keyboard/touch view controls and cannot edit or persist a circuit', async ({
  page,
}) => {
  const request = page.request;
  const owner = await account(request);
  const { p, source } = await publication(request);
  const writes: string[] = [];
  const scripts: string[] = [];
  page.on('request', (req) => {
    if (!['GET', 'HEAD'].includes(req.method())) writes.push(req.url());
    if (req.resourceType() === 'script') scripts.push(new URL(req.url()).pathname);
  });
  await page.goto(`/c/${p.slug}`);
  expect(scripts).not.toContain('/community/preview.js');
  await enable(page);
  expect(scripts).toContain('/community/preview.js');
  expect(
    scripts.some((p) => p.includes('/app/assets/') || p.includes('/src/') || p.includes('react')),
  ).toBe(false);
  const svg = page.locator('[data-preview-svg]');
  const before = await svg.getAttribute('viewBox');
  await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
  expect(await svg.getAttribute('viewBox')).not.toBe(before);
  await svg.focus();
  await page.keyboard.press('ArrowRight');
  const moved = await svg.getAttribute('viewBox');
  expect(moved).not.toBe(before);
  await page.getByRole('button', { name: 'Fit circuit' }).click();
  expect(await svg.getAttribute('viewBox')).toBe(before);
  const bounds = await svg.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + 50);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width / 2 + 45, bounds!.y + 75);
  await page.mouse.up();
  expect(await svg.getAttribute('viewBox')).not.toBe(before);
  await page.getByRole('button', { name: 'Fit circuit' }).click();
  expect(await svg.getAttribute('viewBox')).toBe(before);
  await page.getByRole('button', { name: 'Inspect light', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#preview-inspection')).toContainText('light');
  await page.keyboard.press('Delete');
  await page.keyboard.press('r');
  await page.getByRole('checkbox', { name: /Single-way|1-Way|switch/i }).check();
  await expect(
    page.getByRole('status').filter({ hasText: 'Temporary switch changed' }),
  ).toBeVisible();
  expect(await page.locator('[data-component-id]').count()).toBe(3);
  const saved = await (await request.get(`/api/circuits/${source.id}`)).json();
  expect(saved.version).toBe(1);
  expect(saved.circuit.components[1].state.on).toBe(false);
  const own = await request.get('/api/circuits');
  expect((await own.json()).items.length).toBe(1);
  expect(writes).toEqual([]);
  expect(owner.id).toBeTruthy();
  await noOverflow(page);
  await screenshot(page, 'detail-interactive');
});
test('Basic simulation starts, advances, pauses and resets temporary inputs through the real Worker', async ({
  page,
}) => {
  const request = page.request;
  await account(request);
  const { p, source } = await publication(request);
  await page.goto(`/c/${p.slug}`);
  await enable(page);
  await page.getByRole('button', { name: 'Start simulation', exact: true }).click();
  await expect(page.locator('#preview-status')).toContainText('Simulation running');
  await expect
    .poll(async () => await page.locator('#preview-status').textContent())
    .toMatch(/0\.[257][05] s|[1-9]\d*\.\d{2} s/);
  const changed = page.waitForResponse(
    (response) =>
      response.url().endsWith('/preview/simulate') &&
      response.request().postDataJSON()?.switches?.switch === true,
  );
  await page.locator('[data-switch]').check();
  const afterChange = await (await changed).json();
  expect(afterChange.elapsedSeconds).toBeGreaterThan(0);
  expect(afterChange.energizedComponents).toBe(1);
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
  await expect(page.locator('#preview-status')).toContainText('Published schematic restored');
  await page.locator('[data-switch]').check();
  await page.getByRole('button', { name: 'Reset preview' }).click();
  await expect(page.locator('[data-switch]')).not.toBeChecked();
  const saved = await (await request.get(`/api/circuits/${source.id}`)).json();
  expect(saved.version).toBe(1);
  await screenshot(page, 'detail-simulation-reset');
});
test('a late simulation response cannot replace the schematic after Reset', async ({ page }) => {
  const request = page.request;
  await account(request);
  const { p } = await publication(request);
  let release: () => void = () => {};
  let received: () => void = () => {};
  let completed: () => void = () => {};
  const held = new Promise<void>((done) => {
    release = done;
  });
  const fetched = new Promise<void>((done) => {
    received = done;
  });
  const finished = new Promise<void>((done) => {
    completed = done;
  });
  await page.route('**/preview/simulate', async (route) => {
    try {
      const response = await route.fetch();
      received();
      await held;
      try {
        await route.fulfill({ response });
      } catch {
        /* Reset aborts the browser request. */
      }
    } finally {
      completed();
    }
  });
  await page.goto(`/c/${p.slug}`);
  await enable(page);
  await page.getByRole('button', { name: 'Start simulation', exact: true }).click();
  await fetched;
  await page.getByRole('button', { name: 'Reset preview' }).click();
  release();
  await finished;
  await expect(page.locator('#preview-status')).toContainText('Preview reset');
  await expect(page.getByRole('button', { name: 'Start simulation', exact: true })).toBeVisible();
  await expect(page.locator('[data-preview-svg] desc')).toContainText('No simulation has been run');
});
test('private source edits and newer publications preserve version-selected read-only pages', async ({
  page,
}) => {
  const request = page.request;
  await account(request);
  const { p, source } = await publication(request);
  const changed = circuit();
  changed.components[0].id = 'new-public-load';
  changed.wires = [];
  const edit = await request.patch(`/api/circuits/${source.id}`, {
    headers: { Origin: origin() },
    data: { name: 'Private changes', version: 1, circuit: changed },
  });
  expect(edit.ok()).toBe(true);
  await page.goto(`/c/${p.slug}`);
  expect(await page.locator('[data-component-id="light"]').count()).toBe(1);
  const republish = await request.patch(`/api/community/publications/${p.id}`, {
    headers: { Origin: origin() },
    data: { revision: p.revision, sourceVersion: 2, title: 'Workshop version two' },
  });
  expect(republish.ok()).toBe(true);
  await page.goto(`/c/${p.slug}`);
  await expect(
    page.getByRole('heading', { name: 'Workshop version two', exact: true }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Version 1 · Workshop lighting' }).click();
  await expect(
    page.getByText('Viewing an earlier published version.', { exact: false }),
  ).toBeVisible();
  expect(await page.locator('[data-component-id="light"]').count()).toBe(1);
  expect(await page.locator('[data-component-id="new-public-load"]').count()).toBe(0);
  await enable(page);
  expect(await page.locator('[data-publication-preview]').getAttribute('data-version')).toBe(
    p.currentVersionId,
  );
});
test('Pro display stays public, membership gates simulation and a revoked entitlement clears results', async ({
  page,
  browser,
}) => {
  const request = page.request;
  const owner = await account(request);
  const admin = await browser.newContext({ baseURL: origin() });
  await account(admin.request, 'super_admin');
  const plan = await post(admin.request, '/api/admin/pro/plans', {
    slug: `preview-${randomUUID()}`,
    name: 'Preview membership',
    description: 'Local browser fixture',
    noExpiry: false,
    durationDays: 30,
    status: 'active',
    features: [{ featureKey: 'pro_components', enabled: true, config: {} }],
    reason: 'Local preview acceptance',
  });
  const grant = await post(admin.request, '/api/admin/pro/memberships', {
    userId: owner.id,
    planId: plan.id,
    status: 'active',
    startsAt: Date.now() - 1000,
    endsAt: Date.now() + 86400000,
    noExpiry: false,
    reason: 'Local preview membership',
  });
  const { p } = await publication(request, true);
  await page.goto(`/c/${p.slug}`);
  await enable(page);
  await page.getByRole('button', { name: 'Start simulation', exact: true }).click();
  await expect(page.locator('#preview-status')).toContainText('Simulation running');
  await sql(request, [
    { sql: "UPDATE entitlements SET status='suspended' WHERE id=?", args: [grant.id] },
  ]);
  await expect(page.locator('#preview-status')).toContainText('active membership');
  await expect(page.locator('[data-preview-svg] desc')).toContainText('No simulation has been run');
  const guest = await browser.newContext({ baseURL: origin() });
  const anonymous = await guest.newPage();
  await anonymous.goto(`/c/${p.slug}`);
  await enable(anonymous);
  await anonymous.getByRole('button', { name: 'Start simulation', exact: true }).click();
  await expect(anonymous.locator('#preview-status')).toContainText('Authentication required');
  expect(await anonymous.locator('[data-component-id="premium"]').count()).toBe(1);
  await guest.close();
  await admin.close();
});
test('visibility changes deny direct detail, thumbnails and active simulation without leaving a stale result', async ({
  page,
}) => {
  const request = page.request;
  await account(request);
  const { p } = await publication(request);
  await page.goto(`/c/${p.slug}`);
  await enable(page);
  await page.getByRole('button', { name: 'Start simulation', exact: true }).click();
  await expect(page.locator('#preview-status')).toContainText('Simulation running');
  await sql(request, [
    {
      sql: "UPDATE publications SET moderation='hidden',revision=revision+1 WHERE id=?",
      args: [p.id],
    },
  ]);
  await expect(page.locator('.preview-viewport')).toContainText('unavailable');
  expect(await page.locator('[data-preview-svg]').count()).toBe(0);
  await expect(page.getByRole('button', { name: 'Reset preview' })).toBeDisabled();
  const image = await request.get(`/c/${p.slug}/thumbnail.svg`);
  expect(image.status()).toBe(404);
  const response = await page.goto(`/c/${p.slug}`);
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { name: 'Circuit unavailable', exact: true }),
  ).toBeVisible();
});
test('detail reporting and profile links lead through real public and staff surfaces', async ({
  page,
}) => {
  const request = page.request;
  const owner = await account(request);
  await publication(request);
  await account(request);
  await page.goto(`/u/${owner.handle}`);
  await page.getByRole('link', { name: 'Workshop lighting', exact: true }).click();
  await page.getByRole('button', { name: 'History & report' }).click();
  const dialog = page.getByRole('dialog', { name: 'Workshop lighting' });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel('Reason', { exact: true }).selectOption('Other');
  await dialog
    .getByLabel('Details', { exact: true })
    .fill('A locally tested publication detail report.');
  await dialog.getByRole('button', { name: 'Submit publication report' }).click();
  await expect(dialog.getByText('Report submitted. Your identity stays private.')).toBeVisible();
});
test('reduced-motion phone detail keeps controls reachable and untrusted text stays encoded', async ({
  page,
}) => {
  const request = page.request;
  await account(request);
  const { p } = await publication(request, false, '<img src=x onerror=alert(1)> Circuit');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/c/${p.slug}`);
  await expect(
    page.getByRole('heading', { name: '<img src=x onerror=alert(1)> Circuit', exact: true }),
  ).toBeVisible();
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  await enable(page);
  await noOverflow(page);
  const animated = await page
    .locator('[data-preview-svg]')
    .evaluate((el) =>
      [el, ...el.querySelectorAll('*')].some((n) => getComputedStyle(n).animationName !== 'none'),
    );
  expect(animated).toBe(false);
  await screenshot(page, 'detail-reduced-motion');
});

test('an unpowered circuit reports unavailable calculation without pretending the clock or loads ran', async ({
  page,
}) => {
  const request = page.request;
  await account(request);
  const source = await post(request, '/api/circuits', {
    name: 'No supply',
    circuit: {
      components: [{ id: 'light', type: 'bulb', x: 200, y: 100, rotation: 0, state: {} }],
      wires: [],
    },
  });
  const { publication: p } = await post(request, '/api/community/publications', {
    sourceCircuitId: source.id,
    sourceVersion: 1,
    title: 'Unpowered circuit',
    description: 'No source is connected.',
  });
  await page.goto(`/c/${p.slug}`);
  await enable(page);
  await page.getByRole('button', { name: 'Start simulation', exact: true }).click();
  await expect(page.locator('#preview-status')).toContainText('Calculation unavailable');
  await expect(page.locator('#preview-status')).toContainText('No active declared source');
  await expect(page.getByRole('button', { name: 'Start simulation', exact: true })).toBeVisible();
});

test('losing focus stops simulation, discards results and requires a fresh access check to restart', async ({
  page,
}) => {
  await account(page.request);
  const { p } = await publication(page.request);
  await page.goto(`/c/${p.slug}`);
  await enable(page);
  await page.getByRole('button', { name: 'Start simulation', exact: true }).click();
  await expect(page.locator('#preview-status')).toContainText('Simulation running');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(page.locator('#preview-status')).toContainText('inactive');
  await expect(page.locator('[data-preview-svg] desc')).toContainText('No simulation has been run');
  await page.getByRole('button', { name: 'Start simulation', exact: true }).click();
  await expect(page.locator('#preview-status')).toContainText('Simulation running');
  await page.getByRole('button', { name: 'Pause simulation', exact: true }).click();
});
