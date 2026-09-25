import { describe, expect, test } from "bun:test";

const sql = await Bun.file(
  new URL("../packages/database/roles/001_runtime_roles.sql", import.meta.url),
).text();

describe("runtime database role contract", () => {
  test("hardens every runtime role against superuser and RLS bypass", () => {
    for (const role of ["electrasim_auth", "electrasim_app", "electrasim_worker"]) {
      expect(sql).toContain(`alter role ${role} nosuperuser nobypassrls noinherit`);
    }
  });

  test("keeps credential and token tables exclusive to the auth role", () => {
    expect(sql).toMatch(
      /users, sessions, accounts, verifications, passkeys, two_factors\s+to electrasim_auth/,
    );
    expect(sql).not.toMatch(/accounts[^;]+to electrasim_app/);
    expect(sql).not.toMatch(/verifications[^;]+to electrasim_worker/);
  });

  test("exposes content through narrow application and worker functions", () => {
    expect(sql).toContain(
      "grant execute on function app_private.get_published_content(text, text) to electrasim_app",
    );
    expect(sql).toContain(
      "grant execute on function app_private.get_published_media(uuid) to electrasim_app",
    );
    expect(sql).toContain(
      "grant execute on function app_private.release_due_content(integer) to electrasim_worker",
    );
    expect(sql).not.toContain(
      "grant execute on function app_private.release_due_content(integer) to electrasim_app",
    );
  });

  test("gives only the worker durable-job claim/update privileges", () => {
    expect(sql).toContain("grant insert on durable_system_jobs to electrasim_auth");
    expect(sql).toContain(
      "grant select, insert, update, delete on durable_system_jobs to electrasim_worker",
    );
    expect(sql).not.toMatch(/update[^;]+durable_system_jobs[^;]+electrasim_auth/);
  });
});
