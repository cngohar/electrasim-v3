-- Public snapshots are separate from owner-private circuits. Source IDs are
-- provenance, not cascading FKs: deleting a working copy preserves its snapshots.
CREATE TABLE publications (
  id TEXT PRIMARY KEY NOT NULL,
  owner_id TEXT NOT NULL REFERENCES profiles(user_id),
  source_circuit_id TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE CHECK(length(slug) BETWEEN 10 AND 100 AND slug NOT GLOB '*[^a-z0-9-]*'),
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','unpublished','deleted')),
  moderation TEXT NOT NULL DEFAULT 'visible' CHECK(moderation IN ('visible','hidden','removed')),
  current_version_id TEXT REFERENCES publication_versions(id),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(typeof(revision)='integer' AND revision BETWEEN 1 AND 9007199254740991),
  mutation_id TEXT NOT NULL,
  published_at INTEGER NOT NULL CHECK(typeof(published_at)='integer' AND published_at>=0),
  updated_at INTEGER NOT NULL CHECK(typeof(updated_at)='integer' AND updated_at>=published_at),
  UNIQUE(owner_id,source_circuit_id)
);
CREATE INDEX publications_owner ON publications(owner_id,updated_at DESC,id);
CREATE INDEX publications_review ON publications(moderation,updated_at DESC,id);
CREATE TABLE publication_versions (
  id TEXT PRIMARY KEY NOT NULL,
  publication_id TEXT NOT NULL REFERENCES publications(id),
  version_number INTEGER NOT NULL CHECK(typeof(version_number)='integer' AND version_number BETWEEN 1 AND 9007199254740991),
  title TEXT NOT NULL CHECK(length(trim(title)) BETWEEN 1 AND 160),
  description TEXT NOT NULL CHECK(length(description)<=2000),
  tags_json TEXT NOT NULL CHECK(json_valid(tags_json) AND json_type(tags_json)='array' AND json_array_length(tags_json)<=8),
  allow_forks INTEGER NOT NULL CHECK(allow_forks IN (0,1)),
  circuit_json TEXT NOT NULL CHECK(json_valid(circuit_json) AND json_type(circuit_json)='object'),
  circuit_schema_version INTEGER NOT NULL CHECK(circuit_schema_version>0),
  requirements_json TEXT NOT NULL CHECK(json_valid(requirements_json) AND json_type(requirements_json)='array'),
  component_policy_revision INTEGER NOT NULL CHECK(component_policy_revision>=1),
  model_version TEXT NOT NULL,
  engine_version TEXT NOT NULL,
  control_engine_version TEXT NOT NULL,
  fingerprint TEXT NOT NULL CHECK(length(fingerprint)=64 AND fingerprint NOT GLOB '*[^a-f0-9]*'),
  validated_at INTEGER NOT NULL CHECK(typeof(validated_at)='integer' AND validated_at>=0),
  verified_at INTEGER CHECK(verified_at IS NULL),
  source_version INTEGER NOT NULL CHECK(typeof(source_version)='integer' AND source_version>=1),
  created_by TEXT NOT NULL REFERENCES profiles(user_id),
  created_at INTEGER NOT NULL CHECK(typeof(created_at)='integer' AND created_at>=0),
  UNIQUE(publication_id,version_number)
);
CREATE TRIGGER publication_version_no_update BEFORE UPDATE ON publication_versions BEGIN SELECT RAISE(ABORT,'Published versions are immutable'); END;
CREATE TRIGGER publication_version_no_delete BEFORE DELETE ON publication_versions BEGIN SELECT RAISE(ABORT,'Published versions are immutable'); END;
CREATE TRIGGER publication_version_no_replace BEFORE INSERT ON publication_versions WHEN EXISTS(SELECT 1 FROM publication_versions WHERE id=NEW.id OR (publication_id=NEW.publication_id AND version_number=NEW.version_number)) BEGIN SELECT RAISE(ABORT,'Published versions cannot be replaced'); END;
CREATE TRIGGER publication_version_owner BEFORE INSERT ON publication_versions WHEN NOT EXISTS(SELECT 1 FROM publications WHERE id=NEW.publication_id AND owner_id=NEW.created_by AND status!='deleted' AND moderation!='removed') BEGIN SELECT RAISE(ABORT,'Snapshot must belong to an active publication owner'); END;
CREATE TRIGGER publication_pointer BEFORE UPDATE OF current_version_id ON publications WHEN NOT EXISTS(SELECT 1 FROM publication_versions WHERE id=NEW.current_version_id AND publication_id=NEW.id) BEGIN SELECT RAISE(ABORT,'Current version belongs to another publication'); END;
CREATE TRIGGER publication_identity BEFORE UPDATE OF id,owner_id,source_circuit_id,slug ON publications WHEN NEW.id!=OLD.id OR NEW.owner_id!=OLD.owner_id OR NEW.source_circuit_id!=OLD.source_circuit_id OR NEW.slug!=OLD.slug BEGIN SELECT RAISE(ABORT,'Publication identity is permanent'); END;
CREATE TRIGGER publication_no_delete BEFORE DELETE ON publications BEGIN SELECT RAISE(ABORT,'Publications retain tombstones'); END;
CREATE TRIGGER publication_no_replace BEFORE INSERT ON publications WHEN EXISTS(SELECT 1 FROM publications WHERE id=NEW.id OR slug=NEW.slug OR (owner_id=NEW.owner_id AND source_circuit_id=NEW.source_circuit_id)) BEGIN SELECT RAISE(ABORT,'Publications cannot be replaced'); END;
CREATE TRIGGER publication_deleted_terminal BEFORE UPDATE OF status ON publications WHEN OLD.status='deleted' AND NEW.status!='deleted' BEGIN SELECT RAISE(ABORT,'Deleted publication is terminal'); END;
CREATE TRIGGER publication_removed_terminal BEFORE UPDATE OF moderation ON publications WHEN OLD.moderation='removed' AND NEW.moderation!='removed' BEGIN SELECT RAISE(ABORT,'Removed publication is terminal'); END;
CREATE TABLE publication_tags (
  publication_id TEXT NOT NULL REFERENCES publications(id),
  tag TEXT NOT NULL CHECK(length(tag) BETWEEN 2 AND 24 AND tag NOT GLOB '*[^a-z0-9-]*'),
  PRIMARY KEY(publication_id,tag)
);
CREATE INDEX publication_tags_lookup ON publication_tags(tag,publication_id);
CREATE TABLE publication_write_windows (
  user_id TEXT PRIMARY KEY NOT NULL REFERENCES user(id),
  window_start INTEGER NOT NULL,
  writes INTEGER NOT NULL CHECK(typeof(writes)='integer' AND writes BETWEEN 1 AND 120)
);
CREATE TABLE publication_reports (
  id TEXT PRIMARY KEY NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES user(id),
  publication_id TEXT NOT NULL REFERENCES publications(id),
  version_id TEXT NOT NULL REFERENCES publication_versions(id),
  reason TEXT NOT NULL CHECK(reason IN ('Unsafe or misleading','Harassment or hate','Spam','Other')),
  details TEXT NOT NULL CHECK(length(trim(details)) BETWEEN 1 AND 500),
  status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','resolved','dismissed')),
  revision INTEGER NOT NULL DEFAULT 1 CHECK(typeof(revision)='integer' AND revision BETWEEN 1 AND 9007199254740991),
  resolution TEXT CHECK(resolution IS NULL OR length(trim(resolution)) BETWEEN 8 AND 1000),
  resolved_by TEXT REFERENCES user(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL CHECK(updated_at>=created_at),
  UNIQUE(reporter_id,publication_id),
  CHECK((status='open' AND resolution IS NULL AND resolved_by IS NULL) OR (status!='open' AND resolution IS NOT NULL AND resolved_by IS NOT NULL))
);
CREATE TRIGGER publication_report_subject BEFORE INSERT ON publication_reports WHEN NOT EXISTS(SELECT 1 FROM publications p JOIN publication_versions v ON v.publication_id=p.id WHERE p.id=NEW.publication_id AND p.owner_id!=NEW.reporter_id AND v.id=NEW.version_id) BEGIN SELECT RAISE(ABORT,'Invalid publication report subject'); END;
CREATE INDEX publication_reports_queue ON publication_reports(status,created_at DESC,id);
CREATE INDEX publication_reports_subject ON publication_reports(publication_id,status,created_at DESC,id);
CREATE INDEX publication_reports_daily ON publication_reports(reporter_id,created_at);
