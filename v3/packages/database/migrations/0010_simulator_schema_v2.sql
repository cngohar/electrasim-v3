-- Circuit schema v2 adds explicit protection models, rule-pack identity, complex impedance,
-- earthing topology, and fault evidence. Historical immutable v1 revisions remain readable and
-- are migrated at the domain boundary; all new saves use v2.
alter table simulator_project_revisions
  drop constraint simulator_project_document_ck;

alter table simulator_project_revisions
  add constraint simulator_project_document_ck check (
    jsonb_typeof(circuit_document) = 'object' and
    circuit_document->>'schemaVersion' in ('1', '2')
  );
