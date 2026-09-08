import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import guideData from '../content/pages/guide.json';
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

  return new Response(JSON.stringify([...items, ...anatomy]), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
