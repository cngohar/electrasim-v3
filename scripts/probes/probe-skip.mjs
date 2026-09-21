import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('dialog', (d) => d.accept());
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text().slice(0, 200)); });
page.on('pageerror', (e) => console.log('PAGE ERR:', String(e).slice(0, 300)));
await page.addInitScript(() => {
  window.localStorage.setItem('electrasim:welcomed', '1');
  window.localStorage.setItem('electrasim:mobile-suitability:v1', '1');
});

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Menu' }).click();
await page.getByText('Challenge Mode', { exact: false }).first().click();
await page.getByRole('button', { name: 'Start Challenge Mode' }).click();
await page.waitForTimeout(500);

const skip = page.getByRole('button', { name: 'Skip to Challenges' });
console.log('skip visible:', await skip.isVisible().catch(() => false));
await skip.click();
await page.waitForTimeout(800);

const after = await page.evaluate(() => ({
  openDialogs: [...document.querySelectorAll('dialog[open]')].map((d) => (d.textContent ?? '').slice(0, 40)),
  missionHeading: !!document.querySelector('[aria-label="Start with a quick mission?"]'),
  panelVisible: !!document.querySelector('section[aria-label="Challenge Mode"]'),
}));
console.log(JSON.stringify(after, null, 2));

const offerAgain = page.getByRole('heading', { name: 'Start with a quick mission?' });
console.log('offer visible after:', await offerAgain.isVisible().catch(() => false));

await browser.close();
