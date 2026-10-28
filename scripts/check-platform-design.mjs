/** Browser interaction checks for the standalone, fictional HTML design only. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium, devices, expect, webkit } from '@playwright/test';
import { localTestUrl } from './local-test-url.ts';

const origin = localTestUrl(
  process.env.ADMIN_DESIGN_ORIGIN,
  'http://127.0.0.1:8794',
  'ADMIN_DESIGN_ORIGIN',
);
mkdirSync('.wrangler/platform-admin-design', { recursive: true });
const results = [];
for (const [name, engine, options] of [
  ['desktop', chromium, { viewport: { width: 1440, height: 1080 } }],
  ['phone', chromium, { ...devices['Pixel 7'] }],
  ['safari', webkit, { ...devices['iPad Pro 11'] }],
]) {
  const browser = await engine.launch({ headless: true });
  try {
    const page = await browser.newPage(options);
    const errors = [];
    const requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', (request) =>
      requests.push({ url: request.url(), method: request.method() }),
    );
    const response = await page.goto(origin);
    assert.match(response.headers()['content-security-policy'], /connect-src 'none'/);
    await expect(
      page.getByRole('heading', { name: 'Workspace overview', exact: true }),
    ).toBeVisible();
    // Playwright's WebKit screenshot preparation injects an inline body{} style.
    // Keep the strict CSP intact; capture review artifacts with Chromium while
    // running the same functional/layout/CSP assertions on WebKit unmodified.
    await page.locator('#toast').evaluate((el) => {
      el.hidden = true;
    });
    if (name !== 'safari')
      await page.screenshot({
        path: `.wrangler/platform-admin-design/${name}-overview.png`,
        fullPage: true,
        caret: 'initial',
      });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      'No document overflow',
    );
    if (name === 'phone')
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Administration', exact: true })
      .getByRole('link', { name: /^Users/ })
      .click();
    await expect(page.getByRole('heading', { name: 'People & access', exact: true })).toBeVisible();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      'Directory stays within the phone viewport',
    );
    await page.getByRole('textbox', { name: 'Search sample users', exact: true }).fill('Maya');
    await page.getByRole('button', { name: 'Quick view for Maya Chen', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: 'Maya Chen', exact: true });
    await expect(drawer).toBeVisible();
    await page.locator('#toast').evaluate((el) => {
      el.hidden = true;
    });
    if (name !== 'safari')
      await page.screenshot({
        path: `.wrangler/platform-admin-design/${name}-account.png`,
        fullPage: true,
        caret: 'initial',
      });
    await drawer.getByRole('tab', { name: 'Access & roles', exact: true }).click();
    await drawer
      .getByRole('combobox', { name: 'System role', exact: true })
      .selectOption('moderator');
    await drawer.getByRole('button', { name: 'Review access changes', exact: true }).click();
    const review = page.getByRole('dialog', { name: 'Review account access', exact: true });
    await review.getByRole('textbox', { name: 'Reason', exact: true }).fill('Sample design review');
    await review.getByRole('button', { name: 'Apply demo change', exact: true }).click();
    await expect(drawer.getByRole('combobox', { name: 'System role', exact: true })).toHaveValue(
      'moderator',
    );
    await drawer.getByRole('tab', { name: 'Account overview', exact: true }).click();
    await drawer.getByRole('button', { name: 'Restrict community writes', exact: true }).click();
    let dialog = page.getByRole('dialog', { name: 'Restrict community writes', exact: true });
    await dialog
      .getByRole('textbox', { name: 'Reason', exact: true })
      .fill('Demo community restriction');
    await dialog.getByRole('button', { name: 'Apply demo change', exact: true }).click();
    await expect(drawer.getByText('Restriction active', { exact: true })).toBeVisible();
    await drawer.getByRole('button', { name: 'Review platform suspension', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Suspend platform account', exact: true });
    await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Demo suspension');
    await dialog.getByRole('button', { name: 'Suspend sample account', exact: true }).click();
    await expect(drawer.getByText('Platform account suspended', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Restriction active', { exact: true })).toBeVisible();
    await drawer.getByRole('button', { name: 'Review account restoration', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Restore platform account', exact: true });
    await dialog.getByRole('textbox', { name: 'Reason', exact: true }).fill('Demo restoration');
    await dialog.getByRole('button', { name: 'Apply demo change', exact: true }).click();
    await expect(drawer.getByText('Platform account active', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Restriction active', { exact: true })).toBeVisible();
    await drawer.getByRole('button', { name: 'Open full profile', exact: true }).click();
    await expect(page).toHaveURL(`${origin}/#users/usr_demo_001`);

    await expect(page.getByRole('heading', { name: 'Maya Chen', exact: true })).toBeVisible();
    await expect(page.getByText('usr_demo_001', { exact: true })).toBeVisible();
    await expect(page.getByText('Restriction active', { exact: true })).toBeVisible();
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      'Full profile fits viewport',
    );
    await page.locator('#toast').evaluate((el) => {
      el.hidden = true;
    });
    if (name !== 'safari')
      await page.screenshot({
        path: `.wrangler/platform-admin-design/${name}-profile.png`,
        fullPage: true,
        caret: 'initial',
      });
    await page.getByRole('button', { name: 'Access & roles', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'System role', exact: true })).toHaveValue(
      'moderator',
    );
    await page.getByRole('button', { name: 'Activity', exact: true }).click();
    await expect(page.getByText('Reason: Demo suspension', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Memberships', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Membership history', exact: true }),
    ).toBeVisible();
    // Plan creation, protected assignment, and the individual membership history.
    await page.evaluate(() => {
      location.hash = 'memberships';
    });
    await page.getByRole('button', { name: 'Create membership plan', exact: true }).first().click();
    await page.getByRole('textbox', { name: 'Plan name', exact: true }).fill('Pro semester');
    await page.locator('[name=plan-code]').fill('pro-semester');
    await page
      .getByRole('textbox', { name: 'Description', exact: true })
      .fill('A complete semester of guided learning.');
    await page.getByRole('combobox', { name: 'Access duration', exact: true }).selectOption('180');
    await page.getByRole('combobox', { name: 'Plan status', exact: true }).selectOption('active');
    await expect(page.locator('#plan-preview')).toContainText('Pro semester');
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      'Plan editor fits viewport',
    );
    await page.locator('#toast').evaluate((el) => {
      el.hidden = true;
    });
    if (name !== 'safari')
      await page.screenshot({
        path: `.wrangler/platform-admin-design/${name}-create-plan.png`,
        fullPage: true,
        caret: 'initial',
      });
    await page.getByRole('button', { name: 'Review new plan', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Review new membership plan', exact: true });
    await dialog
      .getByRole('textbox', { name: 'Reason', exact: true })
      .fill('Semester access for the sample programme.');
    await dialog.getByRole('button', { name: 'Create sample plan', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Pro semester', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Assign membership', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Assign membership', exact: true });
    await dialog
      .getByRole('combobox', { name: 'Member', exact: true })
      .selectOption('usr_demo_005');
    await dialog
      .getByRole('combobox', { name: 'Membership plan', exact: true })
      .selectOption({ label: 'Pro semester · 180 days' });
    await expect(dialog.locator('#grant-preview')).toContainText('2027-04-22');
    await expect(dialog.getByRole('option', { name: /Study access/ })).toHaveCount(0);
    await page.locator('#toast').evaluate((el) => {
      el.hidden = true;
    });
    if (name !== 'safari')
      await page.screenshot({
        path: `.wrangler/platform-admin-design/${name}-assign-membership.png`,
        fullPage: true,
        caret: 'initial',
      });
    await dialog
      .getByRole('textbox', { name: 'Reason', exact: true })
      .fill('Enroll Ethan in the sample semester.');
    await dialog.getByRole('button', { name: 'Assign sample membership', exact: true }).click();
    await page.getByRole('button', { name: /^Member grants/ }).click();
    const grantRow = page.getByRole('row').filter({ hasText: 'Ethan Williams' });
    await expect(grantRow).toContainText('Pro semester');
    await expect(grantRow).toContainText('2027-04-22');
    await grantRow.getByRole('button', { name: /Ethan Williams/ }).click();
    await expect(page).toHaveURL(`${origin}/#users/usr_demo_005`);
    await expect(page.getByRole('heading', { name: 'Ethan Williams', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Memberships', exact: true }).click();
    await expect(page.getByRole('row').filter({ hasText: 'Pro semester' })).toContainText(
      'Enroll Ethan',
    );
    await page.getByRole('button', { name: 'Assign membership', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Assign membership', exact: true });
    await expect(dialog.getByRole('combobox', { name: 'Member', exact: true })).toHaveValue(
      'usr_demo_005',
    );
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await page.getByRole('button', { name: 'Overview', exact: true }).click();
    await page.getByRole('button', { name: 'Review platform suspension', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Suspend platform account', exact: true });
    await dialog
      .getByRole('textbox', { name: 'Reason', exact: true })
      .fill('Verify dedicated page targets Ethan.');
    await dialog.getByRole('button', { name: 'Suspend sample account', exact: true }).click();
    await expect(page.getByText('Platform account suspended', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Quick view', exact: true }).click();
    const ethanDrawer = page.getByRole('dialog', { name: 'Ethan Williams', exact: true });
    await expect(ethanDrawer).toBeVisible();
    await expect(ethanDrawer.getByText('Pro semester', { exact: true })).toBeVisible();
    await expect(
      ethanDrawer.getByText('Manual grant · Ends 2027-04-22', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Close account', exact: true }).click();
    // Reload preserves the route and intentionally resets fictional memory edits.
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Ethan Williams', exact: true })).toBeVisible();
    await expect(page.getByText('Platform account active', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: '← All users', exact: true }).click();
    await page.getByRole('button', { name: /Maya Chen maya.chen/ }).click();
    await expect(page).toHaveURL(`${origin}/#users/usr_demo_001`);
    // Component policy design: full canonical catalogue, locked Basic baseline,
    // reasoned Free/Pro changes, explicit conflict recovery and protected scope.
    await page.evaluate(() => {
      location.hash = 'components';
    });
    await expect(
      page.getByRole('heading', { name: 'Component access', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText('116 components · 75 protected Basic · policy revision 1'),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Next components', exact: true }).click();
    await expect(page.getByText('116 matching components · page 2 of 10')).toBeVisible();
    await page
      .getByRole('combobox', { name: 'Component access filter', exact: true })
      .selectOption('protected');
    await expect(page.getByText('75 matching components · page 1 of 7')).toBeVisible();
    await page
      .getByRole('combobox', { name: 'Component access filter', exact: true })
      .selectOption('pro');
    await expect(page.getByText('41 matching components · page 1 of 4')).toBeVisible();
    await page
      .getByRole('combobox', { name: 'Component category', exact: true })
      .selectOption('switch');
    await expect(
      page.getByRole('button', { name: 'View Intermediate Switch', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('textbox', { name: 'Search components', exact: true })
      .fill('no-such-component');
    await expect(page.getByText('No matching components', { exact: true })).toBeVisible();
    await page
      .getByRole('textbox', { name: 'Search components', exact: true })
      .fill('intermediate-switch');
    await page.getByRole('button', { name: 'View Intermediate Switch', exact: true }).click();
    await expect(page).toHaveURL(`${origin}/#components/intermediate-switch`);
    await expect(page.getByText('Saved circuit count:')).toContainText('Unavailable');
    await page.getByRole('button', { name: 'Review free access', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Review component access', exact: true });
    await dialog.getByRole('button', { name: 'Apply demo change', exact: true }).click();
    await expect(dialog).toBeVisible(); // An empty reason cannot commit.
    await dialog
      .getByRole('textbox', { name: 'Reason', exact: true })
      .fill('Open sample lesson access.');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Review free access', exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Review free access', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Review component access', exact: true });
    await dialog
      .getByRole('textbox', { name: 'Reason', exact: true })
      .fill('Open sample lesson access.');
    await dialog.getByRole('button', { name: 'Apply demo change', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Review Pro requirement', exact: true }),
    ).toBeVisible();
    await page.locator('#toast').evaluate((el) => {
      el.hidden = true;
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
      'Component detail fits viewport',
    );
    if (name !== 'safari')
      await page.screenshot({
        path: `.wrangler/platform-admin-design/${name}-component.png`,
        fullPage: true,
        caret: 'initial',
      });
    await page.getByRole('button', { name: 'Review Pro requirement', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Review component access', exact: true });
    await expect(dialog).toContainText('no component is removed');
    await dialog
      .getByRole('textbox', { name: 'Reason', exact: true })
      .fill('Restore sample Pro access.');
    await dialog.getByText('Preview a concurrent change', { exact: true }).click();
    await dialog
      .getByRole('button', { name: 'Simulate concurrent policy change', exact: true })
      .click();
    await dialog.getByRole('button', { name: 'Apply demo change', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Your change was not applied');
    await expect(
      page.getByRole('button', { name: 'Review Pro requirement', exact: true }),
    ).toBeDisabled();
    await expect(page.getByText('Reason: Restore sample Pro access.')).toHaveCount(0);
    await page.getByRole('button', { name: 'Reload current policy', exact: true }).click();
    await page.getByRole('button', { name: 'Review Pro requirement', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Review component access', exact: true });
    await expect(dialog.getByRole('textbox', { name: 'Reason', exact: true })).toHaveValue('');
    await dialog
      .getByRole('textbox', { name: 'Reason', exact: true })
      .fill('Restore sample Pro access.');
    await dialog.getByRole('button', { name: 'Apply demo change', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Review free access', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Reason: Open sample lesson access.')).toBeVisible();
    await expect(page.getByText('Reason: Restore sample Pro access.')).toBeVisible();
    await page.evaluate(() => {
      location.hash = 'components/single-way-switch';
    });
    await expect(
      page.getByRole('button', { name: 'Basic access locked', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: /Review (free access|Pro requirement)/ }),
    ).toHaveCount(0);
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Single-way Switch', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      location.hash = 'components/unknown';
    });
    await expect(
      page.getByRole('heading', { name: 'Component unavailable', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      location.hash = 'audit';
    });
    await page.getByRole('combobox', { name: 'Audit scope', exact: true }).selectOption('catalog');
    await expect(page.getByText('No matching activity', { exact: true })).toBeVisible(); // Reload reset fictional edits.
    // Neither a direct URL nor ordinary staff navigation opens the catalogue.
    if (name === 'phone')
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('combobox', { name: 'Preview as', exact: true }).selectOption('admin');
    await expect(
      page
        .getByRole('navigation', { name: 'Administration', exact: true })
        .getByRole('link', { name: 'Components', exact: true }),
    ).toHaveCount(0);
    await page.evaluate(() => {
      location.hash = 'components/intermediate-switch';
    });
    await expect(
      page.getByRole('heading', { name: 'Workspace overview', exact: true }),
    ).toBeVisible();
    await page.evaluate(() => {
      location.hash = 'audit';
    });
    await expect(page.getByRole('option', { name: 'Catalogue', exact: true })).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: 'intermediate-switch' })).toHaveCount(0);
    if (name === 'phone')
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Preview as', exact: true })
      .selectOption('super_admin');
    await page.evaluate(() => {
      location.hash = 'users/usr_demo_001';
    });
    await expect(page.getByRole('heading', { name: 'Maya Chen', exact: true })).toBeVisible();

    if (name === 'phone')
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Administration', exact: true })
      .getByRole('link', { name: 'Access & roles', exact: true })
      .click();
    await expect(page.getByRole('heading', { name: 'Access & roles', exact: true })).toBeVisible();
    await expect(
      page.getByRole('checkbox', {
        name: 'Moderator: View users and contact details',
        exact: true,
      }),
    ).not.toBeChecked();
    if (name === 'phone')
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    await page.getByRole('combobox', { name: 'Preview as', exact: true }).selectOption('moderator');
    const nav = page.getByRole('navigation', { name: 'Administration', exact: true });
    await expect(nav.getByRole('link', { name: /^Users/ })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Memberships', exact: true })).toHaveCount(0);
    await expect(nav.getByRole('link', { name: 'Components', exact: true })).toHaveCount(0);
    await nav.getByRole('link', { name: 'Community settings', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: /Auto-hide threshold/ })).toBeDisabled();
    await page.keyboard.press('Control+k');
    await expect(
      page.getByRole('dialog', { name: 'Find anything in this workspace', exact: true }),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    assert.deepEqual(errors, [], 'No runtime or CSP errors');
    assert(
      requests.every(
        (request) =>
          request.url.startsWith(origin) &&
          request.method === 'GET' &&
          !new URL(request.url).pathname.startsWith('/api/'),
      ),
      'Demo never calls APIs or external origins',
    );
    results.push({
      name,
      status: 'passed',
      screenshots:
        name === 'safari'
          ? []
          : [
              `${name}-overview.png`,
              `${name}-account.png`,
              `${name}-profile.png`,
              `${name}-create-plan.png`,
              `${name}-assign-membership.png`,
              `${name}-component.png`,
            ],
      network: 'same-origin GET assets only; no API requests',
    });
    console.log(
      `PASS ${name}: overview, user routes, memberships, component access/filter/review/conflict/recovery and protected Basic, restrictions/suspension, role preview, keyboard search and isolated network`,
    );
  } finally {
    await browser.close();
  }
}
writeFileSync('.wrangler/platform-admin-design/checks.json', JSON.stringify(results, null, 2));
console.log(
  'Standalone admin design checks passed across desktop, phone and WebKit. This is not production acceptance.',
);
