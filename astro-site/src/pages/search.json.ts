import { getCollection } from 'astro:content';
import type { APIRoute } from 'astro';
import guideData from '../content/pages/guide.json';
import { GLOSSARY } from '../lib/glossary';
import {
  type RawBlogPost,
  type RawGuideCircuit,
  type RawGuideComponent,
  type RawGuideTool,
  type RawUpdatePost,
  buildSearchIndex,
} from '../lib/search';
import { TOOLBOX_REGISTRY } from '../lib/tools/registry';

export const GET: APIRoute = async () => {
  const blogPosts = await getCollection('blog', ({ data }) => !data.draft);
  const updatePosts = await getCollection('updates', ({ data }) => !data.draft);
  const guideCircuits = (guideData?.circuits || []) as unknown as RawGuideCircuit[];

  const [tools, components] = await Promise.all([
    getCollection('guideTools'),
    getCollection('guideComponents'),
  ]);

  const items = buildSearchIndex({
    blogPosts: blogPosts as unknown as RawBlogPost[],
    tools: TOOLBOX_REGISTRY,
    guideCircuits,
    updatePosts: updatePosts as unknown as RawUpdatePost[],
    guideTools: tools.map((tool) => tool.data) as RawGuideTool[],
    guideComponents: components.map((component) => component.data) as RawGuideComponent[],
    glossaryTerms: GLOSSARY,
  });

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
