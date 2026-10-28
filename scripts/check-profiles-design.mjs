/** Isolated profile concept workflows. Does not exercise or accept product APIs. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { once } from 'node:events';
import { chromium, devices, expect, webkit } from '@playwright/test';

const port = 8796;
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['scripts/preview-profiles.mjs'], {
  env: { ...process.env, PROFILES_DESIGN_PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
const results = [];
const output = '.wrangler/profiles-design';
mkdirSync(output, { recursive: true });
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Preview startup timed out')), 10000);
    server.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    server.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Preview exited ${code}`));
    });
    server.stderr.on('data', (chunk) => {
      clearTimeout(timer);
      reject(new Error(String(chunk)));
    });
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes(origin)) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
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
      assert.equal(response.status(), 200);
      assert.match(response.headers()['content-security-policy'], /connect-src 'none'/);
      await expect(page.getByRole('heading', { name: 'Maya Chen', exact: true })).toBeVisible();
      const noOverflow = async () =>
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
          ),
          `${name}: no horizontal document overflow`,
        );
      const shot = async (screen) => {
        if (name === 'safari') return; // WebKit screenshot preparation injects a style blocked by strict CSP.
        await page.locator('#toast').evaluate((element) => {
          element.hidden = true;
        });
        await page.screenshot({
          path: `${output}/${name}-${screen}.png`,
          fullPage: true,
          caret: 'initial',
        });
      };
      const nav = async (screen) =>
        page
          .getByRole('navigation', { name: 'Design review screens' })
          .getByRole('link', { name: screen, exact: true })
          .click();
      const sample = async (state) => {
        await page.getByRole('button', { name: 'Reset demo' }).click();
        await page.getByLabel('Starting profile').selectOption(state);
        await page.getByRole('button', { name: 'Load sample' }).click();
      };
      await noOverflow();
      await shot('public');
      await page.getByRole('tab', { name: 'Circuits' }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'About', exact: true })).toBeFocused();
      await expect(page.getByRole('heading', { name: 'A little about Maya' })).toBeVisible();
      await page.getByRole('button', { name: 'Report profile', exact: false }).first().click();
      await expect(
        page.getByRole('heading', { name: 'Sign in to report a profile' }),
      ).toBeVisible();
      await page.getByRole('button', { name: 'Continue as sample member' }).click();
      await page.getByLabel('Reason', { exact: true }).selectOption('Spam');
      await page.getByLabel('Details').fill('Repeated promotional profile details.');
      await page.getByRole('button', { name: 'Submit report' }).click();
      await page.getByRole('button', { name: 'Report profile', exact: false }).first().click();
      await expect(page.getByRole('status')).toContainText('already reported');
      assert.equal(await page.getByRole('dialog').count(), 0);
      await nav('Edit profile');
      await page.getByLabel('Display name', { exact: true }).fill('Maya Example');
      await page
        .getByLabel('Bio', { exact: false })
        .fill('Practical motor controls. <script>alert(1)</script>');
      await expect(page.locator('#live-card')).toContainText('Maya Example');
      await page.locator('#avatar-file').setInputFiles({
        name: 'bad.svg',
        mimeType: 'image/svg+xml',
        buffer: Buffer.from('<svg/>'),
      });
      await expect(page.locator('#avatar-error')).toContainText('Choose a JPG');
      await page.locator('#avatar-file').setInputFiles({
        name: 'sample.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA1sAAAAASUVORK5CYII=',
          'base64',
        ),
      });
      await expect(page.locator('#edit-avatar img')).toBeVisible();
      await page.getByLabel('Show my institution').uncheck();
      await page.getByLabel('Show my learning level').uncheck();
      await page.getByRole('button', { name: 'Save profile', exact: true }).click();
      await noOverflow();
      await shot('edit');
      await nav('Public profile');
      await expect(page.getByRole('heading', { name: 'Maya Example', exact: true })).toBeVisible();
      await expect(page.locator('.profile-identity')).not.toContainText('Northbridge');
      await expect(page.locator('.profile-identity')).not.toContainText(
        'Electrical engineering student',
      );
      await expect(page.locator('.profile-bio').first()).toContainText('<script>');
      assert.equal(await page.locator('#main script').count(), 0);
      await nav('Edit profile');
      await page.getByRole('radio', { name: 'Private profile' }).check();
      await page.getByRole('button', { name: 'Save profile', exact: true }).click();
      await nav('Public profile');
      await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
      await expect(page.locator('#main')).not.toContainText('Maya Example');
      assert.equal(await page.locator('#main img').count(), 0);
      await page.getByLabel('Preview as', { exact: true }).selectOption('owner');
      await expect(page.locator('#main')).toContainText('Your profile is private');
      await shot('private');
      // Staff clearance must preserve the owner's privacy choice.
      await nav('Staff review');
      await page.getByRole('button', { name: 'Remove avatar', exact: true }).click();
      await page.getByLabel('Reason for the record').fill('Reviewed the sample uploaded photo.');
      await page.getByRole('button', { name: 'Confirm avatar removal' }).click();
      await expect(page.getByText('Avatar removed', { exact: true })).toBeVisible();
      await nav('Public profile');
      await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
      await nav('Staff review');
      await page.getByRole('button', { name: 'Hide profile', exact: true }).click();
      await page.getByRole('button', { name: 'Confirm hide' }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByLabel('Reason for the record').fill('Identity needs a closer review.');
      await page.getByRole('button', { name: 'Confirm hide' }).click();
      await expect(page.getByText('Profile hidden', { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Restore profile' }).click();
      await page.getByLabel('Reason for the record').fill('Reviewed the corrected identity.');
      await page.getByRole('button', { name: 'Confirm restore' }).click();
      await nav('Public profile');
      await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
      await sample('default');
      await nav('Staff review');
      // A concurrent change cannot apply a stale reasoned decision.
      await page.getByRole('button', { name: 'Hide profile', exact: true }).click();
      await page.getByLabel('Reason for the record').fill('Checking concurrent profile change.');
      await page.getByLabel('Simulate another edit before this save').check();
      await page.getByRole('button', { name: 'Confirm hide' }).click();
      await expect(page.locator('#moderation-error')).toContainText('changed during review');
      await expect(page.getByRole('button', { name: 'Confirm hide' })).toBeDisabled();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Hide profile', exact: true }).click();
      await expect(page.getByLabel('Reason for the record')).toHaveValue('');
      await page
        .getByLabel('Reason for the record')
        .fill('Reviewed latest profile; identity issue remains.');
      await page.getByRole('button', { name: 'Confirm hide' }).click();
      await nav('Edit profile');
      await page.getByLabel('Display name', { exact: true }).fill('Owner edits hidden profile');
      await page.getByRole('button', { name: 'Save profile', exact: true }).click();
      await nav('Public profile');
      await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
      await expect(page.locator('#main')).not.toContainText('Owner edits hidden profile');
      await nav('Staff review');
      await noOverflow();
      await shot('staff');
      await page.getByRole('button', { name: 'Review report', exact: true }).first().click();
      await page.getByLabel('Outcome').selectOption('dismissed');
      await page
        .getByLabel('Decision reason')
        .fill('Insufficient evidence in this specific report.');
      await page.getByRole('button', { name: 'Save report outcome' }).click();
      await expect(page.getByRole('button', { name: 'Restore profile' })).toBeVisible();
      await page.getByLabel('Preview staff access').selectOption('reader');
      assert.equal(await page.getByRole('button', { name: 'Restore profile' }).count(), 0);
      assert.equal(
        await page.getByRole('button', { name: 'Remove profile', exact: true }).count(),
        0,
      );
      await page.getByLabel('Preview staff access').selectOption('moderator');
      await page.getByRole('button', { name: 'Remove profile', exact: true }).click();
      await page
        .getByLabel('Reason for the record')
        .fill('Confirmed repeated impersonation after review.');
      await page.getByRole('button', { name: 'Confirm remove' }).click();
      await expect(page.getByText('Removed · Tombstone retained', { exact: true })).toBeVisible();
      assert.equal(await page.getByRole('button', { name: 'Restore profile' }).count(), 0);
      await nav('Public profile');
      await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
      await sample('new');
      await nav('Edit profile');
      await expect(page.getByRole('radio', { name: 'Private profile' })).toBeChecked();
      await expect(page.getByLabel('Show my institution')).not.toBeChecked();
      await expect(page.getByLabel('Show my learning level')).not.toBeChecked();
      for (const [value, expected] of [
        ['admin', 'reserved'],
        ['alex_morgan', 'already claimed'],
        ['UPPER', 'lowercase'],
      ]) {
        await page.getByLabel('Handle', { exact: false }).fill(value);
        await page.getByRole('button', { name: 'Save profile', exact: true }).click();
        await expect(page.locator('#save-error')).toContainText(expected);
      }
      await page.getByLabel('Handle', { exact: false }).fill('new_builder');
      await page.getByRole('button', { name: 'Save profile', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Claim @new_builder?' })).toBeVisible();
      await page.getByRole('button', { name: 'Claim handle & save' }).click();
      await expect(page.getByLabel('Handle', { exact: false })).toHaveAttribute('readonly', '');
      await noOverflow();
      // A full reload resets memory, including the handle, reports and moderation.
      await page.reload();
      await expect(page.getByLabel('Handle', { exact: false })).toHaveValue('maya_chen');
      const headers = await page.request.get(origin);
      assert.match(headers.headers()['x-robots-tag'], /noindex/);
      const post = await page.request.post(origin);
      assert.equal(post.status(), 405);
      for (const request of requests) {
        if (request.url.startsWith('data:')) continue;
        assert.equal(
          new URL(request.url).origin,
          origin,
          'Browser traffic stays on the preview origin',
        );
        assert.equal(request.method, 'GET');
        assert(!new URL(request.url).pathname.startsWith('/api/'));
      }
      assert.deepEqual(errors, [], 'No runtime or CSP errors');
      results.push({
        project: name,
        status: 'passed',
        scope: 'Profile concept workflows only; no product API/SSR/storage acceptance',
        screenshots: name === 'safari' ? [] : ['public', 'edit', 'private', 'staff'],
      });
      console.log(
        `${name}: profile, privacy, avatar, reports, moderation, conflict, handle and layout checks passed`,
      );
    } finally {
      await browser.close();
    }
  }
  writeFileSync(
    `${output}/results.json`,
    `${JSON.stringify({ at: new Date().toISOString(), results }, null, 2)}\n`,
  );
} finally {
  if (server.exitCode === null) {
    const stopped = once(server, 'exit');
    server.kill('SIGTERM');
    await stopped;
  }
}
