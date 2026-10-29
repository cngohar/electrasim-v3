import { randomUUID } from 'node:crypto';
import { type APIRequestContext, type Page, expect, test } from '@playwright/test';
import { previewCircuit } from '../scripts/fixtures/preview-circuit';
import type { Profile } from '../src/community/profile-policy';

const origin = () => new URL(test.info().project.use.baseURL as string).origin;
async function post(client: APIRequestContext, path: string, data: unknown) {
  const response = await client.post(path, { headers: { Origin: origin() }, data });
  expect(response.ok(), await response.text()).toBe(true);
  return response.json();
}
async function account(client: APIRequestContext, name: string) {
  const handle = `dc_${randomUUID().replaceAll('-', '').slice(0, 14)}`;
  const data = await post(client, '/api/auth/sign-up/email', {
    name,
    email: `${randomUUID()}@discovery-browser.test`,
    password: 'Local-password-123!',
  });
  const current = (await (await client.get('/api/me/profile')).json()).profile as Profile;
  const response = await client.patch('/api/me/profile', {
    headers: { Origin: origin() },
    data: {
      revision: current.revision,
      handle,
      displayName: name,
      bio: '',
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
  title: string,
  zone: string,
  standard: string,
) {
  const source = await post(client, '/api/circuits', {
    name: 'Private source',
    circuit: previewCircuit(),
  });
  const data = await post(client, '/api/community/publications', {
    sourceCircuitId: source.id,
    sourceVersion: 1,
    title,
    description: `${title} is a fixed public schematic for learning.`,
    tags: ['beginner', 'switching'],
    zone,
    standard,
  });
  return data.publication as { id: string; slug: string; revision: number };
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function screenshot(page: Page, name: string) {
  if (test.info().project.name.includes('safari')) return;
  await page.screenshot({
    path: test.info().outputPath(`${name}.png`),
    fullPage: true,
    animations: 'disabled',
  });
}

test('Explore renders real circuits without JavaScript; filters, search, clear and detail work', async ({
  browser,
  page,
}) => {
  const owner = await account(page.request, 'Discovery Maya');
  const firstTitle = `RCD protected workshop ${owner.handle}`;
  const relayTitle = `Relay learning ${owner.handle}`;
  const first = await publication(page.request, firstTitle, 'protection', 'uk');
  await publication(page.request, relayTitle, 'control', 'eu');
  const nojsContext = await browser.newContext({
    javaScriptEnabled: false,
    viewport: page.viewportSize() ?? undefined,
  });
  const nojs = await nojsContext.newPage();
  const response = await nojs.goto(`${origin()}/c/explore`);
  expect(response?.status()).toBe(200);
  await expect(nojs.getByRole('heading', { name: 'Ideas you can trace.' })).toBeVisible();
  await expect(nojs.getByRole('link', { name: firstTitle, exact: true })).toBeVisible();
  await expect(nojs.getByRole('img', { name: `Schematic for ${firstTitle}` })).toBeVisible();
  expect(await nojs.locator('script').count()).toBe(0);
  expect(await nojs.locator('link[rel=canonical]').getAttribute('href')).toBe(
    `${origin()}/c/explore`,
  );
  await noOverflow(nojs);
  await screenshot(nojs, 'explore-no-js');
  await nojs.getByRole('searchbox', { name: 'Search circuits' }).fill('RCD');
  await nojs.getByRole('button', { name: 'Apply filters' }).click();
  await expect(nojs.getByRole('link', { name: firstTitle, exact: true })).toBeVisible();
  await expect(nojs.getByRole('link', { name: relayTitle, exact: true })).toHaveCount(0);
  await nojs.getByRole('combobox', { name: 'Zone' }).selectOption('control');
  await nojs.getByRole('button', { name: 'Apply filters' }).click();
  await expect(nojs.getByText('No circuits match those filters.')).toBeVisible();
  await nojs.getByRole('link', { name: 'Clear filters', exact: false }).first().click();
  await expect(nojs.getByRole('link', { name: relayTitle, exact: true })).toBeVisible();
  await nojs.getByRole('link', { name: firstTitle, exact: true }).click();
  await expect(nojs.getByRole('heading', { name: firstTitle })).toBeVisible();
  expect(nojs.url()).toBe(`${origin()}/c/${first.slug}`);
  await nojsContext.close();
  expect(owner.handle).toMatch(/^dc_/);
});

test('signed-in Feed separates followed and own circuits; moderation removes a card', async ({
  page,
}) => {
  const viewer = await account(page.request, 'Discovery Viewer');
  const own = await publication(page.request, 'My circuit', 'lighting', 'int');
  const otherContext = await page.context().browser()!.newContext({ baseURL: origin() });
  const other = await otherContext.newPage();
  const author = await account(other.request, 'Discovery Lewis');
  const shared = await publication(other.request, 'Followed relay circuit', 'control', 'uk');
  await post(page.request, '/api/__profiles/sql', {
    statements: [
      {
        sql: 'INSERT INTO follows(follower_id,followed_id,created_at) VALUES(?,?,?)',
        args: [viewer.id, author.id, Date.now()],
      },
    ],
  });
  await page.goto('/c/feed');
  await expect(page.getByRole('heading', { name: 'Fresh from your circle.' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Followed relay circuit', exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'My circuit', exact: true })).toHaveCount(0);
  await noOverflow(page);
  await screenshot(page, 'feed-following');
  await page.getByRole('link', { name: 'Your circuits', exact: true }).click();
  await expect(page.getByRole('link', { name: 'My circuit', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Followed relay circuit', exact: true })).toHaveCount(
    0,
  );
  await page.getByRole('link', { name: 'Following', exact: true }).click();
  await post(page.request, '/api/__test/role', { role: 'super_admin' });
  const detail = (await (
    await page.request.get(`/api/admin/community/publications/${shared.id}`)
  ).json()) as { version: number; publication: { revision: number } };
  await post(page.request, `/api/admin/community/publications/${shared.id}/moderate`, {
    version: detail.version,
    publicationRevision: detail.publication.revision,
    action: 'hide',
    reason: 'Reviewed the public circuit for the local browser test.',
  });
  await page.reload();
  await expect(page.getByRole('link', { name: 'Followed relay circuit', exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText('No circuits from followed authors yet.')).toBeVisible();
  expect(own.slug).toBeTruthy();
  await otherContext.close();
});
