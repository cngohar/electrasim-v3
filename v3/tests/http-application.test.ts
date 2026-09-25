import { describe, expect, test } from "bun:test";
import { PublishedContentService, PublishedMediaService } from "@electrasim/content-studio";
import { cachePolicy, createApplication } from "@electrasim/http-application";
import type { Logger } from "@electrasim/platform-contracts";
import {
  createVerticalSliceCircuit,
  type SimulatorLessonSubmissionRepository,
  SimulatorLessonSubmissionService,
  type SimulatorProjectRepository,
  SimulatorProjectService,
} from "@electrasim/simulator-domain";

const logger: Logger = { info() {}, error() {} };
const app = createApplication({
  version: "3.0.0-test",
  clock: { now: () => new Date("2026-09-24T00:00:00.000Z") },
  logger,
  readinessChecks: [
    {
      name: "database",
      async check() {
        return { ready: true };
      },
    },
  ],
});

describe("portable HTTP application", () => {
  test("serves liveness with private no-store policy", async () => {
    const response = await app(new Request("https://electrasim.test/health"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(cachePolicy.sensitive);
    expect(response.headers.get("x-electrasim-runtime")).toBe("bun");
    expect(await response.json()).toEqual({ status: "ok", version: "3.0.0-test" });
  });

  test("aggregates readiness checks", async () => {
    const response = await app(new Request("https://electrasim.test/ready"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ready",
      checks: [{ name: "database", ready: true }],
    });
  });

  test("returns 503 when a dependency is not ready", async () => {
    const unavailable = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [
        {
          name: "database",
          async check() {
            return { ready: false, detail: "unavailable" };
          },
        },
      ],
    });
    const response = await unavailable(new Request("https://electrasim.test/ready"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      status: "not_ready",
      checks: [{ name: "database", ready: false, detail: "unavailable" }],
    });
  });

  test("serves only media approved by the published-revision boundary", async () => {
    const publishedId = "11111111-1111-4111-8111-111111111111";
    const mediaApp = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
      publishedMedia: new PublishedMediaService(
        {
          async put() {},
          async get() {
            return new Uint8Array([137, 80, 78, 71]);
          },
          async delete() {},
        },
        {
          async getPublished(mediaId: string) {
            if (mediaId !== publishedId) return null;
            return {
              objectKey: "content/published.png",
              contentType: "image/png",
              byteSize: 4,
              sha256: "a".repeat(64),
            };
          },
        },
      ),
    });
    const unavailable = await mediaApp(
      new Request("https://electrasim.test/api/public/media/22222222-2222-4222-8222-222222222222"),
    );
    expect(unavailable.status).toBe(404);
    expect(unavailable.headers.get("cache-control")).toBe("private, no-store");

    const published = await mediaApp(
      new Request(`https://electrasim.test/api/public/media/${publishedId}`),
    );
    expect(published.status).toBe(200);
    expect(published.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(published.headers.get("content-type")).toBe("image/png");
    expect(await published.bytes()).toEqual(new Uint8Array([137, 80, 78, 71]));
  });

  test("runs the bounded deterministic simulator API", async () => {
    const response = await app(
      new Request("https://electrasim.test/api/simulator/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenario: "overload",
          supplyFamily: "us_110_120",
          durationMs: 10_000,
          stepMs: 100,
        }),
      }),
    );
    expect(response.status).toBe(200);
    const run = (await response.json()) as {
      engineVersion: number;
      events: { type: string }[];
    };
    expect(run.engineVersion).toBe(0);
    expect(run.events.map((event) => event.type)).toContain("protection.tripped");
  });

  test("loads bounded diagnostic fault exercises through the simulator API", async () => {
    const response = await app(
      new Request("https://electrasim.test/api/simulator/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scenario: "diagnostic_insulation_damage",
          supplyFamily: "international_230_240",
          durationMs: 1_000,
          stepMs: 100,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      circuit: {
        title: "Damaged insulation resistance exercise",
        faults: [{ resistanceOhms: 2_000_000, capacitanceMicrofarads: 1 }],
      },
    });
  });

  test("evaluates instructor-ready guided simulator lessons", async () => {
    const response = await app(
      new Request("https://electrasim.test/api/simulator/lessons", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lessonId: "build_protected_lamp",
          circuit: createVerticalSliceCircuit(),
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      lesson: { instructorTemplate: true },
      evaluation: { lessonId: "build_protected_lamp", completed: true },
    });
  });

  test("stores authenticated LMS simulator submissions", async () => {
    const rows: Parameters<SimulatorLessonSubmissionRepository["save"]>[0][] = [];
    const repository: SimulatorLessonSubmissionRepository = {
      async save(value) {
        rows.push(value);
        return value;
      },
      async listForLearner(userId) {
        return rows.filter((row) => row.learnerUserId === userId);
      },
    };
    const submissionApp = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
      resolveIdentity: async () => ({
        userId: "22222222-2222-4222-8222-222222222222",
      }),
      simulatorLessonSubmissions: new SimulatorLessonSubmissionService(repository),
    });
    const response = await submissionApp(
      new Request("https://electrasim.test/api/simulator/lesson-submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lessonId: "build_protected_lamp",
          circuit: createVerticalSliceCircuit(),
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      submission: { completed: true, circuitRevision: 1 },
    });
    expect(rows).toHaveLength(1);
  });

  test("applies validated free-form editor commands and returns their inverse", async () => {
    const circuit = createVerticalSliceCircuit();
    const response = await app(
      new Request("https://electrasim.test/api/simulator/command", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          circuit,
          command: {
            type: "set_component_position",
            componentId: "breaker",
            position: { x: 360, y: 140 },
          },
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      circuit: { layout: { componentPositions: { breaker: { x: 360, y: 140 } } } },
      inverse: { type: "set_component_position", componentId: "breaker", position: null },
    });
  });

  test("advances the validated safe-diagnostic workflow at the API boundary", async () => {
    const circuit = createVerticalSliceCircuit();
    const response = await app(
      new Request("https://electrasim.test/api/simulator/diagnostic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          circuit,
          action: {
            type: "begin",
            isolationComponentId: "breaker",
            pointOfWorkComponentId: "load",
          },
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      session: { state: "identified", locked: false },
      circuit: { diagnosticSession: { state: "identified" } },
    });
  });

  test("migrates and runs imported schema v1 circuits at the API boundary", async () => {
    const current = createVerticalSliceCircuit();
    const legacy = {
      ...current,
      schemaVersion: 1,
      components: current.components.map((component) => {
        if (component.kind !== "breaker") return component;
        const { protectionModel: _protectionModel, ...rest } = component;
        return { ...rest, tripSecondsAt200Percent: 2 };
      }),
    };
    const response = await app(
      new Request("https://electrasim.test/api/simulator/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ circuit: legacy, durationMs: 1_000, stepMs: 100 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      circuit: { schemaVersion: 2 },
      migration: { migratedFrom: 1, warnings: [expect.stringContaining("non-standard")] },
    });
  });

  test("reports database-backed Pro project entitlement instead of a UI flag", async () => {
    const projectApp = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
      resolveIdentity: async () => ({ userId: crypto.randomUUID() }),
      hasSimulatorPro: async () => true,
      simulatorProjects: new SimulatorProjectService({
        async list() {
          return [];
        },
      } as unknown as SimulatorProjectRepository),
    });
    const response = await projectApp(
      new Request("https://electrasim.test/api/simulator/projects"),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ projects: [], quota: { free: 5, unlimited: true } });
  });

  test("renders published content as a safe public article page", async () => {
    const publicApp = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
      publishedContent: new PublishedContentService({
        async getPublished(slug) {
          if (slug !== "safe-isolation") return null;
          return {
            itemId: crypto.randomUUID(),
            revisionId: crypto.randomUUID(),
            kind: "article",
            slug,
            locale: "en",
            title: "Safe <isolation>",
            description: "Verify absence of voltage.",
            body: { format: "markdown", markdown: "# Isolate\n<script>alert(1)</script>" },
            authorDisplayName: "ElectraSim",
            category: "Safety",
            tags: ["safety"],
            canonicalUrl: "/blog/safe-isolation/",
            publishedAt: new Date("2025-01-01T00:00:00Z"),
            updatedAt: new Date("2025-01-01T00:00:00Z"),
          };
        },
      }),
    });
    const response = await publicApp(new Request("https://electrasim.test/blog/safe-isolation/"));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=300");
    const html = await response.text();
    expect(html).toContain("Safe &lt;isolation&gt;");
    expect(html).toContain("By ElectraSim");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  test("only explicitly public version metadata is CDN-cacheable", async () => {
    const response = await app(new Request("https://electrasim.test/public/version"));
    expect(response.headers.get("cache-control")).toBe(cachePolicy.publicVersion);
    expect(await response.json()).toEqual({
      version: "3.0.0-test",
      generatedAt: "2026-09-24T00:00:00.000Z",
    });
  });

  test("session-shaped responses can never enter a shared cache", async () => {
    const response = await app(new Request("https://electrasim.test/v1/session-probe"));
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });

  test("preserves a safe upstream request id and rejects unsafe values", async () => {
    const kept = await app(
      new Request("https://electrasim.test/health", { headers: { "x-request-id": "trace-123" } }),
    );
    expect(kept.headers.get("x-request-id")).toBe("trace-123");

    const replaced = await app(
      new Request("https://electrasim.test/health", { headers: { "x-request-id": "bad id" } }),
    );
    expect(replaced.headers.get("x-request-id")).not.toBe("bad id");
  });

  test("HEAD has identical policy headers and no response body", async () => {
    const response = await app(
      new Request("https://electrasim.test/public/version", { method: "HEAD" }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(cachePolicy.publicVersion);
    expect(await response.text()).toBe("");
  });

  test("rejects unsupported methods without caching the error", async () => {
    const response = await app(new Request("https://electrasim.test/health", { method: "POST" }));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
  });
});
