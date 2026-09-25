import { describe, expect, test } from "bun:test";
import type { SessionActor } from "@electrasim/authorization";
import {
  type ContentStudioRepository,
  ContentStudioService,
  type StoreContentDraftInput,
} from "@electrasim/content-studio";
import { createApplication } from "@electrasim/http-application";
import type { Logger } from "@electrasim/platform-contracts";
import {
  type WorkspaceAdministrationRepository,
  WorkspaceAdministrationService,
} from "@electrasim/workspace-administration";

const logger: Logger = { info() {}, error() {} };
const workspaceId = "11111111-1111-4111-8111-111111111111";

function actor(overrides: Partial<SessionActor> = {}): SessionActor {
  return {
    userId: "22222222-2222-4222-8222-222222222222",
    sessionId: "session-1",
    emailVerified: true,
    onboardingComplete: true,
    mfaSatisfied: true,
    stepUpValidUntil: null,
    platformPermissions: new Set(["platform.admin.access"]),
    workspaceMemberships: new Map([
      [workspaceId, { active: true, permissions: new Set(["workspace.membership.read"]) }],
    ]),
    ...overrides,
  };
}

function application(input: { platform?: SessionActor | null; workspace?: SessionActor | null }) {
  return createApplication({
    version: "test",
    clock: { now: () => new Date("2026-09-24T12:00:00Z") },
    logger,
    readinessChecks: [],
    resolvePlatformActor: async () => input.platform ?? null,
    resolveWorkspaceActor: async () => input.workspace ?? null,
    workspaceAdministration: new WorkspaceAdministrationService({
      async listForUser() {
        return [];
      },
      async getOrganization() {
        return { campuses: [], departments: [] };
      },
      async listMembers() {
        return [];
      },
    } as unknown as WorkspaceAdministrationRepository),
  });
}

describe("protected admin and workspace handlers", () => {
  test("denies platform admin access without session or MFA", async () => {
    const unauthenticated = await application({})(
      new Request("https://electrasim.test/api/admin/access"),
    );
    expect(unauthenticated.status).toBe(401);

    const missingMfa = await application({ platform: actor({ mfaSatisfied: false }) })(
      new Request("https://electrasim.test/api/admin/access"),
    );
    expect(missingMfa.status).toBe(403);
    expect(await missingMfa.json()).toMatchObject({ error: "mfa_required" });
  });

  test("allows only an MFA-authenticated platform permission", async () => {
    const denied = await application({
      platform: actor({ platformPermissions: new Set() }),
    })(new Request("https://electrasim.test/api/admin/access"));
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: "permission_denied" });

    const allowed = await application({ platform: actor() })(
      new Request("https://electrasim.test/api/admin/access"),
    );
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("cache-control")).toBe("private, no-store");
  });

  test("creates content drafts only with the bounded content permission", async () => {
    const contentStudio = new ContentStudioService(
      {
        async createDraft(input: StoreContentDraftInput) {
          return {
            itemId: input.itemId,
            revisionId: input.revisionId,
            revisionNumber: 1,
            status: "draft",
          };
        },
      } as unknown as ContentStudioRepository,
      () => "44444444-4444-4444-8444-444444444444",
    );
    const app = createApplication({
      version: "test",
      clock: { now: () => new Date("2026-09-24T12:00:00Z") },
      logger,
      readinessChecks: [],
      contentStudio,
      resolvePlatformActor: async () =>
        actor({ platformPermissions: new Set(["platform.content.edit"]) }),
    });
    const response = await app(
      new Request("https://electrasim.test/api/admin/content", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "marketing_page",
          slug: "for-instructors",
          title: "For instructors",
          description: "Teach electrical principles with visible evidence.",
          body: { format: "blocks", document: { version: 1, blocks: [] } },
          authorDisplayName: "ElectraSim",
          changeSummary: "Create static page",
        }),
      }),
    );
    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ revisionNumber: 1, status: "draft" });
  });

  test("lists immutable revisions and renders a private sanitized preview", async () => {
    const itemId = "44444444-4444-4444-8444-444444444444";
    const revisionId = "55555555-5555-4555-8555-555555555555";
    const createdAt = new Date("2026-09-24T10:00:00Z");
    const repository = {
      async listRevisions() {
        return [
          {
            revisionId,
            revisionNumber: 2,
            title: "Safe preview",
            locale: "en",
            authorDisplayName: "ElectraSim",
            changeSummary: "Clarify safe isolation",
            safetyReviewStatus: "approved" as const,
            createdByUserId: "22222222-2222-4222-8222-222222222222",
            createdAt,
          },
        ];
      },
      async getRevision() {
        return {
          itemId,
          revisionId,
          revisionNumber: 2,
          locale: "en",
          title: "Safe preview",
          description: "Preview before publication.",
          body: { format: "markdown" as const, markdown: "# Isolate\n<script>alert(1)</script>" },
          authorDisplayName: "ElectraSim",
          category: "Safety",
          tags: ["isolation"],
          featuredImage: null,
          seoTitle: null,
          canonicalUrl: null,
          changeSummary: "Clarify safe isolation",
          safetyReviewStatus: "approved" as const,
          createdByUserId: "22222222-2222-4222-8222-222222222222",
          reviewedByUserId: "33333333-3333-4333-8333-333333333333",
          reviewedAt: createdAt,
          createdAt,
        };
      },
    } as unknown as ContentStudioRepository;
    const app = createApplication({
      version: "test",
      clock: { now: () => new Date("2026-09-24T12:00:00Z") },
      logger,
      readinessChecks: [],
      contentStudio: new ContentStudioService(repository),
      resolvePlatformActor: async () =>
        actor({ platformPermissions: new Set(["platform.content.read"]) }),
    });
    const history = await app(
      new Request(`https://electrasim.test/api/admin/content/${itemId}/revisions`),
    );
    expect(history.status).toBe(200);
    expect(await history.json()).toMatchObject({
      revisions: [{ revisionId, revisionNumber: 2, createdAt: createdAt.toISOString() }],
    });

    const preview = await app(
      new Request(
        `https://electrasim.test/api/admin/content/${itemId}/revisions/${revisionId}/preview`,
      ),
    );
    expect(preview.status).toBe(200);
    expect(preview.headers.get("cache-control")).toBe("private, no-store");
    const payload = (await preview.json()) as { html: string };
    expect(payload.html).toContain("<h1>Isolate</h1>");
    expect(payload.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(payload.html).not.toContain("<script>");
  });

  test("requires fresh step-up before content review or publication", async () => {
    const contentStudio = new ContentStudioService({} as ContentStudioRepository);
    const app = createApplication({
      version: "test",
      clock: { now: () => new Date("2026-09-24T12:00:00Z") },
      logger,
      readinessChecks: [],
      contentStudio,
      resolvePlatformActor: async () =>
        actor({
          platformPermissions: new Set(["platform.content.publish"]),
          stepUpValidUntil: null,
        }),
    });
    const response = await app(
      new Request(
        "https://electrasim.test/api/admin/content/44444444-4444-4444-8444-444444444444/publish",
        { method: "POST", body: "{}" },
      ),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "step_up_required" });
  });

  test("binds workspace authorization to the exact route workspace", async () => {
    const wrongWorkspaceActor = actor({
      workspaceMemberships: new Map([
        [
          "33333333-3333-4333-8333-333333333333",
          { active: true, permissions: new Set(["workspace.membership.read"]) },
        ],
      ]),
    });
    const denied = await application({ workspace: wrongWorkspaceActor })(
      new Request(`https://electrasim.test/api/workspaces/${workspaceId}/members`),
    );
    expect(denied.status).toBe(403);
    expect(await denied.json()).toMatchObject({ error: "workspace_membership_inactive" });

    const allowed = await application({ workspace: actor() })(
      new Request(`https://electrasim.test/api/workspaces/${workspaceId}/members`),
    );
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toEqual({ members: [] });
  });

  test("separates workspace discovery from exact-workspace organization permission", async () => {
    const workspaceAdministration = new WorkspaceAdministrationService({
      async listForUser() {
        return [
          {
            id: workspaceId,
            name: "Lodhran Technical Institute",
            type: "institution",
            membershipStatus: "active",
            roleKeys: ["institution_owner"],
          },
        ];
      },
      async getOrganization() {
        return { campuses: [], departments: [] };
      },
    } as unknown as WorkspaceAdministrationRepository);
    const discoveryApp = createApplication({
      version: "test",
      clock: { now: () => new Date(0) },
      logger,
      readinessChecks: [],
      resolveIdentity: async () => ({ userId: actor().userId }),
      resolveWorkspaceActor: async () =>
        actor({
          workspaceMemberships: new Map([
            [workspaceId, { active: true, permissions: new Set(["workspace.settings.manage"]) }],
          ]),
        }),
      workspaceAdministration,
    });
    const list = await discoveryApp(new Request("https://electrasim.test/api/account/workspaces"));
    expect(list.status).toBe(200);
    expect(await list.json()).toMatchObject({
      workspaces: [{ id: workspaceId, type: "institution" }],
    });
    const organization = await discoveryApp(
      new Request(`https://electrasim.test/api/workspaces/${workspaceId}/organization`),
    );
    expect(organization.status).toBe(200);
    expect(await organization.json()).toEqual({ campuses: [], departments: [] });
  });

  test("requires MFA and fresh step-up before changing roster access", async () => {
    const manager = actor({
      workspaceMemberships: new Map([
        [workspaceId, { active: true, permissions: new Set(["workspace.membership.manage"]) }],
      ]),
      stepUpValidUntil: null,
    });
    const response = await application({ workspace: manager })(
      new Request(
        `https://electrasim.test/api/workspaces/${workspaceId}/members/33333333-3333-4333-8333-333333333333/status`,
        { method: "PUT", body: JSON.stringify({ status: "suspended" }) },
      ),
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "step_up_required" });
  });
});
