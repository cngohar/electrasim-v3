import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import guideData from '../content/pages/guide.json';
import { GLOSSARY } from '../lib/glossary';
import { type RawBlogPost, type RawGuideCircuit, buildSearchIndex } from '../lib/search';
import { TOOLBOX_REGISTRY } from '../lib/tools/registry';

export const GET: APIRoute = async () => {
  const blogPosts = await getCollection('blog', ({ data }) => !data.draft);
  const updatePosts = await getCollection('updates', ({ data }) => !data.draft);
  const guideCircuits = (guideData?.circuits || []) as unknown as RawGuideCircuit[];

  const items = buildSearchIndex(
    blogPosts as unknown as RawBlogPost[],
    TOOLBOX_REGISTRY,
    guideCircuits,
    updatePosts,
  );

  const [tools, components] = await Promise.all([
    getCollection('guideTools'),
    getCollection('guideComponents'),
  ]);

  const anatomy = [
    {
      id: 'guide-tools-hub',
      title: 'Hand Tools & Accessories Anatomy Guide',
      description:
        'Anatomy guides for electrician’s hand tools — needle-nose pliers, side cutters, wire strippers and VDE screwdrivers — with labeled hotspots and safety notes.',
      url: '/guide/tools/',
      type: 'guide' as const,
      category: 'Tool Anatomy',
      tags: ['tools', 'anatomy', 'pliers', 'screwdriver', 'strippers', 'cutters'],
    },
    ...tools.map((tool) => ({
      id: `guide-tool-${tool.data.slug}`,
      title: tool.data.name,
      description: tool.data.tagline,
      url: `/guide/tools/${tool.data.slug}/`,
      type: 'guide' as const,
      category: 'Tool Anatomy',
      tags: [tool.data.category, 'tools', 'anatomy', ...tool.data.parts],
    })),
    {
      id: 'guide-components-hub',
      title: 'Electrical Components Anatomy Guide',
      description:
        'Learn the anatomy of electrical components: breakers, switches, timers, dimmers, bell gear, the distribution board and motors — what each terminal does, how the protection works, and the safety rules behind them.',
      url: '/guide/components/',
      type: 'guide' as const,
      category: 'Component Anatomy',
      tags: [
        'components',
        'anatomy',
        'mcb',
        'rcd',
        'lamp',
        'socket',
        'switch',
        'dimmer',
        'timer',
        'bell',
        'motor',
      ],
    },
    ...components.map((component) => ({
      id: `guide-component-${component.data.slug}`,
      title: component.data.name,
      description: component.data.tagline,
      url: `/guide/components/${component.data.slug}/`,
      type: 'guide' as const,
      category: 'Component Anatomy',
      tags: [component.data.category, 'components', 'anatomy', ...component.data.terminals],
    })),
  ];

  const glossary = [
    {
      id: 'guide-glossary',
      title: 'Electrical Terms Glossary',
      description:
        'Plain-English definitions of the terms the wiring guides use — Zs, CPC, RCD types, IP ratings, earthing systems and breaker curves, with links to the circuits that use them.',
      url: '/glossary/',
      type: 'guide' as const,
      category: 'Glossary',
      tags: ['glossary', 'terms', 'definitions', 'Zs', 'CPC', 'RCD', 'earthing'],
    },
    // Terms get their own type so the Guide filter stays circuits/components/
    // tools: at 37 entries they would otherwise be ~40% of every guide search.
    ...GLOSSARY.map((term) => ({
      id: `glossary-${term.slug}`,
      title: term.expansion ? `${term.term} — ${term.expansion}` : term.term,
      description: term.definition,
      url: `/glossary/#${term.slug}`,
      type: 'term' as const,
      category: 'Glossary',
      tags: [term.category, 'glossary', 'term', ...(term.aliases ?? []).slice(0, 4)],
    })),
  ];

  return new Response(JSON.stringify([...items, ...anatomy, ...glossary]), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
