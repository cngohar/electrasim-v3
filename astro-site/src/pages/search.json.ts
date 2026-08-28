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

  return new Response(JSON.stringify(items), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
};
