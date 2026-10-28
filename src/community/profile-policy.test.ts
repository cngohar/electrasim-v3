import { describe, expect, it } from 'vitest';
import { handleProblem, ownerProfile, publicProfile, type ProfileRow } from './profile-policy';
import { profileHtml } from './pages';
const row: ProfileRow = {
  userId: 'private-id',
  handle: 'sample_builder',
  displayName: 'Sample <builder>',
  bio: 'Text <script>alert(1)</script>',
  institution: 'Private institution',
  level: 'Private level',
  visibility: 'public',
  showInstitution: 0,
  showLevel: 0,
  allowForks: 1,
  moderation: 'visible',
  revision: 1,
  createdAt: 1,
  updatedAt: 1,
  avatarKey: 'secret-storage-key',
  mutationId: 'private-mutation',
};
describe('profile privacy boundary', () => {
  for (const visibility of ['public', 'private'] as const)
    for (const moderation of ['visible', 'hidden', 'removed'] as const)
      it(`${visibility}/${moderation} reveals identity only when publicly visible`, () => {
        const result = publicProfile({ ...row, visibility, moderation });
        expect(Boolean(result)).toBe(visibility === 'public' && moderation === 'visible');
      });
  it('unclaimed identities stay unavailable', () => {
    expect(publicProfile({ ...row, handle: null })).toBeNull();
  });
  it('public payload contains an allowlist and never contains storage keys, IDs or private optional fields', () => {
    const p = publicProfile(row)!;
    expect(Object.keys(p).sort()).toEqual(
      ['avatarUrl', 'bio', 'createdAt', 'displayName', 'handle', 'institution', 'level'].sort(),
    );
    expect(p.institution).toBeNull();
    expect(p.level).toBeNull();
    expect(JSON.stringify(p)).not.toMatch(
      /private-id|secret-storage-key|Private institution|Private level|private-mutation/,
    );
    expect(p.avatarUrl).toContain('/api/community/users/sample_builder/avatar');
  });
  it('owner payload exposes settings without raw storage keys', () => {
    expect(ownerProfile(row).institution).toBe('Private institution');
    expect(JSON.stringify(ownerProfile(row))).not.toContain('secret-storage-key');
  });
  it('opt-in institution and level are projected independently', () => {
    expect(publicProfile({ ...row, showInstitution: 1 })?.institution).toBe('Private institution');
    expect(publicProfile({ ...row, showInstitution: 1 })?.level).toBeNull();
    expect(publicProfile({ ...row, showLevel: 1 })?.institution).toBeNull();
  });
  it('SSR encodes HTML and JSON-LD while omitting private settings and editor code', () => {
    const { html, schema } = profileHtml(publicProfile(row), 'http://localhost');
    expect(html).toContain('Sample &lt;builder&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).not.toMatch(
      /secret-storage-key|private-id|Private institution|Private level|useSimulation|\/app\/assets/,
    );
    expect(JSON.parse(schema!).name).toBe(row.displayName);
    expect(schema).not.toContain('<script>');
  });
  it('unavailable SSR and metadata are neutral without canonical or Person data', () => {
    const result = profileHtml(null, 'http://localhost');
    expect(result.schema).toBeNull();
    expect(result.html).toContain('noindex,nofollow');
    expect(result.html).not.toMatch(
      /rel="canonical"|Private institution|sample_builder|application\/ld\+json/,
    );
  });
});
describe('permanent handle rules', () => {
  for (const name of [
    'admin',
    'support',
    'electrasim',
    'settings',
    'APP',
    'a',
    '1abc',
    'hello-world',
    'café',
    'test.name',
  ])
    it(`rejects ${name}`, () => expect(handleProblem(name)).not.toBeNull());
  for (const name of ['builder', 'a_b', 'maya_chen', 'a123', 'a'.repeat(24)])
    it(`accepts ${name}`, () => expect(handleProblem(name)).toBeNull());
});
