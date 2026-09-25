-- Run as the managed-PostgreSQL administrative/migration identity, separately
-- from application migrations. Passwords and LOGIN are provider-managed.

begin;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'electrasim_auth') then
    create role electrasim_auth nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'electrasim_app') then
    create role electrasim_app nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'electrasim_worker') then
    create role electrasim_worker nologin;
  end if;
end
$$;

alter role electrasim_auth nosuperuser nobypassrls noinherit;
alter role electrasim_app nosuperuser nobypassrls noinherit;
alter role electrasim_worker nosuperuser nobypassrls noinherit;

revoke all on all tables in schema public from electrasim_auth, electrasim_app, electrasim_worker;
revoke all on all functions in schema app_private from electrasim_auth, electrasim_app, electrasim_worker;
grant usage on schema public to electrasim_auth, electrasim_app, electrasim_worker;
grant usage on schema app_private to electrasim_app, electrasim_worker;
grant execute on function app_private.current_user_id() to electrasim_app, electrasim_worker;
grant execute on function app_private.current_workspace_id() to electrasim_app, electrasim_worker;
grant execute on function app_private.release_due_content(integer) to electrasim_worker;

-- Better Auth credential/session plumbing plus producer-only durable jobs.
grant select, insert, update, delete on
  users, sessions, accounts, verifications, passkeys, two_factors
  to electrasim_auth;
grant insert on durable_system_jobs to electrasim_auth;
grant select (id) on durable_system_jobs to electrasim_auth;

-- Request-time identity lifecycle and authorization. No credential/token tables.
grant select (
  id, email_verified, adult_eligibility_confirmed_at, primary_goal,
  experience_level, supply_family, accessibility_presented_at,
  safety_terms_version, onboarding_completed_at, disabled_at
) on users to electrasim_app;
grant update (
  adult_eligibility_confirmed_at, primary_goal, experience_level,
  supply_family, accessibility_presented_at, safety_terms_version,
  onboarding_completed_at, updated_at
) on users to electrasim_app;
grant select, insert on identity_operations to electrasim_app;
grant select on
  workspaces, workspace_memberships, roles, role_permissions,
  membership_role_assignments, platform_role_assignments,
  invitations, invitation_roles, institutions
  to electrasim_app;
grant insert on workspaces, institutions to electrasim_app;
grant insert, update on workspace_memberships to electrasim_app;
grant insert on membership_role_assignments, audit_events, outbox_events to electrasim_app;
grant insert, update on invitations to electrasim_app;
grant insert on invitation_roles to electrasim_app;
grant insert on durable_system_jobs to electrasim_app;
grant select (id) on durable_system_jobs to electrasim_app;
grant select, insert, update on step_up_sessions to electrasim_app;
grant execute on function app_private.has_platform_permission(text) to electrasim_app;
grant execute on function app_private.get_published_content(text, text) to electrasim_app;
grant execute on function app_private.get_published_media(uuid) to electrasim_app;
grant select, insert, update on content_authors, content_items, content_redirects to electrasim_app;
grant select, insert on content_media, content_revision_media to electrasim_app;
grant select, insert on content_revisions, content_publication_events to electrasim_app;
grant update (safety_review_status, reviewed_by_user_id, reviewed_at) on content_revisions to electrasim_app;
grant select, insert, update on simulator_projects to electrasim_app;
grant select, insert on simulator_project_revisions to electrasim_app;
grant select, insert on simulator_lesson_submissions to electrasim_app;
grant execute on function app_private.get_shared_simulator_project(uuid) to electrasim_app;
grant select on account_entitlements to electrasim_app;
grant execute on function app_private.has_active_entitlement(text) to electrasim_app;
grant execute on function app_private.has_workspace_permission(uuid, text) to electrasim_app;
grant execute on function app_private.list_my_workspaces() to electrasim_app;
grant execute on function app_private.get_workspace_roster(uuid) to electrasim_app;
grant select, insert, update on campuses, departments to electrasim_app;

-- Background lifecycle reconciliation and provider delivery.
grant select (
  id, email_normalized, email_verified, adult_eligibility_confirmed_at,
  onboarding_completed_at, disabled_at
) on users to electrasim_worker;
grant select, insert, update, delete on durable_system_jobs to electrasim_worker;
grant select, insert, update on identity_operations to electrasim_worker;
grant select, insert, update on workspaces, workspace_memberships to electrasim_worker;
grant select on roles, role_permissions to electrasim_worker;
grant select, insert on membership_role_assignments to electrasim_worker;
grant select, insert on audit_events, outbox_events to electrasim_worker;

commit;
