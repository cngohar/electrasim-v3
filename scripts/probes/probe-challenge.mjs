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
const missionOffer = page.getByRole('heading', { name: 'Start with a quick mission?' });
if (await missionOffer.isVisible().catch(() => false)) {
  await page.getByRole('button', { name: 'Skip to Challenges' }).click();
}
await page.waitForTimeout(600);

const card = page.locator('section[aria-label="Challenge Mode"]').locator('div.rounded-xl').filter({ hasText: 'Build a Protected Lamp' }).first();
const btn = card.getByRole('button', { name: /^(Start|Retry Challenge|Retry)$/ });

for (let i = 0; i < 4; i++) {
  const info = await btn.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    const at = document.elementFromPoint(cx, cy);
    return {
      disabled: el.disabled,
      rect: `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`,
      visible: r.width > 0 && r.height > 0,
      topElement: at ? `${at.tagName} :: ${(at.textContent ?? '').slice(0, 30)}` : 'none',
      topIsBtn: at === el,
      anims: el.getAnimations().map((a) => `${a.animationName ?? a.constructor.name}:${a.playState}`),
    };
  });
  console.log(`frame ${i}:`, JSON.stringify(info));
  await page.waitForTimeout(400);
}

// Now actually try clicking with a short timeout and force if needed
try {
  await btn.click({ timeout: 5000 });
  console.log('CLICK OK');
} catch (e) {
  console.log('CLICK FAILED:', String(e).slice(0, 300));
  try {
    await btn.click({ force: true, timeout: 5000 });
    console.log('FORCE CLICK OK');
  } catch (e2) {
    console.log('FORCE CLICK FAILED:', String(e2).slice(0, 200));
  }
}

await page.waitForTimeout(800);
const headingVisible = await page.locator('section[aria-label="Challenge Mode"]').getByRole('heading', { name: 'Build a Protected Lamp' }).isVisible().catch(() => false);
console.log('active heading visible:', headingVisible);

await browser.close();
