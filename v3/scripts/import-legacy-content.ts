import {
  ContentStudioService,
  legacyArticleToDraft,
  parseLegacyArticle,
} from "@electrasim/content-studio";
import { createPostgresClient, PostgresContentStudioRepository } from "@electrasim/database";

const databaseUrl = process.env.APP_DATABASE_URL;
const actorUserId = process.env.CONTENT_IMPORT_ACTOR_USER_ID;
if (!databaseUrl || !actorUserId) {
  throw new Error("APP_DATABASE_URL and CONTENT_IMPORT_ACTOR_USER_ID are required");
}
if (!/^[0-9a-f-]{36}$/i.test(actorUserId)) throw new Error("Invalid CONTENT_IMPORT_ACTOR_USER_ID");

const sourceDirectory = new URL("../../astro-site/src/content/blog/", import.meta.url);
const articles = [];
for await (const filename of new Bun.Glob("*.md").scan({ cwd: sourceDirectory.pathname })) {
  const source = await Bun.file(new URL(filename, sourceDirectory)).text();
  articles.push(parseLegacyArticle(filename, source));
}
articles.sort((left, right) => left.slug.localeCompare(right.slug));
if (articles.length !== 69)
  throw new Error(`Expected 69 legacy articles, found ${articles.length}`);
if (new Set(articles.map((article) => article.slug)).size !== articles.length) {
  throw new Error("Legacy article slugs are not unique");
}

const database = createPostgresClient({ url: databaseUrl, maxConnections: 1 });
const service = new ContentStudioService(new PostgresContentStudioRepository(database));
let created = 0;
let reconciled = 0;
try {
  for (const article of articles) {
    const result = await service.createDraft({
      actorUserId,
      requestId: `legacy-import:${article.slug}`,
      content: legacyArticleToDraft(article),
    });
    if (result.status !== "published") {
      throw new Error(`Legacy article ${article.slug} was not published`);
    }
    // The repository returns the original revision on a safe rerun.
    if (result.revisionNumber === 1) reconciled += 1;
    created += 1;
  }
  console.log(JSON.stringify({ imported: created, reconciled, creditedAuthor: "ElectraSim" }));
} finally {
  await database.end();
}
