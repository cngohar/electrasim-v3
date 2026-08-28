/**
 * updates.ts — helpers for the product changelog (release notes), kept
 * deliberately separate from the educational blog corpus.
 */

export type UpdatePostLike = {
  id: string;
  body?: string;
  data: {
    title: string;
    description: string;
    pubDate: Date;
    updatedDate?: Date;
    author?: string;
    version?: string;
    tags: string[];
    category?: string;
    image?: string;
    draft?: boolean;
    featured?: boolean;
  };
};

/** Newest release first. */
export function sortUpdates<T extends UpdatePostLike>(posts: readonly T[]): T[] {
  return [...posts].sort(
    (a, b) =>
      b.data.pubDate.getTime() - a.data.pubDate.getTime() ||
      a.data.title.localeCompare(b.data.title),
  );
}

/** Previous/next neighbours within the changelog (newest-first ordering). */
export function updateNeighbours<T extends UpdatePostLike>(
  allNewestFirst: readonly T[],
  id: string,
): { newer: T | null; older: T | null } {
  const idx = allNewestFirst.findIndex((p) => p.id === id);
  if (idx === -1) return { newer: null, older: null };
  return {
    newer: idx > 0 ? allNewestFirst[idx - 1] : null,
    older: idx < allNewestFirst.length - 1 ? allNewestFirst[idx + 1] : null,
  };
}
