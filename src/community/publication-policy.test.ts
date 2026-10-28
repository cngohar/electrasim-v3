import { describe, expect, it } from 'vitest';
import {
  type Publication,
  normalizedTags,
  publicationSlug,
  publicationSummary,
} from './publication-policy';
describe('publication boundary rules', () => {
  it('normalizes distinct bounded tags and rejects malformed or duplicate values', () => {
    expect(normalizedTags([' Motors ', 'learning'])).toEqual(['learning', 'motors']);
    for (const value of [
      null,
      {},
      ['aa', 'AA'],
      ['a'],
      ['with space'],
      ['-edge'],
      ['edge-'],
      [{}],
      Array.from({ length: 9 }, (_, n) => `tag-${n}`),
      ['a'.repeat(25)],
    ])
      expect(normalizedTags(value)).toBeNull();
  });
  it('allocates safe bounded slugs even for identical, Unicode and punctuation-only titles', () => {
    const a = '00000000-0000-4000-8000-000000000001';
    const b = '00000000-0000-4000-8000-000000000002';
    expect(publicationSlug('Same title', a)).not.toBe(publicationSlug('Same title', b));
    expect(publicationSlug('Café circuit', a)).toMatch(/^cafe-circuit-/);
    for (const title of ['مرحبا', '<script>', 'a'.repeat(160), '⚡']) {
      const slug = publicationSlug(title, a);
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(slug.length).toBeLessThanOrEqual(100);
    }
  });
  it('public summary excludes private source, owner, mutation and lifecycle internals', () => {
    const row: Publication = {
      id: 'publication',
      ownerId: 'private-owner',
      sourceCircuitId: 'private-source',
      slug: 'safe-public-slug',
      status: 'published',
      moderation: 'visible',
      revision: 9,
      mutationId: 'private-mutation',
      currentVersionId: 'snapshot',
      publishedAt: 1,
      updatedAt: 2,
      versionNumber: 3,
      title: 'Circuit',
      description: 'Published text',
      tagsJson: '["lighting"]',
      allowForks: 1,
    };
    const safe = publicationSummary(row);
    expect(safe.tags).toEqual(['lighting']);
    expect(safe.allowForks).toBe(true);
    expect(JSON.stringify(safe)).not.toMatch(/private-|ownerId|revision|status|moderation/);
    expect(publicationSummary(row, true)).toMatchObject({
      sourceCircuitId: 'private-source',
      revision: 9,
      status: 'published',
      moderation: 'visible',
    });
  });
});
