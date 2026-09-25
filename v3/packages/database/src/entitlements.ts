import type { Database } from "./index.ts";

export type EntitlementKey = "simulator_pro";

/** Resolves only the authenticated user's grants under forced RLS. */
export class PostgresEntitlementRepository {
  constructor(private readonly database: Database) {}

  async hasActive(userId: string, key: EntitlementKey): Promise<boolean> {
    const result = await this.database.begin(async (transaction) => {
      await transaction`select set_config('app.current_user_id', ${userId}, true)`;
      const [row] = await transaction<{ active: boolean }[]>`
        select app_private.has_active_entitlement(${key}) as active
      `;
      return { active: row?.active === true };
    });
    return result.active;
  }
}
