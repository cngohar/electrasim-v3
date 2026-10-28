export const PUBLICATION_REPORT_REASONS = [
  'Unsafe or misleading',
  'Harassment or hate',
  'Spam',
  'Other',
] as const;
export type Publication = {
  id: string;
  ownerId: string;
  sourceCircuitId: string;
  slug: string;
  status: 'published' | 'unpublished' | 'deleted';
  moderation: 'visible' | 'hidden' | 'removed';
  revision: number;
  mutationId: string;
  currentVersionId: string;
  publishedAt: number;
  updatedAt: number;
  versionNumber: number;
  title: string;
  description: string;
  tagsJson: string;
  allowForks: number;
};
export const publicationSelect =
  'SELECT p.id,p.owner_id AS ownerId,p.source_circuit_id AS sourceCircuitId,p.slug,p.status,p.moderation,p.revision,p.mutation_id AS mutationId,p.current_version_id AS currentVersionId,p.published_at AS publishedAt,p.updated_at AS updatedAt,v.version_number AS versionNumber,v.title,v.description,v.tags_json AS tagsJson,v.allow_forks AS allowForks FROM publications p JOIN publication_versions v ON v.id=p.current_version_id AND v.publication_id=p.id';
export const visiblePublication = "p.status='published' AND p.moderation='visible'";
export function publicationSummary(p: Publication, owner = false) {
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    description: p.description,
    tags: JSON.parse(p.tagsJson) as string[],
    allowForks: p.allowForks === 1,
    currentVersionId: p.currentVersionId,
    versionNumber: p.versionNumber,
    publishedAt: p.publishedAt,
    updatedAt: p.updatedAt,
    ...(owner
      ? {
          sourceCircuitId: p.sourceCircuitId,
          status: p.status,
          moderation: p.moderation,
          revision: p.revision,
        }
      : {}),
  };
}
export function normalizedTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 8 || value.some((t) => typeof t !== 'string'))
    return null;
  const tags = value.map((t) => t.trim().toLowerCase());
  if (
    tags.some((t) => !/^[a-z0-9][a-z0-9-]{0,22}[a-z0-9]$/.test(t)) ||
    new Set(tags).size !== tags.length
  )
    return null;
  return tags.sort();
}
export function publicationSlug(title: string, id: string) {
  const prefix =
    title
      .toLowerCase()
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '') || 'circuit';
  return `${prefix}-${id.replaceAll('-', '')}`;
}
