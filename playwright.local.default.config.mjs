import { defineConfig } from '@playwright/test';
import base from './playwright.config';
const launchOptions = {
  executablePath: '/tmp/pwb/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--use-gl=swiftshader', '--no-zygote'],
};
export default defineConfig({
  ...base,
  testMatch: /cable-size\.spec\.ts/,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  projects: (base.projects ?? []).map((p) => {
    const { defaultBrowserType, ...use } = p.use ?? {};
    return { ...p, use: { ...use, browserName: 'chromium', launchOptions } };
  }),
});
