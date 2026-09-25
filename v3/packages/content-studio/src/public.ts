import type { ContentBody, ContentKind } from "./index.ts";

export interface PublishedContentRecord {
  readonly itemId: string;
  readonly revisionId: string;
  readonly kind: ContentKind;
  readonly slug: string;
  readonly locale: string;
  readonly title: string;
  readonly description: string;
  readonly body: ContentBody;
  readonly authorDisplayName: string;
  readonly category: string | null;
  readonly tags: readonly string[];
  readonly canonicalUrl: string | null;
  readonly publishedAt: Date;
  readonly updatedAt: Date;
}

export interface PublishedContentRepository {
  getPublished(slug: string, locale: string): Promise<PublishedContentRecord | null>;
}

export interface RenderedPublishedContent extends Omit<PublishedContentRecord, "body"> {
  readonly html: string;
}

export class PublishedContentService {
  constructor(private readonly repository: PublishedContentRepository) {}

  async get(slug: string, locale = "en"): Promise<RenderedPublishedContent | null> {
    const normalizedSlug = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedSlug)) return null;
    const normalizedLocale = locale.trim().toLowerCase();
    if (!/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/.test(normalizedLocale)) return null;
    const record = await this.repository.getPublished(normalizedSlug, normalizedLocale);
    return record ? { ...record, html: renderBody(record.body) } : null;
  }
}

export function renderBody(body: ContentBody): string {
  return body.format === "markdown"
    ? renderMarkdown(body.markdown)
    : renderBlockDocument(body.document);
}

export function renderMarkdown(markdown: string): string {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const output: string[] = [];
  let paragraph: string[] = [];
  let listOpen = false;
  let codeOpen = false;
  const flushParagraph = () => {
    if (paragraph.length) output.push(`<p>${inline(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const closeList = () => {
    if (listOpen) output.push("</ul>");
    listOpen = false;
  };
  for (let index = 0; index < lines.length; index += 1) {
    const sourceLine = lines[index] ?? "";
    const line = sourceLine.trimEnd();
    if (line.startsWith("```")) {
      flushParagraph();
      closeList();
      output.push(codeOpen ? "</code></pre>" : "<pre><code>");
      codeOpen = !codeOpen;
      continue;
    }
    if (codeOpen) {
      output.push(`${escapeHtml(sourceLine)}\n`);
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const nextLine = lines[index + 1]?.trim() ?? "";
    if (line.includes("|") && /^\|?\s*:?-{3,}/.test(nextLine)) {
      flushParagraph();
      closeList();
      const headers = tableCells(line);
      index += 1;
      const rows: string[][] = [];
      while (index + 1 < lines.length && (lines[index + 1] ?? "").includes("|")) {
        index += 1;
        rows.push(tableCells(lines[index] ?? ""));
      }
      output.push(
        `<div class="content-table-scroll"><table><thead><tr>${headers.map((cell) => `<th>${inline(cell)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${inline(cell)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`,
      );
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      closeList();
      const level = heading[1]?.length ?? 2;
      output.push(`<h${level}>${inline(heading[2] ?? "")}</h${level}>`);
      continue;
    }
    const image = line.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
    if (image) {
      flushParagraph();
      closeList();
      const src = safeMediaPath(image[2] ?? "");
      if (src)
        output.push(
          `<figure><img src="${escapeAttribute(src)}" alt="${escapeAttribute(image[1] ?? "")}" loading="lazy"></figure>`,
        );
      continue;
    }
    if (line.startsWith("> ")) {
      flushParagraph();
      closeList();
      output.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushParagraph();
      if (!listOpen) {
        output.push("<ul>");
        listOpen = true;
      }
      output.push(`<li>${inline(line.replace(/^[-*]\s+/, ""))}</li>`);
      continue;
    }
    paragraph.push(line.trim());
  }
  flushParagraph();
  closeList();
  if (codeOpen) output.push("</code></pre>");
  return output.join("\n");
}

function renderBlockDocument(document: Readonly<Record<string, unknown>>): string {
  const blocks = Array.isArray(document.blocks) ? document.blocks : [];
  return blocks.slice(0, 200).map(renderBlock).join("\n");
}

function renderBlock(value: unknown): string {
  if (!isRecord(value) || typeof value.type !== "string") return "";
  switch (value.type) {
    case "hero":
      return `<header class="content-hero"><h1>${escapeHtml(text(value.heading))}</h1><p>${escapeHtml(text(value.summary))}</p></header>`;
    case "rich_text":
      return renderMarkdown(text(value.markdown));
    case "safety_notice":
      return `<aside class="safety-notice" role="note"><strong>Safety</strong><p>${escapeHtml(text(value.text))}</p></aside>`;
    case "image": {
      const mediaId = text(value.mediaId);
      const src = safeMediaPath(mediaId ? `/api/public/media/${mediaId}` : text(value.src));
      return src
        ? `<figure><img src="${escapeAttribute(src)}" alt="${escapeAttribute(text(value.alt))}" loading="lazy"><figcaption>${escapeHtml(text(value.caption))}</figcaption></figure>`
        : "";
    }
    case "cta": {
      const href = safeHref(text(value.href));
      return `<section class="content-cta"><h2>${escapeHtml(text(value.heading))}</h2><p>${escapeHtml(text(value.body))}</p>${href ? `<a href="${escapeAttribute(href)}">${escapeHtml(text(value.label))}</a>` : ""}</section>`;
    }
    case "faq": {
      const items = Array.isArray(value.items) ? value.items.slice(0, 30) : [];
      return `<section class="content-faq">${items.map((item) => (isRecord(item) ? `<details><summary>${escapeHtml(text(item.question))}</summary><p>${escapeHtml(text(item.answer))}</p></details>` : "")).join("")}</section>`;
    }
    default:
      return "";
  }
}

function tableCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function inline(value: string): string {
  let result = escapeHtml(value);
  result = result.replace(/`([^`]+)`/g, "<code>$1</code>");
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label: string, href: string) => {
    const safe = safeHref(href);
    return safe ? `<a href="${escapeAttribute(safe)}">${label}</a>` : label;
  });
  return result;
}

function safeHref(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.startsWith("/") || /^https:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)
    ? trimmed
    : null;
}
function safeMediaPath(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.startsWith("/api/public/media/") ||
    trimmed.startsWith("/images/") ||
    /^https:\/\//i.test(trimmed)
    ? trimmed
    : null;
}
function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ??
      character,
  );
}
function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("`", "&#96;");
}
