-- Local profiles: private defaults, permanent handles and independent moderation.
CREATE TABLE profile_reserved_handles (handle TEXT PRIMARY KEY NOT NULL);
INSERT INTO profile_reserved_handles(handle) VALUES ('admin'),('administrator'),('api'),('app'),('assets'),('auth'),('blog'),('community'),('contact'),('electrasim'),('explore'),('feed'),('help'),('login'),('logout'),('me'),('moderator'),('privacy'),('root'),('settings'),('signin'),('signup'),('staff'),('support'),('system'),('terms'),('user'),('users'),('www');
CREATE TRIGGER profile_reserved_no_insert BEFORE INSERT ON profile_reserved_handles BEGIN SELECT RAISE(ABORT,'Reserved handles are code-owned'); END;
CREATE TRIGGER profile_reserved_no_update BEFORE UPDATE ON profile_reserved_handles BEGIN SELECT RAISE(ABORT,'Reserved handles are code-owned'); END;
CREATE TRIGGER profile_reserved_no_delete BEFORE DELETE ON profile_reserved_handles BEGIN SELECT RAISE(ABORT,'Reserved handles are code-owned'); END;
CREATE TABLE profiles (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id),
  handle TEXT UNIQUE CHECK(handle IS NULL OR (length(handle) BETWEEN 3 AND 24 AND handle GLOB '[a-z]*' AND handle NOT GLOB '*[^a-z0-9_]*')),
  display_name TEXT NOT NULL DEFAULT 'Community member' CHECK(length(trim(display_name)) BETWEEN 1 AND 60),
  bio TEXT NOT NULL DEFAULT '' CHECK(length(bio)<=280),
  institution TEXT NOT NULL DEFAULT '' CHECK(length(institution)<=100),
  level TEXT NOT NULL DEFAULT '' CHECK(length(level)<=80),
  avatar_key TEXT,
  profile_visibility TEXT NOT NULL DEFAULT 'private' CHECK(profile_visibility IN ('public','private')),
  show_institution INTEGER NOT NULL DEFAULT 0 CHECK(show_institution IN (0,1)),
  show_level INTEGER NOT NULL DEFAULT 0 CHECK(show_level IN (0,1)),
  allow_forks INTEGER NOT NULL DEFAULT 1 CHECK(allow_forks IN (0,1)),
  moderation TEXT NOT NULL DEFAULT 'visible' CHECK(moderation IN ('visible','hidden','removed')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(typeof(revision)='integer' AND revision BETWEEN 1 AND 9007199254740991),
  mutation_id TEXT,
  created_at INTEGER NOT NULL CHECK(typeof(created_at)='integer' AND created_at>=0),
  updated_at INTEGER NOT NULL CHECK(typeof(updated_at)='integer' AND updated_at>=created_at)
);
CREATE INDEX profiles_review ON profiles(moderation,updated_at,user_id);
CREATE INDEX profiles_name ON profiles(lower(display_name),user_id);
CREATE TRIGGER profile_handle_reserved_insert BEFORE INSERT ON profiles WHEN NEW.handle IS NOT NULL AND EXISTS(SELECT 1 FROM profile_reserved_handles WHERE handle=NEW.handle) BEGIN SELECT RAISE(ABORT,'Reserved handle'); END;
CREATE TRIGGER profile_handle_reserved_update BEFORE UPDATE OF handle ON profiles WHEN NEW.handle IS NOT NULL AND EXISTS(SELECT 1 FROM profile_reserved_handles WHERE handle=NEW.handle) BEGIN SELECT RAISE(ABORT,'Reserved handle'); END;
CREATE TRIGGER profile_handle_permanent BEFORE UPDATE OF handle ON profiles WHEN OLD.handle IS NOT NULL AND NEW.handle IS NOT OLD.handle BEGIN SELECT RAISE(ABORT,'Handle already claimed'); END;
CREATE TRIGGER profile_no_delete BEFORE DELETE ON profiles BEGIN SELECT RAISE(ABORT,'Profiles retain handle tombstones'); END;
CREATE TRIGGER profile_no_replace BEFORE INSERT ON profiles WHEN EXISTS(SELECT 1 FROM profiles WHERE user_id=NEW.user_id) BEGIN SELECT RAISE(ABORT,'Profiles cannot be replaced'); END;
CREATE TRIGGER profile_removed_terminal BEFORE UPDATE OF moderation ON profiles WHEN OLD.moderation='removed' AND NEW.moderation!='removed' BEGIN SELECT RAISE(ABORT,'Removed profile is terminal'); END;
INSERT INTO profiles(user_id,display_name,created_at,updated_at) SELECT id,CASE WHEN length(trim(name)) BETWEEN 1 AND 60 THEN trim(name) ELSE 'Community member' END,created_at,created_at FROM user;
CREATE TRIGGER profile_after_signup AFTER INSERT ON user BEGIN
  INSERT INTO profiles(user_id,display_name,created_at,updated_at) VALUES(NEW.id,CASE WHEN length(trim(NEW.name)) BETWEEN 1 AND 60 THEN trim(NEW.name) ELSE 'Community member' END,NEW.created_at,NEW.created_at);
END;
CREATE TABLE profile_write_windows (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id),
  window_start INTEGER NOT NULL CHECK(typeof(window_start)='integer' AND window_start>=0),
  writes INTEGER NOT NULL CHECK(typeof(writes)='integer' AND writes BETWEEN 1 AND 120)
);
CREATE TABLE profile_reports (
  id TEXT PRIMARY KEY NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES user(id),
  target_user_id TEXT NOT NULL REFERENCES profiles(user_id),
  reason TEXT NOT NULL CHECK(reason IN ('Misleading identity','Harassment or hate','Inappropriate avatar','Spam','Other')),
  details TEXT NOT NULL CHECK(length(trim(details)) BETWEEN 1 AND 500),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(typeof(revision)='integer' AND revision BETWEEN 1 AND 9007199254740991),
  resolution TEXT CHECK(resolution IS NULL OR length(trim(resolution)) BETWEEN 8 AND 1000),
  resolved_by TEXT REFERENCES user(id),
  created_at INTEGER NOT NULL CHECK(typeof(created_at)='integer' AND created_at>=0),
  updated_at INTEGER NOT NULL CHECK(typeof(updated_at)='integer' AND updated_at>=created_at),
  UNIQUE(reporter_id,target_user_id),
  CHECK(reporter_id!=target_user_id),
  CHECK((status='open' AND resolution IS NULL AND resolved_by IS NULL) OR (status!='open' AND resolution IS NOT NULL AND resolved_by IS NOT NULL))
);
CREATE INDEX profile_reports_queue ON profile_reports(status,created_at,id);
CREATE INDEX profile_reports_subject ON profile_reports(target_user_id,status,created_at,id);
CREATE INDEX profile_reports_daily ON profile_reports(reporter_id,created_at);
-- Durable cleanup candidates are recorded BEFORE R2 writes. Attached objects are
-- removed from this queue atomically; abandoned stages expire after one hour.
CREATE TABLE profile_avatar_garbage (
  key TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES profiles(user_id),
  eligible_at INTEGER NOT NULL CHECK(typeof(eligible_at)='integer' AND eligible_at>=0)
);
CREATE INDEX profile_avatar_cleanup ON profile_avatar_garbage(user_id,eligible_at,key);
