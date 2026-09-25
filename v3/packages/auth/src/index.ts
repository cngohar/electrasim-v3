import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { passkey } from "@better-auth/passkey";
import type { DrizzleDatabase } from "@electrasim/database";
import { authSchema } from "@electrasim/database";
import type { TransactionalEmailPort } from "@electrasim/platform-contracts";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";

export interface IdentityLifecycleScheduler {
  /** Idempotent and durable; reconciliation also invokes the same ensure operation. */
  ensurePersonalWorkspace(userId: string, requestId: string): Promise<void>;
}

export interface AuthConfiguration {
  readonly database: DrizzleDatabase;
  readonly socialProviders?: {
    readonly google?: { readonly clientId: string; readonly clientSecret: string };
    readonly microsoft?: { readonly clientId: string; readonly clientSecret: string };
  };
  readonly baseURL: string;
  readonly trustedOrigins: readonly string[];
  readonly secret: string;
  readonly production: boolean;
  readonly email: TransactionalEmailPort;
  readonly lifecycle: IdentityLifecycleScheduler;
}

export function createElectraSimAuth(configuration: AuthConfiguration) {
  if (configuration.secret.length < 32) {
    throw new Error("Better Auth secret must contain at least 32 characters");
  }

  return betterAuth({
    appName: "ElectraSim",
    baseURL: configuration.baseURL,
    basePath: "/api/auth",
    secret: configuration.secret,
    trustedOrigins: [...configuration.trustedOrigins],
    database: drizzleAdapter(configuration.database, {
      provider: "pg",
      schema: authSchema,
    }),
    socialProviders: configuration.socialProviders,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url }) => {
        await configuration.email.enqueue({
          id: crypto.randomUUID(),
          template: "reset_password",
          to: user.email,
          variables: { url },
          tags: { userId: user.id },
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      sendVerificationEmail: async ({ user, url }) => {
        await configuration.email.enqueue({
          id: crypto.randomUUID(),
          template: "verify_email",
          to: user.email,
          variables: { url },
          tags: { userId: user.id },
        });
      },
    },
    user: {
      additionalFields: {
        adultEligibilityConfirmedAt: {
          type: "date",
          required: false,
          input: false,
          returned: false,
        },
        primaryGoal: { type: "string", required: false, input: false, returned: false },
        experienceLevel: { type: "string", required: false, input: false, returned: false },
        supplyFamily: { type: "string", required: false, input: false, returned: false },
        accessibilityPresentedAt: {
          type: "date",
          required: false,
          input: false,
          returned: false,
        },
        safetyTermsVersion: {
          type: "string",
          required: false,
          input: false,
          returned: false,
        },
        onboardingCompletedAt: {
          type: "date",
          required: false,
          input: false,
          returned: false,
        },
        disabledAt: { type: "date", required: false, input: false, returned: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },

    advanced: {
      useSecureCookies: configuration.production,
      database: {
        generateId: () => crypto.randomUUID(),
        validateSchema: true,
      },
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user, context) => {
            const requestId = context?.headers?.get("x-request-id") ?? crypto.randomUUID();
            await configuration.lifecycle.ensurePersonalWorkspace(user.id, requestId);
          },
        },
      },
    },
    plugins: [
      passkey({
        rpName: "ElectraSim",
      }),
      twoFactor({
        issuer: "ElectraSim",
      }),
    ],
  });
}

export type ElectraSimAuth = ReturnType<typeof createElectraSimAuth>;

export interface AuthenticatedIdentity {
  readonly userId: string;
  readonly sessionId: string;
  readonly emailVerified: boolean;
  readonly mfaSatisfied: boolean;
  readonly stepUpValidUntil: Date | null;
}

export function createPasswordStepUpVerifier(auth: ElectraSimAuth) {
  return async (request: Request, password: string): Promise<boolean> => {
    try {
      const result = await auth.api.verifyPassword({
        headers: request.headers,
        body: { password },
      });
      return result.status === true;
    } catch {
      return false;
    }
  };
}

export function createPasskeyStepUpVerifier(auth: ElectraSimAuth) {
  return async (request: Request, response: Record<string, unknown>): Promise<string | null> => {
    try {
      type VerificationInput = NonNullable<
        Parameters<typeof auth.api.verifyPasskeyAuthentication>[0]
      >;
      const result = await auth.api.verifyPasskeyAuthentication({
        headers: request.headers,
        body: { response: response as unknown as VerificationInput["body"]["response"] },
      });
      if (!result?.user || !result.session) return null;
      await auth.api.revokeSession({
        headers: request.headers,
        body: { token: result.session.token },
      });
      return result.user.id;
    } catch {
      return null;
    }
  };
}

export function createAuthenticatedIdentityResolver(auth: ElectraSimAuth) {
  return async (request: Request): Promise<AuthenticatedIdentity | null> => {
    const result = await auth.api.getSession({ headers: request.headers });
    if (!result) return null;
    const session = result.session as typeof result.session & { twoFactorVerified?: boolean };
    return {
      userId: result.user.id,
      sessionId: result.session.id,
      emailVerified: result.user.emailVerified,
      mfaSatisfied: session.twoFactorVerified === true,
      stepUpValidUntil: null,
    };
  };
}
