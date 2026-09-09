/**
 * The structured-data builders.
 *
 * The risk these guard against is not malformed JSON — it is markup that
 * quietly disagrees with the page: a breadcrumb trail that names three crumbs
 * where the reader sees four, a step list whose anchors point at nothing. The
 * builders are fed from the same array the page renders, so most of what is
 * worth testing is that they pass it through unchanged.
 */

import { describe, expect, it } from 'vitest';
import { SITE_ORIGIN, breadcrumbList, howTo, stepName } from './structured-data';

describe('breadcrumbList', () => {
  it('numbers the crumbs from one and keeps their order', () => {
    const schema = breadcrumbList([
      { name: 'Home', path: '/' },
      { name: 'Circuit Guide', path: '/guide/' },
      { name: 'Components', path: '/guide/components/' },
    ]);
    expect(schema['@type']).toBe('BreadcrumbList');
    expect(schema.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Circuit Guide', item: `${SITE_ORIGIN}/guide/` },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Components',
        item: `${SITE_ORIGIN}/guide/components/`,
      },
    ]);
  });

  it('names the current page as the final crumb', () => {
    /* The trail has to resolve end to end, including the page you are on —
       it is not a link on the page, but the schema still names its URL. */
    const schema = breadcrumbList([
      { name: 'Home', path: '/' },
      { name: 'RCBO Socket', path: '/guide/circuits/rcbo-socket/' },
    ]);
    const crumbs = schema.itemListElement as { name: string; item: string }[];
    expect(crumbs.at(-1)).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'RCBO Socket',
      item: `${SITE_ORIGIN}/guide/circuits/rcbo-socket/`,
    });
  });
});

describe('howTo', () => {
  const base = {
    name: 'Protected Lamp Circuit',
    description: 'A supply, one protective device and a lamp.',
    path: '/guide/circuits/protected-lamp/',
    steps: [
      {
        name: 'Place the terminals',
        text: 'Place a Live and a Neutral terminal.',
        anchor: 'step-1',
      },
      { name: 'Wire it up', text: 'Wire: Live → MCB → Bulb → Neutral.', anchor: 'step-2' },
    ],
  };

  it('describes the page and numbers its steps', () => {
    const schema = howTo(base);
    expect(schema['@type']).toBe('HowTo');
    expect(schema.name).toBe(base.name);
    expect(schema.url).toBe(`${SITE_ORIGIN}${base.path}`);
    expect(schema.step).toEqual([
      {
        '@type': 'HowToStep',
        position: 1,
        name: 'Place the terminals',
        text: 'Place a Live and a Neutral terminal.',
        url: `${SITE_ORIGIN}${base.path}#step-1`,
      },
      {
        '@type': 'HowToStep',
        position: 2,
        name: 'Wire it up',
        text: 'Wire: Live → MCB → Bulb → Neutral.',
        url: `${SITE_ORIGIN}${base.path}#step-2`,
      },
    ]);
  });

  it('turns the parts list into supplies and the app into the tool', () => {
    const schema = howTo({
      ...base,
      image: '/og/guide/circuits/circuit-9.png?v=110d0fd211',
      supply: ['Live (L)', 'MCB', 'Bulb (E27)'],
      tool: { name: 'ElectraSim', url: 'https://electrasim.com/app/' },
    });
    expect(schema.image).toBe(`${SITE_ORIGIN}/og/guide/circuits/circuit-9.png?v=110d0fd211`);
    expect(schema.supply).toEqual([
      { '@type': 'HowToSupply', name: 'Live (L)' },
      { '@type': 'HowToSupply', name: 'MCB' },
      { '@type': 'HowToSupply', name: 'Bulb (E27)' },
    ]);
    expect(schema.tool).toEqual({
      '@type': 'HowToTool',
      name: 'ElectraSim',
      url: 'https://electrasim.com/app/',
    });
  });

  it('leaves optional properties out rather than emitting them empty', () => {
    const schema = howTo(base);
    expect(schema).not.toHaveProperty('image');
    expect(schema).not.toHaveProperty('supply');
    expect(schema).not.toHaveProperty('tool');
    expect(howTo({ ...base, supply: [] })).not.toHaveProperty('supply');
  });

  it('omits a step URL when the step has no anchor', () => {
    const schema = howTo({
      ...base,
      steps: [{ name: 'Place the terminals', text: 'Place a Live and a Neutral terminal.' }],
    });
    expect((schema.step as Record<string, unknown>[])[0]).not.toHaveProperty('url');
  });
});

describe('stepName', () => {
  it('uses a short step as its own label', () => {
    expect(stepName('Press Run.')).toBe('Press Run');
  });

  it('takes the first sentence when a step runs on', () => {
    expect(stepName('Place an MCB to the right of the Live terminal. Then wire it up.')).toBe(
      'Place an MCB to the right of the Live terminal',
    );
  });

  it('cuts a long step at a word rather than mid-word', () => {
    const name = stepName(
      'Connect the earth from the consumer unit to the metal back box of the socket outlet and then to the faceplate earth terminal',
    );
    expect(name.length).toBeLessThanOrEqual(61);
    expect(name.endsWith('…')).toBe(true);
    expect(name).not.toMatch(/\s…$/);
    expect(name.startsWith('Connect the earth from the consumer unit to the metal back')).toBe(
      true,
    );
  });
});
