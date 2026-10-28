/** Shared profile rules and explicit projections. No auth/database or editor imports. */
export const RESERVED_HANDLES = [
  'admin',
  'administrator',
  'api',
  'app',
  'assets',
  'auth',
  'blog',
  'community',
  'contact',
  'electrasim',
  'explore',
  'feed',
  'help',
  'login',
  'logout',
  'me',
  'moderator',
  'privacy',
  'root',
  'settings',
  'signin',
  'signup',
  'staff',
  'support',
  'system',
  'terms',
  'user',
  'users',
  'www',
] as const;
export const LEARNING_LEVELS = [
  '',
  'Electrical engineering student',
  'Apprentice electrician',
  'Practicing electrician',
  'Educator',
  'Enthusiast',
] as const;
export const REPORT_REASONS = [
  'Misleading identity',
  'Harassment or hate',
  'Inappropriate avatar',
  'Spam',
  'Other',
] as const;
export function handleProblem(value: string): string | null {
  if (!/^[a-z][a-z0-9_]{2,23}$/.test(value))
    return 'Use 3–24 lowercase letters, numbers or underscores, starting with a letter.';
  if ((RESERVED_HANDLES as readonly string[]).includes(value)) return 'This handle is reserved.';
  return null;
}
export type Profile = {
  userId: string;
  handle: string | null;
  displayName: string;
  bio: string;
  institution: string;
  level: string;
  visibility: 'public' | 'private';
  showInstitution: boolean;
  showLevel: boolean;
  allowForks: boolean;
  moderation: 'visible' | 'hidden' | 'removed';
  revision: number;
  createdAt: number;
  updatedAt: number;
  avatarUrl: string | null;
};
export type ProfileRow = Omit<
  Profile,
  'showInstitution' | 'showLevel' | 'allowForks' | 'avatarUrl'
> & {
  showInstitution: number;
  showLevel: number;
  allowForks: number;
  avatarKey: string | null;
  mutationId: string | null;
};
export type PublicProfile = {
  handle: string;
  displayName: string;
  bio: string;
  institution: string | null;
  level: string | null;
  createdAt: number;
  avatarUrl: string | null;
};
export function ownerProfile(row: ProfileRow): Profile {
  return {
    userId: row.userId,
    handle: row.handle,
    displayName: row.displayName,
    bio: row.bio,
    institution: row.institution,
    level: row.level,
    visibility: row.visibility,
    showInstitution: row.showInstitution === 1,
    showLevel: row.showLevel === 1,
    allowForks: row.allowForks === 1,
    moderation: row.moderation,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    avatarUrl: row.avatarKey ? `/api/me/avatar?revision=${row.revision}` : null,
  };
}
export function publicProfile(row: ProfileRow | null): PublicProfile | null {
  if (!row?.handle || row.visibility !== 'public' || row.moderation !== 'visible') return null;
  return {
    handle: row.handle,
    displayName: row.displayName,
    bio: row.bio,
    institution: row.showInstitution === 1 && row.institution ? row.institution : null,
    level: row.showLevel === 1 && row.level ? row.level : null,
    createdAt: row.createdAt,
    avatarUrl: row.avatarKey
      ? `/api/community/users/${row.handle}/avatar?revision=${row.revision}`
      : null,
  };
}
export const profileSelect = `SELECT user_id AS userId,handle,display_name AS displayName,bio,
  institution,level,profile_visibility AS visibility,show_institution AS showInstitution,
  show_level AS showLevel,allow_forks AS allowForks,moderation,revision,avatar_key AS avatarKey,
  mutation_id AS mutationId,created_at AS createdAt,updated_at AS updatedAt FROM profiles`;
export function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/u)
      .map((part) => Array.from(part)[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'ES'
  );
}
