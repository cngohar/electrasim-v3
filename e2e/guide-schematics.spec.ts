import { existsSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { circuitSlug } from '../astro-site/src/lib/guide';
import type { GuideCircuit } from '../astro-site/src/types/pages';

const astroBaseURL = process.env.PLAYWRIGHT_ASTRO_BASE_URL ?? 'http://127.0.0.1:8788';
const astroBuilt = existsSync('dist/guide/index.html');
const guideData = JSON.parse(readFileSync('astro-site/src/content/pages/guide.json', 'utf8')) as {
  circuits: GuideCircuit[];
};
const routes = guideData.circuits.map((circuit) => `/guide/circuits/${circuitSlug(circuit)}/`);
const wireStrokes = {
  wl: 'rgb(220, 38, 38)',
  wn: 'rgb(15, 23, 42)',
  we: 'rgb(5, 150, 105)',
  wdp: 'rgb(220, 38, 38)',
  wdn: 'rgb(29, 78, 216)',
} as const;
const defaultWireStroke = 'rgb(180, 83, 9)';

test.use({ baseURL: astroBaseURL });
test.skip(!astroBuilt, 'The Astro guide must be built before this production check can run');

test('every circuit schematic survives the production CSP', async ({ page }) => {
  await page.addInitScript(() => {
    const scope = window as unknown as { __cspViolations?: string[] };
    scope.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      scope.__cspViolations?.push(`${event.effectiveDirective}: ${event.blockedURI}`);
    });
  });

  expect(routes.length).toBe(20);

  for (const route of routes) {
    const response = await page.goto(route, { waitUntil: 'load' });
    expect(response?.status(), route).toBe(200);
    expect(response?.headers()['content-security-policy'], route).toContain("style-src 'self'");
    expect(response?.headers()['content-security-policy'], route).not.toContain('unsafe-inline');

    const result = await page.evaluate(() => {
      const scope = window as unknown as { __cspViolations?: string[] };
      const wires = Array.from(document.querySelectorAll<SVGElement>('.schem .w'));
      const device = document.querySelector<SVGElement>('.schem .dev');
      const symbol = document.querySelector<SVGElement>('.schem .sym');

      return {
        inlineStyles: document.querySelectorAll('.schem style').length,
        wires: wires.map((wire) => ({
          className: wire.getAttribute('class') ?? '',
          stroke: getComputedStyle(wire).stroke,
          fill: getComputedStyle(wire).fill,
        })),
        deviceFill: device ? getComputedStyle(device).fill : '',
        symbolStroke: symbol ? getComputedStyle(symbol).stroke : '',
        cspViolations: scope.__cspViolations ?? [],
      };
    });

    expect(result.inlineStyles, route).toBe(0);
    expect(result.wires.length, route).toBeGreaterThan(0);
    for (const wire of result.wires) {
      const colorClass = Object.keys(wireStrokes).find((colorClass) =>
        wire.className.split(/\s+/).includes(colorClass),
      );
      expect(wire.stroke, `${route} ${wire.className}`).toBe(
        colorClass ? wireStrokes[colorClass as keyof typeof wireStrokes] : defaultWireStroke,
      );
      expect(wire.fill, `${route} ${wire.className}`).toBe('none');
    }
    expect(result.deviceFill, route).toBe('rgb(241, 245, 249)');
    expect(result.symbolStroke, route).toBe('rgb(30, 41, 59)');
    expect(result.cspViolations, route).toEqual([]);
  }
});
