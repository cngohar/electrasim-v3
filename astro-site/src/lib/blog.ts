export const BLOG_PAGE_SIZE = 9;
export const MIN_TAG_POSTS = 3;
// Educational highlights only — release notes live in the updates collection
// and never appear in the blog corpus or homepage "Latest from the blog".
export const HOMEPAGE_ARTICLE_IDS = [
  'electrical-cable-sizes-explained',
  'how-does-a-push-button-switch-work',
  'why-do-my-lights-flicker-common-causes-safe-checks',
  '5-common-electrical-wiring-mistakes',
  'ring-circuit-vs-radial-circuit-explained',
  'live-neutral-and-earth-wires-explained',
  'how-to-wire-a-two-way-switch-complete-guide',
  'distribution-board-explained-how-a-consumer-unit-is-wired',
  'what-is-a-contactor-and-how-does-it-work',
  'what-is-an-rcd-and-why-do-you-need-one',
  'getting-started-with-electrasim',
  'how-household-wiring-works',
] as const;

export type BlogPostLike = {
  id: string;
  body?: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    tags: string[];
    category: string;
    featured?: boolean;
  };
};

export type TagArchive<T extends BlogPostLike = BlogPostLike> = {
  slug: string;
  label: string;
  posts: T[];
};

export function wordCount(content: string): number {
  const normalized = content.trim();
  return normalized ? normalized.split(/\s+/).length : 0;
}

export function readingTime(content: string, wordsPerMinute = 200): number {
  return Math.max(1, Math.round(wordCount(content) / wordsPerMinute));
}

export function slugifyTag(tag: string): string {
  return tag
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase()
    .replace(/&/g, '-and-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function sortBlogPosts<T extends BlogPostLike>(
  posts: readonly T[],
  featuredFirst = true,
): T[] {
  return [...posts].sort((a, b) => {
    if (featuredFirst && Boolean(a.data.featured) !== Boolean(b.data.featured)) {
      return a.data.featured ? -1 : 1;
    }
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}

export function paginatePosts<T>(
  posts: readonly T[],
  page: number,
  pageSize = BLOG_PAGE_SIZE,
): T[] {
  const start = (page - 1) * pageSize;
  return posts.slice(start, start + pageSize);
}

export function partitionBlogPosts<T extends BlogPostLike>(
  posts: readonly T[],
): {
  appUpdates: T[];
  articles: T[];
} {
  const appUpdates: T[] = [];
  const articles: T[] = [];

  for (const post of posts) {
    if (post.data.category === 'App Update') appUpdates.push(post);
    else articles.push(post);
  }

  return { appUpdates, articles };
}

export function totalPages(itemCount: number, pageSize = BLOG_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function selectPostsById<T extends { id: string }>(
  posts: readonly T[],
  ids: readonly string[],
): T[] {
  const postsById = new Map(posts.map((post) => [post.id, post]));
  return ids.flatMap((id) => {
    const post = postsById.get(id);
    return post ? [post] : [];
  });
}

export function pageRange(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages: (number | '...')[] = [1];
  if (current > 3) pages.push('...');
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) {
    pages.push(page);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

export function getTagArchives<T extends BlogPostLike>(
  posts: readonly T[],
  minimumPosts = MIN_TAG_POSTS,
): TagArchive<T>[] {
  const archives = new Map<string, TagArchive<T>>();

  for (const post of posts) {
    const slugsInPost = new Set<string>();
    for (const label of post.data.tags) {
      const slug = slugifyTag(label);
      if (!slug || slugsInPost.has(slug)) continue;
      slugsInPost.add(slug);

      const archive = archives.get(slug);
      if (archive) {
        archive.posts.push(post);
      } else {
        archives.set(slug, { slug, label, posts: [post] });
      }
    }
  }

  return Array.from(archives.values())
    .filter((archive) => archive.posts.length >= minimumPosts)
    .sort((a, b) => b.posts.length - a.posts.length || a.label.localeCompare(b.label));
}

export function selectTopicArchives<T extends BlogPostLike>(
  archives: readonly TagArchive<T>[],
  activeSlug?: string,
  limit = 12,
): TagArchive<T>[] {
  const selected = archives.slice(0, limit);
  if (!activeSlug || selected.some((archive) => archive.slug === activeSlug)) return selected;

  const activeArchive = archives.find((archive) => archive.slug === activeSlug);
  return activeArchive ? [...selected.slice(0, Math.max(0, limit - 1)), activeArchive] : selected;
}
