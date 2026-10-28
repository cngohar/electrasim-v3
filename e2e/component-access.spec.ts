import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { exportJSON, importJSON } from '@electrasim/domain/circuitFormat';
import {
  type APIRequestContext,
  type Download,
  type Page,
  test as base,
  expect,
} from '@playwright/test';
import { protectedLoad } from '../packages/domain/src/simulation/auditFixtures';
import { localTestUrl } from '../scripts/local-test-url';
import { activateControl } from './helpers/workbench';
function drawing(type: string) {
  const drawing = protectedLoad(type, 60, 16);
  drawing.components = drawing.components.map((item, i) => ({
    ...item,
    x: 200 + (i > 1 ? (i - 1) * 260 : 0),
    y: i === 1 ? 450 : 220,
  }));
  return { ...importJSON(exportJSON(drawing)), faults: [], globalVoltage: 230 };
}
const circuit = drawing('afdd');
const basic = drawing('mcb');
const raw = JSON.stringify({ version: 3, exportedAt: 123, circuit }, null, 4);
const recovery = (page: Page) =>
  page.getByRole('complementary', { name: 'Membership and recovery' });
const test = base.extend<{ catalog: APIRequestContext }>({
  catalog: async ({ playwright, baseURL }, use) => {
    const origin = new URL(localTestUrl(baseURL, 'http://127.0.0.1:3027', 'Component browser test'))
      .origin;
    const catalog = await playwright.request.newContext({
      baseURL: origin,
      extraHTTPHeaders: { Origin: origin },
    });
    const signup = await catalog.post('/api/auth/sign-up/email', {
      data: {
        name: 'Local catalog browser owner',
        email: `${randomUUID()}@component.test`,
        password: 'Local-password-123!',
      },
    });
    expect(signup.ok()).toBe(true);
    expect((await catalog.post('/api/__test/role', { data: { role: 'super_admin' } })).ok()).toBe(
      true,
    );
    try {
      await use(catalog);
    } finally {
      await setAccess(catalog, 'pro');
      await catalog.dispose();
    }
  },
});
async function setAccess(catalog: APIRequestContext, access: 'free' | 'pro') {
  const response = await catalog.get('/api/admin/components/afdd');
  expect(response.ok()).toBe(true);
  const detail = await response.json();
  if (detail.component.access === access) return;
  const changed = await catalog.patch('/api/admin/components/afdd/access', {
    data: {
      access,
      version: detail.version,
      policyRevision: detail.policyRevision,
      reason: 'Local Gate D browser review',
    },
  });
  expect(changed.ok()).toBe(true);
}
async function editor(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('electrasim:welcomed', '1');
    localStorage.setItem('electrasim:mobile-suitability:v1', '1');
  });
  await page.goto(test.info().config.metadata.delivery === 'built' ? '/app/' : '/');
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible();
}
async function files(page: Page, tab = 'Import') {
  await activateControl(page, page.getByRole('button', { name: 'Menu', exact: true }));
  await activateControl(page, page.getByRole('button', { name: /^Import \/ Export/ }));
  const dialog = page.getByRole('dialog', { name: 'Import and export circuit' });
  await activateControl(page, dialog.getByRole('button', { name: tab, exact: true }));
  return dialog;
}
async function importRaw(page: Page, value = raw) {
  const dialog = await files(page);
  await dialog.locator('textarea').fill(value);
  await activateControl(
    page,
    dialog.getByRole('button', { name: 'Import from paste', exact: true }),
  );
  await expect(dialog).toContainText('Loaded 4 components,');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
}
async function downloaded(download: Download) {
  const path = await download.path();
  expect(path).not.toBeNull();
  return readFile(path!, 'utf8');
}
async function exportCurrent(page: Page) {
  const download = page.waitForEvent('download');
  await page.keyboard.press('Control+s');
  return JSON.parse(await downloaded(await download)).circuit;
}
async function refresh(page: Page) {
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
}
async function copyDevice(page: Page) {
  const hit = page.locator('[data-component-id="device"] [data-component-hitbox]').first();
  await activateControl(page, hit, true);
  await page.keyboard.press('Control+c');
}
test.beforeEach(() => test.setTimeout(120000));

test('guest Free content uses fresh placement/paste/run checks and a downgrade preserves the exact drawing', async ({
  page,
  catalog,
}) => {
  await setAccess(catalog, 'free');
  let actions = 0;
  page.on('request', (request) => {
    if (request.url().endsWith('/api/simulator/authorize')) actions++;
  });
  await editor(page);
  await importRaw(page);
  await expect(recovery(page)).toBeHidden();
  expect(actions).toBeGreaterThan(0);
  await activateControl(page, page.locator('[data-tour="run"]'));
  await expect(page.locator('[data-tour="run"]')).toHaveAttribute('title', 'Stop simulation');
  await expect.poll(() => actions).toBeGreaterThanOrEqual(3);
  await activateControl(page, page.locator('[data-tour="run"]'));
  await activateControl(page, page.getByRole('button', { name: /Browse all components|^Browse$/ }));
  await page.getByLabel('Search components', { exact: true }).fill('afdd');
  const tile = page
    .getByRole('dialog', { name: 'Component library' })
    .locator('[data-palette-type="afdd"]');
  await expect(tile).toBeVisible();
  await expect(tile).not.toContainText('Pro');
  await activateControl(page, tile);
  const canvas = page.locator('[data-circuit-canvas]');
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();
  await canvas.click({ position: { x: bounds!.width * 0.4, y: bounds!.height * 0.4 } });
  await expect(page.locator('[data-component-id]')).toHaveCount(5);
  await page.keyboard.press('Escape');
  await copyDevice(page);
  await page.keyboard.press('Control+v');
  await expect(page.locator('[data-component-id]')).toHaveCount(6);
  const before = await exportCurrent(page);
  const prior = actions;
  await setAccess(catalog, 'pro');
  await page.keyboard.press('Control+v');
  await expect(recovery(page)).toContainText('read-only');
  await expect.poll(() => actions).toBeGreaterThan(prior);
  await expect(page.locator('[data-component-id]')).toHaveCount(6);
  const backup = page.waitForEvent('download');
  await activateControl(
    page,
    recovery(page).getByRole('button', { name: 'Export original', exact: true }),
  );
  expect(JSON.parse(await downloaded(await backup)).circuit).toEqual(before);
  await setAccess(catalog, 'free');
  await activateControl(
    page,
    recovery(page).getByRole('button', { name: 'Refresh access', exact: true }),
  );
  await expect(recovery(page)).toBeHidden();
  expect(await exportCurrent(page)).toEqual(before);
});

test('offline fallback preserves raw original, opens an explicit Basic copy and restores the original after fresh access', async ({
  page,
  catalog,
}) => {
  await setAccess(catalog, 'free');
  await editor(page);
  await importRaw(page);
  await expect(recovery(page)).toBeHidden();
  await page.context().setOffline(true);
  await expect(recovery(page)).toContainText('read-only');
  await activateControl(
    page,
    recovery(page).getByRole('button', { name: 'Create basic copy', exact: true }),
  );
  const checks = recovery(page).getByRole('checkbox');
  expect(await checks.count()).toBe(1);
  await checks.check();
  await activateControl(
    page,
    recovery(page).getByRole('button', {
      name: 'Back up original and open basic copy',
      exact: true,
    }),
  );
  await expect(recovery(page)).toContainText('Basic copy opened');
  await expect(page.locator('[data-device-art="afdd"]')).toHaveCount(0);
  const saved = await files(page, 'Saved circuits');
  const downloads = saved.getByRole('button', { name: /^Download original/ });
  await expect(downloads).toHaveCount(2);
  const values: string[] = [];
  for (let i = 0; i < (await downloads.count()); i++) {
    const download = page.waitForEvent('download');
    await activateControl(page, downloads.nth(i));
    values.push(await downloaded(await download));
  }
  expect(values).toContain(raw);
  page.once('dialog', (dialog) => dialog.accept());
  await activateControl(page, saved.getByRole('button', { name: 'Open original 1', exact: true }));
  await expect(saved).toContainText('Original opened');
  await page.keyboard.press('Escape');
  await expect(recovery(page)).toContainText('read-only');
  await expect(page.locator('[data-device-art="afdd"]')).toHaveCount(1);
  await page.context().setOffline(false);
  await refresh(page);
  await expect(recovery(page)).toBeHidden();
  expect(await exportCurrent(page)).toEqual(circuit);
});

test('a delayed old public policy cannot undo a newer downgrade on focus revalidation', async ({
  page,
  catalog,
}) => {
  await setAccess(catalog, 'free');
  await editor(page);
  await importRaw(page);
  await expect(recovery(page)).toBeHidden();
  let release!: () => void;
  let held!: () => void;
  const ready = new Promise<void>((done) => {
    held = done;
  });
  let first = true;
  await page.route('**/api/catalog/component-access', async (route) => {
    const response = await route.fetch();
    if (first) {
      first = false;
      held();
      await new Promise<void>((done) => {
        release = done;
      });
    }
    await route.fulfill({ response });
  });
  await refresh(page);
  await ready;
  await setAccess(catalog, 'pro');
  const updated = page.waitForResponse(
    (response) => response.url().endsWith('/api/catalog/component-access') && response.ok(),
  );
  await refresh(page);
  await updated;
  release();
  await expect(recovery(page)).toContainText('read-only');
  await page.unrouteAll({ behavior: 'wait' });
  await activateControl(page, page.getByRole('button', { name: /Browse all components|^Browse$/ }));
  await page.getByLabel('Search components', { exact: true }).fill('afdd');
  await expect(
    page.getByRole('dialog', { name: 'Component library' }).locator('[data-palette-type="afdd"]'),
  ).toContainText('Pro');
  await page.keyboard.press('Escape');
  expect(await exportCurrent(page)).toEqual(circuit);
});

test('Free account persistence is authoritative and an old private load cannot replace the new session drawing', async ({
  page,
  catalog,
  baseURL,
}) => {
  await setAccess(catalog, 'free');
  const origin = new URL(baseURL!).origin;
  const signup = await page.request.post('/api/auth/sign-up/email', {
    headers: { Origin: origin },
    data: {
      name: 'Local free member',
      email: `${randomUUID()}@component.test`,
      password: 'Local-password-123!',
    },
  });
  expect(signup.ok()).toBe(true);
  await editor(page);
  await importRaw(page);
  await expect(recovery(page)).toBeHidden();
  const saved = await files(page, 'Saved circuits');
  await saved.getByLabel('Circuit name', { exact: true }).fill('Free policy original');
  await activateControl(page, saved.getByRole('button', { name: 'Save new circuit', exact: true }));
  await expect(saved).toContainText('Circuit saved.');
  const list = await (await page.request.get('/api/circuits')).json();
  const id = list.items.find((item: { name: string }) => item.name === 'Free policy original')
    .id as string;
  const stored = await (await page.request.get(`/api/circuits/${id}`)).json();
  expect(stored.circuit).toEqual(circuit);
  expect(stored.policy).toBeDefined();
  await page.keyboard.press('Escape');
  await importRaw(page, exportJSON(basic));
  const library = await files(page, 'Saved circuits');
  let release!: () => void;
  let held!: () => void;
  const ready = new Promise<void>((done) => {
    held = done;
  });
  await page.route(`**/api/circuits/${id}`, async (route) => {
    const response = await route.fetch();
    held();
    await new Promise<void>((done) => {
      release = done;
    });
    await route.fulfill({ response });
  });
  await activateControl(page, library.getByRole('button', { name: 'Load', exact: true }));
  await ready;
  await page.context().clearCookies();
  await refresh(page);
  await expect(library.getByLabel('Email', { exact: true })).toBeVisible();
  release();
  await page.unrouteAll({ behavior: 'wait' });
  await expect(library).toContainText('changed while loading');
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-device-art="afdd"]')).toHaveCount(0);
  await expect(page.locator('[data-device-art="mcb"]')).toHaveCount(1);
  expect(await exportCurrent(page)).toEqual(basic);
});
