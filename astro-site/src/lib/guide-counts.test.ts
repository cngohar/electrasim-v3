/**
 * Guide count regression guard.
 *
 * The guide's copy quotes how big it is — "twenty step-by-step wiring
 * walkthroughs", "Open 20 built-in guided circuits … ten starter circuits and
 * ten Pro scenarios", "Twenty circuits, from one lamp to a full panel." Those
 * sentences are hand-written prose sitting in JSON and .astro files, so they
 * drifted silently when the corpus grew: three live pages were still telling
 * visitors the guide had eight walkthroughs when it had twenty.
 *
 * This test reads the quoted numbers back out of the copy and ties each one to
 * the array it describes. Adding a circuit or a template now fails the build
 * until the sentence that counts them is updated with it.
 */

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

type Guide = {
  circuits: { id: string; app_template?: string }[];
  guided_templates: { id: string; level?: string }[];
};

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

/** Reads a copy source if it exists, so moving a page cannot break this guard. */
const readIfExists = (path: string) =>
  existsSync(new URL(path, import.meta.url)) ? read(path) : '';

const guide = JSON.parse(read('../content/pages/guide.json')) as Guide;

/** Copy that quotes corpus sizes. Add files here as the guide grows. */
const COPY_SOURCES = [
  '../content/pages/guide.json',
  '../pages/guide.astro',
  '../pages/guide/circuits/index.astro',
  '../pages/guide/templates/index.astro',
  '../pages/guide/components/index.astro',
  '../pages/guide/tools/index.astro',
].map(readIfExists);

/** Every string in a JSON tree, so nested bodies are scanned too. */
function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((item) => collectStrings(item, out));
  else if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) collectStrings(nested, out);
  }
  return out;
}

const corpus = [...collectStrings(guide), ...COPY_SOURCES].join('\n---\n');

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
};

function toNumber(token: string): number {
  if (/^\d+$/.test(token)) return Number(token);
  return NUMBER_WORDS[token.toLowerCase()] ?? Number.NaN;
}

const circuits = guide.circuits ?? [];
const templates = guide.guided_templates ?? [];
const starterTemplates = templates.filter((t) => !String(t.id ?? '').startsWith('pro-'));
const proTemplates = templates.filter((t) => String(t.id ?? '').startsWith('pro-'));

/**
 * Each pattern captures the number quoted immediately before a phrase that can
 * only mean one corpus. `expected` is derived from the data, never hardcoded.
 */
const CHECKS = [
  {
    label: 'step-by-step wiring walkthroughs',
    pattern: /(\d+|[A-Za-z]+)\s+step-by-step wiring walkthroughs/gi,
    expected: circuits.length,
  },
  {
    label: 'real wiring walkthroughs',
    pattern: /(\d+|[A-Za-z]+)\s+real wiring walkthroughs/gi,
    expected: circuits.length,
  },
  {
    label: 'guided circuit walkthroughs',
    pattern: /(\d+|[A-Za-z]+)\s+guided circuit walkthroughs/gi,
    expected: circuits.length,
  },
  {
    label: 'circuits index heading',
    pattern: /<h1>(\d+|[A-Za-z]+)\s+circuits,/gi,
    expected: circuits.length,
  },
  {
    label: 'built-in guided circuits',
    pattern: /(\d+|[A-Za-z]+)\s+built-in guided circuits/gi,
    expected: templates.length,
  },
  {
    label: 'starter circuits',
    pattern: /(\d+|[A-Za-z]+)\s+starter circuits/gi,
    expected: starterTemplates.length,
  },
  {
    label: 'Pro scenarios',
    pattern: /(\d+|[A-Za-z]+)\s+Pro scenarios/gi,
    expected: proTemplates.length,
  },
];

describe('guide corpus counts quoted in copy', () => {
  it('has the corpora the patterns describe', () => {
    // Guards the guard: if the data shape changes, fail loudly rather than
    // letting every pattern below match zero times and pass vacuously.
    expect(circuits.length).toBeGreaterThan(0);
    expect(templates.length).toBeGreaterThan(0);
    expect(starterTemplates.length + proTemplates.length).toBe(templates.length);
  });

  for (const check of CHECKS) {
    it(`quotes ${check.expected} for "${check.label}"`, () => {
      const matches = [...corpus.matchAll(check.pattern)];

      // A rewritten sentence must not make this check disappear silently.
      expect(matches.length, `no copy found quoting a count for "${check.label}"`).toBeGreaterThan(
        0,
      );

      for (const match of matches) {
        const quoted = toNumber(match[1]);
        expect(
          Number.isNaN(quoted) ? `unparseable count "${match[1]}"` : quoted,
          `"${match[0].trim()}" disagrees with the ${check.expected} ${check.label} in guide.json`,
        ).toBe(check.expected);
      }
    });
  }

  it('links every walkthrough to a template the app actually ships', () => {
    const missing = circuits
      .map((circuit) => circuit.app_template)
      .filter((id): id is string => Boolean(id))
      .filter((id) => !templates.some((template) => template.id === id));

    expect(
      missing,
      `walkthroughs pointing at unknown app templates: ${missing.join(', ')}`,
    ).toEqual([]);
  });
});
