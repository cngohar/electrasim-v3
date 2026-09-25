-- Focused, revisioned platform Content Studio. Public content is global rather than tenant-owned,
-- but draft/review rows remain protected by platform capability RLS.

create or replace function app_private.has_platform_permission(required_permission text)
returns boolean language sql stable security invoker set search_path = pg_catalog, public as $$
  select exists (
    select 1
    from platform_role_assignments assignments
    join role_permissions permissions on permissions.role_id = assignments.role_id
    where assignments.user_id = app_private.current_user_id()
      and (assignments.expires_at is null or assignments.expires_at > now())
      and permissions.permission_key = required_permission
  )
$$;

create table content_authors (
  id uuid primary key,
  user_id uuid references users(id),
  display_name text not null,
  biography text,
  avatar_object_key text,
  legacy_source_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_authors_name_ck check (length(btrim(display_name)) between 1 and 120)
);

create table content_items (
  id uuid primary key,
  kind text not null check (kind in ('article', 'marketing_page')),
  slug text not null unique,
  source_locale text not null default 'en',
  status text not null default 'draft' check (status in ('draft', 'in_review', 'scheduled', 'published', 'archived')),
  legacy_source_key text unique,
  original_published_at timestamptz,
  scheduled_for timestamptz,
  current_published_revision_id uuid,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_items_slug_ck check (slug = lower(btrim(slug)) and slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint content_items_locale_ck check (length(source_locale) between 2 and 35)
);

create table content_revisions (
  id uuid primary key,
  content_item_id uuid not null references content_items(id),
  revision_number integer not null check (revision_number > 0),
  locale text not null,
  title text not null,
  description text not null,
  body_format text not null default 'markdown' check (body_format in ('markdown', 'blocks')),
  body_markdown text,
  body_document jsonb,
  author_id uuid not null references content_authors(id),
  category text,
  tags jsonb not null default '[]'::jsonb,
  featured_image_object_key text,
  seo_title text,
  canonical_url text,
  change_summary text not null,
  safety_review_status text not null default 'not_required' check (safety_review_status in ('not_required', 'required', 'approved', 'rejected')),
  created_by_user_id uuid not null references users(id),
  reviewed_by_user_id uuid references users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (content_item_id, revision_number),
  constraint content_revisions_title_ck check (length(btrim(title)) between 1 and 180),
  constraint content_revisions_description_ck check (length(btrim(description)) between 1 and 500),
  constraint content_revisions_body_ck check (
    (body_format = 'markdown' and body_markdown is not null and body_document is null) or
    (body_format = 'blocks' and body_document is not null and jsonb_typeof(body_document) = 'object' and body_markdown is null)
  ),
  constraint content_revisions_tags_array_ck check (jsonb_typeof(tags) = 'array')
);

alter table content_items add constraint content_items_published_revision_fk
  foreign key (current_published_revision_id) references content_revisions(id);

create table content_publication_events (
  id uuid primary key,
  content_item_id uuid not null references content_items(id),
  revision_id uuid not null references content_revisions(id),
  action text not null check (action in ('published', 'unpublished', 'archived', 'restored')),
  actor_user_id uuid not null references users(id),
  reason text not null,
  occurred_at timestamptz not null default now()
);

create table content_media (
  id uuid primary key,
  object_key text not null unique,
  original_filename text not null,
  content_type text not null check (content_type in ('image/png', 'image/jpeg', 'image/webp')),
  byte_size integer not null check (byte_size between 16 and 5242880),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  width integer not null check (width between 1 and 8000),
  height integer not null check (height between 1 and 8000),
  alt_text text not null check (length(btrim(alt_text)) between 1 and 300),
  uploaded_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now()
);
create index content_media_hash_idx on content_media(sha256);

create table content_revision_media (
  revision_id uuid not null references content_revisions(id),
  media_id uuid not null references content_media(id),
  usage text not null default 'body' check (usage in ('body', 'featured')),
  created_at timestamptz not null default now(),
  primary key (revision_id, media_id)
);
create index content_revision_media_media_idx on content_revision_media(media_id);

create table content_redirects (
  source_path text primary key,
  content_item_id uuid not null references content_items(id),
  destination_path text not null,
  created_by_user_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  constraint content_redirects_source_ck check (source_path like '/%'),
  constraint content_redirects_destination_ck check (destination_path like '/%'),
  constraint content_redirects_no_loop_ck check (source_path <> destination_path)
);

create index content_items_public_idx on content_items(status, source_locale, original_published_at desc);
create index content_revisions_item_idx on content_revisions(content_item_id, revision_number desc);
create index content_publication_events_item_idx on content_publication_events(content_item_id, occurred_at desc);

-- The application role cannot select published rows directly. This narrow function exposes only
-- the current revision of content that has completed publication.
create or replace function app_private.get_published_content(requested_slug text, requested_locale text)
returns table (
  item_id uuid, revision_id uuid, kind text, slug text, locale text, title text,
  description text, body_format text, body_markdown text, body_document jsonb,
  author_display_name text, category text, tags jsonb, canonical_url text,
  published_at timestamptz, updated_at timestamptz
) language sql stable security definer set search_path = pg_catalog, public as $$
  select items.id, revisions.id, items.kind, items.slug, revisions.locale,
    revisions.title, revisions.description, revisions.body_format,
    revisions.body_markdown, revisions.body_document, authors.display_name,
    revisions.category, revisions.tags, revisions.canonical_url,
    items.original_published_at, items.updated_at
  from content_items items
  join content_revisions revisions on revisions.id = items.current_published_revision_id
  join content_authors authors on authors.id = revisions.author_id
  where items.slug = requested_slug
    and revisions.locale = requested_locale
    and items.status = 'published'
    and items.original_published_at is not null
  limit 1
$$;
revoke all on function app_private.get_published_content(text, text) from public;

create or replace function app_private.get_published_media(requested_media_id uuid)
returns table (object_key text, content_type text, byte_size integer, sha256 text)
language sql stable security definer set search_path = pg_catalog, public as $$
  select media.object_key, media.content_type, media.byte_size, media.sha256
  from content_media media
  where media.id = requested_media_id
    and exists (
      select 1 from content_revision_media links
      join content_items items on items.current_published_revision_id = links.revision_id
      where links.media_id = media.id and items.status = 'published'
    )
  limit 1
$$;
revoke all on function app_private.get_published_media(uuid) from public;

create or replace function app_private.release_due_content(batch_size integer)
returns integer language plpgsql security definer set search_path = pg_catalog, public as $$
declare
  due record;
  released integer := 0;
begin
  if batch_size < 1 or batch_size > 100 then
    raise exception 'invalid content release batch size';
  end if;
  for due in
    select items.id, items.current_published_revision_id as revision_id,
      events.actor_user_id, events.reason
    from content_items items
    join lateral (
      select actor_user_id, reason from content_publication_events
      where content_item_id = items.id and revision_id = items.current_published_revision_id
      order by occurred_at desc limit 1
    ) events on true
    where items.status = 'scheduled' and items.scheduled_for <= now()
    order by items.scheduled_for, items.id
    for update of items skip locked
    limit batch_size
  loop
    update content_items set status = 'published', scheduled_for = null,
      original_published_at = coalesce(original_published_at, now()), updated_at = now()
      where id = due.id;
    insert into content_publication_events (
      id, content_item_id, revision_id, action, actor_user_id, reason
    ) values (
      gen_random_uuid(), due.id, due.revision_id, 'published', due.actor_user_id,
      'Scheduled publication released: ' || due.reason
    );
    insert into audit_events (
      id, workspace_id, actor_user_id, action, target_type, target_id, request_id, metadata
    ) values (
      gen_random_uuid(), null, due.actor_user_id, 'content.published', 'content_item',
      due.id::text, 'scheduled-release:' || due.id::text,
      jsonb_build_object('itemId', due.id, 'revisionId', due.revision_id)
    );
    insert into outbox_events (id, workspace_id, topic, aggregate_type, aggregate_id, payload)
    values (
      gen_random_uuid(), null, 'content.published', 'content_item', due.id::text,
      jsonb_build_object('itemId', due.id, 'revisionId', due.revision_id)
    );
    released := released + 1;
  end loop;
  return released;
end
$$;
revoke all on function app_private.release_due_content(integer) from public;

alter table content_authors enable row level security;
alter table content_authors force row level security;
alter table content_items enable row level security;
alter table content_items force row level security;
alter table content_revisions enable row level security;
alter table content_revisions force row level security;
alter table content_publication_events enable row level security;
alter table content_publication_events force row level security;
alter table content_media enable row level security;
alter table content_media force row level security;
alter table content_revision_media enable row level security;
alter table content_revision_media force row level security;
alter table content_redirects enable row level security;
alter table content_redirects force row level security;

create policy content_authors_read on content_authors for select
  using (app_private.has_platform_permission('platform.content.read'));
create policy content_authors_insert on content_authors for insert
  with check (app_private.has_platform_permission('platform.content.edit'));
create policy content_authors_update on content_authors for update
  using (app_private.has_platform_permission('platform.content.edit'))
  with check (app_private.has_platform_permission('platform.content.edit'));
create policy content_items_read on content_items for select
  using (app_private.has_platform_permission('platform.content.read'));
create policy content_items_insert on content_items for insert
  with check (
    app_private.has_platform_permission('platform.content.edit') and
    (status not in ('scheduled', 'published', 'archived') or app_private.has_platform_permission('platform.content.publish'))
  );
create policy content_items_update on content_items for update
  using (app_private.has_platform_permission('platform.content.edit'))
  with check (
    app_private.has_platform_permission('platform.content.edit') and
    (status not in ('scheduled', 'published', 'archived') or app_private.has_platform_permission('platform.content.publish'))
  );
create policy content_revisions_read on content_revisions for select
  using (app_private.has_platform_permission('platform.content.read'));
create policy content_revisions_insert on content_revisions for insert
  with check (app_private.has_platform_permission('platform.content.edit'));
create policy content_revisions_review_update on content_revisions for update
  using (app_private.has_platform_permission('platform.content.publish'))
  with check (app_private.has_platform_permission('platform.content.publish'));
create policy content_publication_events_read on content_publication_events for select
  using (app_private.has_platform_permission('platform.content.read'));
create policy content_publication_events_insert on content_publication_events for insert
  with check (app_private.has_platform_permission('platform.content.publish'));
create policy content_media_read on content_media for select
  using (app_private.has_platform_permission('platform.content.read'));
create policy content_media_insert on content_media for insert
  with check (
    app_private.has_platform_permission('platform.content.edit') and
    uploaded_by_user_id = app_private.current_user_id()
  );
create policy content_revision_media_read on content_revision_media for select
  using (app_private.has_platform_permission('platform.content.read'));
create policy content_revision_media_insert on content_revision_media for insert
  with check (app_private.has_platform_permission('platform.content.edit'));
create policy content_redirects_read on content_redirects for select
  using (app_private.has_platform_permission('platform.content.read'));
create policy content_redirects_insert on content_redirects for insert
  with check (app_private.has_platform_permission('platform.content.publish'));
create policy content_redirects_update on content_redirects for update
  using (app_private.has_platform_permission('platform.content.publish'))
  with check (app_private.has_platform_permission('platform.content.publish'));

-- Platform content events are global (workspace_id is null) and remain capability-bound.
create policy audit_events_platform_content_insert on audit_events for insert
  with check (
    workspace_id is null and actor_user_id = app_private.current_user_id() and
    app_private.has_platform_permission('platform.content.edit') and
    action like 'content.%'
  );
create policy outbox_events_platform_content_insert on outbox_events for insert
  with check (
    workspace_id is null and app_private.has_platform_permission('platform.content.edit') and
    topic like 'content.%'
  );
