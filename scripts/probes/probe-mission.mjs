import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('dialog', (d) => d.accept());
await page.addInitScript(() => {
  window.localStorage.setItem('electrasim:welcomed', '1');
  window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
});

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Menu' }).click();
await page.getByText('Challenge Mode', { exact: false }).first().click();
await page.getByRole('button', { name: 'Start Challenge Mode' }).click();
await page.waitForTimeout(600);

const dialogs = await page.evaluate(() =>
  [...document.querySelectorAll('dialog[open]')].map((d) => ({
    label: d.getAttribute('aria-label'),
    text: (d.textContent ?? '').slice(0, 80),
    buttons: [...d.querySelectorAll('button')].map((b) => ({
      text: (b.textContent ?? '').trim().slice(0, 40),
      label: b.getAttribute('aria-label'),
    })),
  })),
);
console.log(JSON.stringify(dialogs, null, 2));
await browser.close();
