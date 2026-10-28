import { describe, expect, it } from 'vitest';
import {
  type AdminModule,
  adminRegistry,
  coreModules,
  createAdminRegistry,
  effectivePermissions,
  validateCommunitySettings,
} from './registry';

const settings = {
  bannedWords: [],
  autoHideThreshold: 5,
  writesPerMinute: 20,
  reportsPerDay: 10,
  preModeration: false,
};
const fixture: AdminModule = {
  id: 'fixture',
  label: 'Fixture',
  navigation: [{ label: 'Fixture', href: '/admin/fixture/', permissions: ['fixture.read'] }],
  permissions: [{ key: 'fixture.read', label: 'Read fixture', defaults: [] }],
  auditActions: ['fixture.read'],
  auditPermission: 'fixture.read',
  checks: ['fixture acceptance'],
};
describe('platform permission boundary', () => {
  it('keeps ordinary accounts out and unions only registered non-protected grants', () => {
    expect(effectivePermissions(adminRegistry, 'individual', null, [])).toEqual([]);
    expect(
      effectivePermissions(adminRegistry, 'individual', null, [
        'community.audit.read',
        'memberships.manage',
        'platform.roles.manage',
        'platform.accounts.suspend',
        'unknown.action',
      ]),
    ).toEqual(['community.audit.read']);
    const moderator = effectivePermissions(adminRegistry, 'moderator', null, []);
    expect(moderator).toContain('community.settings.read');
    expect(moderator).not.toContain('platform.users.read');
    expect(moderator).not.toContain('memberships.manage');
    expect(effectivePermissions(adminRegistry, 'admin', [], [])).toEqual([]);
    expect(effectivePermissions(adminRegistry, 'super_admin', [], [])).toContain(
      'memberships.manage',
    );
  });
  it('rejects protected, unknown, duplicate and malformed configurable grants', () => {
    for (const value of [
      null,
      {},
      ['memberships.manage'],
      ['catalog.components.manage'],
      ['catalog.audit.read'],
      ['platform.roles.manage'],
      ['unknown.action'],
      ['community.audit.read', 'community.audit.read'],
    ])
      expect(() => adminRegistry.grants(value)).toThrow();
    expect(adminRegistry.grants(['community.settings.read', 'community.audit.read'])).toEqual([
      'community.audit.read',
      'community.settings.read',
    ]);
  });
  it('registers an isolated test module without enabling future modules', () => {
    const registry = createAdminRegistry([...coreModules, fixture]);
    expect(registry.actions.get('fixture.read')).toBe('fixture');
    expect(adminRegistry.permissions.has('fixture.read')).toBe(false);
    expect([...adminRegistry.byId.keys()]).toEqual([
      'catalog',
      'platform',
      'community',
      'memberships',
    ]);
  });
  it('rejects duplicate registrations, foreign audit, unregistered navigation and delegated protected defaults', () => {
    const invalid = [
      { ...fixture, id: 'platform' },
      { ...fixture, auditActions: ['platform.read'] },
      { ...fixture, auditPermission: 'platform.audit.read' },
      {
        ...fixture,
        navigation: [
          { label: 'Foreign', href: 'https://example.invalid/', permissions: ['fixture.read'] },
        ],
      },
      {
        ...fixture,
        navigation: [
          { label: 'Unknown', href: '/admin/fixture/', permissions: ['fixture.unknown'] },
        ],
      },
      {
        ...fixture,
        permissions: [
          {
            key: 'fixture.read',
            label: 'Protected',
            protected: true,
            defaults: ['admin'] as const,
          },
        ],
      },
    ];
    for (const value of invalid)
      expect(() => createAdminRegistry([...coreModules, value])).toThrow();
  });
  it('requires a settings validator and audit contract in its own namespace', () => {
    expect(() =>
      createAdminRegistry([
        ...coreModules,
        {
          ...fixture,
          settings: {
            read: 'fixture.read',
            write: 'fixture.read',
            defaults: {},
            validate: () => ({}),
          },
        },
      ]),
    ).toThrow();
    expect(() =>
      createAdminRegistry([
        ...coreModules,
        {
          ...fixture,
          auditActions: ['fixture.settings.update'],
          settings: {
            read: 'platform.users.read',
            write: 'fixture.read',
            defaults: {},
            validate: () => ({}),
          },
        },
      ]),
    ).toThrow();
  });
});
describe('typed community settings', () => {
  it('normalizes bounded words and preserves explicit post-publication defaults', () => {
    expect(validateCommunitySettings({ ...settings, bannedWords: ['  WORD '] })).toEqual({
      ...settings,
      bannedWords: ['word'],
    });
    expect(validateCommunitySettings(settings).preModeration).toBe(false);
  });
  it('rejects unknown business settings, partial objects, duplicate words and invalid bounds', () => {
    for (const value of [
      null,
      [],
      { ...settings, credentials: 'not a setting' },
      { preModeration: false },
      { ...settings, bannedWords: ['word', 'WORD'] },
      { ...settings, bannedWords: [''] },
      { ...settings, bannedWords: ['x'.repeat(81)] },
      { ...settings, bannedWords: Array.from({ length: 101 }, (_, i) => `word${i}`) },
      { ...settings, autoHideThreshold: 1 },
      { ...settings, writesPerMinute: 121 },
      { ...settings, reportsPerDay: 0 },
      { ...settings, preModeration: 'false' },
    ])
      expect(() => validateCommunitySettings(value)).toThrow();
  });
});
