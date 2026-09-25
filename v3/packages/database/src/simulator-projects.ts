import type {
  SimulatorProject,
  SimulatorProjectRepository,
  SimulatorProjectSummary,
  SupplyFamily,
} from "@electrasim/simulator-domain";
import { migrateCircuitDocument, SimulatorError } from "@electrasim/simulator-domain";
import type { Database } from "./index.ts";

export class PostgresSimulatorProjectRepository implements SimulatorProjectRepository {
  constructor(private readonly database: Database) {}

  async list(ownerUserId: string): Promise<readonly SimulatorProjectSummary[]> {
    const result = await this.database.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${ownerUserId}, true)`;
      const rows = await tx<ProjectRow[]>`
        select id, title, supply_family, current_revision_number, share_id, updated_at
        from simulator_projects where owner_user_id = ${ownerUserId}::uuid and archived_at is null
        order by updated_at desc, id
      `;
      return { value: rows.map(toSummary) };
    });
    return result.value;
  }

  async get(ownerUserId: string, projectId: string): Promise<SimulatorProject | null> {
    const result = await this.database.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${ownerUserId}, true)`;
      const [row] = await tx<ProjectDetailRow[]>`
        select projects.id, projects.title, projects.supply_family,
          projects.current_revision_number, projects.share_id, projects.updated_at,
          revisions.circuit_document
        from simulator_projects projects
        join simulator_project_revisions revisions
          on revisions.project_id = projects.id
          and revisions.revision_number = projects.current_revision_number
        where projects.id = ${projectId}::uuid and projects.owner_user_id = ${ownerUserId}::uuid
          and projects.archived_at is null
      `;
      return { value: row ? toProject(row) : null };
    });
    return result.value;
  }

  async save(input: Parameters<SimulatorProjectRepository["save"]>[0]): Promise<SimulatorProject> {
    const result = await this.database.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${input.ownerUserId}, true)`;
      await tx`select pg_advisory_xact_lock(hashtextextended(${`simulator-projects:${input.ownerUserId}`}, 0))`;
      const [existing] = await tx<{ current_revision_number: number }[]>`
        select current_revision_number from simulator_projects
        where id = ${input.projectId}::uuid and owner_user_id = ${input.ownerUserId}::uuid
        for update
      `;
      if (!existing) {
        if (input.freeLimit !== null) {
          const [count] = await tx<{ count: number }[]>`
            select count(*)::int as count from simulator_projects
            where owner_user_id = ${input.ownerUserId}::uuid and archived_at is null
          `;
          if ((count?.count ?? 0) >= input.freeLimit)
            throw new SimulatorError("project_limit_reached");
        }
        await tx`
          insert into simulator_projects (
            id, owner_user_id, title, supply_family, current_revision_number
          ) values (
            ${input.projectId}::uuid, ${input.ownerUserId}::uuid, ${input.title},
            ${input.circuit.supplyFamily}, 1
          )
        `;
      } else {
        await tx`
          update simulator_projects set title = ${input.title},
            supply_family = ${input.circuit.supplyFamily},
            current_revision_number = ${existing.current_revision_number + 1}, updated_at = now()
          where id = ${input.projectId}::uuid
        `;
      }
      const revisionNumber = (existing?.current_revision_number ?? 0) + 1;
      await tx`
        insert into simulator_project_revisions (
          id, project_id, revision_number, circuit_document, created_by_user_id
        ) values (
          ${input.revisionId}::uuid, ${input.projectId}::uuid, ${revisionNumber},
          ${JSON.stringify(input.circuit)}::jsonb, ${input.ownerUserId}::uuid
        )
      `;
      const [row] = await tx<ProjectDetailRow[]>`
        select projects.id, projects.title, projects.supply_family,
          projects.current_revision_number, projects.share_id, projects.updated_at,
          revisions.circuit_document
        from simulator_projects projects join simulator_project_revisions revisions
          on revisions.project_id = projects.id and revisions.revision_number = ${revisionNumber}
        where projects.id = ${input.projectId}::uuid
      `;
      if (!row) throw new SimulatorError("invalid_circuit");
      return { value: toProject(row) };
    });
    return result.value;
  }

  async setSharing(input: Parameters<SimulatorProjectRepository["setSharing"]>[0]) {
    const result = await this.database.begin(async (tx) => {
      await tx`select set_config('app.current_user_id', ${input.ownerUserId}, true)`;
      const [row] = await tx<{ share_id: string | null }[]>`
        update simulator_projects set share_id = ${input.shareId}::uuid, updated_at = now()
        where id = ${input.projectId}::uuid and owner_user_id = ${input.ownerUserId}::uuid
        returning share_id
      `;
      if (!row) throw new SimulatorError("component_not_found");
      return { value: { shareId: row.share_id } };
    });
    return result.value;
  }

  async getShared(shareId: string): Promise<SimulatorProject | null> {
    const [row] = await this.database<SharedRow[]>`
      select * from app_private.get_shared_simulator_project(${shareId}::uuid)
    `;
    return row
      ? {
          id: row.project_id,
          title: row.title,
          supplyFamily: row.supply_family,
          revisionNumber: row.revision_number,
          shared: true,
          shareId,
          updatedAt: new Date(0),
          circuit: migrateCircuitDocument(row.circuit_document).document,
        }
      : null;
  }
}

type ProjectRow = {
  id: string;
  title: string;
  supply_family: SupplyFamily;
  current_revision_number: number;
  share_id: string | null;
  updated_at: Date;
};
type ProjectDetailRow = ProjectRow & { circuit_document: unknown };
type SharedRow = {
  project_id: string;
  title: string;
  supply_family: SupplyFamily;
  revision_number: number;
  circuit_document: unknown;
};
function toSummary(row: ProjectRow): SimulatorProjectSummary {
  return {
    id: row.id,
    title: row.title,
    supplyFamily: row.supply_family,
    revisionNumber: row.current_revision_number,
    shared: row.share_id !== null,
    updatedAt: row.updated_at,
  };
}
function toProject(row: ProjectDetailRow): SimulatorProject {
  return {
    ...toSummary(row),
    shareId: row.share_id,
    circuit: migrateCircuitDocument(row.circuit_document).document,
  };
}
