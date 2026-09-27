import { drizzleAdapter } from '@better-auth/drizzle-adapter';
// Better Auth — D1 (SQLite) + organization plugin. Local-first: all auth tested via --local.
// CLI reads this file with: bun x auth generate --config packages/db/auth.ts
import { betterAuth } from 'better-auth';
import { organization } from 'better-auth/plugins/organization';
import * as authSchema from './auth-schema';
import { createDrizzle } from './drizzle';

// This is server-owned. Signup and update-user must never accept role claims.
const trustedUserFields = {
  additionalFields: {
    globalRole: { type: 'string', defaultValue: 'individual', input: false },
  },
} as const;

export const auth = betterAuth({
  database: drizzleAdapter({ _: { fullSchema: authSchema } } as unknown as never, {
    provider: 'sqlite',
    schema: authSchema,
  }),
  secret:
    process.env.BETTER_AUTH_SECRET ??
    'local-dev-secret-please-set-BETTER_AUTH_SECRET-in-wrangler-must-be-32-chars',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:8789',
  emailAndPassword: { enabled: true, requireEmailVerification: false },
  user: trustedUserFields,
  session: { cookieCache: { enabled: false } },
  plugins: [organization({ allowUserToCreateOrganization: true, organizationLimit: 3 })],
  advanced: { database: { generateId: () => crypto.randomUUID() } },
});

// Factory so Worker can create per-request instance from c.env.DB (avoids global D1).
export function createAuth(d1: unknown, opts: { baseURL: string; secret: string }) {
  const db = createDrizzle(d1 as unknown as never);
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),
    secret: opts.secret,
    baseURL: opts.baseURL,
    emailAndPassword: { enabled: true, requireEmailVerification: false },
    user: trustedUserFields,
    session: { cookieCache: { enabled: false } },
    plugins: [organization({ allowUserToCreateOrganization: true, organizationLimit: 3 })],
    advanced: { database: { generateId: () => crypto.randomUUID() } },
  });
}
export type AuthInstance = ReturnType<typeof createAuth>;
