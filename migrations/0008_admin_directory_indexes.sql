-- Local development only. Read projections; no identity/document/grant changes.
CREATE INDEX user_admin_role ON user(global_role, lower(name), id);
CREATE INDEX user_admin_created ON user(created_at, id);
