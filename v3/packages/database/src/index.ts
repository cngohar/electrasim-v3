import type { ReadinessCheck } from "@electrasim/platform-contracts";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres, { type Sql, type TransactionSql } from "postgres";
import * as schema from "./schema.ts";

export * from "./account-onboarding.ts";
export * from "./authorization-context.ts";
export * from "./content-studio.ts";
export * from "./entitlements.ts";
export * from "./identity-provisioning.ts";
export * from "./invitation-acceptance.ts";
export * from "./invitation-management.ts";
export * from "./schema.ts";
export * from "./simulator-lesson-submissions.ts";
export * from "./simulator-projects.ts";
export * from "./step-up.ts";
export * from "./system-jobs.ts";
export * from "./workspace-administration.ts";

export interface PostgresConfig {
  readonly url: string;
  readonly maxConnections?: number;
  readonly idleTimeoutSeconds?: number;
  readonly connectTimeoutSeconds?: number;
}

export interface TenantDatabaseContext {
  readonly userId: string;
  readonly workspaceId: string;
  readonly requestId: string;
}

export type Database = Sql<Record<string, never>>;
export type DatabaseTransaction = TransactionSql<Record<string, never>>;

export function createPostgresClient(config: PostgresConfig): Database {
  return postgres(config.url, {
    max: config.maxConnections ?? 10,
    idle_timeout: config.idleTimeoutSeconds ?? 20,
    connect_timeout: config.connectTimeoutSeconds ?? 10,
    prepare: true,
  });
}

export function createDrizzleDatabase(database: Database) {
  return drizzle(database, { schema });
}

export type DrizzleDatabase = ReturnType<typeof createDrizzleDatabase>;

export async function withTenantTransaction<T>(
  database: Database,
  context: TenantDatabaseContext,
  operation: (transaction: TransactionSql<Record<string, never>>) => Promise<T>,
): Promise<T> {
  const result = await database.begin(async (transaction) => {
    await transaction`select set_config('app.current_user_id', ${context.userId}, true)`;
    await transaction`select set_config('app.current_workspace_id', ${context.workspaceId}, true)`;
    await transaction`select set_config('app.request_id', ${context.requestId}, true)`;
    return { value: await operation(transaction) };
  });
  return result.value;
}

export function postgresReadiness(database: Database, name = "postgres"): ReadinessCheck {
  return {
    name,
    async check() {
      try {
        const [result] = await database<{ ok: number }[]>`select 1 as ok`;
        return result?.ok === 1
          ? { ready: true }
          : { ready: false, detail: "unexpected readiness response" };
      } catch (error) {
        return {
          ready: false,
          detail: error instanceof Error ? error.message : "unknown PostgreSQL error",
        };
      }
    },
  };
}
