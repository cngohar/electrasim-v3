export * from "./media.ts";
export * from "./public.ts";
export * from "./service.ts";

export type ContentKind = "article" | "marketing_page";
export type ContentBody =
  | { readonly format: "markdown"; readonly markdown: string }
  | { readonly format: "blocks"; readonly document: Readonly<Record<string, unknown>> };

export interface ContentDraftInput {
  readonly kind: ContentKind;
  readonly slug: string;
  readonly locale?: string;
  readonly title: string;
  readonly description: string;
  readonly body: ContentBody;
  readonly authorDisplayName: string;
  readonly category?: string | null;
  readonly tags?: readonly string[];
  readonly featuredImage?: string | null;
  readonly seoTitle?: string | null;
  readonly canonicalUrl?: string | null;
  readonly changeSummary: string;
  readonly legacySourceKey?: string | null;
  readonly originalPublishedAt?: Date | null;
}

export interface ContentDraft extends ContentDraftInput {
  readonly slug: string;
  readonly locale: string;
  readonly tags: readonly string[];
}

export type ContentStudioErrorCode =
  | "invalid_slug"
  | "invalid_content"
  | "invalid_locale"
  | "content_slug_exists"
  | "content_permission_denied"
  | "content_not_found"
  | "content_revision_not_found"
  | "content_review_required"
  | "content_self_review_denied"
  | "content_transition_denied";

export class ContentStudioError extends Error {
  constructor(readonly code: ContentStudioErrorCode) {
    super(code);
  }
}

export function createContentDraft(input: ContentDraftInput): ContentDraft {
  const slug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new ContentStudioError("invalid_slug");
  const locale = (input.locale ?? "en").trim();
  if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(locale)) {
    throw new ContentStudioError("invalid_locale");
  }
  if (
    !input.title.trim() ||
    !input.description.trim() ||
    !input.authorDisplayName.trim() ||
    !input.changeSummary.trim() ||
    (input.body.format === "markdown" && !input.body.markdown.trim()) ||
    (input.body.format === "blocks" && Object.keys(input.body.document).length === 0)
  ) {
    throw new ContentStudioError("invalid_content");
  }
  return {
    ...input,
    slug,
    locale: locale.toLowerCase(),
    title: input.title.trim(),
    description: input.description.trim(),
    authorDisplayName: input.authorDisplayName.trim(),
    tags: [...new Set((input.tags ?? []).map((tag) => tag.trim()).filter(Boolean))],
    changeSummary: input.changeSummary.trim(),
  };
}

export interface LegacyArticle {
  readonly sourceKey: string;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly publishedAt: Date;
  readonly updatedAt: Date | null;
  readonly author: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly image: string | null;
  readonly featured: boolean;
  readonly draft: boolean;
  readonly markdown: string;
}

export function parseLegacyArticle(sourceKey: string, source: string): LegacyArticle {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new ContentStudioError("invalid_content");
  const metadata = parseSimpleFrontmatter(match[1] ?? "");
  const slug = sourceKey.replace(/\.md$/i, "");
  const publishedAt = parseDate(metadata.pubDate);
  if (!publishedAt || !metadata.title || !metadata.description) {
    throw new ContentStudioError("invalid_content");
  }
  return {
    sourceKey,
    slug,
    title: String(metadata.title),
    description: String(metadata.description),
    publishedAt,
    updatedAt: parseDate(metadata.updatedDate),
    author: String(metadata.author ?? "ElectraSim"),
    category: String(metadata.category ?? "Guide"),
    tags: Array.isArray(metadata.tags) ? metadata.tags.map(String) : [],
    image: metadata.image ? String(metadata.image) : null,
    featured: metadata.featured === true,
    draft: metadata.draft === true,
    markdown: normalizeLegacyMarkdown((match[2] ?? "").trim()),
  };
}

export function legacyArticleToDraft(article: LegacyArticle): ContentDraft {
  return createContentDraft({
    kind: "article",
    slug: article.slug,
    title: article.title,
    description: article.description,
    body: { format: "markdown", markdown: article.markdown },
    authorDisplayName: article.author,
    category: article.category,
    tags: article.tags,
    featuredImage: article.image,
    canonicalUrl: `/blog/${article.slug}/`,
    changeSummary: "Imported from the legacy owner-authored Markdown archive",
    legacySourceKey: `astro-blog:${article.sourceKey}`,
    originalPublishedAt: article.publishedAt,
  });
}

export function normalizeLegacyMarkdown(markdown: string): string {
  return markdown
    .replace(
      /<span\b(?=[^>]*class=["']em\s+[^"']+["'])(?=[^>]*aria-label=["']([^"']+)["'])[^>]*><\/span>/gi,
      (_match, label: string) => `[${label}]`,
    )
    .replace(
      /<figure[^>]*>[\s\S]*?<picture>[\s\S]*?<img\s+[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>[\s\S]*?<\/picture>\s*<figcaption>([\s\S]*?)<\/figcaption>\s*<\/figure>/gi,
      (_match, src: string, alt: string, caption: string) =>
        `![${alt}](${src})\n_${caption.replace(/<[^>]+>/g, "").trim()}_`,
    );
}

function parseSimpleFrontmatter(frontmatter: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of frontmatter.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      result[key] = value
        .slice(1, -1)
        .split(",")
        .map((entry) => unquote(entry.trim()))
        .filter(Boolean);
    } else if (value === "true" || value === "false") {
      result[key] = value === "true";
    } else {
      result[key] = unquote(value);
    }
  }
  return result;
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1).replaceAll('\\"', '"');
  }
  return value;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.valueOf()) ? null : date;
}
