import {
  type ContentDraft,
  type ContentDraftInput,
  ContentStudioError,
  createContentDraft,
} from "./index.ts";

export interface ContentRevisionInput {
  readonly locale?: string;
  readonly title: string;
  readonly description: string;
  readonly body: ContentDraftInput["body"];
  readonly authorDisplayName: string;
  readonly category?: string | null;
  readonly tags?: readonly string[];
  readonly featuredImage?: string | null;
  readonly seoTitle?: string | null;
  readonly canonicalUrl?: string | null;
  readonly changeSummary: string;
}

export interface ContentSummary {
  readonly itemId: string;
  readonly kind: "article" | "marketing_page";
  readonly slug: string;
  readonly status: "draft" | "in_review" | "scheduled" | "published" | "archived";
  readonly title: string;
  readonly locale: string;
  readonly latestRevisionNumber: number;
  readonly updatedAt: Date;
}

export interface ContentRevisionDetail {
  readonly itemId: string;
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly locale: string;
  readonly title: string;
  readonly description: string;
  readonly body: ContentDraftInput["body"];
  readonly authorDisplayName: string;
  readonly category: string | null;
  readonly tags: readonly string[];
  readonly featuredImage: string | null;
  readonly seoTitle: string | null;
  readonly canonicalUrl: string | null;
  readonly changeSummary: string;
  readonly safetyReviewStatus: "not_required" | "required" | "approved" | "rejected";
  readonly createdByUserId: string;
  readonly reviewedByUserId: string | null;
  readonly reviewedAt: Date | null;
  readonly createdAt: Date;
}

export interface ContentRevisionSummary {
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly title: string;
  readonly locale: string;
  readonly authorDisplayName: string;
  readonly changeSummary: string;
  readonly safetyReviewStatus: ContentRevisionDetail["safetyReviewStatus"];
  readonly createdByUserId: string;
  readonly createdAt: Date;
}

export interface ContentDetail extends ContentSummary {
  readonly revisionId: string;
  readonly description: string;
  readonly body: ContentDraftInput["body"];
  readonly authorDisplayName: string;
  readonly category: string | null;
  readonly tags: readonly string[];
  readonly safetyReviewStatus: "not_required" | "required" | "approved" | "rejected";
  readonly currentPublishedRevisionId: string | null;
}

export interface StoreContentDraftInput {
  readonly itemId: string;
  readonly revisionId: string;
  readonly proposedAuthorId: string;
  readonly auditId: string;
  readonly outboxId: string;
  readonly actorUserId: string;
  readonly requestId: string;
  readonly draft: ContentDraft;
}

export interface StoreContentRevisionInput {
  readonly itemId: string;
  readonly revisionId: string;
  readonly proposedAuthorId: string;
  readonly auditId: string;
  readonly outboxId: string;
  readonly actorUserId: string;
  readonly requestId: string;
  readonly revision: ContentRevisionInput;
}

export interface StoredContentDraft {
  readonly itemId: string;
  readonly revisionId: string;
  readonly revisionNumber: number;
  readonly status: ContentSummary["status"];
}

export interface ContentStudioRepository {
  createDraft(input: StoreContentDraftInput): Promise<StoredContentDraft>;
  list(input: {
    readonly actorUserId: string;
    readonly limit: number;
  }): Promise<readonly ContentSummary[]>;
  get(input: { readonly actorUserId: string; readonly itemId: string }): Promise<ContentDetail>;
  listRevisions(input: {
    readonly actorUserId: string;
    readonly itemId: string;
  }): Promise<readonly ContentRevisionSummary[]>;
  getRevision(input: {
    readonly actorUserId: string;
    readonly itemId: string;
    readonly revisionId: string;
  }): Promise<ContentRevisionDetail>;
  createRevision(input: StoreContentRevisionInput): Promise<StoredContentDraft>;
  review(input: {
    readonly itemId: string;
    readonly revisionId: string;
    readonly approved: boolean;
    readonly reason: string;
    readonly actorUserId: string;
    readonly requestId: string;
    readonly auditId: string;
    readonly outboxId: string;
  }): Promise<{ readonly status: "approved" | "rejected" }>;
  publish(input: {
    readonly itemId: string;
    readonly revisionId: string;
    readonly reason: string;
    readonly scheduledFor: Date | null;
    readonly actorUserId: string;
    readonly requestId: string;
    readonly publicationId: string;
    readonly auditId: string;
    readonly outboxId: string;
  }): Promise<{ readonly status: "published" | "scheduled"; readonly publishedAt: Date | null }>;
  transition(input: {
    readonly itemId: string;
    readonly action: "archive" | "restore" | "unpublish" | "cancel_schedule";
    readonly reason: string;
    readonly actorUserId: string;
    readonly requestId: string;
    readonly publicationId: string;
    readonly auditId: string;
    readonly outboxId: string;
  }): Promise<{ readonly status: ContentSummary["status"] }>;
  createRedirect(input: {
    readonly itemId: string;
    readonly sourcePath: string;
    readonly destinationPath: string;
    readonly reason: string;
    readonly actorUserId: string;
    readonly requestId: string;
    readonly auditId: string;
    readonly outboxId: string;
  }): Promise<{ readonly sourcePath: string; readonly destinationPath: string }>;
}

export class ContentStudioService {
  constructor(
    private readonly repository: ContentStudioRepository,
    private readonly nextId: () => string = () => crypto.randomUUID(),
  ) {}

  createDraft(input: {
    readonly actorUserId: string;
    readonly requestId: string;
    readonly content: ContentDraftInput;
  }): Promise<StoredContentDraft> {
    const draft = createContentDraft(input.content);
    return this.repository.createDraft({
      itemId: this.nextId(),
      revisionId: this.nextId(),
      proposedAuthorId: this.nextId(),
      auditId: this.nextId(),
      outboxId: this.nextId(),
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      draft,
    });
  }

  list(actorUserId: string, limit = 50): Promise<readonly ContentSummary[]> {
    return this.repository.list({ actorUserId, limit: Math.max(1, Math.min(100, limit)) });
  }

  get(actorUserId: string, itemId: string): Promise<ContentDetail> {
    return this.repository.get({ actorUserId, itemId });
  }

  listRevisions(actorUserId: string, itemId: string): Promise<readonly ContentRevisionSummary[]> {
    return this.repository.listRevisions({ actorUserId, itemId });
  }

  getRevision(
    actorUserId: string,
    itemId: string,
    revisionId: string,
  ): Promise<ContentRevisionDetail> {
    return this.repository.getRevision({ actorUserId, itemId, revisionId });
  }

  createRevision(input: {
    readonly itemId: string;
    readonly actorUserId: string;
    readonly requestId: string;
    readonly revision: ContentRevisionInput;
  }): Promise<StoredContentDraft> {
    const validated = validateRevision(input.revision);
    return this.repository.createRevision({
      itemId: input.itemId,
      revisionId: this.nextId(),
      proposedAuthorId: this.nextId(),
      auditId: this.nextId(),
      outboxId: this.nextId(),
      actorUserId: input.actorUserId,
      requestId: input.requestId,
      revision: validated,
    });
  }

  review(input: {
    readonly itemId: string;
    readonly revisionId: string;
    readonly approved: boolean;
    readonly reason: string;
    readonly actorUserId: string;
    readonly requestId: string;
  }) {
    return this.repository.review({
      ...input,
      reason: requiredReason(input.reason),
      auditId: this.nextId(),
      outboxId: this.nextId(),
    });
  }

  publish(input: {
    readonly itemId: string;
    readonly revisionId: string;
    readonly reason: string;
    readonly scheduledFor?: Date | null;
    readonly actorUserId: string;
    readonly requestId: string;
  }) {
    return this.repository.publish({
      ...input,
      reason: requiredReason(input.reason),
      scheduledFor: input.scheduledFor ?? null,
      publicationId: this.nextId(),
      auditId: this.nextId(),
      outboxId: this.nextId(),
    });
  }

  transition(input: {
    readonly itemId: string;
    readonly action: "archive" | "restore" | "unpublish" | "cancel_schedule";
    readonly reason: string;
    readonly actorUserId: string;
    readonly requestId: string;
  }) {
    return this.repository.transition({
      ...input,
      reason: requiredReason(input.reason),
      publicationId: this.nextId(),
      auditId: this.nextId(),
      outboxId: this.nextId(),
    });
  }

  createRedirect(input: {
    readonly itemId: string;
    readonly sourcePath: string;
    readonly destinationPath: string;
    readonly reason: string;
    readonly actorUserId: string;
    readonly requestId: string;
  }) {
    const sourcePath = internalPath(input.sourcePath);
    const destinationPath = internalPath(input.destinationPath);
    if (sourcePath === destinationPath) throw new ContentStudioError("invalid_content");
    return this.repository.createRedirect({
      ...input,
      sourcePath,
      destinationPath,
      reason: requiredReason(input.reason),
      auditId: this.nextId(),
      outboxId: this.nextId(),
    });
  }
}

function internalPath(value: string): string {
  const path = value.trim();
  if (!/^\/[a-z0-9/_-]*$/i.test(path) || path.includes("//") || path.includes("..")) {
    throw new ContentStudioError("invalid_content");
  }
  return path;
}

function validateRevision(input: ContentRevisionInput): ContentRevisionInput {
  const draft = createContentDraft({
    kind: "article",
    slug: "revision",
    ...input,
  });
  return {
    locale: draft.locale,
    title: draft.title,
    description: draft.description,
    body: draft.body,
    authorDisplayName: draft.authorDisplayName,
    tags: draft.tags,
    changeSummary: draft.changeSummary,
    ...(draft.category !== undefined ? { category: draft.category } : {}),
    ...(draft.featuredImage !== undefined ? { featuredImage: draft.featuredImage } : {}),
    ...(draft.seoTitle !== undefined ? { seoTitle: draft.seoTitle } : {}),
    ...(draft.canonicalUrl !== undefined ? { canonicalUrl: draft.canonicalUrl } : {}),
  };
}

function requiredReason(reason: string): string {
  const normalized = reason.trim();
  if (!normalized || normalized.length > 500) throw new ContentStudioError("invalid_content");
  return normalized;
}
