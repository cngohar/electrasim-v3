import type { GlobalRole } from '@electrasim/access';

export type Permission = {
  key: string;
  label: string;
  protected?: boolean;
  defaults: readonly GlobalRole[];
};
export type AdminModule = {
  id: string;
  label: string;
  navigation: readonly { label: string; href: string; permissions: readonly string[] }[];
  permissions: readonly Permission[];
  auditActions: readonly string[];
  auditPermission?: string;
  settings?: {
    read: string;
    write: string;
    defaults: Record<string, unknown>;
    validate: (value: unknown) => Record<string, unknown>;
  };
  checks: readonly string[];
};
const communityDefaults = {
  bannedWords: [] as string[],
  autoHideThreshold: 5,
  writesPerMinute: 20,
  reportsPerDay: 10,
  preModeration: false,
};
export function validateCommunitySettings(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Settings must be an object');
  const data = value as Record<string, unknown>;
  if (
    Object.keys(data).length !== 5 ||
    Object.keys(data).some((key) => !Object.hasOwn(communityDefaults, key))
  )
    throw new Error('Supply all community settings; unknown settings are not allowed');
  if (
    !Array.isArray(data.bannedWords) ||
    data.bannedWords.length > 100 ||
    data.bannedWords.some(
      (word) => typeof word !== 'string' || !word.trim() || word.trim().length > 80,
    )
  )
    throw new Error('Banned words must contain at most 100 words of 1–80 characters');
  const words = data.bannedWords.map((word: string) => word.trim().toLowerCase());
  if (new Set(words).size !== words.length) throw new Error('Banned words must be distinct');
  for (const [key, min, max] of [
    ['autoHideThreshold', 2, 100],
    ['writesPerMinute', 1, 120],
    ['reportsPerDay', 1, 50],
  ] as const) {
    if (!Number.isSafeInteger(data[key]) || Number(data[key]) < min || Number(data[key]) > max)
      throw new Error(`Invalid ${key}: expected ${min}–${max}`);
  }
  if (typeof data.preModeration !== 'boolean') throw new Error('Invalid preModeration');
  return { ...data, bannedWords: words };
}
const staff = ['moderator', 'admin'] as const;
const admin = ['admin'] as const;
export const coreModules: readonly AdminModule[] = [
  {
    id: 'catalog',
    label: 'Components',
    permissions: [
      {
        key: 'catalog.components.manage',
        label: 'Manage component product access',
        protected: true,
        defaults: [],
      },
      {
        key: 'catalog.audit.read',
        label: 'Read component access audit',
        protected: true,
        defaults: [],
      },
    ],
    navigation: [
      {
        label: 'Components',
        href: '/admin/components/',
        permissions: ['catalog.components.manage'],
      },
    ],
    auditActions: ['catalog.components.access.update'],
    auditPermission: 'catalog.audit.read',
    checks: ['test:component-access-api'],
  },
  {
    id: 'platform',
    label: 'Platform',
    permissions: [
      {
        key: 'platform.users.read',
        label: 'Search users and view contact details',
        defaults: admin,
      },
      { key: 'platform.audit.read', label: 'Read platform audit', defaults: admin },
      { key: 'platform.standards.read', label: 'Read electrical standards', defaults: staff },
      {
        key: 'platform.roles.manage',
        label: 'Manage staff roles and permissions',
        protected: true,
        defaults: [],
      },
      {
        key: 'platform.accounts.suspend',
        label: 'Suspend and restore platform accounts',
        protected: true,
        defaults: [],
      },
    ],
    navigation: [
      { label: 'Users', href: '/admin/users/', permissions: ['platform.users.read'] },
      {
        label: 'Roles and permissions',
        href: '/admin/permissions/',
        permissions: ['platform.roles.manage'],
      },
      {
        label: 'Audit',
        href: '/admin/audit/',
        permissions: ['platform.audit.read', 'community.audit.read'],
      },
      { label: 'Standards', href: '/admin/standards/', permissions: ['platform.standards.read'] },
    ],
    auditActions: [
      'platform.roles.create',
      'platform.roles.update',
      'platform.users.roles',
      'platform.permissions.update',
      'platform.accounts.suspend',
      'platform.accounts.restore',
    ],
    auditPermission: 'platform.audit.read',
    checks: ['test:platform-admin', 'e2e/platform-admin.spec.ts'],
  },
  {
    id: 'community',
    label: 'Community',
    permissions: [
      {
        key: 'community.publications.read',
        label: 'Review published circuit snapshots',
        defaults: staff,
      },
      {
        key: 'community.publications.moderate',
        label: 'Hide, restore or remove publications',
        defaults: staff,
      },
      {
        key: 'community.profiles.read',
        label: 'Review community profiles and avatars',
        defaults: staff,
      },
      {
        key: 'community.profiles.moderate',
        label: 'Hide, restore or remove profiles and avatars',
        defaults: staff,
      },
      { key: 'community.reports.read', label: 'Read community reports', defaults: staff },
      { key: 'community.reports.review', label: 'Resolve community reports', defaults: staff },
      {
        key: 'community.restrictions.write',
        label: 'Restrict community writes by ordinary users',
        defaults: admin,
      },
      { key: 'community.settings.read', label: 'Read community settings', defaults: staff },
      { key: 'community.settings.write', label: 'Change community settings', defaults: admin },
      { key: 'community.audit.read', label: 'Read community audit', defaults: staff },
    ],
    navigation: [
      { label: 'Settings', href: '/admin/settings/', permissions: ['community.settings.read'] },
      {
        label: 'Community',
        href: '/admin/community/',
        permissions: [
          'community.profiles.read',
          'community.publications.read',
          'community.reports.read',
        ],
      },
    ],
    auditActions: [
      'community.profiles.hide',
      'community.profiles.restore',
      'community.profiles.remove',
      'community.profiles.avatar',
      'community.profiles.auto-hide',
      'community.publications.hide',
      'community.publications.restore',
      'community.publications.remove',
      'community.publications.auto-hide',
      'community.reports.resolve',
      'community.restrictions.apply',
      'community.restrictions.revoke',
      'community.settings.update',
    ],
    auditPermission: 'community.audit.read',
    settings: {
      read: 'community.settings.read',
      write: 'community.settings.write',
      defaults: communityDefaults,
      validate: validateCommunitySettings,
    },
    checks: ['test:platform-admin', 'e2e/platform-admin.spec.ts'],
  },
  {
    id: 'memberships',
    label: 'Memberships',
    permissions: [
      {
        key: 'memberships.manage',
        label: 'Manage paid plans, grants and membership audit',
        protected: true,
        defaults: [],
      },
    ],
    navigation: [
      { label: 'Memberships', href: '/admin/pro/', permissions: ['memberships.manage'] },
    ],
    auditActions: [],
    checks: ['test:membership', 'e2e/admin-membership.spec.ts'],
  },
];
export function createAdminRegistry(modules: readonly AdminModule[] = coreModules) {
  const permissions = new Map<string, Permission>();
  const actions = new Map<string, string>();
  const byId = new Map<string, AdminModule>();
  const hrefs = new Set<string>();
  for (const module of modules) {
    if (!/^[a-z][a-z0-9-]*$/.test(module.id) || byId.has(module.id) || !module.checks.length)
      throw new Error('Invalid or duplicate admin module');
    byId.set(module.id, module);
    for (const permission of module.permissions) {
      if (
        !permission.key.startsWith(`${module.id}.`) ||
        permissions.has(permission.key) ||
        permission.defaults.some((role) => !staff.includes(role as (typeof staff)[number])) ||
        (permission.protected && permission.defaults.length)
      )
        throw new Error('Invalid permission registration');
      permissions.set(permission.key, permission);
    }
    for (const action of module.auditActions) {
      if (!action.startsWith(`${module.id}.`) || actions.has(action))
        throw new Error('Invalid audit registration');
      actions.set(action, module.id);
    }
    for (const nav of module.navigation) {
      if (
        !/^\/admin\/(?:[a-z-]+\/)*$/.test(nav.href) ||
        hrefs.has(nav.href) ||
        !nav.permissions.length
      )
        throw new Error('Invalid admin navigation');
      hrefs.add(nav.href);
    }
  }
  for (const module of modules) {
    if (
      (module.auditPermission && !module.auditPermission.startsWith(`${module.id}.`)) ||
      (module.settings &&
        (![module.settings.read, module.settings.write].every((key) =>
          key.startsWith(`${module.id}.`),
        ) ||
          !module.auditActions.includes(`${module.id}.settings.update`)))
    )
      throw new Error('Settings and audit must stay within their module namespace');
    const references = [
      ...module.navigation.flatMap((nav) => nav.permissions),
      ...(module.auditPermission ? [module.auditPermission] : []),
      ...(module.settings ? [module.settings.read, module.settings.write] : []),
    ];
    if (references.some((key) => !permissions.has(key)))
      throw new Error('Unregistered admin permission');
    if (module.settings) module.settings.validate(module.settings.defaults);
  }
  function grants(value: unknown): string[] {
    if (
      !Array.isArray(value) ||
      value.length > permissions.size ||
      value.some(
        (key) =>
          typeof key !== 'string' || !permissions.has(key) || permissions.get(key)?.protected,
      ) ||
      new Set(value).size !== value.length
    )
      throw new Error('Only distinct registered, non-protected permissions may be granted');
    return [...value].sort();
  }
  return { modules, permissions, actions, byId, grants };
}
export type AdminRegistry = ReturnType<typeof createAdminRegistry>;
export const adminRegistry = createAdminRegistry();

export function effectivePermissions(
  registry: AdminRegistry,
  role: GlobalRole,
  policy: string[] | null,
  custom: string[],
): string[] {
  const all = [...registry.permissions.values()];
  if (role === 'super_admin') return all.map((p) => p.key).sort();
  const system = policy ?? all.filter((p) => p.defaults.includes(role)).map((p) => p.key);
  return [...new Set([...system, ...custom])]
    .filter((key) => registry.permissions.has(key) && !registry.permissions.get(key)!.protected)
    .sort();
}
