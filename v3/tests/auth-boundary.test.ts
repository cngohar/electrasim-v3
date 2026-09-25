import { describe, expect, test } from "bun:test";
import { createElectraSimAuth } from "@electrasim/auth";
import type { DrizzleDatabase } from "@electrasim/database";
import { createApplication } from "@electrasim/http-application";
import type { Logger } from "@electrasim/platform-contracts";

const logger: Logger = { info() {}, error() {} };

describe("authentication boundary", () => {
  test("rejects an unsafe Better Auth secret before adapter initialization", () => {
    expect(() =>
      createElectraSimAuth({
        database: {} as DrizzleDatabase,
        baseURL: "http://localhost:3000",
        trustedOrigins: ["http://localhost:3000"],
        secret: "short",
        production: false,
        email: { async enqueue() {} },
        lifecycle: { async ensurePersonalWorkspace() {} },
      }),
    ).toThrow("at least 32 characters");
  });

  test("forwards all auth methods as raw Web requests and forces no-store", async () => {
    let received: Request | null = null;
    const app = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
      authHandler: async (request) => {
        received = request;
        return new Response(JSON.stringify({ ok: true }), {
          status: 201,
          headers: { "content-type": "application/json", "set-cookie": "session=secret; HttpOnly" },
        });
      },
    });
    const request = new Request("https://electrasim.test/api/auth/sign-in/email", {
      method: "POST",
      body: JSON.stringify({ email: "alex@example.test", password: "not-logged" }),
      headers: { "content-type": "application/json" },
    });
    const response = await app(request);
    const forwarded = received as Request | null;
    expect(forwarded?.url).toBe(request.url);
    expect(forwarded?.method).toBe("POST");
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  test("fails closed when auth storage has not been configured", async () => {
    const app = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
    });
    const response = await app(
      new Request("https://electrasim.test/api/auth/get-session", { method: "GET" }),
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
