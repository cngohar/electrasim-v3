import type { GlobalRole } from '@electrasim/access';
import type { Permission } from '../../platform/registry';

export type Access = {
  version: number;
  actor: { id: string; name: string; globalRole: GlobalRole };
  permissions: string[];
  navigation: { label: string; href: string }[];
  auditNamespaces: string[];
};
export type Change = {
  path: string;
  method: 'POST' | 'PATCH';
  data: Record<string, unknown>;
  summary: string[];
};
export type Tools = {
  conflict?: boolean;
  access: Access;
  review: (change: Change) => void;
  fail: (error: unknown) => void;
};
export type Role = {
  id: string;
  name: string;
  archived: number;
  permissions: string[];
  assignedCount: number;
};
export type RolePage = { version: number; items: Role[] };
export type Policy = {
  version: number;
  permissions: Permission[];
  policy: { moderator: string[]; admin: string[] };
};
export type Person = {
  id: string;
  name: string;
  email: string;
  globalRole: GlobalRole;
  createdAt: number;
  emailVerified: number;
  restricted?: number;
  suspended?: number;
};
export type UserDetail = {
  version: number;
  user: Person;
  roles: { id: string; name: string; archived: number }[];
  controls: { suspended: number; endsAt: number | null };
  restrictions: {
    id: string;
    reason: string;
    startsAt: number;
    endsAt: number | null;
    revokedAt: number | null;
  }[];
  history: { id: string; namespace: string; action: string; reason: string; createdAt: number }[];
  effectivePermissions: string[];
};
