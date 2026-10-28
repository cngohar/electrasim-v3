-- Local-only platform administration. No membership/private-document rewrite.
CREATE TABLE admin_revision (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  mutation_id TEXT
);
INSERT INTO admin_revision (id, version) VALUES (1, 1);
CREATE TABLE admin_roles (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0,1)),
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX admin_roles_name ON admin_roles (lower(name));
CREATE TABLE admin_role_permissions (
  role_id TEXT NOT NULL REFERENCES admin_roles(id),
  permission TEXT NOT NULL,
  PRIMARY KEY (role_id, permission)
);
CREATE TABLE admin_user_roles (
  user_id TEXT NOT NULL REFERENCES user(id),
  role_id TEXT NOT NULL REFERENCES admin_roles(id),
  PRIMARY KEY (user_id, role_id)
);
CREATE INDEX admin_user_roles_role ON admin_user_roles(role_id, user_id);
CREATE TABLE admin_policy (
  global_role TEXT PRIMARY KEY CHECK (global_role IN ('moderator','admin')),
  permissions_json TEXT NOT NULL CHECK (json_valid(permissions_json)),
  version INTEGER NOT NULL
);
CREATE TABLE admin_settings (
  namespace TEXT PRIMARY KEY NOT NULL,
  values_json TEXT NOT NULL CHECK (json_valid(values_json)),
  version INTEGER NOT NULL
);
CREATE TABLE account_controls (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id),
  suspended INTEGER NOT NULL DEFAULT 0 CHECK (suspended IN (0,1)),
  ends_at INTEGER,
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (suspended = 1 OR ends_at IS NULL)
);
CREATE INDEX account_controls_active ON account_controls(suspended, ends_at, user_id);
CREATE TABLE community_restrictions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES user(id),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER,
  revoked_at INTEGER,
  reason TEXT NOT NULL,
  actor_id TEXT NOT NULL REFERENCES user(id),
  version INTEGER NOT NULL,
  CHECK (ends_at IS NULL OR ends_at > starts_at)
);
CREATE INDEX community_restrictions_user ON community_restrictions(user_id, revoked_at, ends_at);
CREATE TABLE admin_audit (
  id TEXT PRIMARY KEY NOT NULL,
  namespace TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
  after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
  reason TEXT NOT NULL,
  request_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  version INTEGER NOT NULL
);
CREATE INDEX admin_audit_scope ON admin_audit(namespace, created_at, id);
CREATE INDEX admin_audit_target ON admin_audit(target_id, created_at, id);
CREATE INDEX admin_audit_actor ON admin_audit(actor_id, created_at, id);
CREATE TRIGGER admin_audit_no_update BEFORE UPDATE ON admin_audit
BEGIN SELECT RAISE(ABORT, 'Administrative audit is append-only'); END;
CREATE TRIGGER admin_audit_no_delete BEFORE DELETE ON admin_audit
BEGIN SELECT RAISE(ABORT, 'Administrative audit is append-only'); END;
-- The auth hook gives a normal denial; this trigger closes an insert race with
-- an already-committed suspension. D1 serializes writes and batches atomically.
CREATE TRIGGER session_platform_suspension BEFORE INSERT ON session
WHEN EXISTS (SELECT 1 FROM account_controls WHERE user_id = NEW.user_id
  AND suspended = 1 AND (ends_at IS NULL OR ends_at > CAST(unixepoch('subsec') * 1000 AS INTEGER)))
BEGIN SELECT RAISE(ABORT, 'Platform account suspended'); END;
CREATE INDEX user_admin_name ON user(lower(name), id);
CREATE INDEX user_admin_email ON user(lower(email), id);
