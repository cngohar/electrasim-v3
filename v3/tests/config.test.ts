import { describe, expect, test } from "bun:test";
import { readRuntimeConfig } from "../apps/api/src/config.ts";

const productionStorage = {
  OBJECT_STORAGE_MODE: "s3",
  S3_ENDPOINT: "https://objects.example.test",
  S3_BUCKET: "electrasim-media",
  S3_ACCESS_KEY_ID: "storage-access",
  S3_SECRET_ACCESS_KEY: "storage-secret",
};

describe("runtime configuration", () => {
  test("uses safe container defaults", () => {
    expect(readRuntimeConfig({})).toEqual({
      hostname: "0.0.0.0",
      port: 3000,
      version: "0.0.0-dev",
      nodeEnv: "development",
      trustedProxyHops: 1,
      objectStorage: { mode: "local", path: ".data/objects" },
    });
  });

  test("accepts PaaS-injected port and production settings", () => {
    expect(
      readRuntimeConfig({
        HOST: "0.0.0.0",
        PORT: "8080",
        APP_VERSION: "3.0.0-sha.abc",
        NODE_ENV: "production",
        TRUSTED_PROXY_HOPS: "2",
        ...productionStorage,
      }),
    ).toEqual({
      hostname: "0.0.0.0",
      port: 8080,
      version: "3.0.0-sha.abc",
      nodeEnv: "production",
      trustedProxyHops: 2,
      objectStorage: {
        mode: "s3",
        endpoint: "https://objects.example.test",
        bucket: "electrasim-media",
        accessKeyId: "storage-access",
        secretAccessKey: "storage-secret",
      },
    });
  });

  test("requires explicit role-separated identity and email configuration", () => {
    const config = readRuntimeConfig({
      NODE_ENV: "production",
      ...productionStorage,
      AUTH_DATABASE_URL: "postgres://auth@db/electrasim",
      APPLICATION_DATABASE_URL: "postgres://app@db/electrasim",
      WORKER_DATABASE_URL: "postgres://worker@db/electrasim",
      BETTER_AUTH_URL: "https://app.electrasim.example",
      BETTER_AUTH_TRUSTED_ORIGINS:
        "https://app.electrasim.example,https://admin.electrasim.example",
      BETTER_AUTH_SECRET: "a-secure-secret-with-at-least-32-characters",
      SAFETY_TERMS_VERSION: "2026-09",
      RESEND_API_KEY: "re_test",
      EMAIL_FROM: "ElectraSim <account@electrasim.example>",
    });
    expect(config.identity).toMatchObject({
      authDatabaseUrl: "postgres://auth@db/electrasim",
      applicationDatabaseUrl: "postgres://app@db/electrasim",
      workerDatabaseUrl: "postgres://worker@db/electrasim",
      baseURL: "https://app.electrasim.example",
      safetyTermsVersion: "2026-09",
    });
  });

  test("uses local email capture without provider credentials in development", () => {
    const config = readRuntimeConfig({
      DATABASE_URL: "postgres://localhost/electrasim",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "a-secure-secret-with-at-least-32-characters",
      SAFETY_TERMS_VERSION: "2026-09",
      EMAIL_FROM: "ElectraSim <account@example.test>",
    });
    expect(config.identity).toMatchObject({
      emailDeliveryMode: "capture",
      authDatabaseUrl: "postgres://localhost/electrasim",
      workerDatabaseUrl: "postgres://localhost/electrasim",
    });
    expect(config.identity?.resendApiKey).toBeUndefined();
  });

  test("rejects partial or unsafe identity configuration", () => {
    expect(() => readRuntimeConfig({ DATABASE_URL: "postgres://localhost/test" })).toThrow(
      "Identity requires",
    );
    expect(() =>
      readRuntimeConfig({
        NODE_ENV: "production",
        ...productionStorage,
        AUTH_DATABASE_URL: "postgres://auth@db/test",
        APPLICATION_DATABASE_URL: "postgres://app@db/test",
        WORKER_DATABASE_URL: "postgres://worker@db/test",
        BETTER_AUTH_URL: "http://app.example.test",
        BETTER_AUTH_SECRET: "a-secure-secret-with-at-least-32-characters",
        SAFETY_TERMS_VERSION: "2026-09",
        RESEND_API_KEY: "re_test",
        EMAIL_FROM: "account@example.test",
      }),
    ).toThrow("HTTPS");
  });

  test("rejects invalid values before the server starts", () => {
    expect(() => readRuntimeConfig({ PORT: "not-a-port" })).toThrow("PORT must be an integer");
    expect(() => readRuntimeConfig({ NODE_ENV: "staging" })).toThrow("NODE_ENV must be");
    expect(() => readRuntimeConfig({ TRUSTED_PROXY_HOPS: "-1" })).toThrow(
      "TRUSTED_PROXY_HOPS must be an integer",
    );
  });
});
