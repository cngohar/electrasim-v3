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

const info = await page.evaluate(() => {
  const startBtn = [...document.querySelectorAll('section[aria-label="Challenge Mode"] button')]
    .find((b) => /^(Start|Retry)/.test(b.textContent.trim()) && !/mission/i.test(b.textContent));
  if (!startBtn) return { found: false };
  const r = startBtn.getBoundingClientRect();
  const cx = r.x + r.width / 2;
  const cy = r.y + r.height / 2;
  const chain = [];
  let at = document.elementFromPoint(cx, cy);
  let depth = 0;
  while (at && depth < 6) {
    const b = at.getBoundingClientRect();
    chain.push({
      tag: at.tagName,
      cls: String(at.className?.baseVal ?? at.className ?? '').slice(0, 80),
      label: at.getAttribute('aria-label'),
      title: at.getAttribute('title'),
      text: (at.textContent ?? '').slice(0, 30),
      rect: `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}x${Math.round(b.height)}`,
    });
    at = at.parentElement;
    depth += 1;
  }
  return { found: true, chain };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
