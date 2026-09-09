/**
 * Builders for the structured data the guide pages emit.
 *
 * Kept here rather than inline in each template because the same two shapes
 * are emitted across eight page templates, and because the values have to
 * agree with what the page shows: a breadcrumb trail marked up as one thing
 * and rendered as another is worse than no markup at all.
 */

export const SITE_ORIGIN = 'https://electrasim.com';

/** One link in a breadcrumb trail. `path` is site-relative, e.g. `/guide/`. */
export interface Crumb {
  name: string;
  path: string;
}

/**
 * A BreadcrumbList for the trail the page renders.
 *
 * The final crumb is the page itself: it is not a link on the page, but the
 * schema still names its URL so the trail resolves end to end.
 */
export function breadcrumbList(crumbs: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${SITE_ORIGIN}${crumb.path}`,
    })),
  };
}

export interface HowToStepInput {
  name: string;
  text: string;
  /** Anchor of the step on the page, without the leading `#`. */
  anchor?: string;
}

export interface HowToInput {
  name: string;
  description: string;
  /** Site-relative path of the page, e.g. `/guide/circuits/rcbo-socket/`. */
  path: string;
  /** Site-relative path of the card, e.g. `/og/guide/circuits/circuit-11.png`. */
  image?: string;
  /** What the walkthrough wires up — becomes HowToSupply. */
  supply?: string[];
  /** The tool it is done with — becomes HowToTool. */
  tool?: { name: string; url: string };
  steps: HowToStepInput[];
}

/**
 * A HowTo for a circuit walkthrough.
 *
 * Google retired HowTo rich results in 2023, so this is not chasing a star
 * rating in Search — it is for the parsers that still read it (Bing, and the
 * answer engines that consume schema.org directly), and it is the honest
 * shape for a page that is literally a numbered procedure.
 */
export function howTo({
  name,
  description,
  path,
  image,
  supply,
  tool,
  steps,
}: HowToInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    url: `${SITE_ORIGIN}${path}`,
    ...(image ? { image: `${SITE_ORIGIN}${image}` } : {}),
    ...(supply?.length
      ? { supply: supply.map((item) => ({ '@type': 'HowToSupply', name: item })) }
      : {}),
    ...(tool ? { tool: { '@type': 'HowToTool', name: tool.name, url: tool.url } } : {}),
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.anchor ? { url: `${SITE_ORIGIN}${path}#${step.anchor}` } : {}),
    })),
  };
}

/**
 * A step name from a step's prose.
 *
 * The walkthroughs are written as single sentences — "Place a Live (L)
 * terminal and a Neutral (N) terminal on the canvas." — so the name is the
 * first clause, trimmed to something that reads as a label rather than a
 * sentence cut short mid-word.
 */
export function stepName(text: string): string {
  const clause = text.split(/(?<=[.!?])\s/)[0] ?? text;
  if (clause.length <= 60) return clause.replace(/[.,;:]$/, '');
  const cut = clause.slice(0, 60);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > 30 ? space : 60).replace(/[.,;:]+$/, '')}…`;
}
