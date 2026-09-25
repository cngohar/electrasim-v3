import { legacyArticleToDraft, parseLegacyArticle } from "@electrasim/content-studio";

const sourceDirectory = new URL("../../astro-site/src/content/blog/", import.meta.url);
const drafts = [];
const glob = new Bun.Glob("*.md");
for await (const filename of glob.scan({ cwd: sourceDirectory.pathname })) {
  const source = await Bun.file(new URL(filename, sourceDirectory)).text();
  drafts.push(legacyArticleToDraft(parseLegacyArticle(filename, source)));
}
drafts.sort((left, right) => left.slug.localeCompare(right.slug));

const slugs = new Set(drafts.map((draft) => draft.slug));
const sourceKeys = new Set(drafts.map((draft) => draft.legacySourceKey));
if (slugs.size !== drafts.length || sourceKeys.size !== drafts.length) {
  throw new Error("Legacy content contains duplicate slugs or source keys");
}
if (drafts.some((draft) => draft.authorDisplayName !== "ElectraSim")) {
  throw new Error("Legacy author attribution changed unexpectedly");
}

const manifest = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: "astro-site/src/content/blog",
  totals: { articles: drafts.length, staticPages: 0 },
  drafts,
};
const outputArgument = process.argv.find((argument) => argument.startsWith("--output="));
if (outputArgument) {
  const output = outputArgument.slice("--output=".length);
  await Bun.write(output, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${drafts.length} owner-attributed articles to ${output}`);
} else {
  console.log(
    JSON.stringify({
      valid: true,
      articles: drafts.length,
      creditedAuthor: "ElectraSim",
      firstSlug: drafts.at(0)?.slug,
      lastSlug: drafts.at(-1)?.slug,
    }),
  );
}
