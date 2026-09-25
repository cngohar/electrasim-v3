import { describe, expect, test } from "bun:test";
import {
  ContentMediaService,
  ContentStudioError,
  type ContentStudioRepository,
  ContentStudioService,
  collectContentMediaIds,
  createContentDraft,
  legacyArticleToDraft,
  normalizeLegacyMarkdown,
  PublishedMediaService,
  parseLegacyArticle,
  renderBody,
  renderMarkdown,
  type StoreContentDraftInput,
} from "@electrasim/content-studio";

const legacyBlogDirectory = new URL("../../astro-site/src/content/blog/", import.meta.url);

describe("Content Studio", () => {
  test("creates both owner-authored articles and structured static pages", () => {
    const article = createContentDraft({
      kind: "article",
      slug: "RCD-Protection-Explained",
      title: "RCD protection explained",
      description: "A standards-aware introduction to residual-current protection.",
      body: { format: "markdown", markdown: "## Start safely" },
      authorDisplayName: "ElectraSim",
      tags: ["safety", "RCD", "safety"],
      changeSummary: "Initial owner draft",
    });
    const page = createContentDraft({
      kind: "marketing_page",
      slug: "for-institutions",
      title: "ElectraSim for institutions",
      description: "Institution learning and administration.",
      body: { format: "blocks", document: { version: 1, blocks: [] } },
      authorDisplayName: "ElectraSim",
      changeSummary: "Create institution page",
    });
    expect(article.slug).toBe("rcd-protection-explained");
    expect(article.tags).toEqual(["safety", "RCD"]);
    expect(page.body.format).toBe("blocks");
  });

  test("rejects unsafe slugs and empty documents", () => {
    expect(() =>
      createContentDraft({
        kind: "marketing_page",
        slug: "../admin",
        title: "Invalid",
        description: "Invalid path",
        body: { format: "blocks", document: {} },
        authorDisplayName: "ElectraSim",
        changeSummary: "Invalid",
      }),
    ).toThrow(ContentStudioError);
  });

  test("passes validated drafts and opaque identifiers into persistence", async () => {
    let captured: unknown;
    const identifiers = ["item", "revision", "author", "audit", "outbox"];
    const service = new ContentStudioService(
      {
        async createDraft(input: StoreContentDraftInput) {
          captured = input;
          return {
            itemId: input.itemId,
            revisionId: input.revisionId,
            revisionNumber: 1,
            status: "draft",
          };
        },
      } as unknown as ContentStudioRepository,
      () => identifiers.shift() ?? "unexpected",
    );
    const result = await service.createDraft({
      actorUserId: "actor",
      requestId: "request",
      content: {
        kind: "article",
        slug: "New-Article",
        title: " New article ",
        description: "Article description",
        body: { format: "markdown", markdown: "Article body" },
        authorDisplayName: "ElectraSim",
        changeSummary: "Create draft",
      },
    });
    expect(result).toEqual({
      itemId: "item",
      revisionId: "revision",
      revisionNumber: 1,
      status: "draft",
    });
    expect(captured).toMatchObject({
      proposedAuthorId: "author",
      auditId: "audit",
      outboxId: "outbox",
      actorUserId: "actor",
      draft: { slug: "new-article", title: "New article" },
    });
  });

  test("renders published Markdown and blocks without executable author markup", () => {
    const html = renderMarkdown(
      "# Safe heading\n\n<script>alert(1)</script>\n\n[bad](javascript:alert(1)) [good](/guide)",
    );
    expect(html).toContain("<h1>Safe heading</h1>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("javascript:");
    expect(html).toContain('href="/guide"');
    const table = renderMarkdown("| Device | State |\n|---|---|\n| RCD | Tripped |");
    expect(table).toContain("<table>");
    expect(table).toContain("<td>Tripped</td>");

    const blocks = renderBody({
      format: "blocks",
      document: {
        version: 1,
        blocks: [
          { type: "safety_notice", text: '<img src=x onerror="alert(1)">' },
          { type: "cta", heading: "Learn", body: "Build safely", label: "Open", href: "/app" },
        ],
      },
    });
    expect(blocks).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(blocks).toContain('href="/app"');
  });

  test("validates image bytes and removes orphaned objects after persistence failure", async () => {
    const objects = new Map<string, Uint8Array>();
    const store = {
      async put(key: string, value: Uint8Array) {
        objects.set(key, value);
      },
      async get(key: string) {
        return objects.get(key) ?? null;
      },
      async delete(key: string) {
        objects.delete(key);
      },
    };
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47]);
    png.set([0, 0, 0, 120], 16);
    png.set([0, 0, 0, 80], 20);
    let recorded = false;
    const service = new ContentMediaService(
      store,
      {
        async record() {
          recorded = true;
        },
        async get() {
          return null;
        },
      },
      () => "media-id",
    );
    const uploaded = await service.upload({
      bytes: png,
      filename: "diagram.png",
      declaredContentType: "image/png",
      altText: "RCD test circuit diagram",
      actorUserId: "actor",
      requestId: "request",
    });
    expect(uploaded).toMatchObject({
      width: 120,
      height: 80,
      url: "/api/admin/content/media/media-id",
      referenceUrl: "/api/public/media/media-id",
    });
    expect(recorded).toBe(true);
    const mediaId = "11111111-1111-4111-8111-111111111111";
    expect(
      collectContentMediaIds({
        format: "markdown",
        markdown: `![Diagram](/api/public/media/${mediaId})`,
      }),
    ).toEqual([mediaId]);
    expect(
      collectContentMediaIds({
        format: "blocks",
        document: { version: 1, blocks: [{ type: "image", mediaId }] },
      }),
    ).toEqual([mediaId]);
    const published = new PublishedMediaService(store, {
      async getPublished() {
        return {
          objectKey: "content/media-id.png",
          contentType: "image/png",
          byteSize: png.byteLength,
          sha256: "a".repeat(64),
        };
      },
    });
    expect(await published.get(mediaId)).toMatchObject({
      contentType: "image/png",
      sha256: "a".repeat(64),
    });

    const failing = new ContentMediaService(
      store,
      {
        async record() {
          throw new Error("database");
        },
        async get() {
          return null;
        },
      },
      () => "orphan",
    );
    await expect(
      failing.upload({
        bytes: png,
        filename: "diagram.png",
        declaredContentType: "image/png",
        altText: "Diagram",
        actorUserId: "actor",
        requestId: "request",
      }),
    ).rejects.toThrow("database");
    expect(objects.has("content/orphan.png")).toBe(false);
    await expect(
      service.upload({
        bytes: png,
        filename: "diagram.svg",
        declaredContentType: "image/svg+xml",
        altText: "Unsafe",
        actorUserId: "actor",
        requestId: "request",
      }),
    ).rejects.toThrow(ContentStudioError);
  });

  test("validates high-risk lifecycle decisions and managed redirects", async () => {
    let transitionAction = "";
    const redirects: { sourcePath: string; destinationPath: string }[] = [];
    const repository = {
      async transition(input: { action: string }) {
        transitionAction = input.action;
        return { status: "archived" as const };
      },
      async createRedirect(input: { sourcePath: string; destinationPath: string }) {
        redirects.push(input);
        return input;
      },
    } as unknown as ContentStudioRepository;
    const service = new ContentStudioService(repository, () => crypto.randomUUID());
    await service.transition({
      itemId: crypto.randomUUID(),
      action: "archive",
      reason: "Superseded after editorial review",
      actorUserId: crypto.randomUUID(),
      requestId: "request-archive",
    });
    expect(transitionAction).toBe("archive");
    await service.createRedirect({
      itemId: crypto.randomUUID(),
      sourcePath: "/blog/old-path/",
      destinationPath: "/blog/new-path/",
      reason: "Preserve the canonical legacy URL",
      actorUserId: crypto.randomUUID(),
      requestId: "request-redirect",
    });
    expect(redirects[0]).toMatchObject({
      sourcePath: "/blog/old-path/",
      destinationPath: "/blog/new-path/",
    });
    expect(() =>
      service.createRedirect({
        itemId: crypto.randomUUID(),
        sourcePath: "https://evil.example/",
        destinationPath: "/blog/safe/",
        reason: "Unsafe external source",
        actorUserId: crypto.randomUUID(),
        requestId: "request-invalid",
      }),
    ).toThrow(ContentStudioError);
  });

  test("normalizes legacy decorative HTML into portable accessible Markdown", () => {
    const normalized = normalizeLegacyMarkdown(
      '<span class="em em-bulb" role="img" aria-label="tip"></span> Learn safely.',
    );
    expect(normalized).toBe("[tip] Learn safely.");
  });

  test("parses every legacy owner-authored blog post without changing attribution", async () => {
    const glob = new Bun.Glob("*.md");
    const articles = [];
    for await (const filename of glob.scan({ cwd: legacyBlogDirectory.pathname })) {
      const source = await Bun.file(new URL(filename, legacyBlogDirectory)).text();
      articles.push(parseLegacyArticle(filename, source));
    }
    expect(articles).toHaveLength(69);
    expect(new Set(articles.map((article) => article.author))).toEqual(new Set(["ElectraSim"]));
    expect(articles.every((article) => article.markdown.length > 100)).toBe(true);
    expect(articles.every((article) => !article.markdown.includes('<span class="em'))).toBe(true);
    expect(articles.every((article) => !article.markdown.includes("<figure"))).toBe(true);
    const drafts = articles.map(legacyArticleToDraft);
    expect(new Set(drafts.map((draft) => draft.slug)).size).toBe(69);
    expect(drafts.every((draft) => draft.legacySourceKey?.startsWith("astro-blog:"))).toBe(true);
  });
});
