import type { Circuit } from '@electrasim/domain';
import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ApiEnv } from '../context';
import { readCircuit } from '../simulator-access';
import { requirePublicPublication } from './publication-store';

export type PreviewVersion = {
  id: string;
  versionNumber: number;
  title: string;
  description: string;
  tagsJson: string;
  allowForks: number;
  circuitJson: string;
  circuitSchemaVersion: number;
  modelVersion: string;
  engineVersion: string;
  controlEngineVersion: string;
  fingerprint: string;
  validatedAt: number;
  verifiedAt: number | null;
  createdAt: number;
};
export async function previewSnapshot(c: Context<ApiEnv>, slug: string, versionId?: string) {
  const publication = await requirePublicPublication(c, slug);
  if (versionId !== undefined && !/^[a-zA-Z0-9-]{1,200}$/.test(versionId))
    throw new HTTPException(404, { message: 'Publication version unavailable' });
  const version = await c
    .get('db')
    .prepare(
      'SELECT id,version_number AS versionNumber,title,description,tags_json AS tagsJson,allow_forks AS allowForks,circuit_json AS circuitJson,circuit_schema_version AS circuitSchemaVersion,model_version AS modelVersion,engine_version AS engineVersion,control_engine_version AS controlEngineVersion,fingerprint,validated_at AS validatedAt,verified_at AS verifiedAt,created_at AS createdAt FROM publication_versions WHERE publication_id=? AND id=?',
    )
    .bind(publication.id, versionId ?? publication.currentVersionId)
    .first<PreviewVersion>();
  if (!version) throw new HTTPException(404, { message: 'Publication version unavailable' });
  const circuit: Circuit = readCircuit(JSON.parse(version.circuitJson));
  return { publication, version, circuit };
}
