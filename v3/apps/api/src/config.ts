export interface IdentityRuntimeConfig {
  readonly authDatabaseUrl: string;
  readonly applicationDatabaseUrl: string;
  readonly workerDatabaseUrl: string;
  readonly baseURL: string;
  readonly trustedOrigins: readonly string[];
  readonly secret: string;
  readonly safetyTermsVersion: string;
  readonly emailDeliveryMode: "capture" | "resend";
  readonly resendApiKey?: string;
  readonly emailFrom: string;
  readonly google?: { readonly clientId: string; readonly clientSecret: string };
  readonly microsoft?: { readonly clientId: string; readonly clientSecret: string };
}

export type ObjectStorageRuntimeConfig =
  | { readonly mode: "local"; readonly path: string }
  | {
      readonly mode: "s3";
      readonly endpoint: string;
      readonly bucket: string;
      readonly region?: string;
      readonly accessKeyId: string;
      readonly secretAccessKey: string;
    };

export interface RuntimeConfig {
  readonly hostname: string;
  readonly port: number;
  readonly version: string;
  readonly nodeEnv: "development" | "test" | "production";
  readonly trustedProxyHops: number;
  readonly objectStorage: ObjectStorageRuntimeConfig;
  readonly identity?: IdentityRuntimeConfig;
}

function integer(name: string, value: string | undefined, fallback: number): number {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65_535) {
    throw new Error(`${name} must be an integer between 0 and 65535`);
  }
  return parsed;
}

function provider(
  name: string,
  clientId: string | undefined,
  clientSecret: string | undefined,
): { readonly clientId: string; readonly clientSecret: string } | undefined {
  if (!clientId && !clientSecret) return undefined;
  if (!clientId?.trim() || !clientSecret?.trim()) {
    throw new Error(`${name}_CLIENT_ID and ${name}_CLIENT_SECRET must be configured together`);
  }
  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

function identityConfig(
  env: Record<string, string | undefined>,
  production: boolean,
): IdentityRuntimeConfig | undefined {
  const identityKeys = [
    env.AUTH_DATABASE_URL,
    env.APPLICATION_DATABASE_URL,
    env.WORKER_DATABASE_URL,
    env.DATABASE_URL,
    env.BETTER_AUTH_URL,
    env.BETTER_AUTH_SECRET,
    env.BETTER_AUTH_TRUSTED_ORIGINS,
    env.EMAIL_DELIVERY_MODE,
    env.RESEND_API_KEY,
    env.EMAIL_FROM,
  ];
  if (identityKeys.every((value) => !value)) return undefined;

  const fallbackDatabaseUrl = production ? undefined : env.DATABASE_URL?.trim();
  const authDatabaseUrl = env.AUTH_DATABASE_URL?.trim() || fallbackDatabaseUrl;
  const applicationDatabaseUrl = env.APPLICATION_DATABASE_URL?.trim() || fallbackDatabaseUrl;
  const workerDatabaseUrl = env.WORKER_DATABASE_URL?.trim() || fallbackDatabaseUrl;
  const baseURL = env.BETTER_AUTH_URL?.trim();
  const secret = env.BETTER_AUTH_SECRET?.trim();
  const safetyTermsVersion = env.SAFETY_TERMS_VERSION?.trim();
  const emailDeliveryMode = env.EMAIL_DELIVERY_MODE ?? (production ? "resend" : "capture");
  if (emailDeliveryMode !== "capture" && emailDeliveryMode !== "resend") {
    throw new Error("EMAIL_DELIVERY_MODE must be capture or resend");
  }
  if (production && emailDeliveryMode === "capture") {
    throw new Error("EMAIL_DELIVERY_MODE=capture is forbidden in production");
  }
  const resendApiKey = env.RESEND_API_KEY?.trim();
  const emailFrom = env.EMAIL_FROM?.trim();
  if (
    !authDatabaseUrl ||
    !applicationDatabaseUrl ||
    !workerDatabaseUrl ||
    !baseURL ||
    !secret ||
    !safetyTermsVersion ||
    !emailFrom ||
    (emailDeliveryMode === "resend" && !resendApiKey)
  ) {
    throw new Error(
      "Identity requires role-separated database URLs, Better Auth settings, safety terms, email sender, and Resend credentials when delivery mode is resend",
    );
  }
  if (secret.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");

  const parsedBaseURL = new URL(baseURL);
  if (production && parsedBaseURL.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production");
  }
  const trustedOrigins = (env.BETTER_AUTH_TRUSTED_ORIGINS ?? parsedBaseURL.origin)
    .split(",")
    .map((origin) => new URL(origin.trim()).origin);
  if (!trustedOrigins.includes(parsedBaseURL.origin)) {
    throw new Error("BETTER_AUTH_TRUSTED_ORIGINS must include the BETTER_AUTH_URL origin");
  }

  const google = provider("GOOGLE", env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET);
  const microsoft = provider("MICROSOFT", env.MICROSOFT_CLIENT_ID, env.MICROSOFT_CLIENT_SECRET);
  return {
    authDatabaseUrl,
    applicationDatabaseUrl,
    workerDatabaseUrl,
    baseURL: parsedBaseURL.origin,
    trustedOrigins,
    secret,
    safetyTermsVersion,
    emailDeliveryMode,
    emailFrom,
    ...(resendApiKey ? { resendApiKey } : {}),
    ...(google ? { google } : {}),
    ...(microsoft ? { microsoft } : {}),
  };
}

function objectStorageConfig(
  env: Record<string, string | undefined>,
  production: boolean,
): ObjectStorageRuntimeConfig {
  const mode = env.OBJECT_STORAGE_MODE ?? (production ? "s3" : "local");
  if (mode === "local") {
    if (production) throw new Error("OBJECT_STORAGE_MODE=local is forbidden in production");
    return { mode, path: env.OBJECT_STORAGE_LOCAL_PATH?.trim() || ".data/objects" };
  }
  if (mode !== "s3") throw new Error("OBJECT_STORAGE_MODE must be local or s3");
  const endpoint = env.S3_ENDPOINT?.trim();
  const bucket = env.S3_BUCKET?.trim();
  const accessKeyId = env.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.S3_SECRET_ACCESS_KEY?.trim();
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 storage requires endpoint, bucket, access key, and secret key");
  }
  const parsedEndpoint = new URL(endpoint);
  if (production && parsedEndpoint.protocol !== "https:") {
    throw new Error("S3_ENDPOINT must use HTTPS in production");
  }
  const region = env.S3_REGION?.trim();
  return {
    mode,
    endpoint: parsedEndpoint.toString().replace(/\/$/, ""),
    bucket,
    accessKeyId,
    secretAccessKey,
    ...(region ? { region } : {}),
  };
}

export function readRuntimeConfig(env: Record<string, string | undefined>): RuntimeConfig {
  const nodeEnv = env.NODE_ENV ?? "development";
  if (nodeEnv !== "development" && nodeEnv !== "test" && nodeEnv !== "production") {
    throw new Error("NODE_ENV must be development, test, or production");
  }

  const hostname = env.HOST?.trim() || "0.0.0.0";
  const version = env.APP_VERSION?.trim() || "0.0.0-dev";
  const production = nodeEnv === "production";
  const identity = identityConfig(env, production);
  const objectStorage = objectStorageConfig(env, production);

  return {
    hostname,
    port: integer("PORT", env.PORT, 3000),
    version,
    nodeEnv,
    trustedProxyHops: integer("TRUSTED_PROXY_HOPS", env.TRUSTED_PROXY_HOPS, 1),
    objectStorage,
    ...(identity ? { identity } : {}),
  };
}
