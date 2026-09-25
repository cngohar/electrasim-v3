import { describe, expect, test } from "bun:test";

const migration = await Bun.file(
  new URL("../packages/database/migrations/0011_simulator_lesson_submissions.sql", import.meta.url),
).text();
const roles = await Bun.file(
  new URL("../packages/database/roles/001_runtime_roles.sql", import.meta.url),
).text();

describe("simulator LMS persistence contract", () => {
  test("stores immutable learner evidence behind forced row-level security", () => {
    expect(migration).toContain("create table simulator_lesson_submissions");
    expect(migration).toContain("circuit_revision integer not null");
    expect(migration).toContain("evidence jsonb not null");
    expect(migration).toContain(
      "alter table simulator_lesson_submissions force row level security",
    );
    expect(migration).toContain("learner_user_id = app_private.current_user_id()");
    expect(migration.toLowerCase()).not.toContain("policy simulator_lesson_submissions_public");
  });

  test("grants the application only read and insert access", () => {
    expect(roles).toContain(
      "grant select, insert on simulator_lesson_submissions to electrasim_app;",
    );
    expect(roles).not.toContain(
      "grant select, insert, update, delete on simulator_lesson_submissions",
    );
  });
});
