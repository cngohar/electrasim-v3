-- Minimal versioned authorization catalog required for account/workspace provisioning.
-- UUIDs are stable catalog identifiers and must never be repurposed for another role.

insert into permissions (key, description, scope_type, high_risk) values
  ('platform.admin.access', 'Enter the ElectraSim platform administration surface', 'platform', true),
  ('platform.audit.read', 'Read platform audit records', 'platform', true),
  ('platform.user.manage', 'Suspend or restore global user access', 'platform', true),
  ('platform.institution.manage', 'Review and manage institution tenants', 'platform', true),
  ('platform.billing.manage', 'Operate payment and billing exceptions', 'platform', true),
  ('platform.moderation.manage', 'Operate public trust and safety queues', 'platform', true),
  ('platform.content.read', 'Read draft and published platform content', 'platform', false),
  ('platform.content.edit', 'Create and revise platform content drafts', 'platform', false),
  ('platform.content.publish', 'Publish, unpublish, archive, and redirect platform content', 'platform', true),
  ('workspace.settings.manage', 'Manage workspace settings', 'workspace', true),
  ('workspace.membership.read', 'Read workspace membership', 'workspace', false),
  ('workspace.membership.manage', 'Invite, suspend, and role workspace members', 'workspace', true),
  ('course.manage', 'Create and administer courses', 'course', false),
  ('assessment.manage', 'Create and administer teaching-context assessments', 'course', true),
  ('gradebook.manage', 'Read and mutate permitted gradebook records', 'course', true),
  ('analytics.read', 'Read permitted workspace/course analytics', 'workspace', false),
  ('workspace.billing.manage', 'Manage workspace plan and billing', 'workspace', true),
  ('workspace.integrations.manage', 'Manage workspace integration credentials', 'workspace', true),
  ('learning.access', 'Access assigned or personal learning content', 'workspace', false)
on conflict (key) do nothing;

alter table roles no force row level security;
alter table roles disable row level security;
alter table role_permissions no force row level security;
alter table role_permissions disable row level security;

insert into roles (id, workspace_id, key, name, scope_type, system, permission_version) values
  ('00000000-0000-7000-8100-000000000001', null, 'super_admin', 'Super administrator', 'platform', true, 1),
  ('00000000-0000-7000-8100-000000000002', null, 'platform_moderator', 'Platform moderator', 'platform', true, 1),
  ('00000000-0000-7000-8100-000000000003', null, 'support_agent', 'Support agent', 'platform', true, 1),
  ('00000000-0000-7000-8100-000000000004', null, 'billing_operator', 'Billing operator', 'platform', true, 1),
  ('00000000-0000-7000-8100-000000000005', null, 'content_manager', 'Content manager', 'platform', true, 1),
  ('00000000-0000-7000-8100-000000000006', null, 'auditor', 'Auditor', 'platform', true, 1),
  ('00000000-0000-7000-8200-000000000001', null, 'personal_owner', 'Personal workspace owner', 'workspace', true, 1),
  ('00000000-0000-7000-8200-000000000002', null, 'owner_instructor', 'Independent instructor owner', 'workspace', true, 1),
  ('00000000-0000-7000-8200-000000000003', null, 'co_instructor', 'Independent co-instructor', 'workspace', true, 1),
  ('00000000-0000-7000-8200-000000000004', null, 'grader', 'Grader', 'course', true, 1),
  ('00000000-0000-7000-8300-000000000001', null, 'institution_owner', 'Institution owner', 'workspace', true, 1),
  ('00000000-0000-7000-8300-000000000002', null, 'institution_admin', 'Institution administrator', 'workspace', true, 1),
  ('00000000-0000-7000-8300-000000000003', null, 'academic_admin', 'Academic administrator', 'workspace', true, 1),
  ('00000000-0000-7000-8300-000000000004', null, 'billing_admin', 'Institution billing administrator', 'workspace', true, 1),
  ('00000000-0000-7000-8300-000000000005', null, 'data_officer', 'Institution data officer', 'workspace', true, 1),
  ('00000000-0000-7000-8300-000000000006', null, 'instructor', 'Institution instructor', 'course', true, 1),
  ('00000000-0000-7000-8300-000000000007', null, 'teaching_assistant', 'Teaching assistant', 'course', true, 1),
  ('00000000-0000-7000-8300-000000000008', null, 'learner', 'Learner', 'workspace', true, 1),
  ('00000000-0000-7000-8300-000000000009', null, 'observer', 'Observer', 'workspace', true, 1)
on conflict do nothing;

insert into role_permissions (role_id, permission_key) values
  ('00000000-0000-7000-8100-000000000001', 'platform.admin.access'),
  ('00000000-0000-7000-8100-000000000001', 'platform.audit.read'),
  ('00000000-0000-7000-8100-000000000001', 'platform.user.manage'),
  ('00000000-0000-7000-8100-000000000001', 'platform.institution.manage'),
  ('00000000-0000-7000-8100-000000000001', 'platform.billing.manage'),
  ('00000000-0000-7000-8100-000000000001', 'platform.moderation.manage'),
  ('00000000-0000-7000-8100-000000000001', 'platform.content.read'),
  ('00000000-0000-7000-8100-000000000001', 'platform.content.edit'),
  ('00000000-0000-7000-8100-000000000001', 'platform.content.publish'),
  ('00000000-0000-7000-8100-000000000002', 'platform.admin.access'),
  ('00000000-0000-7000-8100-000000000002', 'platform.moderation.manage'),
  ('00000000-0000-7000-8100-000000000003', 'platform.admin.access'),
  ('00000000-0000-7000-8100-000000000004', 'platform.admin.access'),
  ('00000000-0000-7000-8100-000000000004', 'platform.billing.manage'),
  ('00000000-0000-7000-8100-000000000005', 'platform.admin.access'),
  ('00000000-0000-7000-8100-000000000005', 'platform.content.read'),
  ('00000000-0000-7000-8100-000000000005', 'platform.content.edit'),
  ('00000000-0000-7000-8100-000000000005', 'platform.content.publish'),
  ('00000000-0000-7000-8100-000000000006', 'platform.admin.access'),
  ('00000000-0000-7000-8100-000000000006', 'platform.audit.read'),
  ('00000000-0000-7000-8200-000000000001', 'workspace.settings.manage'),
  ('00000000-0000-7000-8200-000000000001', 'learning.access'),
  ('00000000-0000-7000-8200-000000000002', 'workspace.settings.manage'),
  ('00000000-0000-7000-8200-000000000002', 'workspace.membership.read'),
  ('00000000-0000-7000-8200-000000000002', 'workspace.membership.manage'),
  ('00000000-0000-7000-8200-000000000002', 'course.manage'),
  ('00000000-0000-7000-8200-000000000002', 'assessment.manage'),
  ('00000000-0000-7000-8200-000000000002', 'gradebook.manage'),
  ('00000000-0000-7000-8200-000000000002', 'analytics.read'),
  ('00000000-0000-7000-8200-000000000002', 'workspace.billing.manage'),
  ('00000000-0000-7000-8200-000000000002', 'learning.access'),
  ('00000000-0000-7000-8300-000000000001', 'workspace.settings.manage'),
  ('00000000-0000-7000-8300-000000000001', 'workspace.membership.read'),
  ('00000000-0000-7000-8300-000000000001', 'workspace.membership.manage'),
  ('00000000-0000-7000-8300-000000000001', 'course.manage'),
  ('00000000-0000-7000-8300-000000000001', 'assessment.manage'),
  ('00000000-0000-7000-8300-000000000001', 'gradebook.manage'),
  ('00000000-0000-7000-8300-000000000001', 'analytics.read'),
  ('00000000-0000-7000-8300-000000000001', 'workspace.billing.manage'),
  ('00000000-0000-7000-8300-000000000001', 'workspace.integrations.manage'),
  ('00000000-0000-7000-8300-000000000002', 'workspace.settings.manage'),
  ('00000000-0000-7000-8300-000000000002', 'workspace.membership.read'),
  ('00000000-0000-7000-8300-000000000002', 'workspace.membership.manage'),
  ('00000000-0000-7000-8300-000000000002', 'course.manage'),
  ('00000000-0000-7000-8300-000000000002', 'analytics.read'),
  ('00000000-0000-7000-8300-000000000008', 'learning.access')
on conflict do nothing;

alter table roles enable row level security;
alter table roles force row level security;
alter table role_permissions enable row level security;
alter table role_permissions force row level security;

create policy roles_platform_assigned_self on roles for select using (
  scope_type = 'platform'
  and exists (
    select 1 from platform_role_assignments pra
    where pra.role_id = roles.id
      and pra.user_id = app_private.current_user_id()
      and (pra.expires_at is null or pra.expires_at > now())
  )
);
