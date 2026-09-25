import {
  type ContentDetail,
  type ContentMediaRepository,
  type ContentRevisionDetail,
  type ContentRevisionSummary,
  ContentStudioError,
  type ContentStudioRepository,
  type ContentSummary,
  collectContentMediaIds,
  type PublishedContentRecord,
  type PublishedContentRepository,
  type PublishedMediaRepository,
  type StoreContentDraftInput,
  type StoreContentRevisionInput,
  type StoredContentDraft,
} from "@electrasim/content-studio";
import type { Database, DatabaseTransaction } from "./index.ts";

export class PostgresContentStudioRepository implements ContentStudioRepository {
  constructor(private readonly database: Database) {}

  async createDraft(input: StoreContentDraftInput): Promise<StoredContentDraft> {
    return this.inTransaction(
      input.actorUserId,
      input.requestId,
      "platform.content.edit",
      async (tx) => {
        await tx`select pg_advisory_xact_lock(hashtextextended(${`content:${input.draft.slug}`}, 0))`;
        const [existing] = await tx<
          {
            id: string;
            legacy_source_key: string | null;
            revision_id: string;
            revision_number: number;
            status: ContentSummary["status"];
          }[]
        >`
          select items.id, items.legacy_source_key, items.status, revisions.id as revision_id,
            revisions.revision_number
          from content_items items
          join lateral (
            select id, revision_number from content_revisions
            where content_item_id = items.id order by revision_number asc limit 1
          ) revisions on true
          where items.slug = ${input.draft.slug} limit 1
        `;
        if (existing) {
          if (
            input.draft.legacySourceKey &&
            existing.legacy_source_key === input.draft.legacySourceKey
          ) {
            return {
              itemId: existing.id,
              revisionId: existing.revision_id,
              revisionNumber: existing.revision_number,
              status: existing.status,
            };
          }
          throw new ContentStudioError("content_slug_exists");
        }
        const authorId = await resolveAuthor(tx, {
          proposedAuthorId: input.proposedAuthorId,
          displayName: input.draft.authorDisplayName,
          legacy: Boolean(input.draft.legacySourceKey),
        });
        await tx`
        insert into content_items (
          id, kind, slug, source_locale, status, legacy_source_key,
          original_published_at, created_by_user_id
        ) values (
          ${input.itemId}::uuid, ${input.draft.kind}, ${input.draft.slug},
          ${input.draft.locale}, 'draft', ${input.draft.legacySourceKey ?? null},
          ${input.draft.originalPublishedAt?.toISOString() ?? null}::timestamptz,
          ${input.actorUserId}::uuid
        )
      `;
        await insertRevision(tx, {
          id: input.revisionId,
          itemId: input.itemId,
          number: 1,
          actorUserId: input.actorUserId,
          authorId,
          revision: input.draft,
        });
        const legacyPublishedAt = input.draft.legacySourceKey
          ? (input.draft.originalPublishedAt ?? null)
          : null;
        if (legacyPublishedAt) {
          const [publishAccess] = await tx<{ allowed: boolean }[]>`
            select app_private.has_platform_permission('platform.content.publish') as allowed
          `;
          if (!publishAccess?.allowed) throw new ContentStudioError("content_permission_denied");
          await tx`
            update content_items set status = 'published',
              current_published_revision_id = ${input.revisionId}::uuid,
              updated_at = ${legacyPublishedAt.toISOString()}::timestamptz
            where id = ${input.itemId}::uuid
          `;
          await tx`
            insert into content_publication_events (
              id, content_item_id, revision_id, action, actor_user_id, reason, occurred_at
            ) values (
              gen_random_uuid(), ${input.itemId}::uuid, ${input.revisionId}::uuid, 'published',
              ${input.actorUserId}::uuid, 'Verified legacy owner-authored import',
              ${legacyPublishedAt.toISOString()}::timestamptz
            )
          `;
        }
        await writeEvents(tx, {
          auditId: input.auditId,
          outboxId: input.outboxId,
          actorUserId: input.actorUserId,
          requestId: input.requestId,
          action: legacyPublishedAt ? "content.legacy.imported" : "content.draft.created",
          itemId: input.itemId,
          revisionId: input.revisionId,
        });
        return {
          itemId: input.itemId,
          revisionId: input.revisionId,
          revisionNumber: 1,
          status: legacyPublishedAt ? "published" : "draft",
        };
      },
    );
  }

  async list(input: { actorUserId: string; limit: number }): Promise<readonly ContentSummary[]> {
    return this.inTransaction(
      input.actorUserId,
      "content-list",
      "platform.content.read",
      async (tx) => {
        const rows = await tx<SummaryRow[]>`
        select items.id, items.kind, items.slug, items.status, items.updated_at,
          latest.title, latest.locale, latest.revision_number
        from content_items items
        join lateral (
          select title, locale, revision_number from content_revisions
          where content_item_id = items.id order by revision_number desc limit 1
        ) latest on true
        order by items.updated_at desc, items.id desc
        limit ${input.limit}
      `;
        return rows.map(toSummary);
      },
    );
  }

  async get(input: { actorUserId: string; itemId: string }): Promise<ContentDetail> {
    return this.inTransaction(
      input.actorUserId,
      "content-get",
      "platform.content.read",
      async (tx) => {
        const [row] = await tx<DetailRow[]>`
        select items.id, items.kind, items.slug, items.status, items.updated_at,
          items.current_published_revision_id, revisions.id as revision_id,
          revisions.revision_number, revisions.locale, revisions.title, revisions.description,
          revisions.body_format, revisions.body_markdown, revisions.body_document,
          revisions.category, revisions.tags, revisions.safety_review_status,
          authors.display_name as author_display_name
        from content_items items
        join lateral (
          select * from content_revisions where content_item_id = items.id
          order by revision_number desc limit 1
        ) revisions on true
        join content_authors authors on authors.id = revisions.author_id
        where items.id = ${input.itemId}::uuid
      `;
        if (!row) throw new ContentStudioError("content_not_found");
        return toDetail(row);
      },
    );
  }

  async listRevisions(input: {
    actorUserId: string;
    itemId: string;
  }): Promise<readonly ContentRevisionSummary[]> {
    return this.inTransaction(
      input.actorUserId,
      "content-revisions-list",
      "platform.content.read",
      async (tx) => {
        const rows = await tx<RevisionSummaryRow[]>`
          select revisions.id, revisions.revision_number, revisions.title, revisions.locale,
            authors.display_name as author_display_name, revisions.change_summary,
            revisions.safety_review_status, revisions.created_by_user_id, revisions.created_at
          from content_revisions revisions
          join content_authors authors on authors.id = revisions.author_id
          where revisions.content_item_id = ${input.itemId}::uuid
          order by revisions.revision_number desc
        `;
        if (rows.length === 0) throw new ContentStudioError("content_not_found");
        return rows.map((row) => ({
          revisionId: row.id,
          revisionNumber: row.revision_number,
          title: row.title,
          locale: row.locale,
          authorDisplayName: row.author_display_name,
          changeSummary: row.change_summary,
          safetyReviewStatus: row.safety_review_status,
          createdByUserId: row.created_by_user_id,
          createdAt: row.created_at,
        }));
      },
    );
  }

  async getRevision(input: {
    actorUserId: string;
    itemId: string;
    revisionId: string;
  }): Promise<ContentRevisionDetail> {
    return this.inTransaction(
      input.actorUserId,
      "content-revision-get",
      "platform.content.read",
      async (tx) => {
        const [row] = await tx<RevisionDetailRow[]>`
          select revisions.*, authors.display_name as author_display_name
          from content_revisions revisions
          join content_authors authors on authors.id = revisions.author_id
          where revisions.id = ${input.revisionId}::uuid
            and revisions.content_item_id = ${input.itemId}::uuid
        `;
        if (!row) throw new ContentStudioError("content_revision_not_found");
        return toRevisionDetail(row);
      },
    );
  }

  async createRevision(input: StoreContentRevisionInput): Promise<StoredContentDraft> {
    return this.inTransaction(
      input.actorUserId,
      input.requestId,
      "platform.content.edit",
      async (tx) => {
        await lockItem(tx, input.itemId);
        const [item] = await tx<{ id: string; revision_number: number }[]>`
        select items.id, coalesce(max(revisions.revision_number), 0)::int as revision_number
        from content_items items left join content_revisions revisions on revisions.content_item_id = items.id
        where items.id = ${input.itemId}::uuid group by items.id
      `;
        if (!item) throw new ContentStudioError("content_not_found");
        const authorId = await resolveAuthor(tx, {
          proposedAuthorId: input.proposedAuthorId,
          displayName: input.revision.authorDisplayName,
          legacy: false,
        });
        const revisionNumber = item.revision_number + 1;
        await insertRevision(tx, {
          id: input.revisionId,
          itemId: input.itemId,
          number: revisionNumber,
          actorUserId: input.actorUserId,
          authorId,
          revision: input.revision,
        });
        await tx`update content_items set status = 'draft', updated_at = now() where id = ${input.itemId}::uuid`;
        await writeEvents(tx, {
          auditId: input.auditId,
          outboxId: input.outboxId,
          actorUserId: input.actorUserId,
          requestId: input.requestId,
          action: "content.revision.created",
          itemId: input.itemId,
          revisionId: input.revisionId,
        });
        return {
          itemId: input.itemId,
          revisionId: input.revisionId,
          revisionNumber,
          status: "draft",
        };
      },
    );
  }

  async review(input: Parameters<ContentStudioRepository["review"]>[0]) {
    return this.inTransaction(
      input.actorUserId,
      input.requestId,
      "platform.content.publish",
      async (tx) => {
        await lockItem(tx, input.itemId);
        const [revision] = await tx<{ created_by_user_id: string }[]>`
        select created_by_user_id from content_revisions
        where id = ${input.revisionId}::uuid and content_item_id = ${input.itemId}::uuid
      `;
        if (!revision) throw new ContentStudioError("content_revision_not_found");
        if (revision.created_by_user_id === input.actorUserId) {
          throw new ContentStudioError("content_self_review_denied");
        }
        const status: "approved" | "rejected" = input.approved ? "approved" : "rejected";
        await tx`
        update content_revisions set safety_review_status = ${status},
          reviewed_by_user_id = ${input.actorUserId}::uuid, reviewed_at = now()
        where id = ${input.revisionId}::uuid
      `;
        await tx`
        update content_items set status = ${input.approved ? "in_review" : "draft"}, updated_at = now()
        where id = ${input.itemId}::uuid
      `;
        await writeEvents(tx, {
          auditId: input.auditId,
          outboxId: input.outboxId,
          actorUserId: input.actorUserId,
          requestId: input.requestId,
          action: input.approved ? "content.review.approved" : "content.review.rejected",
          itemId: input.itemId,
          revisionId: input.revisionId,
          reason: input.reason,
        });
        return { status };
      },
    );
  }

  async publish(input: Parameters<ContentStudioRepository["publish"]>[0]) {
    return this.inTransaction(
      input.actorUserId,
      input.requestId,
      "platform.content.publish",
      async (tx) => {
        await lockItem(tx, input.itemId);
        const [revision] = await tx<{ safety_review_status: string }[]>`
        select safety_review_status from content_revisions
        where id = ${input.revisionId}::uuid and content_item_id = ${input.itemId}::uuid
      `;
        if (!revision) throw new ContentStudioError("content_revision_not_found");
        if (
          revision.safety_review_status === "required" ||
          revision.safety_review_status === "rejected"
        ) {
          throw new ContentStudioError("content_review_required");
        }
        const now = new Date();
        const scheduled = input.scheduledFor && input.scheduledFor.getTime() > now.getTime();
        const status: "scheduled" | "published" = scheduled ? "scheduled" : "published";
        await tx`
        update content_items set status = ${status}, current_published_revision_id = ${input.revisionId}::uuid,
          scheduled_for = ${scheduled ? input.scheduledFor?.toISOString() : null}::timestamptz,
          original_published_at = coalesce(original_published_at, ${scheduled ? null : now.toISOString()}::timestamptz),
          updated_at = now() where id = ${input.itemId}::uuid
      `;
        await tx`
        insert into content_publication_events (
          id, content_item_id, revision_id, action, actor_user_id, reason
        ) values (
          ${input.publicationId}::uuid, ${input.itemId}::uuid, ${input.revisionId}::uuid,
          'published', ${input.actorUserId}::uuid, ${input.reason}
        )
      `;
        await writeEvents(tx, {
          auditId: input.auditId,
          outboxId: input.outboxId,
          actorUserId: input.actorUserId,
          requestId: input.requestId,
          action: scheduled ? "content.publication.scheduled" : "content.published",
          itemId: input.itemId,
          revisionId: input.revisionId,
          reason: input.reason,
        });
        return { status, publishedAt: scheduled ? null : now };
      },
    );
  }

  async transition(input: Parameters<ContentStudioRepository["transition"]>[0]) {
    return this.inTransaction(
      input.actorUserId,
      input.requestId,
      "platform.content.publish",
      async (tx) => {
        await lockItem(tx, input.itemId);
        const [item] = await tx<
          { status: ContentSummary["status"]; current_published_revision_id: string | null }[]
        >`
          select status, current_published_revision_id from content_items
          where id = ${input.itemId}::uuid
        `;
        if (!item) throw new ContentStudioError("content_not_found");
        const allowed =
          (input.action === "archive" && item.status !== "archived") ||
          (input.action === "restore" && item.status === "archived") ||
          (input.action === "unpublish" && item.status === "published") ||
          (input.action === "cancel_schedule" && item.status === "scheduled");
        if (!allowed) throw new ContentStudioError("content_transition_denied");
        const status: ContentSummary["status"] =
          input.action === "archive"
            ? "archived"
            : input.action === "restore" && item.current_published_revision_id
              ? "published"
              : "draft";
        const clearPublished = input.action === "unpublish" || input.action === "cancel_schedule";
        await tx`
          update content_items set status = ${status}, scheduled_for = null,
            current_published_revision_id = case when ${clearPublished} then null else current_published_revision_id end,
            updated_at = now() where id = ${input.itemId}::uuid
        `;
        if (item.current_published_revision_id && input.action !== "cancel_schedule") {
          const eventAction =
            input.action === "archive"
              ? "archived"
              : input.action === "restore"
                ? "restored"
                : "unpublished";
          await tx`
            insert into content_publication_events (
              id, content_item_id, revision_id, action, actor_user_id, reason
            ) values (
              ${input.publicationId}::uuid, ${input.itemId}::uuid,
              ${item.current_published_revision_id}::uuid, ${eventAction},
              ${input.actorUserId}::uuid, ${input.reason}
            )
          `;
        }
        await writeEvents(tx, {
          auditId: input.auditId,
          outboxId: input.outboxId,
          actorUserId: input.actorUserId,
          requestId: input.requestId,
          action: `content.${input.action}`,
          itemId: input.itemId,
          ...(item.current_published_revision_id
            ? { revisionId: item.current_published_revision_id }
            : {}),
          reason: input.reason,
        });
        return { status };
      },
    );
  }

  async createRedirect(input: Parameters<ContentStudioRepository["createRedirect"]>[0]) {
    return this.inTransaction(
      input.actorUserId,
      input.requestId,
      "platform.content.publish",
      async (tx) => {
        await lockItem(tx, input.itemId);
        const [item] = await tx<{ id: string }[]>`
          select id from content_items where id = ${input.itemId}::uuid
        `;
        if (!item) throw new ContentStudioError("content_not_found");
        await tx`
          insert into content_redirects (
            source_path, content_item_id, destination_path, created_by_user_id
          ) values (
            ${input.sourcePath}, ${input.itemId}::uuid, ${input.destinationPath},
            ${input.actorUserId}::uuid
          ) on conflict (source_path) do update set
            content_item_id = excluded.content_item_id,
            destination_path = excluded.destination_path,
            created_by_user_id = excluded.created_by_user_id,
            created_at = now()
        `;
        await writeEvents(tx, {
          auditId: input.auditId,
          outboxId: input.outboxId,
          actorUserId: input.actorUserId,
          requestId: input.requestId,
          action: "content.redirect.updated",
          itemId: input.itemId,
          reason: input.reason,
        });
        return { sourcePath: input.sourcePath, destinationPath: input.destinationPath };
      },
    );
  }

  private async inTransaction<T>(
    actorUserId: string,
    requestId: string,
    permission: string,
    operation: (transaction: DatabaseTransaction) => Promise<T>,
  ): Promise<T> {
    const result = await this.database.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${actorUserId}, true)`;
      await tx`select set_config('app.request_id', ${requestId}, true)`;
      const [access] = await tx<{ allowed: boolean }[]>`
        select app_private.has_platform_permission(${permission}) as allowed
      `;
      if (!access?.allowed) throw new ContentStudioError("content_permission_denied");
      return { value: await operation(tx) };
    });
    return result.value;
  }
}

export class PostgresContentMediaRepository implements ContentMediaRepository {
  constructor(private readonly database: Database) {}

  async get(input: Parameters<ContentMediaRepository["get"]>[0]) {
    const result = await this.database.begin(async (transaction) => {
      await transaction`select set_config('app.current_user_id', ${input.actorUserId}, true)`;
      const [access] = await transaction<{ allowed: boolean }[]>`
        select app_private.has_platform_permission('platform.content.read') as allowed
      `;
      if (!access?.allowed) throw new ContentStudioError("content_permission_denied");
      const [media] = await transaction<
        {
          object_key: string;
          content_type: string;
          alt_text: string;
        }[]
      >`
        select object_key, content_type, alt_text from content_media where id = ${input.id}::uuid
      `;
      return {
        value: media
          ? {
              objectKey: media.object_key,
              contentType: media.content_type,
              altText: media.alt_text,
            }
          : null,
      };
    });
    return result.value;
  }

  async record(input: Parameters<ContentMediaRepository["record"]>[0]): Promise<void> {
    const result = await this.database.begin(async (transaction) => {
      await transaction`select set_config('app.current_user_id', ${input.actorUserId}, true)`;
      await transaction`select set_config('app.request_id', ${input.requestId}, true)`;
      const [access] = await transaction<{ allowed: boolean }[]>`
        select app_private.has_platform_permission('platform.content.edit') as allowed
      `;
      if (!access?.allowed) throw new ContentStudioError("content_permission_denied");
      await transaction`
        insert into content_media (
          id, object_key, original_filename, content_type, byte_size, sha256,
          width, height, alt_text, uploaded_by_user_id
        ) values (
          ${input.id}::uuid, ${input.objectKey}, ${input.originalFilename}, ${input.contentType},
          ${input.byteSize}, ${input.sha256}, ${input.width}, ${input.height}, ${input.altText},
          ${input.actorUserId}::uuid
        )
      `;
      return { value: undefined };
    });
    return result.value;
  }
}

export class PostgresScheduledContentPublisher {
  constructor(private readonly database: Database) {}

  async releaseDue(batchSize = 25): Promise<number> {
    const [result] = await this.database<{ released: number }[]>`
      select app_private.release_due_content(${batchSize}) as released
    `;
    return result?.released ?? 0;
  }
}

export class PostgresPublishedMediaRepository implements PublishedMediaRepository {
  constructor(private readonly database: Database) {}

  async getPublished(id: string) {
    const [row] = await this.database<
      {
        object_key: string;
        content_type: string;
        byte_size: number;
        sha256: string;
      }[]
    >`
      select * from app_private.get_published_media(${id}::uuid)
    `;
    return row
      ? {
          objectKey: row.object_key,
          contentType: row.content_type,
          byteSize: row.byte_size,
          sha256: row.sha256,
        }
      : null;
  }
}

export class PostgresPublishedContentRepository implements PublishedContentRepository {
  constructor(private readonly database: Database) {}

  async getPublished(slug: string, locale: string): Promise<PublishedContentRecord | null> {
    const [row] = await this.database<PublishedRow[]>`
      select * from app_private.get_published_content(${slug}, ${locale})
    `;
    if (!row) return null;
    return {
      itemId: row.item_id,
      revisionId: row.revision_id,
      kind: row.kind,
      slug: row.slug,
      locale: row.locale,
      title: row.title,
      description: row.description,
      body:
        row.body_format === "markdown"
          ? { format: "markdown", markdown: row.body_markdown ?? "" }
          : { format: "blocks", document: row.body_document ?? {} },
      authorDisplayName: row.author_display_name,
      category: row.category,
      tags: row.tags,
      canonicalUrl: row.canonical_url,
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
    };
  }
}

type PublishedRow = {
  item_id: string;
  revision_id: string;
  kind: PublishedContentRecord["kind"];
  slug: string;
  locale: string;
  title: string;
  description: string;
  body_format: "markdown" | "blocks";
  body_markdown: string | null;
  body_document: Record<string, unknown> | null;
  author_display_name: string;
  category: string | null;
  tags: string[];
  canonical_url: string | null;
  published_at: Date;
  updated_at: Date;
};

type SummaryRow = {
  id: string;
  kind: ContentSummary["kind"];
  slug: string;
  status: ContentSummary["status"];
  updated_at: Date;
  title: string;
  locale: string;
  revision_number: number;
};
type RevisionSummaryRow = {
  id: string;
  revision_number: number;
  title: string;
  locale: string;
  author_display_name: string;
  change_summary: string;
  safety_review_status: ContentRevisionDetail["safetyReviewStatus"];
  created_by_user_id: string;
  created_at: Date;
};
type RevisionDetailRow = RevisionSummaryRow & {
  content_item_id: string;
  description: string;
  body_format: "markdown" | "blocks";
  body_markdown: string | null;
  body_document: Record<string, unknown> | null;
  category: string | null;
  tags: string[];
  featured_image_object_key: string | null;
  seo_title: string | null;
  canonical_url: string | null;
  reviewed_by_user_id: string | null;
  reviewed_at: Date | null;
};
type DetailRow = SummaryRow & {
  current_published_revision_id: string | null;
  revision_id: string;
  description: string;
  body_format: "markdown" | "blocks";
  body_markdown: string | null;
  body_document: Record<string, unknown> | null;
  category: string | null;
  tags: string[];
  safety_review_status: ContentDetail["safetyReviewStatus"];
  author_display_name: string;
};

function toRevisionDetail(row: RevisionDetailRow): ContentRevisionDetail {
  return {
    itemId: row.content_item_id,
    revisionId: row.id,
    revisionNumber: row.revision_number,
    locale: row.locale,
    title: row.title,
    description: row.description,
    body:
      row.body_format === "markdown"
        ? { format: "markdown", markdown: row.body_markdown ?? "" }
        : { format: "blocks", document: row.body_document ?? {} },
    authorDisplayName: row.author_display_name,
    category: row.category,
    tags: row.tags,
    featuredImage: row.featured_image_object_key,
    seoTitle: row.seo_title,
    canonicalUrl: row.canonical_url,
    changeSummary: row.change_summary,
    safetyReviewStatus: row.safety_review_status,
    createdByUserId: row.created_by_user_id,
    reviewedByUserId: row.reviewed_by_user_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
  };
}

function toSummary(row: SummaryRow): ContentSummary {
  return {
    itemId: row.id,
    kind: row.kind,
    slug: row.slug,
    status: row.status,
    title: row.title,
    locale: row.locale,
    latestRevisionNumber: row.revision_number,
    updatedAt: row.updated_at,
  };
}
function toDetail(row: DetailRow): ContentDetail {
  return {
    ...toSummary(row),
    revisionId: row.revision_id,
    description: row.description,
    body:
      row.body_format === "markdown"
        ? { format: "markdown", markdown: row.body_markdown ?? "" }
        : { format: "blocks", document: row.body_document ?? {} },
    authorDisplayName: row.author_display_name,
    category: row.category,
    tags: row.tags,
    safetyReviewStatus: row.safety_review_status,
    currentPublishedRevisionId: row.current_published_revision_id,
  };
}

async function lockItem(tx: DatabaseTransaction, itemId: string) {
  await tx`select pg_advisory_xact_lock(hashtextextended(${`content-item:${itemId}`}, 0))`;
}

async function resolveAuthor(
  tx: DatabaseTransaction,
  input: { proposedAuthorId: string; displayName: string; legacy: boolean },
): Promise<string> {
  await tx`select pg_advisory_xact_lock(hashtextextended(${`content-author:${input.displayName.toLowerCase()}`}, 0))`;
  const [author] = await tx<{ id: string }[]>`
    select id from content_authors where lower(display_name) = lower(${input.displayName}) order by created_at asc limit 1
  `;
  if (author) return author.id;
  await tx`
    insert into content_authors (id, display_name, legacy_source_key)
    values (${input.proposedAuthorId}::uuid, ${input.displayName}, ${input.legacy ? `legacy-author:${input.displayName.toLowerCase()}` : null})
  `;
  return input.proposedAuthorId;
}

async function insertRevision(
  tx: DatabaseTransaction,
  input: {
    id: string;
    itemId: string;
    number: number;
    actorUserId: string;
    authorId: string;
    revision: ContentRevisionInputLike;
  },
) {
  const markdown = input.revision.body.format === "markdown" ? input.revision.body.markdown : null;
  const document =
    input.revision.body.format === "blocks" ? JSON.stringify(input.revision.body.document) : null;
  await tx`
    insert into content_revisions (
      id, content_item_id, revision_number, locale, title, description, body_format,
      body_markdown, body_document, author_id, category, tags, featured_image_object_key,
      seo_title, canonical_url, change_summary, safety_review_status, created_by_user_id
    ) values (
      ${input.id}::uuid, ${input.itemId}::uuid, ${input.number}, ${input.revision.locale ?? "en"},
      ${input.revision.title}, ${input.revision.description}, ${input.revision.body.format}, ${markdown},
      ${document}::jsonb, ${input.authorId}::uuid, ${input.revision.category ?? null},
      ${JSON.stringify(input.revision.tags ?? [])}::jsonb, ${input.revision.featuredImage ?? null},
      ${input.revision.seoTitle ?? null}, ${input.revision.canonicalUrl ?? null},
      ${input.revision.changeSummary}, ${requiresSafetyReview(input.revision.category) ? "required" : "not_required"},
      ${input.actorUserId}::uuid
    )
  `;
  const mediaIds = collectContentMediaIds(input.revision.body);
  if (mediaIds.length > 0) {
    const media = await tx<{ id: string }[]>`
      select id from content_media where id in ${tx(mediaIds)}
    `;
    if (media.length !== mediaIds.length) throw new ContentStudioError("invalid_content");
    for (const mediaId of mediaIds) {
      await tx`
        insert into content_revision_media (revision_id, media_id)
        values (${input.id}::uuid, ${mediaId}::uuid)
      `;
    }
  }
}

type ContentRevisionInputLike =
  | StoreContentDraftInput["draft"]
  | StoreContentRevisionInput["revision"];

async function writeEvents(
  tx: DatabaseTransaction,
  input: {
    auditId: string;
    outboxId: string;
    actorUserId: string;
    requestId: string;
    action: string;
    itemId: string;
    revisionId?: string;
    reason?: string;
  },
) {
  const payload = {
    itemId: input.itemId,
    revisionId: input.revisionId,
    ...(input.reason ? { reason: input.reason } : {}),
  };
  await tx`
    insert into audit_events (id, workspace_id, actor_user_id, action, target_type, target_id, request_id, metadata)
    values (${input.auditId}::uuid, null, ${input.actorUserId}::uuid, ${input.action}, 'content_item', ${input.itemId}, ${input.requestId}, ${JSON.stringify(payload)}::jsonb)
  `;
  await tx`
    insert into outbox_events (id, workspace_id, topic, aggregate_type, aggregate_id, payload)
    values (${input.outboxId}::uuid, null, ${input.action}, 'content_item', ${input.itemId}, ${JSON.stringify(payload)}::jsonb)
  `;
}

function requiresSafetyReview(category: string | null | undefined): boolean {
  return category?.toLowerCase().includes("safety") ?? false;
}
