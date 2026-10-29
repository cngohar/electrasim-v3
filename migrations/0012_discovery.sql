-- Current-publication discovery projection. Private source circuits never enter it.
-- The FTS table is external-content so rowid updates/deletes remain bounded.
ALTER TABLE publications ADD COLUMN zone TEXT NOT NULL DEFAULT 'general'
  CHECK(zone IN ('general','lighting','protection','control','power'));
ALTER TABLE publications ADD COLUMN standard TEXT NOT NULL DEFAULT 'int'
  CHECK(standard IN ('int','uk','us','eu'));

CREATE TABLE publication_discovery (
  id INTEGER PRIMARY KEY,
  publication_id TEXT NOT NULL UNIQUE REFERENCES publications(id),
  owner_id TEXT NOT NULL REFERENCES profiles(user_id),
  version_id TEXT NOT NULL REFERENCES publication_versions(id),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT NOT NULL,
  author_handle TEXT NOT NULL,
  zone TEXT NOT NULL,
  standard TEXT NOT NULL,
  component_count INTEGER NOT NULL,
  published_at INTEGER NOT NULL
);
CREATE INDEX publication_discovery_recent ON publication_discovery(published_at DESC,publication_id DESC);
CREATE INDEX publication_discovery_zone_recent ON publication_discovery(zone,published_at DESC,publication_id DESC);
CREATE INDEX publication_discovery_standard_recent ON publication_discovery(standard,published_at DESC,publication_id DESC);
CREATE INDEX publication_discovery_title ON publication_discovery(title COLLATE NOCASE,publication_id);
CREATE INDEX publication_discovery_owner_recent ON publication_discovery(owner_id,published_at DESC,publication_id DESC);

CREATE VIRTUAL TABLE publication_fts USING fts5(
  title,description,tags,author_handle,
  content='publication_discovery',content_rowid='id',tokenize='unicode61'
);
CREATE TRIGGER publication_discovery_fts_insert AFTER INSERT ON publication_discovery BEGIN
  INSERT INTO publication_fts(rowid,title,description,tags,author_handle)
  VALUES(NEW.id,NEW.title,NEW.description,NEW.tags,NEW.author_handle);
END;
CREATE TRIGGER publication_discovery_fts_delete AFTER DELETE ON publication_discovery BEGIN
  INSERT INTO publication_fts(publication_fts,rowid,title,description,tags,author_handle)
  VALUES('delete',OLD.id,OLD.title,OLD.description,OLD.tags,OLD.author_handle);
END;
CREATE TRIGGER publication_discovery_fts_update AFTER UPDATE ON publication_discovery BEGIN
  INSERT INTO publication_fts(publication_fts,rowid,title,description,tags,author_handle)
  VALUES('delete',OLD.id,OLD.title,OLD.description,OLD.tags,OLD.author_handle);
  INSERT INTO publication_fts(rowid,title,description,tags,author_handle)
  VALUES(NEW.id,NEW.title,NEW.description,NEW.tags,NEW.author_handle);
END;

-- The final current-version pointer is written after the immutable version row.
-- One trigger covers owner withdrawal and all staff/report moderation mutations.
CREATE TRIGGER publication_discovery_refresh AFTER UPDATE OF current_version_id,status,moderation,zone,standard ON publications BEGIN
  DELETE FROM publication_discovery WHERE publication_id=NEW.id;
  INSERT INTO publication_discovery(publication_id,owner_id,version_id,slug,title,description,tags,author_handle,zone,standard,component_count,published_at)
  SELECT p.id,p.owner_id,v.id,p.slug,v.title,v.description,v.tags_json,
    CASE WHEN a.profile_visibility='public' AND a.moderation='visible' THEN COALESCE(a.handle,'') ELSE '' END,
    p.zone,p.standard,json_array_length(v.circuit_json,'$.components'),p.published_at
  FROM publications p JOIN publication_versions v ON v.id=p.current_version_id AND v.publication_id=p.id
  LEFT JOIN profiles a ON a.user_id=p.owner_id
  WHERE p.id=NEW.id AND p.status='published' AND p.moderation='visible';
END;
CREATE TRIGGER publication_discovery_author AFTER UPDATE OF profile_visibility,moderation,handle ON profiles BEGIN
  UPDATE publication_discovery SET author_handle=
    CASE WHEN NEW.profile_visibility='public' AND NEW.moderation='visible' THEN COALESCE(NEW.handle,'') ELSE '' END
  WHERE owner_id=NEW.user_id;
END;

-- Upgrade existing visible publications with neutral labels. Hidden and withdrawn
-- rows deliberately remain absent from both the projection and FTS index.
INSERT INTO publication_discovery(publication_id,owner_id,version_id,slug,title,description,tags,author_handle,zone,standard,component_count,published_at)
SELECT p.id,p.owner_id,v.id,p.slug,v.title,v.description,v.tags_json,
  CASE WHEN a.profile_visibility='public' AND a.moderation='visible' THEN COALESCE(a.handle,'') ELSE '' END,
  p.zone,p.standard,json_array_length(v.circuit_json,'$.components'),p.published_at
FROM publications p JOIN publication_versions v ON v.id=p.current_version_id AND v.publication_id=p.id
LEFT JOIN profiles a ON a.user_id=p.owner_id
WHERE p.status='published' AND p.moderation='visible';

-- The read side is accepted in 2.4; follow/unfollow actions remain in 2.6.
CREATE TABLE follows (
  follower_id TEXT NOT NULL REFERENCES profiles(user_id),
  followed_id TEXT NOT NULL REFERENCES profiles(user_id),
  created_at INTEGER NOT NULL CHECK(created_at>=0),
  PRIMARY KEY(follower_id,followed_id),
  CHECK(follower_id!=followed_id)
);
CREATE INDEX follows_followed ON follows(followed_id,follower_id);
