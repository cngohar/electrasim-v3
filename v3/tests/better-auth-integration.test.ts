import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createElectraSimAuth } from "@electrasim/auth";
import type { DrizzleDatabase } from "@electrasim/database";
import * as schema from "@electrasim/database";
import type { TransactionalEmailMessage } from "@electrasim/platform-contracts";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

const postgres = new PGlite();
const emails: TransactionalEmailMessage[] = [];
const provisioning: Array<{ userId: string; requestId: string }> = [];
let auth: ReturnType<typeof createElectraSimAuth>;

beforeAll(async () => {
  for (const file of [
    "0001_tenancy_foundation.sql",
    "0002_auth_account_lifecycle.sql",
    "0003_authorization_catalog.sql",
    "0004_durable_system_jobs.sql",
    "0005_step_up_sessions.sql",
    "0006_content_studio.sql",
  ]) {
    const sql = await Bun.file(
      new URL(`../packages/database/migrations/${file}`, import.meta.url),
    ).text();
    await postgres.exec(sql);
  }

  const database = drizzle(postgres, { schema });
  auth = createElectraSimAuth({
    database: database as unknown as DrizzleDatabase,
    baseURL: "http://localhost:3000",
    trustedOrigins: ["http://localhost:3000"],
    secret: "test-secret-that-is-at-least-32-characters",
    production: false,
    email: {
      enqueue: async (message) => {
        emails.push(message);
      },
    },
    lifecycle: {
      ensurePersonalWorkspace: async (userId, requestId) => {
        provisioning.push({ userId, requestId });
      },
    },
  });
});

afterAll(async () => {
  await postgres.close();
});

describe("Better Auth Bun/Drizzle boundary", () => {
  test("signs up through a Web Request, schedules verification, and provisions idempotently", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "x-request-id": "signup-request-1",
        },
        body: JSON.stringify({
          name: "Alex Example",
          email: "alex@example.test",
          password: "correct-horse-battery-staple",
        }),
      }),
    );

    expect(response.status).toBe(200);
    const users = await postgres.query<{
      id: string;
      email_normalized: string;
      email_verified: boolean;
    }>("select id, email_normalized, email_verified from users");
    expect(users.rows).toHaveLength(1);
    const user = users.rows[0];
    if (!user) throw new Error("signup did not persist a user");
    expect(user.email_normalized).toBe("alex@example.test");
    expect(user.email_verified).toBe(false);
    expect(emails).toHaveLength(1);
    expect(emails[0]?.template).toBe("verify_email");
    expect(emails[0]?.to).toBe("alex@example.test");
    expect(provisioning).toEqual([{ userId: user.id, requestId: "signup-request-1" }]);
  });

  test("refuses password sign-in until email verification", async () => {
    const response = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-in/email", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "http://localhost:3000" },
        body: JSON.stringify({
          email: "alex@example.test",
          password: "correct-horse-battery-staple",
        }),
      }),
    );
    expect(response.status).toBe(403);
  });
});
