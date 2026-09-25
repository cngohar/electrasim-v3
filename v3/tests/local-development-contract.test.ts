import { describe, expect, test } from "bun:test";

const compose = await Bun.file(new URL("../compose.local.yml", import.meta.url)).text();
const localEnvironment = await Bun.file(new URL("../env.local.example", import.meta.url)).text();

describe("local-before-hosting development contract", () => {
  test("binds PostgreSQL to loopback and executes every migration before role provisioning", () => {
    expect(compose).toContain('"127.0.0.1:54329:5432"');
    for (const migration of [
      "0001_tenancy_foundation.sql",
      "0002_auth_account_lifecycle.sql",
      "0003_authorization_catalog.sql",
      "0004_durable_system_jobs.sql",
      "0005_step_up_sessions.sql",
      "0006_content_studio.sql",
    ]) {
      expect(compose).toContain(migration);
    }
    expect(compose.indexOf("14_step_up.sql")).toBeLessThan(compose.indexOf("20_runtime_roles.sql"));
    expect(compose.indexOf("20_runtime_roles.sql")).toBeLessThan(
      compose.indexOf("99_local_logins.sql"),
    );
  });

  test("uses three role-separated URLs and local capture rather than live email", () => {
    expect(localEnvironment).toContain("AUTH_DATABASE_URL=postgres://electrasim_auth:");
    expect(localEnvironment).toContain("APPLICATION_DATABASE_URL=postgres://electrasim_app:");
    expect(localEnvironment).toContain("WORKER_DATABASE_URL=postgres://electrasim_worker:");
    expect(localEnvironment).toContain("EMAIL_DELIVERY_MODE=capture");
    expect(localEnvironment).not.toContain("RESEND_API_KEY=");
  });
});
