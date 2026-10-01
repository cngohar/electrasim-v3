import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { localTestUrl } from '../../scripts/local-test-url';

/** Opt-in paid fixture. Seeds only the dedicated local Playwright DB; the app
 * still authenticates a real cookie and authorizes every operation through Hono.
 */
export const test = base.extend<{ paidMembership: undefined }>({
  paidMembership: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(localTestUrl(baseURL, 'http://127.0.0.1:3000', 'paid fixture')).origin;
      const id = randomUUID();
      const response = await page.request.post(`${origin}/api/auth/sign-up/email`, {
        headers: { Origin: origin },
        data: {
          name: 'Local paid fixture',
          email: `${id}@browser.test`,
          password: 'Local-browser-test-password-123!',
        },
      });
      expect(
        response.ok(),
        'Start the dedicated local Playwright Worker for paid browser tests',
      ).toBe(true);
      const membership = await page.request.post(`${origin}/api/__test/paid-membership`, {
        headers: { Origin: origin },
        data: {},
      });
      expect(membership.ok(), 'The isolated browser-test Worker must create the fixture').toBe(
        true,
      );
      await use(undefined);
    },
    { auto: true },
  ],
});
